import OpenAI from 'openai'
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { dream } = req.body
  if (!dream || !String(dream).trim()) return res.status(400).json({ error: 'No dream provided' })

  try {
    const systemPrompt = `You are a helpful dream interpreter. Produce a concise interpretation, lucky_numbers (3-6 integers), and confidence (low/medium/high) as JSON.`
    const userPrompt = `Dream: ${dream}`

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 400,
      temperature: 0.8
    })

    const rawText = response.choices?.[0]?.message?.content || ''
    let parsed = null
    try {
      const match = rawText.match(/\{[\s\S]*\}/)
      if (match) parsed = JSON.parse(match[0])
    } catch {}

    if (!parsed) return res.json({ interpretation: rawText.slice(0, 1000), lucky_numbers: [], confidence: 'unknown', raw: response })

    const lucky = (parsed.lucky_numbers || []).slice(0, 6).map(n => parseInt(n, 10)).filter(Boolean)
    res.json({ interpretation: parsed.interpretation || parsed.notes || 'ไม่มีคำอธิบาย', lucky_numbers: lucky, confidence: parsed.confidence || 'unknown', raw: parsed })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'AI service error' })
  }
}
