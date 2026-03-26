import { HelpCircle, Laugh, Images, Video } from 'lucide-react'

export const CATEGORIES = [
  { id: 'ask',     name: 'Спросить Егора', icon: HelpCircle, color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  { id: 'memes',   name: 'Мемы',           icon: Laugh,      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  { id: 'gallery', name: 'Галерея',        icon: Images,     color: '#34d399', bg: 'rgba(52,211,153,0.12)'  },
  { id: 'video',   name: 'Видео',          icon: Video,      color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
]

interface Props {
  onSelect: (categoryId: string) => void
}

function Categories({ onSelect }: Props) {
  return (
    <div className="cat-page">
      <div className="cat-header">
        <h2 className="cat-title">Категории</h2>
        <p className="cat-subtitle">Найди интересующую тебя тему</p>
      </div>

      <div className="cat-grid">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon
          return (
            <button key={cat.id} className="cat-card" onClick={() => onSelect(cat.id)}>
              <div className="cat-icon" style={{ background: cat.bg }}>
                <Icon size={22} color={cat.color} strokeWidth={1.8} />
              </div>
              <div className="cat-info">
                <span className="cat-name">{cat.name}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default Categories
