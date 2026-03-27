import { useEffect, useState } from 'react'
import { ChevronLeft, Eye, MessageCircle } from 'lucide-react'
import { supabase } from './lib/supabase'
import type { Post, Poll } from './Home'
import { CATEGORIES } from './Categories'
import ImageViewer from './ImageViewer'
import PostMenu from './PostMenu'

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

function PollDisplay({ poll }: { poll: Poll }) {
  const total = poll.vote_counts.reduce((a, b) => a + b, 0)
  const voted = poll.my_vote !== undefined
  return (
    <div className="post-poll">
      {poll.options.map((opt, i) => {
        const pct = total > 0 ? Math.round((poll.vote_counts[i] / total) * 100) : 0
        return (
          <button key={i} className={`poll-option${voted ? ' poll-option--voted' : ''}${poll.my_vote === i ? ' poll-option--my-vote' : ''}`} disabled>
            {voted && <div className="poll-bar" style={{ width: `${pct}%` }}/>}
            <div className="poll-option-content">
              <span className="poll-option-text">{opt}</span>
              {voted && <span className="poll-option-pct">{pct}%</span>}
            </div>
          </button>
        )
      })}
      <span className="poll-total">{total} голосов</span>
    </div>
  )
}

interface Props {
  categoryId: string
  onBack: () => void
  onOpenPost: (post: Post) => void
  onOpenProfile: (userId: string) => void
}

type SortFilter = 'new' | 'popular'

function CategoryPage({ categoryId, onBack, onOpenPost, onOpenProfile }: Props) {
  const [posts, setPosts] = useState<Post[]>([])
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [myUserId, setMyUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [viewerImages, setViewerImages] = useState<string[]>([])
  const [viewerIndex, setViewerIndex] = useState(0)
  const [filter, setFilter] = useState<SortFilter>('new')

  const cat = CATEGORIES.find(c => c.id === categoryId)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setMyUserId(data.user.id)
        supabase.from('likes').select('post_id').eq('user_id', data.user.id).then(({ data: likes }) => {
          if (likes) setLikedIds(new Set(likes.map((l: any) => l.post_id)))
        })
      }
    })

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from('posts')
        .select('*, profiles!posts_user_id_fkey(display_name, username, avatar_url), likes(id)')
        .eq('category', categoryId)
        .order('created_at', { ascending: false })

      if (data) {
        const mapped = data.map((p: any) => ({
          id: p.id, user_id: p.user_id, text: p.text,
          image_url: p.image_url, created_at: p.created_at,
          like_count: p.likes?.length ?? 0, view_count: p.view_count ?? 0,
          mine: p.user_id === user?.id,
          display_name: p.profiles?.display_name ?? 'Пользователь',
          username: p.profiles?.username ?? '',
          avatar_url: p.profiles?.avatar_url,
          category: p.category,
        }))
        setPosts(filter === 'popular' ? mapped.sort((a: Post, b: Post) => b.like_count - a.like_count) : mapped)
      }
      setLoading(false)
    }
    load()
  }, [categoryId, filter])

  const toggleLike = async (postId: string) => {
    if (!myUserId) return
    const liked = likedIds.has(postId)
    setLikedIds(prev => { const next = new Set(prev); liked ? next.delete(postId) : next.add(postId); return next })
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, like_count: p.like_count + (liked ? -1 : 1) } : p))
    if (liked) await supabase.from('likes').delete().eq('user_id', myUserId).eq('post_id', postId)
    else {
      const { error } = await supabase.from('likes').insert(
        { user_id: myUserId, post_id: postId },
        { onConflict: 'user_id,post_id', ignoreDuplicates: true }
      )
      if (error) console.error('like insert error:', error)
    }
  }

  return (
    <>
      {viewerImages.length > 0 && <ImageViewer imageUrls={viewerImages} initialIndex={viewerIndex} onClose={() => setViewerImages([])}/>}
      <div className="post-page">
        <div className="post-page-header">
          <button className="post-page-back" onClick={onBack}>
            <ChevronLeft size={22} strokeWidth={2}/>
          </button>
          <span className="post-page-title">{cat?.name}</span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {(['new', 'popular'] as SortFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '7px 16px', borderRadius: 18, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
                background: filter === f ? '#ffffff' : 'rgba(255,255,255,0.07)',
                color: filter === f ? '#151518' : 'rgba(255,255,255,0.5)',
              }}
            >
              {f === 'new' ? 'Новые' : 'Популярные'}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <div className="spinner"/>
          </div>
        ) : posts.length === 0 ? (
          <div className="profile-empty"><p>Нет постов в этой категории</p></div>
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
                    <span className="post-username" style={{ cursor: 'pointer' }} onClick={() => onOpenProfile(post.user_id)}>{post.display_name || post.username}</span>
                    <span className="post-time">{timeAgo(post.created_at)}</span>
                  </div>
                  <PostMenu post={post} onDelete={id => setPosts(prev => prev.filter(p => p.id !== id))} onEdit={(id, text) => setPosts(prev => prev.map(p => p.id === id ? { ...p, text } : p))}/>
                </div>
                {post.text && <p className="post-text">{post.text}</p>}
                {imageUrls.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: imageUrls.length === 1 ? '1fr' : 'repeat(2, 1fr)', gap: 6, marginBottom: 12, borderRadius: 12, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                    {imageUrls.map((url, i) => (
                      <img key={i} src={url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', cursor: 'pointer', display: 'block' }} onClick={() => { setViewerImages(imageUrls); setViewerIndex(i) }}/>
                    ))}
                  </div>
                )}
                {post.poll && <div onClick={e => e.stopPropagation()}><PollDisplay poll={post.poll}/></div>}
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
        )}
      </div>
    </>
  )
}

export default CategoryPage
