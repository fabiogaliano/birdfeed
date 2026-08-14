# Codebase map

Orientation for arriving cold and changing something confidently.

## Architecture

`content.js` is the only part with `chrome.*` access. It reads stored config,
writes it into a `<script type="text/json" id="cpftSettings">` node, then injects
`script.js` into the **page's main world** via `<script src>`.

`script.js` therefore has **zero extension APIs**. It can touch X's own
JavaScript (that is the point - it patches `History.push`, reads React props),
but it can only learn about config through that DOM node.

```
chrome.storage ──> content.js ──> #cpftSettings ──> MutationObserver ──> config
      ^                                                                    |
      └────────── window.postMessage('cpftConfigChange') ───────────────────┘
```

The loop back exists so the injected script can persist things it discovers
(`version`, `sortFollowing`). It matters when testing: writing config into
`#cpftSettings` applies changes live **without** touching stored settings, which
is what the audit harness relies on.

### Three traps in that channel

1. **A write containing `debug` returns early** and drops every other key
   (`configChanged`). Write `debug` on its own.
2. **`enabled: false` then `true` re-runs `main()`**, which re-applies the
   *stored* config over anything written since. Do not use an enabled-cycle to
   reset state - it restores defaults rather than clearing them.
3. **Navigating discards everything written into the node.** `content.js` runs
   again on load and re-injects the stored config, so a write made before a
   `goto` is silently gone afterwards. Always write *after* the navigation.
   This one fails quietly: the page looks right, the setting just isn't on.

## Where things live in script.js (~8360 lines)

| Region | What |
|---|---|
| ~120 | `const config` - defaults for all 110 keys |
| ~2335 | `Selectors` - named DOM hooks |
| ~2370 | `Svgs` - icon path constants, both X's and the replacements |
| ~2674 | `addStyle()` |
| 4252-5337 | `configureCss()` - the big `if (config.X)` chain |
| 5338 | `configureFont()` |
| 5367 | `configureHideMetricsCss()` |
| ~5560 | `configureDynamicCss()` - needs values read from the page (`replaceLogo` lives here) |
| 6208 | `onTimelineChange()` - per-tweet processing for any timeline |
| 6416 | `onIndividualTweetTimelineChange()` - the focused-tweet page |
| 6852 | `processCurrentPage()` - sets `body` classes, re-runs page observers |
| 7000-7600 | `tweak*Page()` / `restore*()` - per-surface behaviour |
| 8130 | `main()` |
| 8242 | `configChanged()` |

Two styling strategies, and which one a setting uses decides how you fix it:

- **CSS** (`configureCss`) - reapplies instantly on config change. Most settings.
- **Observer** (`onTimelineChange` etc.) - runs as tweets appear. Config changes
  re-run `processCurrentPage()`, which reconnects the observers, so these do
  re-apply live; there is no processed-marker on tweets.

## Adding a setting

Five files, all required:

1. `script.js` - add the default to `config`, then the behaviour in
   `configureCss` (CSS) or an observer (per-tweet)
2. `types.d.ts` - add the key to the `Config` type
3. `options.html` - `<span id="fooLabel">` + `<input name="foo">` inside the
   right `<section class="group labelled">`
4. `options.js` - add `'fooLabel'` to the i18n list **and** the default to
   `optionsConfig`
5. `_locales/en/messages.json` - add `fooLabel`

Miss #4 or #5 and the control renders blank rather than erroring.

## Icon replacement is the fragile part

Eleven selectors match on exact SVG geometry (`svg path[d="M21.591 7.146…"]`).
They break silently whenever X redraws an icon: no error, the feature just
stops, and it can break *partially* - `replaceLogo` swapped the logo while
leaving X's home icon, which is harder to notice than a total failure.

Chromium uses a CSS override (`d: path(...)`); Safari cannot do that, so
`tweakHomeIcon`/`tweakMessagesIcon` patch the attribute directly. **A new icon
swap needs both paths wired**, which is exactly what the chat icon was missing.

Run `node scripts/audit/selectors.js` after any X redesign - ~3 minutes, no
config toggling, tells you which hooks stopped matching.

There is a second, less obvious set: six places classify an item by reading an
icon's `d` attribute and matching a hard-coded **prefix** in JavaScript, not CSS.

| What it decides | Setting it drives | Where |
|---|---|---|
| `COMMUNITY_TWEET` / `PINNED_TWEET` | timeline item type | script.js:5810-5811 |
| `AD` / `LIKE` / `FOLLOW` / `RETWEET` | `hideNotificationLikes`, `hideNotificationRetweets` | script.js:6392-6403 |

`selectors.js` cannot see these - they are string comparisons, not selectors.
`node scripts/audit/icon-paths.js` collects every icon path X actually renders
and reports which prefixes still match one.

Careful reading the output: paths the extension *injects* (`TWITTER_LOGO_PATH`,
`MESSAGES_ACTIVE_PATH`, `BLUE_LOGO_PATH`) correctly match nothing when their
setting is off. Only the paths it *reads* from X's DOM are real breakage.

## Audit tooling

| Command | Time | Use |
|---|---|---|
| `node scripts/audit/selectors.js` | ~3 min | Which hooks are dead. First thing after an X redesign. |
| `node scripts/audit/icon-paths.js` | ~2 min | The six icon-path prefixes matched in JS, which `selectors.js` can't see. |
| `node scripts/audit/verify.js` | ~3 min | Per-setting: are *its* selectors live? |
| `node scripts/audit/record.js --skip-confirmed` | ~20 min | Full probe: what each setting measurably does |
| `node scripts/audit/shots.js` | ~10 min | Rebuild anonymised before/after pairs |
| `node scripts/audit/watch.js` | ~5 min | Regression check, non-zero exit on drift |
| `node scripts/audit/sheet.js` | instant | Contact sheet of the pairs |

Needs `.x-auth.json` with `auth_token` + `ct0` (gitignored). Results in
`audit-results/`, merged across runs and archived to `audit-results/history/`.

**A positive is trustworthy; a negative is not.** A setting measuring as dead
may simply have lacked the content, the UI state, or the account features. That
asymmetry is why routing is derived from the code and never from past results.

### The trap that invalidated every earlier run

Trap #1 above is not just a footgun for humans - the harness walked into it.
`inertBaseline()` sets every boolean to `false`, and that included **`debug`**.
A write containing `debug` is dropped *whole*: the observer short-circuits and
returns before it merges anything or calls `configChanged`.

So the baseline write did nothing at all. Every probe measured starting from the
**stored config**, not the baseline - and any setting already `true` there was
written `true` over `true`, moved nothing, and was recorded as doing nothing.

It is invisible from the outside, because settings that default to `false` are
unaffected and keep producing correct positives. The tell is in the ratio: 19 of
20 confirmed settings defaulted to `false`, against 6 of 8 unexplained zeros
defaulting to `true`.

Traced end to end on `restorePhotoGrid`: immediately after a reset to a baseline
holding `restorePhotoGrid: false`, the photo grids still read `display: grid`.

If you add anything to the baseline, check it survives a round trip through the
config channel rather than assuming the write landed.

### The one measurement trap worth knowing

`waitForQuiet` samples **element count**, but the extension hides things with
CSS - which doesn't change the count. So on a freshly loaded timeline it returns
while the extension is still hiding tweets, and the remainder lands in whatever
measures next.

Measured on `/home`: the first reset after a page load reads `hidden=578
shown=147`, every reset after it reads `0`, and content-light `/messages` reads
`0` throughout. Since the noise sample takes the max across its samples, one
dirty first read raised the floor for every probe on the route above any real
signal - a whole run came back `0 acted`, including settings verified by hand.

`warmUp()` burns one throwaway cycle per route to absorb it. If you add a code
path that reloads a page mid-route, warm up again after it.
