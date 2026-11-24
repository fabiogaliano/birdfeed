/**
 * Replaces real identities in the page before a screenshot is taken.
 *
 * The captures are meant to ship inside the options page as examples, and a
 * screenshot of a live timeline contains other people's posts, faces and
 * handles, plus the logged-in account's own. None of that can go into a public
 * extension, so it is swapped for synthetic stand-ins first.
 *
 * The mapping is stable per page session - the same real handle always becomes
 * the same fake one - so a before/after pair stays visually consistent across
 * the two shots.
 */

const ANONYMIZE = `
(() => {
  const NAMES = ['Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Katherine Johnson',
                 'Barbara Liskov', 'Margaret Hamilton', 'Donald Knuth', 'Radia Perlman']
  const HANDLES = ['adalovelace', 'gracehopper', 'alanturing', 'kjohnson',
                   'bliskov', 'mhamilton', 'dknuth', 'rperlman']
  const COLORS = ['#7aa2f7', '#9ece6a', '#e0af68', '#f7768e', '#bb9af7', '#7dcfff']
  const WORDS = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod ' +
    'tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis').split(' ')

  window.__anon ??= new Map()
  // Stable ids keep one person mapped to one stand-in across both screenshots.
  const idFor = (key) => {
    if (!window.__anon.has(key)) window.__anon.set(key, window.__anon.size)
    return window.__anon.get(key)
  }

  let avatar = (i) => 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">' +
    '<rect width="64" height="64" fill="' + COLORS[i % COLORS.length] + '"/></svg>')

  for (let img of document.querySelectorAll('img[src*="pbs.twimg.com"], img[src*="profile_images"]')) {
    if (img.dataset.anon) continue
    img.dataset.anon = '1'
    img.src = avatar(idFor(img.getAttribute('src') || String(Math.random())))
  }

  // Avatars and header images are often CSS backgrounds rather than <img>
  for (let el of document.querySelectorAll('[style*="pbs.twimg.com"]')) {
    if (el.dataset.anon) continue
    el.dataset.anon = '1'
    el.style.backgroundImage = 'url("' + avatar(idFor(el.className || 'bg')) + '")'
  }

  // @handles, wherever they appear - leaf nodes only, so parents aren't clobbered.
  // Skipping already-swapped nodes keeps one person on one handle: re-running
  // over a fake handle would otherwise map it again and the pair would disagree.
  let FAKE = new Set(HANDLES.map(h => '@' + h))
  for (let el of document.querySelectorAll('span, div, a')) {
    if (el.children.length || el.dataset.anon) continue
    let text = (el.textContent || '').trim()
    if (FAKE.has(text)) { el.dataset.anon = '1'; continue }
    if (/^@[A-Za-z0-9_]{1,15}$/.test(text)) {
      el.dataset.anon = '1'
      el.textContent = '@' + HANDLES[idFor(text) % HANDLES.length]
    }
  }

  let isNoise = (t) => !t || t.startsWith('@') || t === '·' ||
                       /^\\d+[smhd]$/.test(t) || /^[A-Z][a-z]{2} \\d+$/.test(t)

  // Text nodes rather than leaf elements: a display name is a bare text node
  // beside its badge and emoji, so a leaf-element walk never reaches it and the
  // real name leaks. Structure is left alone, so the layout doesn't shift.
  // Swapped nodes are remembered rather than marked, so a re-run only touches
  // nodes React has rendered since - re-swapping a stand-in would map it again
  // and the before/after pair would disagree.
  window.__anonText ??= new WeakSet()
  let textNodes = (root) => {
    let walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let out = []
    while (walker.nextNode()) {
      let node = walker.currentNode
      if (node.textContent.trim() && !window.__anonText.has(node) &&
          !node.parentElement?.closest('[data-anon]')) out.push(node)
    }
    return out
  }
  let swap = (node, value) => {
    node.textContent = value
    window.__anonText.add(node)
  }
  let lorem = (text, count, step) => Array.from({length: count},
    (_, i) => WORDS[(idFor(text) + i * step) % WORDS.length]).join(' ')

  // Display names: the author link's name block in every post header. The
  // first real text is the name; anything after it is cleared, because any of
  // it can identify the person.
  for (let $name of document.querySelectorAll('article a[href^="/"]:not([href*="/status/"]) > div[dir="auto"]')) {
    let nodes = textNodes($name).filter(n => !isNoise(n.textContent.trim()))
    if (!nodes.length) continue
    swap(nodes[0], NAMES[idFor(nodes.map(n => n.textContent.trim()).join(' ')) % NAMES.length])
    for (let node of nodes.slice(1)) swap(node, '')
  }

  // Names also appear outside posts: hover cards, user cells in Who to follow
  // and Relevant people, the sidebar. Those carry bios too, which are just as
  // identifying. A user cell is a [role=link] to a profile; posts link to a
  // /status/ and trends to /search, so both are left out.
  let cards = [
    '[data-base-ui-portal] [role="presentation"]',
    '[role="link"][data-href^="/"]:not([data-href*="/status/"]):not([data-href^="/search"])',
    'aside',
  ].join(', ')
  for (let $card of document.querySelectorAll(cards)) {
    for (let node of textNodes($card)) {
      let text = node.textContent.trim()
      if (isNoise(text) || text.length < 3) continue
      swap(node, text.length > 24 ? lorem(text, 12, 3) : NAMES[idFor(text) % NAMES.length])
    }
  }

  // The logged-in account's own name, in the account switcher under the rail
  for (let $acct of document.querySelectorAll('div:has(> [data-rail-overflow]) > div > button[aria-haspopup="menu"]')) {
    for (let node of textNodes($acct)) {
      if (!node.textContent.trim().startsWith('@')) swap(node, NAMES[0])
    }
  }

  // Link card headlines and "From domain" lines - real article titles are as
  // identifying as post text, and they sit outside it. Cards are external links
  // holding blocks; inline text links hold only text.
  for (let $card of document.querySelectorAll('article a[target="_blank"]:has(> div)')) {
    for (let node of textNodes($card)) {
      let text = node.textContent.trim()
      if (text.length < 4 || /^[\\w.]+\\.[a-z]{2,}$/.test(text)) continue
      swap(node, lorem(text, Math.max(3, Math.min(10, text.split(/\\s+/).length)), 5))
    }
  }

  // Post text: keep roughly the original length so layout doesn't shift. Per
  // text node, because the text block also holds links and mentions whose
  // elements other settings (unwrapTcoLinks) act on.
  for (let $text of document.querySelectorAll('article div[dir="auto"][lang]')) {
    for (let node of textNodes($text)) {
      let text = node.textContent
      swap(node, lorem(text, Math.max(1, Math.min(38, text.trim().split(/\\s+/).length)), 3) + ' ')
    }
  }

  return {
    identities: window.__anon.size,
    avatars: document.querySelectorAll('[data-anon]').length,
  }
})()
`

// Re-applied after every config change: the extension re-renders tweets, and
// anything React swapped back in would otherwise be real again.
async function anonymize(page) {
  return await page.evaluate(ANONYMIZE).catch(() => null)
}

module.exports = {anonymize, ANONYMIZE}
