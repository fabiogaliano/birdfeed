/**
 * Contact sheet for the captured before/after pairs.
 *
 * These screenshots contain real timeline content and DM UI, so this is a local
 * viewer only - the images are not shippable inside the extension.
 *
 * Run: node scripts/audit/sheet.js && open audit-results/sheet.html
 */
const fs = require('fs')
const path = require('path')
const {ROOT} = require('./lib/default-config')

const OUT = path.join(ROOT, 'audit-results', 'sheet.html')
const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit-results', 'settings-map.json'), 'utf8'))

let cards = map.confirmed.filter(c => c.shots).map(c => `
  <section>
    <h2>${c.key}</h2>
    <p>${c.effect} &middot; ${c.where.join(', ')}${c.touches.length ? ` &middot; <em>${c.touches.slice(0, 3).join(', ').replace(/</g, '&lt;')}</em>` : ''}</p>
    <div class="pair">
      <figure><figcaption>before (off)</figcaption><img loading="lazy" src="${c.shots.before}"></figure>
      <figure><figcaption>after (on)</figcaption><img loading="lazy" src="${c.shots.after}"></figure>
    </div>
  </section>`).join('\n')

fs.writeFileSync(OUT, `<!doctype html>
<meta charset="utf-8">
<title>Birdfeed settings evidence</title>
<style>
  body { font: 14px/1.5 system-ui, sans-serif; margin: 0 auto; padding: 24px; max-width: 1200px; background: #fafafa; }
  h1 { margin-bottom: 4px; }
  section { background: #fff; border: 1px solid #e3e3e3; border-radius: 10px; padding: 16px; margin-bottom: 20px; }
  h2 { font-family: ui-monospace, monospace; font-size: 15px; margin: 0 0 4px; }
  p { margin: 0 0 12px; color: #555; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  figure { margin: 0; }
  figcaption { font-size: 12px; color: #777; margin-bottom: 6px; }
  img { max-width: 100%; border: 1px solid #ddd; border-radius: 6px; display: block; }
</style>
<h1>Settings evidence</h1>
<p>${map.confirmed.filter(c => c.shots).length} settings with before/after pairs, captured live from x.com.
Local only &mdash; these contain real timeline and DM content.</p>
${cards}
`)
console.log(`${map.confirmed.filter(c => c.shots).length} settings -> audit-results/sheet.html`)
