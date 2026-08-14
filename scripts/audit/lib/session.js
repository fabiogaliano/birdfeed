const fs = require('fs')
const path = require('path')

const {ROOT} = require('./default-config')

const AUTH_PATH = path.join(ROOT, '.x-auth.json')

const TEMPLATE = {
  auth_token: '',
  ct0: '',
}

// X blocks the login flow itself, not the resulting session, so the harness
// never logs in - it presents cookies lifted from a browser already signed in.
function readAuth() {
  if (!fs.existsSync(AUTH_PATH)) {
    fs.writeFileSync(AUTH_PATH, JSON.stringify(TEMPLATE, null, 2))
    fs.chmodSync(AUTH_PATH, 0o600)
    throw new Error(
      `No session yet. Created ${path.relative(ROOT, AUTH_PATH)} - fill it in:\n\n` +
      `  1. Open a tab where you're logged into X\n` +
      `  2. DevTools > Application > Cookies > https://x.com\n` +
      `  3. Copy the "auth_token" and "ct0" values into that file\n\n` +
      `The file is gitignored and chmod 600. It is your account - don't share it.`
    )
  }

  let auth = JSON.parse(fs.readFileSync(AUTH_PATH, 'utf8'))
  for (let key of Object.keys(TEMPLATE)) {
    if (!auth[key]) throw new Error(`${path.relative(ROOT, AUTH_PATH)} is missing "${key}"`)
  }

  let mode = fs.statSync(AUTH_PATH).mode & 0o777
  if (mode & 0o077) fs.chmodSync(AUTH_PATH, 0o600)

  return auth
}

function authCookies(auth) {
  let base = {domain: '.x.com', path: '/', secure: true, sameSite: 'None'}
  return [
    {...base, name: 'auth_token', value: auth.auth_token, httpOnly: true},
    // ct0 is the CSRF token; the app reads it from JS, so it can't be httpOnly
    {...base, name: 'ct0', value: auth.ct0, httpOnly: false},
  ]
}

module.exports = {AUTH_PATH, readAuth, authCookies}
