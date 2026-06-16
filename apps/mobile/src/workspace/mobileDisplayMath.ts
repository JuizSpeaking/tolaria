type MarkdownLine = string
type MarkdownLines = MarkdownLine[]

export type MobileDisplayMathBlock = {
  lines: MarkdownLines
  nextIndex: number
}

export function readMobileDisplayMathBlock(
  lines: MarkdownLines,
  startIndex: number,
): MobileDisplayMathBlock | null {
  const line = lines[startIndex]
  if (!line) return null

  const trimmed = line.trim()
  if (isSingleLineMobileDisplayMath(trimmed)) {
    return { lines: [trimmed], nextIndex: startIndex + 1 }
  }
  if (trimmed !== '$$') return null

  const mathLines = ['$$']
  let index = startIndex + 1
  while (index < lines.length) {
    const current = lines[index] ?? ''
    if (current.trim() === '$$') {
      mathLines.push('$$')
      return { lines: mathLines, nextIndex: index + 1 }
    }
    mathLines.push(current)
    index += 1
  }

  return null
}

export function isMobileDisplayMathStart(line: MarkdownLine): boolean {
  const trimmed = line.trim()
  return trimmed === '$$' || isSingleLineMobileDisplayMath(trimmed)
}

function isSingleLineMobileDisplayMath(line: MarkdownLine): boolean {
  return /^\$\$(.+)\$\$$/.test(line)
}
