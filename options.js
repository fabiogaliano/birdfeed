document.title = chrome.i18n.getMessage(`extensionName`)

for (let optionValue of [
  '1000',
  '10000',
  '100000',
  '1000000',
]) {
  for (let $option of document.querySelectorAll(`option[value="${optionValue}"]`)) {
    $option.textContent = formatFollowerCount(Number(optionValue))
  }
}

for (let optionValue of [
  'badges',
  'comfortable',
  'compact',
  'default',
  'dim',
  'hide',
  'ignore',
  'lightsOut',
  'liked',
  'mostRecent',
  'popular',
  'recent',
  'relevant',
  'separate',
]) {
  let label = chrome.i18n.getMessage(`option_${optionValue}`)
  for (let $option of document.querySelectorAll(`option[value="${optionValue}"]`)) {
    $option.textContent = label
  }
}

for (let translationId of [
  'addAddMutedWordMenuItemLabel_desktop',
  'addAddMutedWordMenuItemLabel_mobile',
  'addUserHoverCardAccountLocationLabel',
  'addFocusedTweetAccountLocationLabel',
  'alwaysUseLatestTweetsLabel',
  'bypassAgeVerificationLabel',
  'customCssLabel',
  'darkModeThemeLabel',
  'debugInfo',
  'debugLabel',
  'debugLogTimelineStatsLabel',
  'debugOptionsLabel',
  'defaultToLatestSearchLabel',
  'disableHomeTimelineInfo',
  'disableHomeTimelineLabel',
  'disableTweetTextFormattingLabel',
  'disabledHomeTimelineRedirectLabel',
  'disabledHomeTimelineRedirectOption_messages',
  'disabledHomeTimelineRedirectOption_bookmarks',
  'dontUseChirpFontLabel',
  'dropdownMenuFontWeightLabel',
  'enabled',
  'experimentsOptionsLabel',
  'exportConfigLabel',
  'exportConfigInfo',
  'importConfigLabel',
  'importConfigInfo',
  'backupOptionsLabel',
  'fastBlockLabel',
  'followButtonStyleLabel',
  'followButtonStyleOption_monochrome',
  'followButtonStyleOption_themed',
  'fullWidthContentInfo',
  'fullWidthContentLabel',
  'fullWidthMediaLabel',
  'hideAccountSwitcherLabel',
  'hideAdsNavLabel',
  'hideAllMetricsLabel',
  'hideBookmarkButtonLabel',
  'hideBookmarkMetricsLabel',
  'hideChatNavLabel',
  'hideComposeTweetLabel',
  'hideDiscoverSuggestionsLabel',
  'hideEditImageLabel',
  'hideExploreNavLabel',
  'hideExploreNavWithSidebarLabel',
  'hideExplorePageContentsLabel',
  'hideFollowingMetricsLabel',
  'hideForYouTimelineLabel',
  'hideGrokLabel',
  'hideGrokTweetsLabel',
  'hideInlinePrompts',
  'hideJobsLabel',
  'hideLikeMetricsLabel',
  'hideLiveBroadcastBarLabel',
  'hideLiveBroadcastsLabel',
  'hideMessagesBottomNavItemLabel',
  'hideMessagesDrawerLabel',
  'hideMetricsLabel',
  'hideMoreSlideOutMenuItemsOptionsLabel_desktop',
  'hideMoreSlideOutMenuItemsOptionsLabel_mobile',
  'hideNotificationLikesLabel',
  'hideNotificationRetweetsLabel',
  'hideProfileHeaderMetricsLabel',
  'hideProfileRetweetsLabel',
  'hideQuoteTweetMetricsLabel',
  'hideReplyMetricsLabel',
  'hideRetweetMetricsLabel',
  'hideSeeNewTweetsLabel',
  'hideShareTweetButtonLabel',
  'hideSidebarContentLabel',
  'hideSpacesNavLabel',
  'hideSubscriptionsLabel',
  'hideSuggestedContentSearchLabel',
  'hideSuggestedFollowsLabel',
  'hideTimelineTweetBoxLabel',
  'hideTodaysNewsLabel',
  'hideTwitterBlueRepliesLabel',
  'hideTwitterBlueUpsellsLabel',
  'hideUnavailableQuoteTweetsLabel',
  'hideUnusedUiItemsOptionsLabel',
  'hideVerifiedNotificationsTabLabel',
  'hideViewActivityLinksLabel',
  'hideViewsLabel',
  'hideWhatsHappeningLabel',
  'hideWhoToFollowEtcLabel',
  'homeTimelineOptionsLabel',
  'listRetweetsLabel',
  'mutableQuoteTweetsLabel',
  'navBaseFontSizeLabel',
  'navDensityLabel',
  'preventNextVideoAutoplayInfo',
  'preventNextVideoAutoplayLabel',
  'quoteTweetsLabel',
  'reduceAlgorithmicContentOptionsLabel',
  'reduceEngagementOptionsLabel',
  'reducedInteractionModeInfo',
  'reducedInteractionModeLabel',
  'replaceLogoLabel',
  'restoreLinkHeadlinesLabel',
  'restoreOtherInteractionLinksLabel',
  'restoreQuoteTweetsLinkLabel',
  'restorePhotoGridLabel',
  'restoreTweetSourceLabel',
  'retweetsLabel',
  'showBlueReplyFollowersCountAmountLabel',
  'showBookmarkButtonUnderFocusedTweetsLabel',
  'showPremiumReplyBusinessLabel',
  'showPremiumReplyFollowedByLabel',
  'showPremiumReplyFollowingLabel',
  'showPremiumReplyGovernmentLabel',
  'showRelevantPeopleLabel',
  'sidebarLabel',
  'sortFollowingLabel',
  'sortRepliesLabel',
  'tweakQuoteTweetsPageLabel',
  'twitterBlueChecksLabel',
  'twitterBlueChecksOption_replace',
  'uiImprovementsOptionsLabel',
  'uiTweaksOptionsLabel',
  'unblurSensitiveContentLabel',
  'uninvertFollowButtonsLabel',
  'unwrapTcoLinksLabel',
  'unwrapTcoLinksInfo',
  'twitterBrandingOptionsLabel',
  'postsAndLinksOptionsLabel',
  'repliesOptionsLabel',
  'premiumOptionsLabel',
  'xAdditionsOptionsLabel',
]) {
  let $el = document.getElementById(translationId)
  if ($el) {
    $el.textContent = chrome.i18n.getMessage(translationId)
  } else {
    console.warn('could not find element for translationId', translationId)
  }
}

for (let translationClass of [
  'hideBookmarksNavLabel',
  'hideBusinessNavLabel',
  'hideCommunitiesNavLabel',
  'hideConnectNavLabel',
  'hideCreatorStudioNavLabel',
  'hideListsNavLabel',
  'notificationsLabel',
  'saveAndApplyButton',
]) {
  let translation = chrome.i18n.getMessage(translationClass)
  for (let $el of document.querySelectorAll(`.${translationClass}`)) {
    $el.textContent = translation
  }
}

// Per-setting descriptions, following the same `<name>Info` convention as the
// hand-written ones already in options.html. Injected rather than written into
// the markup because they attach by control name: adding a description is then
// one messages.json entry instead of an edit in three files, and a setting with
// no description simply gets none.
//
// Controls that appear twice (the .desktop/.mobile pairs sharing a name) are
// handled per label rather than by id - duplicate ids would be invalid, so the
// injected paragraphs carry a class instead.
for (let $control of document.querySelectorAll('input[name], select[name]')) {
  let $label = $control.closest('label')
  if (!$label) continue

  // The eight hand-written ones predate this and carry no class. Tag them so
  // the descriptions toggle hides every description, not just the injected ones.
  let $existing = $label.nextElementSibling
  if ($existing?.tagName == 'P') {
    $existing.classList.add('option-info')
    continue
  }

  let description = chrome.i18n.getMessage(`${$control.getAttribute('name')}Info`)
  if (!description) continue

  let $description = document.createElement('p')
  $description.className = 'option-info'
  $description.textContent = description
  $label.after($description)
}

// Descriptions on/off. Kept in localStorage rather than the extension config:
// this is a preference about the options page itself, and anything in the
// config is written into the page's settings channel, where a multi-key write
// has its own failure modes.
{
  let $toggle = document.getElementById('descriptionsToggle')
  let show = localStorage.getItem('cpftDescriptions') != 'off'

  let apply = () => {
    // document.body rather than $body: that const is declared further down and
    // would still be in its temporal dead zone here.
    document.body.classList.toggle('no-descriptions', !show)
    $toggle?.setAttribute('aria-pressed', String(show))
  }
  apply()

  $toggle?.addEventListener('click', () => {
    show = !show
    localStorage.setItem('cpftDescriptions', show ? 'on' : 'off')
    apply()
  })
}

// Before/after examples, for the settings the audit managed to photograph.
//
// The images are built from audit runs by scripts/build-examples.js; a setting
// only gets a marker if a pair exists for it, so coverage can grow without any
// change here. Loaded rather than bundled into the page because index.json is
// regenerated whenever the audit is re-run.
//
// Off because examples/ is not packaged yet: the audit crops to the densest
// cluster of changed elements, which inverts for page-wide settings - when
// everything changes, the densest cluster is the whole viewport - so most pairs
// do not show the change they illustrate. Turn back on with the rebuilt images;
// a fetch for a missing index.json logs a console error on every page load,
// which is why this is a flag rather than a silent failure.
const EXAMPLES_ENABLED = false

if (EXAMPLES_ENABLED) fetch(chrome.runtime.getURL('examples/index.json'))
  .then(response => response.ok ? response.json() : {})
  .catch(() => ({}))
  .then(examples => {
    for (let $control of document.querySelectorAll('input[name], select[name]')) {
      let name = $control.getAttribute('name')
      if (!examples[name]) continue

      let $label = $control.closest('label')
      let $text = $label?.querySelector('span:not(.toggle)')
      if (!$text || $text.querySelector('.option-example')) continue

      let $marker = document.createElement('span')
      $marker.className = 'option-example'
      $marker.tabIndex = 0
      $marker.setAttribute('role', 'img')
      $marker.setAttribute('aria-label', chrome.i18n.getMessage('exampleAriaLabel') || 'Show example')
      $marker.textContent = 'i'

      // Built on first reveal: eagerly creating ~50 of these would decode every
      // screenshot at load for panels that are mostly never opened.
      let build = () => {
        if ($marker.querySelector('.option-example-panel')) return
        let $panel = document.createElement('span')
        $panel.className = 'option-example-panel'
        for (let [state, suffix] of [['OFF', 'before'], ['ON', 'after']]) {
          let $side = document.createElement('span')
          $side.className = 'option-example-side'
          let $caption = document.createElement('span')
          $caption.textContent = state
          let $img = document.createElement('img')
          $img.loading = 'lazy'
          $img.alt = `${name} ${state}`
          $img.src = chrome.runtime.getURL(`examples/${name}.${suffix}.jpg`)
          $side.append($caption, $img)
          $panel.append($side)
        }
        $marker.append($panel)
      }
      $marker.addEventListener('pointerenter', build)
      $marker.addEventListener('focus', build)
      // The marker lives inside the <label>, so without this a click on it -
      // or on the panel it opens - toggles the very setting being explained.
      $marker.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        build()
      })

      $text.append(' ', $marker)
    }
  })

for (let amount of [1_000, 10_000, 100_000, 1_000_000]) {
  document.querySelector(`option[value="${amount}"]`).textContent = formatFollowerCount(amount)
}

/** @type {boolean} */
let desktop
/** @type {boolean} */
let mobile

const $body = document.body

if (navigator.userAgent.includes('Safari/') && !/Chrom(e|ium)\//.test(navigator.userAgent)) {
  $body.classList.add('safari', /iP(ad|hone)/.test(navigator.userAgent) ? 'iOS' : 'macOS')
} else {
  $body.classList.toggle('edge', navigator.userAgent.includes('Edg/'))
}

//#region Default config
/** @type {import("./types").Config} */
const defaultConfig = {
  enabled: true,
  debug: false,
  debugLogTimelineStats: false,
  // Default based on the platform if the main script hasn't run on Twitter yet
  version: /(Android|iP(ad|hone))/.test(navigator.userAgent) ? 'mobile' : 'desktop',
  // Shared
  addAddMutedWordMenuItem: true,
  addFocusedTweetAccountLocation: false,
  alwaysUseLatestTweets: true,
  bypassAgeVerification: true,
  darkModeTheme: 'lightsOut',
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
  hideChatNav: false,
  hideCommunitiesNav: false,
  hideComposeTweet: false,
  hideConnectNav: true,
  hideCreatorStudioNav: true,
  hideEditImage: true,
  hideExplorePageContents: true,
  hideFollowingMetrics: true,
  hideForYouTimeline: true,
  hideGrokNav: true,
  hideGrokTweets: false,
  hideInlinePrompts: true,
  hideJobsNav: true,
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
  quoteTweets: 'ignore',
  reducedInteractionMode: false,
  unwrapTcoLinks: false,
  replaceLogo: true,
  restoreLinkHeadlines: true,
  restoreOtherInteractionLinks: true,
  restoreQuoteTweetsLink: true,
  restorePhotoGrid: true,
  restoreTweetSource: true,
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
  uninvertFollowButtons: true,
  unblurSensitiveContent: false,
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

//#region Config & variables
/**
 * Complete configuration for the options page.
 * @type {import("./types").Config}
 */
let optionsConfig

/**
 * Checkbox group configuration for the version being used (mobile or desktop).
 * @type {Map<string, string[]>}
 */
let checkboxGroups

// Page elements
let $experiments = /** @type {HTMLDetailsElement} */ (document.querySelector('details#experiments'))
let $exportConfig = document.querySelector('#export-config')
let $importConfig = document.querySelector('#import-config')
let $importFile = /** @type {HTMLInputElement|null} */ (document.querySelector('#import-file'))
let $form = document.querySelector('form')
let $hideQuotesFrom =  /** @type {HTMLDivElement} */ (document.querySelector('#hideQuotesFrom'))
let $hideQuotesFromDetails = /** @type {HTMLDetailsElement} */ (document.querySelector('details#hideQuotesFromDetails'))
let $hideQuotesFromLabel = /** @type {HTMLElement} */ (document.querySelector('#hideQuotesFromLabel'))
let $mutedQuotes =  /** @type {HTMLDivElement} */ (document.querySelector('#mutedQuotes'))
let $mutedQuotesDetails =  /** @type {HTMLDetailsElement} */ (document.querySelector('details#mutedQuotesDetails'))
let $mutedQuotesLabel = /** @type {HTMLElement} */ (document.querySelector('#mutedQuotesLabel'))
let $saveCustomCssButton = document.querySelector('button#saveCustomCss')
let $showBlueReplyFollowersCountLabel = /** @type {HTMLElement} */ (document.querySelector('#showBlueReplyFollowersCountLabel'))
//#endregion

//#region Utility functions
function exportConfig() {
  let $a = document.createElement('a')
  $a.download = `birdfeed-v4.23.2.config.json`
  $a.href = URL.createObjectURL(new Blob([
    JSON.stringify(optionsConfig, null, 2)
  ], {type: 'application/json'}))
  $a.click()
  URL.revokeObjectURL($a.href)
}

// Import validates against the form itself rather than a hand-kept schema: the
// controls already encode which keys exist and what each one accepts, so a
// select can only receive one of its own options and a checkbox only a boolean.
// A file from an older or newer version therefore imports what still applies
// instead of failing whole, and cannot write a value the UI could not produce.
//
// Keys with no control (customCss, the quote lists) are checked by shape.
// Present in an export but not settings, so they are passed over silently
// rather than counted as unrecognised - otherwise importing your own export
// reports a skipped entry and reads like something went wrong.
//   version  file metadata
//   debug    a diagnostic toggle; importing someone else's would fill the console
const IMPORT_METADATA = new Set(['version', 'debug'])

const IMPORT_SHAPES = {
  customCss: (v) => typeof v == 'string',
  mutedQuotes: (v) => Array.isArray(v),
  hideQuotesFrom: (v) => Array.isArray(v),
}

/**
 * @param {Record<string, any>} incoming
 * @returns {{changes: Record<string, any>, applied: string[], unchanged: string[], skipped: string[]}}
 */
function validateImport(incoming) {
  let changes = {}
  let applied = []
  let unchanged = []
  let skipped = []

  for (let [key, value] of Object.entries(incoming)) {
    if (IMPORT_METADATA.has(key)) continue

    let ok = false
    let $control = $form.elements[key]

    // The six .desktop/.mobile nav pairs share one name, so elements[name]
    // hands back a RadioNodeList rather than a control. They stay in sync, so
    // either one describes the value - but without this every one of them
    // failed the instanceof checks and was silently dropped from every import.
    if (typeof RadioNodeList != 'undefined' && $control instanceof RadioNodeList) {
      $control = $control[0]
    }

    if (IMPORT_SHAPES[key]) {
      ok = IMPORT_SHAPES[key](value)
    } else if (!$control) {
      ok = false
    } else if ($control instanceof HTMLSelectElement) {
      ok = [...$control.options].some(o => o.value == value)
    } else if ($control instanceof HTMLInputElement && $control.type == 'checkbox') {
      ok = typeof value == 'boolean'
    } else if ($control instanceof HTMLInputElement && $control.type == 'number') {
      ok = typeof value == 'number' && Number.isFinite(value)
    } else if ($control instanceof HTMLInputElement) {
      ok = typeof value == 'string'
    }

    if (!ok) {
      skipped.push(key)
      continue
    }
    // Only genuine differences are written, so an import is the same kind of
    // storage write as flipping a toggle by hand.
    if (JSON.stringify(optionsConfig[key]) != JSON.stringify(value)) {
      changes[key] = value
      applied.push(key)
    } else {
      unchanged.push(key)
    }
  }

  return {changes, applied, unchanged, skipped}
}

/** @param {File} file */
function importConfig(file) {
  let $status = document.getElementById('importStatus')
  let show = (text, ok) => {
    if (!$status) return
    $status.textContent = text
    $status.classList.toggle('is-error', !ok)
    $status.hidden = false
  }

  file.text().then(text => {
    let incoming
    try {
      incoming = JSON.parse(text)
    } catch {
      show(`That file isn't valid JSON.`, false)
      return
    }
    if (!incoming || typeof incoming != 'object' || Array.isArray(incoming)) {
      show(`That file doesn't look like an exported settings file.`, false)
      return
    }

    let {changes, applied, unchanged, skipped} = validateImport(incoming)
    if (!applied.length) {
      // "Nothing applied" and "nothing recognised" are different outcomes: a
      // file that matches your settings exactly is a success, not a failure.
      show(unchanged.length
        ? `Nothing to change - those ${unchanged.length} settings already match yours.`
        : `Nothing imported - none of the ${skipped.length} entries were recognised.`,
        unchanged.length > 0)
      return
    }

    Object.assign(optionsConfig, changes)
    storeConfigChanges(changes)
    updateFormControls()
    updateCheckboxGroups()
    updateDisplay()
    show(
      `Imported ${applied.length} setting${applied.length == 1 ? '' : 's'}` +
      (skipped.length ? `, skipped ${skipped.length} unrecognised.` : '.'),
      true
    )
  }, () => show(`Could not read that file.`, false))
}

function formatFollowerCount(num) {
  let numFormat = Intl.NumberFormat(undefined, {notation: 'compact', compactDisplay: num < 1_000_000 ? 'short' : 'long'})
  return numFormat.format(num)
}

/**
 * @param {keyof HTMLElementTagNameMap} tagName
 * @param {({[key: string]: any} | null)?} attributes
 * @param {...any} children
 * @returns {HTMLElement}
 */
 function h(tagName, attributes, ...children) {
  let $el = document.createElement(tagName)

  if (attributes) {
    for (let [prop, value] of Object.entries(attributes)) {
      if (prop.startsWith('on') && typeof value == 'function') {
        $el.addEventListener(prop.slice(2).toLowerCase(), value)
      } else {
        $el[prop] = value
      }
    }
  }

  for (let child of children) {
    if (child == null || child === false) continue
    if (child instanceof Node) {
      $el.appendChild(child)
    } else {
      $el.insertAdjacentText('beforeend', String(child))
    }
  }

  return $el
}
//#endregion

//#region Options page functions
/**
 * Update the options page to match the current config.
 */
function applyConfig() {
  mobile = optionsConfig.version == 'mobile'
  desktop = !mobile
  $body.classList.toggle('mobile', mobile)
  $body.classList.toggle('desktop', desktop)
  checkboxGroups = new Map(Object.entries({
    hideAllMetrics: [
      'hideBookmarkMetrics',
      'hideFollowingMetrics',
      'hideLikeMetrics',
      'hideReplyMetrics',
      'hideRetweetMetrics',
      'hideQuoteTweetMetrics',
      'hideTotalTweetsMetrics',
    ]
  }))
  updateFormControls()
  updateCheckboxGroups()
  updateDisplay()
}

/**
 * @param {Event} e
 */
function onFormChanged(e) {
  if (e.target instanceof HTMLTextAreaElement) return

  /** @type {Partial<import("./types").Config>} */
  let changedConfig = {}

  let $el = /** @type {HTMLInputElement} */ (e.target)
  if ($el.type == 'checkbox') {
    if (checkboxGroups.has($el.name)) {
      checkboxGroups.get($el.name).forEach(checkboxName => {
        optionsConfig[checkboxName] = changedConfig[checkboxName] = $el.checked
        updateFormControl($form.elements[checkboxName], $el.checked)
      })
      $el.indeterminate = false
    } else {
      optionsConfig[$el.name] = changedConfig[$el.name] = $el.checked
      // Don't try to redirect the Home timeline to Notifications if both are disabled
      if ($el.name == 'hideNotifications' &&
          $el.checked &&
          optionsConfig.disabledHomeTimelineRedirect == 'notifications') {
        $form.elements['disabledHomeTimelineRedirect'].value = 'messages'
        optionsConfig.disabledHomeTimelineRedirect = 'messages'
        changedConfig.disabledHomeTimelineRedirect = 'messages'
      }
      updateCheckboxGroups()
    }
  } else {
    optionsConfig[$el.name] = changedConfig[$el.name] = $el.value
  }

  updateDisplay()

  storeConfigChanges(changedConfig)
}

/**
 * @param {{[key: string]: chrome.storage.StorageChange}} changes
 */
function onStorageChanged(changes) {
  let configChanges = Object.fromEntries(
    Object.entries(changes).map(([key, {newValue}]) => [key, newValue])
  )
  Object.assign(optionsConfig, configChanges)
  applyConfig()
}

function saveCustomCss() {
  if (optionsConfig.customCss == $form.elements['customCss'].value) return

  /** @type {Partial<import("./types").Config>} */
  let changedConfig = {}
  optionsConfig['customCss'] = changedConfig['customCss'] = $form.elements['customCss'].value
  storeConfigChanges(changedConfig)
}

function shouldDisplayHideQuotesFrom() {
  return optionsConfig.mutableQuoteTweets && optionsConfig.hideQuotesFrom.length > 0
}

function shouldDisplayMutedQuotes() {
  return optionsConfig.mutableQuoteTweets && optionsConfig.mutedQuotes.length > 0
}

/**
 * @param {Partial<import("./types").Config>} changes
 */
function storeConfigChanges(changes) {
  chrome.storage.onChanged.removeListener(onStorageChanged)
  chrome.storage.local.set(changes, () => {
    chrome.storage.onChanged.addListener(onStorageChanged)
  })
}

function updateCheckboxGroups() {
  for (let [group, checkboxNames] of checkboxGroups.entries()) {
    let checkedCount = checkboxNames.filter(name => optionsConfig[name]).length
    $form.elements[group].checked = checkedCount == checkboxNames.length
    $form.elements[group].indeterminate = checkedCount > 0 && checkedCount < checkboxNames.length;
  }
}

function updateDisplay() {
  $body.classList.toggle('debugging', optionsConfig.debug)
  $body.classList.toggle('chronological', optionsConfig.alwaysUseLatestTweets)
  $body.classList.toggle('disabled', !optionsConfig.enabled)
  $body.classList.toggle('disabledHomeTimeline', optionsConfig.disableHomeTimeline)
  $body.classList.toggle('fullWidthContent', optionsConfig.fullWidthContent)
  $body.classList.toggle('hidingBookmarkButton', optionsConfig.hideBookmarkButton)
  $body.classList.toggle('hidingExploreNav', optionsConfig.hideExploreNav)
  $body.classList.toggle('hidingMetrics', optionsConfig.hideMetrics)
  $body.classList.toggle('hidingNotifications', optionsConfig.hideNotifications == 'hide')
  $body.classList.toggle('hidingQuotesFrom', shouldDisplayHideQuotesFrom())
  $body.classList.toggle('hidingSuggestedFollows', optionsConfig.hideSidebarContent || optionsConfig.hideSuggestedFollows)
  $body.classList.toggle('hidingTwitterBlueReplies', optionsConfig.hideTwitterBlueReplies)
  $body.classList.toggle('mutingQuotes', shouldDisplayMutedQuotes())
  $body.classList.toggle('showingBlueReplyFollowersCount', optionsConfig.showBlueReplyFollowersCount)
  $body.classList.toggle('showingSidebarContent', !optionsConfig.hideSidebarContent)
  $body.classList.toggle('uninvertedFollowButtons', optionsConfig.uninvertFollowButtons)
  $showBlueReplyFollowersCountLabel.textContent = chrome.i18n.getMessage(
    'showBlueReplyFollowersCountLabel',
    formatFollowerCount(Number(optionsConfig.showBlueReplyFollowersCountAmount))
  )
  updateHideQuotesFromDisplay()
  updateMutedQuotesDisplay()
}


function updateHideQuotesFromDisplay() {
  if (!shouldDisplayHideQuotesFrom()) return

  $hideQuotesFromLabel.textContent = chrome.i18n.getMessage('hideQuotesFromLabel', String(optionsConfig.hideQuotesFrom.length))

  if (!$hideQuotesFromDetails.open) return

  while ($hideQuotesFrom.hasChildNodes()) $hideQuotesFrom.firstChild.remove()
  for (let user of optionsConfig.hideQuotesFrom) {
    $hideQuotesFrom.appendChild(
      h('section', null,
        h('label', {className: 'button'},
          h('span', null, `@${user}`),
          h('button', {
            type: 'button',
            onclick() {
              optionsConfig.hideQuotesFrom = optionsConfig.hideQuotesFrom.filter(u => u != user)
              storeConfigChanges({hideQuotesFrom: optionsConfig.hideQuotesFrom})
              updateDisplay()
            }
          }, chrome.i18n.getMessage('unmuteButtonText'))
        )
      )
    )
  }
}

function updateMutedQuotesDisplay() {
  if (!shouldDisplayMutedQuotes()) return

  $mutedQuotesLabel.textContent = chrome.i18n.getMessage('mutedTweetsLabel', String(optionsConfig.mutedQuotes.length))

  if (!$mutedQuotesDetails.open) return

  while ($mutedQuotes.hasChildNodes()) $mutedQuotes.firstChild.remove()

  optionsConfig.mutedQuotes.forEach(({user, time, text}, index) => {
    $mutedQuotes.appendChild(
      h('section', null,
        h('label', {className: 'button mutedQuote'},
          h('div', null,
            user,
            ' – ',
            new Intl.DateTimeFormat([], {dateStyle: 'medium'}).format(new Date(time)),
            text && h('p', {className: 'mb-0'}, text),
          ),
          h('button', {
            type: 'button',
            onclick: () => {
              optionsConfig.mutedQuotes = optionsConfig.mutedQuotes.filter((_, i) => i != index)
              chrome.storage.local.set({mutedQuotes: optionsConfig.mutedQuotes})
              updateDisplay()
            },
          }, chrome.i18n.getMessage('unmuteButtonText'))
        )
      )
    )
  })
}

const TAB_LABELS = {
  timeline: 'Timeline',
  behavior: 'Behavior',
  xfixes: 'X Fixes',
  appearance: 'Appearance',
  navigation: 'Navigation',
  advanced: 'Advanced',
  backup: 'Backup',
}

const DEFAULT_TAB = 'timeline'

function setupTabs() {
  let $wrap = /** @type {HTMLElement|null} */ (document.querySelector('.tab-bar-wrap'))
  let $bar = /** @type {HTMLElement|null} */ (document.querySelector('.tab-bar'))
  let $tabs = /** @type {NodeListOf<HTMLButtonElement>} */ (
    document.querySelectorAll('.tab-bar .tab')
  )
  if (!$tabs.length || !$bar || !$wrap) return

  /** @param {string} tab */
  function activate(tab) {
    if (!TAB_LABELS[tab]) tab = DEFAULT_TAB
    for (let key of Object.keys(TAB_LABELS)) {
      $body.classList.toggle(`tab-${key}`, key == tab)
    }
    for (let $tab of $tabs) {
      let selected = $tab.dataset.tab == tab
      $tab.setAttribute('aria-selected', String(selected))
      if (selected) {
        // Bring the active tab into view on narrow layouts
        $tab.scrollIntoView({block: 'nearest', inline: 'nearest', behavior: 'smooth'})
      }
    }
  }

  for (let $tab of $tabs) {
    $tab.addEventListener('click', () => activate($tab.dataset.tab))
  }

  // Overflow-aware scroll arrows: only visible when there is more to scroll.
  function updateArrows() {
    let canLeft = $bar.scrollLeft > 1
    let canRight = $bar.scrollLeft + $bar.clientWidth < $bar.scrollWidth - 1
    $wrap.classList.toggle('has-scroll-left', canLeft)
    $wrap.classList.toggle('has-scroll-right', canRight)
  }
  $bar.addEventListener('scroll', updateArrows, {passive: true})
  window.addEventListener('resize', updateArrows)

  let $left = $wrap.querySelector('.tab-scroll-left')
  let $right = $wrap.querySelector('.tab-scroll-right')
  $left?.addEventListener('click', () => $bar.scrollBy({left: -180, behavior: 'smooth'}))
  $right?.addEventListener('click', () => $bar.scrollBy({left: 180, behavior: 'smooth'}))

  activate(DEFAULT_TAB)
  updateArrows()
}

function computeRowSearchText($row) {
  return ($row.textContent || '').toLowerCase()
}

function setupOptionsSearch() {
  let $input = /** @type {HTMLInputElement} */ (document.querySelector('#searchInput'))
  if (!$input) return

  let $groups = /** @type {NodeListOf<HTMLElement>} */ (
    document.querySelectorAll('form > section.group.labelled, form > section.experiments-wrap')
  )
  let $count = /** @type {HTMLElement|null} */ (document.querySelector('#searchCount'))
  let $kbd = /** @type {HTMLElement|null} */ (document.querySelector('#searchKbd'))

  let HIDDEN = 'cpft_hidden_by_search'

  let rowText = new WeakMap()
  for (let $group of $groups) {
    for (let $row of $group.querySelectorAll(':scope > section, :scope > details, :scope > p')) {
      rowText.set($row, computeRowSearchText(/** @type {HTMLElement} */ ($row)))
    }
  }

  function apply() {
    let query = $input.value.trim().toLowerCase()
    let searching = Boolean(query)
    $body.classList.toggle('searching', searching)

    let matchCount = 0
    for (let $group of $groups) {
      let anyVisible = false
      let $rows = /** @type {NodeListOf<HTMLElement>} */ (
        $group.querySelectorAll(':scope > section, :scope > details, :scope > p')
      )
      for (let $row of $rows) {
        let text = rowText.get($row) || ''
        let match = !query || text.includes(query)
        $row.classList.toggle(HIDDEN, !match)
        if (match) {
          anyVisible = true
          if (searching) matchCount++
        }
      }
      $group.classList.toggle(HIDDEN, searching && !anyVisible)
    }

    if ($count) {
      if (searching) {
        $count.hidden = false
        $count.textContent = `${matchCount} result${matchCount == 1 ? '' : 's'}`
      } else {
        $count.hidden = true
        $count.textContent = ''
      }
    }
    if ($kbd) {
      $kbd.style.visibility = searching ? 'hidden' : ''
    }
  }

  $input.addEventListener('input', apply)
  $input.addEventListener('keydown', (e) => {
    if (e.key == 'Escape' && $input.value) {
      $input.value = ''
      apply()
      e.stopPropagation()
    }
  })

  // Global `/` shortcut focuses the search input
  document.addEventListener('keydown', (e) => {
    if (e.key == '/' && document.activeElement !== $input &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)) {
      e.preventDefault()
      $input.focus()
      $input.select()
    }
  })
}

function updateFormControls() {
  Object.keys(optionsConfig)
        .filter(prop => prop in $form.elements)
        .forEach(prop => updateFormControl($form.elements[prop], optionsConfig[prop]))
}

function updateFormControl($control, value) {
  if ($control instanceof RadioNodeList) {
    // If a checkbox displays in multiple sections, update them all
    $control.forEach(input => /** @type {HTMLInputElement} */ (input).checked = value)
  }
  else if ($control.type == 'checkbox') {
    $control.checked = value
  }
  else {
    $control.value = value
  }
}
//#endregion

//#region Main
function main() {
  chrome.storage.local.get((/** @type {Partial<import("./types").Config>} */ storedConfig) => {
    // Update deprecated config values
    // @ts-ignore
    if (storedConfig.twitterBlueChecks == 'dim') {
      storedConfig.twitterBlueChecks = 'replace'
    }
    optionsConfig = {...defaultConfig, ...storedConfig}

    $body.classList.toggle('debug', optionsConfig.debug === true)
    $experiments.open = true
    $exportConfig.addEventListener('click', exportConfig)

    // The real file input stays hidden so the pair reads as two matching
    // buttons rather than one button and a browser-styled file picker.
    $importConfig?.addEventListener('click', () => $importFile?.click())
    $importFile?.addEventListener('change', () => {
      let file = $importFile.files?.[0]
      if (file) importConfig(file)
      // Cleared so re-picking the same file fires change again.
      $importFile.value = ''
    })
    $form.addEventListener('change', onFormChanged)
    $hideQuotesFromDetails.addEventListener('toggle', updateHideQuotesFromDisplay)
    $mutedQuotesDetails.addEventListener('toggle', updateMutedQuotesDisplay)
    $saveCustomCssButton.addEventListener('click', saveCustomCss)
    setupTabs()
    setupOptionsSearch()
    let $versionText = document.querySelector('#versionText')
    if ($versionText) {
      $versionText.textContent = `v${chrome.runtime.getManifest().version}`
    }
    chrome.storage.onChanged.addListener(onStorageChanged)

    if (!optionsConfig.debug) {
      let $version = document.querySelector('#version')
      let $debugCountdown = document.querySelector('#debugCountdown')
      let debugCountdown = 5

      function onClick(e) {
        if (e.target === $version || $version.contains(/** @type {Node} */ (e.target))) {
          debugCountdown--
        } else {
          debugCountdown = 5
        }

        if (debugCountdown == 0) {
          $body.classList.add('debug')
          $debugCountdown.textContent = ''
          $form.removeEventListener('click', onClick)
        }
        else if (debugCountdown <= 3) {
          $debugCountdown.textContent = ` (${debugCountdown})`
        }
      }

      $form.addEventListener('click', onClick)
    }

    applyConfig()
  })
}

main()
//#endregion