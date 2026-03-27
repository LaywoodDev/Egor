import { useEffect, useState, useRef } from 'react'
import { Home as HomeIcon, LayoutGrid, Search, User, LogOut, MessageCircle, Eye, ShieldCheck } from 'lucide-react'
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

const ADMIN_ID = '20111c2e-e9c9-4e16-aba4-d7364aa98204'

interface Props {
  onLogout: () => void
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

function PostCard({ post, liked, onLike, myAvatarUrl, onVote, onOpenPost, onOpenProfile, onOpenImage, onDelete, onEdit }: {
  post: Post; liked: boolean; onLike: () => void; myAvatarUrl?: string; onVote: (i: number) => void; onOpenPost: () => void; onOpenProfile: (userId: string) => void; onOpenImage: (urls: string[], index: number) => void; onDelete: (id: string) => void; onEdit?: (id: string, text: string) => void
}) {
  const imageUrls = parseImageUrl(post.image_url)

  return (
    <div className="card post" style={{ cursor: 'pointer' }} onClick={onOpenPost}>
      <div className="post-header" onClick={e => e.stopPropagation()}>
        <div className="post-avatar" style={{ cursor: 'pointer' }} onClick={() => onOpenProfile(post.user_id)}>
          {post.mine
            ? <AvatarImg url={myAvatarUrl} size={36}/>
            : <AvatarImg url={post.avatar_url} size={36}/>
          }
        </div>
        <div className="post-meta">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span className="post-username" style={{ cursor: 'pointer' }} onClick={() => onOpenProfile(post.user_id)}>{post.display_name || post.username || 'Пользователь'}</span>
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
      {post.text && <p className="post-text">{post.text}</p>}
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
          <button className="like-btn" onClick={onLike}>
            <IcHeart filled={liked}/>
            <span>{post.like_count}</span>
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

type NavItem = 'home' | 'categories' | 'search' | 'profile' | 'admin'

function Home({ onLogout }: Props) {
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
  const feedWrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) { setUserId(data.user.id); loadProfile(data.user.id) }
    })
    loadPosts()
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
      .select('display_name, username, created_at, avatar_url, banner_url, bio, verified')
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
        like_count: 0, mine: true,
        display_name: data.profiles?.display_name ?? 'Пользователь',
        username: data.profiles?.username ?? '',
        poll: data.poll ? { options: data.poll.options, vote_counts: Array(data.poll.options.length).fill(0) } : undefined,
      }
      setPosts(prev => [newPost, ...prev])
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

  const handleOpenProfile = (uid: string) => {
    if (uid === userId) { setActive('profile'); setViewingUserId(null); setSelectedPost(null) }
    else { setViewingUserId(uid); setSelectedPost(null) }
  }

  const navItems: { id: NavItem; label: string; icon: JSX.Element }[] = [
    { id: 'home',       label: 'Главная',   icon: <HomeIcon size={20}/> },
    { id: 'categories', label: 'Категории', icon: <LayoutGrid size={20}/> },
    { id: 'search',     label: 'Поиск',     icon: <Search size={20}/> },
    { id: 'profile',    label: 'Профиль',   icon: <User size={20}/> },
    ...(userId === ADMIN_ID ? [{ id: 'admin' as NavItem, label: 'Панель', icon: <ShieldCheck size={20}/> }] : []),
  ]

  const myPosts = posts.filter(p => p.mine)
  const subscriptionPosts = posts.filter(p => followingIds.has(p.user_id))

  return (
    <div className="home-layout">
      {viewerImages.length > 0 && <ImageViewer imageUrls={viewerImages} initialIndex={viewerIndex} onClose={() => setViewerImages([])}/>}
      <div className="home-inner">
        <aside className="sidebar">
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <button
                key={item.id}
                className={`nav-item${active === item.id ? ' nav-item--active' : ''}`}
                onClick={() => { setActive(item.id); setSelectedPost(null); setViewingUserId(null); setViewingCategory(null) }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <button className="nav-item nav-item--logout" onClick={onLogout}>
            <LogOut size={20}/>
            <span>Выйти</span>
          </button>
        </aside>

        <div className="feed-wrapper" ref={feedWrapperRef}>
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
                onEdit={(id, text) => setPosts(prev => prev.map(p => p.id === id ? { ...p, text } : p))}
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
                onEditPost={(id, text) => setPosts(prev => prev.map(p => p.id === id ? { ...p, text } : p))}
                profile={profile}
                followersCount={followersCount}
                followingCount={followingCount}
                onProfileUpdate={() => { if (userId) { loadProfile(userId); loadFollowCounts() } }}
              />
            ) : (
              <>
                <div className="profile-tabs-wrap home-tabs-wrap">
                  <div className="profile-tabs">
                    <div
                      className="profile-tab-slider"
                      style={{ transform: `translateX(${homeTab === 'subs' ? '100%' : '0%'})` }}
                    />
                    <button className={`profile-tab${homeTab === 'forYou' ? ' profile-tab--active' : ''}`} onClick={() => setHomeTab('forYou')}>
                      Для вас
                    </button>
                    <button className={`profile-tab${homeTab === 'subs' ? ' profile-tab--active' : ''}`} onClick={() => setHomeTab('subs')}>
                      Подписки
                    </button>
                  </div>
                </div>

                {homeTab === 'forYou' ? (
                  <>
                    <Composer onPublish={addPost} avatarUrl={profile?.avatar_url}/>
                    {fetchingPosts ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                        <div className="spinner"/>
                      </div>
                    ) : posts.map(post => (
                      <PostCard
                        key={post.id}
                        post={post}
                        myAvatarUrl={profile?.avatar_url}
                        liked={likedIds.has(post.id)}
                        onLike={() => toggleLike(post.id)}
                        onVote={i => voteOnPoll(post.id, i)}
                        onOpenPost={() => setSelectedPost(post)}
                        onOpenProfile={handleOpenProfile}
                        onOpenImage={(urls, index) => { setViewerImages(urls); setViewerIndex(index) }}
                        onDelete={id => setPosts(prev => prev.filter(p => p.id !== id))}
                        onEdit={(id, text) => setPosts(prev => prev.map(p => p.id === id ? { ...p, text } : p))}
                      />
                    ))}
                  </>
                ) : (
                  subscriptionPosts.length === 0 ? (
                    <div className="profile-empty"><p>Нет постов из подписок</p></div>
                  ) : (
                    subscriptionPosts.map(post => (
                      <PostCard
                        key={post.id}
                        post={post}
                        myAvatarUrl={profile?.avatar_url}
                        liked={likedIds.has(post.id)}
                        onLike={() => toggleLike(post.id)}
                        onVote={i => voteOnPoll(post.id, i)}
                        onOpenPost={() => setSelectedPost(post)}
                        onOpenProfile={handleOpenProfile}
                        onOpenImage={(urls, index) => { setViewerImages(urls); setViewerIndex(index) }}
                        onDelete={id => setPosts(prev => prev.filter(p => p.id !== id))}
                        onEdit={(id, text) => setPosts(prev => prev.map(p => p.id === id ? { ...p, text } : p))}
                      />
                    ))
                  )
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Bottom nav — mobile only */}
      <nav className="bottom-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`bottom-nav-item${active === item.id ? ' bottom-nav-item--active' : ''}`}
            onClick={() => { setActive(item.id); setSelectedPost(null); setViewingUserId(null); setViewingCategory(null) }}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export default Home
