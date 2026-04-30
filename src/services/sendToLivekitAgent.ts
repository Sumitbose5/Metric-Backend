import * as dotenv from 'dotenv';
dotenv.config();

export const sendToLivekitAgent = async (result: any, sourceCode: string, interviewId: string) => {
    try {
        const response = await fetch(`${process.env.AGENT_API_BASE_URL}/notify-code-result`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                result,
                candidateCode: sourceCode,
                interviewId
            })
        });
        return response.json();
    } catch (error) {
        console.error("Error sending to Livekit agent:", error);
        throw error;
    }
};
