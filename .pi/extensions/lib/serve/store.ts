// Retrieve visibility state from session log
export function getVisibility(ctx: any): boolean {
	let visible = true; // Default visible
	for (const entry of ctx.sessionManager.getEntries()) {
		if (entry.type === "custom" && entry.customType === "serve-visibility") {
			visible = entry.data.visible;
		}
	}
	return visible;
}
