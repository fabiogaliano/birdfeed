# Selector breakage on live x.com

From `node scripts/audit/selectors.js` — 120 hooks counted against the live DOM
across 8 surfaces plus the More and caret menus. Raw data in
`audit-results/selectors.json`.

## Fixed

**Home icon swap in `replaceLogo`.** `X_HOME_ACTIVE_PATH` and
`X_HOME_INACTIVE_PATH` matched nothing: X redrew the house icon, so the CSS
`svg path[d="..."] { d: path(...) }` override never applied. The logo itself kept
working (`X_LOGO_PATH` still matches), which is why it looked like the setting
was fine — the bird appeared but the home icon stayed X's.

Both constants updated to the current geometry and verified: the rendered `d` is
now Twitter's path in both active and inactive states.

## Still broken

| Constant | Breaks | Notes |
|---|---|---|
| `PROMOTED_PATH` | ad detection via icon | `PROMOTED_TWEET_CONTAINER` (`[data-testid="placementTracking"]`) still matches 30, so ad hiding likely still works through that path — verify before changing |
| `SORT_REPLIES_PATH` | sort-replies button lookup | `hideSortRepliesMenu` still measured as working (impact 8), so the CSS route survives; only the icon lookup is dead |
| `X_DARUMA_LOGO_PATH` | seasonal logo swap | X only ships this occasionally; dead is expected most of the year |

## Not breakage — do not "fix"

These match nothing by design and will always show as dead in the inventory:

- `TWITTER_LOGO_PATH`, `TWITTER_HOME_ACTIVE_PATH`, `TWITTER_HOME_INACTIVE_PATH`,
  `TWITTER_FEATHER_PLUS_PATH`, `BLUE_LOGO_PATH` — paths the extension *injects*,
  so they only appear once the relevant setting is on.
- `MESSAGES_ACTIVE_PATH`, `MESSAGES_INACTIVE_PATH` — same: these are Twitter's
  envelope, the *replacement* written by `d: path(...)` (script.js:5638) and by
  `tweakMessagesIcon` (script.js:7663). This table previously listed them as
  broken, which was a misreading — the constant that has to match live X is
  `X_CHAT_*`, and it does.
- `MOBILE_TIMELINE_HEADER`, `PRIMARY_NAV_MOBILE`, `DISPLAY_DONE_BUTTON_DESKTOP` —
  the inventory runs at desktop width.
- `MORE_DIALOG` — only exists while a modal is open.

## Why SVG paths are the weak point

Eleven selectors match on exact icon geometry. They fail silently: no error, no
console warning, the feature just stops. Nothing else in the codebase degrades
this quietly, and `replaceLogo` proves the failure can be partial — half the
setting working is harder to notice than none of it.

`data-testid` hooks are the sturdiest (X uses them for its own tests), structural
selectors like
`TIMELINE: div[data-testid="primaryColumn"] section > h1 + div[aria-label] > div`
sit in between — four levels of positional coupling.

Worth re-running `selectors.js` after any X redesign: it takes ~3 minutes and
needs no config toggling, unlike the full probe run.
