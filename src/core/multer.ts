import multer from 'multer';

export const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 2 } // Limits to 2MB, plenty for a resume
});