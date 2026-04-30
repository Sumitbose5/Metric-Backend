import { Readable } from "stream";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

/**
 * Generates a readable audio stream from text
 * @param {string} text
 * @returns {Promise<Readable>}
 */
export async function generateTTSStream(text: string): Promise<Readable> {
  const tts = new MsEdgeTTS();

  // FIX 1: setMetadata expects positional arguments, not an object
  // Using the exported OUTPUT_FORMAT enum is safer than strings
  await tts.setMetadata(
    "en-US-AriaNeural", 
    OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
  );

  // FIX 2: toStream returns an object { audioStream, metadataStream }
  // We can return the audioStream directly as it is already a Readable stream
  try {
    const { audioStream } = tts.toStream(text);
    return audioStream;
  } catch (err) {
    console.error("TTS Stream Error:", err);
    throw err;
  }
}