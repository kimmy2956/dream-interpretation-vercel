// pages/api/dream.js
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function callOpenAI(dream) {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new Error("OPENAI_API_KEY missing");

  const client = new OpenAI({ apiKey: openaiKey });
  const systemPrompt = `You are a helpful dream interpreter. 
Given a user's dream description, return a concise "interpretation" (Thai or same language as input), 
an array "lucky_numbers" of 3-6 integers (2 or 3-digit allowed), 
and a short "confidence" label (low/medium/high). 
Return ONLY a JSON object with keys: interpretation, lucky_numbers, confidence. 
Optionally include 'notes'.`;
  const userPrompt = `Dream: ${dream}\nReturn result as JSON.`;

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    max_tokens: 400,
    temperature: 0.8
  });

  const rawText = response.choices?.[0]?.message?.content || "";
  return rawText;
}

async function callGemini(dream) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error("GEMINI_API_KEY missing");

  const systemPrompt = `You are a helpful dream interpreter. 
Given a user's dream description, return a concise "interpretation" (Thai or same language as input), 
an array "lucky_numbers" of 3-6 integers (2 or 3-digit allowed), 
and a short "confidence" label (low/medium/high). 
Return ONLY a JSON object with keys: interpretation, lucky_numbers, confidence. 
Optionally include 'notes'.`;
  const userPrompt = `Dream: ${dream}\nReturn result as JSON.`;

  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const result = await model.generateContent(systemPrompt + "\n" + userPrompt);
  const rawText = result.response.text() || "";
  return rawText;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { dream } = req.body;
  if (!dream || !dream.trim()) {
    return res.status(400).json({ error: "No dream provided" });
  }

  let rawText;
  let usedService = "openai";

  try {
    // ลองใช้ OpenAI ก่อน
    rawText = await callOpenAI(dream);
  } catch (e) {
    console.error("OpenAI failed:", e.message);

    // ถ้า error มาจาก insufficient quota หรือ error อื่นๆที่หมายถึงใช้ไม่ได้
    try {
      rawText = await callGemini(dream);
      usedService = "gemini";
      console.log("Fallback to Gemini succeeded");
    } catch (e2) {
      console.error("Gemini also failed:", e2.message);
      return res.status(500).json({ error: "Both AI services failed", details: e2.message });
    }
  }

  // แปลง JSON จากข้อความ rawText
  let parsed = null;
  try {
    const jsonMatch = String(rawText).match(/\{[\s\S]*\}/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("JSON parse failed:", err);
  }

  if (!parsed) {
    return res.status(200).json({
      interpretation: rawText.slice(0, 1000),
      lucky_numbers: [],
      confidence: "unknown",
      service: usedService,
      raw: rawText
    });
  }

  let lucky = Array.isArray(parsed.lucky_numbers) ? parsed.lucky_numbers.slice(0, 6) : [];
  lucky = lucky
    .map(n => (typeof n === "number" ? n : parseInt(String(n).replace(/[^0-9]/g, ""), 10)))
    .filter(Boolean);

  return res.status(200).json({
    interpretation: parsed.interpretation || parsed.notes || "ไม่มีคำอธิบาย",
    lucky_numbers: lucky,
    confidence: parsed.confidence || "unknown",
    service: usedService,
    raw: parsed
  });
}
