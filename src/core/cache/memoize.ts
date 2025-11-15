import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import defaultLogger from "../../logger";
import { calls as callsTable, db } from "./db";
import { loadContent, saveContent } from "./storage";

const logger = defaultLogger.child({ module: "memoize" });

interface MemoizeOptions {
	provider?: string;
	ignoreCache?: boolean;
}

function hashArgs(functionName: string, args: unknown[]): string {
	const argsJson = JSON.stringify(args);
	const combined = `${functionName}:${argsJson}`;
	return createHash("sha256").update(combined).digest("hex");
}

function inferMimeType(data: unknown): string {
	if (data instanceof ArrayBuffer || data instanceof Buffer) {
		return "application/octet-stream";
	}
	if (typeof data === "string") {
		try {
			JSON.parse(data);
			return "application/json";
		} catch {
			return "text/plain";
		}
	}
	return "application/json";
}

function serializeData(data: unknown): Buffer | string {
	if (data instanceof ArrayBuffer) {
		return Buffer.from(data);
	}
	if (data instanceof Buffer) {
		return data;
	}
	if (typeof data === "string") {
		return data;
	}
	return JSON.stringify(data);
}

export function memoize(options: MemoizeOptions = {}) {
	return (
		_target: unknown,
		propertyKey: string,
		descriptor: PropertyDescriptor,
	) => {
		const originalMethod = descriptor.value;
		const functionName = `${options.provider || "unknown"}.${propertyKey}`;

		descriptor.value = async function (...args: unknown[]) {
			const startTime = performance.now();
			const argsHash = hashArgs(functionName, args);
			const argsJson = JSON.stringify(args);

			if (!options.ignoreCache) {
				const cached = await db
					.select()
					.from(callsTable)
					.where(eq(callsTable.argsHash, argsHash))
					.get();

				if (cached) {
					await db
						.update(callsTable)
						.set({
							lastAccessed: sql`(unixepoch())`,
						})
						.where(eq(callsTable.argsHash, argsHash))
						.run();

					logger.info(
						{
							functionName,
							argsHash,
							contentHash: cached.contentHash,
							cacheHit: true,
						},
						"cache hit",
					);

					const contentBuffer = await loadContent(cached.contentHash);

					if (cached.contentHash.endsWith(".json")) {
						return JSON.parse(contentBuffer.toString());
					}
					return contentBuffer;
				}
			}

			logger.info({ functionName, argsHash, cacheHit: false }, "cache miss");

			const result = await originalMethod.apply(this, args);
			const fetchDuration = Math.round(performance.now() - startTime);

			const serialized = serializeData(result);
			const mimeType = inferMimeType(result);
			const contentHash = await saveContent(serialized, mimeType);

			await db
				.insert(callsTable)
				.values({
					argsHash,
					functionName,
					argsJson,
					contentHash,
					fetchDurationMs: fetchDuration,
				})
				.onConflictDoUpdate({
					target: callsTable.argsHash,
					set: {
						contentHash,
						lastAccessed: sql`(unixepoch())`,
						fetchDurationMs: fetchDuration,
					},
				})
				.run();

			logger.info(
				{
					functionName,
					argsHash,
					contentHash,
					fetchDurationMs: fetchDuration,
				},
				"cached new result",
			);

			return result;
		};

		return descriptor;
	};
}
