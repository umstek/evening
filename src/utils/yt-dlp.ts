import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import defaultLogger from "../logger";

const logger = defaultLogger.child({ module: "yt-dlp" });

// Use absolute path to avoid CWD dependency issues
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "../..");
const YT_DLP_DIR = join(PROJECT_ROOT, "data", "bin");

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
		return "yt-dlp_macos";
	}

	if (platform === "linux") {
		if (arch === "x64") {
			return "yt-dlp_linux";
		}
		if (arch === "arm64" || arch === "aarch64") {
			return "yt-dlp_linux_aarch64";
		}
		throw new Error(`Unsupported Linux architecture: ${arch}`);
	}

	throw new Error(`Unsupported platform: ${platform} ${arch}`);
}

/**
 * Validates binary file signature (basic sanity check)
 */
function validateBinary(buffer: Buffer, platform: string): boolean {
	if (buffer.length < 4) return false;

	// Check for common executable signatures
	if (platform === "win32") {
		// Check for PE header (MZ)
		return buffer[0] === 0x4d && buffer[1] === 0x5a;
	}

	// Unix: Check for ELF header or shebang
	const isELF =
		buffer[0] === 0x7f &&
		buffer[1] === 0x45 &&
		buffer[2] === 0x4c &&
		buffer[3] === 0x46;
	const isShebang = buffer[0] === 0x23 && buffer[1] === 0x21; // #!

	return isELF || isShebang;
}

/**
 * Downloads yt-dlp binary from GitHub releases
 */
async function downloadYtDlp(binaryPath: string): Promise<void> {
	const binaryName = getYtDlpBinaryName();
	const downloadUrl = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${binaryName}`;

	logger.info({ url: downloadUrl }, "downloading yt-dlp binary");

	// Add timeout to fetch (2 minutes)
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 2 * 60 * 1000);

	try {
		const response = await fetch(downloadUrl, { signal: controller.signal });
		clearTimeout(timeoutId);

		if (!response.ok) {
			throw new Error(
				`Failed to download yt-dlp: ${response.status} ${response.statusText}`,
			);
		}

		const buffer = await response.arrayBuffer();
		const binaryBuffer = Buffer.from(buffer);

		// Validate binary before writing
		if (!validateBinary(binaryBuffer, process.platform)) {
			throw new Error("Downloaded file does not appear to be a valid binary");
		}

		await mkdir(YT_DLP_DIR, { recursive: true });
		await writeFile(binaryPath, binaryBuffer);

		// Make executable on Unix systems
		if (process.platform !== "win32") {
			await chmod(binaryPath, 0o755);
		}

		logger.info({ path: binaryPath }, "yt-dlp binary downloaded");
	} catch (error) {
		clearTimeout(timeoutId);
		throw error;
	}
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
		const MAX_SIZE_BYTES = 500 * 1024 * 1024; // 500MB limit
		let totalSize = 0;
		let timeoutId: NodeJS.Timeout;

		// Run yt-dlp to download video to stdout
		const ytDlpProcess = spawn(ytDlpPath, [
			url,
			"--format",
			"best", // Get best quality single file
			"--output",
			"-", // Output to stdout
			"--quiet", // Suppress progress output
			"--no-warnings",
		]);

		// Set timeout (5 minutes)
		timeoutId = setTimeout(
			() => {
				ytDlpProcess.kill();
				reject(new Error("yt-dlp download timed out"));
			},
			5 * 60 * 1000,
		);

		ytDlpProcess.stdout.on("data", (chunk: Buffer) => {
			totalSize += chunk.length;
			if (totalSize > MAX_SIZE_BYTES) {
				ytDlpProcess.kill();
				clearTimeout(timeoutId);
				reject(
					new Error(
						`Video exceeds maximum size limit (${MAX_SIZE_BYTES / 1024 / 1024}MB)`,
					),
				);
				return;
			}
			chunks.push(chunk);
		});

		ytDlpProcess.stderr.on("data", (data: Buffer) => {
			logger.debug({ stderr: data.toString() }, "yt-dlp stderr");
		});

		ytDlpProcess.on("error", (error) => {
			clearTimeout(timeoutId);
			logger.error({ error: error.message }, "yt-dlp process error");
			reject(error);
		});

		ytDlpProcess.on("close", (code) => {
			clearTimeout(timeoutId);
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
