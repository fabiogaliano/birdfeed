# Changelog

Add entries under **Unreleased** as changes land. `pnpm run release <patch|minor|major>`
turns that section into the new version's entry, and the release workflow uses it
as the GitHub release notes.

## Unreleased

### Added

- One-click **Mute** and **Block** buttons. On tweets they sit next to the author's name
  and use X's own menu, so the tweet disappears and X shows its usual Undo toast. Block
  skips the confirmation step.
- The same buttons in user lists such as List members and followers, next to Follow.
  There they act as toggles: click again to unmute or unblock.
- Settings to choose which buttons appear (Behavior → One-click mute and block).
- Option to hide **Calls** from the navigation (Navigation → Calls), on by default.
