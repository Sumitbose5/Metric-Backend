import { Request, Response } from "express";
import { db } from "../core/db";
import { interviews, interviewSummaries, users, userStats } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

// Helper: format a Date to YYYY-MM-DD in local server timezone
// NOTE: we intentionally use local timezone here. If you prefer UTC or a user-specific timezone,
// pass a timezone or offset and convert accordingly.
const toDateKey = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

export const getDashboardData = async (req: Request, res: Response) => {
    try {
        // name, interviewsTaken, averageScore, bestScore, currentStreak

        const userId = req.params.userId as string;

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        // fetch user
        const userRows = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
        const user = userRows[0];
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const name = user.username || "Unknown";

        // get the attempts remaining from user stats
        const user_id = user?.id;
        const userStat = await db.select().from(userStats).where(eq(userStats.userId, user_id)).limit(1);
        const attemptsRemaining = userStat[0]?.trialsRemaining || 0;

        // Single optimized query: fetch interviews for this user along with their summary (if any)
        const rows = await db
            .select({
                id: interviews.id,
                createdAt: interviews.createdAt,
                status: interviews.status,
                totalScore: interviewSummaries.totalScore,
                type: interviews.type,
                difficulty: interviews.difficulty,
                communicationScore: interviewSummaries.communicationScore,
                technicalScore: interviewSummaries.technicalScore,
                dsaScore: interviewSummaries.dsaScore
            })
            .from(interviews)
            .leftJoin(interviewSummaries, eq(interviewSummaries.interviewId, interviews.id))
            .where(eq(interviews.userId, userId))
            .orderBy(desc(interviews.createdAt));

        const interviewsTaken = rows.length;

        // compute average and best from joined summary.totalScore (may be null)
        const scores = rows
            .map((r: any) => (r.totalScore != null ? Number(r.totalScore) : null))
            .filter((s: number | null) => s !== null) as number[];

        const averageScore = scores.length > 0 ? +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : null;
        const bestScore = scores.length > 0 ? Math.max(...scores) : null;

    // currentStreak: count consecutive days (server local timezone) ending today where user had at least one COMPLETED interview
        const completedDates = rows
            .filter((r: any) => r.status === "COMPLETED" && r.createdAt)
            .map((r: any) => {
                const d = r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt);
                return toDateKey(d);
            });

        const uniqueDates = Array.from(new Set(completedDates));
        const dateSet = new Set(uniqueDates);

        let streak = 0;
    // start from today (server local date at midnight)
    const today = new Date();
    let cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        while (true) {
            const key = toDateKey(cursor);
            if (dateSet.has(key)) {
                streak += 1;
                // move cursor one day back (local)
                cursor.setDate(cursor.getDate() - 1);
            } else {
                break;
            }
        }

        const currentStreak = streak;

        // Performance over time (get the date and time in server local timezone)
        const performanceOverTime = rows.map((r: any) => {
            const d = r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt);
            const date = toDateKey(d); // YYYY-MM-DD in UTC
            const hh = String(d.getHours()).padStart(2, "0");
            const mm = String(d.getMinutes()).padStart(2, "0");
            const ss = String(d.getSeconds()).padStart(2, "0");
            const time = `${hh}:${mm}:${ss}`; // HH:MM:SS in server local timezone

            return {
                date,
                time,
                type: r.type,
                score: r.totalScore != null ? Number(r.totalScore) : null,
            };
        });

        // Areas to improve section: compute average for communication, technical and dsa scores
        const safeNumber = (v: any) => (v == null ? null : Number(v));

        const communicationScores = rows.map((r: any) => safeNumber(r.communicationScore)).filter((s: number | null) => s !== null) as number[];
        const technicalScores = rows.map((r: any) => safeNumber(r.technicalScore)).filter((s: number | null) => s !== null) as number[];
        const dsaScores = rows.map((r: any) => safeNumber(r.dsaScore)).filter((s: number | null) => s !== null) as number[];

        const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

        const communicationAvg = avg(communicationScores);
        const technicalAvg = avg(technicalScores);
        const dsaAvg = avg(dsaScores);

        // overall average of available category averages
        const availableAvgs = [communicationAvg, technicalAvg, dsaAvg].filter((v) => v != null) as number[];
        const overallAvg = availableAvgs.length > 0 ? +(availableAvgs.reduce((a, b) => a + b, 0) / availableAvgs.length).toFixed(2) : null;

        // Build list and pick strengths (top 2) and weakest (bottom 1)
        const avgList = [
            { area: "Communication", avg: communicationAvg },
            { area: "Technical", avg: technicalAvg },
            { area: "DSA", avg: dsaAvg },
        ].filter((x) => x.avg != null) as { area: string; avg: number }[];

        // sort descending by avg
        avgList.sort((a, b) => b.avg - a.avg);

        const strengths = avgList.slice(0, 2).map(s => ({ area: s.area, avgScore: +s.avg.toFixed(2) }));
        let areaToImprove = null as null | { area: string; avgScore: number };
        if (avgList.length > 0) {
            const last = avgList[avgList.length - 1];
            if (last && last.avg != null) {
                areaToImprove = { area: last.area, avgScore: +last.avg.toFixed(2) };
            }
        }

        // Return recent interviews
        const recentInterviews = rows.slice(0, 5).map((r: any) => ({
            id: r.id,
            createdAt: r.createdAt,
            type: r.type,
            status: r.status,
            totalScore: r.totalScore,
            difficulty: r.difficulty,
        }));

        res.json({
            name,
            interviewsTaken,
            averageScore,
            bestScore,
            currentStreak,
            recentInterviews,
            performanceOverTime,
            strengths,
            areaToImprove,
            attemptsRemaining
        });
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};



export const interviewPageData = async (req: Request, res: Response) => {
    const userId = req.params?.id as string;

    if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
    }

    try {
        // Fetch interviews and their summaries for the user
        const rows = await db
            .select({
                id: interviews.id,
                createdAt: interviews.createdAt,
                status: interviews.status,
                totalScore: interviewSummaries.totalScore,
                communicationScore: interviewSummaries.communicationScore,
                technicalScore: interviewSummaries.technicalScore,
                dsaScore: interviewSummaries.dsaScore,
            })
            .from(interviews)
            .leftJoin(interviewSummaries, eq(interviewSummaries.interviewId, interviews.id))
            .where(eq(interviews.userId, userId));

        const interviewsTaken = rows.length;

        // get the attempts remaining from user stats
        const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
        if(!user || user.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        const user_id = user[0]?.id as string;
        const userStat = await db.select().from(userStats).where(eq(userStats.userId, user_id)).limit(1);
        const attemptsRemaining = userStat[0]?.trialsRemaining || 0;

        // compute average and best from joined summary.totalScore (may be null)
        const scores = rows
            .map((r: any) => (r.totalScore != null ? Number(r.totalScore) : null))
            .filter((s: number | null) => s !== null) as number[];

        const averageScore = scores.length > 0 ? +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : null;

        // compute averages for categories
        const safeNumber = (v: any) => (v == null ? null : Number(v));

        const communicationScores = rows.map((r: any) => safeNumber(r.communicationScore)).filter((s: number | null) => s !== null) as number[];
        const technicalScores = rows.map((r: any) => safeNumber(r.technicalScore)).filter((s: number | null) => s !== null) as number[];
        const dsaScores = rows.map((r: any) => safeNumber(r.dsaScore)).filter((s: number | null) => s !== null) as number[];

        const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

        const communicationAvg = avg(communicationScores);
        const technicalAvg = avg(technicalScores);
        const dsaAvg = avg(dsaScores);

        const avgList = [
            { area: 'Communication', avg: communicationAvg },
            { area: 'Technical', avg: technicalAvg },
            { area: 'DSA', avg: dsaAvg },
        ].filter((x) => x.avg != null) as { area: string; avg: number }[];

        // sort descending by avg
        avgList.sort((a, b) => b.avg - a.avg);

        
        // return a single top strength name and single weakest area name
        if (avgList.length === 0) {
            return res.json({ interviewsTaken, averageScore, strengths: null, weakness: null });
        }

    const topStrength = avgList.length > 0 ? avgList[0]!.area : null;
    const weakness = avgList.length > 0 ? avgList[avgList.length - 1]!.area : null;

    return res.json({ interviewsTaken, averageScore, strengths: topStrength, weakness, attemptsRemaining });
    } catch (error) {
        console.error("Error fetching interview page data:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};