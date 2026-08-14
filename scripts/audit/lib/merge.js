/**
 * Merging probe results, at the granularity of one setting on one route.
 *
 * Route-level replacement is not safe: a `--only` run covers a handful of
 * settings but touches whole routes, so replacing the route drops every other
 * setting's result on it.
 *
 * Precedence follows the asymmetry the whole audit rests on - a positive is
 * evidence, a zero is only ever the absence of evidence. Missing content, a menu
 * that didn't open and a polluted baseline all produce false negatives and never
 * false positives, so a past positive outranks a later zero.
 */

function better(a, b) {
  if (!a) return b
  if (!b) return a
  if (a.acted != b.acted) return a.acted ? a : b
  if (a.acted && b.acted) return (b.impact || 0) > (a.impact || 0) ? b : a
  return b
}

function mergeResults(prior = [], next = []) {
  let byKey = new Map()
  for (let r of prior) byKey.set(r.key, r)
  for (let r of next) byKey.set(r.key, better(byKey.get(r.key), r))
  return [...byKey.values()]
}

// Folds a route's new data into whatever is already recorded for it, keeping the
// route's own metadata (noise, thresholds) from whichever run actually probed.
function mergeRoute(prior, next) {
  if (!prior) return next
  if (!next?.results?.length) {
    return prior.results?.length ? {...prior, lastError: next?.error} : next || prior
  }
  return {...prior, ...next, results: mergeResults(prior.results, next.results)}
}

function mergeReports(reports) {
  let out = {routes: {}}
  for (let report of reports) {
    for (let [routeKey, group] of Object.entries(report.routes || report.surfaces || {})) {
      out.routes[routeKey] = mergeRoute(out.routes[routeKey], group)
    }
  }
  return out
}

module.exports = {mergeResults, mergeRoute, mergeReports}
