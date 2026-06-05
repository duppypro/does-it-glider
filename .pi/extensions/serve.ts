import { type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawn, exec, execSync } from "node:child_process";
import { isInsideRepo, KilledServerInstance } from "./lib/serve/domain.js";
import { discoverServers, resolveIp, checkServerStatus, findPidByPort } from "./lib/serve/process.js";
import { getVisibility } from "./lib/serve/store.js";
import { updateWidget, shortenPath, buildKilledSummary, buildDiscoveredSummary } from "./lib/serve/tui.js";

// Track widget visibility state locally (persisted across reloads via session log)
let isWidgetVisible = true;

// Active instance tracking to self-prune leaked event bus listeners across reloads
let activeInstanceId = "";

/**
 * Ensures that self-signed SSL/TLS certificates exist in the user's home directory.
 * If they do not exist, they are generated securely using OpenSSL.
 */
function getOrCreateCertificates(ctx: any): { cert: string; key: string } {
	const certsDir = path.join(os.homedir(), ".pi-certs");
	const certPath = path.join(certsDir, "cert.pem");
	const keyPath = path.join(certsDir, "key.pem");

	if (!fs.existsSync(certsDir)) {
		try {
			fs.mkdirSync(certsDir, { recursive: true, mode: 0o700 });
		} catch (err) {
			ctx.ui.notify(`⚠️ Failed to create directory "${certsDir}": ${err}`, "error");
		}
	}

	if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
		ctx.ui.notify("🔑 Generating persistent self-signed SSL certificates in ~/.pi-certs/...", "info");
		try {
			execSync(
				`openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout "${keyPath}" -out "${certPath}" -subj "/CN=localhost"`,
				{ stdio: "ignore" }
			);
			// Restrict file permissions for security
			try {
				fs.chmodSync(keyPath, 0o600);
				fs.chmodSync(certPath, 0o644);
			} catch (_) {}
		} catch (err) {
			ctx.ui.notify(`⚠️ Failed to generate SSL certificates with openssl: ${err}`, "error");
		}
	}

	return { cert: certPath, key: keyPath };
}

export default function serveExtension(pi: ExtensionAPI) {
	const myInstanceId = Math.random().toString(36).substring(2, 11);
	activeInstanceId = myInstanceId;

	let unsubscribeTick: (() => void) | null = null;

	// 1. Auto-discover on session start, restore visibility state, and hook into central refresher service
	pi.on("session_start", async (_event, ctx) => {
		isWidgetVisible = getVisibility(ctx);
		const servers = await discoverServers();
		
		updateWidget(ctx, servers, isWidgetVisible, ctx.cwd);

		// Subscribe to the centralized refresher tick event
		unsubscribeTick = pi.events.on("clock:tick:4s", async () => {
			if (activeInstanceId !== myInstanceId) {
				// Self-prune: We are a leaked, stale listener from a previous reload
				if (unsubscribeTick) unsubscribeTick();
				return;
			}

			if (!isWidgetVisible) {
				ctx.ui.setWidget("serve-ports", undefined);
				return;
			}
			const currentServers = await discoverServers();
			updateWidget(ctx, currentServers, isWidgetVisible, ctx.cwd);
		});
	});

	// 2. Display persistent active server list reminder on `/quit` / exit
	pi.on("session_shutdown", async (_event, ctx) => {
		// Clean up the global event listener to prevent event listener leaks on reload
		if (unsubscribeTick) {
			unsubscribeTick();
			unsubscribeTick = null;
		}

		const allServers = await discoverServers();
		const repoServers = allServers.filter(s => isInsideRepo(s.dir, ctx.cwd));
		if (repoServers.length > 0) {
			const serverLinks = repoServers
				.map(s => `  • \x1b[36m${shortenPath(s.dir, ctx.cwd)}\x1b[0m served at \x1b[4m\x1b[34m${s.url}\x1b[0m`)
				.join("\n");
			
			console.log(
				`\n\x1b[1m\x1b[33m⚠️  REMINDER: You have active background servers running in this repository:\x1b[0m\n` +
				serverLinks + `\n\n` +
				`\x1b[33mThese servers will remain active during your "pause". To stop them, resume this session and run:\x1b[0m\n` +
				`  \x1b[1m/serve --kill\x1b[0m\n`
			);
		}
	});

	// 3. Define the /serve command
	pi.registerCommand("serve", {
		description: "Serve public/ and docs/ (or specified directories) securely over HTTPS with helper controls",
		handler: async (args, ctx) => {
			const trimmedArgs = args.trim();

			// -- LOG OPTION --
			if (trimmedArgs === "--log") {
				const activeServers = await discoverServers();
				const repoServers = activeServers.filter(s => isInsideRepo(s.dir, ctx.cwd));
				if (repoServers.length === 0) {
					ctx.ui.notify("No servers are currently running in this repository.", "info");
				} else {
					const lines = repoServers.map(s => `• \x1b[36m${shortenPath(s.dir, ctx.cwd)}\x1b[0m served at \x1b[4m\x1b[34m${s.url}\x1b[0m`);
					ctx.ui.notify(`🚀 Servers active in this repository:\n\n${lines.join("\n")}`, "info");
				}
				return;
			}

			// -- HELP OPTION --
			if (trimmedArgs === "--help" || trimmedArgs === "-h") {
				try {
					const manifestPath = path.join(ctx.cwd, "docs", "extensions", "manifests", "serve-cmd.json");
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
					ctx.ui.notify(`⚠️ Failed to load command manifest: ${err}`, "error");
				}
				return;
			}

			// -- HIDE OPTION --
			if (trimmedArgs === "--hide") {
				isWidgetVisible = false;
				pi.appendEntry("serve-visibility", { visible: false });
				updateWidget(ctx, [], isWidgetVisible, ctx.cwd);
				ctx.ui.notify("Active server list widget hidden.", "info");
				return;
			}

			// -- SHOW OPTION --
			if (trimmedArgs === "--show") {
				isWidgetVisible = true;
				pi.appendEntry("serve-visibility", { visible: true });
				const servers = await discoverServers();
				updateWidget(ctx, servers, isWidgetVisible, ctx.cwd);

				if (servers.length > 0) {
					ctx.ui.notify(`Discovered and displaying ${servers.length} active servers.`, "info");
				} else {
					ctx.ui.setWidget("serve-ports", undefined);
					ctx.ui.notify("No active servers found to display.", "warning");
				}
				return;
			}

			// -- KILL OPTION --
			if (trimmedArgs.startsWith("--kill") || trimmedArgs.startsWith("--cancel") || trimmedArgs.startsWith("--off") || trimmedArgs === "-k") {
				const killArgs = trimmedArgs.replace(/^(--kill|--cancel|--off|-k)/, "").trim();
				const targets = killArgs.split(/\s+/).map(t => t.trim()).filter(t => t.length > 0);

				const activeServers = await discoverServers();
				const killedList: KilledServerInstance[] = [];

				if (targets.length === 0) {
					const repoServers = activeServers.filter(s => isInsideRepo(s.dir, ctx.cwd));
					if (repoServers.length === 0) {
						ctx.ui.notify("No servers are currently running in this repository to kill.", "warning");
						return;
					}

					for (const server of repoServers) {
						const statusBefore = await checkServerStatus(server.url);
						const pid = await findPidByPort(server.port);
						if (pid) {
							try {
								process.kill(pid, "SIGKILL");
							} catch (e) {
								exec(`kill -9 ${pid}`);
							}
						}
						const statusAfter = await checkServerStatus(server.url);

						killedList.push({
							port: server.port,
							dir: server.dir,
							url: server.url,
							title: server.title,
							statusBefore,
							statusAfter
						});
					}
				} else {
					for (const target of targets) {
						const isPort = /^\d+$/.test(target);
						let matchedServer = activeServers.find(s => {
							if (isPort) {
								return s.port === parseInt(target, 10);
							} else {
								return s.dir.replace(/\/$/, "") === target.replace(/\/$/, "") || shortenPath(s.dir, ctx.cwd) === target.replace(/\/$/, "");
							}
						});

						if (matchedServer) {
							const statusBefore = await checkServerStatus(matchedServer.url);
							const pid = await findPidByPort(matchedServer.port);
							if (pid) {
								try {
									process.kill(pid, "SIGKILL");
								} catch (e) {
									exec(`kill -9 ${pid}`);
								}
							}

							const statusAfter = await checkServerStatus(matchedServer.url);

							killedList.push({
								port: matchedServer.port,
								dir: matchedServer.dir,
								url: matchedServer.url,
								title: matchedServer.title,
								statusBefore,
								statusAfter
							});
						} else {
							ctx.ui.notify(`⚠️ Could not find any active server matching "${target}".`, "warning");
						}
					}
				}

				if (killedList.length === 0) {
					ctx.ui.notify("No servers were terminated.", "warning");
					return;
				}

				const remainingServers = await discoverServers();
				updateWidget(ctx, remainingServers, isWidgetVisible, ctx.cwd);

				const fullSummary = buildKilledSummary(killedList, ctx.cwd);
				ctx.ui.notify(fullSummary, "info");
				return;
			}

			// -- START SERVERS MODE (Default) --
			let dirs = trimmedArgs.split(/\s+/).map(d => d.trim()).filter(d => d.length > 0);
			if (dirs.length === 0) {
				dirs = ["public", "docs"];
			}

			let startPort = 8080;
			const ip = await resolveIp();

			for (const rawDir of dirs) {
				const targetDir = path.resolve(ctx.cwd, rawDir);

				if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
					ctx.ui.notify(`⚠️ Warning: Directory "${rawDir}" does not exist. Skipping.`, "warning");
					continue;
				}

				const activeServers = await discoverServers();
				if (activeServers.some(s => path.resolve(ctx.cwd, s.dir) === targetDir)) {
					ctx.ui.notify(`ℹ️ Note: Directory "${rawDir}" is already being served. Skipping.`, "info");
					continue;
				}

				const envPath = path.join(targetDir, ".env");
				if (fs.existsSync(envPath)) {
					const proceed = await ctx.ui.confirm(
						"⚠️ Secret Warning",
						`Found .env file in "${rawDir}"! This directory may contain sensitive secrets.\nAre you sure you want to serve it?`
					);
					if (!proceed) {
						ctx.ui.notify(`Skipped directory "${rawDir}" due to secret warning.`, "info");
						continue;
					}
				}

				while (activeServers.some(s => s.port === startPort)) {
					startPort++;
				}

				const port = startPort++;
				const { cert, key } = getOrCreateCertificates(ctx);

				const serverProcess = spawn("npx", [
					"--",
					"http-server",
					targetDir,
					"-S",
					"-C", cert,
					"-K", key,
					"-p", String(port),
					"-a", "0.0.0.0"
				], {
					detached: true,
					stdio: "ignore"
				});

				serverProcess.unref();
			}

			await new Promise(r => setTimeout(r, 1200));

			const allActiveServers = await discoverServers();

			if (allActiveServers.length === 0) {
				ctx.ui.notify("No active directories are currently being served.", "warning");
				return;
			}

			updateWidget(ctx, allActiveServers, isWidgetVisible, ctx.cwd);

			const fullSummary = buildDiscoveredSummary(allActiveServers, ctx.cwd);
			ctx.ui.notify(fullSummary, "info");
		}
	});
}
