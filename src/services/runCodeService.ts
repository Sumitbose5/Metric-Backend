import { InputField, Language, OutputSchema, TypeSchema } from "../types/dataTypes";
import { db } from "../core/db"
import { testCases, problemTypeSchemas, runnerTemplates } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TestCaseSerializer } from "./testCaseSerializer";
import { judgeService } from "./newjudgeService";


async function executeRun(
    problemId: string,
    userCode: string,
    language: Language,
    languageId: number
) {
    // 1. Fetch test cases
    const test_cases = await db 
        .select()
        .from(testCases)
        .where(and(eq(testCases.problemId, problemId), eq(testCases.isHidden, false)))
        .orderBy(testCases.order);

    if (!test_cases.length) {
        throw new Error('No test cases found for problem');
    }

    // 2. Fetch type schema
    const typeSchema = await db
        .select()
        .from(problemTypeSchemas)
        .where(eq(problemTypeSchemas.problemId, problemId))
        .limit(1);

    if (!typeSchema.length) {
        throw new Error('Type schema not found for problem');
    }

    // 3. Fetch runner template
    const template = await db
        .select()
        .from(runnerTemplates)
        .where(
            and(
                eq(runnerTemplates.problemId, problemId),
                eq(runnerTemplates.language, language)
            )
        )
        .limit(1);

    if (!template.length) {
        throw new Error(`Runner template not found for problem and language: ${language}`);
    }

    console.log("Test Cases:", test_cases);
    console.log("Type Schema:", typeSchema[0]);

    // 4. Serialize test cases
    const serializedTestCases = TestCaseSerializer.serialize(
        test_cases.map((tc: any) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput
        })),
        {
            inputSchema: typeSchema[0]?.inputSchema as InputField[],
            outputSchema: typeSchema[0]?.outputSchema as OutputSchema
        },
        language
    );

    console.log("Serialized Test Cases:", serializedTestCases);

    // 5. Build final code
    const finalCode = template[0]?.templateCode
        .replace('{{USER_CODE}}', userCode)
        .replace('{{TEST_CASES}}', serializedTestCases);

    if (!finalCode) {
        throw new Error('Failed to generate final code');
    }

    console.log("Final Code:", finalCode);

    // 6. Send to Judge0
    const result = await judgeService.executeTestCase(
        finalCode,
        languageId
    );

    // ---- Handle Errors BEFORE Parsing Logic ----

    // 1. Handle Compilation Error
    if (result.status?.id === 6) {
        return {
            verdict: "COMPILATION_ERROR",
            output: result.compile_output || "Syntax Error",
            passedCount: 0,
            totalCount: test_cases.length,
        };
    }

    // 2. Handle Time Limit Exceeded (Infinite Loop)
    if (result.status?.id === 5) {
        return {
            verdict: "TIME_LIMIT_EXCEEDED",
            passedCount: 0,
            totalCount: test_cases.length,
            output: "Execution timed out (Possible infinite loop)."
        };
    }

    // 3. Handle Runtime Errors (Array out of bounds, etc.)
    if (result.status?.id >= 7 && result.status?.id <= 12) {
        return {
            verdict: "RUNTIME_ERROR",
            output: result.stderr || "Memory Limit Exceeded or Segment Fault",
            passedCount: 0,
            totalCount: test_cases.length,
        };
    }

    // ---- Code Output is Here ----
    const executionOutput = result.stdout?.trim();

    let passedCount = 0;
    let totalCount = 0;
    let verdict = "Unknown";
    let failedCase = null; // Initialize a variable for failure details

    console.log("Execution Output:", executionOutput);

    if (executionOutput) {
        // 1. Existing summary parsing
        const passedMatch = executionOutput.match(/PASSED_COUNT:\s*(\d+)/);
        const totalMatch = executionOutput.match(/TOTAL_COUNT:\s*(\d+)/);
        const verdictMatch = executionOutput.match(/VERDICT:\s*(\w+)/);

        if (passedMatch) passedCount = parseInt(passedMatch[1], 10);
        if (totalMatch) totalCount = parseInt(totalMatch[1], 10);
        if (verdictMatch) verdict = verdictMatch[1];

        // 2. Extract failure details using a multiline Regex
        // This matches the block between "--- Test Case X Failed ---" and the separator "---"
        const failureMatch = executionOutput.match(
            /--- Test Case \d+ Failed ---\nInput:\s*(.+)\nExpected:\s*(.+)\nActual:\s*(.+)\n---------------------------/
        );

        if (failureMatch) {
            failedCase = {
                input: failureMatch[1].trim(),
                expected: failureMatch[2].trim(),
                actual: failureMatch[3].trim()
            };
        }
    }

    console.log({ passedCount, totalCount, verdict, failedCase });

    return {
        passedCount,
        totalCount,
        verdict,
        failedCase, // Include the new object in the return
        output: executionOutput,
        stderr: result.stderr,
        compileOutput: result.compile_output
    };
}

export default executeRun;