/**
 * Uploads a build to the Chrome Web Store and submits it for review, using the
 * Chrome Web Store API v2. It goes live automatically once review passes.
 *
 * Env:
 *   CWS_ACCESS_TOKEN  OAuth token with the chromewebstore scope. CI gets one from
 *                     the publisher service account via Workload Identity
 *                     Federation; locally:
 *                       gcloud auth print-access-token \
 *                         --impersonate-service-account=<service account> \
 *                         --scopes=https://www.googleapis.com/auth/chromewebstore
 *   CWS_PUBLISHER_ID, CWS_EXTENSION_ID
 *
 * Run: node scripts/publish-chrome.js web-ext-artifacts/birdfeed-<version>.mv3.zip
 */
const fs = require('fs')

const {CWS_ACCESS_TOKEN, CWS_PUBLISHER_ID, CWS_EXTENSION_ID} = process.env
const zipPath = process.argv[2]

if (!CWS_ACCESS_TOKEN || !CWS_PUBLISHER_ID || !CWS_EXTENSION_ID || !zipPath) {
  console.error('Needs CWS_ACCESS_TOKEN, CWS_PUBLISHER_ID, CWS_EXTENSION_ID and a zip path')
  process.exit(1)
}

const ITEM = `publishers/${CWS_PUBLISHER_ID}/items/${CWS_EXTENSION_ID}`
const headers = {Authorization: `Bearer ${CWS_ACCESS_TOKEN}`}

async function call(url, options = {}) {
  let response = await fetch(url, {...options, headers: {...headers, ...options.headers}})
  let body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${url} → ${response.status}\n${JSON.stringify(body, null, 2)}`)
  }
  return body
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function main() {
  console.log(`Uploading ${zipPath}`)
  let upload = await call(`https://chromewebstore.googleapis.com/upload/v2/${ITEM}:upload`, {
    method: 'POST',
    headers: {'Content-Type': 'application/zip'},
    body: fs.readFileSync(zipPath),
  })
  let state = upload.uploadState

  // Large uploads are processed asynchronously
  for (let attempt = 0; /IN_PROGRESS/.test(state) && attempt < 30; attempt++) {
    await sleep(5000)
    let status = await call(`https://chromewebstore.googleapis.com/v2/${ITEM}:fetchStatus`)
    state = status.lastAsyncUploadState
  }
  if (state != 'SUCCEEDED') {
    throw new Error(`Upload did not succeed: ${JSON.stringify(upload, null, 2)}\nlast state: ${state}`)
  }
  console.log(`Uploaded version ${upload.crxVersion ?? ''}`.trim())

  let published = await call(`https://chromewebstore.googleapis.com/v2/${ITEM}:publish`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({publishType: 'DEFAULT_PUBLISH'}),
  })
  console.log(`Submitted for review: ${published.state}`)
  if (published.warningInfo) {
    console.log('Warnings:', JSON.stringify(published.warningInfo, null, 2))
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
