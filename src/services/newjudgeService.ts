import axios from 'axios';

const BASE_URL = "https://judge029.p.rapidapi.com";
const RAPID_API_KEY = process.env.RAPIDAPI_KEY;

// Helper to handle Base64 encoding in Node.js
const toBase64 = (str: string) => Buffer.from(str || "").toString('base64');
const fromBase64 = (str: string) => Buffer.from(str || "", 'base64').toString('utf-8');

export const judgeService = {
  async executeTestCase(sourceCode: string, languageId: number) {
    const options = {
      method: 'POST',
      url: `${BASE_URL}/submissions`,
      // 1. CHANGE: Set base64_encoded to 'true'
      params: { base64_encoded: 'true', wait: 'false' }, 
      headers: {
        'content-type': 'application/json',
        'x-rapidapi-key': RAPID_API_KEY,
        'x-rapidapi-host': 'judge029.p.rapidapi.com'
      },
      data: {
        // 2. CHANGE: Encode the source_code and stdin
        source_code: toBase64(sourceCode),
        language_id: languageId,
        stdin: toBase64("") 
      }
    };

    const response = await axios.request(options);
    const token = response.data.token;

    return await this.pollResult(token);
  },

  async pollResult(token: string): Promise<any> {
    const options = {
      method: 'GET',
      url: `${BASE_URL}/submissions/${token}`,
      // 3. CHANGE: Tell Judge0 to return results in base64
      params: { base64_encoded: 'true' },
      headers: {
        'x-rapidapi-key': RAPID_API_KEY,
        'x-rapidapi-host': 'judge029.p.rapidapi.com'
      }
    };

    while (true) {
      const response = await axios.request(options);
      const data = response.data;
      const statusId = data.status.id;

      if (statusId > 2) {
        // 4. OPTIONAL: Decode output fields so they are readable in your logs/UI
        if (data.stdout) data.stdout = fromBase64(data.stdout);
        if (data.stderr) data.stderr = fromBase64(data.stderr);
        if (data.compile_output) data.compile_output = fromBase64(data.compile_output);
        if (data.message) data.message = fromBase64(data.message);
        
        return data;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};