import { useState, useEffect, useRef } from 'react'
import { Search, X, Eye, MessageCircle } from 'lucide-react'
import { supabase } from './lib/supabase'
import type { Post } from './Home'
import { linkify } from './linkify'
import { openMention } from './mentionHelper'
import { CATEGORIES } from './Categories'

interface Profile {
  id: string
  display_name: string
  username: string
  avatar_url?: string
  verified?: boolean
}

interface Props {
  onOpenPost: (post: Post) => void
  onOpenProfile: (userId: string) => void
  onSelectCategory: (categoryId: string) => void
}

type Tab = 'all' | 'posts' | 'users'

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'только что'
  if (diff < 3600) return `${Math.floor(diff / 60)}м.`
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч.`
  return `${Math.floor(diff / 86400)}д.`
}

function SearchPage({ onOpenPost, onOpenProfile, onSelectCategory }: Props) {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('all')
  const [posts, setPosts] = useState<Post[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const q = query.trim()
    if (!q) { setPosts([]); setUsers([]); return }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const search = async (q: string) => {
    setLoading(true)
    const [{ data: postsData }, { data: usersData }] = await Promise.all([
      supabase
        .from('posts')
        .select('*, profiles!posts_user_id_fkey(display_name, username, avatar_url, verified), likes(id)')
        .ilike('text', `%${q}%`)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, verified')
        .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
        .limit(20),
    ])

    if (postsData) {
      const { data: { user } } = await supabase.auth.getUser()
      setPosts(postsData.map((p: any) => ({
        id: p.id, user_id: p.user_id, text: p.text,
        image_url: p.image_url, created_at: p.created_at,
        like_count: p.likes?.length ?? 0, view_count: p.view_count ?? 0,
        mine: p.user_id === user?.id,
        display_name: p.profiles?.display_name ?? 'Пользователь',
        username: p.profiles?.username ?? '',
        avatar_url: p.profiles?.avatar_url,
        verified: p.profiles?.verified ?? false,
      })))
    }
    if (usersData) setUsers(usersData)
    setLoading(false)
  }

  const q = query.trim()
  const showPosts = tab === 'all' || tab === 'posts'
  const showUsers = tab === 'all' || tab === 'users'

  return (
    <div className="search-page">
      <div className="search-bar-wrap">
        <Search size={16} className="search-bar-icon"/>
        <input
          className="search-bar-input"
          placeholder="Поиск постов, людей..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <button className="search-clear" onClick={() => setQuery('')}>
            <X size={15}/>
          </button>
        )}
      </div>

      {!q ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(var(--t),0.35)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0 2px' }}>Категории</p>
          <div className="cat-grid">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon
              return (
                <button key={cat.id} className="cat-card" onClick={() => onSelectCategory(cat.id)}>
                  <div className="cat-icon" style={{ background: cat.bg }}>
                    <Icon size={22} color={cat.color} strokeWidth={1.8}/>
                  </div>
                  <div className="cat-info">
                    <span className="cat-name">{cat.name}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="search-results">
          <div className="search-tabs">
            <div className="search-tab-slider" style={{ transform: `translateX(${tab === 'all' ? '0%' : tab === 'posts' ? '100%' : '200%'})` }}/>
            {(['all', 'posts', 'users'] as Tab[]).map(t => (
              <button key={t} className={`search-tab${tab === t ? ' search-tab--active' : ''}`} onClick={() => setTab(t)}>
                {t === 'all' ? 'Все' : t === 'posts' ? 'Посты' : 'Люди'}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
              <div className="spinner"/>
            </div>
          ) : (
            <>
              {showUsers && users.length > 0 && (
                <div className="result-section">
                  {tab === 'all' && <p className="result-section-label">Люди</p>}
                  {users.map(user => (
                    <div key={user.id} className="result-user card" style={{ cursor: 'pointer' }} onClick={() => onOpenProfile(user.id)}>
                      <div className="post-avatar">
                        {user.avatar_url
                          ? <img src={user.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', display: 'block' }}/>
                          : <svg width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="url(#sg)"/><defs><radialGradient id="sg" cx="30%" cy="30%"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#6d28d9"/></radialGradient></defs></svg>
                        }
                      </div>
                      <div className="result-user-info">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span className={`result-user-name${user.verified ? ' verified-name' : ''}`}>{user.display_name}</span>
                          {user.verified && <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="6" fill="#1DA1F2"/><path d="M8 12l3 3 5-6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </span>
                        <span className="result-user-meta">@{user.username}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showPosts && posts.length > 0 && (
                <div className="result-section">
                  {tab === 'all' && <p className="result-section-label">Посты</p>}
                  {posts.map(post => (
                    <div key={post.id} className="card post" style={{ cursor: 'pointer' }} onClick={() => onOpenPost(post)}>
                      <div className="post-header">
                        <div className="post-avatar" style={{ cursor: 'pointer' }} onClick={e => { e.stopPropagation(); onOpenProfile(post.user_id) }}>
                          {post.avatar_url
                            ? <img src={post.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', display: 'block' }}/>
                            : <svg width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="18" fill="var(--bg-input)"/><text x="18" y="23" textAnchor="middle" fontSize="14" fill="rgba(var(--t),0.7)">{post.display_name?.charAt(0).toUpperCase() || '?'}</text></svg>
                          }
                        </div>
                        <div className="post-meta">
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span className={`post-username${post.verified ? ' verified-name' : ''}`}>{post.display_name || post.username}</span>
                            {post.verified && <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="6" fill="#1DA1F2"/><path d="M8 12l3 3 5-6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </span>
                          <span className="post-time">{timeAgo(post.created_at)}</span>
                        </div>
                      </div>
                      {post.text && <p className="post-text">{linkify(post.text, u => openMention(u, onOpenProfile))}</p>}
                      <div className="post-footer" onClick={e => e.stopPropagation()}>
                        <div className="post-footer-left">
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(var(--t),0.4)', fontSize: 13 }}>
                            <MessageCircle size={14} strokeWidth={1.8}/> {post.like_count}
                          </span>
                        </div>
                        <div className="post-views">
                          <Eye size={14} strokeWidth={1.8}/>
                          <span>{post.view_count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {users.length === 0 && posts.length === 0 && (
                <div className="search-no-results">
                  <Search size={32} strokeWidth={1.2}/>
                  <p>Ничего не найдено по запросу «{query}»</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchPage
