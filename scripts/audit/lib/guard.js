/**
 * The harness drives a real account, so destructive actions are blocked at the
 * network layer rather than merely avoided by convention - a stray click in a
 * probe can't like, follow, post or block.
 *
 * Keyed on operation name, not HTTP method: X serves reads over GraphQL POST
 * (HomeLatestTimeline is a POST), so blocking by method takes the timeline down
 * with it. Toggling settings is unaffected either way - that's a local DOM write
 * with no request at all.
 */

// GraphQL operations that change account state. URLs look like
// /i/api/graphql/<queryId>/<OperationName>.
const BLOCKED_OPS = new Set([
  'CreateTweet', 'DeleteTweet', 'CreateRetweet', 'DeleteRetweet',
  'FavoriteTweet', 'UnfavoriteTweet',
  'CreateBookmark', 'DeleteBookmark', 'BookmarkAdd',
  'CreateList', 'DeleteList', 'ListAddMember', 'ListRemoveMember',
  'CreateScheduledTweet', 'DeleteScheduledTweet',
  'ModerateTweet', 'UnmoderateTweet',
  'CreateCommunity', 'JoinCommunity', 'LeaveCommunity',
  'TweetReportFlow', 'CreateDraftTweet', 'DeleteDraftTweet',
  'DMMessageDelete', 'useSendMessageMutation', 'useDeleteMessageMutation',
  'SubscribeToScheduledSpace', 'CreateAudioSpace',
  'FollowTopic', 'UnfollowTopic',
  // Relationship changes. These were only covered by the legacy REST patterns
  // below, but X does them over GraphQL now - so probing anything that opens a
  // block or mute flow could have changed the account's real relationships.
  'CreateBlock', 'DeleteBlock', 'BlockUser', 'UnblockUser',
  'CreateMute', 'DeleteMute', 'MuteUser', 'UnmuteUser',
  'FollowUser', 'UnfollowUser', 'CreateFriendships', 'DestroyFriendships',
  'MuteConversation', 'UnmuteConversation',
])

// Legacy REST endpoints that still back some actions.
const BLOCKED_REST_RE = new RegExp([
  '/1\\.1/friendships/(create|destroy)\\.json',
  '/1\\.1/blocks/(create|destroy)\\.json',
  '/1\\.1/mutes/users/(create|destroy)\\.json',
  '/1\\.1/favorites/(create|destroy)\\.json',
  '/1\\.1/statuses/(update|retweet|unretweet|destroy)',
  '/1\\.1/direct_messages/',
  '/1\\.1/account/update_profile',
].join('|'))

// account/settings.json is a read as GET and a write as POST.
const SETTINGS_RE = /\/1\.1\/account\/settings\.json/

function graphqlOperation(url) {
  let match = url.match(/\/i\/api\/graphql\/[^/]+\/([^/?#]+)/)
  return match ? match[1] : null
}

function isDestructive(url, method = 'GET') {
  if (BLOCKED_REST_RE.test(url)) return true
  if (SETTINGS_RE.test(url) && method != 'GET') return true
  let op = graphqlOperation(url)
  return op != null && BLOCKED_OPS.has(op)
}

function installGuard(context, {onBlocked} = {}) {
  let allowed = false
  let frozen = false
  let held = []
  let blocked = []

  context.route('**/*', (route) => {
    let request = route.request()
    let url = request.url()
    let method = request.method()

    // While frozen, park the request instead of failing it. Aborting makes X
    // unmount the components whose fetches died, which silently deletes the very
    // content a probe is trying to measure.
    if (frozen && !url.startsWith('data:') && !url.startsWith('blob:')) {
      held.push(route)
      return
    }

    if (!allowed && isDestructive(url, method)) {
      blocked.push(`${method} ${url.slice(0, 120)}`)
      onBlocked?.(method, url)
      return route.abort()
    }

    return route.continue()
  })

  return {
    // Opt-in window for probes that can only be verified by invoking the action
    async withMutations(fn) {
      allowed = true
      try {
        return await fn()
      } finally {
        allowed = false
      }
    },

    // Applying a config change is pure local DOM and CSS work - it needs no
    // network. Holding the network for the measurement window stops X streaming
    // in new content, which is the entire noise floor.
    async freeze(fn) {
      frozen = true
      try {
        return await fn()
      } finally {
        frozen = false
        let release = held
        held = []
        for (let route of release) {
          route.continue().catch(() => {})
        }
      }
    },

    get blocked() {
      return blocked
    },
  }
}

module.exports = {installGuard, isDestructive, graphqlOperation}
