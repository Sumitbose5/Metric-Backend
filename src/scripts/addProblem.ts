import { Request, Response } from "express";
import { db } from "../core/db";
import {
    problems,
    problemTopics,
    topics,
    codeSnippets,
    examples,
    runnerTemplates,
} from "../drizzle/schema";
import { inArray } from "drizzle-orm";
import crypto from "crypto";


type CreateProblemInput = {
    metricId: string;
    title: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    description: string;
    constraints?: string[];
    hints?: string[];
    followUps?: string[];

    topics: string[];

    examples: {
        exampleNum: number;
        exampleText: string;
        images?: string[];
    }[];

    codeSnippets: {
        language: string;
        starterCode: string;
    }[];

    runnerTemplates: {
        language: string;
        templateCode: string;
    }[];
};


export function generateMetricId(): string {
  const timestamp = Date.now().toString(36); // base36 timestamp
  const random = crypto.randomBytes(4).toString("hex");
  return `metric_${timestamp}_${random}`;
}


export const createProblem = async (req: Request, res: Response) => {
    const data: CreateProblemInput = req.body;
    let problemID = "";

    try {
        await db.transaction(async (tx) => {
            /* ---------------------------------------------------- */
            /* 1️⃣ Insert Problem */
            /* ---------------------------------------------------- */

            data.metricId = generateMetricId();

            const inserted = await tx
                .insert(problems)
                .values({
                    metricId: data.metricId,
                    title: data.title,
                    difficulty: data.difficulty,
                    description: data.description,
                    constraints: data.constraints ?? [],
                    hints: data.hints ?? [],
                    followUps: data.followUps ?? [],
                })
                .returning();

            if (!inserted.length) {
                throw new Error("Failed to create problem");
            }

            const problemId: any = inserted[0]?.id;
            problemID = problemId;

            /* ---------------------------------------------------- */
            /* 2️⃣ Handle Topics */
            /* ---------------------------------------------------- */

            type TopicRow = typeof topics.$inferSelect;

            const existingTopics: TopicRow[] = data.topics.length
                ? await tx
                    .select()
                    .from(topics)
                    .where(inArray(topics.name, data.topics))
                : [];

            const existingTopicNames = existingTopics.map((t) => t.name);

            const newTopicNames = data.topics.filter(
                (name) => !existingTopicNames.includes(name)
            );

            let insertedTopics: TopicRow[] = [];

            if (newTopicNames.length > 0) {
                insertedTopics = await tx
                    .insert(topics)
                    .values(newTopicNames.map((name) => ({ name })))
                    .returning();
            }

            const allTopics: TopicRow[] = [...existingTopics, ...insertedTopics];

            if (allTopics.length > 0) {
                await tx.insert(problemTopics).values(
                    allTopics.map((topic) => ({
                        problemId,
                        topicId: topic.id,
                    }))
                );
            }

            /* ---------------------------------------------------- */
            /* 3️⃣ Insert Code Snippets */
            /* ---------------------------------------------------- */

            if (data.codeSnippets?.length) {
                await tx.insert(codeSnippets).values(
                    data.codeSnippets.map((snippet) => ({
                        problemId,
                        language: snippet.language,
                        starterCode: snippet.starterCode,
                    }))
                );
            }

            /* ---------------------------------------------------- */
            /* 4️⃣ Insert Examples */
            /* ---------------------------------------------------- */

            if (data.examples?.length) {
                await tx.insert(examples).values(
                    data.examples.map((example) => ({
                        problemId,
                        exampleNum: example.exampleNum,
                        exampleText: example.exampleText,
                        images: example.images ?? [],
                    }))
                );
            }

            /* ---------------------------------------------------- */
            /* 5️⃣ Insert Runner Templates */
            /* ---------------------------------------------------- */

            if (data.runnerTemplates?.length) {
                await tx.insert(runnerTemplates).values(
                    data.runnerTemplates.map((template) => ({
                        problemId,
                        language: template.language,
                        templateCode: template.templateCode,
                    }))
                );
            }
        });

        return res.status(201).json({
            success: true,
            message: "Problem created successfully",
            problemID
        });
    } catch (error) {
        console.error("Create Problem Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create problem",
        });
    }
};
