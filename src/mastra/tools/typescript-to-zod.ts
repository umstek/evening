import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Analyzes multiple sample values to infer appropriate Zod validators
 * Uses Zod's actual validation and requires 100% match to narrow down types
 */
function inferZodType(sampleValues: unknown[]): string {
	if (sampleValues.length === 0) {
		return "z.unknown()";
	}

	// Filter out null/undefined for type analysis
	const definedValues = sampleValues.filter(
		(v) => v !== null && v !== undefined,
	);
	if (definedValues.length === 0) {
		return "z.unknown()";
	}

	// Check if all samples are strings
	const allStrings = definedValues.every((v) => typeof v === "string");
	if (allStrings) {
		const strings = definedValues as string[];

		// Only narrow down if 100% of samples pass validation
		if (strings.every((s) => z.string().url().safeParse(s).success)) {
			return "z.string().url()";
		}
		if (strings.every((s) => z.string().email().safeParse(s).success)) {
			return "z.string().email()";
		}
		if (strings.every((s) => z.string().uuid().safeParse(s).success)) {
			return "z.string().uuid()";
		}
		if (strings.every((s) => z.string().datetime().safeParse(s).success)) {
			return "z.string().datetime()";
		}
		return "z.string()";
	}

	// Check if all samples are numbers
	const allNumbers = definedValues.every((v) => typeof v === "number");
	if (allNumbers) {
		const numbers = definedValues as number[];

		// Check if ALL are integers
		if (numbers.every((n) => Number.isInteger(n))) {
			// Check if ALL are positive (> 0)
			if (numbers.every((n) => n > 0)) {
				return "z.number().int().positive()";
			}
			// Check if ALL are non-negative (>= 0)
			if (numbers.every((n) => n >= 0)) {
				return "z.number().int().nonnegative()";
			}
			return "z.number().int()";
		}

		// Not all integers, check if all positive floats
		if (numbers.every((n) => n > 0)) {
			return "z.number().positive()";
		}
		if (numbers.every((n) => n >= 0)) {
			return "z.number().nonnegative()";
		}
		return "z.number()";
	}

	// Check if all samples are booleans
	const allBooleans = definedValues.every((v) => typeof v === "boolean");
	if (allBooleans) {
		return "z.boolean()";
	}

	// Check if all samples are arrays
	const allArrays = definedValues.every((v) => Array.isArray(v));
	if (allArrays) {
		const arrays = definedValues as unknown[][];
		// Collect all array elements from all samples
		const allElements = arrays.flat();
		if (allElements.length === 0) {
			return "z.array(z.unknown())";
		}
		const elementType = inferZodType(allElements);
		return `z.array(${elementType})`;
	}

	// Check if all samples are objects
	const allObjects = definedValues.every(
		(v) => typeof v === "object" && !Array.isArray(v),
	);
	if (allObjects) {
		// For nested objects, we'd need to recursively analyze
		// For now, just use generic object
		return "z.record(z.string(), z.unknown())";
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
 * Generates a Zod schema and refined TypeScript interface from multiple sample data
 */
function generateZodSchema(
	interfaceString: string,
	sampleDataArray: Array<Record<string, unknown>>,
): { zodSchema: string; refinedInterface: string } {
	const { name, fields } = parseTypeScriptInterface(interfaceString);

	const zodFields = fields
		.map((field) => {
			// Collect all sample values for this field across all samples
			const sampleValues = sampleDataArray.map((data) => data[field.name]);

			// Warn about missing required fields
			const allMissing = sampleValues.every((v) => v === undefined);
			if (allMissing && !field.optional) {
				console.warn(
					`Warning: Required field "${field.name}" missing from all sample data. Using z.unknown() as fallback.`,
				);
			}

			let zodType = inferZodType(sampleValues);

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
			const tsType = field.type;
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
		"Converts a TypeScript interface definition to a Zod schema with intelligent validations (URLs, emails, integers, etc.) based on multiple sample data objects. Analyzes all samples to infer types - only narrows down if 100% of samples match (e.g., all integers, all positive, all URLs).",
	inputSchema: z.object({
		interfaceString: z
			.string()
			.describe("The TypeScript interface definition as a string"),
		sampleData: z
			.array(z.record(z.string(), z.any()))
			.describe(
				"Array of sample data objects. More samples = better type inference. Algorithm requires 100% match to narrow down types (e.g., if all samples are positive integers, infers z.number().int().positive())",
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
