import { readFile, writeFile } from 'node:fs/promises'

const outputPath = new URL('../out/sw.js', import.meta.url)
const manifestPath = new URL('../out/exercise-catalog-manifest.json', import.meta.url)
const source = await readFile(outputPath, 'utf8')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const buildId = process.env.VERCEL_GIT_COMMIT_SHA || `local-${Date.now()}`

if (!source.includes('__BUILD_ID__')) {
  throw new Error('Service worker build placeholder was not found')
}
if (typeof manifest.hash !== 'string') {
  throw new Error('Exercise catalog hash was not found in the generated manifest')
}

await writeFile(
  outputPath,
  source.replaceAll('__BUILD_ID__', buildId).replaceAll('__CATALOG_HASH__', manifest.hash),
)
