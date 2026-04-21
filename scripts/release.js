const fs = require('fs')
const {execSync, execFileSync} = require('child_process')

const semver = require('semver')

const manifestPaths = ['./manifest.mv2.json', './manifest.mv3.json', './Safari/Shared (Extension)/Resources/manifest.json']
const optionsJsPath = './options.js'
const optionsHtmlPath = './options.html'
const safariProjectPath = './Safari/Birdfeed.xcodeproj/project.pbxproj'

let releaseType = process.argv[2]

if (!releaseType) {
  console.log(`
Usage:
  npm run release (patch|minor|major)
`.trim())
  process.exit(1)
}

let currentVersion = JSON.parse(fs.readFileSync(manifestPaths[0], {encoding: 'utf8'})).version
let nextVersion = semver.inc(currentVersion, releaseType)

for (let manifestPath of manifestPaths) {
  fs.writeFileSync(
    manifestPath,
    fs.readFileSync(manifestPath, {encoding: 'utf8'})
      .replace(/"version": "[^"]+"/, `"version": "${nextVersion}"`),
    {encoding: 'utf8'}
  )
}

fs.writeFileSync(
  optionsJsPath,
  fs.readFileSync(optionsJsPath, {encoding: 'utf8'})
    .replace(/birdfeed-.+\.config\.txt/, `birdfeed-v${nextVersion}.config.txt`),
  {encoding: 'utf8'}
)

fs.writeFileSync(
  optionsHtmlPath,
  fs.readFileSync(optionsHtmlPath, {encoding: 'utf8'})
    .replace(/id="version">[^<]+</, `id="version">v${nextVersion}<`),
  {encoding: 'utf8'}
)

fs.writeFileSync(
  safariProjectPath,
  fs.readFileSync(safariProjectPath, {encoding: 'utf8'})
    .replace(/CURRENT_PROJECT_VERSION = (\d+)/g, (_, current) => `CURRENT_PROJECT_VERSION = ${Number(current) + 1}`)
    .replace(/MARKETING_VERSION = [^;]+/g, `MARKETING_VERSION = ${nextVersion}`),
  {encoding: 'utf8'}
)

console.log(`Bumped to v${nextVersion}`)

// execFileSync avoids a shell — paths with spaces or parens (e.g. the Safari
// "Shared (Extension)" directory) would otherwise break string interpolation.
execFileSync('git', [
  'add',
  ...manifestPaths,
  optionsJsPath,
  optionsHtmlPath,
  safariProjectPath,
], {stdio: 'inherit'})
execSync(`git commit -m "Release v${nextVersion}"`, {stdio: 'inherit'})
execSync(`git tag v${nextVersion}`, {stdio: 'inherit'})
execSync('git push', {stdio: 'inherit'})
execSync(`git push origin v${nextVersion}`, {stdio: 'inherit'})

console.log(`\nTagged and pushed v${nextVersion} — GitHub Actions will build the release.`)