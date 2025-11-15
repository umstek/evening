import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Analyzes sample data to infer appropriate Zod validators
 * Uses Zod's actual validation instead of naive regex
 */
function inferZodType(sampleValue: unknown): string {
	if (sampleValue === null || sampleValue === undefined) {
		return "z.unknown()";
	}

	if (typeof sampleValue === "string") {
		// Actually test if it passes Zod's URL validation
		if (z.string().url().safeParse(sampleValue).success) {
			return "z.string().url()";
		}
		// Actually test if it passes Zod's email validation
		if (z.string().email().safeParse(sampleValue).success) {
			return "z.string().email()";
		}
		// Actually test if it passes Zod's UUID validation
		if (z.string().uuid().safeParse(sampleValue).success) {
			return "z.string().uuid()";
		}
		// Actually test if it passes Zod's datetime validation
		if (z.string().datetime().safeParse(sampleValue).success) {
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
	if (!nameMatch || !nameMatch[1]) {
		throw new Error("Invalid TypeScript interface: no interface keyword found");
	}
	const name = nameMatch[1];

	// Extract body content between braces
	const bodyMatch = cleaned.match(/\{([\s\S]*)\}/);
	if (!bodyMatch || !bodyMatch[1]) {
		throw new Error("Invalid TypeScript interface: no body found");
	}
	const body = bodyMatch[1];

	// Parse fields
	const fields: Array<{ name: string; type: string; optional: boolean }> = [];
	const fieldRegex = /(\w+)(\?)?:\s*([^;]+);?/g;

	let match = fieldRegex.exec(body);
	while (match !== null) {
		if (match[1] && match[3]) {
			fields.push({
				name: match[1],
				type: match[3].trim(),
				optional: match[2] === "?",
			});
		}
		match = fieldRegex.exec(body);
	}

	return { name, fields };
}

/**
 * Generates a Zod schema and refined TypeScript interface from sample data
 */
function generateZodSchema(
	interfaceString: string,
	sampleData: Record<string, unknown>,
): { zodSchema: string; refinedInterface: string } {
	const { name, fields } = parseTypeScriptInterface(interfaceString);

	const zodFields = fields
		.map((field) => {
			const sampleValue = sampleData[field.name];

			// Warn about missing required fields
			if (sampleValue === undefined && !field.optional) {
				console.warn(
					`Warning: Required field "${field.name}" missing from sample data. Using z.unknown() as fallback.`,
				);
			}

			let zodType = inferZodType(sampleValue);

			// Make optional if needed
			if (field.optional) {
				zodType = `${zodType}.optional()`;
			}

			return `  ${field.name}: ${zodType}`;
		})
		.join(",\n");

	const zodSchema = `import { z } from "zod";\n\nexport const ${name}Schema = z.object({\n${zodFields}\n});\n\nexport type ${name} = z.infer<typeof ${name}Schema>;`;

	// Generate refined TypeScript interface based on inferred types
	const interfaceFields = fields
		.map((field) => {
			const sampleValue = sampleData[field.name];
			let tsType = field.type;

			// Refine type based on sample data if it's generic
			if (field.type === "string" && typeof sampleValue === "string") {
				// Keep as string, but note it could be more specific
				tsType = "string";
			}

			const optional = field.optional ? "?" : "";
			return `  ${field.name}${optional}: ${tsType};`;
		})
		.join("\n");

	const refinedInterface = `export interface ${name} {\n${interfaceFields}\n}`;

	return { zodSchema, refinedInterface };
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
		refinedInterface: z
			.string()
			.describe("The refined TypeScript interface based on sample data"),
		interfaceName: z.string().describe("The extracted interface name"),
	}),
	execute: async ({ context }) => {
		const { interfaceString, sampleData } = context;

		try {
			const result = generateZodSchema(interfaceString, sampleData);
			const { name } = parseTypeScriptInterface(interfaceString);

			return {
				zodSchema: result.zodSchema,
				refinedInterface: result.refinedInterface,
				interfaceName: name,
			};
		} catch (error) {
			throw new Error(
				`Failed to generate Zod schema: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},
});
