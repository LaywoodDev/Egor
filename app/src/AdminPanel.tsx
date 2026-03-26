import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Trash2, Users, FileText, BarChart2, Ban, BadgeCheck, Pencil, X } from 'lucide-react'

interface AdminPost {
  id: string
  text: string
  created_at: string
  user_id: string
  display_name: string
  like_count: number
  view_count: number
}

interface AdminUser {
  id: string
  display_name: string
  username: string
  created_at: string
  banned: boolean
  verified: boolean
}

type Tab = 'stats' | 'posts' | 'users'

function AdminPanel() {
  const [tab, setTab] = useState<Tab>('stats')
  const [posts, setPosts] = useState<AdminPost[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState({ posts: 0, users: 0, likes: 0, comments: 0 })
  const [loading, setLoading] = useState(true)
  const [editingPost, setEditingPost] = useState<AdminPost | null>(null)
  const [editText, setEditText] = useState('')

  useEffect(() => { loadStats() }, [])
  useEffect(() => {
    if (tab === 'posts') loadPosts()
    else if (tab === 'users') loadUsers()
  }, [tab])

  const loadStats = async () => {
    setLoading(true)
    const [{ count: postsCount }, { count: usersCount }, { count: likesCount }, { count: commentsCount }] = await Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('likes').select('*', { count: 'exact', head: true }),
      supabase.from('comments').select('*', { count: 'exact', head: true }),
    ])
    setStats({ posts: postsCount ?? 0, users: usersCount ?? 0, likes: likesCount ?? 0, comments: commentsCount ?? 0 })
    setLoading(false)
  }

  const loadPosts = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('posts')
      .select('*, profiles!posts_user_id_fkey(display_name), likes(id)')
      .order('created_at', { ascending: false })
      .limit(200)
    if (data) {
      setPosts(data.map((p: any) => ({
        id: p.id, text: p.text, created_at: p.created_at, user_id: p.user_id,
        display_name: p.profiles?.display_name ?? 'Пользователь',
        like_count: p.likes?.length ?? 0, view_count: p.view_count ?? 0,
      })))
    }
    setLoading(false)
  }

  const loadUsers = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, username, created_at, banned, verified')
      .order('created_at', { ascending: false })
    if (data) setUsers(data)
    setLoading(false)
  }

  const deletePost = async (id: string) => {
    if (!confirm('Удалить пост?')) return
    await supabase.from('posts').delete().eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  const saveEditPost = async () => {
    if (!editingPost) return
    await supabase.from('posts').update({ text: editText }).eq('id', editingPost.id)
    setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, text: editText } : p))
    setEditingPost(null)
  }

  const toggleBan = async (user: AdminUser) => {
    const newVal = !user.banned
    await supabase.from('profiles').update({ banned: newVal }).eq('id', user.id)
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, banned: newVal } : u))
  }

  const toggleVerify = async (user: AdminUser) => {
    const newVal = !user.verified
    await supabase.from('profiles').update({ verified: newVal }).eq('id', user.id)
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, verified: newVal } : u))
  }

  const deleteUser = async (id: string) => {
    if (!confirm('Удалить пользователя и все его данные?')) return
    await supabase.from('posts').delete().eq('user_id', id)
    await supabase.from('profiles').delete().eq('id', id)
    setUsers(prev => prev.filter(u => u.id !== id))
  }

  const tabs: { id: Tab; label: string; icon: JSX.Element }[] = [
    { id: 'stats', label: 'Статистика', icon: <BarChart2 size={15}/> },
    { id: 'posts', label: 'Посты',      icon: <FileText size={15}/> },
    { id: 'users', label: 'Юзеры',      icon: <Users size={15}/> },
  ]

  return (
    <div className="post-page">

      {/* Edit post modal */}
      {editingPost && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(4px)' }} onClick={() => setEditingPost(null)}>
          <div style={{ background: '#1e1e22', borderRadius: 18, padding: 24, width: '90%', maxWidth: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: 0 }}>Редактировать пост</h3>
              <button onClick={() => setEditingPost(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={18}/></button>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>{editingPost.display_name}</div>
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              style={{ width: '100%', padding: 12, background: '#28282e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontFamily: 'inherit', fontSize: 14, minHeight: 120, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingPost(null)} style={{ padding: '9px 18px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Отмена</button>
              <button onClick={saveEditPost} style={{ padding: '9px 18px', borderRadius: 16, border: 'none', background: '#fff', color: '#151518', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      <div className="post-page-header">
        <span className="post-page-title" style={{ fontSize: 19 }}>Панель управления</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 15px', borderRadius: 18, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
            background: tab === t.id ? '#ffffff' : 'rgba(255,255,255,0.07)',
            color: tab === t.id ? '#151518' : 'rgba(255,255,255,0.6)',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div className="spinner"/>
        </div>
      ) : tab === 'stats' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {[
            { label: 'Постов',        value: stats.posts    },
            { label: 'Пользователей', value: stats.users    },
            { label: 'Лайков',        value: stats.likes    },
            { label: 'Комментариев',  value: stats.comments },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#ffffff', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>

      ) : tab === 'posts' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {posts.length === 0 ? <div className="profile-empty"><p>Нет постов</p></div> : posts.map(post => (
            <div key={post.id} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                  {post.display_name} · {new Date(post.created_at).toLocaleDateString('ru-RU')} · ❤ {post.like_count} · 👁 {post.view_count}
                </div>
                <div style={{ fontSize: 14, color: '#fff', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {post.text || <em style={{ color: 'rgba(255,255,255,0.3)' }}>Без текста</em>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => { setEditingPost(post); setEditText(post.text) }}
                  style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center' }}>
                  <Pencil size={14}/>
                </button>
                <button onClick={() => deletePost(post.id)}
                  style={{ background: 'rgba(239,68,68,0.12)', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                  <Trash2 size={14}/>
                </button>
              </div>
            </div>
          ))}
        </div>

      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.length === 0 ? <div className="profile-empty"><p>Нет пользователей</p></div> : users.map(user => (
            <div key={user.id} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: user.banned ? 'rgba(255,255,255,0.3)' : '#fff' }}>{user.display_name}</span>
                  {user.verified && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" fill="#3b82f6"/><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  {user.banned && <span style={{ fontSize: 11, background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: 6, padding: '2px 6px' }}>забанен</span>}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>@{user.username} · {new Date(user.created_at).toLocaleDateString('ru-RU')}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {/* Verify */}
                <button onClick={() => toggleVerify(user)} title={user.verified ? 'Убрать верификацию' : 'Верифицировать'}
                  style={{ background: user.verified ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: user.verified ? '#3b82f6' : 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}>
                  <BadgeCheck size={15}/>
                </button>
                {/* Ban */}
                <button onClick={() => toggleBan(user)} title={user.banned ? 'Разбанить' : 'Забанить'}
                  style={{ background: user.banned ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: user.banned ? '#ef4444' : 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}>
                  <Ban size={15}/>
                </button>
                {/* Delete */}
                <button onClick={() => deleteUser(user.id)}
                  style={{ background: 'rgba(239,68,68,0.12)', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                  <Trash2 size={14}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminPanel
