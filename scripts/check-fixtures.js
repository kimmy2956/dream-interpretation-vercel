#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const fixturesDir = path.join(__dirname, '../tests/fixtures')
const fixtures = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.json'))

;(async () => {
  for (const f of fixtures) {
    const data = JSON.parse(fs.readFileSync(path.join(fixturesDir, f), 'utf8'))
    console.log(`Testing: ${f}`)
    let res
    try {
      res = await fetch('http://localhost:3000/api/predict', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dream: data.input }) })
    } catch (e) {
      console.error('Start dev server first: npm run dev'); process.exit(1)
    }
    const json = await res.json()
    console.log('Keys:', Object.keys(json))
  }
})()
