import { calls as callsTable, content as contentTable, db } from "./db";

async function inspect() {
	console.log("\n=== Calls ===");
	const allCalls = await db.select().from(callsTable).all();
	for (const call of allCalls) {
		console.log({
			functionName: call.functionName,
			argsHash: `${call.argsHash.substring(0, 16)}...`,
			contentHash: `${call.contentHash.substring(0, 16)}...`,
			fetchDurationMs: call.fetchDurationMs,
			createdAt: call.createdAt,
			lastAccessed: call.lastAccessed,
		});
	}

	console.log("\n=== Content ===");
	const allContent = await db.select().from(contentTable).all();
	for (const content of allContent) {
		console.log({
			hash: `${content.hash.substring(0, 16)}...`,
			filePath: content.filePath,
			sizeBytes: content.sizeBytes,
			mimeType: content.mimeType,
			referenceCount: content.referenceCount,
		});
	}
}

inspect();
