import { useEffect, useState } from 'react'
import { ChevronLeft, Eye } from 'lucide-react'
import ImageViewer from './ImageViewer'
import type { Post, Poll } from './Home'
import CommentsSection from './CommentsSection'
import { supabase } from './lib/supabase'
import PostMenu from './PostMenu'

interface Props {
  post: Post
  liked: boolean
  myAvatarUrl?: string
  onBack: () => void
  onLike: () => void
  onVote: (i: number) => void
  onOpenProfile: (userId: string) => void
  onDelete?: (id: string) => void
  onEdit?: (id: string, text: string) => void
  onView?: (id: string) => void
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

function PollDisplay({ poll, onVote }: { poll: Poll; onVote: (i: number) => void }) {
  const total = poll.vote_counts.reduce((a, b) => a + b, 0)
  const voted = poll.my_vote !== undefined
  return (
    <div className="post-poll">
      {poll.options.map((opt, i) => {
        const pct = total > 0 ? Math.round((poll.vote_counts[i] / total) * 100) : 0
        return (
          <button
            key={i}
            className={`poll-option${voted ? ' poll-option--voted' : ''}${poll.my_vote === i ? ' poll-option--my-vote' : ''}`}
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

function parseImageUrl(imageUrl?: string): string[] {
  if (!imageUrl) return []
  try {
    const parsed = JSON.parse(imageUrl)
    if (Array.isArray(parsed)) return parsed
  } catch (e) {}
  return [imageUrl]
}


function PostPage({ post, liked, myAvatarUrl, onBack, onLike, onVote, onOpenProfile, onDelete, onEdit, onView }: Props) {
  const [viewerImages, setViewerImages] = useState<string[]>([])
  const [viewerIndex, setViewerIndex] = useState(0)

  useEffect(() => {
    supabase.rpc('increment_view_count', { post_id: post.id })
    onView?.(post.id)
  }, [post.id])

  const imageUrls = parseImageUrl(post.image_url)

  return (
    <>
      {viewerImages.length > 0 && <ImageViewer imageUrls={viewerImages} initialIndex={viewerIndex} onClose={() => setViewerImages([])}/>}
      <div className="post-page">
      <div className="post-page-header">
        <button className="post-page-back" onClick={onBack}>
          <ChevronLeft size={22} strokeWidth={2}/>
        </button>
        <span className="post-page-title">Пост</span>
      </div>

      <div className="card post post-page-card">
        <div className="post-header">
          <div className="post-avatar" style={{ cursor: 'pointer' }} onClick={() => onOpenProfile(post.user_id)}>
            {post.mine && myAvatarUrl
              ? <img src={myAvatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}/>
              : post.avatar_url
                ? <img src={post.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}/>
                : <svg width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="18" fill="#2a2a30"/><text x="18" y="23" textAnchor="middle" fontSize="14" fill="rgba(255,255,255,0.7)">{post.display_name?.charAt(0).toUpperCase() || '?'}</text></svg>
            }
          </div>
          <div className="post-meta">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span className="post-username" style={{ cursor: 'pointer' }} onClick={() => onOpenProfile(post.user_id)}>{post.display_name || post.username}</span>
              {post.verified && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><rect x="2" y="2" width="20" height="20" rx="6" fill="#1DA1F2"/><path d="M8 12l3 3 5-6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </span>
            <span className="post-time">{timeAgo(post.created_at)}</span>
            {post.category && (
              <span style={{ fontSize: 11, opacity: 0.8, color: ({ ask: '#a78bfa', memes: '#f59e0b', gallery: '#34d399', video: '#f87171' } as Record<string,string>)[post.category] ?? 'rgba(255,255,255,0.4)' }}>
                {({ ask: 'Спросить Егора', memes: 'Мемы', gallery: 'Галерея', video: 'Видео' } as Record<string,string>)[post.category]}
              </span>
            )}
          </div>
          <PostMenu post={post} onDelete={onDelete} onEdit={onEdit}/>
        </div>
        {post.text && <p className="post-text">{post.text}</p>}
        {imageUrls.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: imageUrls.length === 1 ? '1fr' : 'repeat(2, 1fr)', gap: 6, marginBottom: 12, borderRadius: 12, overflow: 'hidden' }}>
            {imageUrls.map((url, i) => (
              <img key={i} src={url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', cursor: 'pointer', display: 'block' }} onClick={() => { setViewerImages(imageUrls); setViewerIndex(i) }}/>
            ))}
          </div>
        )}
        {post.poll && <PollDisplay poll={post.poll} onVote={onVote}/>}
        <div className="post-footer">
          <div className="post-footer-left">
            <button className="like-btn" onClick={onLike}>
              <IcHeart filled={liked}/>
              <span>{post.like_count}</span>
            </button>
          </div>
          <div className="post-views">
            <Eye size={14} strokeWidth={1.8}/>
            <span>{post.view_count}</span>
          </div>
        </div>
      </div>

      <div className="card post-page-comments">
        <CommentsSection postId={post.id} avatarUrl={myAvatarUrl} onOpenProfile={onOpenProfile}/>
      </div>
      </div>
    </>
  )
}

export default PostPage
