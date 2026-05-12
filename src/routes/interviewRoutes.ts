import { Router, Request, Response } from 'express';
import { getSingleInterviewQuestion } from "../controllers/dsaController";
import { startInterview, endInterview, startResumeInterview, endResumeInterview, getAllInterviewsFeedback, getInterviewFeedback, checkInterviewTrialsRemaining } from '../controllers/interviewController';
import { requireAuth } from "@clerk/express";

type Difficulty = "beginner" | "intermediate" | "advanced";

const router = Router();

router.get("/question", async (req: Request, res: Response) => {
    const { userId, difficulty, interviewId } = req.query;
    console.log("Fetching interview question for user:", userId, "Difficulty:", difficulty, "Interview ID:", interviewId);

    try {
        const problemData = await getSingleInterviewQuestion({
            userId: userId as string,
            interviewId: interviewId as string
        });
        console.log("Problem Data:", problemData);
        res.json(problemData);
    } catch (error) {
        console.error("Error fetching interview question:", error);
        res.status(500).json({ error });
    }
});

router.post("/start", startInterview);
router.post("/end", endInterview);


router.post("/resume/start", startResumeInterview);
router.post("/resume/end", endResumeInterview);

router.get("/feedbacks/:userId", getAllInterviewsFeedback);

router.get("/feedback/:interviewId", getInterviewFeedback);

router.get("/check-attempts/:userId", checkInterviewTrialsRemaining);

export default router;