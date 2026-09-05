import { cp, mkdir, readFile, writeFile } from "node:fs/promises"
import { build } from "esbuild"
import path from "node:path"
import { fileURLToPath } from "node:url"

export const pages = ["popup", "info_au", "info_nz", "link_au", "link_nz"]
export async function prepare(mode = "prod") {
  if (!["prod", "dev"].includes(mode)) throw new Error("Unsupported build mode")
  const outdir = path.resolve(`build/chrome-mv3-${mode}`)
  const manifestPath = path.join(outdir, "manifest.json")
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"))
  const pkg = JSON.parse(await readFile("package.json", "utf8"))
  await mkdir(path.join(outdir, "js"), { recursive: true })
  for (const entry of ["assets", "css", "images", ...pages.map(page => `${page}.html`)]) {
    await cp(entry, path.join(outdir, entry), { recursive: true, filter: source => !/(?:\.map$|\/scss(?:\/|$)|\/core\/jquery\.min\.js$)/.test(source) })
  }
  await cp("js/jquery-3.5.1.min.js", path.join(outdir, "js/jquery-3.5.1.min.js"))
  await build({
    entryPoints: {
      content_script: "src/content/index.ts", "js/popup": "src/ui/popup.ts",
      "js/info_au": "src/ui/profile.ts", "js/info_nz": "src/ui/profile.ts",
      "js/link_au": "src/ui/links.ts", "js/link_nz": "src/ui/links.ts"
    }, outdir, bundle: true, format: "iife", platform: "browser", target: "chrome120", minify: mode === "prod", sourcemap: mode === "dev"
  })
  manifest.version = pkg.version
  manifest.minimum_chrome_version = "120"
  manifest.action = { default_icon: "images/icon.png", default_title: "大X插件多用版", default_popup: "popup.html" }
  manifest.icons = Object.fromEntries([32, 38, 48, 128].map(size => [size, `images/icon${size}.png`]))
  manifest.content_scripts = [{ all_frames: false, matches: pkg.manifest.host_permissions, js: ["content_script.js"], css: ["css/notification.css"], run_at: "document_idle" }]
  manifest.options_ui = { page: "popup.html", open_in_tab: false }
  manifest.content_security_policy = mode === "prod" ? pkg.manifest.content_security_policy : {
    extension_pages: "script-src 'self'; object-src 'self'; connect-src 'self' data: http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:*"
  }
  const output = `${JSON.stringify(manifest, null, 2)}\n`
  if (await readFile(manifestPath, "utf8") !== output) await writeFile(manifestPath, output)
  console.log(`Prepared TypeScript pages and MV3 manifest: ${outdir}`)
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await prepare(process.argv[2] ?? "prod")
