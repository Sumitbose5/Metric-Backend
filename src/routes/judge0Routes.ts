// src/routes/submit.router.ts
import { Router, Request, Response } from 'express';
import executeSubmission from '../services/submissionService';
import executeRun from '../services/runCodeService';
import { sendToLivekitAgent } from '../services/sendToLivekitAgent';

const router = Router();

router.post('/submit', async (req: Request, res: Response) => {
    const { sourceCode, languageId, language, problemId, interviewId, userId } = req.body;

    if (!sourceCode || !languageId || !problemId || !language || !interviewId || !userId) {
        return res.status(400).json({ error: "sourceCode, languageId, problemId, language, interviewId, and userId are required" });
    }

    try {
        const result = await executeSubmission(problemId, sourceCode, language, languageId, interviewId, userId);

        // Send the result to Livekit agent
        try {
            const res = await sendToLivekitAgent(result, sourceCode, interviewId);
            if (res.status !== "success") {
                console.log("Failed to send submission result to Livekit agent:", res);
            }
        } catch(err) {
            console.log("Failed to send submission result to Livekit agent:", err);
        }
        
        res.json(result);
    } catch (error: any) {
        console.error("Internal Error:", error);
        res.status(500).json({ error: error.message });
    }
});


router.post('/run', async (req: Request, res: Response) => {
    const { sourceCode, languageId, language, problemId } = req.body;

    if (!sourceCode || !languageId || !problemId || !language) {
        return res.status(400).json({ error: "sourceCode, languageId, problemId, and language are required" });
    }

    try {
        const result = await executeRun(problemId, sourceCode, language, languageId);
        res.json(result);
    } catch (error: any) {
        console.error("Internal Error:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;