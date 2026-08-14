/**
 * Consolidates the accumulated probe results into a per-setting map: what each
 * setting demonstrably does, where it does it, and the before/after pair that
 * shows it.
 *
 * Reads the cumulative report, so it reflects every run rather than the last.
 *
 * Run: node scripts/audit/report.js
 */
const fs = require('fs')
const path = require('path')

const {ROOT} = require('./lib/default-config')
const {buildProbes} = require('./lib/probes')
const {deriveTargets, routeFor} = require('./lib/routing')

const OUT_DIR = path.join(ROOT, 'audit-results')
const REPORT_JSON = path.join(OUT_DIR, 'report.json')
const MAP_JSON = path.join(OUT_DIR, 'settings-map.json')
const MAP_MD = path.join(OUT_DIR, 'settings-map.md')

// The `tag :: text` half of a sample is the only human-readable part; the rest
// is X's markup soup. Deduped, these read as a description of what the setting
// touched - "Communities", "Views", "Grok".
function labels(samples) {
  let out = new Set()
  for (let list of Object.values(samples || {})) {
    for (let s of list || []) {
      let text = s.split(' :: ')[1]
      if (text && text.length > 1 && !/^\d+$/.test(text)) out.add(text.trim())
    }
  }
  return [...out].slice(0, 6)
}

function axes(r) {
  return [
    r.hidden && `hides ${r.hidden}`,
    r.removed && `removes ${r.removed}`,
    r.shown && `shows ${r.shown}`,
    r.added && `adds ${r.added}`,
    r.restyled && `restyles ${r.restyled}`,
  ].filter(Boolean).join(', ')
}

function build() {
  let report = JSON.parse(fs.readFileSync(REPORT_JSON, 'utf8'))
  let routes = report.routes || report.surfaces || {}
  let targets = deriveTargets()

  let byKey = new Map()
  for (let [routeKey, group] of Object.entries(routes)) {
    for (let r of group.results || []) {
      if (!byKey.has(r.key)) byKey.set(r.key, [])
      byKey.get(r.key).push({...r, routeKey, shotDir: routeKey.replace(/\//g, '_')})
    }
  }

  let confirmed = [], unconfirmed = []

  for (let probe of buildProbes()) {
    let results = byKey.get(probe.key) || []
    let acted = results.filter(r => r.acted).sort((a, b) => b.impact - a.impact)
    let expected = routeFor(probe.key, targets).map(r => `${r.surface}/${r.state}/${r.theme}`)

    if (acted.length) {
      let best = acted[0]
      confirmed.push({
        key: probe.key,
        from: probe.from, to: probe.to,
        where: acted.map(r => r.routeKey),
        effect: axes(best),
        impact: best.impact,
        touches: labels(best.samples),
        shots: best.shots && {
          before: path.join('shots', best.shotDir, best.shots.before),
          after: path.join('shots', best.shotDir, best.shots.after),
        },
      })
    } else {
      // A setting that moved *something* is a different finding from one that
      // moved nothing at all, even though neither cleared the floor. Settings
      // whose whole effect is one element - a source label, a profile post
      // count - top out at an impact of 1 or 2 and can never clear a floor of
      // 3, so lumping them in with the flat zeros hides them permanently.
      // Reported separately rather than by lowering the floor, which would cost
      // the guarantee that a positive means something.
      let best = results.filter(r => r.impact > 0).sort((a, b) => b.impact - a.impact)[0]
      unconfirmed.push({
        key: probe.key,
        probedAt: [...new Set(results.map(r => r.routeKey))],
        expected,
        hasRoutingEvidence: (targets.get(probe.key) || []).length > 0,
        subThreshold: best ? {impact: best.impact, routeKey: best.routeKey} : null,
      })
    }
  }

  confirmed.sort((a, b) => b.impact - a.impact)
  unconfirmed.sort((a, b) => a.key.localeCompare(b.key))
  return {confirmed, unconfirmed}
}

function markdown({confirmed, unconfirmed}) {
  let lines = [
    '# Settings map',
    '',
    `Generated ${new Date().toISOString().slice(0, 10)} from live probes against x.com.`,
    '',
    `## Confirmed (${confirmed.length})`,
    '',
    'Each of these was proven to change the page by toggling it in isolation',
    'against an otherwise-inert config.',
    '',
    '| Setting | Effect | Touches | Where | Evidence |',
    '|---|---|---|---|---|',
  ]

  for (let c of confirmed) {
    let shot = c.shots ? `[before](${c.shots.before}) / [after](${c.shots.after})` : '-'
    lines.push(`| \`${c.key}\` | ${c.effect} | ${c.touches.join(', ') || '-'} | ` +
               `${c.where.join('<br>')} | ${shot} |`)
  }

  let noEvidence = unconfirmed.filter(u => !u.hasRoutingEvidence)
  let weak = unconfirmed.filter(u => u.hasRoutingEvidence && u.subThreshold)
  let withEvidence = unconfirmed.filter(u => u.hasRoutingEvidence && !u.subThreshold)

  if (weak.length) {
    lines.push('', `## Observed, below the noise floor (${weak.length})`, '',
      'These moved something, just not enough to clear the floor. A setting whose',
      'entire effect is one element tops out at an impact of 1 or 2 and can never',
      'clear it, so treat these as probably working and check by hand rather than',
      'as broken.', '',
      '| Setting | Impact | Seen at |', '|---|---|---|')
    for (let u of weak) {
      lines.push(`| \`${u.key}\` | ${u.subThreshold.impact} | ${u.subThreshold.routeKey} |`)
    }
  }

  lines.push('', `## Probed, no measurable effect (${withEvidence.length})`, '',
    'These have selectors or observer code pointing at a surface, were probed there,',
    'and changed nothing at all. Either they need content/state the run did not have,',
    'or X has broken them.', '',
    '| Setting | Probed at |', '|---|---|')
  for (let u of withEvidence) lines.push(`| \`${u.key}\` | ${u.probedAt.join(', ') || '-'} |`)

  lines.push('', `## No routing evidence (${noEvidence.length})`, '',
    'No CSS branch or surface-specific observer this method can locate - mostly',
    'behavioural settings (redirects, autoplay, sort order) that change no markup.',
    'These need behavioural tests, not visual diffing.', '',
    ...noEvidence.map(u => `- \`${u.key}\``))

  return lines.join('\n')
}

let map = build()
fs.writeFileSync(MAP_JSON, JSON.stringify(map, null, 2))
fs.writeFileSync(MAP_MD, markdown(map))

console.log(`confirmed:    ${map.confirmed.length}`)
console.log(`probed, dead: ${map.unconfirmed.filter(u => u.hasRoutingEvidence).length}`)
console.log(`no evidence:  ${map.unconfirmed.filter(u => !u.hasRoutingEvidence).length}`)
console.log(`\n  ${path.relative(ROOT, MAP_MD)}`)
