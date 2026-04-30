import express, { Request, Response } from 'express';
import multer from 'multer';
import { PDFExtract, PDFExtractOptions } from 'pdf.js-extract';
import { getResumeParserPrompt } from '../prompt/resume/parsingPrompt';
import { groq } from '../ai/groq';

const app = express();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 2 } // Limits to 2MB, plenty for a resume
});
const pdfExtract = new PDFExtract();

app.post('/api/resume/parse', upload.single('resume'), async (req: Request, res: Response): Promise<any> => {
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

    return res.status(200).json({
      message: 'Success',
      result: AIresponse
    });

  } catch (error: any) {
    console.error('Extraction Error:', error);
    return res.status(500).json({ error: 'Failed to parse the PDF resume.' });
  }
});

app.listen(3000, () => {
  console.log('Server active on http://localhost:3000');
});