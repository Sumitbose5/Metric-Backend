import { testCases } from "../drizzle/judge0/test_case";
import { db } from "../core/db";
import test_cases from "../data/test.json";

interface TestCaseSeed {
  input: Record<string, any>;
  expectedOutput: string;
  problemId: string;
  order: number;
}

export const addTestCase = async () => {
  try {
    const values: TestCaseSeed[] = test_cases.map((testCase) => {
      if (
        !testCase.input ||
        typeof testCase.expectedOutput !== "string" ||
        !testCase.problemId
      ) {
        throw new Error(`Invalid test case data: ${JSON.stringify(testCase)}`);
      }

      return {
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        problemId: testCase.problemId,
        order: testCase.order
      };
    });

    await db.insert(testCases).values(values);

    console.log(`✅ Inserted ${values.length} test cases`);
  } catch (error) {
    console.error(error);
    throw new Error("Failed to add test cases");
  }
};

addTestCase().catch((err) => {
  console.error("Error adding test cases:", err);
});