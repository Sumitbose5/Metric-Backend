import { Router } from "express";
import { deleteResume, getUserResumes, parseResume, uploadResumeSupabase } from "../controllers/resumeController";
import { upload } from "../core/multer";

const router = Router();

router.post("/parse", upload.single('resume'), parseResume);

router.post("/upload", upload.single('resume'), uploadResumeSupabase, parseResume);

router.get("/user/:userId", getUserResumes);

router.delete("/:resumeId/:userId", deleteResume);

export default router;
