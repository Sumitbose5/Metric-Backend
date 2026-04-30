import { Request, Response } from "express";
import { getConversationContext } from "../utils/getContext";

export const conversationController = (req: Request, res: Response) => {
    try {

        const { interviewId, userInput } = req.body;

        const aiResponse = getConversationContext(interviewId, userInput);
        res.status(200).json({
            success: true,
            data: aiResponse
        })

    } catch (err) {
        console.error('Error in conversationController:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};