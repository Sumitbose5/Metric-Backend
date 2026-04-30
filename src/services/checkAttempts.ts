import { eq } from "drizzle-orm";
import { db } from "../core/db";
import { users, userStats } from "../drizzle/schema";


export const checkAttempts = async (userId: string) => {

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
            return false;
        }

        console.log("User has remaining interview attempts:", attempts[0]?.trialsRemaining);
        return true;
    } catch (error) {
        console.error("Error checking interview attempts:", error);
        throw new Error("Failed to check interview attempts");
    }
};

