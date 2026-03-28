import React, { useEffect, useState, useRef } from 'react'
import { motion, useInView } from 'motion/react'
import { Home as HomeIcon, LayoutGrid, Search, User, LogOut, MessageCircle, Eye, Bell } from 'lucide-react'
import { linkify } from './linkify'
import { openMention } from './mentionHelper'
import PostPage from './PostPage'
import PostMenu from './PostMenu'
import { supabase } from './lib/supabase'
import Categories from './Categories'
import CategoryPage from './CategoryPage'
import SearchPage from './SearchPage'
import ProfilePage from './ProfilePage'
import UserProfilePage from './UserProfilePage'
import ImageViewer from './ImageViewer'
import Composer from './Composer'
import AdminPanel from './AdminPanel'
import NotificationsPage from './NotificationsPage'

const ADMIN_ID = '20111c2e-e9c9-4e16-aba4-d7364aa98204'

interface Props {
  onLogout: () => void
  onOpenTerms: () => void
  onOpenPrivacy: () => void
}

export interface Poll {
  options: string[]
  vote_counts: number[]
  my_vote?: number
}

export interface Post {
  id: string
  user_id: string
  text: string
  image_url?: string
  created_at: string
  like_count: number
  view_count: number
  mine: boolean
  display_name: string
  username: string
  avatar_url?: string
  poll?: Poll
  category?: string
  verified?: boolean
}

interface Profile {
  display_name: string
  username: string
  created_at: string
  avatar_url?: string
  banner_url?: string
  bio?: string
  verified?: boolean
  likes_visibility?: string
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

function AvatarImg({ url, size }: { url?: string; size: number }) {
  if (url) return <img src={url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }}/>
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={size/2} fill="url(#defAvatar)"/>
      <defs><radialGradient id="defAvatar" cx="30%" cy="30%"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#6d28d9"/></radialGradient></defs>
    </svg>
  )
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


const CATEGORY_MAP: Record<string, { name: string; color: string; bg: string }> = {
  ask:     { name: 'Спросить Егора', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  memes:   { name: 'Мемы',           color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  gallery: { name: 'Галерея',        color: '#34d399', bg: 'rgba(52,211,153,0.12)'  },
  video:   { name: 'Видео',          color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}

function parseImageUrl(imageUrl?: string): string[] {
  if (!imageUrl) return []
  try {
    const parsed = JSON.parse(imageUrl)
    if (Array.isArray(parsed)) return parsed
  } catch (e) {}
  return [imageUrl]
}

const sessionViewedIds = new Set<string>()

function AnimatedPost({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.3, once: false })
  return (
    <motion.div
      ref={ref}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  )
}

function PostCard({ post, liked, onLike, myAvatarUrl, onVote, onOpenPost, onOpenProfile, onOpenImage, onDelete, onEdit, onView }: {
  post: Post; liked: boolean; onLike: () => void; myAvatarUrl?: string; onVote: (i: number) => void; onOpenPost: () => void; onOpenProfile: (userId: string) => void; onOpenImage: (urls: string[], index: number) => void; onDelete: (id: string) => void; onEdit?: (id: string, text: string, image_url?: string) => void; onView?: (id: string) => void
}) {
  const imageUrls = parseImageUrl(post.image_url)
  const cardRef = useRef<HTMLDivElement>(null)
  const [likeDir, setLikeDir] = useState<'up' | 'down' | null>(null)


  const handleLike = () => {
    setLikeDir(liked ? 'down' : 'up')
    onLike()
  }

  useEffect(() => {
    if (sessionViewedIds.has(post.id)) return
    const el = cardRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        observer.disconnect()
        sessionViewedIds.add(post.id)
        supabase.rpc('increment_view_count', { post_id: post.id })
        onView?.(post.id)
      }
    }, { threshold: 0.5 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [post.id])


  return (
    <div ref={cardRef} className="card post" style={{ cursor: 'pointer' }} onClick={onOpenPost}>
      <div className="post-header" onClick={e => e.stopPropagation()}>
        <div className="post-avatar" style={{ cursor: 'pointer' }} onClick={() => onOpenProfile(post.user_id)}>
          {post.mine
            ? <AvatarImg url={myAvatarUrl} size={36}/>
            : <AvatarImg url={post.avatar_url} size={36}/>
          }
        </div>
        <div className="post-meta">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span className={`post-username${post.verified ? ' verified-name' : ''}`} style={{ cursor: 'pointer' }} onClick={() => onOpenProfile(post.user_id)}>{post.display_name || post.username || 'Пользователь'}</span>
            {post.verified && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><rect x="2" y="2" width="20" height="20" rx="6" fill="#1DA1F2"/><path d="M8 12l3 3 5-6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </span>
          <span className="post-time">{timeAgo(post.created_at)}</span>
          {post.category && CATEGORY_MAP[post.category] && (
            <span style={{ fontSize: 11, color: CATEGORY_MAP[post.category].color, opacity: 0.8 }}>
              {CATEGORY_MAP[post.category].name}
            </span>
          )}
        </div>
        <PostMenu post={post} onDelete={onDelete} onEdit={onEdit}/>
      </div>
      {post.text && <p className="post-text">{linkify(post.text, u => openMention(u, onOpenProfile))}</p>}
      {imageUrls.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: imageUrls.length === 1 ? '1fr' : 'repeat(2, 1fr)', gap: 6, marginBottom: 12, borderRadius: 12, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
          {imageUrls.map((url, i) => (
            <img key={i} src={url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', cursor: 'pointer', display: 'block' }} onClick={() => onOpenImage(imageUrls, i)}/>
          ))}
        </div>
      )}
      {post.poll && <div onClick={e => e.stopPropagation()}><PollDisplay poll={post.poll} onVote={onVote}/></div>}
      <div className="post-footer" onClick={e => e.stopPropagation()}>
        <div className="post-footer-left">
          <button className="like-btn" onClick={handleLike}>
            <IcHeart filled={liked}/>
            <span style={{ display: 'inline-block', overflow: 'hidden', height: '1.2em', verticalAlign: 'middle', lineHeight: '1.2em' }}>
              <span key={post.like_count} className={likeDir === 'up' ? 'slot-up' : likeDir === 'down' ? 'slot-down' : ''} style={{ display: 'block' }}>
                {post.like_count}
              </span>
            </span>
          </button>
          <button className="comment-btn" onClick={onOpenPost}>
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
}

type NavItem = 'home' | 'categories' | 'search' | 'notifications' | 'profile'

interface NotifToastData {
  id: string
  type: 'like' | 'comment' | 'mention'
  actorName: string
  actorAvatar?: string
  text?: string
  exiting?: boolean
}

function Home({ onLogout, onOpenTerms, onOpenPrivacy }: Props) {
  const [active, setActive] = useState<NavItem>('home')
  const [homeTab, setHomeTab] = useState<'forYou' | 'subs'>('forYou')
  const [posts, setPosts] = useState<Post[]>([])
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string>('')
  const [fetchingPosts, setFetchingPosts] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)
  const [viewingCategory, setViewingCategory] = useState<string | null>(null)
  const [viewerImages, setViewerImages] = useState<string[]>([])
  const [viewerIndex, setViewerIndex] = useState(0)
  const [pendingPostId, setPendingPostId] = useState<string | null>(null)
  const [pendingProfileId, setPendingProfileId] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifToasts, setNotifToasts] = useState<NotifToastData[]>([])
  const feedWrapperRef = useRef<HTMLDivElement | null>(null)

  const showNotifToast = (toast: NotifToastData) => {
    setNotifToasts(prev => [...prev, toast])
    setTimeout(() => {
      setNotifToasts(prev => prev.map(t => t.id === toast.id ? { ...t, exiting: true } : t))
      setTimeout(() => setNotifToasts(prev => prev.filter(t => t.id !== toast.id)), 350)
    }, 4000)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) { setUserId(data.user.id); loadProfile(data.user.id) }
    })
    loadPosts()
    loadUnreadCount()
    const hash = window.location.hash.slice(1)
    if (hash.startsWith('/post/')) setPendingPostId(hash.slice(6))
    else if (hash.startsWith('/profile/')) setPendingProfileId(hash.slice(9))
  }, [])

  useEffect(() => {
    if (!pendingPostId || posts.length === 0) return
    const post = posts.find(p => p.id === pendingPostId)
    if (post) { setSelectedPost(post); setPendingPostId(null) }
  }, [pendingPostId, posts])


  useEffect(() => {
    if (!pendingProfileId || !userId) return
    if (pendingProfileId !== userId) setViewingUserId(pendingProfileId)
    setPendingProfileId(null)
  }, [pendingProfileId, userId])

  useEffect(() => {
    if (!userId) return

    let prevCount = -1
    const audio = new Audio('/Sounds/Notification.mp3')
    audio.volume = 0.6
    audio.preload = 'auto'

    const unlock = () => {
      audio.play().then(() => { audio.pause(); audio.currentTime = 0; console.log('[notif] audio unlocked') }).catch(e => console.warn('[notif] unlock failed', e))
    }
    document.addEventListener('pointerdown', unlock, { once: true })

    const playSound = () => {
      if (localStorage.getItem('notif_sound') === 'false') return
      audio.currentTime = 0
      audio.play().then(() => console.log('[notif] sound played')).catch(e => console.warn('[notif] play failed', e))
    }

    const checkNotifs = async () => {
      const { data, count } = await supabase
        .from('user_notifications')
        .select('id, type, actor_id, post_id, profiles!actor_id(display_name, avatar_url)', { count: 'exact' })
        .eq('user_id', userId)
        .eq('read', false)
        .order('created_at', { ascending: false })
      const newCount = count ?? 0
      if (prevCount !== -1 && newCount > prevCount && data) {
        playSound()
        const diff = data.slice(0, newCount - prevCount)
        diff.forEach(n => {
          const actor = (n.profiles as any)
          const typeMap: Record<string, 'like' | 'comment' | 'mention'> = { like: 'like', comment: 'comment', mention: 'mention' }
          showNotifToast({
            id: n.id,
            type: typeMap[n.type] ?? 'like',
            actorName: actor?.display_name ?? 'Кто-то',
            actorAvatar: actor?.avatar_url,
          })
        })
      }
      prevCount = newCount
      setUnreadCount(newCount)
    }

    checkNotifs()
    const interval = setInterval(checkNotifs, 8000)

    const channel = supabase
      .channel('user-notifications-' + userId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${userId}` }, () => {
        console.log('[notif] realtime event received')
        checkNotifs()
      })
      .subscribe()

    return () => {
      clearInterval(interval)
      document.removeEventListener('pointerdown', unlock)
      supabase.removeChannel(channel)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    loadLikedIds()
    loadFollowingIds()
    loadFollowCounts()
    const updateLastSeen = () => {
      supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', userId)
    }
    updateLastSeen()
    const interval = setInterval(updateLastSeen, 60000)
    return () => clearInterval(interval)
  }, [userId])

  const loadProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, username, created_at, avatar_url, banner_url, bio, verified, likes_visibility, mentions_visibility, notif_enabled, notif_likes, notif_comments, notif_mentions')
      .eq('id', uid)
      .maybeSingle()
    if (!error && data) setProfile(data)
  }

  const loadPosts = async () => {
    setFetchingPosts(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const myId = user?.id

      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles!posts_user_id_fkey(display_name, username, avatar_url, verified), likes(id)')
        .order('created_at', { ascending: false })

      console.log('posts:', data, 'error:', error)

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
            avatar_url: p.profiles?.avatar_url ?? undefined,
            poll: p.poll ? { options, vote_counts, my_vote } : undefined,
            category: p.category ?? undefined,
            verified: p.profiles?.verified ?? false,
          }
        }))
      }
    } catch (e) {
      console.error('loadPosts error:', e)
    } finally {
      setFetchingPosts(false)
    }
  }

  const loadLikedIds = async () => {
    const { data } = await supabase.from('likes').select('post_id').eq('user_id', userId)
    if (data) setLikedIds(new Set(data.map((l: any) => l.post_id)))
  }

  const loadFollowingIds = async () => {
    const { data } = await supabase.from('follows').select('following_id').eq('follower_id', userId)
    if (data) setFollowingIds(new Set(data.map((f: any) => f.following_id)))
  }

  const loadFollowCounts = async () => {
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
    ])
    setFollowersCount(followers ?? 0)
    setFollowingCount(following ?? 0)
  }

  const addPost = async (text: string, imageUrl?: string | string[], pollOptions?: string[], category?: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const poll = pollOptions ? { options: pollOptions } : null
    const imageUrlStr = Array.isArray(imageUrl) ? JSON.stringify(imageUrl) : (imageUrl || null)
    const { data, error } = await supabase
      .from('posts')
      .insert({ user_id: user.id, text, image_url: imageUrlStr, poll, category: category ?? null })
      .select('*, profiles!posts_user_id_fkey(display_name, username), likes(id)')
      .single()
    if (!error && data) {
      const newPost: Post = {
        id: data.id, user_id: data.user_id, text: data.text,
        image_url: data.image_url, created_at: data.created_at,
        like_count: 0, view_count: 0, mine: true,
        display_name: data.profiles?.display_name ?? 'Пользователь',
        username: data.profiles?.username ?? '',
        poll: data.poll ? { options: data.poll.options, vote_counts: Array(data.poll.options.length).fill(0) } : undefined,
      }
      setPosts(prev => [newPost, ...prev])

      // Send mention notifications
      const mentions = [...new Set((text.match(/@([a-zA-Z0-9_]+)/g) ?? []).map(m => m.slice(1)))]
      if (mentions.length > 0) {
        const { data: mentioned } = await supabase
          .from('profiles')
          .select('id, notif_enabled, notif_mentions')
          .in('username', mentions)
        if (mentioned) {
          const notifInserts = mentioned
            .filter((p: any) => p.id !== user.id && p.notif_enabled !== false && p.notif_mentions !== false)
            .map((p: any) => ({ user_id: p.id, actor_id: user.id, type: 'mention', post_id: data.id }))
          if (notifInserts.length > 0) {
            await supabase.from('user_notifications').insert(notifInserts)
          }
        }
      }
    }
  }

  const toggleLike = async (postId: string) => {
    if (!userId) return
    const liked = likedIds.has(postId)
    setLikedIds(prev => { const next = new Set(prev); liked ? next.delete(postId) : next.add(postId); return next })
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, like_count: p.like_count + (liked ? -1 : 1) } : p))
    if (liked) {
      await supabase.from('likes').delete().eq('user_id', userId).eq('post_id', postId)
    } else {
      const { error } = await supabase.from('likes').insert(
        { user_id: userId, post_id: postId },
        { onConflict: 'user_id,post_id', ignoreDuplicates: true }
      )
      if (error) console.error('like insert error:', error)
    }
  }

  const voteOnPoll = async (postId: string, optionIndex: number) => {
    if (!userId) return
    const { error } = await supabase.from('poll_votes').insert({ post_id: postId, user_id: userId, option_index: optionIndex })
    if (!error) {
      setPosts(prev => prev.map(p => {
        if (p.id !== postId || !p.poll) return p
        const vote_counts = [...p.poll.vote_counts]
        vote_counts[optionIndex]++
        return { ...p, poll: { ...p.poll, vote_counts, my_vote: optionIndex } }
      }))
    }
  }

  const loadUnreadCount = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { count } = await supabase
      .from('user_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)
    setUnreadCount(count ?? 0)
  }

  const handleOpenProfile = (uid: string) => {
    if (uid === userId) { setActive('profile'); setViewingUserId(null); setSelectedPost(null) }
    else { setViewingUserId(uid); setSelectedPost(null) }
  }

  const navItems: { id: NavItem; label: string; icon: JSX.Element; badge?: number }[] = [
    { id: 'home',          label: 'Главная',      icon: <HomeIcon size={20}/> },
    { id: 'categories',    label: 'Категории',    icon: <LayoutGrid size={20}/> },
    { id: 'search',        label: 'Поиск',        icon: <Search size={20}/> },
    { id: 'notifications', label: 'Уведомления',  icon: <Bell size={20}/>, badge: unreadCount },
    { id: 'profile',       label: 'Профиль',      icon: <User size={20}/> },
  ]

  const myPosts = posts.filter(p => p.mine)
  const subscriptionPosts = posts.filter(p => followingIds.has(p.user_id))

  const notifActionText = (type: NotifToastData['type']) => {
    if (type === 'like') return 'оценил(а) ваш пост'
    if (type === 'comment') return 'прокомментировал(а) ваш пост'
    return 'упомянул(а) вас'
  }

  return (
    <div className="home-layout">
      {viewerImages.length > 0 && <ImageViewer imageUrls={viewerImages} initialIndex={viewerIndex} onClose={() => setViewerImages([])}/>}

      {notifToasts.length > 0 && (
        <div className="notif-toasts">
          {notifToasts.map(toast => (
            <div key={toast.id} className={`notif-toast${toast.exiting ? ' notif-toast--exit' : ''}`}>
              <div className="notif-toast-avatar">
                {toast.actorAvatar
                  ? <img src={toast.actorAvatar} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', display: 'block' }}/>
                  : <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#3a3a44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#fff' }}>{toast.actorName.charAt(0).toUpperCase()}</div>
                }
                <span className="notif-toast-type-icon" style={{ background: toast.type === 'like' ? '#ef4444' : toast.type === 'comment' ? '#3b82f6' : '#a78bfa' }}>
                  {toast.type === 'like' ? '♥' : toast.type === 'comment' ? '💬' : '@'}
                </span>
              </div>
              <div className="notif-toast-body">
                <span className="notif-toast-name">{toast.actorName}</span>
                <span className="notif-toast-action">{notifActionText(toast.type)}</span>
              </div>
              <button className="notif-toast-close" onClick={() => setNotifToasts(prev => prev.filter(t => t.id !== toast.id))}>×</button>
            </div>
          ))}
        </div>
      )}

      <div className="home-inner">
        <aside className="sidebar">
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <button
                key={item.id}
                className={`nav-item${active === item.id ? ' nav-item--active' : ''}`}
                onClick={() => { setActive(item.id); setSelectedPost(null); setViewingUserId(null); setViewingCategory(null); if (item.id === 'notifications') { setUnreadCount(0); localStorage.setItem('notif_last_read', new Date().toISOString()) } }}
                style={{ position: 'relative' }}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge ? (
                  <span style={{ position: 'absolute', top: 6, left: 26, minWidth: 17, height: 17, borderRadius: 10, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
          <button className="nav-item nav-item--logout" onClick={onLogout}>
            <LogOut size={20}/>
            <span>Выйти</span>
          </button>
        </aside>

        <div className="feed-area">
        {!selectedPost && !viewingUserId && !viewingCategory && active === 'home' && (
          <div className="home-tabs-float">
            <div className="profile-tabs-wrap home-tabs-wrap">
              <div className="profile-tabs">
                <div className="profile-tab-slider" style={{ transform: `translateX(${homeTab === 'subs' ? '100%' : '0%'})` }}/>
                <button className={`profile-tab${homeTab === 'forYou' ? ' profile-tab--active' : ''}`} onClick={() => setHomeTab('forYou')}>Для вас</button>
                <button className={`profile-tab${homeTab === 'subs' ? ' profile-tab--active' : ''}`} onClick={() => setHomeTab('subs')}>Подписки</button>
              </div>
            </div>
          </div>
        )}
        <div className="feed-wrapper" ref={feedWrapperRef} style={!selectedPost && !viewingUserId && !viewingCategory && active === 'home' ? { paddingTop: 72 } : undefined}>
          <main className="feed">
            {selectedPost ? (
              <PostPage
                post={posts.find(p => p.id === selectedPost.id) ?? selectedPost}
                liked={likedIds.has(selectedPost.id)}
                myAvatarUrl={profile?.avatar_url}
                onBack={() => setSelectedPost(null)}
                onLike={() => toggleLike(selectedPost.id)}
                onVote={i => voteOnPoll(selectedPost.id, i)}
                onOpenProfile={handleOpenProfile}
                onDelete={id => { setPosts(prev => prev.filter(p => p.id !== id)); setSelectedPost(null) }}
                onEdit={(id, text, image_url) => setPosts(prev => prev.map(p => p.id === id ? { ...p, text, image_url } : p))}
                onView={id => setPosts(prev => prev.map(p => p.id === id ? { ...p, view_count: p.view_count + 1 } : p))}
              />
            ) : viewingUserId ? (
              <UserProfilePage
                userId={viewingUserId}
                onBack={() => setViewingUserId(null)}
                onOpenPost={post => setSelectedPost(post)}
                onOpenProfile={handleOpenProfile}
                onFollowChange={loadFollowingIds}
              />
            ) : viewingCategory ? (
              <CategoryPage
                categoryId={viewingCategory}
                onBack={() => setViewingCategory(null)}
                onOpenPost={post => setSelectedPost(post)}
                onOpenProfile={handleOpenProfile}
              />
            ) : active === 'notifications' ? (
              <NotificationsPage
                onOpenProfile={handleOpenProfile}
                onOpenPost={postId => { const p = posts.find(x => x.id === postId); if (p) setSelectedPost(p) }}
              />
            ) : active === 'admin' ? (
              <AdminPanel/>
            ) : active === 'categories' ? (
              <Categories onSelect={id => setViewingCategory(id)}/>
            ) : active === 'search' ? (
              <SearchPage onOpenPost={post => setSelectedPost(post)} onOpenProfile={handleOpenProfile}/>
            ) : active === 'profile' ? (
              <ProfilePage
                posts={myPosts}
                likedIds={likedIds}
                onAddPost={addPost}
                onLike={toggleLike}
                onVote={voteOnPoll}
                onOpenPost={post => setSelectedPost(post)}
                onDeletePost={id => setPosts(prev => prev.filter(p => p.id !== id))}
                onEditPost={(id, text, image_url) => setPosts(prev => prev.map(p => p.id === id ? { ...p, text, image_url } : p))}
                profile={profile}
                followersCount={followersCount}
                followingCount={followingCount}
                onProfileUpdate={() => { if (userId) { loadProfile(userId); loadFollowCounts() } }}
                myUserId={userId}
                onOpenProfile={handleOpenProfile}
                onOpenAdmin={userId === ADMIN_ID ? () => setActive('admin') : undefined}
              />
            ) : (
              <>
                {homeTab === 'forYou' ? (
                  <>
                    <Composer onPublish={addPost} avatarUrl={profile?.avatar_url}/>
                    {fetchingPosts ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                        <div className="spinner"/>
                      </div>
                    ) : posts.map(post => (
                      <AnimatedPost key={post.id}>
                        <PostCard
                          post={post}
                          myAvatarUrl={profile?.avatar_url}
                          liked={likedIds.has(post.id)}
                          onLike={() => toggleLike(post.id)}
                          onVote={i => voteOnPoll(post.id, i)}
                          onOpenPost={() => setSelectedPost(post)}
                          onOpenProfile={handleOpenProfile}
                          onOpenImage={(urls, index) => { setViewerImages(urls); setViewerIndex(index) }}
                          onDelete={id => setPosts(prev => prev.filter(p => p.id !== id))}
                          onEdit={(id, text, image_url) => setPosts(prev => prev.map(p => p.id === id ? { ...p, text, image_url } : p))}
                          onView={id => setPosts(prev => prev.map(p => p.id === id ? { ...p, view_count: p.view_count + 1 } : p))}
                        />
                      </AnimatedPost>
                    ))}
                  </>
                ) : (
                  subscriptionPosts.length === 0 ? (
                    <div className="profile-empty"><p>Нет постов из подписок</p></div>
                  ) : (
                    subscriptionPosts.map(post => (
                      <AnimatedPost key={post.id}>
                        <PostCard
                          post={post}
                          myAvatarUrl={profile?.avatar_url}
                          liked={likedIds.has(post.id)}
                          onLike={() => toggleLike(post.id)}
                          onVote={i => voteOnPoll(post.id, i)}
                          onOpenPost={() => setSelectedPost(post)}
                          onOpenProfile={handleOpenProfile}
                          onOpenImage={(urls, index) => { setViewerImages(urls); setViewerIndex(index) }}
                          onDelete={id => setPosts(prev => prev.filter(p => p.id !== id))}
                          onEdit={(id, text, image_url) => setPosts(prev => prev.map(p => p.id === id ? { ...p, text, image_url } : p))}
                          onView={id => setPosts(prev => prev.map(p => p.id === id ? { ...p, view_count: p.view_count + 1 } : p))}
                        />
                      </AnimatedPost>
                    ))
                  )
                )}
              </>
            )}
          </main>
        </div>
        </div>

        <aside className="right-sidebar">
          <div className="right-sidebar-links">
            <button className="right-sidebar-link" onClick={onOpenPrivacy}>Конфиденциальность</button>
            <button className="right-sidebar-link" onClick={onOpenTerms}>Условия использования</button>
          </div>
        </aside>
      </div>

      {/* Bottom nav — mobile only */}
      <nav className="bottom-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`bottom-nav-item${active === item.id ? ' bottom-nav-item--active' : ''}`}
            onClick={() => { setActive(item.id); setSelectedPost(null); setViewingUserId(null); setViewingCategory(null); if (item.id === 'notifications') { setUnreadCount(0); localStorage.setItem('notif_last_read', new Date().toISOString()) } }}
            style={{ position: 'relative' }}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge ? (
              <span style={{ position: 'absolute', top: 4, left: '50%', transform: 'translateX(4px)', minWidth: 16, height: 16, borderRadius: 8, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            ) : null}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default Home
