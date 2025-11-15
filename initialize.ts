import { initializeDatabase } from "./src/core/cache";

try {
	await initializeDatabase();
	console.log("Database initialized successfully");
} catch (error) {
	console.error("Failed to initialize database:", error);
	process.exit(1);
}
