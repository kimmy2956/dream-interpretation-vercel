// pages/api/dream.js
import OpenAI from "openai";

export default async function handler(req, res) {
  console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'FOUND' : 'MISSING');

  if (!process.env.OPENAI_API_KEY) {
    console.error('ERROR: OPENAI_API_KEY is missing!');
    return res.status(500).json({ error: 'OPENAI_API_KEY is missing' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { dream } = req.body;
  if (!dream || !dream.trim()) {
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

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 400,
      temperature: 0.8
    });

    const rawText = response.choices?.[0]?.message?.content || '';
    let parsed = null;

    try {
      const jsonMatch = String(rawText).match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error('JSON parse failed', err);
    }

    if (!parsed) {
      return res.status(200).json({
        interpretation: rawText.slice(0, 1000),
        lucky_numbers: [],
        confidence: 'unknown',
        raw: rawText
      });
    }

    let lucky = Array.isArray(parsed.lucky_numbers) ? parsed.lucky_numbers.slice(0, 6) : [];
    lucky = lucky.map(n => (typeof n === 'number' ? n : parseInt(String(n).replace(/[^0-9]/g, ''), 10))).filter(Boolean);

    return res.status(200).json({
      interpretation: parsed.interpretation || parsed.notes || 'ไม่มีคำอธิบาย',
      lucky_numbers: lucky,
      confidence: parsed.confidence || 'unknown',
      raw: parsed
    });

  } catch (err) {
    console.error('OpenAI API Error:', err);
    return res.status(500).json({ error: err.message || 'AI service error', raw: err });
  }
}
