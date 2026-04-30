import { Request, Response } from "express";
import { addTestCasesToProblem } from "../services/test_case";

export const createTestCasesController = async (
  req: Request,
  res: Response
) => {
  try {
    const { prId, problemId, testCases } = req.body;

    if (!problemId) {
      return res.status(400).json({ message: "Problem ID is required" });
    }

    if (!Array.isArray(testCases)) {
      return res.status(400).json({ message: "Test cases must be an array" });
    }

    const result = await addTestCasesToProblem(prId, testCases); 

    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to add test cases",
      error: error.message,
    });
  }
};
