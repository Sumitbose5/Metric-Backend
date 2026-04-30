import axios from 'axios';
// Ensure your tsconfig allows json imports or use: const problems = require("../data/pblm1.json");
import jsonProblems from "../data/pblm1.json";
import {db} from "../core/db";
import { problems } from '../drizzle/judge0/problems';
import { eq } from 'drizzle-orm';

// 1. Define specific interfaces to replace 'any'
interface ProblemMetadata {
  metricId: string;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  description: string;
  constraints: string[];
  hints: string[];
  followUps?: string[];
  topics: string[];
  examples: Array<{ exampleNum: number; exampleText: string }>;
  codeSnippets: Array<{ language: string; starterCode: string }>;
  runnerTemplates: Array<{ language: string; templateCode: string }>;
}

interface ProblemDataType {
  problemId?: string; // Optional because we provide prId
  inputSchema: Array<{ name: string; type: string }>;
  outputSchema: { type: string; comparison: string };
}

interface TestCases {
  problemId?: string;
  testCases: Array<{
    input: Record<string, any>;
    expectedOutput: string;
    isHidden: boolean;
  }>;
}

interface DSAProblem {
  metadata: ProblemMetadata;
  dataTypes: ProblemDataType;
  testCases: TestCases;
}

// ... (Interfaces remain the same)

async function uploadDSAProblems(problemList: DSAProblem[]) {
  const BASE_URL = `${process.env.BACKEND_API_BASE_URL}/problem`;

  if (!problemList || !Array.isArray(problemList) || problemList.length === 0) {
    throw new Error("Problem data is missing or invalid");
  }

  for (const [index, problem] of problemList.entries()) {
    const problemTitle = problem.metadata?.title;

    if (!problemTitle) {
      console.warn(`⚠️ Skipping index ${index}: Missing title in metadata.`);
      continue;
    }

    try {
      console.log(`--- Processing [${index + 1}/${problemList.length}]: ${problemTitle} ---`);

      // 1. RECTIFIED CHECK: Use .limit(1) and check array length
      const existingProblems = await db
        .select()
        .from(problems)
        .where(eq(problems.title, problemTitle))
        .limit(1);

      if (existingProblems.length > 0) {
        console.log(`⏭️ Problem "${problemTitle}" already exists. Skipping...`);
        continue; 
      }

      // 2. Send Metadata to /add
      const metaRes = await axios.post<{ problemID: string }>(`${BASE_URL}/add`, problem.metadata);
      const prId = metaRes.data.problemID;
      
      if (!prId) throw new Error(`Server did not return a problemID for ${problemTitle}`);
      console.log(`📌 Received DB problemID: ${prId}`);

      // 3. Send Data Types
      await axios.post(`${BASE_URL}/data-types`, { 
        prId, 
        ...problem.dataTypes // Matches your JSON 'dataTypes'
      });
      console.log(`✅ Data Types added`);

      // 4. Send Test Cases
      await axios.post(`${BASE_URL}/test-cases`, { 
        prId, 
        ...problem.testCases 
      });
      console.log(`✅ Test Cases added`);

      console.log(`✨ Successfully synced: ${problemTitle}\n`);
      
    } catch (error: any) {
      // Improved error logging to see exactly what failed
      const errorMsg = error.response?.data?.message || error.response?.data || error.message;
      console.error(`❌ Failed to sync ${problemTitle}:`, errorMsg);
      break; 
    }
  }
}

// Execution
uploadDSAProblems(jsonProblems as DSAProblem[]).catch((err) => {
  console.error("FATAL: Error in upload script:", err);
});