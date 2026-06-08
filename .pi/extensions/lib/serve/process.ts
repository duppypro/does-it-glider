import * as https from "node:https";
import * as http from "node:http";
import { exec } from "node:child_process";
import { ServerInstance } from "./domain.js";

// Cached public IP address of the VPS
let cachedPublicIp: string | null = null;

export async function resolveIp(): Promise<string> {
	if (cachedPublicIp) return cachedPublicIp;
	try {
		cachedPublicIp = await getPublicIp();
	} catch (e) {
		cachedPublicIp = "127.0.0.1";
	}
	return cachedPublicIp;
}

function getPublicIp(): Promise<string> {
	return new Promise((resolve) => {
		https.get("https://api.ipify.org", { timeout: 1000 }, (res) => {
			let data = "";
			res.on("data", (chunk) => { data += chunk; });
			res.on("end", () => {
				const ip = data.trim();
				if (ip && ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
					resolve(ip);
				} else {
					resolve("127.0.0.1");
				}
			});
		}).on("error", () => {
			resolve("127.0.0.1");
		});
	});
}

export function discoverServers(): Promise<ServerInstance[]> {
	return new Promise((resolve) => {
		exec("ps aux | grep -E 'http-server|run-live-server' | grep -v grep", async (error, stdout) => {
			if (error || !stdout) {
				resolve([]);
				return;
			}

			const servers: ServerInstance[] = [];
			const lines = stdout.split("\n").filter(l => l.trim().length > 0);
			const ip = await resolveIp();

			for (const line of lines) {
				const portMatch = line.match(/-p\s+(\d+)/) || line.match(/--port\s+(\d+)/);
				if (!portMatch) continue;
				const port = parseInt(portMatch[1], 10);

				if (servers.some(s => s.port === port)) continue;

				const parts = line.split(/\s+/);
				const httpServerIdx = parts.findIndex(p => p.includes("http-server") || p.includes("run-live-server"));
				if (httpServerIdx === -1) continue;

				let dir = "current";
				for (let i = httpServerIdx + 1; i < parts.length; i++) {
					const part = parts[i];
					if (part.startsWith("-")) {
						if (part === "-p" || part === "-C" || part === "-K" || part === "-a") {
							i++; // skip value
						}
						continue;
					}
					if (part.length > 0 && !part.includes("npx")) {
						dir = part;
						break;
					}
				}

				const isSsl = line.includes(" -S") || line.includes(" --ssl");
				const protocol = isSsl ? "https" : "http";
				const url = `${protocol}://${ip}:${port}`;

				let title = isSsl ? "Secure HTTPS Page" : "Index Page";
				try {
					title = await fetchPageTitle(url);
				} catch (e) {
					// ignore
				}

				servers.push({ port, dir, url, title });
			}

			resolve(servers);
		});
	});
}

export function findPidByPort(port: number): Promise<number | null> {
	return new Promise((resolve) => {
		exec(`lsof -t -i :${port}`, (error, stdout) => {
			if (error || !stdout) {
				resolve(null);
				return;
			}
			const pids = stdout.split("\n").map(p => p.trim()).filter(p => p.length > 0);
			if (pids.length > 0) {
				resolve(parseInt(pids[0], 10));
			} else {
				resolve(null);
			}
		});
	});
}

export function fetchPageTitle(url: string): Promise<string> {
	return new Promise((resolve) => {
		const isSsl = url.startsWith("https");
		const getter = isSsl ? https.get : http.get;
		const agent = isSsl ? new https.Agent({ rejectUnauthorized: false }) : undefined;

		getter(url, { agent, timeout: 500 } as any, (res) => {
			let data = "";
			res.on("data", (chunk) => { data += chunk; });
			res.on("end", () => {
				const match = data.match(/<title>([^<]+)<\/title>/i);
				if (match && match[1]) {
					resolve(match[1].trim());
				} else {
					resolve(isSsl ? "Secure HTTPS Page" : "Web Page");
				}
			});
		}).on("error", () => {
			resolve(isSsl ? "Secure HTTPS Page" : "Web Page");
		});
	});
}

export function checkServerStatus(url: string): Promise<string> {
	return new Promise((resolve) => {
		const isSsl = url.startsWith("https");
		const getter = isSsl ? https.get : http.get;
		const agent = isSsl ? new https.Agent({ rejectUnauthorized: false }) : undefined;

		const req = getter(url, { agent, timeout: 400 } as any, (res) => {
			resolve(`[+] Online (${res.statusCode} ${res.statusMessage || "OK"})`);
		});

		req.on("error", (err: any) => {
			if (err.code === "ECONNREFUSED") {
				resolve("[-] Offline (Connection Refused)");
			} else {
				resolve(`[-] Offline (${err.code || err.message})`);
			}
		});
	});
}
