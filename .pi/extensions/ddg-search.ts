import { Type } from "@earendil-works/pi-ai";
import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { homedir } from "node:os";

// Define the interface for DuckDuckGo JSON result structures returned by ddgr
interface SearchResult {
	title: string;
	url: string;
	abstract: string;
}

// Create and export the custom Search Web tool definition
const searchWebTool = defineTool({
	name: "search_web",
	label: "Web Search",
	description: "Search the web for up-to-date information, documentation, and error resolutions using DuckDuckGo. Highly recommended for Svelte 5 and modern framework guidelines.",
	
	// Define the parameters schema using TypeBox
	parameters: Type.Object({
		query: Type.String({ description: "The search query to send to DuckDuckGo" }),
		max_results: Type.Optional(Type.Integer({ 
			description: "Maximum number of search results to retrieve (default: 5, max: 10)",
			minimum: 1,
			maximum: 10
		}))
	}),

	// The execution logic runs when the AI calls the tool
	async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
		const query = params.query;
		const maxResults = params.max_results ?? 5;

		// Resolve the absolute path of the local ddgr installation
		const ddgrExecutable = join(homedir(), ".local/bin/ddgr");

		return new Promise((resolve) => {
			// Execute ddgr as a safe, shell-injection proof subprocess
			execFile(
				ddgrExecutable,
				["--json", "-n", String(maxResults), query],
				{ timeout: 15000 }, // 15-second timeout limit
				(error, stdout, stderr) => {
					// Handle execution failures gracefully
					if (error) {
						resolve({
							content: [{
								type: "text",
								text: `❌ Web search failed: ${error.message}\n${stderr}`
							}],
							details: { error: error.message, stderr }
						});
						return;
					}

					try {
						// Parse the JSON array of search results
						const results: SearchResult[] = JSON.parse(stdout);

						if (results.length === 0) {
							resolve({
								content: [{
									type: "text",
									text: `🔍 Search for "${query}" returned 0 results. Try simplifying your query.`
								}]
							});
							return;
						}

						// Format results cleanly into human-readable Markdown
						let markdownOutput = `### 🔍 Search Results for: *"${query}"*\n\n`;
						
						results.forEach((result, idx) => {
							markdownOutput += `${idx + 1}. **[${result.title}](${result.url})**\n`;
							markdownOutput += `   _${result.abstract.trim()}_\n\n`;
						});

						resolve({
							content: [{
								type: "text",
								text: markdownOutput
							}],
							details: { query, count: results.length }
						});
					} catch (parseError: any) {
						resolve({
							content: [{
								type: "text",
								text: `⚠️ Failed to parse search results: ${parseError.message}\nRaw output: ${stdout}`
							}],
							details: { rawStdout: stdout, parseError: parseError.message }
						});
					}
				}
			);
		});
	}
});

// The entrypoint function that Pi loads to register the extension
export default function (pi: ExtensionAPI) {
	pi.registerTool(searchWebTool);
}
