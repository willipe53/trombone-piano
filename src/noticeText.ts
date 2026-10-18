/// The sample NOTICE is hard-wrapped. The first paragraph keeps its line breaks. Later paragraphs become one line each.
export function joinLicenseNotice(raw: string): string {
  const paragraphs = raw
    .split(/\n\n/)
    .map((paragraph, index) => {
      const lines = paragraph
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
      return lines.join(index === 0 ? '\n' : ' ')
    })
    .filter((paragraph) => paragraph.length > 0)
  return paragraphs.join('\n')
}

export type HelpBlock = { kind: 'heading'; icon: string; title: string } | { kind: 'paragraph'; text: string }

const headingPattern = /^## !\[[^\]]*\]\(([^)]+)\)\s*(.*)$/

export function parseHelp(markdown: string): HelpBlock[] {
  const blocks: HelpBlock[] = []
  for (const chunk of markdown.split(/\n\n+/)) {
    const lines = chunk.split('\n')
    const match = headingPattern.exec((lines[0] ?? '').trim())
    if (match) {
      blocks.push({ kind: 'heading', icon: match[1], title: match[2].trim() })
      const rest = lines.slice(1).join('\n').trim()
      if (rest) blocks.push({ kind: 'paragraph', text: rest })
      continue
    }
    const text = chunk.trim()
    if (text) blocks.push({ kind: 'paragraph', text })
  }
  return blocks
}
