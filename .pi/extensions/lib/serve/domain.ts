import * as path from "node:path";

export interface ServerInstance {
	port: number;
	dir: string;
	url: string;
	title: string;
}

export interface KilledServerInstance extends ServerInstance {
	statusBefore: string;
	statusAfter: string;
}

// Helper to determine if a directory is inside the current repository
export function isInsideRepo(dir: string): boolean {
	const rel = path.relative(process.cwd(), dir);
	return !rel.startsWith("..") && !path.isAbsolute(rel);
}
