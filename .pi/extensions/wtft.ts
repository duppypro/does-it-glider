import { type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";

// ---
// DATA STRUCTURES & TYPES
// ---

interface Interaction {
	timestamp: number;
	cost: number;
	files: Set<string>;
	commands: string[];
	texts: string[];
}

interface Bin {
	label: string;
	dateStr: string;
	spec_cost: number;
	code_cost: number;
	mixed_cost: number; // For overlapping Spec and Code efforts in the same turn
	other_cost: number;
	total_cost: number;
	incremental_cost?: number; // Stores the original bucket cost before cumulative summing
}

interface IntervalConfig {
	size: number;
	unit: "m" | "h" | "d" | "w";
}

// ---
// ARGUMENT PARSING
// ---

/**
 * Parses a raw interval string like "7m", "4h", "3d", "2w" into structured numeric size and unit.
 * Defaults to size: 1, unit: "h" if invalid.
 */
function parseInterval(val: string): IntervalConfig {
	const match = /^(\d+)([mhdw])$/.exec(val);
	if (match) {
		const size = parseInt(match[1], 10);
		const unit = match[2] as "m" | "h" | "d" | "w";
		if (size > 0) {
			return { size, unit };
		}
	}
	return { size: 1, unit: "h" }; // Default 1h
}

/**
 * Parses raw command argument string into typed options.
 * Supports standard flags (-i, --interval, -l, --limit, -w, --width, -c, --cumulative, -b, --bucket, --ticks, --no-ticks, -H, --hide, -S, --show, -h, --help, -t, --tz, --timezone).
 */
function parseArgs(argsStr: string = "") {
	const str = argsStr || "";
	const args = str.trim().split(/\s+/).filter(Boolean);
	let interval = "1h";
	let limit = 10;
	let width = 80;
	let timezone: string | undefined = undefined;
	let hideWidget = false;
	let showWidget = false;
	let showHelp = false;
	let showTicks = true;
	let mode: "bucket" | "cumulative" = "cumulative";

	let hasInterval = false;
	let hasLimit = false;
	let hasWidth = false;
	let hasTicks = false;
	let hasMode = false;
	let hasTimezone = false;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--help" || arg === "-h") {
			showHelp = true;
		} else if (arg === "--hide" || arg === "-H") {
			hideWidget = true;
		} else if (arg === "--show" || arg === "-S") {
			showWidget = true;
		} else if (arg === "--ticks") {
			showTicks = true;
			hasTicks = true;
		} else if (arg === "--no-ticks") {
			showTicks = false;
			hasTicks = true;
		} else if (arg === "--cumulative" || arg === "-c") {
			mode = "cumulative";
			hasMode = true;
		} else if (arg === "--bucket" || arg === "-b") {
			mode = "bucket";
			hasMode = true;
		} else if (arg === "-i" || arg === "--interval") {
			const val = args[i + 1];
			if (val && /^(\d+)([mhdw])$/.test(val)) {
				interval = val;
				hasInterval = true;
				i++;
			}
		} else if (arg === "-l" || arg === "--limit") {
			const val = args[i + 1];
			const num = parseInt(val, 10);
			if (!isNaN(num) && num > 0) {
				limit = num;
				hasLimit = true;
				i++;
			}
		} else if (arg === "-w" || arg === "--width") {
			const val = args[i + 1];
			const num = parseInt(val, 10);
			if (!isNaN(num) && num > 0) {
				width = num;
				hasWidth = true;
				i++;
			}
		} else if (arg === "-t" || arg === "--tz" || arg === "--timezone") {
			const val = args[i + 1];
			if (val && !val.startsWith("-")) {
				timezone = val;
				hasTimezone = true;
				i++;
			}
		} else if (arg.startsWith("--interval=")) {
			const val = arg.split("=")[1];
			if (val && /^(\d+)([mhdw])$/.test(val)) {
				interval = val;
				hasInterval = true;
			}
		} else if (arg.startsWith("--limit=")) {
			const val = arg.split("=")[1];
			const num = parseInt(val, 10);
			if (!isNaN(num) && num > 0) {
				limit = num;
				hasLimit = true;
			}
		} else if (arg.startsWith("--width=")) {
			const val = arg.split("=")[1];
			const num = parseInt(val, 10);
			if (!isNaN(num) && num > 0) {
				width = num;
				hasWidth = true;
			}
		} else if (arg.startsWith("--tz=")) {
			timezone = arg.split("=")[1];
			hasTimezone = true;
		} else if (arg.startsWith("--timezone=")) {
			timezone = arg.split("=")[1];
			hasTimezone = true;
		}
	}

	return {
		interval,
		limit,
		width,
		timezone,
		hideWidget,
		showWidget,
		showTicks,
		mode,
		showHelp,
		hasInterval,
		hasLimit,
		hasWidth,
		hasTicks,
		hasMode,
		hasTimezone
	};
}

// ---
// LOG PARSER & CLASSIFICATION
// ---

/**
 * Classifies an interaction based on file modifications/reads, executed bash commands,
 * and text keywords. If both spec and code indicators are triggered, it is classified as "mixed".
 * 
 * NOTE: This classification runs 100% locally in JavaScript and consumes ZERO LLM tokens!
 */
function classifyInteraction(interaction: Interaction): "spec" | "code" | "mixed" | "other" {
	let hasSpec = false;
	let hasCode = false;

	// Check file paths accessed or modified via tools
	for (const f of interaction.files) {
		const norm = f.replace(/\\/g, "/");
		if (
			norm.startsWith("docs/") ||
			norm.endsWith("AGENTS.md") ||
			norm.endsWith("ARCHITECTURE.md") ||
			norm.endsWith("README.md")
		) {
			hasSpec = true;
		}
		if (
			norm.startsWith(".pi/extensions/") ||
			norm.startsWith("src/") ||
			norm.startsWith("tests/") ||
			norm.startsWith("public/")
		) {
			hasCode = true;
		}
	}

	// Analyze executed shell commands
	for (const cmd of interaction.commands) {
		const lowerCmd = cmd.toLowerCase();
		
		// Paths inside bash commands
		if (
			lowerCmd.includes(".pi/extensions/") ||
			lowerCmd.includes("src/") ||
			lowerCmd.includes("tests/") ||
			lowerCmd.includes("public/")
		) {
			hasCode = true;
		}
		if (
			lowerCmd.includes("docs/") ||
			lowerCmd.includes("agents.md") ||
			lowerCmd.includes("architecture.md") ||
			lowerCmd.includes("readme.md")
		) {
			hasSpec = true;
		}

		// Development/Test indicators
		if (
			/\b(npm|pnpm|yarn|bun)\s+(run\s+)?(test|build|compile)\b/.test(lowerCmd) ||
			/\b(vitest|jest|pytest|tsc|cargo\s+test|go\s+test)\b/.test(lowerCmd)
		) {
			hasCode = true;
		}
	}

	// Check prominent spec planning keywords in dialogue text
	const specKeywords = [
		"spec", "specification", "architecture", "plan",
		"design spec", "planning", "requirement", "roadmap"
	];
	for (const text of interaction.texts) {
		const lowerText = text.toLowerCase();
		for (const keyword of specKeywords) {
			if (lowerText.includes(keyword)) {
				hasSpec = true;
			}
		}
	}

	if (hasSpec && hasCode) {
		return "mixed";
	}
	if (hasCode) {
		return "code";
	}
	if (hasSpec) {
		return "spec";
	}
	return "other";
}

// ---
// TIMEZONE AND TIME BINNING
// ---

/**
 * Returns year, month (1-indexed), day, hour, minute, second for a timestamp in a given timezone.
 * Defaults to the local system time if tz is undefined or invalid.
 */
function getZonedParts(timestamp: number, tz?: string): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
	const d = new Date(timestamp);
	if (!tz) {
		return {
			year: d.getFullYear(),
			month: d.getMonth() + 1,
			day: d.getDate(),
			hour: d.getHours(),
			minute: d.getMinutes(),
			second: d.getSeconds()
		};
	}

	try {
		const formatter = new Intl.DateTimeFormat("en-US", {
			timeZone: tz,
			year: "numeric",
			month: "numeric",
			day: "numeric",
			hour: "numeric",
			minute: "numeric",
			second: "numeric",
			hour12: false
		});
		const parts = formatter.formatToParts(d);
		const partMap: Record<string, string> = {};
		for (const p of parts) {
			partMap[p.type] = p.value;
		}

		let hour = parseInt(partMap.hour, 10);
		if (hour === 24) hour = 0; // en-US standard sometimes returns 24 instead of 00 at midnight when hour12 is false

		return {
			year: parseInt(partMap.year, 10),
			month: parseInt(partMap.month, 10),
			day: parseInt(partMap.day, 10),
			hour,
			minute: parseInt(partMap.minute, 10),
			second: parseInt(partMap.second, 10)
		};
	} catch {
		// Fallback to local system time if timezone is invalid
		return {
			year: d.getFullYear(),
			month: d.getMonth() + 1,
			day: d.getDate(),
			hour: d.getHours(),
			minute: d.getMinutes(),
			second: d.getSeconds()
		};
	}
}

/**
 * Calculates the ISO week number and the preceding Monday for a given date.
 * ISO 8601 weeks always start on Monday.
 */
function getIsoWeekAndMonday(parts: { year: number; month: number; day: number }): { weekNum: number; mondayMonth: number; mondayDay: number; mondayYear: number } {
	const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
	const day = date.getUTCDay();
	
	// Preceding Monday offset: Sunday (0) goes back 6 days, Mon (1) goes back 0 days...
	const diffToMonday = day === 0 ? 6 : day - 1;
	const mondayDate = new Date(date.getTime() - diffToMonday * 24 * 60 * 60 * 1000);
	
	// Find the Thursday of this ISO week
	const thursdayDate = new Date(mondayDate.getTime() + 3 * 24 * 60 * 60 * 1000);
	const targetYear = thursdayDate.getUTCFullYear();
	
	// First Thursday of targetYear
	const jan1 = new Date(Date.UTC(targetYear, 0, 1));
	const jan1Day = jan1.getUTCDay();
	const firstThursday = new Date(jan1.getTime() + ((4 - jan1Day + 7) % 7) * 24 * 60 * 60 * 1000);
	
	// Calculate weeks difference
	const weekNum = 1 + Math.round((thursdayDate.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
	
	return {
		weekNum,
		mondayYear: mondayDate.getUTCFullYear(),
		mondayMonth: mondayDate.getUTCMonth() + 1,
		mondayDay: mondayDate.getUTCDate()
	};
}

/**
 * Maps a timestamp to an interval key, a shortened formatted display label,
 * and a standardized date string. Evaluates in the configured timezone.
 */
function getBinInfo(timestamp: number, config: IntervalConfig, tz?: string): { key: string; label: string; dateStr: string } {
	const parts = getZonedParts(timestamp, tz);
	const pad = (n: number) => String(n).padStart(2, "0");
	const dateStr = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
	const { size, unit } = config;

	if (unit === "m") {
		const totalMins = parts.hour * 60 + parts.minute;
		const binnedMins = Math.floor(totalMins / size) * size;
		const startHours = Math.floor(binnedMins / 60);
		const startMins = binnedMins % 60;
		
		const label = `${pad(startHours)}:${pad(startMins)}`;
		const key = `${dateStr}T${pad(startHours)}:${pad(startMins)}:00`;
		return { key, label, dateStr };
	} else if (unit === "h") {
		const startHours = Math.floor(parts.hour / size) * size;
		const label = `${pad(startHours)}:00`;
		const key = `${dateStr}T${pad(startHours)}:00:00`;
		return { key, label, dateStr };
	} else if (unit === "d") {
		const binnedDays = Math.floor((parts.day - 1) / size) * size;
		const startDay = binnedDays + 1;
		const label = `${parts.year}-${pad(parts.month)}-${pad(startDay)}`;
		const key = `${parts.year}-${pad(parts.month)}-${pad(startDay)}T00:00:00`;
		return { key, label, dateStr: label };
	} else {
		// unit === "w" (ISO 8601 week number & Monday)
		const info = getIsoWeekAndMonday(parts);
		const label = `W${pad(info.weekNum)} ${pad(info.mondayMonth)}-${pad(info.mondayDay)}`;
		const key = `${info.mondayYear}-${pad(info.mondayMonth)}-${pad(info.mondayDay)}T00:00:00`;
		return { key, label, dateStr: `${info.mondayYear}-${pad(info.mondayMonth)}-${pad(info.mondayDay)}` };
	}
}

// ---
// MATHEMATICAL CHARS DISTRIBUTION
// ---

/**
 * Distributes character counts across spec, mixed, code, and other segments using
 * the Largest Remainder Method, ensuring the total matches barWidth exactly.
 */
function distributeChars(
	spec_cost: number,
	mixed_cost: number,
	code_cost: number,
	other_cost: number,
	barWidth: number
): { spec: number; mixed: number; code: number; other: number } {
	const total = spec_cost + mixed_cost + code_cost + other_cost;
	if (total <= 0 || barWidth <= 0) {
		return { spec: 0, mixed: 0, code: 0, other: 0 };
	}

	const raw_spec = (spec_cost / total) * barWidth;
	const raw_mixed = (mixed_cost / total) * barWidth;
	const raw_code = (code_cost / total) * barWidth;
	const raw_other = (other_cost / total) * barWidth;

	let spec = Math.floor(raw_spec);
	let mixed = Math.floor(raw_mixed);
	let code = Math.floor(raw_code);
	let other = Math.floor(raw_other);

	const remainder_spec = raw_spec - spec;
	const remainder_mixed = raw_mixed - mixed;
	const remainder_code = raw_code - code;
	const remainder_other = raw_other - other;

	let allocated = spec + mixed + code + other;
	while (allocated < barWidth) {
		const maxRemainder = Math.max(remainder_spec, remainder_mixed, remainder_code, remainder_other);
		if (maxRemainder === remainder_spec) {
			spec++;
		} else if (maxRemainder === remainder_mixed) {
			mixed++;
		} else if (maxRemainder === remainder_code) {
			code++;
		} else {
			other++;
		}
		allocated++;
	}

	return { spec, mixed, code, other };
}

// ---
// SCALE TICKS GENERATOR
// ---

/**
 * Places tick markers above the bars at mathematically proportional intervals.
 */
function buildTickLines(maxCost: number, barWidth: number): { labelsLine: string | null; markersLine: string | null } {
	if (maxCost <= 0 || barWidth < 15) {
		return { labelsLine: null, markersLine: null };
	}

	const labelArr = Array(barWidth).fill(" ");
	const markerArr = Array(barWidth).fill("─");
	const occupied = Array(barWidth).fill(false);

	const midIdx = Math.floor(barWidth / 2);
	const q1Idx = Math.floor(barWidth / 4);
	const q3Idx = Math.floor((barWidth * 3) / 4);

	markerArr[0] = "┿";
	markerArr[barWidth - 1] = "┿";
	markerArr[midIdx] = "┿";
	markerArr[q1Idx] = "┿";
	markerArr[q3Idx] = "┿";
	const markersLine = markerArr.join("");

	const tryPlaceLabel = (text: string, startIdx: number): boolean => {
		const len = text.length;
		if (startIdx + len > barWidth) {
			startIdx = barWidth - len;
		}
		if (startIdx < 0) {
			return false;
		}

		for (let i = startIdx; i < startIdx + len; i++) {
			if (occupied[i]) return false;
		}

		for (let i = 0; i < len; i++) {
			labelArr[startIdx + i] = text[i];
		}

		const padStart = Math.max(0, startIdx - 1);
		const padEnd = Math.min(barWidth - 1, startIdx + len);
		for (let i = padStart; i <= padEnd; i++) {
			occupied[i] = true;
		}
		return true;
	};

	tryPlaceLabel("$0.00", 0);
	tryPlaceLabel(`$${maxCost.toFixed(2)}`, barWidth - 1);

	if (maxCost > 0) {
		tryPlaceLabel(`$${(maxCost / 2).toFixed(2)}`, midIdx);
	}

	if (maxCost > 0) {
		tryPlaceLabel(`$${(maxCost / 4).toFixed(2)}`, q1Idx);
		tryPlaceLabel(`$${((maxCost * 3) / 4).toFixed(2)}`, q3Idx);
	}

	const labelsLine = labelArr.join("");
	return { labelsLine, markersLine };
}

// ---
// STATE PERSISTENCE (STORE/RETRIEVE)
// ---

/**
 * Retrieves setting configurations stored persistently in the session log.
 * Defaults mode to "cumulative" for cohesive cost progression tracks.
 */
function getSettings(ctx: any) {
	let interval = "1h";
	let limit = 10;
	let width = 80;
	let visible = false; // Default invisible on fresh session
	let showTicks = true;
	let mode: "bucket" | "cumulative" = "cumulative";
	let timezone: string | undefined = undefined;

	for (const entry of ctx.sessionManager.getEntries()) {
		if (entry.type === "custom" && entry.customType === "wtft-settings") {
			if (entry.data) {
				if (entry.data.interval) interval = entry.data.interval;
				if (typeof entry.data.limit === "number") limit = entry.data.limit;
				if (typeof entry.data.width === "number") width = entry.data.width;
				if (typeof entry.data.visible === "boolean") visible = entry.data.visible;
				if (typeof entry.data.showTicks === "boolean") showTicks = entry.data.showTicks;
				if (entry.data.mode) mode = entry.data.mode;
				if (entry.data.timezone) timezone = entry.data.timezone;
			}
		}
	}

	return { interval, limit, width, visible, showTicks, mode, timezone };
}

// ---
// FORMATTING HELPERS
// ---

function padString(str: string, len: number): string {
	return str.length >= len ? str : str + " ".repeat(len - str.length);
}

function formatCost(cost: number): string {
	return `$${cost.toFixed(2)}`;
}

/**
 * Formats a standardized date string of format YYYY-MM-DD into a localized Mmm-Dd string.
 */
function formatMmmDdStr(dateStr: string): string {
	const parts = dateStr.split("-");
	if (parts.length === 3) {
		const monthIdx = parseInt(parts[1], 10) - 1;
		const day = parseInt(parts[2], 10);
		const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
		const pad = (n: number) => String(n).padStart(2, "0");
		if (monthIdx >= 0 && monthIdx < 12) {
			return `${months[monthIdx]}-${pad(day)}`;
		}
	}
	return dateStr;
}

/**
 * Computes visual width of strings, correctly treating surrogate pairs and double-width emojis as 2.
 */
function getVisualLength(str: string): number {
	const clean = str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
	let len = 0;
	for (let i = 0; i < clean.length; i++) {
		const code = clean.charCodeAt(i);
		if (code >= 0xD800 && code <= 0xDBFF && i + 1 < clean.length) {
			len += 2;
			i++;
		} else if (code >= 0x3000 && code <= 0x9FFF) {
			len += 2;
		} else {
			len += 1;
		}
	}
	return len;
}

// ---
// TUI WIDGET UPDATE ENGINE
// ---

/**
 * Dynamically computes costs binned by interval and updates the TUI widget
 * positioned below the editor. Operates in the configured timezone.
 */
function updateWtftWidget(
	ctx: any,
	pi: ExtensionAPI,
	opts?: {
		interval?: string;
		limit?: number;
		width?: number;
		visible?: boolean;
		showTicks?: boolean;
		mode?: "bucket" | "cumulative";
		timezone?: string;
	}
) {
	const current = getSettings(ctx);
	const intervalStr = opts?.interval !== undefined ? opts.interval : current.interval;
	const limit = opts?.limit !== undefined ? opts.limit : current.limit;
	const width = opts?.width !== undefined ? opts.width : current.width;
	const visible = opts?.visible !== undefined ? opts.visible : current.visible;
	const showTicks = opts?.showTicks !== undefined ? opts.showTicks : current.showTicks;
	const mode = opts?.mode !== undefined ? opts.mode : current.mode;
	const tz = opts?.timezone !== undefined ? opts.timezone : current.timezone;

	if (!visible) {
		ctx.ui.setWidget("wtft", undefined);
		return;
	}

	const intervalConfig = parseInterval(intervalStr);
	const branch = ctx.sessionManager.getBranch();
	const interactions: Interaction[] = [];

	for (let i = 0; i < branch.length; i++) {
		const entry = branch[i];
		if (entry.type === "message" && entry.message && entry.message.role === "assistant") {
			const assistantMsg = entry.message;
			const cost = assistantMsg.usage?.cost?.total || 0;
			const timestamp = assistantMsg.timestamp || new Date(entry.timestamp).getTime();

			const files = new Set<string>();
			const commands: string[] = [];
			const texts: string[] = [];

			if (Array.isArray(assistantMsg.content)) {
				for (const block of assistantMsg.content) {
					if (block.type === "text") {
						texts.push(block.text);
					} else if (block.type === "thinking") {
						texts.push(block.thinking);
					} else if (block.type === "toolCall") {
						const name = block.name;
						const args = block.arguments || {};
						if (name === "read" || name === "write" || name === "edit") {
							if (args.path) {
								files.add(args.path);
							}
						} else if (name === "bash") {
							if (args.command) {
								commands.push(args.command);
							}
						}
					}
				}
			}

			interactions.push({ timestamp, cost, files, commands, texts });
		}
	}

	// Group interactions into binned intervals
	const binMap = new Map<string, Bin>();
	let totalSessionCost = 0;

	for (const interaction of interactions) {
		const classification = classifyInteraction(interaction);
		const { key, label, dateStr } = getBinInfo(interaction.timestamp, intervalConfig, tz);
		totalSessionCost += interaction.cost;

		let bin = binMap.get(key);
		if (!bin) {
			bin = { label, dateStr, spec_cost: 0, code_cost: 0, mixed_cost: 0, other_cost: 0, total_cost: 0 };
			binMap.set(key, bin);
		}

		if (classification === "spec") {
			bin.spec_cost += interaction.cost;
		} else if (classification === "code") {
			bin.code_cost += interaction.cost;
		} else if (classification === "mixed") {
			bin.mixed_cost += interaction.cost;
		} else {
			bin.other_cost += interaction.cost;
		}
		bin.total_cost += interaction.cost;
	}

	// Sort bins chronological (ascending)
	const sortedBins = Array.from(binMap.entries())
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(entry => entry[1]);

	// Apply mode conversions
	if (mode === "cumulative") {
		let running_spec = 0;
		let running_code = 0;
		let running_mixed = 0;
		let running_other = 0;
		let running_total = 0;

		for (const bin of sortedBins) {
			bin.incremental_cost = bin.total_cost; // Preserve binned cost
			running_spec += bin.spec_cost;
			running_code += bin.code_cost;
			running_mixed += bin.mixed_cost;
			running_other += bin.other_cost;
			running_total += bin.total_cost;

			bin.spec_cost = running_spec;
			bin.code_cost = running_code;
			bin.mixed_cost = running_mixed;
			bin.other_cost = running_other;
			bin.total_cost = running_total;
		}
	}

	// Descending order for binned bars display
	const reversedBins = sortedBins.reverse();
	const displayedBins = reversedBins.slice(0, limit);

	if (displayedBins.length === 0) {
		ctx.ui.setWidget("wtft", undefined);
		return;
	}

	const maxCostInDisplayed = Math.max(...displayedBins.map(b => b.total_cost), 0);

	// Compute dynamic horizontal layouts
	const prefixWidth = mode === "cumulative" ? 29 : 21;
	const finalWidth = Math.max(width, 40);
	const maxBarWidth = finalWidth - prefixWidth;

	// Resolve the newest local date for display on the ticks line
	const newestBin = displayedBins[0];
	let titleDateStr = "";
	if (newestBin) {
		titleDateStr = formatMmmDdStr(newestBin.dateStr);
	} else {
		const nowParts = getZonedParts(Date.now(), tz);
		const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
		const pad = (n: number) => String(n).padStart(2, "0");
		titleDateStr = `${months[nowParts.month - 1]}-${pad(nowParts.day)}`;
	}

	const widgetLines: string[] = [];
	
	// Format tight-justified title using the money-with-wings emoji 💸 (no date, right-justified Total Cost unit)
	const titleLeft = "💸 Where The F***ing Tokens?!";
	const titleRight = `Total Cost: ${formatCost(totalSessionCost)}`;
	const leftLen = getVisualLength(titleLeft);
	const rightLen = getVisualLength(titleRight);
	const spacesNeeded = Math.max(1, finalWidth - leftLen - rightLen);
	const titleLine = titleLeft + " ".repeat(spacesNeeded) + titleRight;
	
	widgetLines.push(titleLine);

	// Render tick labels and marker lines above the bars if enabled
	if (showTicks && maxCostInDisplayed > 0) {
		// Embed the date right-aligned inside the prefix spaces before the first tick label starts!
		const labelPrefix = padString(titleDateStr, prefixWidth);
		const markerPrefix = " ".repeat(prefixWidth);

		const { labelsLine, markersLine } = buildTickLines(maxCostInDisplayed, maxBarWidth);
		if (labelsLine) {
			widgetLines.push(labelPrefix + `\x1b[2m${labelsLine}\x1b[0m`);
		}
		if (markersLine) {
			widgetLines.push(markerPrefix + `\x1b[2m${markersLine}\x1b[0m`);
		}
	}

	// Render binned stacked bars
	for (let i = 0; i < displayedBins.length; i++) {
		const bin = displayedBins[i];

		// If crossing a local day boundary (current bin date is different from previous in descending loop),
		// draw a visual day change indicator line only if ticks are enabled!
		if (showTicks && i > 0 && bin.dateStr !== displayedBins[i - 1].dateStr) {
			const labelDay = formatMmmDdStr(bin.dateStr);
			const dayChangeText = `─── ${labelDay} `;
			const dividerLine = dayChangeText + "─".repeat(Math.max(0, finalWidth - dayChangeText.length));
			widgetLines.push(`\x1b[2m${dividerLine}\x1b[0m`);
		}

		const barWidth = maxCostInDisplayed > 0 ? Math.round((bin.total_cost / maxCostInDisplayed) * maxBarWidth) : 0;
		const chars = distributeChars(bin.spec_cost, bin.mixed_cost, bin.code_cost, bin.other_cost, barWidth);

		let barStr = "";
		if (chars.spec > 0) {
			barStr += `\x1b[92m${"█".repeat(chars.spec)}\x1b[0m`; // Spec Work (Green)
		}
		if (chars.mixed > 0) {
			// Blended Spec + Code (Green foreground, Orange background, Medium Shade glyph)
			barStr += `\x1b[38;5;120;48;5;208m${"▒".repeat(chars.mixed)}\x1b[0m`; // Mixed Work (Blended)
		}
		if (chars.code > 0) {
			barStr += `\x1b[38;5;208m${"█".repeat(chars.code)}\x1b[0m`; // Code Work (Orange)
		}
		if (chars.other > 0) {
			barStr += `\x1b[38;5;244m${"░".repeat(chars.other)}\x1b[0m`; // Other Work (Grey)
		}

		const labelPart = padString(bin.label, 11);
		
		if (mode === "cumulative") {
			// Prepend plus to the incremental cost
			const incSign = (bin.incremental_cost ?? 0) >= 0 ? "+" : "";
			const incStr = `${incSign}${formatCost(bin.incremental_cost ?? 0)}`;
			const incPart = padString(incStr, 6);
			const costPart = padString(formatCost(bin.total_cost), 6);
			widgetLines.push(`${labelPart}  ${incPart}  ${costPart}  ${barStr}`);
		} else {
			// Bucket mode (no cumulative or incremental, just simple bucket cost)
			const costPart = padString(formatCost(bin.total_cost), 6);
			widgetLines.push(`${labelPart}  ${costPart}  ${barStr}`);
		}
	}

	widgetLines.push(`Legend:  \x1b[92m█\x1b[0m Spec (Green)   \x1b[38;5;120;48;5;208m▒\x1b[0m Mixed (Blend)   \x1b[38;5;208m█\x1b[0m Code (Orange)   \x1b[38;5;244m░\x1b[0m Other (Grey)`);

	ctx.ui.setWidget("wtft", widgetLines, { placement: "belowEditor" });
}

// ---
// MAIN EXTENSION ENTRY POINT
// ---

export default function wtftExtension(pi: ExtensionAPI) {
	// 1. Auto-restore on startup
	pi.on("session_start", async (_event, ctx) => {
		const current = getSettings(ctx);
		if (current.visible) {
			updateWtftWidget(ctx, pi);
		}
	});

	// 2. Auto-refresh on turn completion (zero token cost)
	pi.on("agent_end", async (_event, ctx) => {
		const current = getSettings(ctx);
		if (current.visible) {
			updateWtftWidget(ctx, pi);
		}
	});

	// 3. Command registration
	pi.registerCommand("wtft", {
		description: "Where The F***ing Tokens?! (WTFT) - Cost Auditing Widget",
		handler: async (args, ctx) => {
			const {
				interval,
				limit,
				width,
				timezone,
				hideWidget,
				showWidget,
				showTicks,
				mode,
				showHelp,
				hasInterval,
				hasLimit,
				hasWidth,
				hasTicks,
				hasMode,
				hasTimezone
			} = parseArgs(args);

			// Render manifest help menu if requested
			if (showHelp) {
				try {
					const manifestPath = path.join(ctx.cwd, "docs", "extensions", "manifests", "wtft-cmd.json");
					const manifestStr = fs.readFileSync(manifestPath, "utf8");
					const manifest = JSON.parse(manifestStr);

					let helpText = `\x1b[1m\x1b[36m${manifest.name}\x1b[0m - ${manifest.tagline}\n\n`;
					helpText += `${manifest.description}\n\n`;

					helpText += `\x1b[1mUsage:\x1b[0m\n`;
					for (const u of manifest.usage) {
						helpText += `  ${manifest.name} ${(u.flags).padEnd(28)} ${u.desc}\n`;
					}

					helpText += `\n\x1b[1mExamples:\x1b[0m\n`;
					for (const e of manifest.examples) {
						helpText += `  ${(e.cmd).padEnd(30)} ${e.desc}\n`;
					}

					ctx.ui.notify(helpText, "info");
				} catch (err) {
					ctx.ui.notify(`⚠️ Failed to load WTFT command manifest: ${err}`, "error");
				}
				return;
			}

			const current = getSettings(ctx);

			if (hideWidget) {
				pi.appendEntry("wtft-settings", {
					interval: current.interval,
					limit: current.limit,
					width: current.width,
					visible: false,
					showTicks: current.showTicks,
					mode: current.mode,
					timezone: current.timezone
				});
				ctx.ui.setWidget("wtft", undefined);
				ctx.ui.notify("Token cost audit widget hidden.", "info");
				return;
			}

			const nextInterval = hasInterval ? interval : current.interval;
			const nextLimit = hasLimit ? limit : current.limit;
			const nextWidth = hasWidth ? width : current.width;
			const nextTicks = hasTicks ? showTicks : current.showTicks;
			const nextMode = hasMode ? mode : current.mode;
			const nextTimezone = hasTimezone ? timezone : current.timezone;

			pi.appendEntry("wtft-settings", {
				interval: nextInterval,
				limit: nextLimit,
				width: nextWidth,
				visible: true,
				showTicks: nextTicks,
				mode: nextMode,
				timezone: nextTimezone
			});

			updateWtftWidget(ctx, pi, {
				interval: nextInterval,
				limit: nextLimit,
				width: nextWidth,
				visible: true,
				showTicks: nextTicks,
				mode: nextMode,
				timezone: nextTimezone
			});

			ctx.ui.notify("Token cost audit widget updated below the editor.", "info");
		}
	});
}
