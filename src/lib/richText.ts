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
