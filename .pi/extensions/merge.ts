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

				// 3. Fetch remote first to ensure our remote-tracking reference is current
				ctx.ui.notify("📡 Fetching origin to update remote tracking references...", "info");
				execSync("git fetch origin", { cwd: currentCwd, stdio: "ignore" });

				// 4. Determine target commit
				const localHash = execSync("git rev-parse HEAD", { cwd: currentCwd, encoding: "utf8" }).trim();
				let targetHash = "";
				const ref = argsList[0];

				if (ref) {
					try {
						targetHash = execSync(`git rev-parse ${ref}`, { cwd: currentCwd, encoding: "utf8" }).trim();
					} catch {
						throw new Error(`The provided reference '${ref}' is not a valid Git commit or branch name.`);
					}

					// Verify targetHash is an ancestor of local HEAD (belongs to this branch's history)
					try {
						execSync(`git merge-base --is-ancestor ${targetHash} HEAD`, { cwd: currentCwd });
					} catch {
						throw new Error(`The target commit '${ref}' (${targetHash.substring(0, 7)}) is not in the history of the current branch '${currentBranch}'.`);
					}
				} else {
					targetHash = localHash;
				}

				// 5. Check if target commit has been pushed to remote
				let isPushed = false;
				try {
					execSync(`git merge-base --is-ancestor ${targetHash} origin/${currentBranch}`, { cwd: currentCwd });
					isPushed = true;
				} catch {
					isPushed = false;
				}

				if (!isPushed) {
					throw new Error(`The target commit ${targetHash.substring(0, 7)} has not been pushed to 'origin/${currentBranch}'. Please push your changes first.`);
				}

				// 6. Validate that the target commit was a "Code and Spec Approved" Step 5 commit
				const targetCommitMsg = execSync(`git log -1 --pretty=%B ${targetHash}`, { cwd: currentCwd, encoding: "utf8" }).trim();
				if (!targetCommitMsg.startsWith("Code and Spec Approved:")) {
					// Search for the most recent Step 5 commit in history to suggest
					let suggestedStep5Hash = "";
					let suggestedStep5Msg = "";
					try {
						const logLines = execSync("git log --pretty=format:\"%H %s\" -n 50", { cwd: currentCwd, encoding: "utf8" }).trim().split("\n");
						for (const line of logLines) {
							const spaceIdx = line.indexOf(" ");
							if (spaceIdx !== -1) {
								const hash = line.substring(0, spaceIdx).trim();
								const msg = line.substring(spaceIdx + 1).trim();
								if (msg.startsWith("Code and Spec Approved:")) {
									suggestedStep5Hash = hash;
									suggestedStep5Msg = msg;
									break;
								}
							}
						}
					} catch {
						// ignore
					}

					let errorMsg = `The target commit ${targetHash.substring(0, 7)} is not a Step 5 'Code and Spec Approved' commit.\nTarget commit message: "${targetCommitMsg.split("\n")[0]}"\nMerges to main are only permitted for commits in the Step 5 Approved state.`;

					if (suggestedStep5Hash) {
						errorMsg += `\n\n💡 Suggestion: A previous Step 5 commit was found in your history:\n   Hash: \x1b[33m${suggestedStep5Hash.substring(0, 7)}\x1b[0m\n   Message: "${suggestedStep5Msg}"\n\nTo merge up to that stable checkpoint, run:\n   \x1b[36m/merge ${suggestedStep5Hash.substring(0, 7)}\x1b[0m`;
					}
					throw new Error(errorMsg);
				}

				// 7. Find the 'main' worktree
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

				// 8. Verify main worktree is clean
				const mainStatus = execSync("git status --porcelain", { cwd: mainCwd, encoding: "utf8" }).trim();
				if (mainStatus !== "") {
					throw new Error(`The 'main' branch worktree at ${mainCwd} is not clean. Please clean or stash changes there first.\n${mainStatus}`);
				}

				// 9. Pull the latest 'main' branch in main worktree to ensure it is up-to-date with remote
				ctx.ui.notify("📡 Pulling latest 'main' from origin...", "info");
				execSync("git checkout main", { cwd: mainCwd, stdio: "ignore" });
				execSync("git pull origin main", { cwd: mainCwd, stdio: "ignore" });

				// 10. Merge the target commit into 'main'
				ctx.ui.notify(`🔀 Merging target commit ${targetHash.substring(0, 7)} into 'main' in the main worktree...`, "info");
				execSync(`git merge ${targetHash}`, { cwd: mainCwd, stdio: "ignore" });

				// 11. Push 'main' to origin
				ctx.ui.notify("📡 Pushing merged 'main' branch to origin...", "info");
				execSync("git push origin main", { cwd: mainCwd, stdio: "ignore" });

				ctx.ui.notify(`🎉 Success! Merged target commit ${targetHash.substring(0, 7)} into 'main' and pushed to origin.`, "info");
				ctx.ui.notify(`💪 Ready for the next task! You are in worktree '${currentCwd}' on branch '${currentBranch}'.`, "info");

			} catch (err: any) {
				const errMsg = err?.message || String(err);
				ctx.ui.notify(`❌ Merge Aborted:\n${errMsg}`, "error");
			}
		}
	});
}
