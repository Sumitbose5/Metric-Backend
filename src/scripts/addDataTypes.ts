import { db } from "../core/db";
import { Request, Response } from "express";
import { problemTypeSchemas } from "../drizzle/judge0/problemType";

export const addProblemDataTypes = async (req: Request, res: Response) => {
    try {
        const { prId, problemId, inputSchema, outputSchema } = req.body;

        if (!problemId || !inputSchema || !outputSchema || !prId) {
            throw new Error("Input schema or output schema is missing");
        }

        // Add the data types to the database
        await db.insert(problemTypeSchemas).values({
            problemId: prId,
            inputSchema,
            outputSchema
        });

        return res.status(200).json({ message: "Data types added successfully" });
    } catch (error) {
        console.error("Error adding problem data types:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}