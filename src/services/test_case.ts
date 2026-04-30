import { db } from "../core/db";
import { testCases } from "../drizzle/judge0/test_case";
import { v4 as uuidv4 } from "uuid";

type TestCaseInput = {
  input: any;
  expectedOutput: string;
  isHidden?: boolean;
};

export const addTestCasesToProblem = async (
  problemId: string,
  cases: TestCaseInput[]
) => {
  if (!cases || cases.length === 0) {
    throw new Error("No test cases provided");
  }

  const formattedCases = cases.map((testCase, index) => ({
    id: uuidv4(),
    problemId,
    input: testCase.input,
    expectedOutput: testCase.expectedOutput,
    isHidden: testCase.isHidden ?? true, // default hidden
    order: index + 1,
  }));

  await db.insert(testCases).values(formattedCases);

  return {
    message: "Test cases added successfully",
    count: formattedCases.length,
  };
};
