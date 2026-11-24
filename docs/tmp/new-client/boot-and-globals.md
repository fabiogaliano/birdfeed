# New X web client: boot and globals

Probed 2026-11-24 in agent Helium (no extension installed), logged in, app version `85bccbebc7d381b85a0568ea1b4d9493ef135745` (`html[data-app-version]`). Every snippet below was checked with `eval` on live x.com unless it is marked *bundle*, which means it was read from the downloaded JS/CSS bundles instead.

## TL;DR

- **This is a full rewrite.** The new client is **TanStack Start + TanStack Router**, **React 19** (it hydrates the whole `document`), **Relay** for GraphQL, TanStack Query, **Tailwind v4** and **Base UI** (`data-slot="xds-*"`), all bundled by Vite and loaded from `abs.twimg.com/x-web/x-web/…`. `#react-root`, `#layers`, `style#react-native-stylesheet`, the Redux store, body background classes and almost every `data-testid` are gone.
- **Birdfeed's boot hangs forever** on `getElement('#layers + div')` (`script.js:8300`), so nothing after it ever runs.
- **The old client can't be reached.** `twitter.com/*` and `mobile.x.com/*` redirect to x.com and serve the new client. I found no opt-out param, cookie or flag in the bundles.
- **The extension can do things it couldn't before:**
  - A `window.fetch` wrapper installed after boot still sees `HomeTimeline` and the other GraphQL requests. That allows filtering ads at the data level by `entry_id` starting with `promoted-tweet-`.
  - React fibers carry `promotion` and `tweet` props on every `<article>`, and the Relay store resolves `tweet.__id` to the full post record.

## Old mechanism → new mechanism

| Old (script.js) | New equivalent | Confidence |
|---|---|---|
| `getElement('#layers + div')` gates `main()` | Gone. Gate on `document.querySelector('body > div.mx-auto')` (the app shell), or `main` / `nav[aria-label="Primary"]` | high |
| `#react-root` / `getTopLevelProps()` (`__reactProps` of `#react-root > div`) | Fibers hang off `document[__reactContainer$…]` (whole-document root). Walk `fiber.child`/`.sibling` and pick props by key: `router`, `client` (QueryClient), `environment` (Relay), `accountContext`, `features` (see snippet) | high |
| `props.store.getState()` (Redux: `entities`, `session`, `settings.local`, `badgeCount`, `featureSwitch`) | No Redux. Data is in the **Relay store** (`environment.getStore().getSource()`) and the **TanStack QueryClient**. Viewer: `window.__INITIAL_DATA__.viewerId` / `.viewerScreenName`, or `accountContext.loggedInUserId` | high |
| `getUserScreenName()` | `window.__INITIAL_DATA__.viewerScreenName` | high |
| `getNotificationCount()` (`state.badgeCount`) | No store field found. The app fetches `api.x.com/2/badge_count/badge_count.json` and `fetchNotificationBadgeCountsQuery`; read the badge DOM or intercept the fetch | medium |
| `getThemeColorFromState()` (`settings.local.themeColor`, `highContrastEnabled`) | Accent: `html[data-accent]` (`yellow500`/`magenta500`/`purple500`/`orange500`/`green500`; absent means `blue500`), stored in `localStorage['xweb.display'] = {"color": …}`. High contrast: `html[data-high-contrast="true"]`, `localStorage['settings.accessibility'] = {highContrastEnabled, reducedMotionEnabled}` | high |
| `observeBodyBackgroundColor()` → `body.Default`/`.LightsOut` (and Dim) | `html[data-theme]` is `light` or `dark`. **Dim no longer exists**: cookie `night_mode` `0`→light, `1`/`2`→dark, unset→system. Changes fire `window` event `x-theme-change`; observe the `data-theme` attribute on `<html>` | high |
| `checkReactNativeStylesheet()` (find Chirp `fontFamily` rule and `blur(30px)` rule) | Gone. Font is a CSS variable `--x-font-sans: TwitterChirp, -apple-system, …`; override it on `:root`. Blur: Tailwind `backdrop-blur-*` / `blur-*` utility classes | high |
| `fontSize` from `html.style.fontSize` | `<html>` is always 16px. Text scale is `--x-font-scale` (default `1`; all `--text-*` tokens use `calc(N / var(--x-root-font-size,16) * 1rem * var(--x-font-scale,1))`). I found no font-size user setting in the bundles | high (var) / medium (no setting) |
| `observeTitle()` | `<title>` still exists. Format `"<Page> / X"`, e.g. `Home / X`, `Explore / X`, `f. (@fabgaliano) / X`, `hello - Search / X`, post: `Name on X: "…" / X`. I didn't verify whether a notification count prefix still exists | high (format) |
| `observeFavicon()` | `link[rel="icon"]` = `https://abs.twimg.com/favicons/twitter.3.ico`; the bundle builds `twitter[-pip].3.ico` (`-pip` = unread dot) (*bundle*) | high |
| `observeThemeMeta()` | Two `meta[name="theme-color"]`, set to `#000000`/`#FFFFFF` by an inline script on theme change | high |
| `patchHistory()` (`props.history.push`) | TanStack Router: `router.history.push/replace(path, state, opts)` and `router.navigate({to|href})`. The browser history is wrapped too. For redirects, prefer `router.subscribe('onBeforeNavigate')` and a `router.navigate` replace, or patch `router.history.push` | high |
| page change detection via `<title>` observer | `router.subscribe('onResolved' \| 'onRendered' \| 'onBeforeNavigate', e => e.toLocation.pathname)`. Fired reliably in testing. `router.state.matches.map(m => m.routeId)` gives the route ID | high |
| `observeReRenderBoundary()` (`#react-root > div > div`) | Gone. Use router `onRendered` and/or a MutationObserver on `body > div.mx-auto` | medium |
| `configureFeatureFlags()` (`contextProviderProps.featureSwitches.isTrue`) | See "Feature switches" below. The provider has `features`, `overrides`, `setOverride`; route context `featureSwitches` is a class instance with `isTrue(key)` / `getNumberValue(key, default)` | medium (patching untested) |
| mobile/desktop via app wrapper `flexDirection` | Breakpoints are below: **mobile = viewport < 512px** (bottom tab bar). Use `matchMedia('(width < 512px)')` | high |
| `hasNewLayout()` (`rweb_sourcemap_migration`) | Gone. Everything is the "new layout" | high |
| API base `/i/api/graphql/...` on x.com (`getAccountLocation`) | The app calls **`https://api.x.com/graphql/<id>/<Op>`** and `api.x.com/1.1/...`. The bundle still recognises `/i/api/graphql` as GraphQL (*bundle*); I didn't test whether the old path still answers. The bearer token is unchanged (*bundle*); the app also adds `x-client-transaction-id` | medium |
| body classes set by script (`HomeTimeline` etc.) | The new app never touches body classes, so Birdfeed can keep using its own | n/a |
| `cpftLoading` logo-swap stylesheet in content.js | Still injected (harmless). Logo SVG path not checked here | n/a |

## Framework and access

- **Script tags.** `script[src*="x-web/x-web/entry-client-"]`. Module Federation runtime named `x_web`.
- **Globals.**
  - `window.__INITIAL_DATA__` = `{appMetadata:{appEnvironment, appVersion, country, isLiteHost, isTwoffice, workloadVersion,…}, featureSwitchPayload:{features, impressions, impressionPointers, settingsVersion}, viewerId, viewerScreenName, viewerFollowingCount, viewerClaimEntries, xchatEmbedManifestUrl}`.
  - `window.$_TSR` is the TanStack Start SSR bootstrap; it's gone after hydration, so don't rely on it.
  - `__xClientTextFormatters`, Sentry globals.
- **React root.** It is the document itself:

```js
function getAppProps() {
  let ck = Object.keys(document).find(k => k.startsWith('__reactContainer'))
  let found = {}
  ;(function walk(f, d) {
    if (!f || d > 80) return
    let p = f.memoizedProps
    if (p && typeof p == 'object') {
      for (let k of ['router', 'client', 'environment', 'accountContext', 'features']) {
        if (k in p && !found[k]) found[k] = p[k]
      }
    }
    walk(f.child, d + 1); walk(f.sibling, d)
  })(document[ck], 0)
  return found  // router: TanStack Router, client: QueryClient, environment: Relay Environment
}
```

  Fiber depths seen: `router` ≈3, `client` ≈9, `environment` ≈11, `accountContext` ≈13, feature-switch provider ≈48. The walk is cheap (<100 fibers before all are found), but cache the result.

- **Element fibers.** `el[__reactFiber$…]` and `el[__reactProps$…]` exist on every host element (same random suffix as the container). For a post `<article>`, walking `.return` 3 levels up reaches a component with props `{promotion, tweet}`:
  - `promotion` is `null` for organic posts. For ads it is `{type:'promoted', disclosureType, impressionId, advertiserScreenName, clickTrackingInfo, withSalesCtaWebsiteCard…}`.
  - `tweet` is a Relay fragment ref `{__id, __fragments, __fragmentOwner, permalink, hotkeys}`.
- **Relay store lookup** (verified):

```js
let src = environment.getStore().getSource()
let rec = src.get(tweet.__id)              // keys: rest_id, core, legacy, quoted_tweet_results, counts, views, card, note_tweet, …
let legacy = src.get(rec.legacy.__ref)     // full_text, entities, conversation_id_str, retweeted_status_results, lang, …
```

  Field names are **snake_case** (`rest_id`, `conversation_id_str`), the same as the GraphQL payload.

## Routing

- `router.state.location.pathname`, `router.state.matches.map(m => m.routeId)`. Examples:
  - `/home` → `['__root__','/home']`
  - `/explore` → `/explore`
  - `/notifications` → `/notifications`, `/notifications/`
  - a profile → `/$username`, `/$username/_profile`, `/$username/_profile/`
  - a status → `/$username`, `/$username/status/$id/`
  - search → `/search`
- **Bookmarks now redirect.** `/i/bookmarks` → **`/i/history`** ("History": bookmarks and likes live at `/i/history/bookmarks` and `/i/history/likes`).
- **Events.**
  - `router.subscribe('onBeforeNavigate'|'onResolved'|'onRendered', e => …)`; `e.toLocation.pathname` is set.
  - The title updates by `onResolved`.
  - The full route table (674 paths) is in `routes.txt`, taken from `Object.keys(router.routesByPath)`.
- **Navigation.** `router.navigate({href})` works. `router.history` has `push`, `replace`, `block`, `subscribe`.

## Theme, colour and font

- **`<html>` attributes:** `lang`, `dir`, `data-theme` (light/dark), `data-accent`, `data-high-contrast`, `data-reduce-motion`, `data-app-language`, `data-app-env`, `data-app-version`, `data-input-modality`, `data-page-header-scroller`. The inline `style` carries `--x-cookie-banner-clearance` and `--x-page-header-h`.
- **Theme tokens** are in `styles-*.css` under `:root,[data-theme=light]` and `:root[data-theme=dark],[data-theme=dark],.dark-theme`:
  - `--x-bg-primary|secondary|tertiary|quaternary|modal|sheets|inputs`
  - `--x-fg-primary|secondary|tertiary|brand|on-brand`
  - `--x-border-normal|divider|hover|…`
  - `--x-btn-*`, `--x-hover-subtle|faint`, `--x-overlay-*`
  - the `--x-neutral-000…1100` scale, plus `--x-blue|green|red|orange|yellow|…-NNN`
  - `--x-black`/`--x-white` alpha ramps
- **Dark values:** `--x-bg-primary: var(--x-black)`, `--x-bg-secondary: var(--x-neutral-1000)`, `--x-fg-secondary: var(--x-neutral-400)`, `--x-fg-brand: var(--x-blue-500)`.
- **Dim theme (`darkModeTheme: 'dim'`)** can be emulated by overriding the `--x-bg-*` and `--x-border-*` tokens under `:root[data-theme=dark]`.
- **Accent overrides** are only `--x-fg-brand`, `--x-btn-brand(-hover|-pressed)` and `--x-fg-on-brand`. Override those to restore Twitter blue or apply a custom colour.
- **Font:** `--x-font-sans`, `--x-font-scale`.
- **Page metrics:** `--x-page-height`, `--x-page-header-inset-top`, `--x-page-header-h`, `--x-main-column-width`, `--x-sidebar-wide`/`--x-sidebar-open`/`--x-sidebar-expanded`, `--x-bottom-bar-clearance`.

## Layout and breakpoints (measured)

App shell: `body > div.mx-auto.flex.min-h-(--x-page-height).w-full.max-w-[1024px]` → `div.flex.w-full.grow.justify-center`, containing:

1. `div.hidden.sm:block`: the left rail. It holds a logo row, `nav[aria-label="Primary"]` (vertical) and the account switcher at the bottom.
2. `div.min-w-0.flex-1…grid`: holds `main` (600px column; `header` is sticky, then the compose box `div.relative.border-divider.hidden.border-b.sm:block`, then content) and **`aside.hidden.lg:flex`** (the right sidebar).

Mobile adds `div.contents.sm:hidden`, which contains the bottom bar with `nav[aria-label="Primary"]` (5 tabs) and floating buttons.

| Width | Left rail | Primary nav | Right sidebar (`aside`) | main |
|---|---|---|---|---|
| < 512 | hidden | bottom bar, 5 items | hidden | full width |
| 512–1023 | icon rail 72px | vertical icons | hidden | ≤600 |
| 1024–1279 | icon rail 72px | vertical icons | shown (≈424px) | 600 |
| ≥ 1280 | expanded 256px with labels | vertical labelled | shown, plus `nav[aria-label="Footer"]` inside | 600 |

The breakpoints are custom (`sm`=512, `lg`=1024, `xl`=1280); they aren't Tailwind's default 640. **Mobile test:** `matchMedia('(width < 512px)').matches`, or check whether `nav[aria-label="Primary"]` has an ancestor matching `.sm\:hidden`.

Other fixed layers directly under `<body>`:
- `div.fixed.inset-x-0.bottom-0.z-30`: bottom chrome.
- `div[data-slot="xds-dock"]`: the floating Grok/Chat dock, with `xds-dock-launcher`, `xds-dock-window` and `xds-dock-panel`.
- `div[popover=manual]`
- `div[aria-live=polite]`
- a hidden iframe
- `div[data-active-media-holder]`

## Portals and layers

- Menus, popovers, dialogs and tooltips are **Base UI** portals appended to the end of `<body>`: `body > div[data-base-ui-portal]` (random `id` such as `_r_2bn_`).
- While a portal is open, earlier body children get `data-base-ui-inert`.
- **Menu:** `[role="menu"][data-slot="xds-menu-content"]` (has `data-side`, `data-align`, `data-open`), items are `[role="menuitem"][data-slot="xds-menu-item"]`, and the trigger is `button[data-slot="xds-menu-trigger"][aria-haspopup="menu"]`. The post caret menu is `aria-label="More"`; its items are *Not interested in this post, Follow @x, Add/remove from Lists, Mute @x, Mute this conversation, Block @x, View post activity, Embed post, Report post, Report EU illegal content, Request Community Note*.
- **A replacement for `observePopups()`:** a MutationObserver on `document.body` with `childList` only, filtering added nodes by `[data-base-ui-portal]`.
- **Stable hook attributes** (they stand in for `data-testid`): `data-slot="xds-*"` (button, menu-trigger, context-menu-trigger, combobox-input, dock-*), plus `embedded-tweet-frame`, `data-engagement-action`, `data-post-avatar`, `data-icon`, `data-href`, `data-page-header`, `data-top-chrome`, `data-pinned-timeline`, `data-who-to-follow`, `data-tab-underline`.
- **Remaining `data-testid`s:** only `premium-signup-tab` and `SearchBox_Search_Input`.

## Feature switches

- Values: `window.__INITIAL_DATA__.featureSwitchPayload.features` (39 keys for this user). The provider's props are `{defaults, features, impressions, impressionPointers, keysRead, overrides, setOverride, token}`.
- Route context `featureSwitches` is rebuilt from `defaults + features + overrides` whenever `setOverride(key, value)` is called (*bundle*: `l.setOverride = function(e,t){… c[e]=t, f.options.context.featureSwitches = d() …}`). So the supported way to force a flag is probably `featureSwitchState.setOverride(key, value)` from the provider props at fiber depth ≈48. I haven't tested this.
- **Flags relevant to the extension:**
  - **`responsive_web_extension_compatibility_impression_guard`** (default true) with **`_size_threshold`** (50): **X skips logging an ad impression when the ad element is ≤50px tall** (*bundle*, `Sh()` in `CLXrIx6B.js`). Collapsing an ad to `display:none` or 0 height therefore doesn't count as an impression.
  - `responsive_web_extension_compatibility_hide` and `_override_param` are both `true` for this user, but no code reading them is in the loaded chunks. They may live in a lazily loaded chunk. **The names suggest X detects extension-hidden content.**
  - `rweb_age_assurance_flow_enabled` (used by Birdfeed's `bypassAgeVerification`) is not in this payload. Check the defaults list (`Yr`) in `ISItzIyQ.js`.
  - `responsive_web_trends_ui_enable_new_sidebar`, `grok_xweb_bot_promotion_enabled`, `subscriptions_upsells_*`, `post_ctas_*`.

## Network / data interception

- **GraphQL host:** `https://api.x.com/graphql/<queryId>/<OperationName>`. Seen on home: `HomeTimeline` (`TVqBLxFlf41RbA3UHYBf4g`), `newsSidebarQuery`, `exploreSidebarQuery`, `whoToFollowListQuery`, `sportsRailScoresFollowsQuery`, `fetchNotificationBadgeCountsQuery`, `usePremiumPaywallOnLoadMutation`, `videoPreferencesQuery`. REST: `api.x.com/1.1/{flow/viewer.json, hashflags.json, account/multi/list.json, promoted_content/log.json, graphql/viewer_context.json}`, `api.x.com/2/badge_count/badge_count.json`, `api.x.com/fleets/v1/*`, `api.x.com/live_pipeline/events`.
- **Interception works.** Replacing `window.fetch` after boot still sees `HomeTimeline` page loads (verified). `flow/viewer.json` and `viewer_context.json` use XHR. The app wraps `globalThis.fetch` itself at boot to add `x-workload-version` for same-origin requests. Since Birdfeed's content script runs at `document_start`, patching before the app is also possible.
- **HomeTimeline response shape** (snake_case):
  - Path: `data.home_timeline.home_timeline_urt.instructions[]`, `__typename:"TimelineAddEntries"`, `entries[]`.
  - Each entry has `{entry_id, sort_index, content}`. IDs look like `tweet-…`, **`promoted-tweet-<tweetId>-<impressionId>`**, `home-conversation-…`, `cursor-top-…`, `cursor-bottom-…`.
  - Promoted entries carry `content.content.promoted_metadata` (`advertiser_results`, `impression_id`, `click_tracking_info`) and `client_event_info.component == "for_you_promoted"`.
  - One page had 7 promoted entries out of 37.
  - **Dropping entries whose `entry_id` starts with `promoted-` removes ads before React renders them.**

## Old client

Not reachable: `twitter.com/home` and `mobile.x.com/home` redirect to `x.com/home`, and `?mx=1` serves the same new bundle. There's no opt-out in the bundles (I searched for classic/legacy/opt_out/old_web).

## Files

- `routes.txt`: all 674 route paths from `router.routesByPath`.
- Bundles used for *bundle* claims: `abs.twimg.com/x-web/x-web/assets/{ISItzIyQ,KBbxIZos,CLXrIx6B,CB0gu2T0}.js`, `entry-client-D_zCJdlR.js` and `styles-KlyvUT51.css`. The filenames are content hashes and will change.
