import { Router } from "express";
const router = Router();
import { generateTTSStream } from "../services/ttsService";


router.post("/tts", async (req, res) => {
  const { text } = req.body;

  try {
    const stream = await generateTTSStream(text);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Transfer-Encoding", "chunked");

    stream.pipe(res);
  } catch (error) {
    console.error("TTS Error:", error);
    res.status(500).json({ error: "TTS generation failed" });
  }
});

export default router;