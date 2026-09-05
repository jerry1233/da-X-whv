import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()
const buildRoots = [
  path.join(root, "build", "chrome-mv3-prod"),
  path.join(root, "build", "chrome-mv3-dev")
]

const staticEntries = [
  "assets",
  "css",
  "images",
  "js",
  "popup.html",
  "info_au.html",
  "info_nz.html",
  "link_au.html",
  "link_nz.html",
  "content_script.js"
]

async function exists(filePath) {
  try {
    await stat(filePath)
    return true
  } catch {
    return false
  }
}

async function findBuildDirs() {
  const dirs = []
  for (const buildRoot of buildRoots) {
    if (await exists(path.join(buildRoot, "manifest.json"))) {
      dirs.push(buildRoot)
    }
  }

  const buildDir = path.join(root, "build")
  if (!(await exists(buildDir))) {
    return dirs
  }

  for (const entry of await readdir(buildDir)) {
    const candidate = path.join(buildDir, entry)
    if (!dirs.includes(candidate) && (await exists(path.join(candidate, "manifest.json")))) {
      dirs.push(candidate)
    }
  }

  return dirs
}

async function copyLegacyFiles(outDir) {
  for (const entry of staticEntries) {
    const source = path.join(root, entry)
    if (!(await exists(source))) {
      continue
    }

    const destination = path.join(outDir, entry)
    await mkdir(path.dirname(destination), { recursive: true })
    await cp(source, destination, { recursive: true })
  }
}

async function patchManifest(outDir) {
  const manifestPath = path.join(outDir, "manifest.json")
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"))

  manifest.name = "打工度假自动填表插件-大X-纽澳多用版"
  manifest.version = "3.6.0"
  manifest.manifest_version = 3
  manifest.action = {
    default_icon: "images/icon.png",
    default_title: "大X插件多用版",
    default_popup: "popup.html"
  }
  manifest.icons = {
    19: "images/icon.png",
    32: "images/icon32.png",
    38: "images/icon38.png",
    48: "images/icon48.png",
    128: "images/icon128.png"
  }
  manifest.content_scripts = [
    {
      all_frames: false,
      matches: ["http://*/*", "https://*/*"],
      js: ["js/jquery-3.5.1.min.js", "content_script.js"],
      exclude_matches: ["*://*.paymark.co.nz/*"]
    }
  ]
  manifest.options_ui = {
    page: "popup.html",
    open_in_tab: false
  }
  manifest.content_security_policy = {
    extension_pages: "script-src 'self'; object-src 'self'; connect-src 'self' data:"
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
}

for (const outDir of await findBuildDirs()) {
  await copyLegacyFiles(outDir)
  await patchManifest(outDir)
  console.log(`Prepared legacy UI and MV3 manifest in ${path.relative(root, outDir)}`)
}
