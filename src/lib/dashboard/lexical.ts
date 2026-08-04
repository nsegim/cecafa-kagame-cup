/**
 * Builds a minimal valid Lexical value from plain text (one paragraph per
 * line), for the dashboard's plain-textarea commentary composer — the full
 * rich-text toolbar (bold/links/embeds) stays a /admin-only capability for
 * now. Shape matches what `@payloadcms/richtext-lexical` itself produces, so
 * `richTextHasContent()` and the public feed's Lexical renderer both read it
 * identically to an editor-authored entry.
 */
export function plainTextToLexical(text: string) {
  const lines = text.split('\n').filter((line) => line.trim() !== '')
  const paragraphs = (lines.length > 0 ? lines : ['']).map((line) => ({
    type: 'paragraph',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    textFormat: 0,
    textStyle: '',
    children: line
      ? [
          {
            mode: 'normal',
            text: line,
            type: 'text',
            style: '',
            detail: 0,
            format: 0,
            version: 1,
          },
        ]
      : [],
  }))

  return {
    root: {
      type: 'root',
      children: paragraphs,
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      version: 1,
    },
  }
}
