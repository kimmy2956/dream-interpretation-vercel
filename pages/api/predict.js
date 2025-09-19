// pages/api/dream.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'FOUND' : 'MISSING');

  if (!process.env.GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY is missing!');
    return res.status(500).json({ error: 'GEMINI_API_KEY is missing' });
  }

  if (req.method !== 'POST') {
    console.warn('WARN: Method not allowed', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { dream } = req.body;
  if (!dream || !dream.trim()) {
    console.warn('WARN: No dream provided');
    return res.status(400).json({ error: 'No dream provided' });
  }

  try {
    const systemPrompt = `You are a helpful dream interpreter. 
Given a user's dream description, return a concise "interpretation" (Thai or same language as input), 
an array "lucky_numbers" of 3-6 integers (2 or 3-digit allowed), 
and a short "confidence" label (low/medium/high). 
Return ONLY a JSON object with keys: interpretation, lucky_numbers, confidence. 
Optionally include 'notes'.`;

    const userPrompt = `Dream: ${dream}\nReturn result as JSON.`;

    console.log('INFO: Sending request to Gemini API...');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(systemPrompt + "\n" + userPrompt);

    console.log('INFO: Received response from Gemini');

    const rawText = result.response.text() || '';
    console.log('DEBUG: rawText:', rawText);

    // แปลง JSON จาก Gemini response
    let parsed = null;
    try {
      const jsonMatch = String(rawText).match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      console.log('DEBUG: Parsed JSON:', parsed);
    } catch (err) {
      console.error('ERROR: JSON parse failed', err);
    }

    if (!parsed) {
      console.warn('WARN: Parsing failed, returning raw text');
      return res.status(200).json({
        interpretation: rawText.slice(0, 1000),
        lucky_numbers: [],
        confidence: 'unknown',
        raw: rawText
      });
    }

    // lucky_numbers → แปลงเป็นตัวเลข
    let lucky = Array.isArray(parsed.lucky_numbers) ? parsed.lucky_numbers.slice(0, 6) : [];
    lucky = lucky
      .map(n => (typeof n === 'number' ? n : parseInt(String(n).replace(/[^0-9]/g, ''), 10)))
      .filter(Boolean);

    return res.status(200).json({
      interpretation: parsed.interpretation || parsed.notes || 'ไม่มีคำอธิบาย',
      lucky_numbers: lucky,
      confidence: parsed.confidence || 'unknown',
      raw: parsed
    });

  } catch (err) {
    console.error('Gemini API Error:', err);
    return res.status(500).json({ error: err.message || 'Gemini service error', raw: err });
  }
}
