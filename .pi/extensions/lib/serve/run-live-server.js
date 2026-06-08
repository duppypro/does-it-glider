#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";
import * as https from "node:https";
import * as http from "node:http";

// --- Argument Parsing ---
const args = process.argv.slice(2);
let targetDir = process.cwd();

// Find target directory (first non-flag argument)
for (let i = 0; i < args.length; i++) {
	if (!args[i].startsWith("-")) {
		targetDir = path.resolve(args[i]);
		break;
	}
}

// Find port, cert, and key
let port = 8080;
let certPath = "";
let keyPath = "";

for (let i = 0; i < args.length; i++) {
	const arg = args[i];
	if (arg === "-p" || arg === "--port") {
		port = parseInt(args[i + 1], 10);
	} else if (arg === "-C" || arg === "--cert") {
		certPath = args[i + 1];
	} else if (arg === "-K" || arg === "--key") {
		keyPath = args[i + 1];
	}
}

// Ensure SSL credentials exist
if (!certPath || !keyPath || !fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
	console.error("Error: SSL certificate or key path is missing or invalid.");
	process.exit(1);
}

const MIME_TYPES = {
	".html": "text/html",
	".css": "text/css",
	".js": "application/javascript",
	".mjs": "application/javascript",
	".json": "application/json",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".svg": "image/svg+xml",
	".ico": "image/x-icon",
	".txt": "text/plain"
};

// SSE Client Response Connections
const activeSseClients = new Set();

// Dependency Graph: Map<absolute_dep_path, Set<absolute_dependent_path>>
const dependencyGraph = new Map();

/**
 * Normalizes absolute or relative paths to trace imports reliably.
 */
function resolveDependencyPath(parentDir, importPath) {
	if (importPath.startsWith("/") || importPath.startsWith("http://") || importPath.startsWith("https://")) {
		return null;
	}
	return path.resolve(parentDir, importPath);
}

/**
 * Parses a JS/HTML file and updates the dependency graph.
 */
function parseDependencies(filePath) {
	try {
		const content = fs.readFileSync(filePath, "utf8");
		const fileDir = path.dirname(filePath);
		const ext = path.extname(filePath);

		// Clear previous dependencies for this file
		for (const [dep, dependents] of dependencyGraph.entries()) {
			dependents.delete(filePath);
			if (dependents.size === 0) {
				dependencyGraph.delete(dep);
			}
		}

		if (ext === ".js" || ext === ".mjs") {
			const importRegex = /(?:import\s+.*?\s+from\s+|import\s+)['"]([^'"]+)['"]/g;
			let match;
			while ((match = importRegex.exec(content)) !== null) {
				const depPath = resolveDependencyPath(fileDir, match[1]);
				if (depPath && fs.existsSync(depPath)) {
					if (!dependencyGraph.has(depPath)) {
						dependencyGraph.set(depPath, new Set());
					}
					dependencyGraph.get(depPath).add(filePath);
				}
			}
		} else if (ext === ".html") {
			const linkRegex = /<link[^>]*?href=['"]([^'"]*?\.css)['"]/g;
			const scriptRegex = /<script[^>]*?src=['"]([^'"]*?\.js)['"]/g;
			const fetchRegex = /fetch\(['"]([^'"]+?)['"]\)/g;

			let match;
			while ((match = linkRegex.exec(content)) !== null) {
				const depPath = resolveDependencyPath(fileDir, match[1]);
				if (depPath && fs.existsSync(depPath)) {
					if (!dependencyGraph.has(depPath)) {
						dependencyGraph.set(depPath, new Set());
					}
					dependencyGraph.get(depPath).add(filePath);
				}
			}
			while ((match = scriptRegex.exec(content)) !== null) {
				const depPath = resolveDependencyPath(fileDir, match[1]);
				if (depPath && fs.existsSync(depPath)) {
					if (!dependencyGraph.has(depPath)) {
						dependencyGraph.set(depPath, new Set());
					}
					dependencyGraph.get(depPath).add(filePath);
				}
			}
			while ((match = fetchRegex.exec(content)) !== null) {
				const depPath = resolveDependencyPath(fileDir, match[1]);
				if (depPath && fs.existsSync(depPath)) {
					if (!dependencyGraph.has(depPath)) {
						dependencyGraph.set(depPath, new Set());
					}
					dependencyGraph.get(depPath).add(filePath);
				}
			}
		}
	} catch (_) {}
}

/**
 * Recursively scans directory to build initial dependency graph.
 */
function scanDirectoryForDependencies(dir) {
	try {
		const entries = fs.readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				if (entry.name !== "node_modules" && !entry.name.startsWith(".")) {
					scanDirectoryForDependencies(fullPath);
				}
			} else if (entry.isFile()) {
				const ext = path.extname(entry.name);
				if (ext === ".js" || ext === ".html" || ext === ".mjs") {
					parseDependencies(fullPath);
				}
			}
		}
	} catch (_) {}
}

/**
 * Determines if a file is actively used by checking its connections to any HTML file.
 */
function isFileConnectedToHtml(filePath, visited = new Set()) {
	if (visited.has(filePath)) return false;
	visited.add(filePath);

	if (path.extname(filePath) === ".html") return true;

	const dependents = dependencyGraph.get(filePath);
	if (!dependents || dependents.size === 0) return false;

	for (const dep of dependents) {
		if (isFileConnectedToHtml(dep, visited)) {
			return true;
		}
	}
	return false;
}

/**
 * Broadcasts an SSE reload signal to all active browsers.
 */
function broadcast(payload) {
	const message = `data: ${JSON.stringify(payload)}\n\n`;
	for (const client of activeSseClients) {
		client.write(message);
	}
}

// --- HTML Client Injection Script ---
const INJECTION_SCRIPT = `
<script>
(function() {
	const es = new EventSource('/__live-reload');
	es.onmessage = (e) => {
		const data = JSON.parse(e.data);
		if (data.type === 'css') {
			const links = document.querySelectorAll('link[rel="stylesheet"]');
			for (const link of links) {
				const url = new URL(link.href, window.location.href);
				if (url.pathname === data.path || url.pathname.endsWith(data.path)) {
					link.href = url.pathname + '?t=' + Date.now();
					break;
				}
			}
		} else if (data.type === 'reload') {
			location.reload();
		}
	};
	es.onerror = () => {
		// Auto-reconnect natively
	};
})();
</script>
`;

/**
 * Generates a styled HTML directory listing.
 */
function generateDirectoryIndex(dirPath, requestPath) {
	let html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Index of ${requestPath}</title>
	<style>
		:root {
			--bg-color: #1e1e1e;
			--text-color: #d4d4d4;
			--box-bg: #2d2d2d;
			--accent-blue: #569cd6;
			--accent-green: #6a9955;
			--accent-yellow: #dcdcaa;
		}
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
			background-color: var(--bg-color);
			color: var(--text-color);
			max-width: 800px;
			margin: 40px auto;
			padding: 0 20px;
			line-height: 1.6;
		}
		h1 { color: var(--accent-blue); border-bottom: 2px solid var(--accent-blue); padding-bottom: 10px; margin-bottom: 20px; }
		.list { background: var(--box-bg); border: 1px solid #404040; border-radius: 8px; overflow: hidden; }
		a { color: var(--accent-blue); text-decoration: none; display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid #333; }
		a:last-child { border-bottom: none; }
		a:hover { background: #333; text-decoration: underline; }
		.parent-dir { color: var(--accent-green); font-weight: bold; }
		.icon { margin-right: 12px; font-size: 1.2em; }
	</style>
</head>
<body>
	<h1>Index of ${requestPath}</h1>
	<div class="list">`;

	if (requestPath !== "/" && requestPath !== "") {
		const parentPath = path.dirname(requestPath);
		html += `<a class="parent-dir" href="${parentPath === "." ? "/" : parentPath}"><span class="icon">📁</span>.. (Parent Directory)</a>`;
	}

	try {
		const entries = fs.readdirSync(dirPath, { withFileTypes: true });
		
		// Sort: directories first, then files alphabetically
		entries.sort((a, b) => {
			if (a.isDirectory() && !b.isDirectory()) return -1;
			if (!a.isDirectory() && b.isDirectory()) return 1;
			return a.name.localeCompare(b.name);
		});

		for (const entry of entries) {
			if (entry.name.startsWith(".") || entry.name === "node_modules") {
				continue;
			}
			const relativeHref = path.join(requestPath, entry.name).replace(/\\/g, "/");
			if (entry.isDirectory()) {
				html += `<a href="${relativeHref}/"><span class="icon">📁</span>${entry.name}/</a>`;
			} else {
				html += `<a href="${relativeHref}"><span class="icon">📄</span>${entry.name}</a>`;
			}
		}
	} catch (err) {
		html += `<p style="padding: 16px; color: var(--anchor-red)">Error reading directory: ${err.message}</p>`;
	}

	html += `</div></body></html>`;
	
	if (html.includes("</body>")) {
		html = html.replace("</body>", `${INJECTION_SCRIPT}</body>`);
	} else {
		html += INJECTION_SCRIPT;
	}

	return html;
}

// --- Server Lifecycle Setup ---
scanDirectoryForDependencies(targetDir);

const credentials = {
	cert: fs.readFileSync(certPath),
	key: fs.readFileSync(keyPath)
};

const server = https.createServer(credentials, (req, res) => {
	const reqUrl = req.url || "/";

	// SSE Endpoint
	if (reqUrl === "/__live-reload") {
		res.writeHead(200, {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			"Connection": "keep-alive"
		});
		res.write(":\n\n");
		activeSseClients.add(res);

		req.on("close", () => {
			activeSseClients.delete(res);
		});
		return;
	}

	let safePath = reqUrl.split("?")[0];
	try {
		safePath = decodeURIComponent(safePath);
	} catch (_) {}

	let filePath = path.join(targetDir, safePath);

	if (!filePath.startsWith(targetDir)) {
		res.writeHead(403, { "Content-Type": "text/plain" });
		res.end("Forbidden");
		return;
	}

	if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
		const indexPath = path.join(filePath, "index.html");
		if (fs.existsSync(indexPath)) {
			filePath = indexPath;
		} else {
			const html = generateDirectoryIndex(filePath, safePath);
			res.writeHead(200, { "Content-Type": "text/html" });
			res.end(html);
			return;
		}
	}

	if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
		res.writeHead(404, { "Content-Type": "text/plain" });
		res.end("Not Found");
		return;
	}

	const ext = path.extname(filePath).toLowerCase();
	const contentType = MIME_TYPES[ext] || "application/octet-stream";

	res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
	res.setHeader("Pragma", "no-cache");
	res.setHeader("Expires", "0");

	if (ext === ".html") {
		fs.readFile(filePath, "utf8", (err, content) => {
			if (err) {
				res.writeHead(500, { "Content-Type": "text/plain" });
				res.end("Internal Server Error");
				return;
			}

			let injectedContent = content;
			if (content.includes("</body>")) {
				injectedContent = content.replace("</body>", `${INJECTION_SCRIPT}</body>`);
			} else {
				injectedContent = content + INJECTION_SCRIPT;
			}

			res.writeHead(200, { "Content-Type": "text/html" });
			res.end(injectedContent);
		});
	} else {
		res.writeHead(200, { "Content-Type": contentType });
		fs.createReadStream(filePath).pipe(res);
	}
});

// --- Debounced File Watcher ---
let debounceTimeout = null;
const changedFiles = new Set();

fs.watch(targetDir, { recursive: true }, (eventType, filename) => {
	if (!filename) return;
	const fullPath = path.join(targetDir, filename);

	if (filename.startsWith(".") || filename.includes("/.") || filename.includes("node_modules")) {
		return;
	}

	changedFiles.add(fullPath);

	if (debounceTimeout) {
		clearTimeout(debounceTimeout);
	}

	debounceTimeout = setTimeout(() => {
		const filesToProcess = Array.from(changedFiles);
		changedFiles.clear();

		let shouldReload = false;
		const cssChanges = new Set();

		for (const changedPath of filesToProcess) {
			const ext = path.extname(changedPath).toLowerCase();

			if (fs.existsSync(changedPath)) {
				if (ext === ".js" || ext === ".html" || ext === ".mjs") {
					parseDependencies(changedPath);
				}
			}

			if (ext === ".css") {
				const relativePath = "/" + path.relative(targetDir, changedPath).replace(/\\/g, "/");
				if (isFileConnectedToHtml(changedPath)) {
					cssChanges.add(relativePath);
				}
			} else if (ext === ".js" || ext === ".html" || ext === ".mjs" || ext === ".json") {
				if (isFileConnectedToHtml(changedPath)) {
					shouldReload = true;
				}
			}
		}

		for (const cssPath of cssChanges) {
			broadcast({ type: "css", path: cssPath });
		}

		if (shouldReload) {
			broadcast({ type: "reload" });
		}
	}, 150);
});

// Start Server listening
server.listen(port, "0.0.0.0", () => {
	console.log(`Live dev server active at port ${port}`);
});
