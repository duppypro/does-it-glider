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
	other_cost: number;
	total_cost: number;
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
 * Supports standard flags (-i, --interval, -l, --limit, -w, --width, -c, --cumulative, -b, --bucket, --ticks, --no-ticks, -H, --hide, -S, --show, -h, --help).
 */
function parseArgs(argsStr: string = "") {
	const str = argsStr || "";
	const args = str.trim().split(/\s+/).filter(Boolean);
	let interval = "1h";
	let limit = 10;
	let width = 80;
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
		}
	}

	return {
		interval,
		limit,
		width,
		hideWidget,
		showWidget,
		showTicks,
		mode,
		showHelp,
		hasInterval,
		hasLimit,
		hasWidth,
		hasTicks,
		hasMode
	};
}

// ---
// LOG PARSER & CLASSIFICATION
// ---

/**
 * Classifies an interaction based on file modifications/reads, executed bash commands,
 * and text keywords. The logic enforces strict priority to handle overlap accurately:
 * 1. Spec Work (spec): touches docs, AGENTS.md, ARCHITECTURE.md, README.md or contains design planning terms.
 * 2. Code Work (code): touches .pi/extensions, src, tests, public or runs development bash commands.
 * 3. Other Work (other): conversation, setup, or untraced exchanges (rendered as unclassified in elegant grey).
 *
 * NOTE: This classification runs 100% locally in JavaScript and consumes ZERO LLM tokens!
 */
function classifyInteraction(interaction: Interaction): "spec" | "code" | "other" {
	let hasSpecFile = false;
	let hasCodeFile = false;

	// Check file paths accessed or modified via tools
	for (const f of interaction.files) {
		const norm = f.replace(/\\/g, "/");
		if (
			norm.startsWith("docs/") ||
			norm.endsWith("AGENTS.md") ||
			norm.endsWith("ARCHITECTURE.md") ||
			norm.endsWith("README.md")
		) {
			hasSpecFile = true;
		}
		if (
			norm.startsWith(".pi/extensions/") ||
			norm.startsWith("src/") ||
			norm.startsWith("tests/") ||
			norm.startsWith("public/")
		) {
			hasCodeFile = true;
		}
	}

	// Spec Work (Green) takes absolute priority over Code Work (Orange) for clear spec mapping
	if (hasSpecFile) {
		return "spec";
	}
	if (hasCodeFile) {
		return "code";
	}

	// Analyze executed shell commands
	for (const cmd of interaction.commands) {
		const lowerCmd = cmd.toLowerCase();
		
		// Paths inside bash commands
		if (
			lowerCmd.includes("docs/") ||
			lowerCmd.includes("agents.md") ||
			lowerCmd.includes("architecture.md") ||
			lowerCmd.includes("readme.md")
		) {
			return "spec";
		}
		if (
			lowerCmd.includes(".pi/extensions/") ||
			lowerCmd.includes("src/") ||
			lowerCmd.includes("tests/") ||
			lowerCmd.includes("public/")
		) {
			return "code";
		}

		// Development/Test indicators
		if (
			/\b(npm|pnpm|yarn|bun)\s+(run\s+)?(test|build|compile)\b/.test(lowerCmd) ||
			/\b(vitest|jest|pytest|tsc|cargo\s+test|go\s+test)\b/.test(lowerCmd)
		) {
			return "code";
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
				return "spec";
			}
		}
	}

	return "other";
}

// ---
// TIME BINNING
// ---

/**
 * Maps a timestamp to an interval key, a shortened formatted display label,
 * and a standardized date string. Evaluates entirely in local time and supports arbitrary integer-sized buckets.
 */
function getBinInfo(timestamp: number, config: IntervalConfig): { key: string; label: string; dateStr: string } {
	const d = new Date(timestamp);
	const pad = (n: number) => String(n).padStart(2, "0");
	const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
	const { size, unit } = config;

	if (unit === "m") {
		const totalMins = d.getHours() * 60 + d.getMinutes();
		const binnedMins = Math.floor(totalMins / size) * size;
		const startHours = Math.floor(binnedMins / 60);
		const startMins = binnedMins % 60;
		const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), startHours, startMins, 0, 0);
		
		const label = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
		return {
			key: start.toISOString(),
			label, // Just "hh:mm" (no date part, to maximize row space)
			dateStr
		};
	} else if (unit === "h") {
		const startHours = Math.floor(d.getHours() / size) * size;
		const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), startHours, 0, 0, 0);
		
		const label = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
		return {
			key: start.toISOString(),
			label, // Just "hh:mm" (no date part, to maximize row space)
			dateStr
		};
	} else if (unit === "d") {
		// Align days within the month (1-indexed, so we subtract 1 first)
		const binnedDays = Math.floor((d.getDate() - 1) / size) * size;
		const start = new Date(d.getFullYear(), d.getMonth(), binnedDays + 1, 0, 0, 0, 0);
		
		const label = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
		return {
			key: start.toISOString(),
			label,
			dateStr
		};
	} else {
		// unit === "w"
		// Find Sunday of the current week in local time
		const sunday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay(), 0, 0, 0, 0);
		const epochMilli = sunday.getTime();
		const weekMilli = 7 * 24 * 60 * 60 * 1000;
		
		// Align weeks absolute
		const binnedMilli = Math.floor(epochMilli / (size * weekMilli)) * (size * weekMilli);
		const start = new Date(binnedMilli);
		
		const label = `W-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
		return {
			key: start.toISOString(),
			label,
			dateStr
		};
	}
}

// ---
// MATHEMATICAL CHARS DISTRIBUTION
// ---

/**
 * Distributes character counts across spec, code, and other segments using
 * the Largest Remainder Method, ensuring the total matches barWidth exactly.
 */
function distributeChars(
	spec_cost: number,
	code_cost: number,
	other_cost: number,
	barWidth: number
): { spec: number; code: number; other: number } {
	if (barWidth === 0) return { spec: 0, code: 0, other: 0 };
	const total = spec_cost + code_cost + other_cost;
	if (total === 0) return { spec: 0, code: 0, other: 0 };

	const spec_float = (spec_cost / total) * barWidth;
	const code_float = (code_cost / total) * barWidth;
	const other_float = (other_cost / total) * barWidth;

	let spec_int = Math.floor(spec_float);
	let code_int = Math.floor(code_float);
	let other_int = Math.floor(other_float);

	const remainder = barWidth - (spec_int + code_int + other_int);
	if (remainder > 0) {
		const items = [
			{ key: "spec", diff: spec_float - spec_int, val: spec_int },
			{ key: "code", diff: code_float - code_int, val: code_int },
			{ key: "other", diff: other_float - other_int, val: other_int }
		];
		items.sort((a, b) => b.diff - a.diff);
		for (let i = 0; i < remainder; i++) {
			if (items[i].key === "spec") spec_int++;
			else if (items[i].key === "code") code_int++;
			else if (items[i].key === "other") other_int++;
		}
	}

	return { spec: spec_int, code: code_int, other: other_int };
}

// ---
// COST SCALE TICK MARKS GENERATION
// ---

/**
 * Generates cost scale labels and heavy aligned markers to fit perfectly above
 * the stacked horizontal bars. Performs overlap detection to scale labels dynamically.
 */
function buildTickLines(maxCost: number, barWidth: number): { labelsLine: string; markersLine: string } {
	if (barWidth <= 0) {
		return { labelsLine: "", markersLine: "" };
	}

	// Markers row (heavy vertical cross and heavy horizontal bar characters)
	const markerArr = Array(barWidth).fill("━");
	markerArr[0] = "┿";
	markerArr[barWidth - 1] = "┿";

	const midIdx = Math.floor((barWidth - 1) / 2);
	const q1Idx = Math.floor((barWidth - 1) / 4);
	const q3Idx = Math.floor(((barWidth - 1) * 3) / 4);

	if (q1Idx > 0 && q1Idx < barWidth - 1) markerArr[q1Idx] = "┿";
	if (midIdx > 0 && midIdx < barWidth - 1) markerArr[midIdx] = "┿";
	if (q3Idx > 0 && q3Idx < barWidth - 1) markerArr[q3Idx] = "┿";

	const markersLine = markerArr.join("");

	// Labels row (allocates label text and avoids overlaps by tracking occupied slots)
	const labelArr = Array(barWidth).fill(" ");
	const occupied = Array(barWidth).fill(false);

	const tryPlaceLabel = (text: string, centerIdx: number) => {
		const len = text.length;
		let startIdx = centerIdx - Math.floor(len / 2);
		
		if (startIdx < 0) startIdx = 0;
		if (startIdx + len > barWidth) startIdx = barWidth - len;

		for (let i = startIdx; i < startIdx + len; i++) {
			if (occupied[i]) return false;
		}

		for (let i = 0; i < len; i++) {
			labelArr[startIdx + i] = text[i];
			occupied[startIdx + i] = true;
		}

		// Prevent adjacent labels from grouping too tightly
		const padStart = Math.max(0, startIdx - 1);
		const padEnd = Math.min(barWidth - 1, startIdx + len);
		for (let i = padStart; i <= padEnd; i++) {
			occupied[i] = true;
		}
		return true;
	};

	// Priority 1: Left/Right boundaries ($0.00 and maxCost)
	tryPlaceLabel("$0.00", 0);
	tryPlaceLabel(`$${maxCost.toFixed(2)}`, barWidth - 1);

	// Priority 2: Midpoint (1/2)
	if (maxCost > 0) {
		tryPlaceLabel(`$${(maxCost / 2).toFixed(2)}`, midIdx);
	}

	// Priority 3: Quarter (1/4) and Three-Quarter (3/4) points
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

	for (const entry of ctx.sessionManager.getEntries()) {
		if (entry.type === "custom" && entry.customType === "wtft-settings") {
			if (entry.data) {
				if (entry.data.interval) interval = entry.data.interval;
				if (typeof entry.data.limit === "number") limit = entry.data.limit;
				if (typeof entry.data.width === "number") width = entry.data.width;
				if (typeof entry.data.visible === "boolean") visible = entry.data.visible;
				if (typeof entry.data.showTicks === "boolean") showTicks = entry.data.showTicks;
				if (entry.data.mode) mode = entry.data.mode;
			}
		}
	}

	return { interval, limit, width, visible, showTicks, mode };
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

function formatLocalMmmDd(date: Date): string {
	const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${months[date.getMonth()]}-${pad(date.getDate())}`;
}

// ---
// TUI WIDGET UPDATE ENGINE
// ---

/**
 * Dynamically computes costs binned by interval and updates the TUI widget
 * positioned below the editor. Operates entirely in local timezone.
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
	}
) {
	const current = getSettings(ctx);
	const intervalStr = opts?.interval ?? current.interval;
	const limit = opts?.limit ?? current.limit;
	const width = opts?.width ?? current.width;
	const visible = opts?.visible ?? current.visible;
	const showTicks = opts?.showTicks ?? current.showTicks;
	const mode = opts?.mode ?? current.mode;

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
					} else if (block.type === "toolCall") {
						const toolName = block.name || "";
						const tArgs = block.arguments || {};
						if (tArgs.path) files.add(String(tArgs.path));
						if (tArgs.filepath) files.add(String(tArgs.filepath));
						if (tArgs.file) files.add(String(tArgs.file));
						if (toolName.includes("bash") && tArgs.command) {
							commands.push(String(tArgs.command));
						}
					}
				}
			} else if (typeof assistantMsg.content === "string") {
				texts.push(assistantMsg.content);
			}

			// Preceding user prompt
			for (let j = i - 1; j >= 0; j--) {
				const prev = branch[j];
				if (prev.type === "message" && prev.message) {
					if (prev.message.role === "user") {
						if (typeof prev.message.content === "string") {
							texts.push(prev.message.content);
						} else if (Array.isArray(prev.message.content)) {
							for (const b of prev.message.content) {
								if (b.type === "text") texts.push(b.text);
							}
						}
						break;
					}
				}
			}

			// Sibling tool results / bash executions
			for (let j = i + 1; j < branch.length; j++) {
				const nextEntry = branch[j];
				if (nextEntry.type === "message" && nextEntry.message) {
					const msg = nextEntry.message;
					if (msg.role === "assistant" || msg.role === "user") {
						break;
					}
					if (msg.role === "toolResult") {
						if (msg.details && (msg.details.path || msg.details.filepath || msg.details.file)) {
							files.add(String(msg.details.path || msg.details.filepath || msg.details.file));
						}
					} else if ((msg as any).role === "bashExecution") {
						const bashMsg = msg as any;
						if (bashMsg.command) {
							commands.push(bashMsg.command);
						}
					}
				} else if (nextEntry.type === "bashExecution") {
					if ((nextEntry as any).command) {
						commands.push((nextEntry as any).command);
					}
				}
			}

			interactions.push({
				timestamp,
				cost,
				files,
				commands,
				texts
			});
		}
	}

	if (interactions.length === 0) {
		ctx.ui.setWidget("wtft", undefined);
		return;
	}

	const binMap = new Map<string, Bin>();
	let totalSessionCost = 0;

	for (const interaction of interactions) {
		const classification = classifyInteraction(interaction);
		const { key, label, dateStr } = getBinInfo(interaction.timestamp, intervalConfig);
		totalSessionCost += interaction.cost;

		let bin = binMap.get(key);
		if (!bin) {
			bin = { label, dateStr, spec_cost: 0, code_cost: 0, other_cost: 0, total_cost: 0 };
			binMap.set(key, bin);
		}

		if (classification === "spec") {
			bin.spec_cost += interaction.cost;
		} else if (classification === "code") {
			bin.code_cost += interaction.cost;
		} else {
			bin.other_cost += interaction.cost;
		}
		bin.total_cost += interaction.cost;
	}

	const sortedBins = Array.from(binMap.entries())
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([_, val]) => val);

	// Apply cumulative mode summing if requested on the full set of chronological bins
	if (mode === "cumulative") {
		let specSum = 0;
		let codeSum = 0;
		let otherSum = 0;
		for (const bin of sortedBins) {
			specSum += bin.spec_cost;
			codeSum += bin.code_cost;
			otherSum += bin.other_cost;

			bin.spec_cost = specSum;
			bin.code_cost = codeSum;
			bin.other_cost = otherSum;
			bin.total_cost = specSum + codeSum + otherSum;
		}
	}

	// Slice and reverse so that the most recent interval is displayed on top (first)
	const displayedBins = sortedBins.slice(-limit).reverse();
	const maxCostInDisplayed = Math.max(...displayedBins.map(b => b.total_cost), 0);

	const prefixWidth = 21;
	const finalWidth = Math.max(width, 40);
	const maxBarWidth = finalWidth - prefixWidth;

	// Resolve the title date indicator (newest local date in MMM-DD format)
	const newestBin = displayedBins[0];
	const newestDate = newestBin ? new Date(newestBin.dateStr + "T00:00:00") : new Date();
	const titleDateStr = formatLocalMmmDd(newestDate);

	const widgetLines: string[] = [];
	
	const displayModeLabel = mode === "cumulative" ? "Cumulative Session Cost" : "Total Session Cost";
	widgetLines.push(`📊 \x1b[1mWhere The F***ing Tokens?!\x1b[0m (${displayModeLabel}: \x1b[36m${formatCost(totalSessionCost)}\x1b[0m) - ${titleDateStr}`);

	// Render tick labels and marker lines above the bars if enabled
	if (showTicks && maxCostInDisplayed > 0) {
		const prefix = " ".repeat(prefixWidth);
		const { labelsLine, markersLine } = buildTickLines(maxCostInDisplayed, maxBarWidth);
		if (labelsLine) {
			widgetLines.push(prefix + `\x1b[2m${labelsLine}\x1b[0m`);
		}
		if (markersLine) {
			widgetLines.push(prefix + `\x1b[2m${markersLine}\x1b[0m`);
		}
	}

	// Render binned stacked bars
	for (let i = 0; i < displayedBins.length; i++) {
		const bin = displayedBins[i];

		// If crossing a local day boundary (current bin date is different from previous in descending loop),
		// draw a visual day change indicator line before rendering this older bin.
		if (i > 0 && bin.dateStr !== displayedBins[i - 1].dateStr) {
			const dateOfBin = new Date(bin.dateStr + "T00:00:00");
			const labelDay = formatLocalMmmDd(dateOfBin);
			const dayChangeText = `─── ${labelDay} `;
			const dividerLine = dayChangeText + "─".repeat(Math.max(0, finalWidth - dayChangeText.length));
			widgetLines.push(`\x1b[2m${dividerLine}\x1b[0m`);
		}

		const barWidth = maxCostInDisplayed > 0 ? Math.round((bin.total_cost / maxCostInDisplayed) * maxBarWidth) : 0;
		const chars = distributeChars(bin.spec_cost, bin.code_cost, bin.other_cost, barWidth);

		let barStr = "";
		if (chars.spec > 0) {
			barStr += `\x1b[92m${"█".repeat(chars.spec)}\x1b[0m`; // Spec Work (Green)
		}
		if (chars.code > 0) {
			barStr += `\x1b[38;5;208m${"█".repeat(chars.code)}\x1b[0m`; // Code Work (Orange)
		}
		if (chars.other > 0) {
			barStr += `\x1b[38;5;244m${"░".repeat(chars.other)}\x1b[0m`; // Other Work (Grey)
		}

		const labelPart = padString(bin.label, 11);
		const costPart = padString(formatCost(bin.total_cost), 6);
		widgetLines.push(`${labelPart}  ${costPart}  ${barStr}`);
	}

	widgetLines.push(`Legend:  \x1b[92m█\x1b[0m Spec (Green)   \x1b[38;5;208m█\x1b[0m Code (Orange)   \x1b[38;5;244m░\x1b[0m Other (Grey)`);

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
				hideWidget,
				showWidget,
				showTicks,
				mode,
				showHelp,
				hasInterval,
				hasLimit,
				hasWidth,
				hasTicks,
				hasMode
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
					mode: current.mode
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

			pi.appendEntry("wtft-settings", {
				interval: nextInterval,
				limit: nextLimit,
				width: nextWidth,
				visible: true,
				showTicks: nextTicks,
				mode: nextMode
			});

			updateWtftWidget(ctx, pi, {
				interval: nextInterval,
				limit: nextLimit,
				width: nextWidth,
				visible: true,
				showTicks: nextTicks,
				mode: nextMode
			});

			ctx.ui.notify("Token cost audit widget updated below the editor.", "info");
		}
	});
}
