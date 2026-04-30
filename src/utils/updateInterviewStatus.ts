import { db } from '../core/db'; // Path to your existing drizzle db instance
import { interviews } from '../drizzle/interview/interviews';
import { eq } from 'drizzle-orm';

export const updateInterviewStatus = async (id: string, status: "IN_PROGRESS" | "COMPLETED") => {
  await db.update(interviews)
    .set({ 
      status, 
      startedAt: status === "IN_PROGRESS" ? new Date() : undefined,
      endedAt: status === "COMPLETED" ? new Date() : undefined 
    })
    .where(eq(interviews.id, id));
};