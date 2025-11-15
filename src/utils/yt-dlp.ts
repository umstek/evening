import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import defaultLogger from "../logger";

const logger = defaultLogger.child({ module: "yt-dlp" });

const YT_DLP_DIR = "./data/bin";

/**
 * Detects the current platform and returns the appropriate yt-dlp binary name
 */
function getYtDlpBinaryName(): string {
	const platform = process.platform;
	const arch = process.arch;

	if (platform === "win32") {
		return "yt-dlp.exe";
	}

	if (platform === "darwin") {
		if (arch === "arm64") {
			return "yt-dlp_macos";
		}
		return "yt-dlp_macos";
	}

	if (platform === "linux") {
		if (arch === "arm64" || arch === "aarch64") {
			return "yt-dlp_linux_aarch64";
		}
		return "yt-dlp_linux";
	}

	throw new Error(`Unsupported platform: ${platform} ${arch}`);
}

/**
 * Downloads yt-dlp binary from GitHub releases
 */
async function downloadYtDlp(binaryPath: string): Promise<void> {
	const binaryName = getYtDlpBinaryName();
	const downloadUrl = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${binaryName}`;

	logger.info({ url: downloadUrl }, "downloading yt-dlp binary");

	const response = await fetch(downloadUrl);
	if (!response.ok) {
		throw new Error(
			`Failed to download yt-dlp: ${response.status} ${response.statusText}`,
		);
	}

	const buffer = await response.arrayBuffer();
	await mkdir(YT_DLP_DIR, { recursive: true });
	await writeFile(binaryPath, Buffer.from(buffer));

	// Make executable on Unix systems
	if (process.platform !== "win32") {
		await chmod(binaryPath, 0o755);
	}

	logger.info({ path: binaryPath }, "yt-dlp binary downloaded");
}

/**
 * Ensures yt-dlp binary is available, downloading if necessary
 */
async function ensureYtDlp(): Promise<string> {
	const binaryName = getYtDlpBinaryName();
	const binaryPath = join(YT_DLP_DIR, binaryName);

	if (!existsSync(binaryPath)) {
		logger.info("yt-dlp binary not found, downloading...");
		await downloadYtDlp(binaryPath);
	}

	return binaryPath;
}

/**
 * Downloads a video using yt-dlp
 * @param url - Video URL
 * @returns Video content as Buffer
 */
export async function downloadVideoWithYtDlp(url: string): Promise<Buffer> {
	const ytDlpPath = await ensureYtDlp();

	logger.info({ url }, "downloading video with yt-dlp");

	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];

		// Run yt-dlp to download video to stdout
		const process = spawn(ytDlpPath, [
			url,
			"--format",
			"best", // Get best quality single file
			"--output",
			"-", // Output to stdout
			"--quiet", // Suppress progress output
			"--no-warnings",
		]);

		process.stdout.on("data", (chunk: Buffer) => {
			chunks.push(chunk);
		});

		process.stderr.on("data", (data: Buffer) => {
			logger.debug({ stderr: data.toString() }, "yt-dlp stderr");
		});

		process.on("error", (error) => {
			logger.error({ error: error.message }, "yt-dlp process error");
			reject(error);
		});

		process.on("close", (code) => {
			if (code !== 0) {
				logger.error({ exitCode: code }, "yt-dlp exited with error");
				reject(new Error(`yt-dlp exited with code ${code}`));
				return;
			}

			const buffer = Buffer.concat(chunks);
			logger.info(
				{ url, sizeBytes: buffer.length },
				"video downloaded with yt-dlp",
			);
			resolve(buffer);
		});
	});
}
