import type { Config } from "drizzle-kit";

export default {
	schema: "./src/core/cache/db.ts",
	out: "./drizzle",
	dialect: "sqlite",
	dbCredentials: {
		url: "./data/db.sqlite",
	},
	verbose: true,
	strict: true,
} satisfies Config;
