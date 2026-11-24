void function() {

// X's web client was rewritten (TanStack Router + React 19 + Relay + Tailwind
// + Base UI) in late 2026. Nothing from the React Native Web client survived:
// no #react-root, no #layers, no Redux store and almost no data-testid. This
// script is built on what the new client exposes instead, in this order of
// preference:
//   1. GraphQL responses, filtered in a fetch() wrapper before Relay sees
//      them - timeline entries removed here never render, so there are no
//      gaps in the virtualized list and nothing to re-hide on scroll.
//   2. Icon names (svg[data-icon], use[href="#icon-…"]) and semantic data-*
//      attributes, which don't change with the UI language.
//   3. hrefs.
// Labels and headings are localised, so they are a last resort.
// See docs/tmp/new-client/ for the investigation this is based on.

let debug = false

/** @type {boolean} */
let desktop = true
/** @type {boolean} */
let mobile = false
let isSafari = navigator.userAgent.includes('Safari/') && !/Chrom(e|ium)\//.test(navigator.userAgent)

const $html = document.documentElement
/** @type {string} */
let lang = $html.lang || 'en'
/** @type {string} */
let dir = $html.dir || 'ltr'
/** @type {boolean} */
let ltr = dir == 'ltr'

//#region Default config
/**
 * @type {import("./types").Config}
 */
const config = {
  enabled: true,
  debug: false,
  debugLogTimelineStats: false,
  // Shared
  addAddMutedWordMenuItem: true,
  addFocusedTweetAccountLocation: false,
  alwaysUseLatestTweets: true,
  bypassAgeVerification: true,
  defaultToLatestSearch: false,
  disableHomeTimeline: false,
  disabledHomeTimelineRedirect: 'notifications',
  disableTweetTextFormatting: false,
  dontUseChirpFont: false,
  dropdownMenuFontWeight: true,
  fastBlock: true,
  followButtonStyle: 'monochrome',
  hideAdsNav: true,
  hideBookmarkButton: false,
  hideBookmarkMetrics: true,
  hideBookmarksNav: false,
  hideBusinessNav: true,
  hideCallsNav: true,
  hideChatNav: false,
  hideCommunitiesNav: false,
  hideComposeTweet: false,
  hideCreatorStudioNav: true,
  hideEditImage: true,
  hideExplorePageContents: true,
  hideFollowingMetrics: true,
  hideForYouTimeline: true,
  hideGrokNav: true,
  hideGrokTweets: false,
  hideInlinePrompts: true,
  hideLikeMetrics: true,
  hideListsNav: false,
  hideMetrics: false,
  hideMoreTweets: true,
  hideNotificationLikes: false,
  hideNotificationRetweets: false,
  hideNotifications: 'ignore',
  hideProfileRetweets: false,
  hideQuoteTweetMetrics: true,
  hideQuotesFrom: [],
  hideReplyMetrics: true,
  hideRetweetMetrics: true,
  hideSeeNewTweets: false,
  hideShareTweetButton: false,
  hideSortRepliesMenu: false,
  hideSubscriptions: true,
  hideSuggestedContentSearch: true,
  hideTotalTweetsMetrics: true,
  hideTwitterBlueReplies: false,
  hideTwitterBlueUpsells: true,
  hideUnavailableQuoteTweets: true,
  hideVerifiedNotificationsTab: true,
  hideViewActivityLinks: true,
  hideViews: true,
  hideWhoToFollowEtc: true,
  listRetweets: 'ignore',
  mutableQuoteTweets: true,
  mutedQuotes: [],
  oneClickBlockButton: true,
  oneClickMuteButton: true,
  quoteTweets: 'ignore',
  reducedInteractionMode: false,
  replaceLogo: true,
  restoreOtherInteractionLinks: true,
  restorePhotoGrid: true,
  retweets: 'separate',
  showBlueReplyFollowersCount: false,
  showBlueReplyFollowersCountAmount: '1000000',
  showBookmarkButtonUnderFocusedTweets: true,
  showPremiumReplyBusiness: true,
  showPremiumReplyFollowedBy: true,
  showPremiumReplyFollowing: true,
  showPremiumReplyGovernment: true,
  sortFollowing: 'mostRecent',
  sortReplies: 'relevant',
  tweakQuoteTweetsPage: true,
  twitterBlueChecks: 'replace',
  unblurSensitiveContent: false,
  uninvertFollowButtons: true,
  unwrapTcoLinks: false,
  // Experiments
  customCss: '',
  // Desktop only
  addUserHoverCardAccountLocation: true,
  fullWidthContent: false,
  fullWidthMedia: true,
  hideAccountSwitcher: false,
  hideExploreNav: true,
  hideExploreNavWithSidebar: true,
  hideLiveBroadcasts: false,
  hideMessagesDrawer: true,
  hideSidebarContent: true,
  hideSpacesNav: false,
  hideSuggestedFollows: false,
  hideTimelineTweetBox: false,
  hideTodaysNews: false,
  hideWhatsHappening: false,
  navBaseFontSize: true,
  navDensity: 'default',
  showRelevantPeople: false,
  // Mobile only
  hideLiveBroadcastBar: false,
  hideMessagesBottomNavItem: false,
  preventNextVideoAutoplay: true,
}
//#endregion

//#region Locales
/**
 * @type {Record<string, import("./types").Locale>}
 */
const locales = {
  'ar-x-fm': {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'الحساب موجود في ' + e.country
    },
    ADD_ANOTHER_TWEET: 'ضافة تغريدة أخرى',
    ADD_MUTED_WORD: 'اضافة كلمة مكتومة',
    GROK_ACTIONS: 'إجراءات Grok',
    HOME: 'الرئيسيّة',
    LIKES: 'الإعجابات',
    LIVE_ON_X: 'بث مباشر على X',
    MESSAGES: 'الرسائل',
    MOST_RELEVANT: 'الأكثر ملائمة',
    MUTE_THIS_CONVERSATION: 'كتم هذه المحادثه',
    POST_ALL: 'نشر الكل',
    POST_UNAVAILABLE: 'هذا المنشور غير متاح.',
    PROFILE_SUMMARY: 'ملخص الملف الشخصيّ',
    QUOTES: 'اقتباسات',
    QUOTE_TWEET: 'اقتباس التغريدة',
    QUOTE_TWEETS: 'تغريدات اقتباس',
    RECENT: 'الحديثة',
    REPOST: 'إعادة النشر',
    REPOSTS: 'المنشورات المُعاد نشرها',
    RETWEET: 'إعادة التغريد',
    RETWEETED_BY: 'مُعاد تغريدها بواسطة',
    RETWEETS: 'إعادات التغريد',
    SHARED: 'مشترك',
    SHARED_TWEETS: 'التغريدات المشتركة',
    SHOW: 'إظهار',
    SHOW_MORE_REPLIES: 'عرض المزيد من الردود',
    SORT_BY: 'فرز حسب',
    SORT_REPLIES: 'فرز الردود',
    TURN_OFF_QUOTE_TWEETS: 'تعطيل تغريدات اقتباس',
    TURN_OFF_RETWEETS: 'تعطيل إعادة التغريد',
    TURN_ON_RETWEETS: 'تفعيل إعادة التغريد',
    TWEET: 'غرّدي',
    TWEETS: 'التغريدات',
    TWEET_ALL: 'تغريد الكل',
    TWEET_INTERACTIONS: 'تفاعلات التغريدة',
    TWEET_YOUR_REPLY: 'التغريد بردك',
    TWITTER: 'تويتر',
    UNDO_RETWEET: 'التراجع عن التغريدة',
    VIEW: 'عرض',
    WHATS_HAPPENING: 'ماذا يحدث؟',
  },
  ar: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'الحساب موجود في ' + e.country
    },
    ADD_ANOTHER_TWEET: 'ضافة تغريدة أخرى',
    ADD_MUTED_WORD: 'اضافة كلمة مكتومة',
    GROK_ACTIONS: 'إجراءات Grok',
    HOME: 'الرئيسيّة',
    LIKES: 'الإعجابات',
    LIVE_ON_X: 'بث مباشر على X',
    MESSAGES: 'الرسائل',
    MOST_RELEVANT: 'الأكثر ملائمة',
    MUTE_THIS_CONVERSATION: 'كتم هذه المحادثه',
    POST_ALL: 'نشر الكل',
    POST_UNAVAILABLE: 'هذا المنشور غير متاح.',
    PROFILE_SUMMARY: 'ملخص الملف الشخصيّ',
    QUOTE: 'اقتباس',
    QUOTES: 'اقتباسات',
    QUOTE_TWEET: 'اقتباس التغريدة',
    QUOTE_TWEETS: 'تغريدات اقتباس',
    RECENT: 'الحديثة',
    RELEVANT: 'ذو صلة',
    REPOST: 'إعادة النشر',
    REPOSTS: 'المنشورات المُعاد نشرها',
    RETWEET: 'إعادة التغريد',
    RETWEETED_BY: 'مُعاد تغريدها بواسطة',
    RETWEETS: 'إعادات التغريد',
    SHARED: 'مشترك',
    SHARED_TWEETS: 'التغريدات المشتركة',
    SHOW: 'إظهار',
    SHOW_MORE_REPLIES: 'عرض المزيد من الردود',
    SORT_BY: 'فرز حسب',
    SORT_REPLIES: 'فرز الردود',
    TURN_OFF_QUOTE_TWEETS: 'تعطيل تغريدات اقتباس',
    TURN_OFF_RETWEETS: 'تعطيل إعادة التغريد',
    TURN_ON_RETWEETS: 'تفعيل إعادة التغريد',
    TWEET: 'تغريد',
    TWEETS: 'التغريدات',
    TWEET_ALL: 'تغريد الكل',
    TWEET_INTERACTIONS: 'تفاعلات التغريدة',
    TWEET_YOUR_REPLY: 'التغريد بردك',
    UNDO_RETWEET: 'التراجع عن التغريدة',
    VIEW: 'عرض',
    WHATS_HAPPENING: 'ماذا يحدث؟',
  },
  bg: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Профил, базиран в/ъв ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Добавяне на друг туит',
    ADD_MUTED_WORD: 'Добавяне на заглушена дума',
    GROK_ACTIONS: 'Действия, свързани с Grok',
    HOME: 'Начало',
    LIKES: 'Харесвания',
    LIVE_ON_X: 'На живо в X',
    MESSAGES: 'Съобщения',
    MOST_RELEVANT: 'Най-подходящи',
    MUTE_THIS_CONVERSATION: 'Заглушаване на разговора',
    POST_ALL: 'Публикуване на всичко',
    POST_UNAVAILABLE: 'Тази публикация не е налична.',
    PROFILE_SUMMARY: 'Резюме на профила',
    QUOTE: 'Цитат',
    QUOTES: 'Цитати',
    QUOTE_TWEET: 'Цитиране на туита',
    QUOTE_TWEETS: 'Туитове с цитат',
    RECENT: 'Скорошни',
    RELEVANT: 'Уместно',
    REPOST: 'Препубликуване',
    REPOSTS: 'Препубликувания',
    RETWEET: 'Ретуитване',
    RETWEETED_BY: 'Ретуитнат от',
    RETWEETS: 'Ретуитове',
    SHARED: 'Споделен',
    SHARED_TWEETS: 'Споделени туитове',
    SHOW: 'Показване',
    SHOW_MORE_REPLIES: 'Показване на още отговори',
    SORT_BY: 'Сортиране по',
    SORT_REPLIES: 'Сортиране на отговорите',
    TURN_OFF_QUOTE_TWEETS: 'Изключване на туитове с цитат',
    TURN_OFF_RETWEETS: 'Изключване на ретуитовете',
    TURN_ON_RETWEETS: 'Включване на ретуитовете',
    TWEET: 'Туит',
    TWEETS: 'Туитове',
    TWEET_ALL: 'Туитване на всички',
    TWEET_INTERACTIONS: 'Интеракции с туит',
    TWEET_YOUR_REPLY: 'туит своя отговор',
    UNDO_RETWEET: 'Отмяна на ретуитването',
    VIEW: 'Преглед',
    WHATS_HAPPENING: 'Какво се случва?',
  },
  bn: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return e.country + '-এর ওপর ভিত্তি করে অ্যাকাউন্ট'
    },
    ADD_ANOTHER_TWEET: 'অন্য টুইট যোগ করুন',
    ADD_MUTED_WORD: 'নীরব করা শব্দ যোগ করুন',
    GROK_ACTIONS: 'Grok কার্যকলাপ',
    HOME: 'হোম',
    LIKES: 'পছন্দ',
    LIVE_ON_X: 'X-এ লাইভ',
    MESSAGES: 'বার্তাগুলি',
    MOST_RELEVANT: 'সবচেয়ে প্রাসঙ্গিক',
    MUTE_THIS_CONVERSATION: 'এই কথা-বার্তা নীরব করুন',
    POST_ALL: 'সবকটি পোস্ট করুন',
    POST_UNAVAILABLE: 'এই পোস্টটি অনুপলভ্য।',
    PROFILE_SUMMARY: 'প্রোফাইল সারসংক্ষেপ',
    QUOTE: 'উদ্ধৃতি',
    QUOTES: 'উদ্ধৃতিগুলো',
    QUOTE_TWEET: 'টুইট উদ্ধৃত করুন',
    QUOTE_TWEETS: 'টুইট উদ্ধৃতিগুলো',
    RECENT: 'সাম্প্রতিক',
    RELEVANT: 'প্রাসঙ্গিক',
    REPOST: 'রিপোস্ট',
    REPOSTS: 'রিপোস্ট',
    RETWEET: 'পুনঃটুইট',
    RETWEETED_BY: 'পুনঃ টুইট করেছেন',
    RETWEETS: 'পুনঃটুইটগুলো',
    SHARED: 'ভাগ করা',
    SHARED_TWEETS: 'ভাগ করা টুইটগুলি',
    SHOW: 'দেখান',
    SHOW_MORE_REPLIES: 'আরও উত্তর দেখান',
    SORT_BY: 'ক্রমানুসার',
    SORT_REPLIES: 'উত্তরগুলো বাছুন',
    TURN_OFF_QUOTE_TWEETS: 'উদ্ধৃতি টুইটগুলি বন্ধ করুন',
    TURN_OFF_RETWEETS: 'পুনঃ টুইটগুলি বন্ধ করুন',
    TURN_ON_RETWEETS: 'পুনঃ টুইটগুলি চালু করুন',
    TWEET: 'টুইট',
    TWEETS: 'টুইটগুলি',
    TWEET_ALL: 'সব টুইট করুন',
    TWEET_INTERACTIONS: 'টুইট ইন্টারেকশন',
    TWEET_YOUR_REPLY: 'আপনার উত্তর টুইট করুন',
    TWITTER: 'টুইটার',
    UNDO_RETWEET: 'পুনঃ টুইট পুর্বাবস্থায় ফেরান',
    VIEW: 'দেখুন',
    WHATS_HAPPENING: 'কি খবর?',
  },
  ca: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Compte ubicat a ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Afegeix un altre tuit',
    ADD_MUTED_WORD: 'Afegeix una paraula silenciada',
    GROK_ACTIONS: 'Accions de Grok',
    HOME: 'Inici',
    LIKES: 'Agradaments',
    LIVE_ON_X: 'En directe a X',
    MESSAGES: 'Missatges',
    MOST_RELEVANT: 'El més rellevant',
    MUTE_THIS_CONVERSATION: 'Silencia la conversa',
    POST_ALL: 'Publica-ho tot',
    POST_UNAVAILABLE: 'Aquesta publicació no està disponible.',
    PROFILE_SUMMARY: 'Resum del perfil',
    QUOTE: 'Cita',
    QUOTES: 'Cites',
    QUOTE_TWEET: 'Cita el tuit',
    QUOTE_TWEETS: 'Tuits amb cita',
    RECENT: 'Recents',
    RELEVANT: 'Rellevant',
    REPOST: 'Republicació',
    REPOSTS: 'Republicacions',
    RETWEET: 'Retuit',
    RETWEETED_BY: 'Retuitat per',
    RETWEETS: 'Retuits',
    SHARED: 'Compartit',
    SHARED_TWEETS: 'Tuits compartits',
    SHOW: 'Mostra',
    SHOW_MORE_REPLIES: 'Mostra més respostes',
    SORT_BY: 'Ordena per',
    SORT_REPLIES: 'Ordena les respostes',
    TURN_OFF_QUOTE_TWEETS: 'Desactiva els tuits amb cita',
    TURN_OFF_RETWEETS: 'Desactiva els retuits',
    TURN_ON_RETWEETS: 'Activa els retuits',
    TWEET: 'Tuita',
    TWEETS: 'Tuits',
    TWEET_ALL: 'Tuita-ho tot',
    TWEET_INTERACTIONS: 'Interaccions amb tuits',
    TWEET_YOUR_REPLY: 'Tuita la teva resposta',
    UNDO_RETWEET: 'Desfés el retuit',
    VIEW: 'Mostra',
    WHATS_HAPPENING: 'Què passa?',
  },
  cs: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Účet založen v ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Přidat další Tweet',
    ADD_MUTED_WORD: 'Přidat slovo na seznam skrytých slov',
    GROK_ACTIONS: 'Akce funkce Grok',
    HOME: 'Hlavní stránka',
    LIKES: 'Lajky',
    LIVE_ON_X: 'Živě na platformě X',
    MESSAGES: 'Zprávy',
    MOST_RELEVANT: 'Nejvíce související',
    MUTE_THIS_CONVERSATION: 'Skrýt tuto konverzaci',
    POST_ALL: 'Postovat vše',
    POST_UNAVAILABLE: 'Tento post není dostupný.',
    PROFILE_SUMMARY: 'Souhrn profilu',
    QUOTE: 'Citace',
    QUOTES: 'Citace',
    QUOTE_TWEET: 'Citovat Tweet',
    QUOTE_TWEETS: 'Tweety s citací',
    RECENT: 'Poslední',
    RELEVANT: 'Související',
    REPOSTS: 'Reposty',
    RETWEET: 'Retweetnout',
    RETWEETED_BY: 'Retweetnuto uživateli',
    RETWEETS: 'Retweety',
    SHARED: 'Sdílený',
    SHARED_TWEETS: 'Sdílené tweety',
    SHOW: 'Zobrazit',
    SHOW_MORE_REPLIES: 'Zobrazit další odpovědi',
    SORT_BY: 'Seřadit podle',
    SORT_REPLIES: 'Seřadit odpovědi',
    TURN_OFF_QUOTE_TWEETS: 'Vypnout tweety s citací',
    TURN_OFF_RETWEETS: 'Vypnout retweety',
    TURN_ON_RETWEETS: 'Zapnout retweety',
    TWEET: 'Tweetovat',
    TWEETS: 'Tweety',
    TWEET_ALL: 'Tweetnout vše',
    TWEET_INTERACTIONS: 'Tweetovat interakce',
    TWEET_YOUR_REPLY: 'Tweetujte svou odpověď',
    UNDO_RETWEET: 'Zrušit Retweet',
    VIEW: 'Zobrazit',
    WHATS_HAPPENING: 'Co se děje?',
  },
  da: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Konto baseret i ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Tilføj endnu et Tweet',
    ADD_MUTED_WORD: 'Tilføj skjult ord',
    GROK_ACTIONS: 'Grok-handlinger',
    HOME: 'Forside',
    LIVE_ON_X: 'Direkte på X',
    MESSAGES: 'Beskeder',
    MOST_RELEVANT: 'Mest relevante',
    MUTE_THIS_CONVERSATION: 'Skjul denne samtale',
    POST_ALL: 'Post alle',
    POST_UNAVAILABLE: 'Denne post er ikke tilgængelig.',
    PROFILE_SUMMARY: 'Profilresumé',
    QUOTE: 'Citat',
    QUOTES: 'Citater',
    QUOTE_TWEET: 'Citér Tweet',
    QUOTE_TWEETS: 'Citat-Tweets',
    RECENT: 'Nye',
    RETWEETED_BY: 'Retweetet af',
    SHARED: 'Delt',
    SHARED_TWEETS: 'Delte tweets',
    SHOW: 'Vis',
    SHOW_MORE_REPLIES: 'Vis flere svar',
    SORT_BY: 'Sorter efter',
    SORT_REPLIES: 'Sortér svar',
    TURN_OFF_QUOTE_TWEETS: 'Slå Citat-Tweets fra',
    TURN_OFF_RETWEETS: 'Slå Retweets fra',
    TURN_ON_RETWEETS: 'Slå Retweets til',
    TWEET_ALL: 'Tweet alt',
    TWEET_INTERACTIONS: 'Tweet-interaktioner',
    TWEET_YOUR_REPLY: 'Tweet dit svar',
    UNDO_RETWEET: 'Fortryd Retweet',
    VIEW: 'Vis',
    WHATS_HAPPENING: 'Hvad sker der?',
  },
  de: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Account befindet sich in ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Weiteren Tweet hinzufügen',
    ADD_MUTED_WORD: 'Stummgeschaltetes Wort hinzufügen',
    GROK_ACTIONS: 'Grok-Aktionen',
    HOME: 'Startseite',
    LIKES: 'Gefällt mir',
    LIVE_ON_X: 'Live auf X',
    MESSAGES: 'Nachrichten',
    MOST_RELEVANT: 'Besonders relevant',
    MUTE_THIS_CONVERSATION: 'Diese Konversation stummschalten',
    POST_ALL: 'Alle posten',
    POST_UNAVAILABLE: 'Dieser Post ist nicht verfügbar.',
    PROFILE_SUMMARY: 'Kurzprofil',
    QUOTE: 'Zitat',
    QUOTES: 'Zitate',
    QUOTE_TWEET: 'Tweet zitieren',
    QUOTE_TWEETS: 'Zitierte Tweets',
    RECENT: 'Neueste',
    REPOST: 'Reposten',
    RETWEET: 'Retweeten',
    RETWEETED_BY: 'Retweetet von',
    SHARED: 'Geteilt',
    SHARED_TWEETS: 'Geteilte Tweets',
    SHOW: 'Anzeigen',
    SHOW_MORE_REPLIES: 'Mehr Antworten anzeigen',
    SORT_BY: 'Sortieren nach',
    SORT_REPLIES: 'Antworten sortieren',
    TURN_OFF_QUOTE_TWEETS: 'Zitierte Tweets ausschalten',
    TURN_OFF_RETWEETS: 'Retweets ausschalten',
    TURN_ON_RETWEETS: 'Retweets einschalten',
    TWEET: 'Twittern',
    TWEET_ALL: 'Alle twittern',
    TWEET_INTERACTIONS: 'Tweet-Interaktionen',
    TWEET_YOUR_REPLY: 'Twittere deine Antwort',
    UNDO_RETWEET: 'Retweet rückgängig machen',
    VIEW: 'Anzeigen',
    WHATS_HAPPENING: 'Was gibt’s Neues?',
  },
  el: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Λογαριασμός με βάση σε ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Προσθήκη άλλου Tweet',
    ADD_MUTED_WORD: 'Προσθήκη λέξης σε σίγαση',
    GROK_ACTIONS: 'Δράσεις Grok',
    HOME: 'Αρχική σελίδα',
    LIKES: '"Μου αρέσει"',
    LIVE_ON_X: 'Ζωντανά στο X',
    MESSAGES: 'Μηνύματα',
    MOST_RELEVANT: 'Πιο σχετική',
    MUTE_THIS_CONVERSATION: 'Σίγαση αυτής της συζήτησης',
    POST_ALL: 'Δημοσίευση όλων',
    POST_UNAVAILABLE: 'Αυτή η ανάρτηση δεν είναι διαθέσιμη.',
    PROFILE_SUMMARY: ' Περίληψη προφίλ',
    QUOTE: 'Παράθεση',
    QUOTES: 'Παραθέσεις',
    QUOTE_TWEET: 'Παράθεση Tweet',
    QUOTE_TWEETS: 'Tweet με παράθεση',
    RECENT: 'Πρόσφατα',
    REPOST: 'Αναδημοσίευση',
    REPOSTS: 'Αναδημοσιεύσεις',
    RETWEETED_BY: 'Έγινε Retweet από',
    RETWEETS: 'Retweet',
    SHARED: 'Κοινόχρηστο',
    SHARED_TWEETS: 'Κοινόχρηστα Tweets',
    SHOW: 'Εμφάνιση',
    SHOW_MORE_REPLIES: 'Εμφάνιση περισσότερων απαντήσεων',
    SORT_BY: 'Ταξινόμηση κατά',
    SORT_REPLIES: 'Ταξινόμηση απαντήσεων',
    TURN_OFF_QUOTE_TWEETS: 'Απενεργοποίηση των tweet με παράθεση',
    TURN_OFF_RETWEETS: 'Απενεργοποίηση των Retweet',
    TURN_ON_RETWEETS: 'Ενεργοποίηση των Retweet',
    TWEETS: 'Tweet',
    TWEET_ALL: 'Δημοσίευση όλων ως Tweet',
    TWEET_INTERACTIONS: 'Αλληλεπιδράσεις με tweet',
    TWEET_YOUR_REPLY: 'Στείλτε την απάντησή σας',
    UNDO_RETWEET: 'Αναίρεση Retweet',
    VIEW: 'Προβολή',
    WHATS_HAPPENING: 'Τι συμβαίνει;',
  },
  en: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Account based in ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Add another Tweet',
    ADD_MUTED_WORD: 'Add muted word',
    BLOCK: 'Block',
    GROK_ACTIONS: 'Grok actions',
    HOME: 'Home',
    LIKES: 'Likes',
    LIVE_ON_X: 'Live on X',
    MESSAGES: 'Messages',
    MOST_RELEVANT: 'Most relevant',
    MUTE: 'Mute',
    MUTE_THIS_CONVERSATION: 'Mute this conversation',
    POST_ALL: 'Post all',
    POST_UNAVAILABLE: 'This post is unavailable.',
    PROFILE_SUMMARY: 'Profile Summary',
    QUOTE: 'Quote',
    QUOTES: 'Quotes',
    QUOTE_TWEET: 'Quote Tweet',
    QUOTE_TWEETS: 'Quote Tweets',
    RECENT: 'Recent',
    RELEVANT: 'Relevant',
    REPOST: 'Repost',
    REPOSTS: 'Reposts',
    RETWEET: 'Retweet',
    RETWEETED_BY: 'Retweeted by',
    RETWEETS: 'Retweets',
    SHARED: 'Shared',
    SHARED_TWEETS: 'Shared Tweets',
    SHOW: 'Show',
    SHOW_MORE_REPLIES: 'Show more replies',
    SORT_BY: 'Sort by',
    SORT_REPLIES: 'Sort replies',
    TURN_OFF_QUOTE_TWEETS: 'Turn off Quote Tweets',
    TURN_OFF_RETWEETS: 'Turn off Retweets',
    TURN_ON_RETWEETS: 'Turn on Retweets',
    TWEET: 'Tweet',
    TWEETS: 'Tweets',
    TWEET_ALL: 'Tweet all',
    TWEET_INTERACTIONS: 'Tweet interactions',
    TWEET_YOUR_REPLY: 'Tweet your reply',
    TWITTER: 'Twitter',
    UNBLOCK: 'Unblock',
    UNDO_RETWEET: 'Undo Retweet',
    UNMUTE: 'Unmute',
    VIEW: 'View',
    WHATS_HAPPENING: "What's happening?",
  },
  es: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Cuenta con sede en ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Agregar otro Tweet',
    ADD_MUTED_WORD: 'Añadir palabra silenciada',
    GROK_ACTIONS: 'Acciones de Grok',
    HOME: 'Inicio',
    LIKES: 'Me gusta',
    LIVE_ON_X: 'En directo en X',
    MESSAGES: 'Mensajes',
    MOST_RELEVANT: 'Más relevantes',
    MUTE_THIS_CONVERSATION: 'Silenciar esta conversación',
    POST_ALL: 'Postear todo',
    POST_UNAVAILABLE: 'Este post no está disponible.',
    PROFILE_SUMMARY: 'Resumen del perfil',
    QUOTE: 'Cita',
    QUOTES: 'Citas',
    QUOTE_TWEET: 'Citar Tweet',
    QUOTE_TWEETS: 'Tweets citados',
    RECENT: 'Recientes',
    RELEVANT: 'Relevante',
    REPOST: 'Repostear',
    RETWEET: 'Retwittear',
    RETWEETED_BY: 'Retwitteado por',
    SHARED: 'Compartido',
    SHARED_TWEETS: 'Tweets compartidos',
    SHOW: 'Mostrar',
    SHOW_MORE_REPLIES: 'Mostrar más respuestas',
    SORT_BY: 'Ordenar por',
    SORT_REPLIES: 'Organizar respuestas',
    TURN_OFF_QUOTE_TWEETS: 'Desactivar tweets citados',
    TURN_OFF_RETWEETS: 'Desactivar Retweets',
    TURN_ON_RETWEETS: 'Activar Retweets',
    TWEET: 'Twittear',
    TWEET_ALL: 'Twittear todo',
    TWEET_INTERACTIONS: 'Interacciones con Tweet',
    TWEET_YOUR_REPLY: 'Twittea tu respuesta',
    UNDO_RETWEET: 'Deshacer Retweet',
    VIEW: 'Ver',
    WHATS_HAPPENING: '¿Qué está pasando?',
  },
  eu: {
    ADD_ANOTHER_TWEET: 'Gehitu beste txio bat',
    ADD_MUTED_WORD: 'Gehitu isilarazitako hitza',
    HOME: 'Hasiera',
    LIKES: 'Atsegiteak',
    MESSAGES: 'Mezuak',
    MUTE_THIS_CONVERSATION: 'Isilarazi elkarrizketa hau',
    QUOTE: 'Aipamena',
    QUOTES: 'Aipamenak',
    QUOTE_TWEET: 'Txioa apaitu',
    QUOTE_TWEETS: 'Aipatu txioak',
    RECENT: 'Azkenak',
    RELEVANT: 'Aipagarria',
    RETWEET: 'Bertxiotu',
    RETWEETED_BY: 'Bertxiotua:',
    RETWEETS: 'Bertxioak',
    SHARED: 'Partekatua',
    SHARED_TWEETS: 'Partekatutako',
    SHOW: 'Erakutsi',
    SHOW_MORE_REPLIES: 'Erakutsi erantzun gehiago',
    SORT_BY: 'Ordenatzeko irizpidea:',
    TURN_OFF_QUOTE_TWEETS: 'Desaktibatu aipatu txioak',
    TURN_OFF_RETWEETS: 'Desaktibatu birtxioak',
    TURN_ON_RETWEETS: 'Aktibatu birtxioak',
    TWEET: 'Txio',
    TWEETS: 'Txioak',
    TWEET_ALL: 'Txiotu guztiak',
    TWEET_INTERACTIONS: 'Txio elkarrekintzak',
    TWEET_YOUR_REPLY: 'Txiotu zure erantzuna',
    UNDO_RETWEET: 'Desegin birtxiokatzea',
    VIEW: 'Ikusi',
    WHATS_HAPPENING: 'Zer gertatzen ari da?',
  },
  fa: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'حساب کاربری واقع در ' + e.country
    },
    ADD_ANOTHER_TWEET: 'افزودن توییت دیگر',
    ADD_MUTED_WORD: 'افزودن واژه خموش‌سازی شده',
    GROK_ACTIONS: 'کنش‌های Grok',
    HOME: 'خانه',
    LIKES: 'پسندها',
    LIVE_ON_X: 'زنده در X',
    MESSAGES: 'پیام‌ها',
    MOST_RELEVANT: 'مرتبط‌ترین',
    MUTE_THIS_CONVERSATION: 'خموش‌سازی این گفتگو',
    POST_ALL: 'پست کردن همه',
    POST_UNAVAILABLE: 'این پست دردسترس نیست.',
    PROFILE_SUMMARY: 'خلاصه نمایه',
    QUOTE: 'نقل‌قول',
    QUOTES: 'نقل‌قول‌ها',
    QUOTE_TWEET: 'نقل‌توییت',
    QUOTE_TWEETS: 'نقل‌توییت‌ها',
    RECENT: 'اخیر',
    REPOST: 'بازپست',
    REPOSTS: 'بازپست',
    RETWEET: 'بازتوییت',
    RETWEETED_BY: 'بازتوییت‌ شد توسط',
    RETWEETS: 'بازتوییت‌ها',
    SHARED: 'مشترک',
    SHARED_TWEETS: 'توییتهای مشترک',
    SHOW: 'نمایش',
    SHOW_MORE_REPLIES: 'نمایش پاسخ‌های بیشتر',
    SORT_BY: 'مرتب‌سازی براساس',
    SORT_REPLIES: 'مرتب‌سازی پاسخ‌ها',
    TURN_OFF_QUOTE_TWEETS: 'غیرفعال‌سازی نقل‌توییت‌ها',
    TURN_OFF_RETWEETS: 'غیرفعال‌سازی بازتوییت‌ها',
    TURN_ON_RETWEETS: 'فعال سازی بازتوییت‌ها',
    TWEET: 'توییت',
    TWEETS: 'توييت‌ها',
    TWEET_ALL: 'توییت به همه',
    TWEET_INTERACTIONS: 'تعاملات توییت',
    TWEET_YOUR_REPLY: 'پاسختان را توییت کنید',
    TWITTER: 'توییتر',
    UNDO_RETWEET: 'لغو بازتوییت',
    VIEW: 'مشاهده',
    WHATS_HAPPENING: 'چه خبر؟',
  },
  fi: {
    ACCOUNT_BASED_IN_FN: function (a) {
      return 'Tilin kotimaa on ' + a.country
    },
    ADD_ANOTHER_TWEET: 'Lisää vielä twiitti',
    ADD_MUTED_WORD: 'Lisää hiljennetty sana',
    GROK_ACTIONS: 'Grok-toiminnat',
    HOME: 'Etusivu',
    LIKES: 'Tykkäykset',
    LIVE_ON_X: 'Livenä X:ssä',
    MESSAGES: 'Viestit',
    MOST_RELEVANT: 'Relevanteimmat',
    MUTE_THIS_CONVERSATION: 'Hiljennä tämä keskustelu',
    POST_ALL: 'Julkaise kaikki',
    POST_UNAVAILABLE: 'Tämä julkaisu ei ole saatavilla.',
    PROFILE_SUMMARY: 'Profiilin yhteenveto',
    QUOTE: 'Lainaa',
    QUOTES: 'Lainaukset',
    QUOTE_TWEET: 'Twiitin lainaus',
    QUOTE_TWEETS: 'Twiitin lainaukset',
    RECENT: 'Uusimmat',
    RELEVANT: 'Relevantti',
    REPOST: 'Uudelleenjulkaise',
    REPOSTS: 'Uudelleenjulkaisut',
    RETWEET: 'Uudelleentwiittaa',
    RETWEETED_BY: 'Uudelleentwiitannut',
    RETWEETS: 'Uudelleentwiittaukset',
    SHARED: 'Jaettu',
    SHARED_TWEETS: 'Jaetut twiitit',
    SHOW: 'Näytä',
    SHOW_MORE_REPLIES: 'Näytä lisää vastauksia',
    SORT_BY: 'Lajitteluperuste',
    SORT_REPLIES: 'Lajittele vastaukset',
    TURN_OFF_QUOTE_TWEETS: 'Poista twiitin lainaukset käytöstä',
    TURN_OFF_RETWEETS: 'Poista uudelleentwiittaukset käytöstä',
    TURN_ON_RETWEETS: 'Ota uudelleentwiittaukset käyttöön',
    TWEET: 'Twiittaa',
    TWEETS: 'Twiitit',
    TWEET_ALL: 'Twiittaa kaikki',
    TWEET_INTERACTIONS: 'Twiitin vuorovaikutukset',
    TWEET_YOUR_REPLY: 'Twiittaa vastauksesi',
    UNDO_RETWEET: 'Kumoa uudelleentwiittaus',
    VIEW: 'Näytä',
    WHATS_HAPPENING: 'Missä mennään?',
  },
  fil: {
    ACCOUNT_BASED_IN_FN: function (a) {
      return 'Account na naka-base sa ' + a.country
    },
    ADD_ANOTHER_TWEET: 'Magdagdag ng isa pang Tweet',
    ADD_MUTED_WORD: 'Idagdag ang naka-mute na salita',
    GROK_ACTIONS: 'Mga aksyon ni Grok',
    LIKES: 'Mga Gusto',
    LIVE_ON_X: 'Live sa X',
    MESSAGES: 'Mga Mensahe',
    MOST_RELEVANT: 'Pinakanauugnay',
    MUTE_THIS_CONVERSATION: 'I-mute ang usapang ito',
    POST_ALL: 'I-post lahat',
    POST_UNAVAILABLE: 'Hindi available ang post na Ito.',
    PROFILE_SUMMARY: 'Buod ng Profile',
    QUOTES: 'Mga Quote',
    QUOTE_TWEET: 'Quote na Tweet',
    QUOTE_TWEETS: 'Mga Quote na Tweet',
    RECENT: 'Kamakailan',
    REPOST: 'I-repost',
    REPOSTS: '(na) Repost',
    RETWEET: 'I-retweet',
    RETWEETED_BY: 'Ni-retweet ni',
    RETWEETS: 'Mga Retweet',
    SHARED: 'Ibinahagi',
    SHARED_TWEETS: 'Mga Ibinahaging Tweet',
    SHOW: 'Ipakita',
    SHOW_MORE_REPLIES: 'Magpakita pa ng mga sagot',
    SORT_BY: 'Isaayos ayon sa',
    SORT_REPLIES: 'I-sort ang mga reply',
    TURN_OFF_QUOTE_TWEETS: 'I-off ang mga Quote na Tweet',
    TURN_OFF_RETWEETS: 'I-off ang Retweets',
    TURN_ON_RETWEETS: 'I-on ang Retweets',
    TWEET: 'Mag-tweet',
    TWEETS: 'Mga Tweet',
    TWEET_ALL: 'I-tweet lahat',
    TWEET_INTERACTIONS: 'Interaksyon sa Tweet',
    TWEET_YOUR_REPLY: 'I-Tweet ang reply mo',
    UNDO_RETWEET: 'Huwag nang I-retweet',
    VIEW: 'Tingnan',
    WHATS_HAPPENING: 'Ano ang nangyayari?',
  },
  fr: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Compte basé dans le pays suivant : ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Ajouter un autre Tweet',
    ADD_MUTED_WORD: 'Ajouter un mot masqué',
    GROK_ACTIONS: 'Actions Grok',
    HOME: 'Accueil',
    LIKES: "J'aime",
    LIVE_ON_X: 'En direct sur X',
    MOST_RELEVANT: 'Les plus pertinentes',
    MUTE_THIS_CONVERSATION: 'Masquer cette conversation',
    POST_ALL: 'Tout poster',
    POST_UNAVAILABLE: "Ce post n'est pas disponible.",
    PROFILE_SUMMARY: 'Résumé du profil',
    QUOTE: 'Citation',
    QUOTES: 'Citations',
    QUOTE_TWEET: 'Citer le Tweet',
    QUOTE_TWEETS: 'Tweets cités',
    RECENT: 'Récents',
    RELEVANT: 'Pertinence',
    RETWEET: 'Retweeter',
    RETWEETED_BY: 'Retweeté par',
    SHARED: 'Partagé',
    SHARED_TWEETS: 'Tweets partagés',
    SHOW: 'Afficher',
    SHOW_MORE_REPLIES: 'Voir plus de réponses',
    SORT_BY: 'Trier par',
    SORT_REPLIES: 'Trier les réponses',
    TURN_OFF_QUOTE_TWEETS: 'Désactiver les Tweets cités',
    TURN_OFF_RETWEETS: 'Désactiver les Retweets',
    TURN_ON_RETWEETS: 'Activer les Retweets',
    TWEET: 'Tweeter',
    TWEET_ALL: 'Tout tweeter',
    TWEET_INTERACTIONS: 'Interactions avec Tweet',
    TWEET_YOUR_REPLY: 'Tweetez votre réponse',
    UNDO_RETWEET: 'Annuler le Retweet',
    VIEW: 'Voir',
    WHATS_HAPPENING: 'Quoi de neuf !',
  },
  ga: {
    ADD_ANOTHER_TWEET: 'Cuir Tweet eile leis',
    ADD_MUTED_WORD: 'Cuir focal balbhaithe leis',
    HOME: 'Baile',
    LIKES: 'Thaitin siad seo le',
    MESSAGES: 'Teachtaireachtaí',
    MUTE_THIS_CONVERSATION: 'Balbhaigh an comhrá seo',
    QUOTE: 'Sliocht',
    QUOTES: 'Sleachta',
    QUOTE_TWEET: 'Cuir Ráiteas Leis',
    QUOTE_TWEETS: 'Luaigh Tvuíteanna',
    RECENT: 'Le déanaí',
    RETWEET: 'Atweetáil',
    RETWEETED_BY: 'Atweetáilte ag',
    RETWEETS: 'Atweetanna',
    SHARED: 'Roinnte',
    SHARED_TWEETS: 'Tweetanna Roinnte',
    SHOW: 'Taispeáin',
    SHOW_MORE_REPLIES: 'Taispeáin tuilleadh freagraí',
    SORT_BY: 'Sórtáil de réir',
    TURN_OFF_QUOTE_TWEETS: 'Cas as Luaigh Tvuíteanna',
    TURN_OFF_RETWEETS: 'Cas as Atweetanna',
    TURN_ON_RETWEETS: 'Cas Atweetanna air',
    TWEETS: 'Tweetanna',
    TWEET_ALL: 'Tweetáil gach rud',
    TWEET_INTERACTIONS: 'Idirghníomhaíochtaí le Tweet',
    TWEET_YOUR_REPLY: 'Tweetáil do fhreagra',
    UNDO_RETWEET: 'Cuir an Atweet ar ceal',
    VIEW: 'Breathnaigh',
    WHATS_HAPPENING: 'Cad atá ag tarlú?',
  },
  gl: {
    ADD_ANOTHER_TWEET: 'Engadir outro chío',
    ADD_MUTED_WORD: 'Engadir palabra silenciada',
    HOME: 'Inicio',
    LIKES: 'Gústames',
    MESSAGES: 'Mensaxes',
    MUTE_THIS_CONVERSATION: 'Silenciar esta conversa',
    QUOTE: 'Cita',
    QUOTES: 'Citas',
    QUOTE_TWEET: 'Citar chío',
    QUOTE_TWEETS: 'Chíos citados',
    RECENT: 'Recentes',
    RETWEET: 'Rechouchiar',
    RETWEETED_BY: 'Rechouchiado por',
    RETWEETS: 'Rechouchíos',
    SHARED: 'Compartido',
    SHARED_TWEETS: 'Chíos compartidos',
    SHOW: 'Amosar',
    SHOW_MORE_REPLIES: 'Amosar máis respostas',
    SORT_BY: 'Ordenar por',
    TURN_OFF_QUOTE_TWEETS: 'Desactivar os chíos citados',
    TURN_OFF_RETWEETS: 'Desactivar os rechouchíos',
    TURN_ON_RETWEETS: 'Activar os rechouchíos',
    TWEET: 'Chío',
    TWEETS: 'Chíos',
    TWEET_ALL: 'Chiar todo',
    TWEET_INTERACTIONS: 'Interaccións chío',
    TWEET_YOUR_REPLY: 'Chío a túa responder',
    UNDO_RETWEET: 'Desfacer rechouchío',
    VIEW: 'Ver',
    WHATS_HAPPENING: 'Que está pasando?',
  },
  gu: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'એકાઉન્ટ સ્થિત હોવાનું સ્થાન ' + e.country
    },
    ADD_ANOTHER_TWEET: 'અન્ય ટ્વીટ ઉમેરો',
    ADD_MUTED_WORD: 'જોડાણ અટકાવેલો શબ્દ ઉમેરો',
    GROK_ACTIONS: 'Grok પગલાં',
    HOME: 'હોમ',
    LIKES: 'લાઈક્સ',
    LIVE_ON_X: 'X પર લાઇવ',
    MESSAGES: 'સંદેશાઓ',
    MOST_RELEVANT: 'સૌથી વધુ સુસંગત',
    MUTE_THIS_CONVERSATION: 'આ વાર્તાલાપનું જોડાણ અટકાવો',
    POST_ALL: 'બધા પોસ્ટ કરો',
    POST_UNAVAILABLE: 'આ પોસ્ટ અનુપલબ્ધ છે.',
    PROFILE_SUMMARY: 'પ્રોફાઇલ સારાંશ',
    QUOTE: 'અવતરણ',
    QUOTES: 'અવતરણો',
    QUOTE_TWEET: 'અવતરણની સાથે ટ્વીટ કરો',
    QUOTE_TWEETS: 'અવતરણની સાથે ટ્વીટ્સ',
    RECENT: 'તાજેતરનું',
    RELEVANT: 'સંબંધિત છે',
    REPOST: 'રીપોસ્ટ કરો',
    REPOSTS: 'ફરીથી કરવામાં આવેલી પોસ્ટ',
    RETWEET: 'પુનટ્વીટ',
    RETWEETED_BY: 'આમની દ્વારા પુનટ્વીટ કરવામાં આવી',
    RETWEETS: 'પુનટ્વીટ્સ',
    SHARED: 'સાંજેડેલું',
    SHARED_TWEETS: 'શેર કરેલી ટ્વીટ્સ',
    SHOW: 'બતાવો',
    SHOW_MORE_REPLIES: 'વધુ પ્રત્યુતરો દર્શાવો',
    SORT_BY: 'આની દ્વારા સૉર્ટ કરો',
    SORT_REPLIES: 'પ્રત્યુત્તરોને સૉર્ટ કરો',
    TURN_OFF_QUOTE_TWEETS: 'અવતરણની સાથે ટ્વીટ્સ બંધ કરો',
    TURN_OFF_RETWEETS: 'પુનટ્વીટ્સ બંધ કરો',
    TURN_ON_RETWEETS: 'પુનટ્વીટ્સ ચાલુ કરો',
    TWEET: 'ટ્વીટ',
    TWEETS: 'ટ્વીટ્સ',
    TWEET_ALL: 'બધાને ટ્વીટ કરો',
    TWEET_INTERACTIONS: 'ટ્વીટ ક્રિયાપ્રતિક્રિયાઓ',
    TWEET_YOUR_REPLY: 'તમારા પ્રત્યુત્તરને ટ્વીટ કરો',
    UNDO_RETWEET: 'પુનટ્વીટને પૂર્વવત કરો',
    VIEW: 'જુઓ',
    WHATS_HAPPENING: 'શું થઈ રહ્યું છે?',
  },
  he: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'החשבון נמצא ב-' + e.country
    },
    ADD_ANOTHER_TWEET: 'הוסף ציוץ נוסף',
    ADD_MUTED_WORD: 'הוסף מילה מושתקת',
    GROK_ACTIONS: 'פעולות של Grok',
    HOME: 'דף הבית',
    LIKES: 'הערות "אהבתי"',
    LIVE_ON_X: 'שידור חי ב-X',
    MESSAGES: 'מסרים',
    MOST_RELEVANT: 'הכי רלוונטי',
    MUTE_THIS_CONVERSATION: 'להשתיק את השיחה הזאת',
    POST_ALL: 'פרסום הכל',
    POST_UNAVAILABLE: 'פוסט זה אינו זמין.',
    PROFILE_SUMMARY: 'סיכום הפרופיל',
    QUOTE: 'ציטוט',
    QUOTES: 'ציטוטים',
    QUOTE_TWEET: 'ציטוט ציוץ',
    QUOTE_TWEETS: 'ציוצי ציטוט',
    RECENT: 'אחרונים',
    RELEVANT: 'רלוונטי',
    REPOST: 'לפרסם מחדש',
    REPOSTS: 'פרסומים מחדש',
    RETWEET: 'צייץ מחדש',
    RETWEETED_BY: 'צויץ מחדש על־ידי',
    RETWEETS: 'ציוצים מחדש',
    SHARED: 'משותף',
    SHARED_TWEETS: 'ציוצים משותפים',
    SHOW: 'הצג',
    SHOW_MORE_REPLIES: 'הצג תשובות נוספות',
    SORT_BY: 'סנן לפי',
    SORT_REPLIES: 'מיון תשובות',
    TURN_OFF_QUOTE_TWEETS: 'כבה ציוצי ציטוט',
    TURN_OFF_RETWEETS: 'כבה ציוצים מחדש',
    TURN_ON_RETWEETS: 'הפעל ציוצים מחדש',
    TWEET: 'צייץ',
    TWEETS: 'ציוצים',
    TWEET_ALL: 'צייץ הכול',
    TWEET_INTERACTIONS: 'אינטראקציות צייץ',
    TWEET_YOUR_REPLY: 'צייץ התשובה',
    TWITTER: 'טוויטר',
    UNDO_RETWEET: 'ביטול ציוץ מחדש',
    VIEW: 'הצג',
    WHATS_HAPPENING: 'מה קורה?',
  },
  hi: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return e.country + ' में स्थित खाता'
    },
    ADD_ANOTHER_TWEET: 'एक और ट्वीट जोड़ें',
    ADD_MUTED_WORD: 'म्यूट किया गया शब्द जोड़ें',
    GROK_ACTIONS: 'Grok कार्रवाई',
    HOME: 'होम',
    LIKES: 'पसंद',
    LIVE_ON_X: 'X पर लाइव',
    MESSAGES: 'संदेश',
    MOST_RELEVANT: 'सर्वाधिक प्रासंगिक',
    MUTE_THIS_CONVERSATION: 'इस बातचीत को म्यूट करें',
    POST_ALL: 'सभी पोस्ट करें',
    POST_UNAVAILABLE: 'यह पोस्ट उपलब्ध नहीं है.',
    PROFILE_SUMMARY: 'प्रोफ़ाइल सारांश',
    QUOTE: 'कोट',
    QUOTES: 'कोट',
    QUOTE_TWEET: 'ट्वीट क्वोट करें',
    QUOTE_TWEETS: 'कोट ट्वीट्स',
    RECENT: 'हाल ही के',
    RELEVANT: 'प्रासंगिक',
    REPOST: 'रीपोस्ट',
    REPOSTS: 'रीपोस्ट्स',
    RETWEET: 'रीट्वीट करें',
    RETWEETED_BY: 'इनके द्वारा रीट्वीट किया गया',
    RETWEETS: 'रीट्वीट्स',
    SHARED: 'साझा किया हुआ',
    SHARED_TWEETS: 'साझा किए गए ट्वीट',
    SHOW: 'दिखाएं',
    SHOW_MORE_REPLIES: 'और अधिक जवाब दिखाएँ',
    SORT_BY: 'इसके अनुसार सॉर्ट करें',
    SORT_REPLIES: 'जवाब सॉर्ट करें',
    TURN_OFF_QUOTE_TWEETS: 'कोट ट्वीट्स बंद करें',
    TURN_OFF_RETWEETS: 'रीट्वीट बंद करें',
    TURN_ON_RETWEETS: 'रीट्वीट चालू करें',
    TWEET: 'ट्वीट करें',
    TWEETS: 'ट्वीट',
    TWEET_ALL: 'सभी ट्वीट करें',
    TWEET_INTERACTIONS: 'ट्वीट इंटरैक्शन',
    TWEET_YOUR_REPLY: 'अपना जवाब ट्वीट करें',
    UNDO_RETWEET: 'रीट्वीट को पूर्ववत करें',
    VIEW: 'देखें',
    WHATS_HAPPENING: 'क्या हो रहा है?',
  },
  hr: {
    ACCOUNT_BASED_IN_FN: function (a) {
      return 'Država računa ' + a.country
    },
    ADD_ANOTHER_TWEET: 'Dodaj drugi Tweet',
    ADD_MUTED_WORD: 'Dodaj onemogućenu riječ',
    GROK_ACTIONS: 'Grokove radnje',
    HOME: 'Naslovnica',
    LIKES: 'Oznake „sviđa mi se”',
    LIVE_ON_X: 'Uživo na platformi X',
    MESSAGES: 'Poruke',
    MOST_RELEVANT: 'Najrelevantnije',
    MUTE_THIS_CONVERSATION: 'Isključi zvuk ovog razgovora',
    POST_ALL: 'Objavi sve',
    POST_UNAVAILABLE: 'Ta objava nije dostupna.',
    PROFILE_SUMMARY: 'Sažetak profila',
    QUOTE: 'Citat',
    QUOTES: 'Citati',
    QUOTE_TWEET: 'Citiraj Tweet',
    QUOTE_TWEETS: 'Citirani tweetovi',
    RECENT: 'Nedavno',
    RELEVANT: 'Relevantno',
    REPOST: 'Proslijedi objavu',
    REPOSTS: 'Proslijeđene objave',
    RETWEET: 'Proslijedi tweet',
    RETWEETED_BY: 'Korisnici koji su proslijedili Tweet',
    RETWEETS: 'Proslijeđeni tweetovi',
    SHARED: 'Podijeljeno',
    SHARED_TWEETS: 'Dijeljeni tweetovi',
    SHOW: 'Prikaži',
    SHOW_MORE_REPLIES: 'Prikaži još odgovora',
    SORT_BY: 'Sortiraj prema',
    SORT_REPLIES: 'Sortiraj odgovore',
    TURN_OFF_QUOTE_TWEETS: 'Isključi citirane tweetove',
    TURN_OFF_RETWEETS: 'Isključi proslijeđene tweetove',
    TURN_ON_RETWEETS: 'Uključi proslijeđene tweetove',
    TWEETS: 'Tweetovi',
    TWEET_ALL: 'Tweetaj sve',
    TWEET_INTERACTIONS: 'Interakcije s Tweet',
    TWEET_YOUR_REPLY: 'Tweetajte odgovor',
    UNDO_RETWEET: 'Poništi prosljeđivanje tweeta',
    VIEW: 'Prikaz',
    WHATS_HAPPENING: 'Što se događa?',
  },
  hu: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'A felhasználói fiók tartózkodási helye: ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Másik Tweet hozzáadása',
    ADD_MUTED_WORD: 'Elnémított szó hozzáadása',
    GROK_ACTIONS: 'Grok-műveletek',
    HOME: 'Kezdőlap',
    LIKES: 'Kedvelések',
    LIVE_ON_X: 'Élőben az X-en',
    MESSAGES: 'Üzenetek',
    MOST_RELEVANT: 'Legmegfelelőbb',
    MUTE_THIS_CONVERSATION: 'Beszélgetés némítása',
    POST_ALL: 'Az összes közzététele',
    POST_UNAVAILABLE: 'Ez a bejegyzés nem elérhető.',
    PROFILE_SUMMARY: 'Profil összegzése',
    QUOTE: 'Idézés',
    QUOTES: 'Idézések',
    QUOTE_TWEET: 'Tweet idézése',
    QUOTE_TWEETS: 'Tweet-idézések',
    RECENT: 'Legutóbbi',
    RELEVANT: 'Releváns',
    REPOST: 'Újraposztolás',
    REPOSTS: 'Újraposztolások',
    RETWEETED_BY: 'Retweetelte',
    RETWEETS: 'Retweetek',
    SHARED: 'Megosztott',
    SHARED_TWEETS: 'Megosztott tweetek',
    SHOW: 'Megjelenítés',
    SHOW_MORE_REPLIES: 'Több válasz megjelenítése',
    SORT_BY: 'Rendezési szempont',
    SORT_REPLIES: 'Válaszok rendezése',
    TURN_OFF_QUOTE_TWEETS: 'Tweet-idézések kikapcsolása',
    TURN_OFF_RETWEETS: 'Retweetek kikapcsolása',
    TURN_ON_RETWEETS: 'Retweetek bekapcsolása',
    TWEET: 'Tweetelj',
    TWEETS: 'Tweetek',
    TWEET_ALL: 'Tweet küldése mindenkinek',
    TWEET_INTERACTIONS: 'Tweet interakciók',
    TWEET_YOUR_REPLY: 'Tweeteld válaszodat',
    UNDO_RETWEET: 'Retweet visszavonása',
    VIEW: 'Megtekintés',
    WHATS_HAPPENING: 'Mi történik éppen most?',
  },
  id: {
    ACCOUNT_BASED_IN_FN: function (a) {
      return 'Akun berbasis di ' + a.country
    },
    ADD_ANOTHER_TWEET: 'Tambahkan Tweet lain',
    ADD_MUTED_WORD: 'Tambahkan kata kunci yang dibisukan',
    GROK_ACTIONS: 'Tindakan Grok',
    HOME: 'Beranda',
    LIKES: 'Suka',
    LIVE_ON_X: 'Langsung di X',
    MESSAGES: 'Pesan',
    MOST_RELEVANT: 'Paling relevan',
    MUTE_THIS_CONVERSATION: 'Bisukan percakapan ini',
    POST_ALL: 'Posting semua',
    POST_UNAVAILABLE: 'Postingan ini tidak tersedia.',
    PROFILE_SUMMARY: 'Ringkasan Profil',
    QUOTE: 'Kutipan',
    QUOTES: 'Kutipan',
    QUOTE_TWEET: 'Kutip Tweet',
    QUOTE_TWEETS: 'Tweet Kutipan',
    RECENT: 'Terkini',
    REPOST: 'Posting ulang',
    REPOSTS: 'Posting ulang',
    RETWEETED_BY: 'Di-retweet oleh',
    RETWEETS: 'Retweet',
    SHARED: 'Dibagikan',
    SHARED_TWEETS: 'Tweet yang Dibagikan',
    SHOW: 'Tampilkan',
    SHOW_MORE_REPLIES: 'Tampilkan balasan lainnya',
    SORT_BY: 'Urutkan berdasarkan',
    SORT_REPLIES: 'Urutkan balasan',
    TURN_OFF_QUOTE_TWEETS: 'Matikan Tweet Kutipan',
    TURN_OFF_RETWEETS: 'Matikan Retweet',
    TURN_ON_RETWEETS: 'Nyalakan Retweet',
    TWEETS: 'Tweet',
    TWEET_ALL: 'Tweet semua',
    TWEET_INTERACTIONS: 'Interaksi Tweet',
    TWEET_YOUR_REPLY: 'Tweet balasan Anda',
    UNDO_RETWEET: 'Batalkan Retweet',
    VIEW: 'Lihat',
    WHATS_HAPPENING: 'Apa yang sedang hangat dibicarakan?',
  },
  it: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Posizione account: ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Aggiungi altro Tweet',
    ADD_MUTED_WORD: 'Aggiungi parola o frase silenziata',
    GROK_ACTIONS: 'Azioni di Grok',
    LIKES: 'Mi piace',
    LIVE_ON_X: 'In diretta su X',
    MESSAGES: 'Messaggi',
    MOST_RELEVANT: 'Più pertinenti',
    MUTE_THIS_CONVERSATION: 'Silenzia questa conversazione',
    POST_ALL: 'Posta tutto',
    POST_UNAVAILABLE: 'Questo post non è disponibile.',
    PROFILE_SUMMARY: 'Riepilogo del profilo',
    QUOTE: 'Citazione',
    QUOTES: 'Citazioni',
    QUOTE_TWEET: 'Cita Tweet',
    QUOTE_TWEETS: 'Tweet di citazione',
    RECENT: 'Recenti',
    REPOSTS: 'Repost',
    RETWEET: 'Ritwitta',
    RETWEETED_BY: 'Ritwittato da',
    RETWEETS: 'Retweet',
    SHARED: 'Condiviso',
    SHARED_TWEETS: 'Tweet condivisi',
    SHOW: 'Mostra',
    SHOW_MORE_REPLIES: 'Mostra altre risposte',
    SORT_BY: 'Ordina per',
    SORT_REPLIES: 'Ordina risposte',
    TURN_OFF_QUOTE_TWEETS: 'Disattiva i Tweet di citazione',
    TURN_OFF_RETWEETS: 'Disattiva Retweet',
    TURN_ON_RETWEETS: 'Attiva Retweet',
    TWEET: 'Twitta',
    TWEETS: 'Tweet',
    TWEET_ALL: 'Twitta tutto',
    TWEET_INTERACTIONS: 'Interazioni con Tweet',
    TWEET_YOUR_REPLY: 'Twitta la tua risposta',
    UNDO_RETWEET: 'Annulla Retweet',
    VIEW: 'Visualizza',
    WHATS_HAPPENING: "Che c'è di nuovo?",
  },
  ja: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'アカウントの所在地: ' + e.country
    },
    ADD_ANOTHER_TWEET: '別のツイートを追加する',
    ADD_MUTED_WORD: 'ミュートするキーワードを追加',
    GROK_ACTIONS: 'Grokのアクション',
    HOME: 'ホーム',
    LIKES: 'いいね',
    LIVE_ON_X: 'Xでライブ放送する',
    MESSAGES: 'メッセージ',
    MOST_RELEVANT: '関連性が高い',
    MUTE_THIS_CONVERSATION: 'この会話をミュート',
    POST_ALL: 'すべてポスト',
    POST_UNAVAILABLE: 'このポストは表示できません。',
    PROFILE_SUMMARY: 'プロフィールの要約',
    QUOTE: '引用',
    QUOTES: '引用',
    QUOTE_TWEET: '引用ツイート',
    QUOTE_TWEETS: '引用ツイート',
    RECENT: '最新',
    RELEVANT: '関連性が高い',
    REPOST: 'リポスト',
    REPOSTS: 'リポスト',
    RETWEET: 'リツイート',
    RETWEETED_BY: 'リツイートしたユーザー',
    RETWEETS: 'リツイート',
    SHARED: '共有',
    SHARED_TWEETS: '共有ツイート',
    SHOW: '表示',
    SHOW_MORE_REPLIES: '返信をさらに表示',
    SORT_BY: '並べ替え',
    SORT_REPLIES: '返信を並べ替え',
    TURN_OFF_QUOTE_TWEETS: '引用ツイートをオフにする',
    TURN_OFF_RETWEETS: 'リツイートをオフにする',
    TURN_ON_RETWEETS: 'リツイートをオンにする',
    TWEET: 'ツイートする',
    TWEETS: 'ツイート',
    TWEET_ALL: 'すべてツイート',
    TWEET_INTERACTIONS: 'ツイートの相互作用',
    TWEET_YOUR_REPLY: '返信をツイート',
    UNDO_RETWEET: 'リツイートを取り消す',
    VIEW: '表示する',
    WHATS_HAPPENING: 'いまどうしてる？',
  },
  kn: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return e.country + ' ನಲ್ಲಿ ಆಧಾರಿತ ಖಾತೆ'
    },
    ADD_ANOTHER_TWEET: 'ಮತ್ತೊಂದು ಟ್ವೀಟ್ ಸೇರಿಸಿ',
    ADD_MUTED_WORD: 'ಸದ್ದಡಗಿಸಿದ ಪದವನ್ನು ಸೇರಿಸಿ',
    GROK_ACTIONS: 'Grok ಕ್ರಮಗಳು',
    HOME: 'ಹೋಮ್',
    LIKES: 'ಇಷ್ಟಗಳು',
    LIVE_ON_X: 'X ನಲ್ಲಿ ಲೈವ್',
    MESSAGES: 'ಸಂದೇಶಗಳು',
    MOST_RELEVANT: 'ಅತ್ಯಂತ ಸಂಬಂಧಿತ',
    MUTE_THIS_CONVERSATION: 'ಈ ಸಂವಾದವನ್ನು ಸದ್ದಡಗಿಸಿ',
    POST_ALL: 'ಎಲ್ಲವನ್ನೂ ಪೋಸ್ಟ್ ಮಾಡಿ',
    POST_UNAVAILABLE: 'ಈ ಪೋಸ್ಟ್ ಲಭ್ಯವಿಲ್ಲ.',
    PROFILE_SUMMARY: 'ಪ್ರೊಫೈಲ್ ಸಾರಾಂಶ',
    QUOTE: 'ಕೋಟ್‌',
    QUOTES: 'ಉಲ್ಲೇಖಗಳು',
    QUOTE_TWEET: 'ಟ್ವೀಟ್ ಕೋಟ್ ಮಾಡಿ',
    QUOTE_TWEETS: 'ಕೋಟ್ ಟ್ವೀಟ್‌ಗಳು',
    RECENT: 'ಇತ್ತೀಚಿನ',
    RELEVANT: 'ಸಂಬಂಧಿತ',
    REPOST: 'ಮರುಪೋಸ್ಟ್ ಮಾಡಿ',
    REPOSTS: 'ಮರುಪೋಸ್ಟ್‌ಗಳು',
    RETWEET: 'ಮರುಟ್ವೀಟಿಸಿ',
    RETWEETED_BY: 'ಮರುಟ್ವೀಟಿಸಿದವರು',
    RETWEETS: 'ಮರುಟ್ವೀಟ್‌ಗಳು',
    SHARED: 'ಹಂಚಲಾಗಿದೆ',
    SHARED_TWEETS: 'ಹಂಚಿದ ಟ್ವೀಟ್‌ಗಳು',
    SHOW: 'ತೋರಿಸಿ',
    SHOW_MORE_REPLIES: 'ಇನ್ನಷ್ಟು ಪ್ರತಿಕ್ರಿಯೆಗಳನ್ನು ತೋರಿಸಿ',
    SORT_BY: 'ಈ ರೀತಿ ಆಯೋಜಿಸಿ',
    SORT_REPLIES: 'ಪ್ರತಿಕ್ರಿಯೆಗಳನ್ನು ಆಯೋಜಿಸಿ',
    TURN_OFF_QUOTE_TWEETS: 'ಕೋಟ್ ಟ್ವೀಟ್‌ಗಳನ್ನು ಆಫ್ ಮಾಡಿ',
    TURN_OFF_RETWEETS: 'ಮರುಟ್ವೀಟ್‌ಗಳನ್ನು ಆಫ್ ಮಾಡಿ',
    TURN_ON_RETWEETS: 'ಮರುಟ್ವೀಟ್‌ಗಳನ್ನು ಆನ್ ಮಾಡಿ',
    TWEET: 'ಟ್ವೀಟ್',
    TWEETS: 'ಟ್ವೀಟ್‌ಗಳು',
    TWEET_ALL: 'ಎಲ್ಲಾ ಟ್ವೀಟ್ ಮಾಡಿ',
    TWEET_INTERACTIONS: 'ಟ್ವೀಟ್ ಸಂವಾದಗಳು',
    TWEET_YOUR_REPLY: 'ನಿಮ್ಮ ಪ್ರತಿಕ್ರಿಯೆಯನ್ನು ಟ್ವೀಟ್ ಮಾಡಿ',
    UNDO_RETWEET: 'ಮರುಟ್ವೀಟಿಸುವುದನ್ನು ರದ್ದುಮಾಡಿ',
    VIEW: 'ವೀಕ್ಷಿಸಿ',
    WHATS_HAPPENING: 'ಏನು ನಡೆಯುತ್ತಿದೆ?',
  },
  ko: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return '계정 사용자 거주 국가: ' + e.country
    },
    ADD_ANOTHER_TWEET: '다른 트윗 추가하기',
    ADD_MUTED_WORD: '뮤트할 단어 추가하기',
    GROK_ACTIONS: 'Grok 작업',
    HOME: '홈',
    LIKES: '마음에 들어요',
    LIVE_ON_X: 'X 생방송',
    MESSAGES: '쪽지',
    MOST_RELEVANT: '관련도 순서',
    MUTE_THIS_CONVERSATION: '이 대화 뮤트하기',
    POST_ALL: '모두 게시하기',
    POST_UNAVAILABLE: '이 게시물을 볼 수 없습니다.',
    PROFILE_SUMMARY: '프로필 요약',
    QUOTE: '인용',
    QUOTES: '인용',
    QUOTE_TWEET: '트윗 인용하기',
    QUOTE_TWEETS: '트윗 인용하기',
    RECENT: '최근',
    REPOST: '재게시',
    REPOSTS: '재게시',
    RETWEET: '리트윗',
    RETWEETED_BY: '리트윗함',
    RETWEETS: '리트윗',
    SHARED: '공유된',
    SHARED_TWEETS: '공유 트윗',
    SHOW: '표시',
    SHOW_MORE_REPLIES: '더 많은 답글 보기',
    SORT_BY: '정렬 기준',
    SORT_REPLIES: '답글 정렬하기',
    TURN_OFF_QUOTE_TWEETS: '인용 트윗 끄기',
    TURN_OFF_RETWEETS: '리트윗 끄기',
    TURN_ON_RETWEETS: '리트윗 켜기',
    TWEET: '트윗',
    TWEETS: '트윗',
    TWEET_ALL: '모두 트윗하기',
    TWEET_INTERACTIONS: '트윗 상호작용',
    TWEET_YOUR_REPLY: '답글을 트윗하세요',
    TWITTER: '트위터',
    UNDO_RETWEET: '리트윗 취소',
    VIEW: '보기',
    WHATS_HAPPENING: '무슨 일이 일어나고 있나요?',
  },
  mr: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return e.country + ' मध्ये नोंदणीकृत खाते'
    },
    ADD_ANOTHER_TWEET: 'दुसरे ट्विट सामील करा',
    ADD_MUTED_WORD: 'म्यूट केलेले शब्द सामील करा',
    GROK_ACTIONS: 'Grok कृती',
    HOME: 'होम',
    LIKES: 'पसंती',
    LIVE_ON_X: 'X वर लाइव्ह',
    MESSAGES: 'संदेश',
    MOST_RELEVANT: 'सर्वात महत्वाचे',
    MUTE_THIS_CONVERSATION: 'ही चर्चा म्यूट करा',
    POST_ALL: 'सर्व पोस्ट करा',
    POST_UNAVAILABLE: 'हे पोस्ट अनुपलब्ध आहे.',
    PROFILE_SUMMARY: 'प्रोफाइल सारांश',
    QUOTE: 'भाष्य',
    QUOTES: 'भाष्य',
    QUOTE_TWEET: 'ट्विट वर भाष्य करा',
    QUOTE_TWEETS: 'भाष्य ट्विट्स',
    RECENT: 'अलीकडील',
    RELEVANT: 'संबंधित आहे',
    REPOST: 'पुन्हा पोस्ट करा',
    REPOSTS: 'रिपोस्ट',
    RETWEET: 'पुन्हा ट्विट',
    RETWEETED_BY: 'यांनी पुन्हा ट्विट केले',
    RETWEETS: 'पुनर्ट्विट्स',
    SHARED: 'सामायिक',
    SHARED_TWEETS: 'सामायिक ट्विट',
    SHOW: 'दाखवा',
    SHOW_MORE_REPLIES: 'अधिक प्रत्युत्तरे दाखवा',
    SORT_BY: 'यानुसार विभागीत करा',
    SORT_REPLIES: 'प्रत्युत्तरांची क्रमवारी करा',
    TURN_OFF_QUOTE_TWEETS: 'भाष्य ट्विट्स बंद करा',
    TURN_OFF_RETWEETS: 'पुनर्ट्विट्स बंद करा',
    TURN_ON_RETWEETS: 'पुनर्ट्विट्स चालू करा',
    TWEET: 'ट्विट',
    TWEETS: 'ट्विट्स',
    TWEET_ALL: 'सर्व ट्विट करा',
    TWEET_INTERACTIONS: 'ट्वीट इंटरऍक्शन्स',
    TWEET_YOUR_REPLY: 'आपले प्रत्युत्तर ट्विट करा',
    UNDO_RETWEET: 'पुनर्ट्विट पूर्ववत करा',
    VIEW: 'पहा',
    WHATS_HAPPENING: 'ताज्या घडामोडी?',
  },
  ms: {
    ACCOUNT_BASED_IN_FN: function (a) {
      return 'Akaun berpangkalan di ' + a.country
    },
    ADD_ANOTHER_TWEET: 'Tambahkan Tweet lain',
    ADD_MUTED_WORD: 'Tambahkan perkataan yang disenyapkan',
    GROK_ACTIONS: 'Tindakan Grok',
    HOME: 'Laman Utama',
    LIKES: 'Suka',
    LIVE_ON_X: 'Secara Langsung di X',
    MESSAGES: 'Mesej',
    MOST_RELEVANT: 'Paling berkaitan',
    MUTE_THIS_CONVERSATION: 'Senyapkan perbualan ini',
    POST_ALL: 'Siarkan semua',
    POST_UNAVAILABLE: 'Siaran ini tidak tersedia.',
    PROFILE_SUMMARY: 'Ringkasan Profil',
    QUOTE: 'Petikan',
    QUOTES: 'Petikan',
    QUOTE_TWEET: 'Petik Tweet',
    QUOTE_TWEETS: 'Tweet Petikan',
    RECENT: 'Terkini',
    RELEVANT: 'Berkaitan',
    REPOST: 'Siaran semula',
    REPOSTS: 'Siaran semula',
    RETWEET: 'Tweet semula',
    RETWEETED_BY: 'Ditweet semula oleh',
    RETWEETS: 'Tweet semula',
    SHARED: 'Dikongsi',
    SHARED_TWEETS: 'Tweet Berkongsi',
    SHOW: 'Tunjukkan',
    SHOW_MORE_REPLIES: 'Tunjukkan lagi balasan',
    SORT_BY: 'Isih Mengikut',
    SORT_REPLIES: 'Isih balasan',
    TURN_OFF_QUOTE_TWEETS: 'Matikan Tweet Petikan',
    TURN_OFF_RETWEETS: 'Matikan Tweet semula',
    TURN_ON_RETWEETS: 'Hidupkan Tweet semula',
    TWEETS: 'Tweet',
    TWEET_ALL: 'Tweet semua',
    TWEET_INTERACTIONS: 'Interaksi Tweet',
    TWEET_YOUR_REPLY: 'Tweet balasan anda',
    UNDO_RETWEET: 'Buat asal Tweet semula',
    VIEW: 'Lihat',
    WHATS_HAPPENING: 'Apakah yang sedang berlaku?',
  },
  nb: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Konto basert i ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Legg til en annen Tweet',
    ADD_MUTED_WORD: 'Skjul nytt ord',
    GROK_ACTIONS: 'Grok-handlinger',
    HOME: 'Hjem',
    LIKES: 'Liker',
    LIVE_ON_X: 'Direkte på X',
    MESSAGES: 'Meldinger',
    MOST_RELEVANT: 'Mest relevante',
    MUTE_THIS_CONVERSATION: 'Skjul denne samtalen',
    POST_ALL: 'Publiser alle',
    POST_UNAVAILABLE: 'Dette innlegget er utilgjengelig.',
    PROFILE_SUMMARY: 'Profilsammendrag',
    QUOTE: 'Sitat',
    QUOTES: 'Sitater',
    QUOTE_TWEET: 'Sitat-Tweet',
    QUOTE_TWEETS: 'Sitat-Tweets',
    RECENT: 'Nylig',
    REPOST: 'Republiser',
    REPOSTS: 'Republiseringer',
    RETWEETED_BY: 'Retweetet av',
    SHARED: 'Delt',
    SHARED_TWEETS: 'Delte tweets',
    SHOW: 'Vis',
    SHOW_MORE_REPLIES: 'Vis flere svar',
    SORT_BY: 'Sorter etter',
    SORT_REPLIES: 'Sorter svar',
    TURN_OFF_QUOTE_TWEETS: 'Slå av sitat-tweets',
    TURN_OFF_RETWEETS: 'Slå av Retweets',
    TURN_ON_RETWEETS: 'Slå på Retweets',
    TWEET_ALL: 'Tweet alle',
    TWEET_INTERACTIONS: 'Tweet-interaksjoner',
    TWEET_YOUR_REPLY: 'Tweet svaret ditt',
    UNDO_RETWEET: 'Angre Retweet',
    VIEW: 'Vis',
    WHATS_HAPPENING: 'Hva skjer?',
  },
  nl: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Account bevindt zich in ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Nog een Tweet toevoegen',
    ADD_MUTED_WORD: 'Genegeerd woord toevoegen',
    GROK_ACTIONS: 'Grok-acties',
    HOME: 'Startpagina',
    LIKES: 'Vind-ik-leuks',
    LIVE_ON_X: 'Live op X',
    MESSAGES: 'Berichten',
    MOST_RELEVANT: 'Meest relevant',
    MUTE_THIS_CONVERSATION: 'Dit gesprek negeren',
    POST_ALL: 'Alles plaatsen',
    POST_UNAVAILABLE: 'Deze post is niet beschikbaar.',
    PROFILE_SUMMARY: 'Profieloverzicht',
    QUOTE: 'Geciteerd',
    QUOTES: 'Geciteerd',
    QUOTE_TWEET: 'Citeer Tweet',
    QUOTE_TWEETS: 'Geciteerde Tweets',
    RETWEET: 'Retweeten',
    RETWEETED_BY: 'Geretweet door',
    SHARED: 'Gedeeld',
    SHARED_TWEETS: 'Gedeelde Tweets',
    SHOW: 'Weergeven',
    SHOW_MORE_REPLIES: 'Meer antwoorden tonen',
    SORT_BY: 'Sorteren op',
    SORT_REPLIES: 'Antwoorden sorteren',
    TURN_OFF_QUOTE_TWEETS: 'Geciteerde Tweets uitschakelen',
    TURN_OFF_RETWEETS: 'Retweets uitschakelen',
    TURN_ON_RETWEETS: 'Retweets inschakelen',
    TWEET: 'Tweeten',
    TWEET_ALL: 'Alles tweeten',
    TWEET_INTERACTIONS: 'Tweet-interacties',
    TWEET_YOUR_REPLY: 'Tweet je antwoord',
    UNDO_RETWEET: 'Retweet ongedaan maken',
    VIEW: 'Bekijken',
    WHATS_HAPPENING: 'Wat gebeurt er?',
  },
  pl: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Kraj konta: ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Dodaj kolejnego Tweeta',
    ADD_MUTED_WORD: 'Dodaj wyciszone słowo',
    GROK_ACTIONS: 'Akcje Groka',
    HOME: 'Główna',
    LIKES: 'Polubienia',
    LIVE_ON_X: 'Na żywo w serwisie X',
    MESSAGES: 'Wiadomości',
    MOST_RELEVANT: 'Najtrafniejsze',
    MUTE_THIS_CONVERSATION: 'Wycisz tę rozmowę',
    POST_ALL: 'Opublikuj wszystko',
    POST_UNAVAILABLE: 'Ten wpis jest niedostępny.',
    PROFILE_SUMMARY: 'Podsumowanie profilu',
    QUOTE: 'Cytuj',
    QUOTES: 'Cytaty',
    QUOTE_TWEET: 'Cytuj Tweeta',
    QUOTE_TWEETS: 'Cytaty z Tweeta',
    RECENT: 'Najnowsze',
    REPOST: 'Podaj dalej wpis',
    REPOSTS: 'Wpisy podane dalej',
    RETWEET: 'Podaj dalej',
    RETWEETED_BY: 'Podane dalej przez',
    RETWEETS: 'Tweety podane dalej',
    SHARED: 'Udostępniony',
    SHARED_TWEETS: 'Udostępnione Tweety',
    SHOW: 'Pokaż',
    SHOW_MORE_REPLIES: 'Pokaż więcej odpowiedzi',
    SORT_BY: 'Sortuj według',
    SORT_REPLIES: 'Sortuj odpowiedzi',
    TURN_OFF_QUOTE_TWEETS: 'Wyłącz tweety z cytatem',
    TURN_OFF_RETWEETS: 'Wyłącz Tweety podane dalej',
    TURN_ON_RETWEETS: 'Włącz Tweety podane dalej',
    TWEETS: 'Tweety',
    TWEET_ALL: 'Tweetnij wszystko',
    TWEET_INTERACTIONS: 'Interakcje na Tweeta',
    TWEET_YOUR_REPLY: 'Tweeta swoją odpowiedź',
    UNDO_RETWEET: 'Cofnij podanie dalej',
    VIEW: 'Wyświetl',
    WHATS_HAPPENING: 'Co się dzieje?',
  },
  pt: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Conta com base em ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Adicionar outro Tweet',
    ADD_MUTED_WORD: 'Adicionar palavra silenciada',
    GROK_ACTIONS: 'Ações do Grok',
    HOME: 'Página Inicial',
    LIKES: 'Curtidas',
    LIVE_ON_X: 'Ao vivo no X',
    MESSAGES: 'Mensagens',
    MOST_RELEVANT: 'Mais relevante',
    MUTE_THIS_CONVERSATION: 'Silenciar esta conversa',
    POST_ALL: 'Postar tudo',
    POST_UNAVAILABLE: 'Este post está indisponível.',
    PROFILE_SUMMARY: 'Resumo do perfil',
    QUOTE: 'Comentar',
    QUOTES: 'Comentários',
    QUOTE_TWEET: 'Comentar o Tweet',
    QUOTE_TWEETS: 'Tweets com comentário',
    RECENT: 'Recente',
    REPOST: 'Repostar',
    RETWEET: 'Retweetar',
    RETWEETED_BY: 'Retweetado por',
    SHARED: 'Compartilhado',
    SHARED_TWEETS: 'Tweets Compartilhados',
    SHOW: 'Mostrar',
    SHOW_MORE_REPLIES: 'Mostrar mais respostas',
    SORT_BY: 'Classificar por',
    SORT_REPLIES: 'Ordenar respostas',
    TURN_OFF_QUOTE_TWEETS: 'Desativar Tweets com comentário',
    TURN_OFF_RETWEETS: 'Desativar Retweets',
    TURN_ON_RETWEETS: 'Ativar Retweets',
    TWEET: 'Tweetar',
    TWEET_ALL: 'Tweetar tudo',
    TWEET_INTERACTIONS: 'Interações com Tweet',
    TWEET_YOUR_REPLY: 'Tweetar sua resposta',
    UNDO_RETWEET: 'Desfazer Retweet',
    VIEW: 'Ver',
    WHATS_HAPPENING: 'O que está acontecendo?',
  },
  ro: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Cont din ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Adaugă alt Tweet',
    ADD_MUTED_WORD: 'Adaugă cuvântul ignorat',
    GROK_ACTIONS: 'Acțiuni Grok',
    HOME: 'Pagina principală',
    LIKES: 'Aprecieri',
    LIVE_ON_X: 'În direct pe X',
    MESSAGES: 'Mesaje',
    MOST_RELEVANT: 'Cele mai relevante',
    MUTE_THIS_CONVERSATION: 'Ignoră această conversație',
    POST_ALL: 'Postează tot',
    POST_UNAVAILABLE: 'Această postare este indisponibilă.',
    PROFILE_SUMMARY: 'Sumarul profilului',
    QUOTE: 'Citat',
    QUOTES: 'Citate',
    QUOTE_TWEET: 'Citează Tweetul',
    QUOTE_TWEETS: 'Tweeturi cu citat',
    RECENT: 'Recente',
    RELEVANT: 'Relevante',
    REPOST: 'Repostează',
    REPOSTS: 'Repostări',
    RETWEET: 'Redistribuie',
    RETWEETED_BY: 'Redistribuit de către',
    RETWEETS: 'Retweeturi',
    SHARED: 'Partajat',
    SHARED_TWEETS: 'Tweeturi partajate',
    SHOW: 'Afișează',
    SHOW_MORE_REPLIES: 'Afișează mai multe răspunsuri',
    SORT_BY: 'Sortează după',
    SORT_REPLIES: 'Sortare răspunsuri',
    TURN_OFF_QUOTE_TWEETS: 'Dezactivează tweeturile cu citat',
    TURN_OFF_RETWEETS: 'Dezactivează Retweeturile',
    TURN_ON_RETWEETS: 'Activează Retweeturile',
    TWEETS: 'Tweeturi',
    TWEET_ALL: 'Dă Tweeturi cu tot',
    TWEET_INTERACTIONS: 'Interacțiuni cu Tweetul',
    TWEET_YOUR_REPLY: 'Dă Tweet cu răspunsul',
    UNDO_RETWEET: 'Anulează Retweetul',
    VIEW: 'Vezi',
    WHATS_HAPPENING: 'Ce se întâmplă?',
  },
  ru: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Страна или регион: ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Добавить еще один твит',
    ADD_MUTED_WORD: 'Добавить игнорируемое слово',
    GROK_ACTIONS: 'Действия Grok',
    HOME: 'Главная',
    LIKES: 'Нравится',
    LIVE_ON_X: 'Прямой эфир в X',
    MESSAGES: 'Сообщения',
    MOST_RELEVANT: 'Наиболее актуальные',
    MUTE_THIS_CONVERSATION: 'Игнорировать эту переписку',
    POST_ALL: 'Опубликовать все',
    POST_UNAVAILABLE: 'Этот пост недоступен.',
    PROFILE_SUMMARY: 'Сводка профиля',
    QUOTE: 'Цитата',
    QUOTES: 'Цитаты',
    QUOTE_TWEET: 'Цитировать',
    QUOTE_TWEETS: 'Твиты с цитатами',
    RECENT: 'Последние',
    RELEVANT: 'Актуально',
    REPOST: 'Сделать репост',
    REPOSTS: 'Репосты',
    RETWEET: 'Ретвитнуть',
    RETWEETED_BY: 'Ретвитнул(а)',
    RETWEETS: 'Ретвиты',
    SHARED: 'Общий',
    SHARED_TWEETS: 'Общие твиты',
    SHOW: 'Показать',
    SHOW_MORE_REPLIES: 'Показать ещё ответы',
    SORT_BY: 'Сортировать по',
    SORT_REPLIES: 'Упорядочить ответы',
    TURN_OFF_QUOTE_TWEETS: 'Отключить твиты с цитатами',
    TURN_OFF_RETWEETS: 'Отключить ретвиты',
    TURN_ON_RETWEETS: 'Включить ретвиты',
    TWEET: 'Твитнуть',
    TWEETS: 'Твиты',
    TWEET_ALL: 'Твитнуть все',
    TWEET_INTERACTIONS: 'Взаимодействие в Твитнуть',
    TWEET_YOUR_REPLY: 'Твитните свой ответ',
    TWITTER: 'Твиттер',
    UNDO_RETWEET: 'Отменить ретвит',
    VIEW: 'Посмотреть',
    WHATS_HAPPENING: 'Что происходит?',
  },
  sk: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Účet sa používa z krajiny ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Pridať ďalší Tweet',
    ADD_MUTED_WORD: 'Pridať stíšené slovo',
    GROK_ACTIONS: 'Akcie Groka',
    HOME: 'Domov',
    LIKES: 'Páči sa',
    LIVE_ON_X: 'Naživo na X',
    MESSAGES: 'Správy',
    MOST_RELEVANT: 'Najrelevantnejšie',
    MUTE_THIS_CONVERSATION: 'Stíšiť túto konverzáciu',
    POST_ALL: 'Uverejniť všetko',
    POST_UNAVAILABLE: 'Tento príspevok je nedostupný.',
    PROFILE_SUMMARY: 'Súhrn profilu',
    QUOTE: 'Citát',
    QUOTES: 'Citáty',
    QUOTE_TWEET: 'Tweet s citátom',
    QUOTE_TWEETS: 'Tweety s citátom',
    RECENT: 'Nedávne',
    REPOST: 'Opätovné uverejnenie',
    REPOSTS: 'Opätovné uverejnenia',
    RETWEET: 'Retweetnuť',
    RETWEETED_BY: 'Retweetnuté používateľom',
    RETWEETS: 'Retweety',
    SHARED: 'Zdieľaný',
    SHARED_TWEETS: 'Zdieľané Tweety',
    SHOW: 'Zobraziť',
    SHOW_MORE_REPLIES: 'Zobraziť viac odpovedí',
    SORT_BY: 'Spôsob zoradenia',
    SORT_REPLIES: 'Zoradiť odpovede',
    TURN_OFF_QUOTE_TWEETS: 'Vypnúť tweety s citátom',
    TURN_OFF_RETWEETS: 'Vypnúť retweety',
    TURN_ON_RETWEETS: 'Zapnúť retweety',
    TWEET: 'Tweetnuť',
    TWEETS: 'Tweety',
    TWEET_ALL: 'Tweetnuť všetko',
    TWEET_INTERACTIONS: 'Interakcie s Tweet',
    TWEET_YOUR_REPLY: 'Tweetnite odpoveď',
    UNDO_RETWEET: 'Zrušiť retweet',
    VIEW: 'Zobraziť',
    WHATS_HAPPENING: 'Čo sa deje?',
  },
  sr: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Земља у којој је налог основан: ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Додај још један твит',
    ADD_MUTED_WORD: 'Додај игнорисану реч',
    GROK_ACTIONS: 'Grok радње',
    HOME: 'Почетна',
    LIKES: 'Свиђања',
    LIVE_ON_X: 'Уживо на мрежи X',
    MESSAGES: 'Поруке',
    MOST_RELEVANT: 'Најважније',
    MUTE_THIS_CONVERSATION: 'Игнориши овај разговор',
    POST_ALL: 'Објави све',
    POST_UNAVAILABLE: 'Ова објава није доступна.',
    PROFILE_SUMMARY: 'Резиме профила',
    QUOTE: 'Цитат',
    QUOTES: 'Цитати',
    QUOTE_TWEET: 'твит са цитатом',
    QUOTE_TWEETS: 'твит(ов)а са цитатом',
    RECENT: 'Недавни',
    RELEVANT: 'Релевантно',
    REPOST: 'Поново објави',
    REPOSTS: 'Понвне објаве',
    RETWEET: 'Ретвитуј',
    RETWEETED_BY: 'Ретвитовано од стране',
    RETWEETS: 'Ретвитови',
    SHARED: 'Подељено',
    SHARED_TWEETS: 'Дељени твитови',
    SHOW: 'Прикажи',
    SHOW_MORE_REPLIES: 'Прикажи још одговора',
    SORT_BY: 'Сортирај по',
    SORT_REPLIES: 'Сортирање одговора',
    TURN_OFF_QUOTE_TWEETS: 'Искључи твит(ов)е са цитатом',
    TURN_OFF_RETWEETS: 'Искључи ретвитове',
    TURN_ON_RETWEETS: 'Укључи ретвитове',
    TWEET: 'Твитуј',
    TWEETS: 'Твитови',
    TWEET_ALL: 'Твитуј све',
    TWEET_INTERACTIONS: 'Интеракције са Твитуј',
    TWEET_YOUR_REPLY: 'Твитуј свој одговор',
    TWITTER: 'Твитер',
    UNDO_RETWEET: 'Опозови ретвит',
    VIEW: 'Погледај',
    WHATS_HAPPENING: 'Шта се дешава?',
  },
  sv: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Konto med bas i ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Lägg till en Tweet till',
    ADD_MUTED_WORD: 'Lägg till ignorerat ord',
    GROK_ACTIONS: 'Grok-åtgärder',
    HOME: 'Hem',
    LIKES: 'Gilla-markeringar',
    LIVE_ON_X: 'Live på X',
    MESSAGES: 'Meddelanden',
    MOST_RELEVANT: 'Mest relevant',
    MUTE_THIS_CONVERSATION: 'Ignorera den här konversationen',
    POST_ALL: 'Lägg upp allt',
    POST_UNAVAILABLE: 'Detta inlägg är inte tillgängligt.',
    PROFILE_SUMMARY: 'Profilöversikt',
    QUOTE: 'Citat',
    QUOTES: 'Citat',
    QUOTE_TWEET: 'Citera Tweet',
    QUOTE_TWEETS: 'Citat-tweets',
    RECENT: 'Senaste',
    REPOST: 'Återpublicera',
    REPOSTS: 'Återpubliceringar',
    RETWEET: 'Retweeta',
    RETWEETED_BY: 'Retweetad av',
    SHARED: 'Delad',
    SHARED_TWEETS: 'Delade tweetsen',
    SHOW: 'Visa',
    SHOW_MORE_REPLIES: 'Visa fler svar',
    SORT_BY: 'Sortera efter',
    SORT_REPLIES: 'Sortera svar',
    TURN_OFF_QUOTE_TWEETS: 'Stäng av citat-tweets',
    TURN_OFF_RETWEETS: 'Stäng av Retweets',
    TURN_ON_RETWEETS: 'Slå på Retweets',
    TWEET: 'Tweeta',
    TWEET_ALL: 'Tweeta allt',
    TWEET_INTERACTIONS: 'Interaktioner med Tweet',
    TWEET_YOUR_REPLY: 'Tweeta ditt svar',
    UNDO_RETWEET: 'Ångra retweeten',
    VIEW: 'Visa',
    WHATS_HAPPENING: 'Vad är det som händer?',
  },
  ta: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return e.country + ' -இல் உள்ள கணக்கு'
    },
    ADD_ANOTHER_TWEET: 'வேறொரு கீச்சைச் சேர்',
    ADD_MUTED_WORD: 'செயல்மறைத்த வார்த்தையைச் சேர்',
    GROK_ACTIONS: 'Grok செயல்கள்',
    HOME: 'முகப்பு',
    LIKES: 'விருப்பங்கள்',
    LIVE_ON_X: 'X -இல் நேரலை',
    MESSAGES: 'செய்திகள்',
    MOST_RELEVANT: 'மிகவும் தொடர்புடையவை',
    MUTE_THIS_CONVERSATION: 'இந்த உரையாடலை செயல்மறை',
    POST_ALL: 'எல்லாம் இடுகையிடு',
    POST_UNAVAILABLE: 'இந்த இடுகை கிடைக்கவில்லை.',
    PROFILE_SUMMARY: 'சுயவிவரச் சுருக்கம்',
    QUOTE: 'மேற்கோள்',
    QUOTES: 'மேற்கோள்கள்',
    QUOTE_TWEET: 'ட்விட்டை மேற்கோள் காட்டு',
    QUOTE_TWEETS: 'மேற்கோள் கீச்சுகள்',
    RECENT: 'சமீபத்தியவை',
    RELEVANT: 'பொருத்தமானதாக உள்ளது',
    REPOST: 'மறுஇடுகை',
    REPOSTS: 'மறுஇடுகைகள்',
    RETWEET: 'மறுட்விட் செய்',
    RETWEETED_BY: 'இவரால் மறுட்விட் செய்யப்பட்டது',
    RETWEETS: 'மறுகீச்சுகள்',
    SHARED: 'பகிரப்பட்டது',
    SHARED_TWEETS: 'பகிரப்பட்ட ட்வீட்டுகள்',
    SHOW: 'காண்பி',
    SHOW_MORE_REPLIES: 'மேலும் பதில்களைக் காண்பி',
    SORT_BY: 'இதன்படி வரிசைப்படுத்து:',
    SORT_REPLIES: 'பதில்களை வகைப்படுத்து',
    TURN_OFF_QUOTE_TWEETS: 'மேற்கோள் கீச்சுகளை அணை',
    TURN_OFF_RETWEETS: 'மறுகீச்சுகளை அணை',
    TURN_ON_RETWEETS: 'மறுகீச்சுகளை இயக்கு',
    TWEET: 'ட்விட் செய்',
    TWEETS: 'கீச்சுகள்',
    TWEET_ALL: 'அனைத்தையும் ட்விட் செய்',
    TWEET_INTERACTIONS: 'ட்விட் செய் ஊடாடல்களைக்',
    TWEET_YOUR_REPLY: 'உங்கள் பதிலை ட்விட் செய்யவும்',
    UNDO_RETWEET: 'மறுகீச்சை செயல்தவிர்',
    VIEW: 'காண்பி',
    WHATS_HAPPENING: 'என்ன நிகழ்கிறது?',
  },
  th: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'บัญชีตั้งอยู่ใน ' + e.country
    },
    ADD_ANOTHER_TWEET: 'เพิ่มอีกทวีต',
    ADD_MUTED_WORD: 'เพิ่มคำที่ซ่อน',
    GROK_ACTIONS: 'การดำเนินการของ Grok',
    HOME: 'หน้าแรก',
    LIKES: 'ความชอบ',
    LIVE_ON_X: 'ถ่ายทอดสดบน X',
    MESSAGES: 'ข้อความ',
    MOST_RELEVANT: 'เกี่ยวข้องที่สุด',
    MUTE_THIS_CONVERSATION: 'ซ่อนบทสนทนานี้',
    POST_ALL: 'โพสต์ทั้งหมด',
    POST_UNAVAILABLE: 'โพสต์นี้ไม่สามารถใช้งานได้',
    PROFILE_SUMMARY: 'ข้อมูลส่วนตัวโดยย่อ',
    QUOTE: 'การอ้างอิง',
    QUOTES: 'คำพูด',
    QUOTE_TWEET: 'อ้างอิงทวีต',
    QUOTE_TWEETS: 'ทวีตและคำพูด',
    RECENT: 'ล่าสุด',
    RELEVANT: 'เกี่ยวข้อง',
    REPOST: 'รีโพสต์',
    REPOSTS: 'รีโพสต์',
    RETWEET: 'รีทวีต',
    RETWEETED_BY: 'ถูกรีทวีตโดย',
    RETWEETS: 'รีทวีต',
    SHARED: 'แบ่งปัน',
    SHARED_TWEETS: 'ทวีตที่แชร์',
    SHOW: 'แสดง',
    SHOW_MORE_REPLIES: 'แสดงการตอบกลับเพิ่มเติม',
    SORT_BY: 'เรียงตาม',
    SORT_REPLIES: 'จัดเรียงการตอบกลับ',
    TURN_OFF_QUOTE_TWEETS: 'ปิดทวีตและคำพูด',
    TURN_OFF_RETWEETS: 'ปิดรีทวีต',
    TURN_ON_RETWEETS: 'เปิดรีทวีต',
    TWEET: 'ทวีต',
    TWEETS: 'ทวีต',
    TWEET_ALL: 'ทวีตทั้งหมด',
    TWEET_INTERACTIONS: 'การโต้ตอบของทวีต',
    TWEET_YOUR_REPLY: 'ทวีตการตอบกลับของคุณ',
    TWITTER: 'ทวิตเตอร์',
    UNDO_RETWEET: 'ยกเลิกการรีทวีต',
    VIEW: 'ดู',
    WHATS_HAPPENING: 'มีอะไรเกิดขึ้นบ้าง',
  },
  tr: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Hesabın bulunduğu ülke/bölge: ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Başka bir Tweet ekle',
    ADD_MUTED_WORD: 'Sessize alınacak kelime ekle',
    GROK_ACTIONS: 'Grok işlemleri',
    HOME: 'Anasayfa',
    LIKES: 'Beğeni',
    LIVE_ON_X: "X'te Canlı",
    MESSAGES: 'Mesajlar',
    MOST_RELEVANT: 'En alakalı',
    MUTE_THIS_CONVERSATION: 'Bu sohbeti sessize al',
    POST_ALL: 'Tümünü gönder',
    POST_UNAVAILABLE: 'Bu gönderi kullanılamıyor.',
    PROFILE_SUMMARY: 'Profil Özeti',
    QUOTE: 'Alıntı',
    QUOTES: 'Alıntılar',
    QUOTE_TWEET: 'Tweeti Alıntıla',
    QUOTE_TWEETS: 'Alıntı Tweetler',
    RECENT: 'En yeni',
    RELEVANT: 'Alakalı',
    REPOST: 'Yeniden gönder',
    REPOSTS: 'Yeniden gönderiler',
    RETWEETED_BY: 'Retweetleyen(ler):',
    RETWEETS: 'Retweetler',
    SHARED: 'Paylaşılan',
    SHARED_TWEETS: 'Paylaşılan Tweetler',
    SHOW: 'Göster',
    SHOW_MORE_REPLIES: 'Daha fazla yanıt göster',
    SORT_BY: 'Şuna göre sırala:',
    SORT_REPLIES: 'Yanıtları sırala',
    TURN_OFF_QUOTE_TWEETS: 'Alıntı Tweetleri kapat',
    TURN_OFF_RETWEETS: 'Retweetleri kapat',
    TURN_ON_RETWEETS: 'Retweetleri aç',
    TWEET: 'Tweetle',
    TWEETS: 'Tweetler',
    TWEET_ALL: 'Hepsini Tweetle',
    TWEET_INTERACTIONS: 'Tweet etkileşimleri',
    TWEET_YOUR_REPLY: 'Yanıtını Tweetle',
    UNDO_RETWEET: 'Retweeti Geri Al',
    VIEW: 'Görüntüle',
    WHATS_HAPPENING: 'Neler oluyor?',
  },
  uk: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return 'Країна чи регіон: ' + e.country
    },
    ADD_ANOTHER_TWEET: 'Додати ще один твіт',
    ADD_MUTED_WORD: 'Додати слово до списку ігнорування',
    GROK_ACTIONS: 'Дії Grok',
    HOME: 'Головна',
    LIKES: 'Вподобання',
    LIVE_ON_X: 'Прямий ефір в X',
    MESSAGES: 'Повідомлення',
    MOST_RELEVANT: 'Найактуальніші',
    MUTE_THIS_CONVERSATION: 'Ігнорувати цю розмову',
    POST_ALL: 'Опублікувати все',
    POST_UNAVAILABLE: 'Цей пост недоступний.',
    PROFILE_SUMMARY: 'Зведення профілю',
    QUOTE: 'Цитата',
    QUOTES: 'Цитати',
    QUOTE_TWEET: 'Цитувати твіт',
    QUOTE_TWEETS: 'Цитовані твіти',
    RECENT: 'Нещодавні',
    RELEVANT: 'Актуальні',
    REPOST: 'Зробити репост',
    REPOSTS: 'Репости',
    RETWEET: 'Ретвітнути',
    RETWEETED_BY: 'Ретвіти',
    RETWEETS: 'Ретвіти',
    SHARED: 'Спільний',
    SHARED_TWEETS: 'Спільні твіти',
    SHOW: 'Показати',
    SHOW_MORE_REPLIES: 'Показати більше відповідей',
    SORT_BY: 'Сортування за',
    SORT_REPLIES: 'Сортувати відповіді',
    TURN_OFF_QUOTE_TWEETS: 'Вимкнути цитовані твіти',
    TURN_OFF_RETWEETS: 'Вимкнути ретвіти',
    TURN_ON_RETWEETS: 'Увімкнути ретвіти',
    TWEET: 'Твіт',
    TWEETS: 'Твіти',
    TWEET_ALL: 'Твітнути все',
    TWEET_INTERACTIONS: 'Взаємодія твітів',
    TWEET_YOUR_REPLY: 'Твітніть відповідь',
    TWITTER: 'Твіттер',
    UNDO_RETWEET: 'Скасувати ретвіт',
    VIEW: 'Переглянути',
    WHATS_HAPPENING: 'Що відбувається?',
  },
  ur: {
    ADD_ANOTHER_TWEET: 'ایک اور ٹویٹ شامل کریں',
    ADD_MUTED_WORD: 'میوٹ شدہ لفظ شامل کریں',
    HOME: 'ہوم',
    LIKES: 'لائک',
    MESSAGES: 'پیغامات',
    MUTE_THIS_CONVERSATION: 'اس گفتگو کو میوٹ کریں',
    QUOTE: 'نقل کریں',
    QUOTES: 'منقول',
    QUOTE_TWEET: 'ٹویٹ کا حوالہ دیں',
    QUOTE_TWEETS: 'ٹویٹ کو نقل کرو',
    RECENT: 'حالیہ',
    RETWEET: 'ریٹویٹ',
    RETWEETED_BY: 'جنہوں نے ریٹویٹ کیا',
    RETWEETS: 'ریٹویٹس',
    SHARED: 'مشترکہ',
    SHARED_TWEETS: 'مشترکہ ٹویٹس',
    SHOW: 'دکھائیں',
    SHOW_MORE_REPLIES: 'مزید جوابات دکھائیں',
    SORT_BY: 'چھانٹیں بلحاظ',
    TURN_OFF_QUOTE_TWEETS: 'ٹویٹ کو نقل کرنا بند کریں',
    TURN_OFF_RETWEETS: 'ری ٹویٹس غیر فعال کریں',
    TURN_ON_RETWEETS: 'ری ٹویٹس غیر فعال کریں',
    TWEET: 'ٹویٹ',
    TWEETS: 'ٹویٹس',
    TWEET_ALL: 'سب کو ٹویٹ کریں',
    TWEET_INTERACTIONS: 'ٹویٹ تعاملات',
    TWEET_YOUR_REPLY: 'اپنا جواب ٹویٹ کریں',
    TWITTER: 'ٹوئٹر',
    UNDO_RETWEET: 'ری ٹویٹ کو کالعدم کریں',
    VIEW: 'دیکھیں',
    WHATS_HAPPENING: 'کیا ہو رہا ہے؟',
  },
  vi: {
    ACCOUNT_BASED_IN_FN: function (n) {
      return 'Tài khoản ở ' + n.country
    },
    ADD_ANOTHER_TWEET: 'Thêm Tweet khác',
    ADD_MUTED_WORD: 'Thêm từ tắt tiếng',
    GROK_ACTIONS: 'Hành động của Grok',
    HOME: 'Trang chủ',
    LIKES: 'Lượt thích',
    LIVE_ON_X: 'Trực tuyến trên X',
    MESSAGES: 'Tin nhắn',
    MOST_RELEVANT: 'Liên quan nhất',
    MUTE_THIS_CONVERSATION: 'Tắt tiếng cuộc trò chuyện này',
    POST_ALL: 'Đăng tất cả',
    POST_UNAVAILABLE: 'Không có bài đăng này.',
    PROFILE_SUMMARY: 'Tóm tắt hồ sơ',
    QUOTE: 'Trích dẫn',
    QUOTES: 'Trích dẫn',
    QUOTE_TWEET: 'Trích dẫn Tweet',
    QUOTE_TWEETS: 'Tweet trích dẫn',
    RECENT: 'Gần đây',
    RELEVANT: 'Có liên quan',
    REPOST: 'Đăng lại',
    REPOSTS: 'Bài đăng lại',
    RETWEET: 'Tweet lại',
    RETWEETED_BY: 'Được Tweet lại bởi',
    RETWEETS: 'Các Tweet lại',
    SHARED: 'Đã chia sẻ',
    SHARED_TWEETS: 'Tweet được chia sẻ',
    SHOW: 'Hiện',
    SHOW_MORE_REPLIES: 'Hiển thị thêm trả lời',
    SORT_BY: 'Sắp xếp theo',
    SORT_REPLIES: 'Sắp xếp câu trả lời',
    TURN_OFF_QUOTE_TWEETS: 'Tắt Tweet trích dẫn',
    TURN_OFF_RETWEETS: 'Tắt Tweet lại',
    TURN_ON_RETWEETS: 'Bật Tweet lại',
    TWEETS: 'Tweet',
    TWEET_ALL: 'Đăng Tweet tất cả',
    TWEET_INTERACTIONS: 'Tương tác Tweet',
    TWEET_YOUR_REPLY: 'Đăng Tweet câu trả lời của bạn',
    UNDO_RETWEET: 'Hoàn tác Tweet lại',
    VIEW: 'Xem',
    WHATS_HAPPENING: 'Chuyện gì đang xảy ra?',
  },
  'zh-Hant': {
    ACCOUNT_BASED_IN_FN: function (e) {
      return '帳戶所在地 ' + e.country
    },
    ADD_ANOTHER_TWEET: '加入另一則推文',
    ADD_MUTED_WORD: '加入靜音文字',
    GROK_ACTIONS: 'Grok 動作',
    HOME: '首頁',
    LIKES: '喜歡的內容',
    LIVE_ON_X: 'X 上的直播',
    MESSAGES: '訊息',
    MOST_RELEVANT: '最相關',
    MUTE_THIS_CONVERSATION: '將此對話靜音',
    POST_ALL: '全部發佈',
    POST_UNAVAILABLE: '此貼文無法查看。',
    PROFILE_SUMMARY: '個人檔案摘要',
    QUOTE: '引用',
    QUOTES: '引用',
    QUOTE_TWEET: '引用推文',
    QUOTE_TWEETS: '引用的推文',
    RECENT: '最近',
    REPOST: '轉發',
    REPOSTS: '轉發',
    RETWEET: '轉推',
    RETWEETED_BY: '已被轉推',
    RETWEETS: '轉推',
    SHARED: '共享',
    SHARED_TWEETS: '分享的推文',
    SHOW: '顯示',
    SHOW_MORE_REPLIES: '顯示更多回覆',
    SORT_BY: '排序方式',
    SORT_REPLIES: '將回覆排序',
    TURN_OFF_QUOTE_TWEETS: '關閉引用的推文',
    TURN_OFF_RETWEETS: '關閉轉推',
    TURN_ON_RETWEETS: '開啟轉推',
    TWEET: '推文',
    TWEETS: '推文',
    TWEET_ALL: '推全部內容',
    TWEET_INTERACTIONS: '推文互動',
    TWEET_YOUR_REPLY: '推你的回覆',
    UNDO_RETWEET: '取消轉推',
    VIEW: '查看',
    WHATS_HAPPENING: '有什麼新鮮事？',
  },
  zh: {
    ACCOUNT_BASED_IN_FN: function (e) {
      return '账号所在地 ' + e.country
    },
    ADD_ANOTHER_TWEET: '添加另一条推文',
    ADD_MUTED_WORD: '添加要隐藏的字词',
    GROK_ACTIONS: 'Grok 操作',
    HOME: '主页',
    LIKES: '喜欢',
    LIVE_ON_X: 'X 上的直播',
    MESSAGES: '私信',
    MOST_RELEVANT: '最相关',
    MUTE_THIS_CONVERSATION: '隐藏此对话',
    POST_ALL: '全部发帖',
    POST_UNAVAILABLE: '这个帖子不可用。',
    PROFILE_SUMMARY: '个人资料概要',
    QUOTE: '引用',
    QUOTES: '引用',
    QUOTE_TWEET: '引用推文',
    QUOTE_TWEETS: '引用推文',
    RECENT: '最近',
    RELEVANT: '相关',
    REPOST: '转帖',
    REPOSTS: '转帖',
    RETWEET: '转推',
    RETWEETED_BY: '转推者',
    RETWEETS: '转推',
    SHARED: '共享',
    SHARED_TWEETS: '分享的推文',
    SHOW: '显示',
    SHOW_MORE_REPLIES: '显示更多回复',
    SORT_BY: '排序方式',
    SORT_REPLIES: '对回复排序',
    TURN_OFF_QUOTE_TWEETS: '关闭引用推文',
    TURN_OFF_RETWEETS: '关闭转推',
    TURN_ON_RETWEETS: '开启转推',
    TWEET: '推文',
    TWEETS: '推文',
    TWEET_ALL: '全部发推',
    TWEET_INTERACTIONS: '推文互动',
    TWEET_YOUR_REPLY: '发布你的回复',
    UNDO_RETWEET: '撤销转推',
    VIEW: '查看',
    WHATS_HAPPENING: '有什么新鲜事？',
  },
}

/**
 * @param {import("./types").LocaleFunctionKey} key
 */
function getFn(key) {
  return (locales[lang] || locales['en'])[key] || locales['en'][key];
}

/**
 * @param {import("./types").LocaleStringKey} key
 */
function getString(key) {
  return (locales[lang] || locales['en'])[key] || locales['en'][key];
}
//#endregion
/** @enum {string} */
const Svgs = {
  BLUE_LOGO_PATH: 'M16.5 3H2v18h15c3.038 0 5.5-2.46 5.5-5.5 0-1.4-.524-2.68-1.385-3.65-.08-.09-.089-.22-.023-.32.574-.87.908-1.91.908-3.03C22 5.46 19.538 3 16.5 3zm-.796 5.99c.457-.05.892-.17 1.296-.35-.302.45-.684.84-1.125 1.15.004.1.006.19.006.29 0 2.94-2.269 6.32-6.421 6.32-1.274 0-2.46-.37-3.459-1 .177.02.357.03.539.03 1.057 0 2.03-.35 2.803-.95-.988-.02-1.821-.66-2.109-1.54.138.03.28.04.425.04.206 0 .405-.03.595-.08-1.033-.2-1.811-1.1-1.811-2.18v-.03c.305.17.652.27 1.023.28-.606-.4-1.004-1.08-1.004-1.85 0-.4.111-.78.305-1.11 1.113 1.34 2.775 2.22 4.652 2.32-.038-.17-.058-.33-.058-.51 0-1.23 1.01-2.22 2.256-2.22.649 0 1.235.27 1.647.7.514-.1.997-.28 1.433-.54-.168.52-.526.96-.992 1.23z',
  MESSAGES_ACTIVE_PATH: 'M1.998 4.499c0-.828.671-1.499 1.5-1.499h17c.828 0 1.5.671 1.5 1.499v2.858l-10 4.545-10-4.547V4.499zm0 5.053V19.5c0 .828.671 1.5 1.5 1.5h17c.828 0 1.5-.672 1.5-1.5V9.554l-10 4.545-10-4.547z',
  MESSAGES_INACTIVE_PATH: 'M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v13c0 1.381-1.119 2.5-2.5 2.5h-15c-1.381 0-2.5-1.119-2.5-2.5v-13zm2.5-.5c-.276 0-.5.224-.5.5v2.764l8 3.638 8-3.636V5.5c0-.276-.224-.5-.5-.5h-15zm15.5 5.463l-8 3.636-8-3.638V18.5c0 .276.224.5.5.5h15c.276 0 .5-.224.5-.5v-8.037z',
  BLOCK_PATH: 'M12 3.75c-4.55 0-8.25 3.69-8.25 8.25 0 1.92.66 3.68 1.75 5.08L17.09 5.5C15.68 4.4 13.92 3.75 12 3.75zm6.5 3.17L6.92 18.5c1.4 1.1 3.16 1.75 5.08 1.75 4.56 0 8.25-3.69 8.25-8.25 0-1.92-.65-3.68-1.75-5.08zM1.75 12C1.75 6.34 6.34 1.75 12 1.75S22.25 6.34 22.25 12 17.66 22.25 12 22.25 1.75 17.66 1.75 12z',
  MUTE: '<g><path d="M18 6.59V1.2L8.71 7H5.5C4.12 7 3 8.12 3 9.5v5C3 15.88 4.12 17 5.5 17h2.09l-2.3 2.29 1.42 1.42 15.5-15.5-1.42-1.42L18 6.59zm-8 8V8.55l6-3.75v3.79l-6 6zM5 9.5c0-.28.22-.5.5-.5H8v6H5.5c-.28 0-.5-.22-.5-.5v-5zm6.5 9.24l1.45-1.45L16 19.2V14l2 .02v8.78l-6.5-4.06z"></path></g>',
  // The icon X currently uses in the Mute menu item
  MUTE_X: '<g><path d="M16 22h-2.35l-.275-.219-3.842-3.073 1.424-1.424L14 19.72v-5.477l2-2V22z"></path><path d="M16 6.586l4.293-4.293 1.414 1.414-18 18-1.414-1.414 2.657-2.658C3.795 17.063 3 15.875 3 14.5v-5C3 7.567 4.567 6 6.5 6h2.148l4.727-3.781.274-.219H16v4.586zM9.625 7.78L9.351 8H6.5C5.672 8 5 8.672 5 9.5v5c0 .828.672 1.5 1.5 1.5h.086L14 8.586V4.28l-4.375 3.5z"></path></g>',
  PROMOTED_PATH: 'M19.498 3h-15c-1.381 0-2.5 1.12-2.5 2.5v13c0 1.38 1.119 2.5 2.5 2.5h15c1.381 0 2.5-1.12 2.5-2.5v-13c0-1.38-1.119-2.5-2.5-2.5zm-3.502 12h-2v-3.59l-5.293 5.3-1.414-1.42L12.581 10H8.996V8h7v7z',
  RETWEET: '<g><path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"></path></g>',
  RETWEETS_OFF: '<g><path d="M3.707 21.707l18-18-1.414-1.414-2.088 2.088C17.688 4.137 17.11 4 16.5 4H11v2h5.5c.028 0 .056 0 .084.002l-10.88 10.88c-.131-.266-.204-.565-.204-.882V7.551l2.068 1.93 1.365-1.462L4.5 3.882.068 8.019l1.365 1.462 2.068-1.93V16c0 .871.278 1.677.751 2.334l-1.959 1.959 1.414 1.414zM18.5 9h2v7.449l2.068-1.93 1.365 1.462-4.433 4.137-4.432-4.137 1.365-1.462 2.067 1.93V9zm-8.964 9l-2 2H13v-2H9.536z"></path></g>',
  TWITTER_FEATHER_PLUS_PATH: 'M23 3c-6.62-.1-10.38 2.421-13.05 6.03C7.29 12.61 6 17.331 6 22h2c0-1.007.07-2.012.19-3H12c4.1 0 7.48-3.082 7.94-7.054C22.79 10.147 23.17 6.359 23 3zm-7 8h-1.5v2H16c.63-.016 1.2-.08 1.72-.188C16.95 15.24 14.68 17 12 17H8.55c.57-2.512 1.57-4.851 3-6.78 2.16-2.912 5.29-4.911 9.45-5.187C20.95 8.079 19.9 11 16 11zM4 9V6H1V4h3V1h2v3h3v2H6v3H4z',
  TWITTER_HOME_ACTIVE_PATH: 'M12 1.696L.622 8.807l1.06 1.696L3 9.679V19.5C3 20.881 4.119 22 5.5 22h13c1.381 0 2.5-1.119 2.5-2.5V9.679l1.318.824 1.06-1.696L12 1.696zM12 16.5c-1.933 0-3.5-1.567-3.5-3.5s1.567-3.5 3.5-3.5 3.5 1.567 3.5 3.5-1.567 3.5-3.5 3.5z',
  TWITTER_HOME_INACTIVE_PATH: 'M12 9c-2.209 0-4 1.791-4 4s1.791 4 4 4 4-1.791 4-4-1.791-4-4-4zm0 6c-1.105 0-2-.895-2-2s.895-2 2-2 2 .895 2 2-.895 2-2 2zm0-13.304L.622 8.807l1.06 1.696L3 9.679V19.5C3 20.881 4.119 22 5.5 22h13c1.381 0 2.5-1.119 2.5-2.5V9.679l1.318.824 1.06-1.696L12 1.696zM19 19.5c0 .276-.224.5-.5.5h-13c-.276 0-.5-.224-.5-.5V8.429l7-4.375 7 4.375V19.5z',
  TWITTER_LOGO_PATH: 'M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z',
  X_CHAT_ACTIVE_PATH: 'M12.001 1.5c5.858 0 10.7 4.518 10.7 10.2-.001 5.683-4.842 10.2-10.7 10.2-1.785 0-2.96-.555-3.95-1.095-1.876.768-4.02 1.2-6.245-.075l-.885-.505.523-.875c.54-.904.77-1.581.849-2.118.077-.526.02-.98-.11-1.463-.066-.25-.15-.502-.247-.788-.095-.277-.204-.59-.301-.92-.2-.674-.36-1.449-.332-2.39C1.319 6.002 6.153 1.5 12 1.5z',
  X_CHAT_INACTIVE_PATH: 'M20.7 11.7c0-4.48-3.844-8.2-8.699-8.2-4.854 0-8.698 3.72-8.698 8.2v.015l-.001.014c-.02.667.09 1.225.25 1.767.083.28.176.545.276.839.098.285.202.595.288.918.177.663.284 1.401.156 2.271-.086.582-.274 1.191-.582 1.855 1.264.375 2.55.053 4.013-.599l.455-.203.437.242c1.07.594 1.917 1.08 3.406 1.08 4.855 0 8.7-3.72 8.7-8.199zm2 0c0 5.683-4.84 10.2-10.699 10.2-1.784 0-2.96-.555-3.95-1.095-1.876.768-4.02 1.2-6.245-.075l-.885-.505.524-.875c.54-.904.77-1.581.848-2.118.078-.526.02-.98-.11-1.463-.066-.25-.15-.502-.247-.788-.095-.277-.204-.59-.301-.92-.199-.674-.36-1.449-.332-2.39C1.322 6.002 6.154 1.5 12.002 1.5c5.859 0 10.7 4.518 10.7 10.2z',
  X_HOME_ACTIVE_PATH: 'M10.059 2.593c1.175-.784 2.707-.784 3.882 0l6.5 4.333C21.415 7.575 22 8.668 22 9.838V18.5c0 1.933-1.567 3.5-3.5 3.5h-4.25v-5.25c0-1.243-1.007-2.25-2.25-2.25s-2.25 1.007-2.25 2.25V22H5.5C3.567 22 2 20.433 2 18.5V9.838c0-1.17.585-2.263 1.559-2.912l6.5-4.333z',
  X_HOME_INACTIVE_PATH: 'M20 9.838c0-.502-.25-.97-.668-1.248l-6.5-4.333c-.504-.336-1.16-.336-1.664 0l-6.5 4.333C4.251 8.868 4 9.336 4 9.838V18.5c0 .828.672 1.5 1.5 1.5h3v-3.5c0-1.933 1.567-3.5 3.5-3.5s3.5 1.567 3.5 3.5V20h3c.828 0 1.5-.672 1.5-1.5V9.838zm2 8.662c0 1.933-1.567 3.5-3.5 3.5h-5v-5.5c0-.829-.672-1.5-1.5-1.5s-1.5.671-1.5 1.5V22h-5C3.567 22 2 20.433 2 18.5V9.838c0-1.17.585-2.263 1.559-2.912l6.5-4.333c1.175-.784 2.707-.784 3.882 0l6.5 4.333C21.415 7.575 22 8.668 22 9.838V18.5z',
  PLUS_PATH: 'M11 11V4h2v7h7v2h-7v7h-2v-7H4v-2h7z',
}

/** @enum {string} */
const Images = {
  TWITTER_FAVICON: 'data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAA0pJREFUWAntVk1oE1EQnnlJbFK3KUq9VJPYWgQVD/5QD0qpfweL1YJQoZAULBRPggp6kB78PQn14kHx0jRB0UO9REVFb1YqVBEsbZW2SbVS0B6apEnbbMbZ6qbZdTempqCHPAjvzcw3P5mdmfcAiquYgX+cAVwu/+5AdDMQnSPCHUhQA0hf+Rxy2OjicIvzm+qnKhito0qpb2wvJhWeJgCPP7oPELeHvdJ1VSGf3eOPnSWga0S0Qo9HxEkEusDBuNjbEca8G291nlBxmgDc/ukuIvAJxI6wr+yKCsq1ewLxQ2lZfpQLo8oQ4ZXdCkfnACrGWpyDCl+oQmVn5xuVPU102e2P3qoJkFOhzVb9S7KSnL5jJs/mI+As01PJFPSlZeFSZZoAGBRXBZyq9lk5NrC+e7pJ5en30c+JWk59pZ5vRDOuhAD381c/H/FKz1SMNgCE16rg505r5TT0uLqme93d0fbq+1SeLSeU83Ke0RHYFPGVPcjQfNDUwIa7M665+dQAEEjZoMwZMcEF9RxIDAgBQ2mCcqJ0Z0b+h4MNbZ4RnyOSDbNmE2iRk5jCNgIIckFoZAs4IgfLGrlKGjkzS16iwj6pV9I4mUvCPf73JVytH9nRJj24QHrqU8NCIWrMaGqAC+Ut/3ZzAS63cx4v2K/x/IvQBOCwWzu5KmJGwEJ5PIgeG9nQBDDcXPpFoDjJ7ThvBC6EZxXWkJG+JgAFwGM4KBAOcibeGCn8FQ/hyajXPmSk+1sACogn4hYk7OdiHDFSWipPkPWSmY6mCzIghEEuxJvcEYUvxIdhX2mvmSHDDPBF9AJRnDZTyp+P40671JYLbxiAohDxSTfQIg4oNxgPzCWPHaWQBViOf2jGqVwBaEaxGbAqOFMrp+SefC8eNhoFIY5lXzpmtnMGUB2IbU3JdIqVW9m5zcxINn/hAYKiIexdaTh4srHKORMAP0b28PNgJyGt5gvHzQVYx91QpVcwpRFl/p63HSR1DLbid1OcTpAJQOG7u+KH+aI5Qwj13IsamU5vkUSIc8uGLDa8OtoivV8U5HcydFLtT7hlSDVy2nfxI2Ibg9awuVU8IeJAOMF5m2B6jFs1tM5R9rS3GRP5uSuiihn4DzPwA7z7GDH+43gqAAAAAElFTkSuQmCC',
  TWITTER_PIP_FAVICON: 'data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAALASURBVHgB7VZNchJBFP5eM9FoRWV2WiZmbmBuIJ4g5ASBRWJlRXIC4ASQVUqxCo4QTwDegJzAiYlFXM1YZWmVQD9fQ6YyAwMMGBZW8i2G6e7He1+/3wHuOih4+fWieJhiKsirA0ZbE44fXZUaWDIGBH4/L+UUUB897DMfPf5ermKJUOaRIhTiDlNEBSwZlnkwY2vCuYOEWD/xMrCoKC41utISRlcc3Or2dfnqwHbDcj9X0fbztn9DAHxOoM0xrZILSIBXtR9F0VGKbJIhz7kVi3Lr770yAz4p2iYm188/awVi6lo4Ns4mETEDLz94uTHjIxDDRaWoohhOSjwi/9mKEFjtlKsayAuRM7M2HmFJwCRVIIqLSAAJjS822v0Vaip1E1oKC6XrXtrExjnxnJ6ldoVKFj0+ujywW3FKTTzJoibmAXP+Yt9uBEsrfLbWRelJzS/0B8z4WoKa6zW/1dd83Hlnn0Z0peAQkqNHvNPZi+qIELBWUNU97LLJ4hDESMZSlNmo+b5UTEvC85m0JCipTQREE+BhdzypIwSkLvyn4LKYrEzQkSZCloiyw+xJbnygfxX+VAJrPWnBoC9ixBXdDm4XflD7YajIinFq3L0E45J7fBa3HyEg7mhgeWjPJODu223J/iMsATzhcmp04+ueXTW1OsiD2zIuVfNNLockBAyIkdaaPxHGs3YR0JTQWnGbWkFCQZX5imwCmBoX++nGpONYD1zu2S0a9IN/g3jSNcNnqsy0ww2ZdPJzCKLXWAAy1N6ay2BRAgEcGZ+aqDnaoqdbjw6dhQgYwz1S2xKOQyQ0Phy7vDPr5iH5ITY+elmtpddLFyQzZBTP3xGl3FJ95NzQJ1hiAgMSw5jnJOZvMA/EMBNKSW89kUAAp+45+g+yojRjljL9NoP4GxdLYzk334vy3lYP0HBjhsw97vHf4C/b8RLHAOr+CQAAAABJRU5ErkJggg==',
}

//#region Constants
const THEME_BLUE = 'rgb(29, 155, 240)'
const TITLE_NOTIFICATION_RE = /^\(\d+\+?\) /
const URL_PROFILE_RE = /^\/([a-zA-Z\d_]{1,20})(?:\/(with_replies|reposts|media|articles|highlights|subs|all|likes|superfollows))?\/?$/
const URL_TWEET_RE = /^\/([a-zA-Z\d_]{1,20})\/status\/(\d+)\/?$/
const URL_TWEET_ENGAGEMENT_RE = /^\/([a-zA-Z\d_]{1,20})\/status\/(\d+)\/(quotes|retweets|reposts|likes)\/?$/
const URL_FOLLOW_LIST_RE = /^\/([a-zA-Z\d_]{1,20})\/(verified_followers|followers_you_follow|followers|following)\/?$/
const URL_LIST_RE = /^\/i\/lists\/\d+\/?$/
/** Mobile's full-screen video feed, where the next video autoplays */
const URL_MEDIA_VIEWER_RE = /\/status\/\d+\/(mediaviewer|video\/\d+)\/?$/
const NOT_PROFILE_PATHS = new Set([
  'compose', 'explore', 'home', 'i', 'jobs', 'login', 'logout', 'messages',
  'notifications', 'search', 'settings', 'tos', 'privacy',
])
/** Where the disabled Home timeline redirects to - old values kept working */
const HOME_REDIRECTS = {
  notifications: '/notifications',
  messages: '/i/chat',
  explore: '/explore',
  bookmarks: '/i/history',
  'i/bookmarks': '/i/history',
}
/** The post "…" menu's trigger, excluding the one inside a quoted post */
const POST_MENU_TRIGGER = 'button[data-slot="xds-menu-trigger"]:has(use[href="#icon-more-dots-hor"], svg[data-icon="icon-more-dots-hor"])'
const TIMELINE_ROW = '[id^="urt:"] > ul > li'
//#endregion

//#region Variables
/** @type {HTMLElement} */
let $body = null
let currentPath = ''
/** @type {string} */
let currentPage = ''
let observingPage = false
/** Set when the user picks a reply sort themselves, so we stop forcing ours */
let userSortedReplies = false
/** Set when the user picks Recent/Popular themselves, so we stop forcing ours */
let userSortedFollowing = false
/** The post whose "…" menu was opened last, for menu items that need its data */
/** @type {HTMLElement} */
let $lastMenuArticle = null
/** @type {HTMLElement} */
let $lastMenuTrigger = null
let blockMenuItemClicked = false
/** The page this document was loaded on, which is the server-rendered one */
const initialPath = location.pathname
let initialRepliesSortApplied = false
let repliesSortAttempts = 0
/** Set while Birdfeed picks a sort itself, so it isn't taken as the user's */
let drivingSortMenu = false
let oneClickActionInProgress = false
/** @type {Map<string, {muting?: boolean, blocking?: boolean}>} */
let oneClickUserState = new Map()
//#endregion

//#region Utilities
function log(...args) {
  if (debug) console.log(`🐦${currentPath ? ` (${currentPath})` : ''}`, ...args)
}

function warn(...args) {
  if (debug) console.log(`❗${currentPath ? ` (${currentPath})` : ''}`, ...args)
}

function error(...args) {
  console.log(`❌${currentPath ? ` (${currentPath})` : ''}`, ...args)
}

/**
 * @param {string} id
 * @returns {HTMLStyleElement}
 */
function getStyle(id) {
  let $style = /** @type {HTMLStyleElement} */ (document.getElementById(id))
  if (!$style) {
    $style = document.createElement('style')
    $style.id = id
    // <head> may not exist yet at document_start
    ;(document.head || $html).appendChild($style)
  }
  return $style
}

/**
 * @param {string} selector
 * @param {{context?: ParentNode, timeout?: number}} [options]
 * @returns {Promise<HTMLElement | null>}
 */
function getElement(selector, {context = document, timeout = Infinity} = {}) {
  return new Promise((resolve) => {
    let $el = /** @type {HTMLElement} */ (context.querySelector(selector))
    if ($el) return resolve($el)
    let timer
    let observer = new MutationObserver(() => {
      let $el = /** @type {HTMLElement} */ (context.querySelector(selector))
      if ($el) {
        observer.disconnect()
        clearTimeout(timer)
        resolve($el)
      }
    })
    observer.observe(context == document ? $html : /** @type {Node} */ (context), {childList: true, subtree: true})
    if (timeout != Infinity) {
      timer = setTimeout(() => {
        observer.disconnect()
        resolve(null)
      }, timeout)
    }
  })
}

function storeConfigChanges(changes) {
  window.postMessage({type: 'cpftConfigChange', changes})
}

function getViewerScreenName() {
  // @ts-expect-error
  return window.__INITIAL_DATA__?.viewerScreenName ?? null
}

function getApiHeaders(contentType) {
  let csrfToken = document.cookie.split('; ').find(c => c.startsWith('ct0='))?.split('=')[1]
  return {
    'authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
    'content-type': contentType,
    'x-twitter-active-user': 'yes',
    'x-twitter-auth-type': 'OAuth2Session',
    'x-twitter-client-language': lang,
    ...(csrfToken && {'x-csrf-token': csrfToken}),
  }
}

/** @param {string} svg */
function svgDataUrl(svg) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
//#endregion

//#region Data index
// Everything Birdfeed needs to know about a post or user is in the GraphQL
// responses the client already fetches, so we index them as they pass through
// fetch() instead of reading React internals, which have no stable shape.

/**
 * @typedef {{
 *   id: string
 *   screenName: string
 *   createdAt: number
 *   retweetedId: string | null
 *   quotedId: string | null
 *   quotedScreenName: string | null
 *   quotedCreatedAt: number | null
 *   quotedUnavailable: boolean
 *   grokShare: boolean
 *   counts: Record<string, number> | null
 * }} TweetInfo
 * @typedef {{
 *   id: string
 *   screenName: string
 *   blueVerified: boolean
 *   verifiedType: string | null
 *   following: boolean
 *   followedBy: boolean
 *   followers: number
 *   muting: boolean
 *   blocking: boolean
 * }} UserInfo
 */

/** @type {Map<string, TweetInfo>} */
const tweets = new Map()
/** @type {Map<string, UserInfo>} keyed by lowercased screen name */
const users = new Map()
/** @type {Map<string, string>} t.co URL → expanded URL */
const tcoUrls = new Map()

function unwrapTweet(result) {
  if (result?.__typename == 'TweetWithVisibilityResults') return result.tweet
  return result
}

function indexUser(user) {
  let screenName = user?.core?.screen_name
  if (!screenName || !user.rest_id) return null
  /** @type {UserInfo} */
  let info = {
    id: user.rest_id,
    screenName,
    blueVerified: Boolean(user.verification?.is_blue_verified),
    verifiedType: user.verification?.verified_type ?? null,
    following: Boolean(user.relationship_perspectives?.following),
    followedBy: Boolean(user.relationship_perspectives?.followed_by),
    followers: user.relationship_counts?.followers ?? 0,
    muting: Boolean(user.relationship_perspectives?.muting),
    blocking: Boolean(user.relationship_perspectives?.blocking),
  }
  users.set(screenName.toLowerCase(), info)
  return info
}

const GROK_SHARE_RE = /(?:x|twitter)\.com\/i\/grok\/share\//

function indexTweet(tweet) {
  tweet = unwrapTweet(tweet)
  if (!tweet?.rest_id || tweet.__typename != 'Tweet') return null
  let user = indexUser(tweet.core?.user_results?.result)
  let retweeted = unwrapTweet(tweet.legacy?.retweeted_status_results?.result)
  let quotedResult = tweet.quoted_tweet_results?.result
  let quoted = unwrapTweet(quotedResult)
  let hasQuote = quotedResult != null || tweet.legacy?.quoted_status_permalink != null
  if (retweeted) indexTweet(retweeted)
  if (quoted?.__typename == 'Tweet') indexTweet(quoted)
  let urls = JSON.stringify([tweet.url_entities, tweet.legacy?.entities?.urls, tweet.card?.legacy?.binding_values])
  /** @type {TweetInfo} */
  let info = {
    id: tweet.rest_id,
    screenName: user?.screenName ?? '',
    createdAt: tweet.details?.created_at_ms ?? 0,
    retweetedId: retweeted?.rest_id ?? null,
    quotedId: quoted?.rest_id ?? null,
    quotedScreenName: quoted?.core?.user_results?.result?.core?.screen_name ?? null,
    quotedCreatedAt: quoted?.details?.created_at_ms ?? null,
    quotedUnavailable: hasQuote && quoted?.__typename != 'Tweet',
    grokShare: GROK_SHARE_RE.test(urls),
    counts: tweet.counts ?? null,
  }
  tweets.set(info.id, info)
  return info
}

function indexResponse(json) {
  let seen = new Set()
  ;(function walk(o) {
    if (!o || typeof o != 'object' || seen.has(o)) return
    seen.add(o)
    if (Array.isArray(o)) {
      for (let item of o) walk(item)
      return
    }
    if (o.__typename == 'Tweet' && o.rest_id) indexTweet(o)
    else if (o.__typename == 'User' && o.rest_id) indexUser(o)
    if (typeof o.url == 'string' && typeof o.expanded_url == 'string' && o.url.startsWith('https://t.co/')) {
      tcoUrls.set(o.url, o.expanded_url)
    }
    for (let key in o) walk(o[key])
  })(json)
}
//#endregion

//#region Timeline filtering
/**
 * @typedef {'home' | 'list' | 'profile' | 'tweet' | 'notifications' | 'search' | 'other'} TimelineContext
 * @typedef {{context: TimelineContext, opScreenName?: string, focalId?: string}} FilterOptions
 */

/**
 * @param {string} op GraphQL operation name
 * @returns {TimelineContext | null} null for operations that aren't timelines
 */
function getTimelineContext(op) {
  if (/^Home(Latest)?Timeline/.test(op)) return 'home'
  if (/^List.*Timeline/.test(op)) return 'list'
  // The Reposts tab is where you go to see reposts, so it's never filtered
  if (/^User/.test(op) && /Timeline|Tweets/.test(op) && !/Repost/.test(op)) return 'profile'
  if (op == 'TweetDetail') return 'tweet'
  if (/^notifications/i.test(op)) return 'notifications'
  if (/^Search/.test(op)) return 'search'
  if (/Timeline/.test(op)) return 'other'
  return null
}

/** Entry/item content, wherever the shape puts it */
function getItemContent(entryOrItem) {
  return entryOrItem?.content?.content ?? entryOrItem?.item?.content ?? entryOrItem?.item?.itemContent ?? null
}

function isPromoted(entryOrItem) {
  if (/^promoted-/.test(entryOrItem?.entry_id ?? '')) return true
  let content = getItemContent(entryOrItem)
  return content?.promoted_metadata != null || content?.promotedMetadata != null
}

/**
 * Whether a post should be hidden, from data alone - used both when filtering
 * responses and when re-checking rows already rendered after a config change.
 * @param {TweetInfo} info
 * @param {FilterOptions} options
 * @returns {string} the reason, or '' to keep it
 */
function shouldHideTweet(info, {context, opScreenName, focalId}) {
  if (!info) return ''
  if (info.id == focalId) return ''

  let isMainTimeline = context == 'home' || context == 'list' || context == 'profile'
  if (config.hideGrokTweets && info.grokShare && (isMainTimeline || context == 'tweet')) return 'GROK_TWEET'

  let isRetweet = info.retweetedId != null
  let quoteInfo = isRetweet ? tweets.get(info.retweetedId) ?? info : info
  let isQuote = quoteInfo.quotedId != null || quoteInfo.quotedUnavailable

  if (isRetweet) {
    if (context == 'home' && config.retweets != 'ignore') return 'RETWEET'
    if (context == 'list' && config.listRetweets == 'hide') return 'RETWEET'
    if (context == 'profile' && config.hideProfileRetweets) return 'RETWEET'
  }

  if (isQuote) {
    if (context == 'home' && config.quoteTweets != 'ignore') return 'QUOTE_TWEET'
    if (config.hideUnavailableQuoteTweets && quoteInfo.quotedUnavailable && (isMainTimeline || context == 'tweet')) {
      return 'UNAVAILABLE_QUOTE'
    }
    if (config.mutableQuoteTweets) {
      // Turning off someone's quotes was only ever about Home
      if (context == 'home' && config.hideQuotesFrom.includes(quoteInfo.screenName)) return 'QUOTES_FROM'
      if (isMainTimeline && quoteInfo.quotedId && config.mutedQuotes.length > 0 && isMutedQuote(quoteInfo)) return 'MUTED_QUOTE'
    }
  }

  return ''
}

/**
 * Muted quotes stored by the old client have only the quoted author and the
 * quoted post's timestamp; new ones also have the quoted post's id.
 * @param {TweetInfo} info
 */
function isMutedQuote(info) {
  let time = info.quotedCreatedAt ? new Date(info.quotedCreatedAt).toISOString() : null
  return config.mutedQuotes.some(muted =>
    // @ts-expect-error id is only on mutes made by this version
    muted.id ? muted.id == info.quotedId : (muted.user == info.quotedScreenName && muted.time == time)
  )
}

/**
 * @param {TweetInfo} info author of a reply on a post page
 * @param {FilterOptions} options
 */
function shouldHidePremiumReply(info, {opScreenName}) {
  if (!config.hideTwitterBlueReplies || !info) return false
  let user = users.get(info.screenName.toLowerCase())
  // Business and Government checks count too, so their show* settings apply
  if (!user || !(user.blueVerified || user.verifiedType)) return false
  // Their own thread, and your own replies
  if (info.screenName.toLowerCase() == opScreenName?.toLowerCase()) return false
  if (info.screenName.toLowerCase() == getViewerScreenName()?.toLowerCase()) return false
  return !(
    config.showPremiumReplyBusiness && user.verifiedType == 'Business' ||
    config.showPremiumReplyGovernment && user.verifiedType == 'Government' ||
    config.showPremiumReplyFollowing && user.following ||
    config.showPremiumReplyFollowedBy && user.followedBy ||
    config.showBlueReplyFollowersCount && user.followers >= Number(config.showBlueReplyFollowersCountAmount)
  )
}

/**
 * @param {any} entryOrItem
 * @param {FilterOptions} options
 * @returns {string} the reason, or '' to keep it
 */
function shouldRemoveEntry(entryOrItem, options) {
  let id = String(entryOrItem?.entry_id ?? entryOrItem?.entryId ?? '')
  if (id.startsWith('cursor-')) return ''
  if (isPromoted(entryOrItem)) return 'PROMOTED'

  let {context} = options
  let content = getItemContent(entryOrItem)
  let typename = content?.__typename ?? ''

  // In search these suggestions only went when its own setting was on too
  if (config.hideWhoToFollowEtc && (context != 'search' || config.hideSuggestedContentSearch) &&
      /^(who-to-follow|who-to-subscribe|connect-module|topics-module|creator-subscriptions)-/.test(id)) {
    return 'WHO_TO_FOLLOW'
  }
  if (config.hideMoreTweets && id.startsWith('tweetdetailrelatedtweets-')) return 'DISCOVER_MORE'
  if (config.hideSuggestedContentSearch && context == 'search' && id.startsWith('relevanceprompt-')) return 'SUGGESTED_CONTENT'
  if (/^(messageprompt|inline-prompt|relevanceprompt)-/.test(id) || /Prompt$/.test(typename)) {
    if (config.hideInlinePrompts) return 'INLINE_PROMPT'
    // Premium prompts are upsells, whatever the prompt setting says
    if (config.hideTwitterBlueUpsells && JSON.stringify(content ?? '').includes('/i/premium')) return 'PREMIUM_PROMPT'
  }

  if (typename == 'TimelineNotification') {
    if (config.hideNotificationLikes && content.icon == 'heart_icon') return 'NOTIFICATION_LIKE'
    if (config.hideNotificationRetweets && content.icon == 'retweet_icon') return 'NOTIFICATION_RETWEET'
    return ''
  }

  if (typename == 'TimelineTweet') {
    // "This post is unavailable" / "from an account you muted" in threads
    let resultType = content.tweet_results?.result?.__typename
    if (context == 'tweet' && config.hideUnavailableQuoteTweets && /^Tweet(Tombstone|Unavailable)$/.test(resultType ?? '')) {
      return 'UNAVAILABLE'
    }
    let tweet = unwrapTweet(content.tweet_results?.result)
    if (!tweet) return ''
    let info = tweets.get(tweet.rest_id) ?? indexTweet(tweet)
    return shouldHideTweet(info, options)
  }

  return ''
}

/**
 * Removes entries in place. Modules (conversations, carousels) are filtered
 * item by item, and dropped when nothing they render is left.
 * @param {any} json
 * @param {FilterOptions} options
 * @returns {Record<string, number>} counts of what was removed, by reason
 */
function filterTimeline(json, options) {
  /** @type {Record<string, number>} */
  let removed = {}
  let count = (reason) => removed[reason] = (removed[reason] ?? 0) + 1

  let seen = new Set()
  ;(function walk(o) {
    if (!o || typeof o != 'object' || seen.has(o)) return
    seen.add(o)
    if (Array.isArray(o)) {
      for (let item of o) walk(item)
      return
    }
    if (Array.isArray(o.entries)) {
      o.entries = o.entries.filter(entry => {
        let reason = shouldRemoveEntry(entry, options)
        if (reason) {
          count(reason)
          return false
        }
        let items = entry?.content?.items
        if (Array.isArray(items) && items.length > 0) {
          // A reply thread on a post page is judged by the reply it starts with
          if (options.context == 'tweet' && /^conversationthread-/.test(entry.entry_id ?? '')) {
            let first = getItemContent(items[0])
            let tweet = unwrapTweet(first?.tweet_results?.result)
            if (tweet && shouldHidePremiumReply(tweets.get(tweet.rest_id), options)) {
              count('PREMIUM_REPLY')
              return false
            }
          }
          entry.content.items = items.filter(item => {
            let reason = shouldRemoveEntry(item, options)
            if (reason) count(reason)
            return !reason
          })
          if (entry.content.items.length == 0) return false
        }
        return true
      })
    }
    // A single entry replacing or pinning one at the top of a timeline
    if (o.entry && typeof o.entry == 'object' && shouldRemoveEntry(o.entry, options)) {
      count(shouldRemoveEntry(o.entry, options))
      o.entry = null
    }
    for (let key in o) walk(o[key])
  })(json)

  return removed
}
//#endregion

//#region Network
// Installed as early as possible so the first timeline page passes through it.
// X's own fetch wrapper is installed after ours and calls through to it.

const nativeFetch = window.fetch

/**
 * @param {RequestInfo | URL} input
 */
function getRequestUrl(input) {
  if (typeof input == 'string') return input
  if (input instanceof URL) return input.href
  return input?.url ?? ''
}

/**
 * Rewrites the `variables` GraphQL parameter of a GET URL.
 * @param {string} url
 * @param {(variables: any) => boolean} patch returns true if it changed anything
 */
function patchUrlVariables(url, patch) {
  try {
    let request = new URL(url, location.href)
    let variables = JSON.parse(request.searchParams.get('variables') ?? 'null')
    if (variables && patch(variables)) {
      request.searchParams.set('variables', JSON.stringify(variables))
      return request.href
    }
  } catch (e) {
    error('error patching request variables', e)
  }
  return url
}

/**
 * Rewrites the `variables` of a POSTed GraphQL JSON body.
 * @param {any} body
 * @param {(variables: any) => boolean} patch
 */
function patchBodyVariables(body, patch) {
  if (typeof body != 'string') return body
  try {
    let data = JSON.parse(body)
    if (data?.variables && patch(data.variables)) return JSON.stringify(data)
  } catch (e) {
    error('error patching request body', e)
  }
  return body
}

/** @param {any} variables */
function patchRepliesSort(variables) {
  if (config.sortReplies == 'relevant' || userSortedReplies) return false
  let rankingMode = {liked: 'Likes', recent: 'Recency'}[config.sortReplies]
  // An explicit choice made in X's own menu wins
  if (!rankingMode || variables.rankingMode != null) return false
  log('sortReplies: forcing', rankingMode)
  variables.rankingMode = rankingMode
  return true
}

/** @param {any} variables */
function patchFollowingSort(variables) {
  if (config.sortFollowing == 'ignore' || userSortedFollowing) return false
  if (typeof variables.enableRanking != 'boolean') {
    warn('sortFollowing: typeof variables.enableRanking is', typeof variables.enableRanking)
    return false
  }
  let enableRanking = config.sortFollowing == 'popular'
  if (variables.enableRanking == enableRanking) return false
  log('sortFollowing: forcing enableRanking', enableRanking)
  variables.enableRanking = enableRanking
  return true
}

window.fetch = async function(input, init) {
  let url = getRequestUrl(input)
  let match = config.enabled ? /\/graphql\/[^/]+\/([A-Za-z]+)/.exec(url) : null
  if (!match) return nativeFetch.apply(this, arguments)

  let op = match[1]
  let args = /** @type {[RequestInfo | URL, RequestInit?]} */ ([input, init])
  let variables = null

  try {
    if (op == 'TweetDetail' || /^HomeLatestTimeline/.test(op)) {
      let patch = op == 'TweetDetail' ? patchRepliesSort : patchFollowingSort
      if (init?.body != null) {
        args = [input, {...init, body: patchBodyVariables(init.body, patch)}]
      } else if (typeof input == 'string' || input instanceof URL) {
        args = [patchUrlVariables(url, patch), init]
      }
    }
    variables = JSON.parse(new URL(getRequestUrl(args[0]), location.href).searchParams.get('variables') ?? 'null') ??
                JSON.parse(typeof args[1]?.body == 'string' ? args[1].body : 'null')?.variables ?? null
  } catch (e) {
    error('error inspecting request', op, e)
  }

  let response = await nativeFetch.apply(this, args)
  if (!response.ok || !(response.headers.get('content-type') ?? '').includes('json')) return response

  let json
  try {
    json = await response.clone().json()
  } catch (e) {
    return response
  }

  try {
    indexResponse(json)
    let context = getTimelineContext(op)
    if (!context) return response
    let focalId = variables?.focalTweetId
    let removed = filterTimeline(json, {
      context,
      focalId,
      opScreenName: focalId ? tweets.get(focalId)?.screenName : undefined,
    })
    if (Object.keys(removed).length == 0) return response
    if (config.debugLogTimelineStats || debug) log(`${op}: removed`, removed)
    return new Response(JSON.stringify(json), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })
  } catch (e) {
    error('error filtering', op, e)
    return response
  }
}
//#endregion

//#region Feature flags
// Feature switches arrive in window.__INITIAL_DATA__, which an inline script
// assigns before the app reads it - trap the assignment to adjust them.
// @ts-expect-error
let initialData = window.__INITIAL_DATA__
function patchFeatureSwitches(data) {
  let features = data?.featureSwitchPayload?.features
  if (!features || !config.enabled) return
  if (config.bypassAgeVerification && 'rweb_age_assurance_flow_enabled' in features) {
    features.rweb_age_assurance_flow_enabled = false
  }
}
if (initialData) {
  patchFeatureSwitches(initialData)
} else {
  try {
    Object.defineProperty(window, '__INITIAL_DATA__', {
      configurable: true,
      enumerable: true,
      get() { return initialData },
      set(value) {
        patchFeatureSwitches(value)
        initialData = value
      },
    })
  } catch (e) {
    error('error trapping __INITIAL_DATA__', e)
  }
}
//#endregion

//#region Routing
// TanStack Router drives the browser history API, so watching it is enough to
// know when the page changes - no need to find the router in React's tree.

const History_pushState = history.pushState
const History_replaceState = history.replaceState
history.pushState = function() {
  let result = History_pushState.apply(this, arguments)
  queueMicrotask(onLocationChange)
  return result
}
history.replaceState = function() {
  let result = History_replaceState.apply(this, arguments)
  queueMicrotask(onLocationChange)
  return result
}
window.addEventListener('popstate', () => queueMicrotask(onLocationChange))

let cachedRouter = null
/**
 * The TanStack Router instance, found by walking React's fiber tree from the
 * document (React 19 hydrates the whole document). Only used for navigation.
 */
function getRouter() {
  if (cachedRouter) return cachedRouter
  let containerKey = Object.keys(document).find(k => k.startsWith('__reactContainer'))
  if (!containerKey) return null
  let fiber = document[containerKey]
  let stack = [[fiber, 0]]
  let visited = 0
  while (stack.length && visited < 2000) {
    let [f, depth] = stack.pop()
    if (!f || depth > 80) continue
    visited++
    let router = f.memoizedProps?.router
    if (router && typeof router.navigate == 'function') {
      cachedRouter = router
      return router
    }
    stack.push([f.sibling, depth], [f.child, depth + 1])
  }
  return null
}

/**
 * @param {string} href
 * @param {{replace?: boolean}} [options]
 */
function navigate(href, {replace = false} = {}) {
  log('navigating to', href, {replace})
  let router = getRouter()
  if (router) {
    try {
      router.navigate({href, replace})
      return
    } catch (e) {
      warn('router.navigate failed, falling back to history', e)
    }
  }
  ;(replace ? History_replaceState : History_pushState).call(history, history.state, '', href)
  window.dispatchEvent(new PopStateEvent('popstate', {state: history.state}))
  onLocationChange()
}

/**
 * Page names Birdfeed's CSS keys off, set as a class on <body>.
 * @param {string} path
 */
function getPageClass(path) {
  if (path == '/home') return 'HomeTimeline'
  if (path.startsWith('/notifications')) return 'Notifications'
  if (path == '/explore' || path.startsWith('/explore/')) return 'Explore'
  if (path == '/search') return 'Search'
  if (path.startsWith('/i/history') || path.startsWith('/i/bookmarks')) return 'Bookmarks'
  if (path.startsWith('/i/chat') || path.startsWith('/messages')) return 'Messages'
  if (path.startsWith('/settings')) return 'Settings'
  if (URL_LIST_RE.test(path)) return 'List'
  if (URL_TWEET_RE.test(path)) return 'Tweet'
  let engagement = URL_TWEET_ENGAGEMENT_RE.exec(path)
  if (engagement) return engagement[3] == 'quotes' ? 'QuoteTweets' : 'TweetEngagement'
  if (URL_FOLLOW_LIST_RE.test(path)) return 'FollowList'
  let profile = URL_PROFILE_RE.exec(path)
  if (profile && !NOT_PROFILE_PATHS.has(profile[1].toLowerCase())) return 'Profile'
  return ''
}

let previousSearch = ''
function onLocationChange() {
  let path = location.pathname
  let search = location.search
  if (path + search == currentPath + previousSearch) return
  let previousPath = currentPath
  let previousPathSearch = previousSearch
  currentPath = path
  previousSearch = search
  currentPage = getPageClass(path)
  log('location changed', {path, search, page: currentPage})

  if (!config.enabled) return
  if (runRedirects(path, search, previousPath, previousPathSearch)) return
  if ($body) updateBodyClasses()
  configureDynamicCss()
  // A sort picked on one post applies to that post only
  if (path != previousPath) userSortedReplies = false
  exploreSearchFocused = false
  // Re-arm the once-per-visit tab switch on Home
  homeTabSwitched = false
  homeTabSwitchUntil = 0
}

/**
 * @returns {boolean} whether navigation was triggered
 */
function runRedirects(path, search, previousPath, previousSearchString) {
  if (config.disableHomeTimeline && path == '/home') {
    let target = HOME_REDIRECTS[config.disabledHomeTimelineRedirect] ?? `/${config.disabledHomeTimelineRedirect}`
    navigate(target, {replace: true})
    return true
  }

  if (config.defaultToLatestSearch && path == '/search') {
    let params = new URLSearchParams(search)
    let previous = new URLSearchParams(previousSearchString)
    // Only a new search defaults to Latest - picking Top afterwards sticks
    let isNewSearch = previousPath != '/search' || previous.get('q') != params.get('q')
    if (isNewSearch && params.get('q') && !params.has('f')) {
      params.set('f', 'live')
      navigate(`/search?${params}`, {replace: true})
      return true
    }
  }

  if (config.hideVerifiedNotificationsTab) {
    let followList = URL_FOLLOW_LIST_RE.exec(path)
    if (followList && followList[2] == 'verified_followers') {
      navigate(`/${followList[1]}/followers`, {replace: true})
      return true
    }
  }

  return false
}
//#endregion

//#region Body classes
let mobileQuery = window.matchMedia('(max-width: 511px)')

function updateBodyClasses() {
  if (!$body) return
  let pageClasses = [
    'HomeTimeline', 'Notifications', 'Explore', 'Search', 'Bookmarks', 'Messages',
    'Settings', 'List', 'Tweet', 'QuoteTweets', 'TweetEngagement', 'FollowList', 'Profile',
  ]
  for (let pageClass of pageClasses) {
    $body.classList.toggle(pageClass, config.enabled && pageClass == currentPage)
  }
  $body.classList.toggle('Mobile', config.enabled && mobile)
  $body.classList.toggle('Desktop', config.enabled && desktop)
}

function updateVersion() {
  mobile = mobileQuery.matches
  desktop = !mobile
  let version = mobile ? 'mobile' : 'desktop'
  if (version != config.version) {
    config.version = version
    // The options page shows the settings for the version in use
    storeConfigChanges({version})
  }
  updateBodyClasses()
  configureCss()
}
mobileQuery.addEventListener('change', updateVersion)
//#endregion

//#region CSS
/**
 * Hides a timeline row without leaving a gap: the list is virtualized and
 * ignores rows measured at 0px, but re-flows around a row shrunk to 1px.
 */
const COLLAPSE_ROW_CSS = `
  height: 1px !important;
  min-height: 0 !important;
  max-height: 1px !important;
  overflow: hidden !important;
  opacity: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  border: 0 !important;
  pointer-events: none !important;
`

function configureCss() {
  let $style = getStyle('cpftStyle')
  if (!config.enabled) {
    $style.textContent = ''
    return
  }

  /** @type {string[]} */
  let hide = []
  /** @type {string[]} */
  let rules = []

  // Rows Birdfeed decides to hide after they've rendered
  rules.push(`${TIMELINE_ROW}.cpft_collapsed > * { ${COLLAPSE_ROW_CSS} }`)
  // Ads that got past the network filter (e.g. the first page, if the app
  // started before this script): posts in a timeline whose header has no
  // timestamp link outside a quoted post, because ads show "Ad" there instead.
  // Never the focused post on a post page.
  rules.push(`
    body:not(.Tweet) ${TIMELINE_ROW}:has(article):not(:has(article a[data-base-ui-tooltip-trigger][href*="/status/"]:not([data-slot="embedded-tweet-frame"] *))) > *,
    body.Tweet ${TIMELINE_ROW}:has(article):not(:has(.text-lead)):not(:has(article a[data-base-ui-tooltip-trigger][href*="/status/"]:not([data-slot="embedded-tweet-frame"] *))):not(:has(> button)) > * {
      ${COLLAPSE_ROW_CSS}
    }
  `)

  // One-click buttons
  rules.push(`
    .cpft_one_click {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      margin-inline-start: 4px;
    }
    .cpft_one_click_button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 9999px;
      color: var(--x-fg-secondary);
      cursor: pointer;
    }
    .cpft_one_click_button:hover,
    .cpft_one_click_button:focus-visible {
      background-color: color-mix(in srgb, rgb(244, 33, 46) 10%, transparent);
      color: rgb(244, 33, 46);
      outline: none;
    }
    .cpft_one_click_button svg {
      width: 18px;
      height: 18px;
      fill: currentColor;
    }
    .cpft_one_click_button.cpft_one_click_active {
      color: rgb(244, 33, 46);
    }
    .cpft_one_click_button[aria-busy] {
      opacity: .5;
    }
    body.OneClickAction [data-base-ui-portal] {
      opacity: 0 !important;
    }
    .cpft_account_location {
      color: var(--x-fg-secondary);
    }
    .cpft_interaction_links {
      display: inline-flex;
      gap: 12px;
      margin-inline-start: auto;
      color: var(--x-fg-secondary);
    }
    .cpft_interaction_links + a[href$="/quotes"] {
      margin-inline-start: 12px;
    }
  `)

  //#region Navigation
  // The rail and the mobile bottom bar are both nav[aria-label="Primary"]
  // (localised), but the rail is the one without data-bottom-bar.
  let rail = 'nav:not([data-bottom-bar])'
  let anyNav = ':is(nav, [role="menu"], [role="dialog"])'
  let menus = ':is([role="menu"], [role="dialog"])'

  if (config.hideExploreNav) {
    hide.push('nav[data-bottom-bar] a[href="/explore"]')
    if (config.hideExploreNavWithSidebar) {
      // Only when the sidebar's search box is there to replace it
      rules.push(`@media (min-width: 1024px) { ${rail} a[href="/explore"] { display: none !important; } }`)
    } else {
      hide.push(`${rail} a[href="/explore"]`)
    }
  }
  if (config.hideGrokNav) {
    hide.push(
      `${anyNav} a[href="/i/grok"]`,
      '[data-slot="xds-dock-window"]:has(> [data-slot="xds-dock-launcher"] [data-icon^="icon-logo-grok"])',
      // "Explain this post"
      'article button:has(svg[data-icon^="icon-logo-grok"], use[href^="#icon-logo-grok"])',
      // Generate image, in the composer
      '[data-media-upload-dropzone] button:has(svg[data-icon^="icon-logo-grok"])',
      '[role="dialog"] button:has(svg[data-icon^="icon-logo-grok"])',
      '.cpft_profile_summary',
    )
  }
  if (config.hideCallsNav) hide.push(`${anyNav} a[href$="/i/calls"]`)
  if (config.hideChatNav) hide.push(`${rail} a[href="/i/chat"]`, `${menus} a[href$="/i/chat"]`)
  if (config.hideMessagesDrawer) {
    hide.push('[data-slot="xds-dock-window"]:has(> [data-slot="xds-dock-launcher"] [data-icon="icon-chat"])')
  }
  if (config.hideMessagesBottomNavItem) hide.push('nav[data-bottom-bar] a[href="/i/chat"]')
  if (config.hideCreatorStudioNav) {
    hide.push(
      `${anyNav} a[href$="/creators/studio"]`,
      'body.Settings a[href="/settings/monetization"]',
      'body.Settings a[href="/settings/manage_subscriptions"]',
    )
  }
  // Bookmarks now live in History, which took its place in the nav
  if (config.hideBookmarksNav) hide.push(`${anyNav} a[href="/i/history"]`, `${anyNav} a[href="/i/bookmarks"]`)
  if (config.hideListsNav) hide.push(`${menus} a[href$="/lists"]`)
  if (config.hideCommunitiesNav) hide.push(`${menus} a[href$="/communities"]`)
  if (config.hideBusinessNav) hide.push(`${menus} a:is([href^="/i/premium-business"], [href^="/i/verified-orgs-signup"])`)
  if (config.hideAdsNav) hide.push(`${menus} a:is([href*="ads.twitter.com"], [href*="ads.x.com"])`)
  if (config.hideSpacesNav) hide.push(`${menus} a[href^="/i/spaces/start"]`)
  if (config.hideComposeTweet) hide.push('a#sidebar-compose-post', 'button[data-compose-fab]')
  if (config.hideAccountSwitcher) {
    hide.push('div:has(> [data-rail-overflow]) > div > button[aria-haspopup="menu"] > span:nth-child(2)')
  }
  if (config.disableHomeTimeline) hide.push('nav a[href="/home"]')
  if (config.hideNotifications == 'hide') {
    hide.push('nav a[href^="/notifications"]')
  }
  if (config.hideNotifications != 'ignore') {
    // Unread badges on nav items
    hide.push(`nav a :is([aria-live], [data-badge], [class*="badge"])`)
  }
  if (config.navDensity == 'comfortable' || config.navDensity == 'compact') {
    rules.push(`
      @media (min-width: 512px) {
        ${rail} > :is(a, button) {
          height: ${config.navDensity == 'compact' ? 40 : 44}px !important;
        }
      }
    `)
  }
  //#endregion

  //#region Upsells
  if (config.hideTwitterBlueUpsells) {
    hide.push(
      `${anyNav} a[href^="/i/premium"]`,
      `${anyNav} a[href^="/i/verified"]`,
      '[data-testid="premium-signup-tab"]',
      'aside section:has(a[href^="/i/premium"])',
      // "Subscribe" in the mobile header
      'main header a[href^="/i/premium"]',
      // Analytics upsell under your own posts
      'div.bg-secondary:has(> div > a[href="/i/account_analytics"])',
      '[data-base-ui-portal] [role="presentation"] a[href^="/i/premium"]',
    )
  }
  if (config.hideSubscriptions) {
    hide.push('a[href$="/creator-subscriptions/subscribe"]')
  }
  //#endregion

  //#region Sidebar
  if (config.hideSidebarContent) {
    // Modules are matched by content, never position: which ones appear, and
    // in what order, changes from page to page.
    let keep = [
      // Search filters on /search
      'section:has([role="radiogroup"])',
    ]
    if (config.showRelevantPeople) {
      // A list of user cells that isn't Who to follow
      keep.push('body.Tweet section:not(:has([data-who-to-follow])):not(:has(section)):has(> div > [role="link"][data-href])')
    }
    hide.push(
      `aside section:not(section section):not(${keep.join(', ')})`,
      'aside nav:has(a[href$="/tos"])',
    )
  } else {
    if (config.hideTodaysNews) hide.push('aside section:has(a[href^="/i/trending/"])')
    if (config.hideWhatsHappening) hide.push('aside section:not(section section):has([data-href*="src=trend_click"])')
    if (config.hideSuggestedFollows) hide.push('aside section:has([data-who-to-follow])')
    if (config.hideLiveBroadcasts) hide.push('aside section.cpft_live_broadcasts')
  }
  //#endregion

  //#region Home timeline
  // The options page only shows Hide For you under "Use Following by default"
  if (config.alwaysUseLatestTweets && config.hideForYouTimeline) {
    hide.push('[role="tablist"] > [data-pinned-timeline="for-you"]')
  }
  if (config.hideSeeNewTweets) {
    hide.push('body.HomeTimeline section > [role="status"][data-top-chrome-follow]')
  }
  if (config.hideTimelineTweetBox) {
    hide.push('body.HomeTimeline main [data-media-upload-dropzone]:has(textarea)')
  }
  //#endregion

  //#region Posts
  if (config.reducedInteractionMode) {
    hide.push('article [role="group"]:has([data-engagement-action])')
  }
  if (config.hideViews) {
    hide.push('article a[href$="/analytics"]')
  }
  if (config.hideBookmarkButton) {
    hide.push(
      `body:not(.Bookmarks) ${TIMELINE_ROW}:not(:has(.text-lead)) [data-engagement-action="bookmark"]`,
    )
    if (!config.showBookmarkButtonUnderFocusedTweets) {
      hide.push(`${TIMELINE_ROW}:has(.text-lead) [data-engagement-action="bookmark"]`)
    }
  }
  if (config.hideShareTweetButton) {
    hide.push('article [data-engagement-action="share"]')
  }
  if (config.hideViewActivityLinks) {
    hide.push(
      '[role="menuitem"]:has(svg[data-icon="icon-feather-scatter-plot"])',
      'div.bg-secondary:has(> div > a[href="/i/account_analytics"])',
    )
  }
  if (config.hideSortRepliesMenu) {
    hide.push(`body.Tweet ${TIMELINE_ROW}:has(.text-lead) button[data-slot="xds-menu-trigger"]:has(svg[data-icon="icon-chevron-down-sm"])`)
  }
  if (config.hideEditImage) {
    let imagine = ':is([href^="/i/imagine"], [href^="https://grok.com/imagine"])'
    hide.push(`article a${imagine}`, `[role="menu"] a${imagine}`)
  }
  if (config.hideMetrics) {
    let actions = [
      config.hideReplyMetrics && 'reply',
      config.hideRetweetMetrics && 'retweet',
      config.hideLikeMetrics && 'like',
      config.hideBookmarkMetrics && 'bookmark',
    ].filter(Boolean)
    if (actions.length > 0) {
      rules.push(`
        article :is(${actions.map(a => `[data-engagement-action="${a}"]`).join(', ')}) span[dir="ltr"] {
          visibility: hidden !important;
        }
      `)
    }
    if (config.hideFollowingMetrics) {
      rules.push(`
        :is(body.Profile main, [data-base-ui-portal]) a:is([href$="/following"], [href$="/verified_followers"], [href$="/followers"]) > div > span:first-child:not(:last-child) {
          display: none !important;
        }
      `)
    }
    if (config.hideTotalTweetsMetrics) {
      // "N posts" under the name in the profile's sticky header
      hide.push('body.Profile main > div > div.sticky .text-subtext2')
    }
    if (config.hideRetweetMetrics) hide.push('#cpftRetweetCount')
    if (config.hideLikeMetrics) hide.push('#cpftLikeCount')
  }
  if (config.restorePhotoGrid) {
    // Desktop only: mobile swipes through the carousel.
    // Multiple photos are a horizontal carousel inside an aspect-ratio box
    // sized for the first photo; resize the box to 16:9 and lay the slides
    // out as a 2-column grid (the first of three spans both rows).
    rules.push(`
      @media (min-width: 512px) {
      article div.h-0[style*="padding-bottom"]:has(> div > [class*="group/carousel"] a[href*="/photo/2"]) {
        padding-bottom: 56.25% !important;
      }
      article [class*="group/carousel"]:has(a[href*="/photo/2"]) > div {
        margin-inline: 0 !important;
      }
      article [class*="group/carousel"]:has(a[href*="/photo/2"]) button:has(svg[data-icon^="icon-chevron-"]) {
        display: none !important;
      }
      article [class*="group/carousel"] > div > div:has(> div a[href*="/photo/2"]) {
        display: grid !important;
        grid-template-columns: 1fr 1fr;
        grid-auto-rows: 1fr;
        gap: 2px !important;
        overflow: hidden !important;
        padding: 0 !important;
        border-radius: 16px;
      }
      article [class*="group/carousel"] > div > div:has(> div a[href*="/photo/2"]) > div {
        aspect-ratio: auto !important;
        width: 100% !important;
        height: 100% !important;
        min-height: 0 !important;
        border-radius: 0 !important;
      }
      article [class*="group/carousel"] > div > div:has(> div a[href*="/photo/2"]):has(> :nth-child(3):last-child) > :first-child {
        grid-row: span 2;
      }
      article [class*="group/carousel"] > div > div:has(> div a[href*="/photo/2"]) img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      }
    `)
  }
  if (config.twitterBlueChecks == 'hide') {
    hide.push('svg:has(> use[href="#icon-verified-premium-color"])')
  }
  if (config.twitterBlueChecks == 'replace') {
    rules.push(`
      svg:has(> use[href="#icon-verified-premium-color"]) {
        background: ${svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${THEME_BLUE}" d="${Svgs.BLUE_LOGO_PATH}"/></svg>`)} center / contain no-repeat;
      }
      svg > use[href="#icon-verified-premium-color"] {
        visibility: hidden;
      }
    `)
  }
  if (config.disableTweetTextFormatting) {
    rules.push(`
      article div[dir="auto"][lang] :is(b, strong, i, em, span) {
        font-style: normal !important;
        font-weight: normal !important;
      }
    `)
  }
  if (config.unblurSensitiveContent) {
    rules.push(`
      article :is([class*="blur-"], [class*="backdrop-blur"]):has(img, video) {
        filter: none !important;
      }
    `)
  }
  //#endregion

  //#region Pages
  if (config.hideMoreTweets) {
    rules.push(`[id^="urt:lists-management"] > ul > li:has(a[href="/i/lists/suggested"]) > * { ${COLLAPSE_ROW_CSS} }`)
  }
  if (config.hideExplorePageContents) {
    hide.push('body.Explore main :is([id^="urt:"], [role="tablist"])')
  }
  if (config.hideVerifiedNotificationsTab) {
    hide.push('[role="tablist"] a[role="tab"][href$="/verified_followers"]')
  }
  //#endregion

  //#region Look
  if (config.replaceLogo) {
    let logo = svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${THEME_BLUE}" d="${Svgs.TWITTER_LOGO_PATH}"/></svg>`)
    rules.push(`
      a[href="/home"] svg[data-icon="icon-logo-x"] {
        background: ${logo} center / contain no-repeat;
      }
      a[href="/home"] svg[data-icon="icon-logo-x"] > * {
        visibility: hidden;
      }
      a#sidebar-compose-post > span:last-child {
        font-size: 0 !important;
      }
      a#sidebar-compose-post > span:last-child::after {
        content: ${JSON.stringify(getString('TWEET'))};
        font-size: 17px;
      }
    `)
  }
  if (config.dontUseChirpFont) {
    // Tailwind's text-* size utilities set the font family themselves, so
    // overriding the --x-font-sans token alone isn't enough
    rules.push(`
      :root {
        --x-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
        font-family: var(--x-font-sans) !important;
      }
      body, button, input, textarea, select, [class*="text-"]:not([class*="font-mono"]) {
        font-family: inherit !important;
      }
    `)
  }
  if (config.dropdownMenuFontWeight) {
    rules.push('[data-slot="xds-menu-item"] { font-weight: 400 !important; }')
  }
  if (config.fullWidthContent) {
    rules.push(`
      @media (min-width: 1024px) {
        body:is(.HomeTimeline, .List) > div:has(main) {
          max-width: none !important;
        }
        body:is(.HomeTimeline, .List) > div:has(main) :has(> main) {
          --x-main-column-width: min(1000px, calc(100vw - 72px)) !important;
        }
        body:is(.HomeTimeline, .List) aside {
          display: none !important;
        }
      }
    `)
  }
  //#endregion

  $style.textContent = [
    ...rules,
    hide.length > 0 ? `${hide.join(',\n')} { display: none !important; }` : '',
  ].join('\n')
}

/** CSS that depends on the current page */
function configureDynamicCss() {
  let $style = getStyle('cpftDynamicStyle')
  let rules = []
  if (config.enabled && config.tweakQuoteTweetsPage && currentPage == 'QuoteTweets') {
    let [, , tweetId] = URL_TWEET_ENGAGEMENT_RE.exec(currentPath) ?? []
    if (tweetId) {
      // Every quote on this page quotes the same post - don't repeat it
      rules.push(`main [data-slot="embedded-tweet-frame"][data-href$="/status/${tweetId}"] { display: none !important; }`)
    }
  }
  $style.textContent = rules.join('\n')
}

function configureCustomCss() {
  getStyle('cpftCustomStyle').textContent = config.customCss ?? ''
}
//#endregion

//#region Title and favicon
let settingTitle = false
/** The title as X last set it, so changes can be undone when settings change */
let xTitle = ''
function updateTitle() {
  if (settingTitle) return
  let title = document.title
  if (title != lastSetTitle) xTitle = title
  let newTitle = xTitle
  if (config.enabled && config.hideNotifications != 'ignore') {
    newTitle = newTitle.replace(TITLE_NOTIFICATION_RE, '')
  }
  if (config.enabled && config.replaceLogo) {
    newTitle = newTitle.replace(/ \/ X$/, ` / ${getString('TWITTER')}`).replace(/ on X: /, ` on ${getString('TWITTER')}: `)
    if (newTitle == 'X') newTitle = getString('TWITTER')
  }
  if (newTitle != title) {
    settingTitle = true
    lastSetTitle = newTitle
    document.title = newTitle
    settingTitle = false
  }
}
let lastSetTitle = ''

function updateFavicon() {
  for (let $link of /** @type {NodeListOf<HTMLLinkElement>} */ (document.querySelectorAll('link[rel~="icon"]'))) {
    let href = $link.getAttribute('href') ?? ''
    if ($link.dataset.cpftOriginal == null) $link.dataset.cpftOriginal = href
    let original = $link.dataset.cpftOriginal
    // X adds -pip to the favicon's name when there are unread notifications
    let hasPip = original.includes('-pip') && config.hideNotifications == 'ignore'
    let wanted = original
    if (!config.enabled) {
      // Leave X's own favicon alone
    } else if (config.replaceLogo) {
      wanted = hasPip ? Images.TWITTER_PIP_FAVICON : Images.TWITTER_FAVICON
    } else if (config.hideNotifications != 'ignore') {
      wanted = original.replace('-pip', '')
    }
    if (href != wanted) $link.setAttribute('href', wanted)
  }
}

let observingHead = false
function observeHead() {
  if (observingHead) return
  observingHead = true
  new MutationObserver((mutations) => {
    for (let mutation of mutations) {
      let $target = mutation.target.nodeType == Node.TEXT_NODE ? mutation.target.parentElement : /** @type {Element} */ (mutation.target)
      if ($target?.closest?.('title') || [...mutation.addedNodes].some(n => n.nodeName == 'TITLE')) updateTitle()
      if ($target?.matches?.('link[rel~="icon"]')) {
        // X changed it - take its new value as the original
        if (mutation.type == 'attributes' && $target.getAttribute('href') != undefined &&
            !$target.getAttribute('href').startsWith('data:')) {
          /** @type {HTMLElement} */ ($target).dataset.cpftOriginal = $target.getAttribute('href')
        }
        updateFavicon()
      }
      if ([...mutation.addedNodes].some(n => n.nodeName == 'LINK')) updateFavicon()
    }
  }).observe(document.head, {childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['href']})
  updateTitle()
  updateFavicon()
}
//#endregion

//#region Timeline rows
/**
 * The timeline context of a rendered list, from its container id
 * (urt:home:for-you, urt:profile:<name>, urt:conversation:<id>…).
 * @param {Element} $li
 * @returns {FilterOptions}
 */
function getRowFilterOptions($li) {
  let id = $li.closest('[id^="urt:"]')?.id ?? ''
  let [, type, rest] = /^urt:([^:]+):?(.*)$/.exec(id) ?? []
  /** @type {TimelineContext} */
  let context = {
    home: 'home',
    list: 'list',
    'list-tweets': 'list',
    profile: 'profile',
    conversation: 'tweet',
    notifications: 'notifications',
    search: 'search',
  }[type] ?? 'other'
  // The Reposts tab shares the profile's timeline id, and is all reposts
  if (context == 'profile' && /\/reposts\/?$/.test(currentPath)) context = 'other'
  let focalId = context == 'tweet' ? rest : undefined
  return {context, focalId, opScreenName: focalId ? tweets.get(focalId)?.screenName : undefined}
}

/** @param {Element} $el */
function getTweetIdFromRow($el) {
  let href = $el.querySelector('[role="link"][data-href*="/status/"]')?.getAttribute('data-href') ??
             $el.querySelector('a[data-base-ui-tooltip-trigger][href*="/status/"]')?.getAttribute('href')
  return /\/status\/(\d+)/.exec(href ?? '')?.[1] ?? null
}

//#region Relay store
// Pages loaded directly are server-rendered: their first timeline page is
// streamed into Relay's store without going through fetch(), so rendered rows
// are also checked against the store. React hydrates the whole document, so
// every element carries a fiber to walk to its props.

let relayEnvironment = null
/** @type {Map<string, any>} */
let denormalizedCache = new Map()

/** @param {Element} $el */
function getFiber($el) {
  let key = Object.keys($el).find(k => k.startsWith('__reactFiber'))
  return key ? $el[key] : null
}

/** @param {any} fiber */
function getRelaySource(fiber) {
  if (!relayEnvironment) {
    for (let f = fiber, n = 0; f && n < 600; f = f.return, n++) {
      let props = f.memoizedProps
      let env = props?.environment?.getStore ? props.environment : props?.value?.getStore ? props.value : null
      if (env) {
        relayEnvironment = env
        break
      }
    }
  }
  return relayEnvironment?.getStore().getSource() ?? null
}

// Fields with no bearing on filtering, skipped to keep denormalizing cheap
const SKIP_FIELDS = /^(__fragments|__fragmentOwner|card|media_entities2|extended_entities|grok_|note_tweet|edit_control|views|unmention_data|article|birdwatch|previous_counts|avatar|profile_image|banner|location|privacy|professional|tipjar|super_follow|highlights|parody|affiliates|client_event_info|feedback_info)/

/**
 * Rebuilds a plain object from a normalized Relay record, so the same code
 * that filters GraphQL responses can judge it.
 * @param {any} source
 * @param {string} id
 */
function denormalize(source, id, depth = 0, seen = new Set()) {
  if (depth > 14 || seen.has(id)) return null
  let record = source.get(id)
  if (!record) return null
  seen.add(id)
  let result = {}
  for (let key in record) {
    // Fields with arguments are stored as name(arg:value)
    let name = key.replace(/\(.*$/s, '')
    if (SKIP_FIELDS.test(name) || (name != key && name in result)) continue
    let value = record[key]
    if (value && typeof value == 'object') {
      if (typeof value.__ref == 'string') value = denormalize(source, value.__ref, depth + 1, seen)
      else if (Array.isArray(value.__refs)) value = value.__refs.map(ref => denormalize(source, ref, depth + 1, seen))
    }
    result[name] = value
  }
  seen.delete(id)
  return result
}

/**
 * The timeline entry a row renders, from Relay.
 * @param {HTMLElement} $li
 */
function getRowEntry($li) {
  let fiber = getFiber($li)
  if (!fiber) return null
  let entry = null
  let stack = [[fiber.child, 0]]
  while (stack.length) {
    let [f, depth] = stack.pop()
    if (!f || depth > 15) continue
    if (f.memoizedProps?.entry?.__id) {
      entry = f.memoizedProps.entry
      break
    }
    stack.push([f.sibling, depth], [f.child, depth + 1])
  }
  if (!entry) return null
  if (denormalizedCache.has(entry.__id)) return denormalizedCache.get(entry.__id)
  let source = getRelaySource(fiber)
  if (!source) return null
  let denormalized = denormalize(source, entry.__id)
  if (denormalized) {
    indexResponse(denormalized)
    if (denormalizedCache.size > 1000) denormalizedCache.clear()
    denormalizedCache.set(entry.__id, denormalized)
  }
  return denormalized
}
//#endregion

/**
 * Network filtering only applies to new responses; this re-checks rendered
 * rows, so server-rendered pages, config changes and quote mutes are covered
 * without a reload.
 * @param {HTMLElement} $li
 */
function processRow($li) {
  let options = getRowFilterOptions($li)
  let reason = ''
  let entry = null
  try {
    entry = getRowEntry($li)
  } catch (e) {
    warn('error reading row entry', e)
  }
  if (entry) {
    // Same verdict the network filter would have reached
    reason = shouldRemoveEntry(entry, options)
    let items = entry.content?.items
    if (!reason && Array.isArray(items) && items.length > 0) {
      let first = getItemContent(items[0])
      let tweet = unwrapTweet(first?.tweet_results?.result)
      if (options.context == 'tweet' && /^conversationthread-/.test(entry.entry_id ?? '') &&
          tweet && shouldHidePremiumReply(tweets.get(tweet.rest_id), options)) {
        reason = 'PREMIUM_REPLY'
      } else if (items.every(item => shouldRemoveEntry(item, options))) {
        reason = 'MODULE'
      }
    }
  } else if ($li.querySelector('article')) {
    let tweetId = getTweetIdFromRow($li)
    reason = tweetId ? shouldHideTweet(tweets.get(tweetId), options) : ''
  }
  $li.classList.toggle('cpft_collapsed', Boolean(reason))
  if (reason) log('hiding rendered row', reason, entry?.entry_id)
}

function processAllRows() {
  for (let $li of /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll(TIMELINE_ROW))) {
    processRow($li)
  }
}
//#endregion

//#region Posts
/** @param {HTMLElement} $article */
function getArticleScreenName($article) {
  // The @handle link - the avatar is a placeholder until its image loads, and
  // a repost's "reposted" line links to the reposter first
  let $handle = [...$article.querySelectorAll('a[href^="/"]')].find($a =>
    !$a.closest('[data-slot="embedded-tweet-frame"]') && $a.textContent.trim().startsWith('@')
  )
  return $handle?.getAttribute('href')?.slice(1) ?? null
}

/** @param {HTMLElement} $article */
function processArticle($article) {
  // Quoted posts are articles too
  if ($article.closest('[data-slot="embedded-tweet-frame"]')) return

  if (config.oneClickMuteButton || config.oneClickBlockButton) {
    addOneClickButtons($article)
  }
  unwrapTcoLinks($article)
}

/** @param {HTMLElement} $root */
function unwrapTcoLinks($root) {
  if (!config.unwrapTcoLinks) return
  for (let $link of /** @type {NodeListOf<HTMLAnchorElement>} */ ($root.querySelectorAll('a[href^="https://t.co/"]'))) {
    let expanded = $link.title?.startsWith('http') ? $link.title : tcoUrls.get($link.href)
    if (expanded && $link.href != expanded) $link.href = expanded
  }
}

/** @param {HTMLElement} $article */
function addOneClickButtons($article) {
  if ($article.querySelector(':scope .cpft_one_click')) return
  let $trigger = [...$article.querySelectorAll(POST_MENU_TRIGGER)].find($t => !$t.closest('[data-slot="embedded-tweet-frame"]'))
  if (!$trigger) return
  let screenName = getArticleScreenName($article)
  // Your own posts have no Mute or Block items
  if (!screenName || screenName.toLowerCase() == getViewerScreenName()?.toLowerCase()) return

  let $group = createOneClickButtonGroup((action) => createOneClickButton(action, () => {
    void oneClickTweetAction($article, action)
  }))
  $trigger.before($group)
}

/**
 * @param {(action: 'mute' | 'block') => HTMLElement} createButton
 */
function createOneClickButtonGroup(createButton) {
  let $group = document.createElement('span')
  $group.className = 'cpft_one_click'
  if (config.oneClickMuteButton) $group.append(createButton('mute'))
  if (config.oneClickBlockButton) $group.append(createButton('block'))
  return $group
}

/**
 * @param {'mute' | 'block'} action
 * @param {() => void} onActivate
 */
function createOneClickButton(action, onActivate) {
  let $button = document.createElement('span')
  $button.className = 'cpft_one_click_button'
  $button.dataset.action = action
  $button.setAttribute('role', 'button')
  $button.tabIndex = 0
  $button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${
    action == 'mute' ? Svgs.MUTE_X : `<g><path d="${Svgs.BLOCK_PATH}"></path></g>`
  }</svg>`
  setOneClickButtonActive($button, false)
  let activate = (/** @type {Event} */ e) => {
    // Posts and user cells navigate when clicked
    e.preventDefault()
    e.stopPropagation()
    onActivate()
  }
  $button.addEventListener('click', activate)
  $button.addEventListener('keydown', (e) => {
    if (e.key == 'Enter' || e.key == ' ') activate(e)
  })
  return $button
}

/**
 * @param {HTMLElement} $button
 * @param {boolean} active
 */
function setOneClickButtonActive($button, active) {
  let label = getString(/** @type {import("./types").LocaleStringKey} */ (
    `${active ? 'UN' : ''}${$button.dataset.action.toUpperCase()}`
  ))
  $button.classList.toggle('cpft_one_click_active', active)
  $button.title = label
  $button.setAttribute('aria-label', label)
}

/**
 * Drives the post's own menu rather than calling the API, so X hides the post
 * and shows its usual toast.
 * @param {HTMLElement} $article
 * @param {'mute' | 'block'} action
 */
async function oneClickTweetAction($article, action) {
  if (oneClickActionInProgress) return
  let $trigger = /** @type {HTMLElement} */ ([...$article.querySelectorAll(POST_MENU_TRIGGER)].find($t => !$t.closest('[data-slot="embedded-tweet-frame"]')))
  if (!$trigger) return

  log(`oneClick: ${action} from post`)
  oneClickActionInProgress = true
  $body.classList.add('OneClickAction')
  try {
    $trigger.click()
    let $menu = await getElement('[data-base-ui-portal] [role="menu"][data-slot="xds-menu-content"]', {timeout: 1000})
    if (!$menu) return
    // Mute @user and Mute this conversation share an icon; the user one comes
    // first and names the account. Already-muted accounts have Unmute, with a
    // different icon, so nothing matches and the menu is just closed.
    let $item = /** @type {HTMLElement} */ (action == 'mute'
      ? [...$menu.querySelectorAll('[role="menuitem"]:has(svg[data-icon="icon-sound-off"])')].find($i => $i.textContent.includes('@'))
      : $menu.querySelector('[role="menuitem"]:has(svg[data-icon="icon-block"])'))
    if (!$item) {
      document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}))
      $menu.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}))
      return
    }
    $item.click()
    if (action == 'block') {
      await confirmBlockDialog()
    }
  } finally {
    oneClickActionInProgress = false
    $body.classList.remove('OneClickAction')
  }
}

async function confirmBlockDialog() {
  let $actions = await getElement('[role="dialog"] [data-slot="xds-modal-footer-actions"]', {timeout: 1000})
  // Cancel comes first, Block last
  let $confirm = /** @type {HTMLElement} */ ($actions?.querySelector(':scope > :last-child') ?? $actions?.lastElementChild)
  if ($confirm) {
    log('confirming block')
    $confirm.click()
  }
}

/**
 * User cells have no menu to drive, so these use the API directly and become
 * toggles for undoing.
 * @param {string} userId
 * @param {HTMLElement} $button
 */
async function oneClickUserAction(userId, $button) {
  if ($button.hasAttribute('aria-busy')) return

  let action = /** @type {'mute' | 'block'} */ ($button.dataset.action)
  let undo = $button.classList.contains('cpft_one_click_active')
  let endpoint = {
    mute: undo ? 'mutes/users/destroy' : 'mutes/users/create',
    block: undo ? 'blocks/destroy' : 'blocks/create',
  }[action]

  log(`oneClick: ${endpoint}`, userId)
  $button.setAttribute('aria-busy', 'true')
  try {
    let response = await nativeFetch(`/i/api/1.1/${endpoint}.json`, {
      method: 'POST',
      credentials: 'include',
      headers: getApiHeaders('application/x-www-form-urlencoded'),
      body: new URLSearchParams({user_id: userId}),
    })
    if (!response.ok) {
      error(response.status, `response from ${endpoint} for`, userId)
      return
    }
    oneClickUserState.set(userId, {
      ...oneClickUserState.get(userId),
      [action == 'mute' ? 'muting' : 'blocking']: !undo,
    })
    // The same user can appear in more than one cell
    for (let $other of document.querySelectorAll(`.cpft_one_click[data-user-id="${userId}"] .cpft_one_click_button[data-action="${action}"]`)) {
      setOneClickButtonActive(/** @type {HTMLElement} */ ($other), !undo)
    }
  } catch (e) {
    error(`error calling ${endpoint} for`, userId, e)
  } finally {
    $button.removeAttribute('aria-busy')
  }
}

/**
 * Who to follow, followers lists and the like: a link to the user plus a
 * Follow button, outside of any post.
 * @param {HTMLElement} $cell
 */
function addOneClickUserButtons($cell) {
  if ($cell.querySelector('.cpft_one_click') || $cell.closest('aside')) return
  let screenName = $cell.getAttribute('data-href')?.slice(1)
  if (!screenName || screenName.includes('/')) return
  let user = users.get(screenName.toLowerCase())
  if (!user || screenName.toLowerCase() == getViewerScreenName()?.toLowerCase()) return
  let $followButton = $cell.querySelector('button[data-slot="xds-button"]')
  if (!$followButton) return
  let state = {muting: user.muting, blocking: user.blocking, ...oneClickUserState.get(user.id)}
  let $group = createOneClickButtonGroup((action) => {
    let $button = createOneClickButton(action, () => oneClickUserAction(user.id, $button))
    setOneClickButtonActive($button, action == 'mute' ? state.muting : state.blocking)
    return $button
  })
  $group.dataset.userId = user.id
  $followButton.before($group)
}
//#endregion

//#region Account location
/** @type {Map<string, Promise<any>>} */
let accountLocationCache = new Map()

/** @param {string} screenName */
function getAccountLocation(screenName) {
  if (!accountLocationCache.has(screenName)) {
    accountLocationCache.set(screenName, (async () => {
      let response = await nativeFetch(
        `/i/api/graphql/XRqGa7EeokUU5kppkh13EA/AboutAccountQuery?variables=${encodeURIComponent(JSON.stringify({screenName}))}`,
        {credentials: 'include', headers: getApiHeaders('application/json')}
      )
      if (!response.ok) {
        error(response.status, 'response getting account location for', screenName)
        return null
      }
      let body = await response.json()
      return body.data?.user_result_by_screen_name?.result?.about_profile ?? null
    })().catch((e) => {
      error('error getting account location for', screenName, e)
      return null
    }))
  }
  return accountLocationCache.get(screenName)
}

/**
 * @param {Element} $after
 * @param {string} screenName
 * @param {string} [prefix]
 */
async function insertAccountLocation($after, screenName, prefix = '') {
  let aboutProfile = await getAccountLocation(screenName)
  let country = aboutProfile?.account_based_in
  if (!country || !$after.isConnected) return
  let $container = $after.parentElement
  if ($container.querySelector('.cpft_account_location')) return
  let $location = document.createElement('span')
  $location.className = 'cpft_account_location'
  let text = getFn('ACCOUNT_BASED_IN_FN')({country})
  if (!aboutProfile.location_accurate) text = ltr ? `${text}?` : `؟${text}`
  $location.textContent = prefix + text
  $container.append($location)
}

function processFocusedTweet() {
  let [, screenName, tweetId] = URL_TWEET_RE.exec(currentPath) ?? []
  if (!tweetId) return
  let $focal = /** @type {HTMLElement} */ (document.querySelector(`${TIMELINE_ROW}:has(.text-lead)`))
  if (!$focal) return
  // Parts of the focused post render at different times, so each step is
  // idempotent and this runs on every batch of changes.
  let $time = $focal.querySelector(`a[href$="/status/${tweetId}"]:not([data-slot="embedded-tweet-frame"] *)`)
  // The timestamp row re-renders while the page settles, taking the label
  // with it; the lookup is cached, so re-inserting is cheap
  if ($time && config.addFocusedTweetAccountLocation && !$focal.querySelector('.cpft_account_location')) {
    void insertAccountLocation($time, screenName, ' · ')
  }
  if (config.restoreOtherInteractionLinks) {
    addInteractionLinks($focal, screenName, tweetId)
  }
  void applyInitialRepliesSort($focal)
}

/**
 * A post page loaded directly is server-rendered with the default sort, so
 * the request patch never gets a chance - pick the sort in X's own menu
 * instead. Items are matched by position (Relevant, Recent, Likes) because
 * their labels are localised.
 * @param {HTMLElement} $focal
 */
async function applyInitialRepliesSort($focal) {
  if (config.sortReplies == 'relevant' || userSortedReplies || initialRepliesSortApplied) return
  if (currentPath != initialPath) return
  let $trigger = /** @type {HTMLElement} */ ($focal.querySelector('button[data-slot="xds-menu-trigger"]:has(svg[data-icon="icon-chevron-down-sm"])'))
  if (!$trigger) return
  initialRepliesSortApplied = true
  let index = {recent: 1, liked: 2}[config.sortReplies]
  if (index == null) return
  drivingSortMenu = true
  $body.classList.add('OneClickAction')
  try {
    $trigger.click()
    let $menu = await getElement('[data-base-ui-portal] [role="menu"]:has([role="menuitemradio"])', {timeout: 1000})
    // Clicked while the page was still hydrating - try again on the next pass
    if (!$menu && ++repliesSortAttempts < 5) {
      initialRepliesSortApplied = false
      setTimeout(scheduleProcessing, 500)
      return
    }
    let $item = /** @type {HTMLElement} */ ($menu?.querySelectorAll('[role="menuitemradio"]')[index])
    if ($item && $item.getAttribute('aria-checked') != 'true') {
      log('sortReplies: choosing', config.sortReplies, 'in the menu')
      $item.click()
    } else {
      $menu?.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}))
    }
  } finally {
    drivingSortMenu = false
    $body.classList.remove('OneClickAction')
  }
}

/**
 * X brought back "View quotes" under the focused post (when it has quotes),
 * but not links to who reposted or liked it. They go in the same row as the
 * reply sort menu.
 * @param {HTMLElement} $focal
 * @param {string} screenName
 * @param {string} tweetId
 */
function addInteractionLinks($focal, screenName, tweetId) {
  if ($focal.querySelector('.cpft_interaction_links')) return
  let $sortButton = $focal.querySelector('button[data-slot="xds-menu-trigger"]:has(svg[data-icon="icon-chevron-down-sm"])')
  let $quotes = /** @type {HTMLAnchorElement} */ ($focal.querySelector('a[href$="/quotes"]'))
  let $row = $quotes?.parentElement ?? $sortButton?.parentElement
  if (!$row) return

  let counts = tweets.get(tweetId)?.counts
  let isOwnTweet = screenName.toLowerCase() == getViewerScreenName()?.toLowerCase()
  let links = [
    {path: 'retweets', key: config.replaceLogo ? 'RETWEETS' : 'REPOSTS', count: counts?.retweet_count, id: 'cpftRetweetCount'},
    // Only your own posts show who liked them
    isOwnTweet && {path: 'likes', key: 'LIKES', count: counts?.favorite_count, id: 'cpftLikeCount'},
  ].filter(link => link && link.count > 0)
  if (links.length == 0) return

  let $links = document.createElement('span')
  $links.className = 'cpft_interaction_links'
  for (let {path, key, count, id} of links) {
    let $link = document.createElement('a')
    $link.className = `cpft_interaction_link ${$quotes?.className ?? 'x-link'}`
    $link.href = `/${screenName}/status/${tweetId}/${path}`
    if (count != null) {
      let $count = document.createElement('b')
      $count.id = id
      $count.textContent = `${Intl.NumberFormat(lang).format(count)} `
      $link.append($count)
    }
    $link.append(getString(/** @type {import("./types").LocaleStringKey} */ (key)))
    $link.addEventListener('click', (e) => {
      e.preventDefault()
      navigate($link.getAttribute('href'))
    })
    $links.append($link)
  }
  if ($quotes) $quotes.before($links)
  else $row.append($links)
}
//#endregion

//#region Overlays
/** @param {HTMLElement} $portal */
function processPortal($portal) {
  // Menus fill in after they mount, so this runs on every batch of changes
  // and each addition checks whether it's already there
  let $menu = /** @type {HTMLElement} */ ($portal.querySelector('[role="menu"][data-slot="xds-menu-content"]'))
  if ($menu) processMenu($menu)

  // The mobile account drawer has plain links rather than menu items
  let $drawerSettings = $portal.querySelector('[role="dialog"] a[href="/settings"]:not([role="menuitem"])')
  if ($drawerSettings && config.addAddMutedWordMenuItem && !$drawerSettings.parentElement.querySelector('.cpft_muted_word_item')) {
    addAddMutedWordMenuItem(/** @type {HTMLAnchorElement} */ ($drawerSettings))
  }

  // User hover card
  let $card = /** @type {HTMLElement} */ ($portal.querySelector('[role="presentation"]:has(a[href$="/following"]):has(a[href$="/verified_followers"], a[href$="/followers"])'))
  if ($card) processHoverCard($card)
}

/** @param {HTMLElement} $menu */
function processMenu($menu) {
  // A list page's own More menu starts with Report List
  let $reportList = $menu.querySelector('[role="menuitem"]:has(svg[data-icon="icon-flag"])')
  if ($reportList && currentPage == 'List' && !$lastMenuArticle && !$menu.querySelector('.cpft_list_retweets_item')) {
    addListRetweetsMenuItem(/** @type {HTMLElement} */ ($reportList))
  }

  // The nav's More menu is the one with Settings in it
  let $settings = $menu.querySelector('a[role="menuitem"][href="/settings"]')
  if ($settings && config.addAddMutedWordMenuItem && !$menu.querySelector('.cpft_muted_word_item')) {
    addAddMutedWordMenuItem(/** @type {HTMLAnchorElement} */ ($settings))
  }

  let $blockItem = $menu.querySelector('[role="menuitem"]:has(svg[data-icon="icon-block"])')
  if ($blockItem && config.mutableQuoteTweets && $lastMenuArticle?.isConnected && !$menu.querySelector('.cpft_quote_item')) {
    addMuteQuotesMenuItems($menu, /** @type {HTMLElement} */ ($blockItem))
  }
}

/** @param {HTMLAnchorElement} $settings */
function addAddMutedWordMenuItem($settings) {
  log('adding "Add muted word" menu item')
  let $item = /** @type {HTMLAnchorElement} */ ($settings.cloneNode(true))
  $item.classList.add('cpft_menu_item', 'cpft_muted_word_item')
  $item.href = '/settings/add_muted_keyword'
  $item.removeAttribute('id')
  let $label = [...$item.querySelectorAll('div, span')].reverse().find($el => $el.children.length == 0 && $el.textContent.trim())
  if ($label) $label.textContent = getString('ADD_MUTED_WORD')
  let $icon = $item.querySelector('svg')
  if ($icon) {
    $icon.removeAttribute('data-icon')
    $icon.setAttribute('viewBox', '0 0 24 24')
    $icon.innerHTML = Svgs.MUTE
  }
  $item.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    document.body.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}))
    navigate('/settings/add_muted_keyword')
  })
  $settings.before($item)
}

/** @param {HTMLElement} $reportList */
function addListRetweetsMenuItem($reportList) {
  let showing = config.listRetweets == 'ignore'
  let $item = /** @type {HTMLElement} */ ($reportList.cloneNode(true))
  $item.classList.add('cpft_menu_item', 'cpft_list_retweets_item')
  $item.removeAttribute('id')
  let $label = [...$item.querySelectorAll('div, span')].reverse().find($el => $el.children.length == 0 && $el.textContent.trim())
  if ($label) $label.textContent = getString(showing ? 'TURN_OFF_RETWEETS' : 'TURN_ON_RETWEETS')
  let $icon = $item.querySelector('svg')
  if ($icon) {
    $icon.removeAttribute('data-icon')
    $icon.setAttribute('viewBox', '0 0 24 24')
    $icon.innerHTML = showing ? Svgs.RETWEETS_OFF : Svgs.RETWEET
  }
  $item.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    config.listRetweets = showing ? 'hide' : 'ignore'
    storeConfigChanges({listRetweets: config.listRetweets})
    document.body.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}))
    if (showing) {
      processAllRows()
    } else {
      // Retweets were dropped from the data X loaded, so it has to load again
      location.reload()
    }
  })
  $reportList.before($item)
}

/**
 * Quote posts get "Mute this conversation" (hide every quote of the quoted
 * post) and "Turn off Quote Tweets" (hide quotes by this account).
 * @param {HTMLElement} $menu
 * @param {HTMLElement} $blockItem
 */
function addMuteQuotesMenuItems($menu, $blockItem) {
  let tweetId = getTweetIdFromRow($lastMenuArticle.closest('li') ?? $lastMenuArticle)
  let info = tweetId ? tweets.get(tweetId) : null
  if (info?.retweetedId) info = tweets.get(info.retweetedId) ?? info
  if (!info?.quotedId) return

  let quotedBy = info.screenName
  /** @type {import("./types").QuotedTweet & {id: string}} */
  let quotedTweet = {
    id: info.quotedId,
    quotedBy,
    user: info.quotedScreenName,
    time: info.quotedCreatedAt ? new Date(info.quotedCreatedAt).toISOString() : '',
  }

  let close = () => {
    $menu.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}))
    document.body.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}))
  }

  let makeItem = (text, iconHtml, onSelect) => {
    let $item = /** @type {HTMLElement} */ ($blockItem.cloneNode(true))
    $item.classList.add('cpft_menu_item', 'cpft_quote_item')
    $item.removeAttribute('id')
    let $label = [...$item.querySelectorAll('div, span')].reverse().find($el => $el.children.length == 0 && $el.textContent.trim())
    if ($label) $label.textContent = text
    let $icon = $item.querySelector('svg')
    if ($icon) {
      $icon.removeAttribute('data-icon')
      $icon.setAttribute('viewBox', '0 0 24 24')
      $icon.innerHTML = iconHtml
    }
    $item.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      onSelect()
      close()
      processAllRows()
    }, true)
    return $item
  }

  let $muteQuotes = makeItem(getString('MUTE_THIS_CONVERSATION'), Svgs.MUTE, () => {
    log('mutableQuoteTweets: muting quotes of', quotedTweet)
    config.mutedQuotes = config.mutedQuotes.concat(quotedTweet)
    storeConfigChanges({mutedQuotes: config.mutedQuotes})
  })
  let hidingQuotesFrom = config.hideQuotesFrom.includes(quotedBy)
  let $toggleQuotes = makeItem(getString('TURN_OFF_QUOTE_TWEETS'), Svgs.RETWEETS_OFF, () => {
    log('mutableQuoteTweets: toggling quotes from', quotedBy)
    config.hideQuotesFrom = hidingQuotesFrom
      ? config.hideQuotesFrom.filter(user => user != quotedBy)
      : config.hideQuotesFrom.concat(quotedBy)
    storeConfigChanges({hideQuotesFrom: config.hideQuotesFrom})
  })
  $blockItem.before($toggleQuotes, $muteQuotes)
}

/** @param {HTMLElement} $card */
function processHoverCard($card) {
  let screenName = $card.querySelector('a[href$="/following"]')?.getAttribute('href')?.split('/')[1]
  if (!screenName) return

  if (config.hideGrokNav) {
    let summaryText = getString('PROFILE_SUMMARY')
    for (let $button of $card.querySelectorAll('[data-slot="xds-button"]')) {
      if ($button.textContent.trim() == summaryText) $button.classList.add('cpft_profile_summary')
    }
  }

  if (config.addUserHoverCardAccountLocation && !$card.querySelector('.cpft_account_location')) {
    let $followers = $card.querySelector('a:is([href$="/verified_followers"], [href$="/followers"])')
    if ($followers) void insertAccountLocation($followers, screenName, ' · ')
  }
}
//#endregion

//#region Sidebar
function processSidebar() {
  if (!config.hideLiveBroadcasts) return
  let liveOnX = getString('LIVE_ON_X')
  for (let $h2 of document.querySelectorAll('aside section:not(.cpft_live_broadcasts) h2')) {
    if ($h2.textContent.trim() == liveOnX) $h2.closest('section').classList.add('cpft_live_broadcasts')
  }
}
//#endregion

//#region Explore
let exploreSearchFocused = false
// With nothing else on the page, the search box is what Explore is for
function processExplorePage() {
  if (currentPage != 'Explore' || !config.hideExplorePageContents || exploreSearchFocused) return
  let $input = /** @type {HTMLInputElement} */ (document.querySelector('main input[data-testid="SearchBox_Search_Input"]'))
  if (!$input) return
  exploreSearchFocused = true
  $input.focus()
}
//#endregion

//#region Home timeline
let homeTabSwitched = false
let homeTabSwitchUntil = 0
let lastHomeTabClick = 0
/** Picking For you yourself is respected until the page is reloaded */
let userChoseForYou = false
let followingSortMenuOpened = false
function processHomeTabs() {
  if (currentPage != 'HomeTimeline' || homeTabSwitched) return
  if (!config.alwaysUseLatestTweets) return
  if (userChoseForYou && !config.hideForYouTimeline) return
  let $following = /** @type {HTMLElement} */ (document.querySelector('[role="tablist"] > [data-pinned-timeline="following"]'))
  if (!$following) return
  if (homeTabSwitchUntil == 0) homeTabSwitchUntil = Date.now() + 5000
  // Clicking the selected Following tab opens its sort menu instead
  if ($following.getAttribute('aria-selected') == 'true') {
    homeTabSwitched = true
    return
  }
  // The app restores the last-used tab while it starts up, which can undo a
  // click made too early - keep trying for a few seconds
  if (Date.now() > homeTabSwitchUntil) {
    homeTabSwitched = true
    return
  }
  if (Date.now() - lastHomeTabClick > 500) {
    log('switching to the Following timeline')
    lastHomeTabClick = Date.now()
    $following.click()
  }
  setTimeout(scheduleProcessing, 600)
}
//#endregion

//#region Video
function processVideos() {
  // Looping is how the next video is kept from autoplaying, so only force it
  // on, and leave X's own looping GIFs alone when the setting is off
  if (!mobile || !config.preventNextVideoAutoplay || !URL_MEDIA_VIEWER_RE.test(currentPath)) return
  for (let $video of document.querySelectorAll('video')) {
    if (!$video.loop) $video.loop = true
  }
}
//#endregion

//#region Page observer
// One observer for the whole page: the new client re-renders freely and has
// no stable containers to scope observers to, and the work per batch is cheap
// because processed elements are marked.
let processScheduled = false
/** @type {Set<HTMLElement>} */
let pendingRows = new Set()

function scheduleProcessing() {
  if (processScheduled) return
  processScheduled = true
  requestAnimationFrame(() => {
    processScheduled = false
    processPage()
  })
}

function processPage() {
  if (!config.enabled) return
  for (let $li of pendingRows) {
    if ($li.isConnected) processRow($li)
  }
  pendingRows.clear()

  for (let $article of /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('article:not([data-cpft])'))) {
    $article.dataset.cpft = 'true'
    processArticle($article)
  }

  if (config.oneClickMuteButton || config.oneClickBlockButton) {
    for (let $cell of /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('main [role="link"][data-href]:not([data-cpft]):has(> * button[data-slot="xds-button"])'))) {
      $cell.dataset.cpft = 'true'
      if (!$cell.querySelector('article')) addOneClickUserButtons($cell)
    }
  }

  for (let $portal of /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('body > [data-base-ui-portal]'))) {
    processPortal($portal)
  }

  if (currentPage == 'Tweet') processFocusedTweet()
  processExplorePage()
  processHomeTabs()
  processSidebar()
  processVideos()
}

function observePage() {
  if (observingPage) return
  observingPage = true
  new MutationObserver((mutations) => {
    if (!config.enabled) return
    for (let mutation of mutations) {
      for (let node of mutation.addedNodes) {
        if (node.nodeType != Node.ELEMENT_NODE) continue
        let $el = /** @type {HTMLElement} */ (node)
        if ($el.matches(TIMELINE_ROW)) pendingRows.add($el)
        else $el.querySelectorAll(TIMELINE_ROW).forEach($li => pendingRows.add(/** @type {HTMLElement} */ ($li)))
      }
    }
    scheduleProcessing()
  }).observe($body, {childList: true, subtree: true})
  processAllRows()
  scheduleProcessing()
}

let observingClicks = false
function observeClicks() {
  if (observingClicks) return
  observingClicks = true
  document.addEventListener('click', (e) => {
    if (!config.enabled) return
    let $target = /** @type {HTMLElement} */ (e.target)
    if (!($target instanceof Element)) return

    // Remember which post a menu belongs to, for quote menu items
    let $trigger = $target.closest('button[data-slot="xds-menu-trigger"]')
    if ($trigger) {
      $lastMenuTrigger = /** @type {HTMLElement} */ ($trigger)
      $lastMenuArticle = /** @type {HTMLElement} */ ($trigger.closest('article:not([data-slot="embedded-tweet-frame"] article)'))
    }

    if ($target.closest('[role="tablist"] > [data-pinned-timeline="for-you"]') && e.isTrusted) {
      userChoseForYou = true
    }

    // The selected Following tab opens its sort menu; other Home menus
    // (pinned Lists and Communities) have sort menus too
    if ($target.closest('button[aria-haspopup="menu"]')) {
      followingSortMenuOpened = Boolean($target.closest('[role="tablist"] > [data-pinned-timeline="following"]'))
    }

    // Choosing a sort in X's own menus means the user wants that one
    let $radio = $target.closest('[role="menuitemradio"]')
    if ($radio && !drivingSortMenu) {
      if (currentPage == 'Tweet') userSortedReplies = true
      if (currentPage == 'HomeTimeline' && followingSortMenuOpened) {
        // Recent, then Popular
        let index = [...$radio.parentElement.querySelectorAll(':scope > [role="menuitemradio"]')].indexOf($radio)
        if (index != -1) {
          let sortFollowing = /** @type {'popular' | 'mostRecent'} */ (index == 1 ? 'popular' : 'mostRecent')
          config.sortFollowing = sortFollowing
          storeConfigChanges({sortFollowing})
          userSortedFollowing = true
        }
      }
    }

    if (config.fastBlock && !oneClickActionInProgress &&
        $target.closest('[role="menuitem"]:has(svg[data-icon="icon-block"])')) {
      blockMenuItemClicked = true
      void confirmBlockDialog().finally(() => blockMenuItemClicked = false)
    }

    // Followers links default to Verified Followers now
    let $link = /** @type {HTMLAnchorElement} */ ($target.closest('a[href$="/verified_followers"]'))
    if ($link && config.hideVerifiedNotificationsTab && !$link.closest('[role="tablist"]')) {
      e.preventDefault()
      e.stopPropagation()
      navigate($link.getAttribute('href').replace(/\/verified_followers$/, '/followers'))
    }
  }, true)
}
//#endregion

//#region Main
function main() {
  log('config', config)
  configureCss()
  configureDynamicCss()
  configureCustomCss()
  // content.js swapped the logo early; configureCss() owns it from here on
  document.querySelector('style#cpftLoading')?.remove()

  let start = () => {
    $body = document.body
    lang = $html.lang || lang
    dir = $html.dir || dir
    ltr = dir == 'ltr'
    onLocationChange()
    updateVersion()
    if (!config.enabled) return
    observeHead()
    observePage()
    observeClicks()
  }
  if (document.body) start()
  else document.addEventListener('DOMContentLoaded', start, {once: true})
}

/**
 * @param {Partial<import("./types").Config>} changes
 */
function configChanged(changes) {
  log('config changed', changes)
  configureCss()
  configureDynamicCss()
  configureCustomCss()
  updateBodyClasses()

  if ('enabled' in changes) {
    if (config.enabled) {
      currentPath = ''
      onLocationChange()
      observeHead()
      observePage()
      observeClicks()
      updateTitle()
      updateFavicon()
    } else {
      document.querySelectorAll('.cpft_menu_item, .cpft_one_click, .cpft_account_location, .cpft_interaction_links').forEach($el => $el.remove())
      document.querySelectorAll('.cpft_collapsed').forEach($el => $el.classList.remove('cpft_collapsed'))
      // So they're processed again if re-enabled
      document.querySelectorAll('[data-cpft]').forEach($el => delete /** @type {HTMLElement} */ ($el).dataset.cpft)
      updateTitle()
      updateFavicon()
    }
    return
  }

  if ('replaceLogo' in changes || 'hideNotifications' in changes) {
    updateTitle()
    updateFavicon()
  }
  if ('oneClickMuteButton' in changes || 'oneClickBlockButton' in changes) {
    document.querySelectorAll('.cpft_one_click').forEach($el => $el.remove())
    document.querySelectorAll('[data-cpft]').forEach($el => delete /** @type {HTMLElement} */ ($el).dataset.cpft)
  }
  if ('disableHomeTimeline' in changes || 'defaultToLatestSearch' in changes) {
    currentPath = ''
    onLocationChange()
  }
  processAllRows()
  scheduleProcessing()
}

// Initial config and config changes are injected into a <script> element
let $settings = /** @type {HTMLScriptElement} */ (document.querySelector('script#cpftSettings'))
if ($settings) {
  try {
    Object.assign(config, JSON.parse($settings.innerText))
  } catch (e) {
    error('error parsing initial settings', e)
  }

  new MutationObserver(() => {
    /** @type {Partial<import("./types").Config>} */
    let configChanges
    try {
      configChanges = JSON.parse($settings.innerText)
    } catch (e) {
      error('error parsing incoming settings change', e)
      return
    }
    if ('debug' in configChanges) debug = configChanges.debug
    Object.assign(config, configChanges)
    configChanged(configChanges)
  }).observe($settings, {childList: true})
}

debug = config.debug

main()
//#endregion

}()
