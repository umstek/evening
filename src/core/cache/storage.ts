import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { eq, sql } from "drizzle-orm";
import defaultLogger from "../../logger";
import { content as contentTable, db } from "./db";

const logger = defaultLogger.child({ module: "storage" });

const SCRAPED_DIR = "./data/scraped";

export async function ensureScrapedDir() {
	await mkdir(SCRAPED_DIR, { recursive: true });
}

export function hashContent(content: Buffer | string): string {
	const buffer = typeof content === "string" ? Buffer.from(content) : content;
	return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Maps MIME types to file extensions
 *
 * We use a simple map instead of a library (like 'mime-types') because:
 * - Only includes MIME types we actually use (YAGNI)
 * - No external dependencies
 * - Fast O(1) lookup
 * - Easy to extend when needed
 */
export function getExtensionFromMimeType(mimeType: string): string {
	const mimeMap: Record<string, string> = {
		"application/json": "json",
		"text/html": "html",
		"text/plain": "txt",
		"image/jpeg": "jpg",
		"image/png": "png",
		"image/gif": "gif",
		"image/webp": "webp",
		"video/mp4": "mp4",
		"video/webm": "webm",
	};
	return mimeMap[mimeType] || "bin";
}

export async function saveContent(
	contentData: Buffer | string,
	mimeType: string,
): Promise<string> {
	await ensureScrapedDir();

	const buffer =
		typeof contentData === "string" ? Buffer.from(contentData) : contentData;
	const hash = hashContent(buffer);
	const ext = getExtensionFromMimeType(mimeType);
	const filePath = `scraped/${hash}.${ext}`;
	const fullPath = `./data/${filePath}`;

	const existing = await db
		.select()
		.from(contentTable)
		.where(eq(contentTable.hash, hash))
		.get();

	if (existing) {
		logger.debug({ hash, filePath }, "content already exists, skipping save");
		await db
			.update(contentTable)
			.set({
				referenceCount: sql`${contentTable.referenceCount} + 1`,
			})
			.where(eq(contentTable.hash, hash))
			.run();
		return hash;
	}

	await Bun.write(fullPath, buffer);

	await db
		.insert(contentTable)
		.values({
			hash,
			filePath,
			sizeBytes: buffer.length,
			mimeType,
			referenceCount: 1,
		})
		.run();

	logger.info({ hash, filePath, sizeBytes: buffer.length }, "saved content");

	return hash;
}

export async function loadContent(hash: string): Promise<Buffer> {
	const record = await db
		.select()
		.from(contentTable)
		.where(eq(contentTable.hash, hash))
		.get();

	if (!record) {
		throw new Error(`Content not found: ${hash}`);
	}

	const fullPath = `./data/${record.filePath}`;
	const file = Bun.file(fullPath);

	if (!(await file.exists())) {
		throw new Error(`Content file missing: ${fullPath}`);
	}

	return Buffer.from(await file.arrayBuffer());
}

export async function getContentInfo(hash: string) {
	return db
		.select()
		.from(contentTable)
		.where(eq(contentTable.hash, hash))
		.get();
}
