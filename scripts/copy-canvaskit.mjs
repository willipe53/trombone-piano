import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'node_modules/canvaskit-wasm/bin/full/canvaskit.wasm')
const destination = join(root, 'public/canvaskit.wasm')
mkdirSync(dirname(destination), { recursive: true })
copyFileSync(source, destination)
