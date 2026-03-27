const COMBINED_REGEX = /(https?:\/\/[^\s<>"]+|@[a-zA-Z0-9_]+)/g

export function linkify(text: string, onMentionClick?: (username: string) => void) {
  const parts = text.split(COMBINED_REGEX)
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#60a5fa', textDecoration: 'none', wordBreak: 'break-all' }}
          onClick={e => e.stopPropagation()}
          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
        >
          {part}
        </a>
      )
    }
    if (/^@[a-zA-Z0-9_]+$/.test(part)) {
      return (
        <span
          key={i}
          style={{ color: '#60a5fa', fontWeight: 500, cursor: onMentionClick ? 'pointer' : 'text' }}
          onClick={e => { if (onMentionClick) { e.stopPropagation(); onMentionClick(part.slice(1)) } }}
        >
          {part}
        </span>
      )
    }
    return part
  })
}
