import { db } from "../core/db";
import { problems } from "../drizzle/judge0/problems";
import { interviewProblems } from "../drizzle/interview/interviewProblem";
import { interviews } from "../drizzle/interview/interviews";
import { examples } from "../drizzle/judge0/examples";
import { codeSnippets } from "../drizzle/judge0/codeSnippets";
import { testCases } from "../drizzle/judge0/test_case";
import { eq, and, sql, notExists } from "drizzle-orm";

type Difficulty = "beginner" | "intermediate" | "advanced";

interface GetQuestionParams {
    userId: string;
    interviewId: string;
}

/**
 * Helper:
 * Fetch full structured problem response
 */
const buildProblemResponse = async (problemId: string) => {
    // 1️⃣ Fetch problem
    const problemResult = await db
        .select()
        .from(problems)
        .where(eq(problems.id, problemId))
        .limit(1);

    if (!problemResult.length) {
        throw new Error("Problem not found");
    }

    const problem = problemResult[0];

    if (!problem)
        throw new Error("Problem not found");

    // 2️⃣ Fetch examples
    const problemExamples = await db
        .select()
        .from(examples)
        .where(eq(examples.problemId, problemId));

    // 3️⃣ Fetch visible test cases
    const visibleTestCases = await db
        .select()
        .from(testCases)
        .where(
            and(
                eq(testCases.problemId, problemId),
                eq(testCases.isHidden, false)
            )
        );

    // 4️⃣ Fetch code snippets
    const snippets = await db
        .select()
        .from(codeSnippets)
        .where(eq(codeSnippets.problemId, problemId));

    const formattedSnippets: Record<string, string> = {};
    snippets.forEach((snippet) => {
        formattedSnippets[snippet.language] = snippet.starterCode;
    });

    return {
        problem: {
            id: problem.id,
            metricId: problem.metricId,
            title: problem.title,
            difficulty: problem.difficulty,
            description: problem.description,
            constraints: problem.constraints,
            hints: problem.hints,
            followUps: problem.followUps,
        },
        examples: problemExamples,
        test_cases: visibleTestCases,
        codeSnippets: {
            python: formattedSnippets["python"] || "",
            java: formattedSnippets["java"] || "",
            cpp: formattedSnippets["cpp"] || "",
            javascript: formattedSnippets["javascript"] || "",
        },
    };
};


export const getSingleInterviewQuestion = async ({
    userId,
    interviewId,
}: GetQuestionParams) => {
    /**
     * STEP 1:
     * Fetch interview
     */
    const interview = await db
        .select()
        .from(interviews)
        .where(eq(interviews.id, interviewId))
        .limit(1);

    if (!interview.length) {
        throw new Error("Interview not found");
    }

    const interviewData = interview[0];

    if(!interviewData) {
        throw new Error("Interview not found");
    }

    const difficulty = interviewData.difficulty as Difficulty;

    /**
     * STEP 2:
     * Check if there is an unsolved problem
     * If yes → return that (DO NOT insert again)
     */
    const unsolved = await db
        .select()
        .from(interviewProblems)
        .where(
            and(
                eq(interviewProblems.interviewId, interviewId),
                eq(interviewProblems.isSolved, false)
            )
        )
        .orderBy(sql`${interviewProblems.order} DESC`)
        .limit(1);

    if(!unsolved)
        throw new Error("No unsolved questions found");

    if (unsolved.length > 0) {
        // 🔥 Resume existing question
        return await buildProblemResponse(unsolved[0]?.problemId as string);
    }

    /**
     * STEP 3:
     * Determine effective difficulty
     */

    // map the levels to the difficulty
    let effectiveDifficulty: "EASY" | "MEDIUM" | "HARD";
    if (difficulty === "beginner") {
        effectiveDifficulty = "EASY";
    } else if (difficulty === "intermediate") {
        effectiveDifficulty = "MEDIUM";
    } else if (difficulty === "advanced") {
        effectiveDifficulty = "HARD";
    } else {
        // Default or random?
        throw new Error("Difficulty does not matches any of the type")
    }

    if(interviewData === undefined)
        throw new Error("Invalid Interview Data, undefined");

    /**
     * STEP 4:
     * Select a new problem
     * Criteria:
     * - Matches difficulty
     * - Not used in THIS interview
     * - Not attempted previously by this user
     */

    const question = await db
        .select()
        .from(problems)
        .where(
            and(
                eq(problems.difficulty, effectiveDifficulty),
                eq(problems.isAvailable, true),

                // Exclude already used in this interview
                notExists(
                    db
                        .select()
                        .from(interviewProblems)
                        .where(
                            and(
                                eq(interviewProblems.problemId, problems.id),
                                eq(interviewProblems.interviewId, interviewId)
                            )
                        )
                ),

                // Exclude previously attempted by user
                notExists(
                    db
                        .select()
                        .from(interviewProblems)
                        .innerJoin(
                            interviews,
                            eq(interviewProblems.interviewId, interviews.id)
                        )
                        .where(
                            and(
                                eq(interviewProblems.problemId, problems.id),
                                eq(interviews.userId, userId)
                            )
                        )
                )
            )
        )
        .orderBy(sql`RANDOM()`)
        .limit(1);

    if (!question.length) {
        throw new Error("No suitable question found");
    }

    // const testId = "727190ce-54d9-4cdd-a39b-7cde38502707";

    // const testquestion = await db
    //     .select()
    //     .from(problems)
    //     .where(eq(problems.id, testId))
    //     .limit(1);

    const selectedProblem = question[0];

    if(!selectedProblem)
        throw new Error("Selected problem is undefined");

    /**
     * STEP 5:
     * Insert into interviewProblems (since it's NEW)
     */

    const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(interviewProblems)
        .where(eq(interviewProblems.interviewId, interviewId));

    const order = Number(countResult[0]?.count ?? 0) + 1;

    await db.insert(interviewProblems).values({
        interviewId,
        problemId: selectedProblem.id,
        order,
    });

    /**
     * STEP 6:
     * Return full structured response
     */

    return await buildProblemResponse(selectedProblem.id);
};