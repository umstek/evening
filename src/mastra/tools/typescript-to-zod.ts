import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Analyzes sample data to infer appropriate Zod validators
 */
function inferZodType(sampleValue: unknown): string {
	if (sampleValue === null || sampleValue === undefined) {
		return "z.unknown()";
	}

	if (typeof sampleValue === "string") {
		// Check for URL pattern
		if (/^https?:\/\/.+/i.test(sampleValue)) {
			return "z.string().url()";
		}
		// Check for email pattern
		if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sampleValue)) {
			return "z.string().email()";
		}
		// Check for UUID pattern
		if (
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
				sampleValue,
			)
		) {
			return "z.string().uuid()";
		}
		// Check for ISO date pattern
		if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(sampleValue)) {
			return "z.string().datetime()";
		}
		return "z.string()";
	}

	if (typeof sampleValue === "number") {
		if (Number.isInteger(sampleValue)) {
			return "z.number().int()";
		}
		return "z.number()";
	}

	if (typeof sampleValue === "boolean") {
		return "z.boolean()";
	}

	if (Array.isArray(sampleValue)) {
		if (sampleValue.length === 0) {
			return "z.array(z.unknown())";
		}
		const firstElement = sampleValue[0];
		const elementType = inferZodType(firstElement);
		return `z.array(${elementType})`;
	}

	if (typeof sampleValue === "object") {
		const entries = Object.entries(sampleValue as Record<string, unknown>);
		const fields = entries
			.map(([key, value]) => {
				const zodType = inferZodType(value);
				return `    ${key}: ${zodType}`;
			})
			.join(",\n");
		return `z.object({\n${fields}\n  })`;
	}

	return "z.unknown()";
}

/**
 * Parses a TypeScript interface string and extracts field information
 */
function parseTypeScriptInterface(interfaceString: string): {
	name: string;
	fields: Array<{ name: string; type: string; optional: boolean }>;
} {
	// Remove comments and extra whitespace
	const cleaned = interfaceString
		.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "")
		.trim();

	// Extract interface name
	const nameMatch = cleaned.match(/interface\s+(\w+)/);
	if (!nameMatch) {
		throw new Error("Invalid TypeScript interface: no interface keyword found");
	}
	const name = nameMatch[1];

	// Extract body content between braces
	const bodyMatch = cleaned.match(/\{([\s\S]*)\}/);
	if (!bodyMatch) {
		throw new Error("Invalid TypeScript interface: no body found");
	}
	const body = bodyMatch[1];

	// Parse fields
	const fields: Array<{ name: string; type: string; optional: boolean }> = [];
	const fieldRegex = /(\w+)(\?)?:\s*([^;]+);?/g;

	let match = fieldRegex.exec(body);
	while (match !== null) {
		fields.push({
			name: match[1],
			type: match[3].trim(),
			optional: match[2] === "?",
		});
		match = fieldRegex.exec(body);
	}

	return { name, fields };
}

/**
 * Generates a Zod schema from TypeScript interface and sample data
 */
function generateZodSchema(
	interfaceString: string,
	sampleData: Record<string, unknown>,
): string {
	const { name, fields } = parseTypeScriptInterface(interfaceString);

	const zodFields = fields
		.map((field) => {
			const sampleValue = sampleData[field.name];
			let zodType = inferZodType(sampleValue);

			// Make optional if needed
			if (field.optional) {
				zodType = `${zodType}.optional()`;
			}

			return `  ${field.name}: ${zodType}`;
		})
		.join(",\n");

	return `import { z } from "zod";\n\nexport const ${name}Schema = z.object({\n${zodFields}\n});\n\nexport type ${name} = z.infer<typeof ${name}Schema>;`;
}

/**
 * Mastra tool that converts TypeScript interfaces to Zod schemas
 * with intelligent validation based on sample data
 */
export const typescriptToZodTool = createTool({
	id: "typescript-to-zod",
	description:
		"Converts a TypeScript interface definition to a Zod schema with intelligent validations (URLs, emails, integers, etc.) based on sample data",
	inputSchema: z.object({
		interfaceString: z
			.string()
			.describe("The TypeScript interface definition as a string"),
		sampleData: z
			.record(z.string(), z.any())
			.describe(
				"Sample data object with example values for each field to infer validators",
			),
	}),
	outputSchema: z.object({
		zodSchema: z.string().describe("The generated Zod schema code"),
		interfaceName: z.string().describe("The extracted interface name"),
	}),
	execute: async ({ context }) => {
		const { interfaceString, sampleData } = context;

		try {
			const zodSchema = generateZodSchema(interfaceString, sampleData);
			const { name } = parseTypeScriptInterface(interfaceString);

			return {
				zodSchema,
				interfaceName: name,
			};
		} catch (error) {
			throw new Error(
				`Failed to generate Zod schema: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},
});
