import { useState, useEffect, useRef, useCallback } from 'react'
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

const PROFILE_PAGE_SIZE = 15

function parsePost(p: any, myId?: string): Post {
  return {
    id: p.id, user_id: p.user_id, text: p.text,
    image_url: p.image_url, created_at: p.created_at,
    like_count: p.likes?.length ?? p.like_count ?? 0,
    view_count: p.view_count ?? 0,
    mine: p.user_id === myId,
    display_name: p.profiles?.display_name ?? 'Пользователь',
    username: p.profiles?.username ?? '',
    avatar_url: p.profiles?.avatar_url,
    verified: p.profiles?.verified ?? false,
  }
}

interface Props {
  likedIds: Set<string>
  onAddPost: (text: string, imageUrl?: string | string[], poll?: string[]) => Promise<void>
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

function ProfilePage({ likedIds, onAddPost, onLike, onVote, onOpenPost, onDeletePost, onEditPost, profile, followersCount, followingCount, onProfileUpdate, myUserId, onOpenProfile, onOpenAdmin }: Props) {
  const [tab, setTab] = useState<Tab>('posts')
  const [showSettings, setShowSettings] = useState(false)
  const [viewerImages, setViewerImages] = useState<string[]>([])
  const [viewerIndex, setViewerIndex] = useState(0)
  const [followsModal, setFollowsModal] = useState<'followers' | 'following' | null>(null)
  const [likedPosts, setLikedPosts] = useState<Post[]>([])
  const [likedLoading, setLikedLoading] = useState(false)

  const [profilePosts, setProfilePosts] = useState<Post[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const offsetRef = useRef(0)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadInitialPosts = useCallback(async () => {
    if (!myUserId) return
    setLoadingPosts(true)
    offsetRef.current = 0
    const { data } = await supabase
      .from('posts')
      .select('*, profiles!posts_user_id_fkey(display_name, username, avatar_url, verified), likes(id)')
      .eq('user_id', myUserId)
      .order('created_at', { ascending: false })
      .range(0, PROFILE_PAGE_SIZE - 1)
    if (data) {
      setProfilePosts(data.map((p: any) => parsePost(p, myUserId)))
      offsetRef.current = data.length
      setHasMore(data.length === PROFILE_PAGE_SIZE)
    }
    setLoadingPosts(false)
  }, [myUserId])

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore || !myUserId) return
    setLoadingMore(true)
    const from = offsetRef.current
    const { data } = await supabase
      .from('posts')
      .select('*, profiles!posts_user_id_fkey(display_name, username, avatar_url, verified), likes(id)')
      .eq('user_id', myUserId)
      .order('created_at', { ascending: false })
      .range(from, from + PROFILE_PAGE_SIZE - 1)
    if (data) {
      setProfilePosts(prev => {
        const ids = new Set(prev.map(p => p.id))
        return [...prev, ...data.map((p: any) => parsePost(p, myUserId)).filter((p: Post) => !ids.has(p.id))]
      })
      offsetRef.current = from + data.length
      setHasMore(data.length === PROFILE_PAGE_SIZE)
    }
    setLoadingMore(false)
  }, [loadingMore, hasMore, myUserId])

  useEffect(() => { loadInitialPosts() }, [loadInitialPosts])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || loadingPosts) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMorePosts()
    }, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadingPosts, loadMorePosts])

  useEffect(() => {
    if (tab !== 'likes' || !myUserId) return
    if (likedPosts.length > 0) return
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
            <button onClick={onOpenAdmin} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '9px 12px', borderRadius: 18, border: 'none', boxShadow: 'inset 0 0 0 1px rgba(var(--t),0.15)', background: 'transparent', color: 'rgba(var(--t),0.6)', cursor: 'pointer', alignSelf: 'flex-end', marginBottom: -8 }}>
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
        <div key="posts" className="tab-content-fade">
          <Composer
            onPublish={async (text, imageUrl, poll) => {
              await onAddPost(text, imageUrl, poll)
              await loadInitialPosts()
            }}
            avatarUrl={profile?.avatar_url}
          />

          {loadingPosts ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner"/></div>
          ) : profilePosts.length === 0 ? (
            <div className="profile-empty"><p>Нет постов</p></div>
          ) : (
            profilePosts.map(post => {
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
                  <PostMenu
                    post={post}
                    onDelete={id => { setProfilePosts(prev => prev.filter(p => p.id !== id)); onDeletePost?.(id) }}
                    onEdit={(id, text, image_url) => { setProfilePosts(prev => prev.map(p => p.id === id ? { ...p, text, image_url } : p)); onEditPost?.(id, text, image_url) }}
                  />
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

          {!loadingPosts && (
            <div ref={sentinelRef} style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
              {loadingMore && <div className="spinner"/>}
            </div>
          )}
        </div>
      )}

      {tab === 'likes' && (
        <div className="tab-content-fade">
          {likedLoading ? (
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
                      : <svg width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="18" fill="var(--bg-input)"/><text x="18" y="23" textAnchor="middle" fontSize="14" fill="rgba(var(--t),0.7)">{post.display_name?.charAt(0).toUpperCase() || '?'}</text></svg>
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
          })}
        </div>
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
