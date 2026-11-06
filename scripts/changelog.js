/**
 * CHANGELOG.md helpers shared by the release script and the release workflow.
 *
 * CLI: node scripts/changelog.js notes <version>
 *   Prints that version's entry, for the GitHub release body.
 */
const fs = require('fs')
const path = require('path')

const CHANGELOG_PATH = path.join(__dirname, '..', 'CHANGELOG.md')
const UNRELEASED_HEADING = '## Unreleased'

/** @param {string} text @param {string} heading */
function sectionBody(text, heading) {
  let start = text.indexOf(`${heading}\n`)
  if (start == -1) return null
  let bodyStart = start + heading.length + 1
  let next = text.indexOf('\n## ', bodyStart)
  return text.slice(bodyStart, next == -1 ? undefined : next).trim()
}

/**
 * Turns the Unreleased section into the entry for `version` and opens a new,
 * empty Unreleased section above it.
 * @param {string} version
 */
function stampRelease(version) {
  let text = fs.readFileSync(CHANGELOG_PATH, 'utf8')
  let body = sectionBody(text, UNRELEASED_HEADING)
  if (!body) {
    throw new Error(`CHANGELOG.md has nothing under "${UNRELEASED_HEADING}" - add what changed before releasing`)
  }
  let date = new Date().toISOString().slice(0, 10)
  fs.writeFileSync(
    CHANGELOG_PATH,
    text.replace(`${UNRELEASED_HEADING}\n`, `${UNRELEASED_HEADING}\n\n## ${version} - ${date}\n`),
  )
}

/** @param {string} version */
function releaseNotes(version) {
  let text = fs.readFileSync(CHANGELOG_PATH, 'utf8')
  let heading = text.split('\n').find(line => line.startsWith(`## ${version} `) || line == `## ${version}`)
  return heading ? sectionBody(text, heading) : null
}

module.exports = {CHANGELOG_PATH, stampRelease, releaseNotes}

if (require.main === module) {
  let [command, version] = process.argv.slice(2)
  if (command != 'notes' || !version) {
    console.error('Usage: node scripts/changelog.js notes <version>')
    process.exit(1)
  }
  let notes = releaseNotes(version.replace(/^v/, ''))
  if (notes == null) {
    console.error(`No CHANGELOG.md entry for ${version}`)
    process.exit(1)
  }
  console.log(notes)
}
