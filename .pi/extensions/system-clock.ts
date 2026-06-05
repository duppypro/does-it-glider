import { type ExtensionAPI } from "@earendil-works/pi-coding-agent";

let masterInterval: NodeJS.Timeout | null = null;
let tickCount = 0;

export default function systemClockService(pi: ExtensionAPI) {
	pi.on("session_start", async () => {
		// Spawn exactly ONE background interval for the entire Pi session
		if (masterInterval) clearInterval(masterInterval);
		
		masterInterval = setInterval(() => {
			tickCount++;
			const timestamp = Date.now();
			
			// Always emit 1s tick
			pi.events.emit("clock:tick:1s", { tickCount, timestamp });
			
			// Emit 4s tick
			if (tickCount % 4 === 0) {
				pi.events.emit("clock:tick:4s", { tickCount, timestamp });
			}
			
			// Emit 60s tick
			if (tickCount % 60 === 0) {
				pi.events.emit("clock:tick:60s", { tickCount, timestamp });
			}
			
		}, 1000);
	});

	pi.on("session_shutdown", async () => {
		// Clean up on exit
		if (masterInterval) {
			clearInterval(masterInterval);
			masterInterval = null;
		}
	});
}
