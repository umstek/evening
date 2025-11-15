import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const calls = sqliteTable(
	"calls",
	{
		argsHash: text("args_hash").primaryKey(),
		functionName: text("function_name").notNull(),
		argsJson: text("args_json").notNull(),
		contentHash: text("content_hash")
			.notNull()
			.references(() => content.hash),
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.default(sql`(unixepoch())`),
		lastAccessed: integer("last_accessed", { mode: "timestamp" })
			.notNull()
			.default(sql`(unixepoch())`),
		fetchDurationMs: integer("fetch_duration_ms").notNull(),
	},
	(table) => ({
		functionNameIdx: index("function_name_idx").on(table.functionName),
		contentHashIdx: index("content_hash_idx").on(table.contentHash),
	}),
);

export const content = sqliteTable("content", {
	hash: text("hash").primaryKey(),
	filePath: text("file_path").notNull(),
	sizeBytes: integer("size_bytes").notNull(),
	mimeType: text("mime_type").notNull(),
	referenceCount: integer("reference_count").notNull().default(0),
});

const sqlite = new Database("./data/db.sqlite", { create: true });
export const db = drizzle(sqlite);

export async function initializeDatabase() {
	// Ensure data directory exists before creating database
	await mkdir("./data", { recursive: true });

	// Run Drizzle migrations to create tables and indexes
	await migrate(db, { migrationsFolder: "./drizzle" });
}
