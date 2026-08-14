// Checks what happens to settings that were removed from Birdfeed but are
// still sitting in a user's storage, or in an export they took before the
// upgrade.
//
//   node scripts/audit/probe-retired-keys.js
//
// Seeds storage the way a pre-4.24.0 user's would look, then drives the real
// options page: the prune, the export, and every import outcome.
const fs = require('fs')
const os = require('os')
const path = require('path')

const {chromium} = require('playwright')

const {ROOT} = require('./lib/default-config')

const RETIRED = {
  redirectToTwitter: true,
  redirectChatNav: true,
  redirectTwitterLinks: 'nitter.net',
  tweakNewLayout: true,
  hideToggleNavigation: true,
}

const LIVE = {hideViews: true, navDensity: 'compact', twitterBlueChecks: 'hide'}

async function openOptions(context) {
  let [worker] = context.serviceWorkers()
  if (!worker) worker = await context.waitForEvent('serviceworker')
  let page = context.pages()[0] || await context.newPage()
  await page.goto(`chrome-extension://${new URL(worker.url()).host}/options.html`)
  await page.waitForSelector('#importStatus, form')
  return page
}

const readStorage = () => new Promise((resolve) => chrome.storage.local.get(resolve))

async function main() {
  let profile = fs.mkdtempSync(path.join(os.tmpdir(), 'birdfeed-retired-'))
  let context = await chromium.launchPersistentContext(profile, {
    headless: false,
    viewport: {width: 1200, height: 900},
    args: [`--disable-extensions-except=${ROOT}`, `--load-extension=${ROOT}`],
  })

  let errors = []
  let page = await openOptions(context)
  page.on('pageerror', (e) => errors.push(String(e)))

  // A user who set these before they were removed.
  await page.evaluate((seed) => new Promise((r) => chrome.storage.local.set(seed, r)),
    {...RETIRED, ...LIVE})

  let before = await page.evaluate(readStorage)
  await page.reload()
  await page.waitForTimeout(600)
  let after = await page.evaluate(readStorage)

  console.log('seeded retired keys  ', Object.keys(RETIRED).filter((k) => k in before).length)
  console.log('left after reload    ', Object.keys(RETIRED).filter((k) => k in after).length, '(want 0)')
  console.log('live settings kept   ', Object.entries(LIVE).every(([k, v]) => after[k] === v), '(want true)')

  // Everything below drives the real import path through the file input.
  let importFile = async (contents) => {
    await page.setInputFiles('#import-file', {
      name: 'settings.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(contents)),
    })
    await page.waitForTimeout(400)
    return page.evaluate(() => {
      let $s = document.getElementById('importStatus')
      return {text: $s?.textContent, error: $s?.classList.contains('is-error')}
    })
  }

  console.log('\nimport outcomes:')
  for (let [label, payload] of [
    ['old export, retired only', RETIRED],
    ['old export, mixed', {...RETIRED, hideViews: false}],
    ['retired + junk', {...RETIRED, notASetting: 1}],
    ['junk only', {notASetting: 1, alsoNot: 'x'}],
    ['current export', {...LIVE, hideViews: false, version: 'desktop'}],
  ]) {
    let {text, error} = await importFile(payload)
    console.log(`  ${label.padEnd(26)} ${error ? 'ERR ' : 'ok  '} ${text}`)
  }

  console.log('\npage errors:', errors.length ? errors : 'none')
  await context.close()
  fs.rmSync(profile, {recursive: true, force: true})
}

main().catch((e) => { console.error(e); process.exit(1) })
