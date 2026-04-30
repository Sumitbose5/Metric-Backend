import { eq } from "drizzle-orm";
import { db } from "../core/db";
import { users, userStats } from "../drizzle/schema";


export const deduct = async (userId: string) => {

    // get the user_id from users table
    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user) {
        throw new Error('User not found');
    }

    const user_id = user[0]?.id as string;

    const userStat = await db.select().from(userStats).where(eq(userStats.userId, user_id)).limit(1);
    if (!userStat) {
        throw new Error('User statistics not found');
    }

    const remainingTrials = userStat[0]?.trialsRemaining;
    if (!remainingTrials) {
        throw new Error('Failed to retrieve remaining trials');
    }

    if(remainingTrials <= 0) {
        throw new Error('No remaining trials');
    }

    // Deduct a trial
    await db.update(userStats).set({ trialsRemaining: remainingTrials - 1 }).where(eq(userStats.userId, user_id));

    return true;
}
