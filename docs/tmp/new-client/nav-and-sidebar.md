# New X web client: navigation & sidebar

Probed 2026-11-24 in agent Helium (no extension, logged in, English UI) on
`/home`, a post page, `/explore`, `/search`, `/i/history`, at 1280 / 1000 / 700
desktop widths and 500px mobile emulation (touch on). Every selector below
was run with `querySelectorAll` against the live page unless marked
**unverified**.

## What changed, in one paragraph

React Native Web is gone. The app is Tailwind + Base UI: no `#react-root`,
no `#layers`, no `header[role=banner]`, and almost no `data-testid`. The only
testids left in nav/sidebar are `premium-signup-tab` (the Premium nav item) and
`SearchBox_Search_Input`. Responsive layout is pure CSS media queries; the
sidebar is **not removed** from the DOM when it collapses, it is
`display:none`. Icons now carry names: inline SVGs have `data-icon="icon-…"`,
others use `<use href="#icon-…">` against a sprite of `<symbol>`s in `<body>`.
These names are the best language-independent hook for nav items and
buttons. `aria-label`s and headings are localised, so don't use them as
primary hooks.

## Page skeleton (desktop)

```
body
└ div  [--x-main-column-width:600px] max-w-[1024px] xl:max-w-[1280px] xl:[--x-sidebar-wide:1]   ← page container
  └ div.flex.justify-center
    ├ div.hidden.sm:block                       ← left rail wrapper (unmounted below sm)
    │ └ div.sticky                              ← rail; width 72px, 256px at ≥1280
    │   ├ div > a[href="/home"] > svg[data-icon=icon-logo-x]          ← logo
    │   ├ div[data-rail-overflow]
    │   │ ├ nav[aria-label=Primary] > a… , button[aria-haspopup=menu] ← nav items + More
    │   │ └ div > a#sidebar-compose-post[href="/compose/post"]        ← Post button
    │   └ div.mt-auto > button[aria-haspopup=menu]  (aria-label "Account menu") ← account switcher
    └ div.grid  lg:grid-cols-[var(--x-main-column-width)_minmax(0,1fr)]
      ├ main                                     ← primary column (no role, no testid)
      │ └ div > header[data-page-header] …       ← page header (tabs etc.)
      └ aside.hidden.lg:flex                     ← sidebar ("sidebarColumn")
        └ div > div.sticky                       ← module stack (old .SidebarContents)
          ├ div:has([role=search])               ← search box
          ├ section …                            ← modules, one <section> each
          └ nav[aria-label=Footer]
```

Floating dock (bottom-right on desktop):
`div[data-slot="xds-dock"]` > `div[data-slot="xds-dock-window"]` ×2, each with
a `button[data-slot="xds-dock-launcher"]` and a `[data-slot="xds-dock-panel"]`.

Mobile (<640px): the rail wrapper is unmounted. The bottom tab bar is
`nav[data-bottom-bar]`, which also has `aria-label=Primary`. The page header
has an account avatar button, a logo and a **Subscribe** upsell link. Compose
is a floating `button[data-compose-fab]`.

### Breakpoints (measured)

| width | rail | sidebar (`aside`) |
|---|---|---|
| ≥1280 (`xl`) | expanded, labels, 256px (`--x-sidebar-wide:1`) | shown |
| 1024–1279 (`lg`) | icons only, 72px | shown |
| 640–1023 | icons only, 72px | `display:none` (still in DOM) |
| <640 (`sm`) | unmounted; `nav[data-bottom-bar]` instead | `display:none` |

**Persistence:** across SPA navigation the `aside` and rail `nav` elements are the
same nodes, but every `aside section` is re-rendered per page. Observe the
module stack (`aside > div > div.sticky`) with `childList`.

## Left nav

All items are `<a>` direct children of the rail nav, each with
`aria-label`, `data-trigger-disabled`, a Base UI `id` (unstable, e.g.
`base-ui-_r_qs_`), `aria-current="page"` + `data-status="active"` when
current, and two icons (outline + `-fill`).

| Item | href | data-icon |
|---|---|---|
| Home | `/home` | `icon-home` / `icon-home-fill` |
| Explore | `/explore` | `icon-search` |
| Notifications | `/notifications` | `icon-bell` |
| Chat (was Messages) | `/i/chat` | `icon-chat` |
| Calls | `/i/calls` | `icon-phone` |
| Grok | `/i/grok` | `icon-logo-grok` |
| History (Bookmarks + Likes tabs) | `/i/history` | `icon-bookmark-fill` |
| Creator Studio | `/i/jf/creators/studio` (note `/i/jf/` prefix) | `icon-rocket` |
| Premium | `/i/premium_sign_up`, `data-testid="premium-signup-tab"` | `icon-verified-premium` |
| Profile | `/<handle>` | `icon-person` |
| More | `button[aria-haspopup=menu]` (no href) | `icon-more-dots-hor-circle` |

These items are **gone** from the nav: Bookmarks (`/i/bookmarks` now redirects to `/i/history`),
Lists, Communities, Jobs, Connect/Follow people, Spaces, Business,
Verified Orgs, and Messages (`/messages`).

Mobile bottom bar (`nav[data-bottom-bar]`) contains only: `/home`, `/explore`, `/i/grok`,
`/notifications`, `/i/chat`.

### More menu (desktop)

Opens as a Base UI portal: `body > div[data-base-ui-portal] … [role=menu][data-slot="xds-menu-content"]`.
Items are `a[role=menuitem][data-slot]`:

`/<handle>/lists`, `/<handle>/communities`,
`/i/premium-business?referring_page=dash_menu`,
`https://ads.x.com/?ref=…` (target=_blank), `/i/spaces/start`, `/settings`.

Old `MORE_DIALOG` (`div[aria-labelledby="modal-header"]`) no longer exists.
Desktop `menuRole` (`[role="menu"]`) still works, though every Base UI menu
uses it, including post "More" menus and the footer "More" menu.

### Mobile account drawer (old mobile `menuRole` = `[role=dialog]`)

`[role=dialog]` (aria-label "Account menu") contains plain `<a>` elements, not
`menuitem`s. In order:
profile, `/account/switch`, Profile, `/i/premium_sign_up` (icon
`icon-logo-x`!), `/<handle>/lists`, `/<handle>/communities`, `/i/history`,
`/i/jf/creators/studio`, `https://ads.x.com/…`, `/settings`, `/logout`,
"Get the app" (`https://m.x.com/home?launch_app_store=true…`).

### Account switcher (desktop)

`div:has(> [data-rail-overflow]) > div > button[aria-haspopup="menu"]`:
avatar in `span:first-child`, name/handle in `span:nth-child(2)` (which
collapses itself through `--x-sidebar-expanded`). Its menu has: Add an existing
account, `/account/switch`, `/logout`.

### Logo

`a[href="/home"] svg[data-icon="icon-logo-x"]`. One is in the rail, and one is in the
mobile page header (inside `a[data-slot=xds-button]`, `sm:hidden`). The path
**changed**: it is now `m21.62 21.5-7.47-10.9…`, so `Selectors.X_LOGO_PATH` and
`X_DARUMA_LOGO_PATH` match nothing. Match on `data-icon` instead.
The favicon is still `link[rel=icon][href*="twitter.3.ico"]`. The title format is
still `… / X`.

### Post button

- Rail: `a#sidebar-compose-post[href="/compose/post"]`. Label text is in
  `> span:last-child` ("Post"); the icon (`icon-edit-plus`) is in `span:first-child`. Both
  are always in the DOM and cross-faded through `--x-sidebar-expanded`, so text
  replacement no longer needs to observe resize churn.
- Mobile: `button[data-compose-fab]` (aria-label "Post", icon `icon-new-chat`).

## Right sidebar modules

Each module is a top-level `section` in the stack (no testids). Identify each one by its
content, never by position. Order and presence vary by page, so the old
`.SidebarContents > div:nth-of-type(n)` scheme is unusable.

| Module | Pages seen | Selector (verified) |
|---|---|---|
| Search box | all except /explore, /search | `aside [role="search"]`; input `[data-testid="SearchBox_Search_Input"]` |
| Subscribe to Premium | home | `aside section:has(a[href^="/i/premium"])` |
| Today's News | home, explore, search | `aside section:has(a[href^="/i/trending/"])`; has its own native Close menu button |
| What's happening / Trending now | home, post, search, history | `aside section:not(section section):has([data-href*="src=trend_click"])`; list container `[id^="urt:explore-sidebar"]`. Without `:not(section section)` it also matches a nested inner section |
| Who to follow | home, explore, search, history | `aside section:has([data-who-to-follow])` |
| Relevant people | post page (first module) | `aside section:not(:has([data-who-to-follow])):not(:has(section)):has(> div > [role="link"][data-href])` |
| Search filters | /search (first module) | `aside section:has([role="radiogroup"])` |
| Footer | all | `aside nav:has(a[href$="/tos"])` |
| Live on X | not seen | **unverified** — likely another `section` whose `h2` is localised "Live on X" |
| Promoted trend in What's happening | not seen | **unverified** — the old code hid the first non-trend item. Trend rows are now `[role=link][data-href^="/search?q="]`. Check for a row with a non-search `data-href` or a promoted icon |

A trend row is `div[role=link][data-href="/search?q=…&src=trend_click&vertical=trends"]`
containing a hidden `a[aria-hidden=true]` with the same href and a `button[aria-label=More][data-slot=xds-menu-trigger]`.
A user cell (Who to follow / Relevant people) is `div[role=link][data-href="/<handle>"]`
with a follow button `button[data-slot=xds-button]` (aria-label `Follow @x` /
`Unfollow @x`).

## Floating dock (Grok & Chat)

| Thing | Selector (verified) |
|---|---|
| Dock | `[data-slot="xds-dock"]` (fixed, bottom-right) |
| Grok window | `[data-slot="xds-dock-window"]:has(> [data-slot="xds-dock-launcher"] [data-icon="icon-logo-grok"])` (launcher aria-label "Expand Grok") |
| Chat window (old Messages drawer) | `[data-slot="xds-dock-window"]:has(> [data-slot="xds-dock-launcher"] [data-icon="icon-chat"])` |

Both launchers are hidden at mobile widths (the dock is still present).

## Setting map

Confidence: **high** means verified live; **med** means the element was verified but the behaviour wasn't
exercised; **low** means unverified or the feature is gone.

| Birdfeed setting | Old selector | New selector / approach | Conf. |
|---|---|---|---|
| (boot) `PRIMARY_NAV_DESKTOP` | `header nav` | `nav:not([data-bottom-bar]):has(> a[href="/home"])` (aria-label "Primary" is localised) | high |
| (boot) `PRIMARY_NAV_MOBILE` | `#layers nav` | `nav[data-bottom-bar]` | high |
| (boot) `SIDEBAR` | `div[data-testid="sidebarColumn"]` | `aside` (the only one on the page) | high |
| (boot) `.SidebarContents` | `sidebarColumn > div×5` | `aside > div > div.sticky` (or `aside > div > div:has(> nav)`) | high |
| (boot) `body.Sidebar` toggle | observe sidebar mount | the sidebar never unmounts: use `@media (min-width:1024px)` in CSS, or `getComputedStyle(aside).display != 'none'` + resize listener | high |
| `hideSidebarContent` | `.SidebarContents > div:not(:first-of-type)` | hide `aside section:not(section section)` except: search box (a div, not a section, so untouched), Search filters on /search, Relevant people on post pages when `showRelevantPeople`. Consider also hiding the footer `aside nav:has(a[href$="/tos"])` | high |
| `hideTodaysNews` | `div:has(> [data-testid="news_sidebar"])` | `aside section:has(a[href^="/i/trending/"])` | high |
| `hideWhatsHappening` | `section > div[aria-label] > div` → `.WhatsHappening` | `aside section:not(section section):has([data-href*="src=trend_click"])` | high |
| `hideSuggestedFollows` | `aside[role=complementary]` → `.SuggestedFollows` | `aside section:has([data-who-to-follow])` | high |
| `showRelevantPeople` | nth-of-type(2,3) on body.Tweet | `aside section:not(:has([data-who-to-follow])):not(:has(section)):has(> div > [role="link"][data-href])` | high |
| `hideLiveBroadcasts` | h2 text "Live on X" → `.LiveBroadcasts` | not seen; keep the h2-text match on `aside section` | low |
| sidebar ad in What's happening | first non-trend item → `.HiddenAd` | not seen; trend rows are `[role=link][data-href*="src=trend_click"]` | low |
| `hideTwitterBlueUpsells` (sidebar) | `aside a[href^="/i/premium_sign_up"]`, `super-upsell-…` | `aside section:has(a[href^="/i/premium"])` | high |
| `hideTwitterBlueUpsells` (nav) | `header nav a:is([href^="/i/premium"],[href^="/i/verified"])` | `nav a[href^="/i/premium"]` or `[data-testid="premium-signup-tab"]` | high |
| `hideTwitterBlueUpsells` (mobile header) | `TopNavBar a[href^="/i/premium"]` | `main header a[href^="/i/premium"]` (the "Subscribe" button) | high |
| `hideTwitterBlueUpsells` (mobile drawer) | `[role=dialog] a[href^="/i/premium_sign_up"]` | unchanged; the item is a plain `a` in `[role=dialog]` | high |
| `hideExploreNav` | `header nav a[href="/explore"]` | `nav a[href="/explore"]` (rail + bottom bar) | high |
| `hideExploreNavWithSidebar` | `body.Sidebar header nav a[href="/explore"]` | `@media (min-width:1024px) { … a[href="/explore"] }` on the rail nav only | high |
| `hideGrokNav` | `header nav a[href$="/i/grok"]`, `GrokDrawer` | `nav a[href="/i/grok"]` + the dock Grok window (above) | high |
| `hideCallsNav` | `:is(nav, menu) a[href$="/i/calls"]` | unchanged: `nav a[href="/i/calls"]` still matches | high |
| `hideChatNav` | menu `a[href$="/i/chat"]` | Chat is now a main nav item: `nav a[href="/i/chat"]`; also the dock Chat window | high |
| `hideMessagesDrawer` | `DMDrawer` / `chat-drawer-root` | dock Chat window: `[data-slot="xds-dock-window"]:has(> [data-slot="xds-dock-launcher"] [data-icon="icon-chat"])` | high |
| `hideMessagesBottomNavItem` | `#layers nav a:is([href="/messages"],[href="/i/chat"])` | `nav[data-bottom-bar] a[href="/i/chat"]` | high |
| `hideCreatorStudioNav` | `a[href$="/creators/studio"]` | unchanged suffix match works (`/i/jf/creators/studio`); in the rail nav and mobile drawer | high |
| `hideBookmarksNav` | `a[href="/i/bookmarks"]` | the nav item is now History `a[href="/i/history"]` (Bookmarks + Likes). Decide whether this setting maps to History | med |
| `hideListsNav` | `header nav / MORE_DIALOG a[href$="/lists"]` | More menu `[role=menu] a[href$="/lists"]`; drawer `[role=dialog] a[href$="/lists"]` | high |
| `hideCommunitiesNav` | `a[href$="/communities"]` | More menu / drawer, same suffix | high |
| `hideBusinessNav` | `a:is([href^="/i/premium-business"],[href^="/i/verified-orgs-signup"])` | More menu `a[href^="/i/premium-business"]` | high |
| `hideAdsNav` | `a:is([href*="ads.twitter.com"],[href*="ads.x.com"])` | unchanged (More menu + drawer) | high |
| `hideSpacesNav` | `a[href="/i/spaces/start"]` | unchanged (More menu) | high |
| `hideJobsNav` | `a[href="/jobs"]` | not present anywhere in nav/menus | low (gone) |
| `hideConnectNav` | `a[href$="/i/connect_people"]` | not in nav. It still appears as the Who to follow "Show more" link `aside a[href^="/i/connect_people"]` | low (gone) |
| `hideAccountSwitcher` | `SideNav_AccountSwitcher_Button > div…` | hide `div:has(> [data-rail-overflow]) > div > button[aria-haspopup="menu"] > span:nth-child(2)` (name/handle) | med |
| `hideComposeTweet` | `SideNav_NewTweet_Button`, `FloatingActionButtons_Tweet_Button` | `a#sidebar-compose-post`, `button[data-compose-fab]` | high |
| `replaceLogo` (logo) | `X_LOGO_PATH` path-d match | `a[href="/home"] svg[data-icon="icon-logo-x"]`; the path d changed | high |
| `replaceLogo` (Tweet button text) | `SideNav_NewTweet_Button span > span` + resize observer | `a#sidebar-compose-post > span:last-child` (static) | high |
| `fullWidthContent` | `primaryColumn` max-width overrides | widen through the CSS var: set `--x-main-column-width` on the page container `div:has(> div > div > main)`, and lift its `max-w-[1024px]` / `xl:max-w-[1280px]` | med |
| `disableHomeTimeline` redirect | `${primaryNav} a[href="/<target>"]` click | same pattern with the new nav selectors; `/messages` no longer exists (use `/i/chat`) | med |
| `hideNotifications` nav badges | `header nav > a[href^="/notifications"] div[aria-live]` | not observed (no badge present); inspect `nav a[href="/notifications"]` when it has unread items | low |
| hide-premium in hovercard | `[data-testid="HoverCard"] a[href^="/i/premium"]` | out of scope here; HoverCard testid is likely gone | low |
| `observeSideNavItems` | `SideNav_NewTweet_Button` | see the Tweet button row; no observer needed | high |

## Gotchas for the port

- `[role=menu]` is used by every Base UI menu (nav More, account, footer More,
  post More, trend More). Nav-menu hiding by href is safe, but don't assume
  `[role=menu]` means the nav menu.
- Menus/dialogs render in `body > div[data-base-ui-portal]`, not `#layers`.
- `aria-label="Primary"` is on both the rail and the mobile bottom bar.
- The `id`s are Base UI/React `useId` values (`base-ui-_r_xx_`, `_r_xx_`). They change on
  every render, so never use them.
- `/i/bookmarks` redirects to `/i/history` (Bookmarks tab; Likes at
  `/i/history/likes`).
