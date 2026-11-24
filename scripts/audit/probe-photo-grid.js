// Measures the gap between a restored photo grid and the tweet's action bar.
//
//   node scripts/audit/probe-photo-grid.js
//
// X reserves the carousel's height on an ancestor with a percentage
// padding-bottom (div.h-0), sized for the first photo, with the carousel
// absolutely positioned inside it. The restorePhotoGrid rules re-lay the slides
// as a grid, so unless that ancestor is corrected too the post keeps a hole
// above its action bar, or overflows into it. A grid whose gap matches the
// carousel's own is correct.
const fs = require('fs')
const path = require('path')

const {ROOT} = require('./lib/default-config')
const {launch, openX, waitForTimeline} = require('./lib/browser')
const {setConfig} = require('./lib/measure')

const OUT = path.join(ROOT, 'audit-results', 'photo-grid')

// Photos only, 2-4 of them, and not inside a quoted post - a quote's carousel
// sits above the outer post's action bar with the quote's own chrome between.
const MEASURE = () => {
  let photos = ($el) => [...$el.querySelectorAll('a[data-engagement-action="media"][href*="/photo/"]')]
  let carousels = [...document.querySelectorAll('article [class*="group/carousel"]')]
    .filter(($el) => {
      let count = new Set(photos($el).map(($a) => $a.getAttribute('href'))).size
      return count >= 2 && count <= 4 && !$el.querySelector('video') &&
             !$el.closest('[data-slot="embedded-tweet-frame"]')
    })

  return carousels.map(($carousel, i) => {
    let $tweet = $carousel.closest('article')
    let $group = $tweet?.querySelector('[role="group"]')
    let photoBottom = Math.max(...photos($carousel).map(($p) => $p.getBoundingClientRect().bottom))
    if ($tweet) $tweet.setAttribute('data-probe', String(i))
    return {
      i,
      slides: new Set(photos($carousel).map(($a) => $a.getAttribute('href'))).size,
      // What the user sees: dead space between the last photo and the buttons.
      gap: $group ? Math.round($group.getBoundingClientRect().top - photoBottom) : null,
      tweetHeight: $tweet ? Math.round($tweet.getBoundingClientRect().height) : null,
      // The timestamp is the permalink; the photo links go to /photo/N
      href: $tweet?.querySelector('a[data-base-ui-tooltip-trigger][href*="/status/"]')?.getAttribute('href') || null,
    }
  })
}

async function shoot(page, label) {
  for (let $tweet of await page.locator('[data-probe]').all()) {
    let i = await $tweet.getAttribute('data-probe')
    // A tweet scrolled well out of view is unmounted by the time we get here
    await $tweet.scrollIntoViewIfNeeded({timeout: 5_000}).catch(() => {})
    await $tweet.screenshot({path: path.join(OUT, `${label}-${i}.png`)}).catch(() => {})
  }
}

async function main() {
  fs.mkdirSync(OUT, {recursive: true})
  let {context} = await launch({headless: false})
  let page = context.pages()[0] || await context.newPage()
  await openX(page)
  await waitForTimeline(page)

  // Multi-photo posts are sparse, so scroll to collect one permalink per photo
  // count. Measuring them in the timeline is unreliable - X unmounts tweets
  // that scroll away, and a zero-height placeholder reads the same as a fix
  // that collapsed the tweet - so each is revisited on its own page.
  let byCount = new Map()
  for (let i = 0; i < 40 && byCount.size < 3; i++) {
    for (let r of await page.evaluate(MEASURE)) {
      if (r.href && r.tweetHeight > 0 && !byCount.has(r.slides)) byCount.set(r.slides, r.href)
    }
    await page.mouse.wheel(0, 900)
    await page.waitForTimeout(700)
  }
  console.log([...byCount].map(([n, href]) => `${n} photos: ${href}`).join('\n'))

  for (let [slides, href] of byCount) {
    await page.goto(`https://x.com${href}`, {waitUntil: 'domcontentloaded'})
    await waitForTimeline(page)
    for (let restorePhotoGrid of [false, true]) {
      await setConfig(page, {restorePhotoGrid})
      let [r] = await page.evaluate(MEASURE)
      let label = restorePhotoGrid ? 'grid' : 'carousel'
      console.log(`  ${slides} photos  ${label.padEnd(8)} gap ${r?.gap}  tweet ${r?.tweetHeight}`)
      await shoot(page, `${label}-${slides}`)
    }
  }

  console.log(`\nshots in ${path.relative(ROOT, OUT)}`)
  await context.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
