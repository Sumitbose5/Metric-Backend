import { asc, eq } from "drizzle-orm";
import { db } from "../core/db";
import { interviewMessages } from "../drizzle/interview/interviewConversation";
import { formatConversationForAI } from "./formattedConversation";
import { groq } from "../ai/groq";

export const getConversationContext = async (interviewId: string, userInput: string) => {
    try {

        // Save user message in DB
        await db.insert(interviewMessages).values({
            interviewId,
            content: userInput,
            role: "USER"
        })

        // 2️⃣ Fetch entire conversation ordered
        const previousMessages = await db
            .select()
            .from(interviewMessages)
            .where(eq(interviewMessages.interviewId, interviewId))
            .orderBy(asc(interviewMessages.createdAt));

        // 3️⃣ Format for AI
        const formattedMessages = formatConversationForAI(previousMessages);

        // 4️⃣ Add system prompt at top (VERY IMPORTANT)
        const systemPrompt = {
            role: "system",
            content: `
You are a professional DSA interviewer.
Maintain structured, turn-based interaction.
Evaluate candidate reasoning carefully.
Ask one question at a time.
`,
        };

        const finalMessages = [systemPrompt, ...formattedMessages];
        const aiResponse = await groq(finalMessages);
        const aiText = aiResponse.choices[0].message.content ?? "";

        // 6️⃣ Save AI response
        await db.insert(interviewMessages).values({
            interviewId,
            role: "AI",
            content: aiText,
            inputTokens: aiResponse.usage?.prompt_tokens ?? 0,
            outputTokens: aiResponse.usage?.completion_tokens ?? 0,
            totalTokens: aiResponse.usage?.total_tokens ?? 0,
        });

        // 7️⃣ Return AI response
        return aiText;

    } catch (err) {
        console.error("Error in get conversation context : ", err);
        throw new Error("Error in get conversation context");
    }
}