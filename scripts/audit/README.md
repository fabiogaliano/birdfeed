# Settings audit

Probes every setting against live x.com to record what it actually does, and to
detect when X changes something that breaks it.

## Setup

Needs a logged-in session. X blocks the login flow from a fresh automated
profile, but not an existing session, so the cookies are seeded rather than
earned: copy `auth_token` and `ct0` from a browser already logged in, into
`.x-auth.json` (gitignored, chmod 600):

```json
{"auth_token": "...", "ct0": "..."}
```

## Commands

| Command | What it does |
|---|---|
| `node scripts/audit/record.js` | Full probe run |
| `node scripts/audit/record.js --skip-confirmed` | Only settings not yet proven |
| `node scripts/audit/record.js --only a,b` | Named settings |
| `node scripts/audit/icon-paths.js` | Checks the icon-path prefixes matched in JS |
| `node scripts/audit/report.js` | Builds `settings-map.md` / `.json` |
| `node scripts/audit/watch.js` | Drift check; exits non-zero on regression |

Results land in `audit-results/` (gitignored). `record.js` merges into the
existing `report.json` and archives a copy to `audit-results/history/`, so a
partial or interrupted run never destroys earlier findings.

## How it works

Each setting is toggled in isolation against an otherwise-inert config, and the
page is diffed against itself before and after.

- **Config channel.** Settings are pushed through `#cpftSettings`, the same DOM
  node `content.js` writes to, so the extension applies them exactly as it would
  a real settings change - and the user's stored config is never touched.
- **Element identity.** X's DOM has no stable ids and machine-generated class
  names, so nothing is matched by selector. The element references are parked on
  `window` and re-read after the toggle: same objects, no keys needed.
- **Axes.** `hidden`/`removed`, `shown`/`added`, and `restyled` (a computed-style
  signature, for settings like `replaceLogo` that only change appearance).
  `moved` is measured but excluded - reflow cascades are too noisy.
- **Noise floors.** Sampled per route by measuring a no-op change, then applied
  per axis. X only ever streams content *in*, so additions carry nearly all the
  noise while removals are near-silent; a shared threshold would let addition
  noise bury a clean removal signal.
- **Routing.** Where a setting can act is derived from the code - the function it
  is referenced in, and the selectors around the reference - never from previous
  results. A polluted or under-covered run produces false negatives, so its zeros
  can't be used to prune the next one.
- **Content surfaces.** A setting can only be measured where its subject is on
  screen, and this account's timeline shows whatever it shows. `lib/content.js`
  pins those settings to a search that reliably contains the subject - a photo
  post for `restorePhotoGrid`, a link post for `restoreLinkHeadlines`. Without
  one they measure zero for want of anything to act on.
- **Warm-up.** One throwaway cycle per route. `waitForQuiet` samples element
  *count*, but the extension hides with CSS, so on a freshly loaded timeline it
  returns while hundreds of tweets are still being hidden - and that lands in
  whatever measures next. It only affects the first cycle after a page load.
- **Mutation guard.** 30 destructive GraphQL operations are blocked by operation
  name, not HTTP method: X serves reads like `HomeLatestTimeline` over POST.

## Reading the results

A **positive is trustworthy**: the setting demonstrably changed the page. A
**negative is not**, on its own - it can equally mean the run lacked the content
(a Grok tweet, sensitive media), the UI state (a menu that wasn't open), or the
account features (X only shows Ads/Business nav to accounts that have them).
`settings-map.md` splits the negatives three ways: **observed below the noise
floor** (moved something, just not enough - a setting whose whole effect is one
element can never clear a floor of 3), **probed and moved nothing at all**, and
**no routing evidence** - nothing for this method to look for.

One caution learned the hard way: a negative can also mean the *harness* was
wrong. Baseline writes were being dropped in full for a long time (see the
codebase map), which made every setting that defaults to `true` read as dead.
Before believing a zero, check the setting by hand on the surface its
description names - the probe is a way to notice change at scale, not an oracle.
