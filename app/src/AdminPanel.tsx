import { useEffect, useState, type ReactElement } from 'react'
import { supabase } from './lib/supabase'
import { Trash2, Users, FileText, BarChart2, Ban, BadgeCheck, Pencil, X, Flag, Bell } from 'lucide-react'

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

interface AdminReport {
  id: string
  post_id: string
  reporter_id: string
  reason: string
  comment?: string
  created_at: string
  reporter_name: string
  post_text: string
}

interface AdminNotification {
  id: string
  title: string
  body: string
  created_at: string
}

type Tab = 'stats' | 'posts' | 'users' | 'reports' | 'notify'

interface Props {
  onAiMentionChange?: (enabled: boolean) => void
}

function AdminPanel({ onAiMentionChange }: Props) {
  const [tab, setTab] = useState<Tab>('stats')
  const [posts, setPosts] = useState<AdminPost[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [reports, setReports] = useState<AdminReport[]>([])
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [stats, setStats] = useState({ posts: 0, users: 0, likes: 0, comments: 0 })
  const [loading, setLoading] = useState(true)
  const [editingPost, setEditingPost] = useState<AdminPost | null>(null)
  const [editText, setEditText] = useState('')
  const [notifyTitle, setNotifyTitle] = useState('')
  const [notifyBody, setNotifyBody] = useState('')
  const [notifySending, setNotifySending] = useState(false)
  const [aiMentionEnabled, setAiMentionEnabled] = useState(false)
  const [aiMentionLoading, setAiMentionLoading] = useState(true)
  const [aiMentionSaving, setAiMentionSaving] = useState(false)

  useEffect(() => { loadStats() }, [])
  useEffect(() => {
    if (tab === 'posts') loadPosts()
    else if (tab === 'users') loadUsers()
    else if (tab === 'reports') loadReports()
    else if (tab === 'notify') loadNotifications()
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
    await loadAiSetting()
    setLoading(false)
  }

  const loadAiSetting = async () => {
    setAiMentionLoading(true)
    const { data } = await supabase
      .from('app_settings')
      .select('ai_egor_mention_enabled')
      .eq('id', 1)
      .maybeSingle()
    setAiMentionEnabled(!!data?.ai_egor_mention_enabled)
    setAiMentionLoading(false)
  }

  const toggleAiMention = async () => {
    const next = !aiMentionEnabled
    setAiMentionEnabled(next)
    setAiMentionSaving(true)
    const { error } = await supabase
      .from('app_settings')
      .upsert({ id: 1, ai_egor_mention_enabled: next })
    if (error) {
      setAiMentionEnabled(!next)
      alert('Ошибка: ' + error.message)
    } else {
      onAiMentionChange?.(next)
    }
    setAiMentionSaving(false)
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

  const loadReports = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('reports')
      .select('*, posts(text)')
      .order('created_at', { ascending: false })
    if (data) {
      setReports(data.map((r: any) => ({
        id: r.id, post_id: r.post_id, reporter_id: r.reporter_id,
        reason: r.reason, comment: r.comment, created_at: r.created_at,
        reporter_name: 'Пользователь',
        post_text: r.posts?.text ?? '',
      })))
    }
    setLoading(false)
  }

  const loadNotifications = async () => {
    setLoading(true)
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false })
    if (data) setNotifications(data)
    setLoading(false)
  }

  const sendNotification = async () => {
    if (!notifyTitle.trim() || !notifyBody.trim()) return
    setNotifySending(true)
    const { data, error } = await supabase.from('notifications').insert({ title: notifyTitle.trim(), body: notifyBody.trim() }).select().single()
    if (error) { alert('Ошибка: ' + error.message) }
    else if (data) {
      setNotifications(prev => [data, ...prev])
      setNotifyTitle('')
      setNotifyBody('')
    }
    setNotifySending(false)
  }

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const deleteReport = async (id: string) => {
    await supabase.from('reports').delete().eq('id', id)
    setReports(prev => prev.filter(r => r.id !== id))
  }

  const deletePost = async (id: string) => {
    if (!confirm('Удалить пост?')) return
    const { error: rpcError } = await supabase.rpc('admin_delete_post', { target_post_id: id })
    if (rpcError) {
      const { error: delErr } = await supabase.from('posts').delete().eq('id', id)
      if (delErr) {
        alert('Ошибка: ' + (delErr.message || rpcError.message))
        return
      }
    }
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
    const { error } = await supabase.rpc('admin_delete_user', { target_user_id: id })
    if (error) {
      alert('Ошибка: ' + error.message)
      return
    }
    setUsers(prev => prev.filter(u => u.id !== id))
  }

  const tabs: { id: Tab; label: string; icon: ReactElement }[] = [
    { id: 'stats',   label: 'Статистика', icon: <BarChart2 size={15}/> },
    { id: 'posts',   label: 'Посты',      icon: <FileText size={15}/> },
    { id: 'users',   label: 'Юзеры',      icon: <Users size={15}/> },
    { id: 'reports', label: 'Жалобы',     icon: <Flag size={15}/> },
    { id: 'notify',  label: 'Рассылка',   icon: <Bell size={15}/> },
  ]

  return (
    <div className="post-page">

      {/* Edit post modal */}
      {editingPost && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(4px)' }} onClick={() => setEditingPost(null)}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 18, padding: 24, width: '90%', maxWidth: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Редактировать пост</h3>
              <button onClick={() => setEditingPost(null)} style={{ background: 'none', border: 'none', color: 'rgba(var(--t),0.4)', cursor: 'pointer' }}><X size={18}/></button>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(var(--t),0.35)', marginBottom: 10 }}>{editingPost.display_name}</div>
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              style={{ width: '100%', padding: 12, background: 'var(--bg-subtle)', border: '1px solid rgba(var(--t),0.1)', borderRadius: 12, color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, minHeight: 120, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingPost(null)} style={{ padding: '9px 18px', borderRadius: 16, border: '1px solid rgba(var(--t),0.15)', background: 'transparent', color: 'rgba(var(--t),0.6)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Отмена</button>
              <button onClick={saveEditPost} style={{ padding: '9px 18px', borderRadius: 16, border: 'none', background: 'var(--text)', color: 'var(--btn-text)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>Сохранить</button>
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
            background: tab === t.id ? 'var(--btn-bg)' : 'rgba(var(--t),0.07)',
            color: tab === t.id ? 'var(--btn-text)' : 'rgba(var(--t),0.6)',
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
              <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'rgba(var(--t),0.4)', marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
          <div className="card" style={{ padding: '16px 18px', gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Режим бога</div>
              <div style={{ fontSize: 12, color: 'rgba(var(--t),0.45)' }}>
                Добавляет к тексту одну короткую позитивную фразу. Не влияет на уже опубликованные посты.
              </div>
            </div>
            <button
              onClick={toggleAiMention}
              disabled={aiMentionLoading || aiMentionSaving}
              aria-pressed={aiMentionEnabled}
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                cursor: aiMentionLoading || aiMentionSaving ? 'not-allowed' : 'pointer',
                opacity: aiMentionLoading || aiMentionSaving ? 0.6 : 1,
              }}
            >
              <span
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: 46,
                  height: 26,
                  borderRadius: 999,
                  background: aiMentionEnabled ? 'var(--text)' : 'rgba(var(--t),0.15)',
                  transition: 'background 0.2s ease',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 3,
                    left: aiMentionEnabled ? 24 : 3,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.2s ease',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  }}
                />
              </span>
            </button>
          </div>
        </div>

      ) : tab === 'posts' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {posts.length === 0 ? <div className="profile-empty"><p>Нет постов</p></div> : posts.map(post => (
            <div key={post.id} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'rgba(var(--t),0.4)', marginBottom: 4 }}>
                  {post.display_name} · {new Date(post.created_at).toLocaleDateString('ru-RU')} · ❤ {post.like_count} · 👁 {post.view_count}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {post.text || <em style={{ color: 'rgba(var(--t),0.3)' }}>Без текста</em>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => { setEditingPost(post); setEditText(post.text) }}
                  style={{ background: 'rgba(var(--t),0.07)', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: 'rgba(var(--t),0.7)', display: 'flex', alignItems: 'center' }}>
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

      ) : tab === 'reports' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reports.length === 0 ? <div className="profile-empty"><p>Нет жалоб</p></div> : reports.map(report => (
            <div key={report.id} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>{report.reason}</span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(var(--t),0.4)', marginBottom: 4 }}>
                  от {report.reporter_name} · {new Date(report.created_at).toLocaleDateString('ru-RU')}
                </div>
                {report.post_text && (
                  <div style={{ fontSize: 13, color: 'rgba(var(--t),0.6)', background: 'rgba(var(--t),0.04)', borderRadius: 8, padding: '6px 10px', marginBottom: 4 }}>
                    {report.post_text.slice(0, 120)}{report.post_text.length > 120 ? '…' : ''}
                  </div>
                )}
                {report.comment && (
                  <div style={{ fontSize: 12, color: 'rgba(var(--t),0.4)', fontStyle: 'italic' }}>«{report.comment}»</div>
                )}
              </div>
              <button onClick={() => deleteReport(report.id)}
                style={{ background: 'rgba(var(--t),0.07)', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: 'rgba(var(--t),0.5)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <X size={14}/>
              </button>
            </div>
          ))}
        </div>

      ) : tab === 'notify' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Новое уведомление</div>
            <input
              placeholder="Заголовок"
              value={notifyTitle}
              onChange={e => setNotifyTitle(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-subtle)', border: '1px solid rgba(var(--t),0.1)', borderRadius: 12, color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
            />
            <textarea
              placeholder="Текст сообщения"
              value={notifyBody}
              onChange={e => setNotifyBody(e.target.value)}
              rows={4}
              style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-subtle)', border: '1px solid rgba(var(--t),0.1)', borderRadius: 12, color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: 14 }}
            />
            <button
              onClick={sendNotification}
              disabled={notifySending || !notifyTitle.trim() || !notifyBody.trim()}
              style={{ width: '100%', padding: '11px', borderRadius: 14, border: 'none', background: notifyTitle.trim() && notifyBody.trim() ? 'var(--btn-bg)' : 'rgba(var(--t),0.15)', color: notifyTitle.trim() && notifyBody.trim() ? 'var(--btn-text)' : 'rgba(var(--t),0.4)', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: notifyTitle.trim() && notifyBody.trim() ? 'pointer' : 'default', transition: 'all 0.15s' }}
            >
              {notifySending ? 'Отправка…' : 'Разослать всем'}
            </button>
          </div>
          {notifications.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 13, color: 'rgba(var(--t),0.35)', paddingLeft: 4 }}>История рассылок</div>
              {notifications.map(n => (
                <div key={n.id} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{n.title}</div>
                    <div style={{ fontSize: 13, color: 'rgba(var(--t),0.55)', marginBottom: 4, whiteSpace: 'pre-wrap' }}>{n.body}</div>
                    <div style={{ fontSize: 11, color: 'rgba(var(--t),0.3)' }}>{new Date(n.created_at).toLocaleString('ru-RU')}</div>
                  </div>
                  <button onClick={() => deleteNotification(n.id)}
                    style={{ background: 'rgba(var(--t),0.07)', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: 'rgba(var(--t),0.5)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <X size={14}/>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.length === 0 ? <div className="profile-empty"><p>Нет пользователей</p></div> : users.map(user => (
            <div key={user.id} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: user.banned ? 'rgba(var(--t),0.3)' : 'var(--text)' }}>{user.display_name}</span>
                  {user.verified && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><rect x="2" y="2" width="20" height="20" rx="6" fill="#1DA1F2"/><path d="M8 12l3 3 5-6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  {user.banned && <span style={{ fontSize: 11, background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: 6, padding: '2px 6px' }}>забанен</span>}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(var(--t),0.35)' }}>@{user.username} · {new Date(user.created_at).toLocaleDateString('ru-RU')}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {/* Verify */}
                <button onClick={() => toggleVerify(user)} title={user.verified ? 'Убрать верификацию' : 'Верифицировать'}
                  style={{ background: user.verified ? 'rgba(59,130,246,0.2)' : 'rgba(var(--t),0.07)', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: user.verified ? '#3b82f6' : 'rgba(var(--t),0.5)', display: 'flex', alignItems: 'center' }}>
                  <BadgeCheck size={15}/>
                </button>
                {/* Ban */}
                <button onClick={() => toggleBan(user)} title={user.banned ? 'Разбанить' : 'Забанить'}
                  style={{ background: user.banned ? 'rgba(239,68,68,0.2)' : 'rgba(var(--t),0.07)', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: user.banned ? '#ef4444' : 'rgba(var(--t),0.5)', display: 'flex', alignItems: 'center' }}>
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
