import { readFile, writeFile } from 'node:fs/promises'

const outputPath = new URL('../out/sw.js', import.meta.url)
const source = await readFile(outputPath, 'utf8')
const buildId = process.env.VERCEL_GIT_COMMIT_SHA || `local-${Date.now()}`

if (!source.includes('__BUILD_ID__')) {
  throw new Error('Service worker build placeholder was not found')
}

await writeFile(outputPath, source.replaceAll('__BUILD_ID__', buildId))
