import { Request, Response } from "express";
import { interviews } from "../drizzle/interview/interviews";
import { db } from "../core/db";
import { eq, inArray } from "drizzle-orm/sql/expressions/conditions";
import { resumes, submissions, users, userStats } from "../drizzle/schema";
import { getSingleInterviewQuestion } from "./dsaController";
import { initialDSA } from "../prompt/dsa/initial";
import { groq } from "../ai/groq";
import { interviewMessages } from "../drizzle/interview/interviewConversation";
import { buildDSAInsightPrompt, buildInsightPrompt } from "../utils/interviewInsight";
import { interviewSummaries } from "../drizzle/interview/interviewSummary";
import { createLiveKitToken } from "../services/livekit_room";
import { deduct } from "../services/deductAttempt"
import { checkAttempts } from "../services/checkAttempts";

export const startInterview = async (req: Request, res: Response) => {
    const { userId, difficulty } = req.body;
    console.log("Starting interview for user:", userId, "Difficulty:", difficulty);

    try {
        const hasAttempts = await checkAttempts(userId);

        if (!hasAttempts) {
            return res.status(403).json({ error: "No interview attempts remaining" });
        }

        // Logic to start the interview
        const result = await db.insert(interviews)
            .values({
                userId,
                type: "DSA",
                difficulty,
                status: "CREATED"
            })
            .returning(); // Returns all columns

        // get the inserted interview data
        if (!result[0]) return res.status(500).json({ error: "Database insert failed" });
        const interviewId = result[0].id;

        // get the user's full_name
        const fullName = await db.select().from(users).where(eq(users.clerkId, userId));
        console.log("User full name:", fullName[0]?.fullname);
        const full_name = fullName[0]?.fullname || "Anonymous";

        // get single interview question
        // const dsaProblem = await getSingleInterviewQuestion({ userId, interviewId });
        // console.log("Dsa problem:", dsaProblem);
        // const { problem } = dsaProblem;

        // console.log("Problem : ", problem);

        // create a livekit room and send the details to the frontend
        const roomName = `interview-${Date.now()}`;
        const identity = `candidate-${userId}`;

        const token = await createLiveKitToken(identity, roomName, interviewId, userId);

        console.log("LiveKit token created:", token);

        res.status(200).json({
            message: "Interview started successfully",
            interviewId,
            roomName,
            token,
            participantName: identity,
            livekitUrl: process.env.LIVEKIT_URL
            // problem_metadata: dsaProblem
        });
    } catch (error) {
        console.log("Error starting interview:", error);
        res.status(500).json({ error });
    }
};



export const endInterview = async (req: Request, res: Response) => {
    const { interviewId, conversation } = req.body;

    if (!interviewId) {
        return res.status(400).json({ message: "interviewId is required" });
    }

    if (!conversation || !Array.isArray(conversation) || conversation.length === 0) {
        // mark the interview status as abandoned
        await db
            .update(interviews)
            .set({ status: "ABANDONED" })
            .where(eq(interviews.id, interviewId));

        return res.status(400).json({ message: "conversation is required and must be non-empty" });
    }

    try {
        console.log("Ending DSA interview for interview ID:", interviewId);
        console.log("Conversation length:", conversation.length, "messages");

        // get the code submissions made in the interview
        const codeSubmissions = await db
            .select({
                sourceCode: submissions.sourceCode,
                verdict: submissions.verdict,
                passedTestCases: submissions.passedTestCases,
                totalTestCases: submissions.totalTestCases
            })
            .from(submissions)
            .where(eq(submissions.interviewId, interviewId));

        // Process conversation for insights
        const insightPrompt = buildDSAInsightPrompt(conversation, codeSubmissions);
        const aiResponse = await groq(insightPrompt);
        console.log("Raw AI Response:", aiResponse);

        // Strip markdown fences in case the model adds them
        const cleaned = (aiResponse as string)
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        let insights: {
            totalScore: number;
            communicationScore: number;
            technicalScore: number;
            dsaScore: number;
            strengths: string;
            weaknesses: string;
            aiFeedback: string;
            recommendation: string;
        };

        try {
            insights = JSON.parse(cleaned);
            console.log("Parsed DSA insights:", insights);
        } catch (parseError) {
            console.error("Failed to parse AI response as JSON. Raw cleaned string:", cleaned);
            return res.status(500).json({ message: "Failed to parse AI insights" });
        }

        // Insert into interview_summaries
        const [summary] = await db
            .insert(interviewSummaries)
            .values({
                interviewId,
                totalScore: insights.totalScore,
                communicationScore: insights.communicationScore ?? null,
                technicalScore: insights.technicalScore ?? null,
                dsaScore: insights.dsaScore ?? null,
                strengths: insights.strengths ?? null,
                weaknesses: insights.weaknesses ?? null,
                aiFeedback: insights.aiFeedback ?? null,
                recommendation: insights.recommendation ?? null,
                job_role: "DSA Interview"
            })
            .returning();

        console.log("DSA Summary saved:", summary);

        // Mark interview completed only after summary is safely saved
        const [updatedInterview] = await db
            .update(interviews)
            .set({ status: "COMPLETED" })
            .where(eq(interviews.id, interviewId))
            .returning({ userId: interviews.userId });

        if (!updatedInterview) {
            console.error("Failed to retrieve userId from updated interview");
            return res.status(500).json({ message: "Failed to retrieve userId" });
        }

        const userId = updatedInterview?.userId;

        // deducts the attempts of the user from user stats
        await deduct(userId);

        return res.status(200).json({
            message: "Interview ended successfully",
            summary,
            interviewId
        });
    } catch (error) {
        console.error("Error ending DSA interview:", error);
        return res.status(500).json({ error });
    }
};


export const startResumeInterview = async (req: Request, res: Response) => {
    const { userId, resumeId, role } = req.body;   // role -> full stack dev, frontend dev
    console.log("Starting resume interview for user:", userId);

    try {

        const hasAttempts = await checkAttempts(userId);

        if (!hasAttempts) {
            return res.status(403).json({ error: "No interview attempts remaining" });
        }

        // check for the user exists or not
        const user = await db.select().from(users).where(eq(users.clerkId, userId));
        if (!user[0]) return res.status(404).json({ error: "User not found" });

        // get the user full name
        const full_name = user[0].fullname || "Anonymous";

        // Logic to start the resume interview
        const result = await db.insert(interviews)
            .values({
                userId,
                type: "RESUME",
                difficulty: "beginner",
                status: "CREATED"
            })
            .returning(); // Returns all columns

        // get the inserted interview data
        if (!result[0]) return res.status(500).json({ error: "Database insert failed" });
        const interviewId = result[0].id;


        // get the resume context using the resumeId
        const resume = await db.select().from(resumes).where(eq(resumes.id, resumeId));
        if (!resume[0]) return res.status(404).json({ error: "Resume not found" });

        const resumeContext = resume[0].parsedData; // Assuming the resume URL is the context

        res.status(200).json({
            message: "Resume interview started successfully",
            interviewId,
            resumeContext,
            userName: full_name,
            role
        });
    } catch (error) {
        console.log("Error starting resume interview:", error);
        res.status(500).json({ error });
    }
}


export const endResumeInterview = async (req: Request, res: Response) => {
    const { interviewId, conversation, role } = req.body;

    if (!interviewId) {
        return res.status(400).json({ message: "interviewId is required" });
    }

    if (!conversation || !Array.isArray(conversation) || conversation.length === 0) {
        // mark the interview status as abandoned
        await db
            .update(interviews)
            .set({ status: "ABANDONED" })
            .where(eq(interviews.id, interviewId));

        return res.status(400).json({ message: "conversation is required and must be non-empty" });
    }

    try {
        console.log("Ending resume interview for interview ID:", interviewId);
        console.log("Conversation length:", conversation.length, "messages");

        const insightPrompt = buildInsightPrompt(conversation);

        // groq() already returns data.choices[0].message.content — a plain string
        const aiResponse = await groq(insightPrompt);
        console.log("Raw AI Response:", aiResponse);

        // Strip markdown fences in case the model adds them anyway
        const cleaned = (aiResponse as string)
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        let insights: {
            totalScore: number;
            communicationScore: number;
            technicalScore: number;
            strengths: string;
            weaknesses: string;
            aiFeedback: string;
            recommendation: string;
        };

        try {
            insights = JSON.parse(cleaned);
            console.log("Parsed insights:", insights);
        } catch (parseError) {
            console.error("Failed to parse AI response as JSON. Raw cleaned string:", cleaned);
            return res.status(500).json({ message: "Failed to parse AI insights" });
        }

        // Insert into interview_summaries first
        const [summary] = await db
            .insert(interviewSummaries)
            .values({
                interviewId,
                totalScore: insights.totalScore,
                communicationScore: insights.communicationScore ?? null,
                technicalScore: insights.technicalScore ?? null,
                dsaScore: null,                          // No DSA for resume interviews
                strengths: insights.strengths ?? null,
                weaknesses: insights.weaknesses ?? null,
                aiFeedback: insights.aiFeedback ?? null,
                recommendation: insights.recommendation ?? null,
                job_role: role || "Unknown"
            })
            .returning();

        console.log("Summary saved:", summary);

        // Mark interview completed only after summary is safely saved
        const [updatedInterview] = await db
            .update(interviews)
            .set({ status: "COMPLETED" })
            .where(eq(interviews.id, interviewId))
            .returning({ userId: interviews.userId });

        if (!updatedInterview) {
            console.error("Failed to retrieve userId from updated interview");
            return res.status(500).json({ message: "Failed to retrieve userId" });
        }

        const userId = updatedInterview?.userId;

        // deducts the attempts of the user from user stats
        await deduct(userId);

        return res.status(200).json({
            message: "Resume interview ended successfully",
            summary,
            interviewId
        });

    } catch (error) {
        console.error("Error ending resume interview:", error);
        return res.status(500).json({ error });
    }
};


export const getAllInterviewsFeedback = async (req: Request, res: Response) => {
    const { userId } = req.params as { userId: string };
    try {

        // get all the interviews with the userId
        const interviewsData = await db.select().from(interviews).where(eq(interviews.userId, userId));

        // get the feedback for each interview by collecting all interview ids and querying with an IN clause
        const interviewIds = interviewsData.map(interview => interview?.id).filter(Boolean);

        if (interviewIds.length === 0) {
            // nothing to fetch
            return res.status(200).json({ message: "Feedback fetched successfully", feedback: [] });
        }

        const feedback = await db.select().from(interviewSummaries).where(inArray(interviewSummaries.interviewId, interviewIds));

        console.log("Feedback fetched:", feedback);

        // join interview data and feedback and give interviewId, job_role, interview type, created At, totalscore, aiFeedback
        const result = interviewsData.map(interview => {
            const feedbackForInterview = feedback.find(f => f.interviewId === interview.id);
            return {
                interviewId: interview.id,
                job_role: feedbackForInterview?.job_role || "Unknown",
                interview_type: interview.type,
                createdAt: interview.createdAt,
                totalScore: feedbackForInterview?.totalScore || 0,
                aiFeedback: feedbackForInterview?.aiFeedback || "No feedback available"
            };
        });

        res.status(200).json({ message: "Feedback fetched successfully", feedback: result });
    } catch (error) {
        console.error("Error fetching interview feedback:", error);
        res.status(500).json({ error });
    }
};


export const getInterviewFeedback = async (req: Request, res: Response) => {
    const { interviewId } = req.params as { interviewId: string };

    try {
        const feedback = await db.select().from(interviewSummaries).where(eq(interviewSummaries.interviewId, interviewId));
        if (!feedback) {
            return res.status(404).json({ error: 'Feedback not found' });
        }

        res.status(200).json({ feedback: feedback[0] });
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ error: 'Failed to fetch feedback' });
    }
};


export const checkInterviewTrialsRemaining = async (req: Request, res: Response) => {

    const userId = req.params.userId as string;

    if (!userId) {
        throw new Error("userId is required");
    }

    // get the user_id from users table
    const user = await db
        .select()
        .from(users)
        .where(eq(users.clerkId, userId));

    if (!user[0]) {
        throw new Error("User not found");
    }

    const user_id = user[0].id;

    try {
        // Check the user's interview attempts
        const attempts = await db
            .select()
            .from(userStats)
            .where(eq(userStats.userId, user_id));

        if (!attempts[0] || !attempts[0]?.trialsRemaining) {
            console.log("No interview attempts remaining for user:", userId);
            return res.status(200).json({ hasAttempts: false, trialsRemaining: 0 });
        }

        console.log("User has remaining interview attempts:", attempts[0]?.trialsRemaining);
        return res.status(200).json({ hasAttempts: true, trialsRemaining: attempts[0]?.trialsRemaining });
    } catch (error) {
        console.error("Error checking interview attempts:", error);
        throw new Error("Failed to check interview attempts");
    }
};