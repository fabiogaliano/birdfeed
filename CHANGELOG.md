# Changelog

Add entries under **Unreleased** as changes land. `pnpm run release <patch|minor|major>`
turns that section into the new version's entry, and the release workflow uses it
as the GitHub release notes.

## Unreleased

## 4.26.0 - 2026-11-24

### Changed

- Rebuilt for X's new web client. X replaced its whole web app, and Birdfeed stopped
  working entirely: ads were back, the sidebar wasn't hidden, and no other setting applied.
  Your settings carry over unchanged.
- Ads, Who to follow, "Discover more", search prompts, hidden reposts and quotes,
  notification likes and Premium replies are now removed from the data X loads, before
  they're shown, so the timeline has no gaps where they were.
- "Hide Bookmarks" now hides **History**, which is where X moved Bookmarks.
- "Show in separate tab" for Retweets and Quote Tweets now hides them from Home; the
  separate tab isn't back yet.
- Replies sort and Following sort also apply when a page is opened directly.

### Removed

- Settings for things X no longer has: Jobs and Connect in the navigation, the Dim theme,
  and a post's source label (X's app no longer receives it). "Restore headlines under
  external links" and "Restore Quote Tweets link" are gone too, because X shows both again.
  These are cleared from your saved settings the next time the options page opens.

### Fixed

- The options page search box was saved as a setting with an empty name, which then
  appeared in every export.

### Known issues

- Not yet working with X's new design: follow button styles (uninvert and themed),
  full-width media, the navigation base font size, and hiding the mobile live broadcast
  bar.

## 4.25.0 - 2026-11-06

### Added

- One-click **Mute** and **Block** buttons. On tweets they sit next to the author's name
  and use X's own menu, so the tweet disappears and X shows its usual Undo toast. Block
  skips the confirmation step.
- The same buttons in user lists such as List members and followers, next to Follow.
  There they act as toggles: click again to unmute or unblock.
- Settings to choose which buttons appear (Behavior → One-click mute and block).
- Option to hide **Calls** from the navigation (Navigation → Calls), on by default.
