/**
 * Pure, client-safe helper for Lexical richText values. A richText field is
 * never a falsy empty string — even a blank editor serialises to a root with
 * one empty paragraph — so "is this empty?" has to walk the node tree for any
 * non-whitespace text. Used by the commentary field's required-validation and
 * by the feed renderer (skip the block when there's nothing to show).
 */
export function richTextHasContent(value: unknown): boolean {
  const root = (value as { root?: { children?: unknown[] } } | null | undefined)?.root
  if (!root || !Array.isArray(root.children)) return false
  const walk = (nodes: unknown[]): boolean =>
    nodes.some((n) => {
      const node = n as { text?: unknown; children?: unknown }
      if (typeof node.text === 'string' && node.text.trim() !== '') return true
      return Array.isArray(node.children) ? walk(node.children) : false
    })
  return walk(root.children)
}

/** A Lexical node, narrowed to what these text helpers actually read. */
type TextishNode = { text?: unknown; children?: unknown; fields?: { url?: unknown } }

/**
 * The plain text of a Lexical value (or of one node), with a space between
 * blocks so words either side of a paragraph break don't run together.
 *
 * A link node's own `fields.url` is included as well as its visible label:
 * a link added with the toolbar can read "watch the highlights" while the URL
 * — the part that matters for spotting an embeddable video — lives only in
 * the node's fields.
 */
export function richTextToPlainText(value: unknown): string {
  const node = value as { root?: unknown } | null | undefined
  const start = node?.root ?? value
  const parts: string[] = []
  const walk = (n: unknown): void => {
    const current = n as TextishNode
    if (!current || typeof current !== 'object') return
    if (typeof current.text === 'string') parts.push(current.text)
    if (typeof current.fields?.url === 'string') parts.push(current.fields.url)
    if (Array.isArray(current.children)) current.children.forEach(walk)
  }
  walk(start)
  return parts.join(' ')
}
