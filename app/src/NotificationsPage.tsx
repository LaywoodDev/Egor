import { useEffect, useState } from 'react'
import { Heart, MessageCircle, AtSign } from 'lucide-react'
import { supabase } from './lib/supabase'

interface UserNotification {
  id: string
  type: 'like' | 'comment' | 'mention'
  post_id: string | null
  comment_text: string | null
  read: boolean
  created_at: string
  actor_name: string
  actor_avatar: string | null
  actor_verified: boolean
  post_text: string | null
}

interface Props {
  onOpenProfile?: (userId: string) => void
  onOpenPost?: (postId: string) => void
}

function formatDate(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'только что'
  if (diff < 3600) return `${Math.floor(diff / 60)} мин.`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч.`
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '')
}

const TYPE_ICON: Record<string, { icon: JSX.Element; color: string }> = {
  like:    { icon: <Heart size={10} fill="#fff" stroke="none"/>, color: '#e53e3e' },
  comment: { icon: <MessageCircle size={10} fill="#fff" stroke="none"/>, color: '#3b82f6' },
  mention: { icon: <AtSign size={10} strokeWidth={2.5}/>, color: '#a78bfa' },
}

const TYPE_TEXT: Record<string, string> = {
  like:    'оценил(а) ваш пост',
  comment: 'прокомментировал(а) ваш пост',
  mention: 'упомянул(а) вас',
}

function NotificationsPage({ onOpenProfile, onOpenPost }: Props) {
  const [items, setItems] = useState<UserNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('user_notifications')
        .select(`
          id, type, post_id, comment_text, read, created_at,
          profiles!user_notifications_actor_id_fkey(id, display_name, avatar_url, verified),
          posts(text)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (data) {
        setItems(data.map((n: any) => ({
          id: n.id,
          type: n.type,
          post_id: n.post_id,
          comment_text: n.comment_text,
          read: n.read,
          created_at: n.created_at,
          actor_id: n.profiles?.id,
          actor_name: n.profiles?.display_name ?? 'Пользователь',
          actor_avatar: n.profiles?.avatar_url ?? null,
          actor_verified: n.profiles?.verified ?? false,
          post_text: n.posts?.text ?? null,
        })))

        // mark all as read
        await supabase
          .from('user_notifications')
          .update({ read: true })
          .eq('user_id', user.id)
          .eq('read', false)
      }
      setLoading(false)
    }
    load()
    localStorage.setItem('notif_last_read', new Date().toISOString())
  }, [])

  return (
    <div className="post-page">
      <div className="post-page-header">
        <span className="post-page-title">Уведомления</span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div className="spinner"/>
        </div>
      ) : items.length === 0 ? (
        <div className="profile-empty"><p>Нет уведомлений</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(n => {
            const typeInfo = TYPE_ICON[n.type]
            const preview = n.type === 'comment' ? n.comment_text : n.post_text
            return (
              <div
                key={n.id}
                className="card"
                style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, cursor: n.post_id ? 'pointer' : 'default', opacity: n.read ? 0.75 : 1 }}
                onClick={() => n.post_id && onOpenPost?.(n.post_id)}
              >
                {/* Avatar + type icon */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {n.actor_avatar ? (
                    <img src={n.actor_avatar} alt="" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }}/>
                  ) : (
                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg, #a78bfa, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#fff', fontWeight: 600 }}>
                      {n.actor_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {typeInfo && (
                    <div style={{ position: 'absolute', bottom: 0, right: -2, width: 18, height: 18, borderRadius: '50%', background: typeInfo.color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #1e1e22' }}>
                      {typeInfo.icon}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, lineHeight: 1.4 }}>
                    <span
                      style={{ fontWeight: 700, color: '#fff', cursor: 'pointer' }}
                      onClick={e => { e.stopPropagation(); /* TODO: onOpenProfile */ }}
                    >
                      {n.actor_name}
                    </span>
                    {n.actor_verified && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ display: 'inline', verticalAlign: 'middle', margin: '0 3px' }}>
                        <rect x="2" y="2" width="20" height="20" rx="6" fill="#1DA1F2"/>
                        <path d="M8 12l3 3 5-6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {' '}
                    <span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 400 }}>{TYPE_TEXT[n.type]}</span>
                  </div>
                  {preview && (
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {preview}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 5 }}>{formatDate(n.created_at)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default NotificationsPage
