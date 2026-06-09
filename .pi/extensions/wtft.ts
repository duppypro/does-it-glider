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
	spec_cost: number;
	code_cost: number;
	other_cost: number;
	total_cost: number;
}

// ---
// ARGUMENT PARSING
// ---

/**
 * Parses raw command argument string into typed options.
 * Supports standard flags (-i, --interval, -l, --limit, -h, --help) with space or equals.
 */
function parseArgs(argsStr: string) {
	const args = argsStr.trim().split(/\s+/).filter(Boolean);
	let interval: "6m" | "1h" | "1d" | "1w" = "1h";
	let limit = 10;
	let showHelp = false;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--help" || arg === "-h") {
			showHelp = true;
		} else if (arg === "-i" || arg === "--interval") {
			const val = args[i + 1];
			if (val === "6m" || val === "1h" || val === "1d" || val === "1w") {
				interval = val;
				i++;
			}
		} else if (arg === "-l" || arg === "--limit") {
			const val = args[i + 1];
			const num = parseInt(val, 10);
			if (!isNaN(num) && num > 0) {
				limit = num;
				i++;
			}
		} else if (arg.startsWith("--interval=")) {
			const val = arg.split("=")[1];
			if (val === "6m" || val === "1h" || val === "1d" || val === "1w") {
				interval = val;
			}
		} else if (arg.startsWith("--limit=")) {
			const val = arg.split("=")[1];
			const num = parseInt(val, 10);
			if (!isNaN(num) && num > 0) {
				limit = num;
			}
		}
	}

	return { interval, limit, showHelp };
}

// ---
// LOG PARSER & CLASSIFICATION
// ---

/**
 * Classifies an interaction based on file modifications/reads, executed bash commands,
 * and text keywords. The logic enforces strict priority to handle overlap accurately:
 * 1. Code Work (code): touches .pi/extensions, src, tests, public or runs development bash commands.
 * 2. Spec Work (spec): touches docs, AGENTS.md, ARCHITECTURE.md, README.md or contains design planning terms.
 * 3. Other Work (other): conversation, setup, or untraced exchanges.
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

	// Code file changes take absolute priority over planning/docs
	if (hasCodeFile) {
		return "code";
	}
	if (hasSpecFile) {
		return "spec";
	}

	// Analyze executed shell commands
	for (const cmd of interaction.commands) {
		const lowerCmd = cmd.toLowerCase();
		
		// Development/Test indicators
		if (
			/\b(npm|pnpm|yarn|bun)\s+(run\s+)?(test|build|compile)\b/.test(lowerCmd) ||
			/\b(vitest|jest|pytest|tsc|cargo\s+test|go\s+test)\b/.test(lowerCmd)
		) {
			return "code";
		}
		
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
 * Maps a timestamp to an interval key and formatted UI display label.
 */
function getBinInfo(timestamp: number, interval: "6m" | "1h" | "1d" | "1w"): { key: string; label: string } {
	const d = new Date(timestamp);
	const pad = (n: number) => String(n).padStart(2, "0");
	const monthDay = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

	if (interval === "6m") {
		const m = Math.floor(d.getMinutes() / 6) * 6;
		const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), m, 0, 0);
		const end = new Date(start.getTime() + 6 * 60 * 1000);
		
		const startStr = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
		const endStr = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
		return {
			key: start.toISOString(),
			label: `${startStr} - ${endStr} (${monthDay})`
		};
	} else if (interval === "1h") {
		const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), 0, 0, 0);
		const end = new Date(start.getTime() + 60 * 60 * 1000);
		
		const startStr = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
		const endStr = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
		return {
			key: start.toISOString(),
			label: `${startStr} - ${endStr} (${monthDay})`
		};
	} else if (interval === "1d") {
		const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
		const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
		return {
			key: start.toISOString(),
			label: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} (${days[start.getDay()]})`
		};
	} else {
		// 1w (Weeks starting on Sunday)
		const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay(), 0, 0, 0, 0);
		return {
			key: start.toISOString(),
			label: `Week of ${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`
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
// FORMATTING HELPERS
// ---

function padString(str: string, len: number): string {
	return str.length >= len ? str : str + " ".repeat(len - str.length);
}

function formatCost(cost: number): string {
	if (cost === 0) return "$0.0000";
	if (cost < 0.0001) {
		return `$${cost.toFixed(6)}`;
	}
	return `$${cost.toFixed(4)}`;
}

// ---
// MAIN EXTENSION ENTRY POINT
// ---

export default function wtftExtension(pi: ExtensionAPI) {
	pi.registerCommand("wtft", {
		description: "Where The F***ing Tokens?! (WTFT) - Cost Auditing Utility",
		handler: async (args, ctx) => {
			const { interval, limit, showHelp } = parseArgs(args);

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

			// Retrieve the active branch entries representing the session timeline
			const branch = ctx.sessionManager.getBranch();
			const interactions: Interaction[] = [];

			// Group messages and associated metadata into cohesive turns/interactions
			for (let i = 0; i < branch.length; i++) {
				const entry = branch[i];
				if (entry.type === "message" && entry.message && entry.message.role === "assistant") {
					const assistantMsg = entry.message;
					const cost = assistantMsg.usage?.cost?.total || 0;
					const timestamp = assistantMsg.timestamp || new Date(entry.timestamp).getTime();

					const files = new Set<string>();
					const commands: string[] = [];
					const texts: string[] = [];

					// Gather data from assistant message content blocks
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

					// Look backward for the immediate user prompt to gather user-side keywords
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

					// Look forward for tools results/bash execution details before the next user/assistant message
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
				console.log("📊 No assistant interactions recorded in this session yet.");
				return;
			}

			// Aggregate interaction costs into chronological bins
			const binMap = new Map<string, Bin>();
			let totalSessionCost = 0;

			for (const interaction of interactions) {
				const classification = classifyInteraction(interaction);
				const { key, label } = getBinInfo(interaction.timestamp, interval);
				totalSessionCost += interaction.cost;

				let bin = binMap.get(key);
				if (!bin) {
					bin = { label, spec_cost: 0, code_cost: 0, other_cost: 0, total_cost: 0 };
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

			// Sort bins chronologically and apply requested limit
			const sortedBins = Array.from(binMap.entries())
				.sort((a, b) => a[0].localeCompare(b[0]))
				.map(([_, val]) => val);

			const displayedBins = sortedBins.slice(-limit);
			const maxCostInDisplayed = Math.max(...displayedBins.map(b => b.total_cost), 0);

			// Render standard horizontal TUI ASCII stacked bar chart
			const intervalColWidth = 30;
			const costColWidth = 12;
			const MAX_BAR_WIDTH = 30;

			let out = `📊 Where The F***ing Tokens?! (Total Session Cost: ${formatCost(totalSessionCost)})\n\n`;
			out += `${padString(`Interval (${interval} bins)`, intervalColWidth)}${padString("Cost ($)", costColWidth)}Stacked Bar Breakdown\n`;
			out += "─".repeat(intervalColWidth + costColWidth + MAX_BAR_WIDTH) + "\n";

			for (const bin of displayedBins) {
				const barWidth = maxCostInDisplayed > 0 ? Math.round((bin.total_cost / maxCostInDisplayed) * MAX_BAR_WIDTH) : 0;
				const chars = distributeChars(bin.spec_cost, bin.code_cost, bin.other_cost, barWidth);

				let barStr = "";
				if (chars.spec > 0) {
					barStr += `\x1b[38;5;208m${"█".repeat(chars.spec)}\x1b[0m`;
				}
				if (chars.code > 0) {
					barStr += `\x1b[32m${"█".repeat(chars.code)}\x1b[0m`;
				}
				if (chars.other > 0) {
					barStr += `\x1b[34m${"░".repeat(chars.other)}\x1b[0m`;
				}

				out += `${padString(bin.label, intervalColWidth)}${padString(formatCost(bin.total_cost), costColWidth)}${barStr}\n`;
			}

			out += `\nLegend:  \x1b[38;5;208m█\x1b[0m Spec (Orange)   \x1b[32m█\x1b[0m Code (Green)   \x1b[34m░\x1b[0m Other (Blue)\n`;

			console.log(out);
		}
	});
}
