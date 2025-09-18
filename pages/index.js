import { useState } from 'react'

export default function Home() {
  const [dream, setDream] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dream })
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen p-6 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-2xl p-8">
        <h1 className="text-2xl font-semibold mb-4">ทำนายฝันและเลขเด็ด</h1>
        <p className="text-sm text-slate-600 mb-6">พิมพ์ความฝันของคุณ แล้วกด "ทำนาย"</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={dream}
            onChange={(e) => setDream(e.target.value)}
            placeholder="พิมพ์ความฝันของคุณ..."
            rows={6}
            className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-indigo-300"
          />
          <div className="flex gap-3">
            <button type="submit" disabled={loading || !dream.trim()} className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50">
              {loading ? 'กำลังทำนาย...' : 'ทำนาย'}
            </button>
            <button type="button" onClick={() => { setDream(''); setResult(null); setError(null) }} className="px-4 py-2 rounded-lg border">
              ล้าง
            </button>
          </div>
        </form>

        <div className="mt-6">
          {error && <div className="text-red-600">เกิดข้อผิดพลาด: {error}</div>}
          {result && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="font-medium">คำทำนาย</h3>
                <p className="mt-2 whitespace-pre-wrap">{result.interpretation}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg">
                <h3 className="font-medium">เลขเด็ด</h3>
                <p className="mt-2 text-lg font-semibold">{(result.lucky_numbers || []).join(' • ')}</p>
                {result.confidence && <p className="text-sm text-slate-600 mt-1">ความมั่นใจ: {result.confidence}</p>}
              </div>
              {result.raw && (
                <details className="text-xs text-slate-500">
                  <summary>ดู raw response</summary>
                  <pre className="mt-2 p-2 bg-black text-white rounded">{JSON.stringify(result.raw, null, 2)}</pre>
                </details>
              )}
            </div>
          )}
        </div>

        <footer className="mt-6 text-xs text-slate-500">พัฒนาโดย ธันยรัศมิ์ ประภาจิรสกุล</footer>
      </div>
    </main>
  )
}
