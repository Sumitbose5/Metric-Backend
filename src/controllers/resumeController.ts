import express, { NextFunction, Request, Response } from 'express';
import { PDFExtract, PDFExtractOptions } from 'pdf.js-extract';
import { getResumeParserPrompt } from '../prompt/resume/parsingPrompt';
import { groq } from '../ai/groq';
import { uploadToCloudinary } from '../services/cloudinary';
import { uploadToSupabase } from '../services/supabaseHelper';
import { resumes, users } from '../drizzle/schema';
import { db } from '../core/db';
import { eq } from 'drizzle-orm';
import { interviewSummaries } from '../drizzle/interview/interviewSummary';

const pdfExtract = new PDFExtract();

export const parseResume = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const options: PDFExtractOptions = {};

        // Use the buffer directly from Multer
        const data = await pdfExtract.extractBuffer(req.file.buffer, options);

        // Combine text items into a single string
        // Each page has a 'content' array containing 'str' (the text string)
        const parsedText = data.pages
            .map(page => page.content.map(item => item.str).join(' '))
            .join('\n');

        const prompt = getResumeParserPrompt(parsedText);

        // Call the Groq API with the prompt to get structured JSON output
        const AIresponse = await groq(prompt);

        // Update the resume table with the parsed data
        await db.update(resumes).set({
            parsedData: AIresponse
        }).where(eq(resumes.id, res.locals.resume.id));

        return res.status(200).json({
            success: true,
            message: 'Success',
            result: AIresponse
        });

    } catch (error: any) {
        console.error('Extraction Error:', error);
        return res.status(500).json({ error: 'Failed to parse the PDF resume.' });
    }
};


export const uploadResumeSupabase = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const file = req.file;
        const { userId, resumeName } = req.body; // Assuming user ID is sent in the request body
        if (!file) return res.status(400).send("No file");

        // get the user id using the clerk id
        const user = await db.select().from(users).where(eq(users.clerkId, userId));
        if (!user[0]) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user_id = user[0].id;

        // Parallel: Upload to Supabase + Parse Text
        const [storageResult] = await Promise.all([
            uploadToSupabase(file.buffer, file.originalname)
        ]);

        // Insert the resume data into the database
        // 1. Add .returning() to your query
        const result = await db.insert(resumes).values({
            userId: user_id,
            resumeUrl: storageResult.publicUrl,
            name: resumeName || file.originalname,
        }).returning({ insertedId: resumes.id }); // This tells Drizzle exactly what to return

        // 2. Check if the result exists 
        if (!result || result.length === 0) {
            return res.status(500).send("Failed to insert resume");
        }

        // 3. Access the ID safely
        res.locals.resume = {
            userId: user_id,
            resumeUrl: storageResult.publicUrl,
            name: resumeName || file.originalname,
            id: result[0]?.insertedId // TypeScript now knows exactly what this is
        };

        next();

        // res.status(200).json({ success: true, url: storageResult.publicUrl });
    } catch (err: any) {
        console.log("error in resume upload : ", err);
        res.status(500).json({ error: err.message });
    }
};


export const getUserResumes = async (req: Request, res: Response) => {
    const userId = req.params.userId as string;

    try{
        // get the user id using the user clerk id
        const user = await db.select().from(users).where(eq(users.clerkId, userId));
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (!user[0]) {
            return res.status(404).json({ error: 'User not found' });
        }
        // send only the name, resumeUrl and id
        const allResumes = await db.select().from(resumes).where(eq(resumes.userId, user[0]?.id));
        res.status(200).json({ resumes: allResumes.map(({ name, resumeUrl, id }) => ({ name, resumeUrl, id })) });
    } catch(error){
        console.error('Error fetching resumes:', error);
        res.status(500).json({ error: 'Failed to fetch resumes' });
    }
};


export const deleteResume = async (req: Request, res: Response) => {
    const userId = req.params.userId as string;
    const resumeId = req.params.resumeId as string;

    try {
        // Check if the user exists
        const user = await db.select().from(users).where(eq(users.clerkId, userId));
        if (!user[0]) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Delete the resume
        const result = await db.delete(resumes).where(eq(resumes.id, resumeId)).returning({ deletedId: resumes.id });
        if (!result || result.length === 0) {
            return res.status(404).json({ error: 'Resume not found' });
        }

        res.status(200).json({ success: true, message: 'Resume deleted successfully' });
    } catch (error) {
        console.error('Error deleting resume:', error);
        res.status(500).json({ error: 'Failed to delete resume' });
    }
};

export const uploadResumeCloudinary = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        // Trigger upload and text extraction at the same time
        const [cloudinaryResult] = await Promise.all([
            uploadToCloudinary(req.file.buffer)
        ]);

        return res.status(200).json({
            url: cloudinaryResult.secure_url,
            message: "File uploaded successfully"
        });

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};