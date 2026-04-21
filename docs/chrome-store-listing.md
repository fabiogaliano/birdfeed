Tagline: You decide what the bird eats.

---

Birdfeed — you decide what the bird eats.

A browser extension that gives you back control of your Twitter/X experience: less noise, more signal. Default to the chronological feed, hide the global algorithm, undo the X-era clutter, and keep only the UI you actually want to use. Open the options, flip the switches you care about, and the page updates instantly. Every feature below is a toggle.

Birdfeed is an actively maintained continuation of Control Panel for Twitter by @insin, which is only getting sporadic updates. For now, all original features are preserved, and fixes ship as Twitter/X breaks things and I notice with my usage.

Your timeline, your rules
• Default to "Following" (chronological) 
• Hide "For you", "Who to follow", "Discover more", inline prompts, and the "See new Tweets" nag
• Split retweets and quote tweets into their own tabs, or hide them entirely
• Mute quote tweets, hide replies to blocked/muted accounts, default Search to "Latest"
• Go full-width by hiding the sidebar

Undo the X era
• Redirect x.com → twitter.com
• Replace X branding, restore the old Quote Tweet and link layouts under posts
• Hide Grok, Jobs, Subscriptions, Premium upsells, blue-check replies, and view counts
• Swap Premium checks for the old Twitter Blue logo, or hide them

Calm the UI
• Drop the Chirp font, bold/italic tweet text, and the inverted Follow button
• Compact navigation, normal-weight menus, unblurred sensitive content

Use X less, on purpose
• Hide metrics, the compose button, notification badges, or the entire home timeline
• "Reduced interaction" mode: replies are the only way to engage
• Trim anything else you don't use — bookmarks, share, messages, communities, account switcher

Fast blocking, an "Add muted word" shortcut, and a dozen smaller fixes are in there too.

Attribution
Birdfeed is built on the work of @insin and all original Control Panel for Twitter contributors.

TWITTER, TWEET, and RETWEET are trademarks of Twitter Inc. or its affiliates.

===============================================================================
CHROME WEB STORE — PRIVACY / PERMISSIONS FORM
===============================================================================

Single purpose

Birdfeed customizes the Twitter/X web interface, letting users hide algorithmic content, default to the chronological feed, and remove UI elements they don't want to see.

---

Storage justification

Birdfeed uses chrome.storage to persist the user's configuration — the set of toggles they have enabled (for example, whether to default to the "Following" tab, hide "For you", hide Grok, etc.). Without persistent storage, every preference would reset on page reload and the extension would be unusable. Storage is also used to sync these preferences across the user's own browser profile when Chrome sync is enabled. Only a small JSON object of boolean and enum preference values is written. Birdfeed does not store any personal data, browsing history, account information, tweet content, or any data fetched from Twitter/X. Storage access is strictly scoped to the user's own configuration for the single purpose of customizing the Twitter/X interface.

---

Host permission justification

Birdfeed's single purpose is to modify the Twitter/X web interface (hide algorithmic content, default to the chronological feed, toggle off unwanted UI elements). To do that, its content script must run on the exact pages Twitter/X serves its web UI from. The requested host permissions are limited to the four domains where that UI lives: https://twitter.com/*, https://mobile.twitter.com/*, https://x.com/*, and https://mobile.x.com/*. The x.com hosts are required because Twitter rebranded to X and now serves the same UI from x.com; the mobile.* hosts are required because the mobile web experience is served from a separate subdomain. Birdfeed does not request access to any other domain, does not make cross-origin requests to external servers, and does not read or modify content on non-Twitter/X pages.

---

Remote code

Answer: No, I am not using Remote code.
