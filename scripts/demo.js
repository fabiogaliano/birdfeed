// Opens a browser with the extension loaded so the options UI and the live
// effects can be inspected by hand. The audit harness measures; this just shows.
//
//   node scripts/demo.js            options page only (no X session needed)
//   node scripts/demo.js --x        also opens x.com/home for restorePhotoGrid
const path = require('path')

const {chromium} = require('playwright')

const ROOT = path.join(__dirname, '..')
// Overridable so a screenshot run can proceed while an interactive one holds
// the default profile - Chromium takes an exclusive lock on it.
const PROFILE_DIR = process.env.DEMO_PROFILE || path.join(ROOT, '.x-demo-profile')

const wantsX = process.argv.includes('--x')
const shotPath = process.argv.includes('--shot')
  ? process.argv[process.argv.indexOf('--shot') + 1]
  : null

async function main() {
  let context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: {width: 1600, height: 1000},
    args: [
      '--window-size=1600,1120',
      `--disable-extensions-except=${ROOT}`,
      `--load-extension=${ROOT}`,
    ],
  })

  // MV3 exposes the generated extension id only via its service worker.
  let [worker] = context.serviceWorkers()
  if (!worker) worker = await context.waitForEvent('serviceworker')
  let extensionId = new URL(worker.url()).host

  let page = context.pages()[0] || await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/options.html`)

  // A paused extension collapses the whole options body, which would read as
  // "the descriptions never shipped".
  let enabled = await page.evaluate(() => new Promise((resolve) => {
    chrome.storage.local.get('enabled', ({enabled}) => resolve(enabled))
  }))
  if (enabled === false) {
    await page.evaluate(() => new Promise((resolve) => {
      chrome.storage.local.set({enabled: true}, resolve)
    }))
    await page.reload()
    console.log('· extension was paused in this profile - enabled it so the options body renders')
  }

  // Markers are appended after examples/index.json resolves, so a bare count
  // here would race the fetch and report zero.
  await page.waitForSelector('.option-example', {timeout: 10_000}).catch(() => {})

  let counts = await page.evaluate(() => ({
    descriptions: document.querySelectorAll('p.option-info').length,
    examples: document.querySelectorAll('.option-example').length,
  }))

  console.log(`\noptions page  chrome-extension://${extensionId}/options.html`)
  console.log(`  ${counts.descriptions} descriptions, ${counts.examples} hover-(i) examples`)
  console.log('\n  Hover any (i) to get the OFF | ON pair.')
  console.log('  Tabs across the top: Timeline, Navigation, ... each one is described.')

  if (wantsX) {
    let {readAuth, authCookies} = require('./audit/lib/session')
    await context.addCookies(authCookies(readAuth()))
    let xPage = await context.newPage()
    await xPage.goto('https://x.com/home', {waitUntil: 'domcontentloaded'})
    console.log('\nx.com opened in tab 2.')
    console.log('  Find a post with 2-4 photos, then toggle "Show multiple photos as a grid"')
    console.log('  in the options tab - it re-lays out live, no reload.')
  }

  if (shotPath) {
    await page.screenshot({path: shotPath, fullPage: true})
    console.log(`\nwrote ${shotPath}`)
    await context.close()
    return
  }

  console.log('\nClose the browser window when done.\n')
  await new Promise((resolve) => context.on('close', resolve))
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
