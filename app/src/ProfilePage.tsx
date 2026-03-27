import { useState, useEffect } from 'react'
import { Eye, MessageCircle, ShieldCheck } from 'lucide-react'
import ImageViewer from './ImageViewer'
import type { Post } from './Home'
import PostMenu from './PostMenu'
import FollowsModal from './FollowsModal'
import { linkify } from './linkify'
import { openMention } from './mentionHelper'
import { supabase } from './lib/supabase'


function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'только что'
  if (diff < 3600) return `${Math.floor(diff / 60)}м.`
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч.`
  return `${Math.floor(diff / 86400)}д.`
}
import Settings from './Settings'
import Composer from './Composer'

interface Profile {
  display_name: string
  username: string
  created_at: string
  avatar_url?: string
  banner_url?: string
  bio?: string
  verified?: boolean
}

interface Props {
  posts: Post[]
  likedIds: Set<string>
  onAddPost: (text: string, imageUrl?: string, poll?: string[]) => Promise<void>
  onLike: (id: string) => void
  onVote: (postId: string, optionIndex: number) => void
  onOpenPost: (post: Post) => void
  onDeletePost?: (id: string) => void
  onEditPost?: (id: string, text: string, image_url?: string) => void
  profile: Profile | null
  followersCount: number
  followingCount: number
  onProfileUpdate: () => void
  myUserId?: string
  onOpenProfile?: (userId: string) => void
  onOpenAdmin?: () => void
}

function formatRegDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
}

type Tab = 'posts' | 'likes'

function IcHeart({ filled }: { filled?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? '#e53e3e' : 'none'} stroke={filled ? '#e53e3e' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )
}

function parseImageUrl(imageUrl?: string): string[] {
  if (!imageUrl) return []
  try {
    const parsed = JSON.parse(imageUrl)
    if (Array.isArray(parsed)) return parsed
  } catch (e) {}
  return [imageUrl]
}

function ProfilePage({ posts, likedIds, onAddPost, onLike, onVote, onOpenPost, onDeletePost, onEditPost, profile, followersCount, followingCount, onProfileUpdate, myUserId, onOpenProfile, onOpenAdmin }: Props) {
  const [tab, setTab] = useState<Tab>('posts')
  const [showSettings, setShowSettings] = useState(false)
  const [viewerImages, setViewerImages] = useState<string[]>([])
  const [viewerIndex, setViewerIndex] = useState(0)
  const [followsModal, setFollowsModal] = useState<'followers' | 'following' | null>(null)
  const [likedPosts, setLikedPosts] = useState<Post[]>([])
  const [likedLoading, setLikedLoading] = useState(false)

  useEffect(() => {
    if (tab !== 'likes' || !myUserId) return
    setLikedLoading(true)
    const fetchLiked = async () => {
      const { data: likes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', myUserId)
      if (!likes || likes.length === 0) { setLikedPosts([]); setLikedLoading(false); return }
      const ids = likes.map((l: any) => l.post_id)
      const { data: posts } = await supabase
        .from('posts')
        .select('*, profiles!posts_user_id_fkey(display_name, username, avatar_url, verified)')
        .in('id', ids)
      if (posts) {
        const ordered = ids.map((id: string) => posts.find((p: any) => p.id === id)).filter(Boolean)
        setLikedPosts(ordered.map((p: any) => ({
          id: p.id, user_id: p.user_id, text: p.text,
          image_url: p.image_url, created_at: p.created_at,
          like_count: p.like_count ?? 0, view_count: p.view_count ?? 0,
          mine: p.user_id === myUserId,
          display_name: p.profiles?.display_name ?? 'Пользователь',
          username: p.profiles?.username ?? '',
          avatar_url: p.profiles?.avatar_url,
          verified: p.profiles?.verified ?? false,
        })))
      }
      setLikedLoading(false)
    }
    fetchLiked()
  }, [tab, myUserId])

  return (
    <>
      {viewerImages.length > 0 && <ImageViewer imageUrls={viewerImages} initialIndex={viewerIndex} onClose={() => setViewerImages([])}/>}
      {followsModal && myUserId && (
        <FollowsModal userId={myUserId} type={followsModal} onClose={() => setFollowsModal(null)} onOpenProfile={onOpenProfile ?? (() => {})}/>
      )}
      <div className="profile-page">

      {/* Banner card only */}
      <div className="profile-card">
        <div
          className="profile-banner"
          style={profile?.banner_url ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        />
      </div>

      {/* Avatar + Edit – outside card */}
      <div className="profile-avatar-row">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" style={{ width: 74, height: 74, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <svg width="74" height="74" viewBox="0 0 74 74">
                <circle cx="37" cy="37" r="37" fill="url(#pg)"/>
                <defs>
                  <radialGradient id="pg" cx="35%" cy="30%">
                    <stop offset="0%" stopColor="#a78bfa"/>
                    <stop offset="100%" stopColor="#6d28d9"/>
                  </radialGradient>
                </defs>
              </svg>
            )}
          </div>
          <span className="profile-online" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 52 }}>
          {onOpenAdmin && (
            <button onClick={onOpenAdmin} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '9px 12px', borderRadius: 18, border: 'none', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', alignSelf: 'flex-end', marginBottom: -8 }}>
              <ShieldCheck size={17}/>
            </button>
          )}
          <button className="profile-edit-btn" onClick={() => setShowSettings(true)}>Редактировать</button>
        </div>
      </div>

      {/* Info – outside card */}
      <div className="profile-info">
        <div className="profile-name-row">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span className={`profile-name${profile?.verified ? ' verified-name' : ''}`}>{profile?.display_name || '—'}</span>
            {profile?.verified && (
              <span className="verified-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, display: 'block' }}><rect x="2" y="2" width="20" height="20" rx="6" fill="#1DA1F2"/><path d="M8 12l3 3 5-6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span className="verified-badge__tooltip">Верифицированный аккаунт</span>
              </span>
            )}
          </span>
          <span className="profile-username">@{profile?.username || '—'}</span>
        </div>
        <div className="profile-stats">
          <span style={{ cursor: 'pointer' }} onClick={() => setFollowsModal('followers')}><b>{followersCount}</b> подписчиков</span>
          <span style={{ cursor: 'pointer' }} onClick={() => setFollowsModal('following')}><b>{followingCount}</b> подписок</span>
        </div>
        {profile?.bio && (
          <p className="profile-bio">{profile.bio}</p>
        )}
        {profile?.created_at && (
          <p className="profile-registered">Регистрация: {formatRegDate(profile.created_at)}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="profile-tabs-wrap">
        <div className="profile-tabs">
          <div
            className="profile-tab-slider"
            style={{ transform: `translateX(${tab === 'likes' ? '100%' : '0%'})` }}
          />
          <button className={`profile-tab${tab === 'posts' ? ' profile-tab--active' : ''}`} onClick={() => setTab('posts')}>
            Посты
          </button>
          <button className={`profile-tab${tab === 'likes' ? ' profile-tab--active' : ''}`} onClick={() => setTab('likes')}>
            Лайки
          </button>
        </div>
      </div>

      {tab === 'posts' && (
        <>
          <Composer onPublish={onAddPost} avatarUrl={profile?.avatar_url}/>

          {/* User's posts */}
          {posts.length === 0 ? (
            <div className="profile-empty"><p>Нет постов</p></div>
          ) : (
            posts.map(post => {
              const imageUrls = parseImageUrl(post.image_url)
              return (
              <div key={post.id} className="card post" style={{ cursor: 'pointer' }} onClick={() => onOpenPost(post)}>
                <div className="post-header" onClick={e => e.stopPropagation()}>
                  <div className="post-avatar">
                    {profile?.avatar_url
                      ? <img src={profile.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', display: 'block' }}/>
                      : <svg width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="18" fill="url(#ppAvatar)"/><defs><radialGradient id="ppAvatar" cx="30%" cy="30%"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#6d28d9"/></radialGradient></defs></svg>
                    }
                  </div>
                  <div className="post-meta">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span className={`post-username${post.verified ? ' verified-name' : ''}`}>{post.display_name || post.username}</span>
                      {post.verified && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><rect x="2" y="2" width="20" height="20" rx="6" fill="#1DA1F2"/><path d="M8 12l3 3 5-6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </span>
                    <span className="post-time">{timeAgo(post.created_at)}</span>
                  </div>
                  <PostMenu post={post} onDelete={onDeletePost} onEdit={onEditPost}/>
                </div>
                {post.text && <p className="post-text">{linkify(post.text, u => openMention(u, onOpenProfile ?? (() => {})))}</p>}
                {imageUrls.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: imageUrls.length === 1 ? '1fr' : 'repeat(2, 1fr)', gap: 6, marginBottom: 12, borderRadius: 12, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                    {imageUrls.map((url, i) => (
                      <img key={i} src={url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', cursor: 'pointer', display: 'block' }} onClick={() => { setViewerImages(imageUrls); setViewerIndex(i) }}/>
                    ))}
                  </div>
                )}
                {post.poll && (
                  <div onClick={e => e.stopPropagation()}>
                    <div className="post-poll">
                      {post.poll.options.map((opt, i) => {
                        const total = post.poll!.vote_counts.reduce((a, b) => a + b, 0)
                        const pct = total > 0 ? Math.round((post.poll!.vote_counts[i] / total) * 100) : 0
                        const voted = post.poll!.my_vote !== undefined
                        const isMyVote = post.poll!.my_vote === i
                        return (
                          <button key={i} className={`poll-option${voted ? ' poll-option--voted' : ''}${isMyVote ? ' poll-option--my-vote' : ''}`}
                            onClick={() => !voted && onVote(post.id, i)}>
                            {voted && <div className="poll-bar" style={{ width: `${pct}%` }}/>}
                            <div className="poll-option-content">
                              <span className="poll-option-text">{opt}</span>
                              {voted && <span className="poll-option-pct">{pct}%</span>}
                            </div>
                          </button>
                        )
                      })}
                      <span className="poll-total">{post.poll.vote_counts.reduce((a,b)=>a+b,0)} голосов</span>
                    </div>
                  </div>
                )}
                <div className="post-footer" onClick={e => e.stopPropagation()}>
                  <div className="post-footer-left">
                    <button className="like-btn" onClick={() => onLike(post.id)}>
                      <IcHeart filled={likedIds.has(post.id)}/>
                      <span>{post.like_count}</span>
                    </button>
                    <button className="comment-btn" onClick={() => onOpenPost(post)}>
                      <MessageCircle size={18} strokeWidth={1.8}/>
                    </button>
                  </div>
                  <div className="post-views">
                    <Eye size={14} strokeWidth={1.8}/>
                    <span>{post.view_count}</span>
                  </div>
                </div>
              </div>
            )
            })
          )}
        </>
      )}

      {tab === 'likes' && (
        likedLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner"/></div>
        ) : likedPosts.length === 0 ? (
          <div className="profile-empty"><p>Нет лайкнутых постов</p></div>
        ) : likedPosts.map(post => {
          const imageUrls = parseImageUrl(post.image_url)
          return (
            <div key={post.id} className="card post" style={{ cursor: 'pointer' }} onClick={() => onOpenPost(post)}>
              <div className="post-header" onClick={e => e.stopPropagation()}>
                <div className="post-avatar" style={{ cursor: 'pointer' }} onClick={() => onOpenProfile?.(post.user_id)}>
                  {post.avatar_url
                    ? <img src={post.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', display: 'block' }}/>
                    : <svg width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="18" fill="#2a2a30"/><text x="18" y="23" textAnchor="middle" fontSize="14" fill="rgba(255,255,255,0.7)">{post.display_name?.charAt(0).toUpperCase() || '?'}</text></svg>
                  }
                </div>
                <div className="post-meta">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span className={`post-username${post.verified ? ' verified-name' : ''}`} style={{ cursor: 'pointer' }} onClick={() => onOpenProfile?.(post.user_id)}>{post.display_name || post.username}</span>
                    {post.verified && <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="6" fill="#1DA1F2"/><path d="M8 12l3 3 5-6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </span>
                  <span className="post-time">{timeAgo(post.created_at)}</span>
                </div>
              </div>
              {post.text && <p className="post-text">{linkify(post.text, u => openMention(u, onOpenProfile ?? (() => {})))}</p>}
              {imageUrls.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: imageUrls.length === 1 ? '1fr' : 'repeat(2, 1fr)', gap: 6, marginBottom: 12, borderRadius: 12, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                  {imageUrls.map((url, i) => (
                    <img key={i} src={url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', cursor: 'pointer', display: 'block' }} onClick={() => { setViewerImages(imageUrls); setViewerIndex(i) }}/>
                  ))}
                </div>
              )}
              <div className="post-footer" onClick={e => e.stopPropagation()}>
                <div className="post-footer-left">
                  <button className="like-btn" onClick={() => onLike(post.id)}>
                    <IcHeart filled={likedIds.has(post.id)}/>
                    <span>{post.like_count}</span>
                  </button>
                  <button className="comment-btn" onClick={() => onOpenPost(post)}>
                    <MessageCircle size={18} strokeWidth={1.8}/>
                  </button>
                </div>
                <div className="post-views">
                  <Eye size={14} strokeWidth={1.8}/>
                  <span>{post.view_count}</span>
                </div>
              </div>
            </div>
          )
        })
      )}

      {showSettings && (
        <Settings
          profile={profile}
          onClose={() => setShowSettings(false)}
          onSaved={onProfileUpdate}
        />
      )}
      </div>
    </>
  )
}

export default ProfilePage
