import { useState } from 'react'
import { Search, TrendingUp, Clock, X, User } from 'lucide-react'

const ALL_POSTS = [
  { id: 1, username: 'Golhok228',   avatar: '✦', text: 'я очень люблю арбузы, рад что я не один такой', time: '1ч.', likes: 38 },
  { id: 2, username: 'techgirl_99', avatar: '◈', text: 'Новый MacBook Pro просто космос, производительность на уровне', time: '2ч.', likes: 124 },
  { id: 3, username: 'daun_egor',   avatar: '◉', text: 'Кто любит программировать по ночам? Я обожаю этот кайф', time: '3ч.', likes: 57 },
  { id: 4, username: 'music_soul',  avatar: '♪', text: 'Новый альбом Radiohead — шедевр, слушаю уже третий раз подряд', time: '5ч.', likes: 89 },
  { id: 5, username: 'sport_max',   avatar: '◆', text: 'Пробежал 10км за 42 минуты, личный рекорд!', time: '6ч.', likes: 203 },
]

const ALL_USERS = [
  { id: 1, username: 'Golhok228',   name: 'Голышев Кирилл', avatar: '✦', followers: '1.2k' },
  { id: 2, username: 'techgirl_99', name: 'Анна Техно',     avatar: '◈', followers: '4.8k' },
  { id: 3, username: 'daun_egor',   name: 'Егор Давалкин',  avatar: '◉', followers: '892' },
  { id: 4, username: 'music_soul',  name: 'Музыкальная душа', avatar: '♪', followers: '2.1k' },
  { id: 5, username: 'sport_max',   name: 'Максим Спорт',   avatar: '◆', followers: '3.4k' },
]

const TRENDING = ['арбузы', 'технологии', 'музыка', 'программирование', 'спорт']
const RECENT = ['daun_egor', 'MacBook', 'radiohead']

type Tab = 'all' | 'posts' | 'users'

function SearchPage() {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('all')
  const [recentSearches, setRecentSearches] = useState(RECENT)

  const q = query.trim().toLowerCase()

  const filteredPosts = ALL_POSTS.filter(p =>
    p.text.toLowerCase().includes(q) || p.username.toLowerCase().includes(q)
  )
  const filteredUsers = ALL_USERS.filter(u =>
    u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)
  )

  const removeRecent = (item: string) =>
    setRecentSearches(prev => prev.filter(r => r !== item))

  const applyRecent = (item: string) => setQuery(item)

  return (
    <div className="search-page">
      {/* Search bar */}
      <div className="search-bar-wrap">
        <Search size={16} className="search-bar-icon" />
        <input
          className="search-bar-input"
          placeholder="Поиск постов, людей..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <button className="search-clear" onClick={() => setQuery('')}>
            <X size={15} />
          </button>
        )}
      </div>

      {!q ? (
        /* Empty state — trending + recent */
        <div className="search-empty">
          {recentSearches.length > 0 && (
            <div className="search-section">
              <div className="search-section-header">
                <Clock size={14} />
                <span>Недавние</span>
              </div>
              <div className="search-chips">
                {recentSearches.map(item => (
                  <div key={item} className="search-chip">
                    <button className="search-chip-text" onClick={() => applyRecent(item)}>
                      {item}
                    </button>
                    <button className="search-chip-remove" onClick={() => removeRecent(item)}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="search-section">
            <div className="search-section-header">
              <TrendingUp size={14} />
              <span>В тренде</span>
            </div>
            <div className="search-chips">
              {TRENDING.map(item => (
                <button key={item} className="search-chip-btn" onClick={() => setQuery(item)}>
                  #{item}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Results */
        <div className="search-results">
          {/* Tabs */}
          <div className="search-tabs">
            {(['all', 'posts', 'users'] as Tab[]).map(t => (
              <button
                key={t}
                className={`search-tab${tab === t ? ' search-tab--active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t === 'all' ? 'Все' : t === 'posts' ? 'Посты' : 'Люди'}
              </button>
            ))}
          </div>

          {(tab === 'all' || tab === 'users') && filteredUsers.length > 0 && (
            <div className="result-section">
              {tab === 'all' && <p className="result-section-label">Люди</p>}
              {filteredUsers.map(user => (
                <div key={user.id} className="result-user card">
                  <div className="result-user-avatar">{user.avatar}</div>
                  <div className="result-user-info">
                    <span className="result-user-name">{user.name}</span>
                    <span className="result-user-meta">@{user.username} · {user.followers} подписчиков</span>
                  </div>
                  <button className="follow-btn">
                    <User size={14} />
                    Подписаться
                  </button>
                </div>
              ))}
            </div>
          )}

          {(tab === 'all' || tab === 'posts') && filteredPosts.length > 0 && (
            <div className="result-section">
              {tab === 'all' && <p className="result-section-label">Посты</p>}
              {filteredPosts.map(post => (
                <div key={post.id} className="card post result-post">
                  <div className="post-header">
                    <div className="post-avatar">
                      <svg width="36" height="36" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="18" fill="#1e1e24"/>
                        <text x="18" y="23" textAnchor="middle" fontSize="15" fill="white">{post.avatar}</text>
                      </svg>
                    </div>
                    <div className="post-meta">
                      <span className="post-username">{post.username}</span>
                      <span className="post-time">{post.time}</span>
                    </div>
                  </div>
                  <p className="post-text">{post.text}</p>
                </div>
              ))}
            </div>
          )}

          {filteredUsers.length === 0 && filteredPosts.length === 0 && (
            <div className="search-no-results">
              <Search size={32} strokeWidth={1.2} />
              <p>Ничего не найдено по запросу «{query}»</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchPage
