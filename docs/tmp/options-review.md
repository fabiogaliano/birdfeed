# Options review

Working notes for a pass over the settings UI. Every claim here was checked
against live x.com unless marked otherwise.

## Confirmed broken

| Setting | Problem | Status |
|---|---|---|
| `replaceLogo` (home icon) | X redrew the house icon, so the `d=` override matched nothing. Logo swapped, home icon didn't - a half-applied setting, which is harder to notice than none of it. | **fixed** |
| `replaceLogo` (chat icon) | X replaced the DM envelope with a Chat speech bubble. `tweakMessagesIcon` can restore it but only ran under `redirectChatNav`, and there was no CSS fallback like the home icon had. | **fixed** |

## Added

**`restorePhotoGrid`** - "Show multiple photos as a grid instead of a carousel",
default on. X replaced the multi-photo grid with a swipeable carousel; this puts
the grid back: 2 photos side by side, 3 as a tall left plus two stacked right, 4
as the 2x2 square. The prev/next arrows are hidden with it.

Verified live through the real extension, toggling the setting on one page so
before and after are the same posts:

| photos | off | on |
|---|---|---|
| 2 | `flex`, cells 275 tall | `grid`, 1 row, cells 294 |
| 3 | `flex`, cells 275 | `grid`, 2 rows, cells 294 / 146 / 146 |
| 4 | `flex`, cells 275 | `grid`, 2 rows, all cells 146 |

Two things about the implementation are worth knowing before touching it:

- The hook is `[data-testid="ScrollSnap-List"]`, which X **also uses for the
  profile tab strip**. The `:has([data-testid="tweetPhoto"])` guard is what
  stops this gridding the tabs - don't drop it.
- The rules are written per exact photo count instead of one guarded block plus
  overrides. Every `:has()` adds specificity, so a shared block out-specifies
  narrower row rules even with `!important` on both, which silently forced all
  counts into a single row and cropped photos 3 and 4 out of view.

Carousels containing a video are left alone; the player doesn't survive being
squashed into a fixed cell.

## Not broken, but reported as such

**`restoreQuoteTweetsLink`** - you said you don't see the "view quote tweets"
button in the timeline. It works, but only on a tweet's own page, and only when
`quote_count > 0`. Verified live: on a `deepseek_ai` post it injects
`#cpftQuoteTweetsLink` and `#cpftRetweetsLink` correctly.

It is not, and never was, a timeline feature. Two options, your call:

- rename it so the scope is obvious (see below), or
- extend it to the timeline, which is a real feature request rather than a fix

**`restoreTweetSource`** works too - `.TweetSource` renders on the same post. I
had earlier guessed X stopped serving source data; that was wrong.

## Every setting now has a description

The options page had labels and nothing else, so an unfamiliar toggle gave no
clue what turning it on would do. **108 of the 109 controls** now carry a
one-line description under the label saying what happens when it is on, and -
where the scoping is the confusing part - *where* it happens. 100 were written
here; the 8 that already had one were left alone. The only control without one
is the master `enabled` toggle, which needs none.

They follow the `<name>Info` convention already in `options.html`, but are
injected by control name in `options.js` rather than written into the markup.
Adding a description is therefore one entry in `_locales/en/messages.json`
instead of an edit in three files, and a setting without one simply gets none.

Verified rendered, not just generated: 91 paragraphs present, none empty.

**54 of them also have a before/after example**, shown by hovering the small
`(i)` next to the label - two screenshots side by side, captioned OFF and ON,
with names, handles, avatars and post text anonymised. Built from the audit runs
by `scripts/build-examples.js`, so coverage grows on its own as more settings
become measurable; a setting without a pair simply has no marker.

One thing to decide: the examples add **2.7MB** to the extension (108 JPEGs at
480px). That is a real cost against a Chrome Web Store submission. Dropping
quality or the longest edge would cut it further, or the whole `examples/`
directory can be excluded from the package - the options page degrades cleanly
to descriptions only if `index.json` is absent.

Writing them turned out to be its own audit. Six descriptions I first wrote from
the label were wrong once I read the implementation:

| Setting | What the label suggests | What the code does |
|---|---|---|
| `sortFollowing` | adds a sort control | rewrites the `enableRanking` parameter on X's own timeline request |
| `hideEditImage` | hides a composer button | hides the Grok "Edit image" links X adds to photos in posts and to profile settings |
| `followButtonStyle` | which *shape* the button is | whether the button is one flat colour or picks up the theme colour |
| `hideViewActivityLinks` | the link under your posts | that, plus the matching menu item |
| `listRetweets` | a setting you set here | a toggle that lives on the List itself |
| `hideGrokTweets` | posts from Grok | posts *sharing a Grok conversation* - see the rename table |

They are corrected. The lesson is that the labels alone were not a reliable
description of this codebase, which is the problem the descriptions exist to
solve.

## Bugs found in the extension itself

**A config change containing `debug` silently drops every other key in the same
write.** The settings observer short-circuits before it merges anything:

```js
if ('debug' in configChanges) { debug = configChanges.debug; configureThemeCss(); return }
```

User-facing impact is narrow: `content.js` forwards only the keys that actually
changed, and there is no config import, so this needs `debug` to change in the
same write as something else - saving several settings at once with debug among
them. Everything else in that write is silently dropped until the next reload.

The real damage was to the audit, where it invalidated every run before this one
(see the codebase map). The early return looks unintentional either way; the fix
is to return only when `debug` is the *only* key in the write.

## Naming - proposals for you to vouch for

The `hideX` settings are inconsistent: some labels carry the verb ("Hide the
Compose Tweet button"), others are bare nouns ("Bookmark button under tweets").
Under the "Hide UI items you don't use" heading the bare form reads fine; mixed
into other groups it is ambiguous - does ON mean hide or show?

Now that every setting carries a description, most of the scoping confusion is
already answered in the UI, so the list below is shorter than it was. What is
left is labels that are actively misleading rather than merely terse - a
description under a wrong label doesn't fix the wrong label.

**Worth changing:**

| Setting | Current label | Proposed | Why |
|---|---|---|---|
| `hideSpacesNav` | "Create your Space" | "Spaces" | Reads as an action you can take, not something you are hiding. It is only the nav item's own wording, copied. Sits in a group where every other label is a bare noun. |
| `hideGrokNav` | "Hide Grok" | "Hide Grok in the sidebar" | Sits directly above "Hide Grok tweets", so the pair reads as one thing said twice - you noted this yourself |
| `hideGrokTweets` | "Hide Grok tweets" | "Hide posts sharing a Grok conversation" | **The label is wrong**, not just terse. It matches `a[href^="/i/grok/share/"]` - posts that share a Grok chat. It does not touch posts *by* Grok, or posts that merely mention it. I described it as "posts from Grok" myself before reading the code. |
| `reducedInteractionMode` | "Reduced interaction mode" | "Hide all engagement buttons" | Names a mode instead of describing an effect; nothing tells you what the mode *is* |

**No longer worth changing** - the description now carries the missing
information, and the label is not wrong, just short:

`restoreQuoteTweetsLink`, `restoreOtherInteractionLinks` (scope is now stated),
`hideMetrics` ("metrics" is jargon, but the sub-toggles and the description both
disambiguate), `fullWidthContent`, `navDensity`.

Not renamed on purpose: `retweets`, `quoteTweets`, `twitterBlueChecks` are
three-way enums whose labels head a group of radio options, so the bare noun is
correct there.

## Structural problem

`[UI improvements]` holds **43** settings - video autoplay, blocking,
notifications, search, redirects, logo, theme, Views, tweet source, links,
sorting, blue checks, premium replies, Grok, jobs, subscriptions. It is a
dumping ground and the single biggest obstacle to finding anything.

Suggested split:

- **Identity & branding** - `replaceLogo`, `twitterBlueChecks`, `hideTwitterBlueReplies`, the `showPremiumReply*` group, `hideTwitterBlueUpsells`
- **Links & metadata** - `restoreQuoteTweetsLink`, `restoreOtherInteractionLinks`, `restoreTweetSource`, `restoreLinkHeadlines`, `unwrapTcoLinks`, `addFocusedTweetAccountLocation`, `addUserHoverCardAccountLocation`
- **Navigation & redirects** - `redirectToTwitter`, `redirectChatNav`, `redirectTwitterLinks`, `defaultToLatestSearch`, `disabledHomeTimelineRedirect`
- **Grok & AI** - `hideGrokNav`, `hideGrokTweets`
- keep the genuinely miscellaneous remainder in "UI improvements"

## Duplicate controls - not a bug

`hideConnectNav`, `hideListsNav`, `hideBookmarksNav`, `hideCreatorStudioNav`,
`hideCommunitiesNav`, `hideBusinessNav` each appear twice in `options.html`.
They are `.desktop` and `.mobile` variants sharing one `name`, so they stay in
sync. Worth knowing before someone "fixes" it.

## Coverage

**58 of 103 settings are confirmed**, up from 25. The jump is almost entirely
the baseline fix, not new probing - the settings were working the whole time,
the harness just could not see them.

### The 30 "probed, moved nothing" are resolved: none are broken

`pnpm run audit:hooks` (`scripts/audit/hooks.js`) answers the question the probe
run structurally could not. For each setting it extracts the hooks its own code
depends on and counts them against live x.com, which separates "X broke it" from
"the run had nothing to act on":

| Verdict | Count |
|---|---|
| Dead - a chrome hook matches nothing | **0** |
| Alive - hooks resolve, blocked on content | 22 |
| Content absent - cannot tell broken from untested | 1 (`hideGrokTweets`) |
| Matched by icon geometry - see `icon-paths.js` | 2 |
| No DOM hook to check - needs behavioural tests | 5 |

So across the whole extension, **the only proven breakage remains the two icons
already fixed** (home and chat, both in `replaceLogo`).

A first pass of this tool reported 4 settings dead and **all four were wrong** -
worth recording, because each failure mode is one this method invites:

| Setting | Why the "dead" verdict was false |
|---|---|
| `addUserHoverCardAccountLocation` | the hover card was never opened, so its hooks could not exist |
| `hideChatNav` | its real hook is `a[href$="/i/chat"]`; the extractor only read `href^=` |
| `hideNotificationRetweets` | matches an SVG path prefix in JS - no selector exists to count |
| `hideGrokTweets` | a content hook: zero means no such post was on screen |

The last one changed the design rather than the parsing. A hook matching page
furniture (nav, menus, structure) is present on every load regardless of the
account, so zero there is real breakage. A hook matching content is absent
whenever that content is not rendered, which is indistinguishable from breakage.
Collapsing the two would have reproduced the exact ambiguity the tool exists to
remove. **"Dead" now requires a chrome hook that matched nothing**, and
content-only zeros stay explicitly unresolved.

The earlier claim that ~20 settings were **account-gated and "unreachable from
this account at all"** was wrong. `hideAdsNav`, `hideBusinessNav`,
`hideCreatorStudioNav` and `hideListsNav` all measure fine; they were
baseline-bug false negatives, and I had invented an explanation for them.

The metric sub-toggles are a worked example of what "dead" usually means here.
All of them sit inside `configureHideMetricsCss()`, which only runs when
`hideMetrics` is on - so against the inert baseline they were unreachable and
read dead as a group. Given a `REQUIRES` entry, five confirmed immediately:

| Setting | Impact |
|---|---|
| `hideLikeMetrics` | 45 |
| `hideReplyMetrics` | 43 |
| `hideRetweetMetrics` | 37 |
| `hideFollowingMetrics` | 4 |
| `hideBookmarkMetrics` | 3 |

Two did not, for unrelated reasons worth knowing:

- `hideTotalTweetsMetrics` scored **1** - a real effect, but it hides a single
  element and the noise floor is 3. Single-element settings cannot clear it.
- `hideQuoteTweetMetrics` scored 0 - the probe tweet showed no quote count in
  its action bar.

That first case turned out to be a category the map was hiding. `settings-map.md`
now has an **"Observed, below the noise floor"** section for settings that moved
something without clearing the floor - three of them, previously filed as dead:

| Setting | Impact |
|---|---|
| `restoreTweetSource` | 2 |
| `hideTotalTweetsMetrics` | 1 |
| `redirectChatNav` | 1 |

`restoreTweetSource` is independently confirmed working - "Twitter Web App"
renders under a focused tweet. These are reported separately rather than by
lowering the floor, which would cost the guarantee that a positive means
something.

`hideAllMetrics` is not probeable at all, and is not a bug: it is a UI-only
convenience control in `options.js` that ticks the other seven. `script.js`
never reads it.

Of the 45 still unconfirmed, **12 have no routing evidence** - behavioural
settings (`bypassAgeVerification`, `preventNextVideoAutoplay`,
`defaultToLatestSearch`) that change no markup. Visual diffing will never
confirm these; they need behavioural tests.

Genuinely blocked on content, not on the harness:

| Setting | Needs |
|---|---|
| `hideNotificationLikes`, `hideNotificationRetweets` | any notification at all - this account's Notifications page reads "Nothing to see here — yet" |
| `hideGrokTweets` | a post sharing a Grok conversation; X search can't select for one |
| `hideJobsNav`, `hideSubscriptions` | the account to actually have those products |
| `showPremiumReplyFollowing`, `…FollowedBy`, `…Government` | a premium reply from that specific relationship |

`fastBlock` should not be probed. Its whole function is removing the block
confirmation step, so observing it means clicking Block with no confirmation, on
a real account, against a real person.

## Icon-path hooks: checked, none broken

Six places classify an item by matching a hard-coded **SVG path prefix** in
JavaScript - `selectors.js` cannot see these because they are string
comparisons, not selectors. They drive `hideNotificationLikes`,
`hideNotificationRetweets`, and pinned/community post detection, and they are
the same failure mode that silently broke the home and chat icons.

`node scripts/audit/icon-paths.js` now checks them. Current result: **`LIKE`,
`FOLLOW` and `RETWEET` are live; `AD`, `PINNED_TWEET` and `COMMUNITY_TWEET`
could not be judged** because no such item was on screen. None are broken.

That "could not be judged" distinction is the whole point of the tool - my first
version reported five of the six as DEAD, which was an artefact of looking on
the wrong page (pinned posts are on profiles, not the timeline) and of an empty
notifications page.

`fastBlock` should not be probed. Its whole function is removing the block
confirmation step, so observing it means clicking Block with no confirmation, on
a real account, against a real person. The network guard now covers
`CreateBlock`/`BlockUser`/`MuteUser`/`FollowUser` over GraphQL - it previously
only covered the dead REST endpoints, so this was genuinely unsafe before.
