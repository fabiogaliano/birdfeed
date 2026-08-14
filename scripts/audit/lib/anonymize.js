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

  // Display names. Walking every leaf span under User-Name rather than guessing
  // one path: quoted tweets, replies and hover cards each nest these
  // differently, and a missed structure leaks a real person's name.
  let isNoise = (t) => !t || t.startsWith('@') || t === '·' ||
                       /^\\d+[smhd]$/.test(t) || /^[A-Z][a-z]{2} \\d+$/.test(t)

  for (let $un of document.querySelectorAll('[data-testid="User-Name"]')) {
    for (let el of $un.querySelectorAll('span')) {
      if (el.children.length || el.dataset.anon) continue
      let text = (el.textContent || '').trim()
      if (isNoise(text) || NAMES.includes(text)) { el.dataset.anon = '1'; continue }
      el.dataset.anon = '1'
      el.textContent = NAMES[idFor(text) % NAMES.length]
      break
    }
  }

  // Names also appear outside User-Name: hover cards, "Relevant people", the
  // account switcher. Those carry bios too, which are just as identifying.
  for (let $card of document.querySelectorAll('[data-testid="HoverCard"], [data-testid="UserCell"], aside')) {
    for (let el of $card.querySelectorAll('span, div')) {
      if (el.children.length || el.dataset.anon) continue
      let text = (el.textContent || '').trim()
      if (isNoise(text) || text.length < 3 || NAMES.includes(text)) continue
      el.dataset.anon = '1'
      el.textContent = text.length > 24
        ? Array.from({length: 12}, (_, i) => WORDS[(idFor(text) + i * 3) % WORDS.length]).join(' ')
        : NAMES[idFor(text) % NAMES.length]
    }
  }

  // The logged-in account's own name, in the sidebar switcher
  for (let $acct of document.querySelectorAll('[data-testid="SideNav_AccountSwitcher_Button"]')) {
    for (let el of $acct.querySelectorAll('span')) {
      if (el.children.length || el.dataset.anon) continue
      let text = (el.textContent || '').trim()
      if (!text || text.startsWith('@')) continue
      el.dataset.anon = '1'
      el.textContent = NAMES[0]
    }
  }

  // Link card headlines and descriptions - real article titles are as
  // identifying as post text, and they sit outside tweetText
  for (let $card of document.querySelectorAll('[data-testid="card.wrapper"]')) {
    for (let el of $card.querySelectorAll('span, div')) {
      if (el.children.length || el.dataset.anon) continue
      let text = (el.textContent || '').trim()
      if (text.length < 4 || /^[\\w.]+\\.[a-z]{2,}$/.test(text)) continue
      el.dataset.anon = '1'
      let count = Math.max(3, Math.min(10, text.split(/\\s+/).length))
      el.textContent = Array.from({length: count},
        (_, i) => WORDS[(idFor(text) + i * 5) % WORDS.length]).join(' ')
    }
  }

  // Post text: keep roughly the original length so layout doesn't shift
  for (let $text of document.querySelectorAll('[data-testid="tweetText"]')) {
    if ($text.dataset.anon) continue
    $text.dataset.anon = '1'
    let count = Math.max(5, Math.min(38, ($text.textContent || '').split(/\\s+/).length))
    let seed = idFor($text.textContent)
    $text.textContent = Array.from({length: count},
      (_, i) => WORDS[(seed + i * 3) % WORDS.length]).join(' ')
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
