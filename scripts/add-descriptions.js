/**
 * Adds the per-setting `<name>Info` descriptions to _locales/en/messages.json.
 *
 * Follows the convention already in options.html (`<p id="fullWidthContentInfo">`)
 * rather than inventing a second one - options.js injects a paragraph for any
 * control whose Info message exists, so no options.html edit is needed.
 *
 * Existing entries are never overwritten: the eight hand-written ones stay as
 * they are. Re-running only fills gaps.
 *
 * Run: node scripts/add-descriptions.js
 */
const fs = require('fs')
const path = require('path')

const MESSAGES = path.join(__dirname, '..', '_locales', 'en', 'messages.json')

// Each line answers "what happens when this is on", in the place the user will
// see it. Where a setting only acts on one surface, the description says so -
// that scoping is the single most common source of "this doesn't work" reports.
const DESCRIPTIONS = {
  // --- Timeline ---
  alwaysUseLatestTweets: 'Opens Following instead of For you every time, so the timeline stays in time order.',
  hideForYouTimeline: 'Removes the "For you" tab entirely, leaving only Following.',
  sortFollowing: 'Forces the Following timeline to sort by most recent or by popularity, by rewriting the request X makes.',
  retweets: 'Where retweets appear: mixed into the timeline, moved to their own tab, or hidden.',
  quoteTweets: 'Where quote tweets appear: mixed into the timeline, moved to their own tab, or hidden.',
  mutableQuoteTweets: 'Adds a menu item for muting quote tweets of a specific account.',
  hideSeeNewTweets: 'Removes the "Show N posts" banner that appears at the top when new posts arrive.',
  hideLiveBroadcastBar: 'Removes the live video bar pinned above the timeline.',
  hideWhoToFollowEtc: 'Removes "Who to follow", "Topics to follow" and similar suggestion sections injected between posts, and the suggestion sidebar on profiles.',
  fullWidthMedia: 'Lets images and link cards use the full timeline width too, instead of keeping their original size.',
  hideExplorePageContents: 'Strips Explore down to just the search box - no trending, no suggested posts.',
  hideMoreTweets: 'Removes the "Discover more" block appended below a post\'s replies.',
  hideMetrics: 'Hides engagement counts. The toggles below choose which ones.',
  hideAllMetrics: 'Hides every count at once, overriding the individual toggles below.',
  hideReplyMetrics: 'Hides the reply count next to the reply icon.',
  hideRetweetMetrics: 'Hides the retweet count next to the retweet icon.',
  hideQuoteTweetMetrics: 'Hides the quote count next to the quote icon.',
  hideLikeMetrics: 'Hides the like count next to the heart icon.',
  hideBookmarkMetrics: 'Hides the bookmark count next to the bookmark icon.',
  hideFollowingMetrics: 'Hides the following and follower counts on profiles.',
  hideTotalTweetsMetrics: 'Hides the post count shown under a profile name in the header.',
  hideComposeTweet: 'Removes the floating "Post" button. You can still post from the box at the top of the timeline.',
  disabledHomeTimelineRedirect: 'Which page opens instead of the home timeline.',
  fastBlock: 'Blocks immediately when you pick Block, with no confirmation dialog. There is no undo step.',
  hideUnavailableQuoteTweets: 'Removes posts whose quoted post is from an account you blocked or muted, instead of showing an empty placeholder.',
  hideProfileRetweets: 'Shows only a profile\'s own posts on its timeline, not what it retweeted.',

  // --- Interactions ---
  hideNotificationLikes: 'Keeps likes out of Notifications, so only replies, mentions and follows remain.',
  hideNotificationRetweets: 'Keeps retweets out of Notifications.',
  listRetweets: 'Whether retweets appear inside Lists. Controlled separately from the main timeline setting, from a toggle on the List itself.',
  hideSuggestedContentSearch: 'Removes suggested posts and accounts injected into search results.',
  defaultToLatestSearch: 'Opens search results on "Latest" instead of "Top", so results are in time order.',
  tweakQuoteTweetsPage: 'On the Quote Tweets page, hides the original post repeated under every quote.',
  redirectToTwitter: 'Sends x.com addresses back to twitter.com.',
  redirectChatNav: 'Makes the Chat nav item open the older Messages page instead.',

  // --- Branding ---
  hideToggleNavigation: 'Removes the control that collapses the left navigation.',
  replaceLogo: 'Puts the Twitter bird back in place of the X logo, and restores the home and messages icons that came with it.',
  darkModeTheme: 'Which dark theme to use: dim or lights out.',
  hideViews: 'Hides the view count shown under posts.',
  hideVerifiedNotificationsTab: 'Removes the "Verified" tab from Notifications and the Followers page.',
  restoreTweetSource: 'Shows which app a post was sent from. Only appears on a post\'s own page, not in the timeline.',
  restorePhotoGrid: 'Shows a post\'s photos as a grid - 2 side by side, 4 as a square - instead of a swipeable carousel.',
  addFocusedTweetAccountLocation: 'Adds the account\'s country under a post you have opened.',
  addUserHoverCardAccountLocation: 'Adds the account\'s country to the card that appears when you hover a name.',
  restoreLinkHeadlines: 'Puts the article headline back under link previews, which X reduced to a bare domain.',
  restoreQuoteTweetsLink: 'Shows the quote count as a link under a post you have opened. Only on the post\'s own page, and only if it has quotes.',
  restoreOtherInteractionLinks: 'Shows retweet and like counts as links under a post you have opened. Only on the post\'s own page.',
  sortReplies: 'Which order replies open in.',
  hideSortRepliesMenu: 'Removes the "Sort replies" control from a post\'s page.',
  twitterBlueChecks: 'What to do with paid blue checks: leave them, hide them, or replace them with a smaller badge.',
  hideTwitterBlueReplies: 'Removes replies from paid accounts you have no connection to. The toggles below add accounts back.',
  showPremiumReplyFollowing: 'Keeps replies from paid accounts you follow.',
  showPremiumReplyFollowedBy: 'Keeps replies from paid accounts that follow you.',
  showPremiumReplyBusiness: 'Keeps replies from verified Business accounts (gold check).',
  showPremiumReplyGovernment: 'Keeps replies from verified Government accounts (grey check).',
  showBlueReplyFollowersCount: 'Keeps replies from paid accounts above the follower count set below.',
  showBlueReplyFollowersCountAmount: 'The follower count a paid account needs for its replies to be kept.',
  hideTwitterBlueUpsells: 'Removes prompts to subscribe to Premium.',
  hideGrokNav: 'Removes the Grok item from the left navigation.',
  hideGrokTweets: 'Removes posts that share a Grok conversation link.',
  hideEditImage: 'Removes the Grok \'Edit image\' links that X adds to photos in posts and to profile settings.',
  hideJobsNav: 'Removes the Jobs item from the left navigation. Only appears on accounts that have it.',
  hideSubscriptions: 'Removes everything to do with paid subscriptions: Subscribe buttons on profiles and posts, the Subscriptions tab and count, the Subscribe menu items, and the subscriber badge on replies.',

  // --- Appearance ---
  dontUseChirpFont: 'Uses the system font instead of X\'s Chirp typeface.',
  disableTweetTextFormatting: 'Renders bold and italic markup in posts as plain text.',
  navBaseFontSize: 'Uses normal-sized text in the left navigation rather than X\'s larger size.',
  navDensity: 'How much vertical space each left navigation item takes.',
  dropdownMenuFontWeight: 'Uses normal weight instead of bold for menu items.',
  uninvertFollowButtons: 'Swaps the Follow and Following button styles back, so Follow is the filled one.',
  followButtonStyle: 'Whether Follow buttons use one flat colour or pick up the current theme colour.',
  bypassAgeVerification: 'Skips the age check prompt. Changes no visible markup.',
  unblurSensitiveContent: 'Shows media marked sensitive without the click-through blur.',
  hideSidebarContent: 'Hides the whole right-hand sidebar. The toggles below hide individual blocks instead.',
  hideLiveBroadcasts: 'Removes the live video block from the sidebar.',
  hideTodaysNews: 'Removes the news block from the sidebar.',
  hideWhatsHappening: 'Removes the trends block from the sidebar.',
  hideSuggestedFollows: 'Removes the "Who to follow" block from the sidebar.',
  showRelevantPeople: 'Keeps the "Relevant people" block when you open a post, even with the sidebar hidden.',

  // --- Hide UI items ---
  hideBookmarkButton: 'Removes the bookmark icon from the row under posts.',
  showBookmarkButtonUnderFocusedTweets: 'Keeps the bookmark icon on a post you have opened, even though it is hidden in the timeline.',
  hideShareTweetButton: 'Removes the share icon from the row under posts.',
  hideViewActivityLinks: 'Removes the \'View post engagements\' link under your own posts, and the matching menu item.',
  hideTimelineTweetBox: 'Removes the "What is happening?" box at the top of the home timeline.',
  hideAccountSwitcher: 'Removes the account name and avatar at the bottom of the left navigation.',
  hideMessagesDrawer: 'Removes the messages panel docked in the bottom right corner.',
  hideExploreNav: 'Removes Explore from the navigation.',
  hideExploreNavWithSidebar: 'Brings Explore back when the sidebar is hidden, since search lives there otherwise.',
  hideMessagesBottomNavItem: 'Removes Messages from the navigation.',
  hideChatNav: 'Removes Chat from the navigation.',
  hideAdsNav: 'Removes Ads from the navigation. Only appears on accounts that have it.',
  hideSpacesNav: 'Removes Spaces from the navigation.',

  // --- Navigation & menus ---
  addAddMutedWordMenuItem: "Adds an \"Add muted word\" shortcut to the More menu, so muting a word takes one step instead of a trip through Settings.",
  hideInlinePrompts: "Removes the prompts X injects between posts - follow suggestions, \"complete your profile\" and similar.",
  hideNotifications: "What to do with the notification count: leave it, hide just the badge, or hide notifications entirely. Also applies to the browser tab icon.",
  hideBookmarksNav: "Removes Bookmarks from the navigation.",
  hideBusinessNav: "Removes Business from the navigation. Only appears on accounts that have it.",
  hideCommunitiesNav: "Removes Communities from the navigation.",
  hideConnectNav: "Removes the Follow / Connect item from the navigation.",
  hideCreatorStudioNav: "Removes Creator Studio from the navigation. Only appears on accounts that have it.",
  hideListsNav: "Removes Lists from the navigation.",

  // --- Diagnostics ---
  debugLogTimelineStats: 'Logs a per-timeline breakdown of what was hidden to the console.',
}

let messages = JSON.parse(fs.readFileSync(MESSAGES, 'utf8'))
let added = []
let skipped = []

for (let [key, message] of Object.entries(DESCRIPTIONS)) {
  let id = `${key}Info`
  if (messages[id]) { skipped.push(id); continue }
  messages[id] = {message}
  added.push(id)
}

// Sorted so the file stays diffable as entries accumulate.
let sorted = Object.fromEntries(Object.keys(messages).sort().map(k => [k, messages[k]]))
fs.writeFileSync(MESSAGES, JSON.stringify(sorted, null, 2) + '\n')

console.log(`  added ${added.length}, left alone ${skipped.length}`)
if (skipped.length) console.log(`  existing: ${skipped.join(', ')}`)
