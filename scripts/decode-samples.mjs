import { readdirSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const here = path.dirname(fileURLToPath(import.meta.url))
const source = path.resolve(here, '../swift_version/TrombonePiano/Sounds')
const output = path.resolve(here, '../assets/sounds')
mkdirSync(output, { recursive: true })

const files = readdirSync(source).filter((name) => name.endsWith('.mp3'))
let cursor = 0
let failed = 0

async function worker() {
  while (cursor < files.length) {
    const name = files[cursor]
    cursor += 1
    const from = path.join(source, name)
    const to = path.join(output, name.replace(/\.mp3$/, '.wav'))
    const code = await run(from, to)
    if (code !== 0) {
      failed += 1
      console.error(`afconvert failed for ${name}`)
    }
  }
}

function run(from, to) {
  return new Promise((resolve) => {
    const child = spawn('afconvert', ['-f', 'WAVE', '-d', 'LEI16@44100', '-c', '1', from, to], {
      stdio: 'inherit',
    })
    child.on('close', resolve)
  })
}

await Promise.all(Array.from({ length: 8 }, worker))
if (failed > 0) {
  throw new Error(`${failed} files failed`)
}
console.log(`Decoded ${files.length} files with afconvert`)
