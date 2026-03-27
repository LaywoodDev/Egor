import { useEffect, useState } from 'react'
import { ChevronLeft, Eye, MessageCircle } from 'lucide-react'
import ImageViewer from './ImageViewer'
import { supabase } from './lib/supabase'
import type { Post, Poll } from './Home'
import PostMenu from './PostMenu'
import FollowsModal from './FollowsModal'
import { linkify } from './linkify'
import { openMention } from './mentionHelper'

interface Profile {
  display_name: string
  username: string
  created_at: string
  avatar_url?: string
  banner_url?: string
  bio?: string
  last_seen?: string
  verified?: boolean
  likes_visibility?: string
}

interface Props {
  userId: string
  onBack: () => void
  onOpenPost: (post: Post) => void
  onOpenProfile: (userId: string) => void
  onFollowChange?: () => void
}

function formatRegDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'только что'
  if (diff < 3600) return `${Math.floor(diff / 60)}м.`
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч.`
  return `${Math.floor(diff / 86400)}д.`
}

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

function PollDisplay({ poll, onVote }: { poll: Poll; onVote: (i: number) => void }) {
  const total = poll.vote_counts.reduce((a, b) => a + b, 0)
  const voted = poll.my_vote !== undefined
  return (
    <div className="post-poll">
      {poll.options.map((opt, i) => {
        const pct = total > 0 ? Math.round((poll.vote_counts[i] / total) * 100) : 0
        const isMyVote = poll.my_vote === i
        return (
          <button
            key={i}
            className={`poll-option${voted ? ' poll-option--voted' : ''}${isMyVote ? ' poll-option--my-vote' : ''}`}
            onClick={() => !voted && onVote(i)}
          >
            {voted && <div className="poll-bar" style={{ width: `${pct}%` }}/>}
            <div className="poll-option-content">
              <span className="poll-option-text">{opt}</span>
              {voted && <span className="poll-option-pct">{pct}%</span>}
            </div>
          </button>
        )
      })}
      <span className="poll-total">{total} {total === 1 ? 'голос' : total < 5 ? 'голоса' : 'голосов'}</span>
    </div>
  )
}

type Tab = 'posts' | 'likes'

function UserProfilePage({ userId, onBack, onOpenPost, onOpenProfile, onFollowChange }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [myUserId, setMyUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('posts')
  const [viewerImages, setViewerImages] = useState<string[]>([])
  const [viewerIndex, setViewerIndex] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFollowedBack, setIsFollowedBack] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [followsModal, setFollowsModal] = useState<'followers' | 'following' | null>(null)
  const [profileReady, setProfileReady] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setMyUserId(data.user.id)
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    setProfileReady(false)
    setPosts([])
    setProfile(null)
    Promise.all([loadProfile(), loadFollowState(), loadFollowCounts(), loadPosts()]).then(() => setProfileReady(true))
  }, [userId])

  useEffect(() => {
    if (!myUserId) return
    supabase.from('likes').select('post_id').eq('user_id', myUserId).then(({ data }) => {
      if (data) setLikedIds(new Set(data.map((l: any) => l.post_id)))
    })
    loadFollowState().then(() => setProfileReady(true))
  }, [myUserId])

  const loadProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, username, created_at, avatar_url, banner_url, bio, last_seen, verified, likes_visibility')
      .eq('id', userId)
      .maybeSingle()
    if (data) setProfile(data)
  }

  const loadPosts = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const myId = user?.id

    const { data } = await supabase
      .from('posts')
      .select('*, profiles!posts_user_id_fkey(display_name, username, avatar_url), likes(id)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    const { data: votes } = await supabase
      .from('poll_votes')
      .select('post_id, user_id, option_index')

    if (data) {
      setPosts(data.map((p: any) => {
        const options: string[] = p.poll?.options ?? []
        const vote_counts = Array(options.length).fill(0)
        let my_vote: number | undefined
        votes?.filter((v: any) => v.post_id === p.id).forEach((v: any) => {
          if (v.option_index < options.length) vote_counts[v.option_index]++
          if (v.user_id === myId) my_vote = v.option_index
        })
        return {
          id: p.id, user_id: p.user_id, text: p.text,
          image_url: p.image_url, created_at: p.created_at,
          like_count: p.likes?.length ?? 0, view_count: p.view_count ?? 0,
          mine: p.user_id === myId,
          display_name: p.profiles?.display_name ?? 'Пользователь',
          username: p.profiles?.username ?? '',
          avatar_url: p.profiles?.avatar_url,
          poll: p.poll ? { options, vote_counts, my_vote } : undefined,
        }
      }))
    }
    setLoading(false)
  }

  const loadFollowCounts = async () => {
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
    ])
    setFollowersCount(followers ?? 0)
    setFollowingCount(following ?? 0)
  }

  const loadFollowState = async () => {
    if (!myUserId || myUserId === userId) { setIsFollowing(false); setIsFollowedBack(false); return }
    const [{ data: fwd }, { data: back }] = await Promise.all([
      supabase.from('follows').select('id').eq('follower_id', myUserId).eq('following_id', userId).maybeSingle(),
      supabase.from('follows').select('id').eq('follower_id', userId).eq('following_id', myUserId).maybeSingle(),
    ])
    setIsFollowing(!!fwd)
    setIsFollowedBack(!!back)
  }

  const toggleFollow = async () => {
    if (!myUserId || myUserId === userId) return
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', myUserId).eq('following_id', userId)
      setIsFollowing(false)
      setFollowersCount(c => Math.max(0, c - 1))
    } else {
      const { error } = await supabase.from('follows').insert({ follower_id: myUserId, following_id: userId })
      if (!error) {
        setIsFollowing(true)
        setFollowersCount(c => c + 1)
      }
    }
    loadFollowCounts()
    onFollowChange?.()
  }

  const toggleLike = async (postId: string) => {
    if (!myUserId) return
    const liked = likedIds.has(postId)
    setLikedIds(prev => { const next = new Set(prev); liked ? next.delete(postId) : next.add(postId); return next })
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, like_count: p.like_count + (liked ? -1 : 1) } : p))
    if (liked) {
      await supabase.from('likes').delete().eq('user_id', myUserId).eq('post_id', postId)
    } else {
      const { error } = await supabase.from('likes').insert(
        { user_id: myUserId, post_id: postId },
        { onConflict: 'user_id,post_id', ignoreDuplicates: true }
      )
      if (error) console.error('like insert error:', error)
    }
  }

  const voteOnPoll = async (postId: string, optionIndex: number) => {
    if (!myUserId) return
    const { error } = await supabase.from('poll_votes').insert({ post_id: postId, user_id: myUserId, option_index: optionIndex })
    if (!error) {
      setPosts(prev => prev.map(p => {
        if (p.id !== postId || !p.poll) return p
        const vote_counts = [...p.poll.vote_counts]
        vote_counts[optionIndex]++
        return { ...p, poll: { ...p.poll, vote_counts, my_vote: optionIndex } }
      }))
    }
  }

  return (
    <>
      {viewerImages.length > 0 && <ImageViewer imageUrls={viewerImages} initialIndex={viewerIndex} onClose={() => setViewerImages([])}/>}
      {followsModal && (
        <FollowsModal userId={userId} type={followsModal} onClose={() => setFollowsModal(null)} onOpenProfile={onOpenProfile}/>
      )}
      <div className="profile-page">

      <div className="post-page-header">
        <button className="post-page-back" onClick={onBack}>
          <ChevronLeft size={22} strokeWidth={2}/>
        </button>
        <span className="post-page-title">Профиль</span>
      </div>

      {!profileReady ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner"/>
        </div>
      ) : (<>

      <div className="profile-card">
        <div
          className="profile-banner"
          style={profile?.banner_url ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        />
      </div>

      <div className="profile-avatar-row">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" style={{ width: 74, height: 74, borderRadius: '50%', objectFit: 'cover' }}/>
            ) : (
              <svg width="74" height="74" viewBox="0 0 74 74">
                <circle cx="37" cy="37" r="37" fill="url(#upg)"/>
                <defs>
                  <radialGradient id="upg" cx="35%" cy="30%">
                    <stop offset="0%" stopColor="#a78bfa"/>
                    <stop offset="100%" stopColor="#6d28d9"/>
                  </radialGradient>
                </defs>
              </svg>
            )}
          </div>
          <span className={`profile-online${profile?.last_seen && (Date.now() - new Date(profile.last_seen).getTime()) < 5 * 60 * 1000 ? '' : ' profile-online--offline'}`}/>
        </div>
        {myUserId && myUserId !== userId && (
          <button
            className={`profile-follow-btn${isFollowing ? ' profile-follow-btn--active' : ''}`}
            onClick={toggleFollow}
          >
            {isFollowing ? 'Отписаться' : 'Подписаться'}
          </button>
        )}
      </div>

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

      {(() => {
        const v = profile?.likes_visibility ?? 'everyone'
        const showLikes = v === 'everyone' || (v === 'followers' && isFollowing) || (v === 'mutual' && isFollowing && isFollowedBack)
        return (
          <div className="profile-tabs-wrap">
            <div className="profile-tabs">
              <div
                className="profile-tab-slider"
                style={{
                  width: showLikes ? '50%' : '100%',
                  transform: `translateX(${tab === 'likes' ? '100%' : '0%'})`
                }}
              />
              <button className={`profile-tab${tab === 'posts' ? ' profile-tab--active' : ''}`} onClick={() => setTab('posts')}>
                Посты
              </button>
              {showLikes && (
                <button className={`profile-tab${tab === 'likes' ? ' profile-tab--active' : ''}`} onClick={() => setTab('likes')}>
                  Лайки
                </button>
              )}
            </div>
          </div>
        )
      })()}

      </>)}

      {profileReady && tab === 'posts' && (
        loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <div className="spinner"/>
          </div>
        ) : posts.length === 0 ? (
          <div className="profile-empty"><p>Нет постов</p></div>
        ) : (
          posts.map(post => {
            const imageUrls = parseImageUrl(post.image_url)
            return (
            <div key={post.id} className="card post" style={{ cursor: 'pointer' }} onClick={() => onOpenPost(post)}>
              <div className="post-header" onClick={e => e.stopPropagation()}>
                <div className="post-avatar" style={{ cursor: 'pointer' }} onClick={() => onOpenProfile(post.user_id)}>
                  {post.avatar_url
                    ? <img src={post.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', display: 'block' }}/>
                    : <svg width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="18" fill="#2a2a30"/><text x="18" y="23" textAnchor="middle" fontSize="14" fill="rgba(255,255,255,0.7)">{post.display_name?.charAt(0).toUpperCase() || '?'}</text></svg>
                  }
                </div>
                <div className="post-meta">
                  <span className={`post-username${post.verified ? ' verified-name' : ''}`} style={{ cursor: 'pointer' }} onClick={() => onOpenProfile(post.user_id)}>{post.display_name || post.username}</span>
                  <span className="post-time">{timeAgo(post.created_at)}</span>
                </div>
                <PostMenu post={post} onDelete={id => setPosts(prev => prev.filter(p => p.id !== id))} onEdit={(id, text) => setPosts(prev => prev.map(p => p.id === id ? { ...p, text } : p))}/>
              </div>
              {post.text && <p className="post-text">{linkify(post.text, u => openMention(u, onOpenProfile))}</p>}
              {imageUrls.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: imageUrls.length === 1 ? '1fr' : 'repeat(2, 1fr)', gap: 6, marginBottom: 12, borderRadius: 12, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                  {imageUrls.map((url, i) => (
                    <img key={i} src={url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', cursor: 'pointer', display: 'block' }} onClick={() => { setViewerImages(imageUrls); setViewerIndex(i) }}/>
                  ))}
                </div>
              )}
              {post.poll && (
                <div onClick={e => e.stopPropagation()}>
                  <PollDisplay poll={post.poll} onVote={i => voteOnPoll(post.id, i)}/>
                </div>
              )}
              <div className="post-footer" onClick={e => e.stopPropagation()}>
                <div className="post-footer-left">
                  <button className="like-btn" onClick={() => toggleLike(post.id)}>
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
        )
      )}

      {profileReady && tab === 'likes' && (
        <div className="profile-empty"><p>Нет лайкнутых постов</p></div>
      )}

      </div>
    </>
  )
}

export default UserProfilePage
