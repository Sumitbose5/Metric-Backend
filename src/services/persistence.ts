import { redis } from '../core/redis';
import { db } from '../core/db';
import { interviewMessages } from '../drizzle/interview/interviewConversation';
import { updateInterviewStatus } from '../utils/updateInterviewStatus';

export const finalizeInterview = async (interviewId: string) => {
  // 1. Get from Redis
  const rawData = await redis.lrange(`transcript:${interviewId}`, 0, -1);
  const transcript = rawData.map(d => JSON.parse(d));

  if (transcript.length > 0) {
    // 2. Batch Insert via Drizzle
    await db.insert(interviewMessages).values(
      transcript.map(m => ({
        interviewId,
        role: m.role,
        content: m.content,
      }))
    );
  }

  // 3. Update Status & Cleanup
  await updateInterviewStatus(interviewId, 'COMPLETED');
  await redis.del(`transcript:${interviewId}`);
};