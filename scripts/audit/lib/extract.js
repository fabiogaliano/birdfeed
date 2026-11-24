const fs = require('fs')
const path = require('path')

const {ROOT} = require('./default-config')

// The DOM hooks script.js depends on, pulled from its source so the audit can
// never check a different set than the one that ships. Shared by hooks.js,
// selectors.js, verify.js and icon-paths.js, which each ask a different
// question of the same hooks.

function readSource() {
  return fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8')
}

// Top-level selector constants (TIMELINE_ROW, POST_MENU_TRIGGER). Code refers
// to them by name, so a block that uses one has none of its hooks in its text.
function readConstants(source = readSource()) {
  let found = new Map()
  for (let m of source.matchAll(/^const ([A-Z][A-Z_0-9]*) = '([^'\n]+)'$/gm)) {
    // Only selector-shaped values; the regexes and URLs beside them aren't hooks
    if (/[[\]:#]/.test(m[2]) && !m[2].startsWith('http')) found.set(m[1], m[2])
  }
  return found
}

// A block's text plus the values of any selector constants it names.
function withConstants(block, constants) {
  let extra = []
  for (let [name, value] of constants) {
    if (new RegExp(`\\b${name}\\b`).test(block)) extra.push(value)
  }
  return extra.length ? `${block}\n${extra.join('\n')}` : block
}

// Icon names in either of the two forms X renders them in: inline
// svg[data-icon="icon-…"] or a sprite reference use[href="#icon-…"]. `prefix`
// is set for ^= matches such as icon-logo-grok, which covers its variants.
function iconNames(text) {
  let found = new Map()
  let add = (name, prefix, form) => {
    let key = `${name}|${prefix}|${form}`
    if (!found.has(key)) found.set(key, {name, prefix, form})
  }
  for (let m of text.matchAll(/data-icon(\^?)=\\?["'](icon-[a-z0-9][a-z0-9-]*)/g)) {
    add(m[2], m[1] == '^', 'data-icon')
  }
  for (let m of text.matchAll(/href(\^?)=\\?["']#(icon-[a-z0-9][a-z0-9-]*)/g)) {
    add(m[2], m[1] == '^', 'sprite')
  }
  return [...found.values()]
}

function iconSelector({name, prefix, form}) {
  let op = prefix ? '^=' : '='
  return form == 'sprite' ? `use[href${op}"#${name}"]` : `svg[data-icon${op}"${name}"]`
}

// Attribute hooks: X's semantic data-* attributes (data-engagement-action,
// data-slot, data-pinned-timeline…), the urt: timeline ids, Tailwind class
// fragments matched with class*=, post text's [dir][lang], and tag#id pairs
// like a#sidebar-compose-post.
// data-icon is left to iconNames(), and data-cpft is Birdfeed's own marker.
function attrHooks(text) {
  let found = new Map()
  let add = (name, selector) => {
    if (!selector.includes('${') && !found.has(name)) found.set(name, {name, selector})
  }
  for (let m of text.matchAll(/\[(data-[a-z][\w-]*|id|class|lang|dir)(?:([\^$*]?)=\\?["']([^"'\\]*)\\?["'])?\]/g)) {
    let [, attr, op = '', value] = m
    if (attr == 'data-icon' || attr.startsWith('data-cpft')) continue
    if (value == null) add(attr, `[${attr}]`)
    else add(`${attr}${op}=${value}`, `[${attr}${op}="${value}"]`)
  }
  for (let m of text.matchAll(/\b[a-z]+#([a-z][\w-]*)/g)) {
    if (!m[1].startsWith('cpft')) add(`#${m[1]}`, `#${m[1]}`)
  }
  return [...found.values()]
}

module.exports = {readSource, readConstants, withConstants, iconNames, iconSelector, attrHooks}
