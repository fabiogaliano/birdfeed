const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../../..')

// Read from script.js rather than duplicating it here, so the audit can never
// drift from what ships.
function readDefaultConfig() {
  let source = fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8')
  let start = source.indexOf('const config = {')
  if (start == -1) throw new Error('could not find `const config = {` in script.js')
  let end = source.indexOf('\n}\n', start)
  if (end == -1) throw new Error('could not find the end of the config object in script.js')

  let literal = source.slice(start + 'const config = '.length, end + 2)
  // The block is pure literals, so evaluating it is equivalent to parsing it.
  return new Function(`return ${literal}`)()
}

// Settings that can't be measured by flipping them in place.
const UNPROBEABLE = {
  enabled: 'configChanged() returns early and tears down every observer',
  redirectToTwitter: 'navigates away from x.com',
  hideQuotesFrom: 'user data, not a toggle',
  mutedQuotes: 'user data, not a toggle',
  customCss: 'freeform user CSS',
  redirectTwitterLinks: 'freeform domain string',
  debug: 'debug output only',
  debugLogTimelineStats: 'debug output only',
  version: 'set by the extension, not the user',
}

module.exports = {ROOT, readDefaultConfig, UNPROBEABLE}
