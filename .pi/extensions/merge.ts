import { type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

// ---
// MAIN EXTENSION ENTRY POINT
// ---

export default function mergeExtension(pi: ExtensionAPI) {
	pi.registerCommand("merge", {
		description: "Multi-Worktree Git Merger",
		handler: async (args, ctx) => {
			const argsList = (args || "").trim().split(/\s+/).filter(Boolean);
			if (argsList.includes("-h") || argsList.includes("--help")) {
				try {
					const manifestPath = path.join(ctx.cwd, "docs", "extensions", "manifests", "merge-cmd.json");
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
					ctx.ui.notify(`⚠️ Failed to load MERGE command manifest: ${err}`, "error");
				}
				return;
			}

			ctx.ui.notify("🔄 Running /merge validation checks...", "info");

			try {
				const currentCwd = ctx.cwd;

				// 1. Get current branch name
				const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: currentCwd, encoding: "utf8" }).trim();
				if (currentBranch === "main") {
					throw new Error("You are already on the 'main' branch/worktree. Cannot merge main into itself.");
				}

				// 2. Check that current worktree is clean
				const currentStatus = execSync("git status --porcelain", { cwd: currentCwd, encoding: "utf8" }).trim();
				if (currentStatus !== "") {
					throw new Error(`Your current branch worktree (${currentBranch}) is not clean. Please commit or stash changes first.\n${currentStatus}`);
				}

				// 3. Fetch remote and check if up to date
				ctx.ui.notify(`📡 Fetching origin to verify '${currentBranch}' sync status...`, "info");
				execSync("git fetch origin", { cwd: currentCwd, stdio: "ignore" });

				const localHash = execSync("git rev-parse HEAD", { cwd: currentCwd, encoding: "utf8" }).trim();
				let remoteHash = "";
				try {
					remoteHash = execSync(`git rev-parse origin/${currentBranch}`, { cwd: currentCwd, encoding: "utf8" }).trim();
				} catch {
					throw new Error(`Remote branch 'origin/${currentBranch}' does not exist on origin. Please push your branch first.`);
				}

				if (localHash !== remoteHash) {
					throw new Error(`Your local branch '${currentBranch}' is out of sync with origin.\nLocal:  ${localHash.substring(0, 7)}\nRemote: ${remoteHash.substring(0, 7)}\nPlease push or pull your changes first.`);
				}

				// 4. Validate that the last commit was a "Code and Spec Approved" Step 5 commit
				const lastCommitMsg = execSync("git log -1 --pretty=%B", { cwd: currentCwd, encoding: "utf8" }).trim();
				if (!lastCommitMsg.startsWith("Code and Spec Approved:")) {
					throw new Error(`The last commit is not a Step 5 'Code and Spec Approved' commit.\nLast commit message: "${lastCommitMsg.split("\n")[0]}"\nMerges to main are only permitted when the branch is in the Step 5 Approved state.`);
				}

				// 5. Find the 'main' worktree
				const worktreeLines = execSync("git worktree list", { cwd: currentCwd, encoding: "utf8" }).trim().split("\n");
				let mainCwd = "";
				for (const line of worktreeLines) {
					if (line.includes("[main]")) {
						const idx = line.lastIndexOf("[main]");
						const beforeBranch = line.substring(0, idx).trim();
						const spaceIdx = beforeBranch.lastIndexOf(" ");
						if (spaceIdx !== -1) {
							mainCwd = beforeBranch.substring(0, spaceIdx).trim();
						} else {
							mainCwd = beforeBranch;
						}
					}
				}

				if (!mainCwd || !fs.existsSync(mainCwd)) {
					throw new Error("Could not find the 'main' branch worktree from 'git worktree list'.");
				}

				// 6. Verify main worktree is clean
				const mainStatus = execSync("git status --porcelain", { cwd: mainCwd, encoding: "utf8" }).trim();
				if (mainStatus !== "") {
					throw new Error(`The 'main' branch worktree at ${mainCwd} is not clean. Please clean or stash changes there first.\n${mainStatus}`);
				}

				// 7. Pull the latest 'main' branch in main worktree to ensure it is up-to-date with remote
				ctx.ui.notify("📡 Pulling latest 'main' from origin...", "info");
				execSync("git checkout main", { cwd: mainCwd, stdio: "ignore" });
				execSync("git pull origin main", { cwd: mainCwd, stdio: "ignore" });

				// 8. Merge the feature branch into 'main'
				ctx.ui.notify(`🔀 Merging '${currentBranch}' into 'main' in the main worktree...`, "info");
				execSync(`git merge ${currentBranch}`, { cwd: mainCwd, stdio: "ignore" });

				// 9. Push 'main' to origin
				ctx.ui.notify("📡 Pushing merged 'main' branch to origin...", "info");
				execSync("git push origin main", { cwd: mainCwd, stdio: "ignore" });

				ctx.ui.notify(`🎉 Success! Merged '${currentBranch}' into 'main' and pushed to origin.`, "info");
				ctx.ui.notify(`💪 Ready for the next task! You are in worktree '${currentCwd}' on branch '${currentBranch}'.`, "info");

			} catch (err: any) {
				const errMsg = err?.message || String(err);
				ctx.ui.notify(`❌ Merge Aborted:\n${errMsg}`, "error");
			}
		}
	});
}
