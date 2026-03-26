import { useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import { supabase } from './lib/supabase'

interface Comment {
  id: string
  user_id: string
  parent_id: string | null
  text: string
  created_at: string
  display_name: string
  avatar_url?: string
}

interface CommentNode extends Comment {
  children: CommentNode[]
}

interface Props {
  postId: string
  avatarUrl?: string
  onCountChange?: (count: number) => void
  hideInput?: boolean
  onOpenProfile?: (userId: string) => void
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'только что'
  if (diff < 3600) return `${Math.floor(diff / 60)}м.`
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч.`
  return `${Math.floor(diff / 86400)}д.`
}

function buildTree(flat: Comment[]): CommentNode[] {
  const map = new Map<string, CommentNode>()
  flat.forEach(c => map.set(c.id, { ...c, children: [] }))
  const roots: CommentNode[] = []
  flat.forEach(c => {
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children.push(map.get(c.id)!)
    } else {
      roots.push(map.get(c.id)!)
    }
  })
  return roots
}

interface ItemProps {
  node: CommentNode
  depth: number
  replyingToId: string | null
  replyText: string
  setReplyText: (t: string) => void
  onReply: (id: string) => void
  onCancelReply: () => void
  onSubmitReply: () => void
  submitting: boolean
  onOpenProfile?: (userId: string) => void
}

function CommentItem({ node, depth, replyingToId, replyText, setReplyText, onReply, onCancelReply, onSubmitReply, submitting, onOpenProfile }: ItemProps) {
  const isReplying = replyingToId === node.id
  const hasChildren = node.children.length > 0
  const [expanded, setExpanded] = useState(false)

  const showThread = (expanded && hasChildren) || isReplying

  return (
    <div className="comment-item">
      <div className="comment">
        <div className="comment-avatar-col">
          <div className="comment-avatar" style={{ cursor: 'pointer' }} onClick={() => onOpenProfile?.(node.user_id)}>
            {node.avatar_url
              ? <img src={node.avatar_url} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', display: 'block' }}/>
              : <svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="15" fill="#2a2a30"/><text x="15" y="20" textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.7)">{node.display_name.charAt(0).toUpperCase()}</text></svg>
            }
          </div>
          {showThread && <div className="comment-thread-line"/>}
        </div>
        <div className="comment-body">
          <div className="comment-header">
            <span className="comment-name" style={{ cursor: 'pointer' }} onClick={() => onOpenProfile?.(node.user_id)}>{node.display_name}</span>
            <span className="comment-time">{timeAgo(node.created_at)}</span>
          </div>
          <p className="comment-text">{node.text}</p>
          <div className="comment-actions">
            <button className="comment-reply-btn" onClick={() => isReplying ? onCancelReply() : onReply(node.id)}>
              {isReplying ? 'Отмена' : 'Ответить'}
            </button>
            {hasChildren && !expanded && (
              <button className="comment-show-replies-btn" onClick={() => setExpanded(true)}>
                Ответы · {node.children.length}
              </button>
            )}
            {hasChildren && expanded && (
              <button className="comment-show-replies-btn" onClick={() => setExpanded(false)}>
                Скрыть
              </button>
            )}
          </div>
        </div>
      </div>

      {showThread && (
        <div className="comment-children">
          {isReplying && (
            <div className="comment-inline-reply">
              <input
                className="comment-input"
                placeholder={`Ответить ${node.display_name}…`}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onSubmitReply() } }}
                autoFocus
              />
              <button
                className={`comment-send${replyText.trim() ? ' comment-send--active' : ''}`}
                onClick={onSubmitReply}
                disabled={!replyText.trim() || submitting}
              >
                <Send size={14} strokeWidth={2}/>
              </button>
            </div>
          )}
          {expanded && node.children.map(child => (
            <CommentItem
              key={child.id}
              node={child}
              depth={depth + 1}
              replyingToId={replyingToId}
              replyText={replyText}
              setReplyText={setReplyText}
              onReply={onReply}
              onCancelReply={onCancelReply}
              onSubmitReply={onSubmitReply}
              submitting={submitting}
              onOpenProfile={onOpenProfile}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CommentsSection({ postId, avatarUrl, onCountChange, hideInput, onOpenProfile }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  useEffect(() => { loadComments() }, [postId])

  const loadComments = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('comments')
      .select('*, profiles!comments_user_id_fkey(display_name, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (data) {
      const mapped: Comment[] = data.map((c: any) => ({
        id: c.id,
        user_id: c.user_id,
        parent_id: c.parent_id ?? null,
        text: c.text,
        created_at: c.created_at,
        display_name: c.profiles?.display_name ?? 'Пользователь',
        avatar_url: c.profiles?.avatar_url,
      }))
      setComments(mapped)
      onCountChange?.(mapped.length)
    }
    setLoading(false)
  }

  const handleSubmit = async (parentId: string | null = null) => {
    const submitText = parentId ? replyText : text
    if (!submitText.trim() || submitting) return
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSubmitting(false); return }

    const { data } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: user.id, text: submitText.trim(), parent_id: parentId })
      .select('*, profiles!comments_user_id_fkey(display_name, avatar_url)')
      .single()

    if (data) {
      const newComment: Comment = {
        id: data.id,
        user_id: data.user_id,
        parent_id: data.parent_id ?? null,
        text: data.text,
        created_at: data.created_at,
        display_name: data.profiles?.display_name ?? 'Пользователь',
        avatar_url: data.profiles?.avatar_url,
      }
      setComments(prev => {
        const next = [...prev, newComment]
        onCountChange?.(next.length)
        return next
      })
    }

    if (parentId) {
      setReplyText('')
      setReplyingTo(null)
    } else {
      setText('')
    }
    setSubmitting(false)
  }

  const tree = buildTree(comments)

  return (
    <div className="comments-section">
      {loading ? (
        <div className="comments-loading"><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}/></div>
      ) : tree.length === 0 ? (
        <p className="comments-empty">Нет комментариев</p>
      ) : (
        <div className="comments-list">
          {tree.map(node => (
            <CommentItem
              key={node.id}
              node={node}
              depth={0}
              replyingToId={replyingTo}
              replyText={replyText}
              setReplyText={setReplyText}
              onReply={id => { setReplyingTo(id); setReplyText('') }}
              onCancelReply={() => setReplyingTo(null)}
              onSubmitReply={() => handleSubmit(replyingTo)}
              submitting={submitting}
              onOpenProfile={onOpenProfile}
            />
          ))}
        </div>
      )}

      {!hideInput && (
        <div className="comment-input-row">
          <div className="comment-input-avatar">
            {avatarUrl
              ? <img src={avatarUrl} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', display: 'block' }}/>
              : <svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="15" fill="url(#ciAv)"/><defs><radialGradient id="ciAv" cx="30%" cy="30%"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#6d28d9"/></radialGradient></defs></svg>
            }
          </div>
          <div className="comment-input-wrap">
            <input
              className="comment-input"
              placeholder="Написать комментарий..."
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(null) } }}
            />
            <button
              className={`comment-send${text.trim() ? ' comment-send--active' : ''}`}
              onClick={() => handleSubmit(null)}
              disabled={!text.trim() || submitting}
            >
              <Send size={14} strokeWidth={2}/>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CommentsSection
