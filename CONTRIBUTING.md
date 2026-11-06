# Development of Birdfeed

## Debug mode

To enable debug mode, you can either manually set `debug = true` at the top of `script.js`, or open the options page and click the version number at the bottom 5 times to view debug options, where you can enable debug mode.

When debug mode is active, log statemente are displayed in the browser console and the detected type of each tweet is displayed in all supported timelines where the tweet type is being detected.

There's a `log()` function which can and should be used to log useful debug information, such as the appearance of elements which trigger certain tweaks (useful as a starting point when Twitter changes things), or that a particular tweak is about to happen (for traceability).

## Desktop vs. mobile

At the time of writing, the [current version of Twitter](https://blog.twitter.com/engineering/en_us/topics/infrastructure/2019/buildingthenewtwitter) uses the same webapp to provide different experiences for desktop and mobile devices.

Some of the tweaks in Birdfeed work the same in both versions, but others need a different implementation or CSS selector for each version, or aren't present in one of the versions at all.

To handle this, scripts in the extension have `mobile` and `desktop` flags which are used to tailor what they do according to version of Twitter being used.

### Developing mobile features

If you want to test a feature in the mobile version, use the responsive design / mobile device simulation mode in your browser's developer tools. Birdfeed will automatically detect which version is being used, and the options page will also be updated accordingly the next time you open it.

## Coding conventions

### Types

Birdfeed is written in regular JavaScript, leveraging TypeScript's support for [type checking JavaScript files](https://www.typescriptlang.org/docs/handbook/type-checking-javascript-files.html) with [type annotations provided via JSDoc](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html), and [VS Code](https://code.visualstudio.com/)'s support for using its built-in TypeScript tooling in regular JavaScript, configured via `jsconfig.json`.

> Type checking should work out of the box if you use VS Code - if it doesn't, use the **Preference: Open Settings (JSON)** command in the Command Palette and check your global preferences for any config changes which might affect this.

## Releasing

1. As changes land, describe them under `## Unreleased` in `CHANGELOG.md`.
2. Run `pnpm run release patch|minor|major`. It moves the Unreleased notes under the new version, bumps the version in the manifests and the Safari project, commits, tags and pushes. It refuses to run if Unreleased is empty.
3. The pushed tag starts `.github/workflows/release.yml`, which builds both zips, creates the GitHub release with the changelog entry as its notes, and submits the MV3 zip to the Chrome Web Store. The update goes live once Google's review passes.

The workflow signs in to the Chrome Web Store as the `cws-publisher` service account in the `birdfeed-publish-6113` Google Cloud project via Workload Identity Federation, so the repo holds no keys. The IDs it needs are repository variables (`CWS_*`). That service account is registered under Settings → Service account in the Chrome Web Store developer dashboard.

To submit a build by hand: `CWS_ACCESS_TOKEN=$(gcloud auth print-access-token --impersonate-service-account=cws-publisher@birdfeed-publish-6113.iam.gserviceaccount.com --scopes=https://www.googleapis.com/auth/chromewebstore) CWS_PUBLISHER_ID=8ac1dfcd-1708-4800-9638-10dd41a39c3b CWS_EXTENSION_ID=njobnbaideimpbcekljdgecnbpkmoplm node scripts/publish-chrome.js web-ext-artifacts/birdfeed-<version>.mv3.zip`
