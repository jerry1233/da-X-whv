import { build } from "esbuild"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"

const directory = await mkdtemp(path.join(tmpdir(), "great-x-tests-"))
try {
  const outfile = path.join(directory, "core.test.mjs")
  await build({ entryPoints: ["tests/core.test.ts"], outfile, platform: "node", format: "esm", bundle: true, target: "node20" })
  const result = spawnSync(process.execPath, ["--test", outfile], { stdio: "inherit" })
  process.exitCode = result.status ?? 1
} finally { await rm(directory, { recursive: true, force: true }) }
