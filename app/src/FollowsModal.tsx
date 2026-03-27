import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from './lib/supabase'

interface FollowUser {
  id: string
  display_name: string
  username: string
  avatar_url?: string
  verified?: boolean
}

interface Props {
  userId: string
  type: 'followers' | 'following'
  onClose: () => void
  onOpenProfile: (userId: string) => void
}

function FollowsModal({ userId, type, onClose, onOpenProfile }: Props) {
  const [users, setUsers] = useState<FollowUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      if (type === 'followers') {
        const { data } = await supabase
          .from('follows')
          .select('profiles!follows_follower_id_fkey(id, display_name, username, avatar_url, verified)')
          .eq('following_id', userId)
          .order('created_at', { ascending: false })
          .limit(10)
        if (data) setUsers(data.map((r: any) => r.profiles).filter(Boolean))
      } else {
        const { data } = await supabase
          .from('follows')
          .select('profiles!follows_following_id_fkey(id, display_name, username, avatar_url, verified)')
          .eq('follower_id', userId)
          .order('created_at', { ascending: false })
          .limit(10)
        if (data) setUsers(data.map((r: any) => r.profiles).filter(Boolean))
      }
      setLoading(false)
    }
    load()
  }, [userId, type])

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#1e1e22', borderRadius: 20, width: '90%', maxWidth: 400, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px' }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>
            {type === 'followers' ? 'Подписчики' : 'Подписки'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <X size={18}/>
          </button>
        </div>

        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
              <div className="spinner"/>
            </div>
          ) : users.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14, padding: '24px 0 32px' }}>
              {type === 'followers' ? 'Нет подписчиков' : 'Нет подписок'}
            </p>
          ) : (
            users.map(user => (
              <div
                key={user.id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', cursor: 'pointer' }}
                onClick={() => { onOpenProfile(user.id); onClose() }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ flexShrink: 0 }}>
                  {user.avatar_url
                    ? <img src={user.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', display: 'block' }}/>
                    : (
                      <svg width="40" height="40" viewBox="0 0 40 40">
                        <circle cx="20" cy="20" r="20" fill="url(#fmGrad)"/>
                        <defs><radialGradient id="fmGrad" cx="30%" cy="30%"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#6d28d9"/></radialGradient></defs>
                      </svg>
                    )
                  }
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.display_name}</span>
                    {user.verified && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                        <rect x="2" y="2" width="20" height="20" rx="6" fill="#1DA1F2"/>
                        <path d="M8 12l3 3 5-6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>@{user.username}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default FollowsModal
