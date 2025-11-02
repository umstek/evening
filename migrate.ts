import { migrate } from "drizzle-orm/bun-sqlite/migrator";

import { db } from "./src/core/cache/db";

migrate(db, { migrationsFolder: "./drizzle" });
