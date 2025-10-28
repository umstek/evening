CREATE TABLE `calls` (
	`args_hash` text PRIMARY KEY NOT NULL,
	`function_name` text NOT NULL,
	`args_json` text NOT NULL,
	`content_hash` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_accessed` integer DEFAULT (unixepoch()) NOT NULL,
	`fetch_duration_ms` integer NOT NULL,
	FOREIGN KEY (`content_hash`) REFERENCES `content`(`hash`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `function_name_idx` ON `calls` (`function_name`);--> statement-breakpoint
CREATE INDEX `content_hash_idx` ON `calls` (`content_hash`);--> statement-breakpoint
CREATE TABLE `content` (
	`hash` text PRIMARY KEY NOT NULL,
	`file_path` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`mime_type` text NOT NULL,
	`reference_count` integer DEFAULT 0 NOT NULL
);
