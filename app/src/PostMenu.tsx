import { useEffect, useState, useRef } from 'react'
import { MoreHorizontal, Link, Pencil, Trash2, Flag, X, CheckCircle } from 'lucide-react'
import { supabase } from './lib/supabase'
import type { Post } from './Home'

export function PostMenu({ post, onDelete, onEdit }: { post: Post; onDelete?: (id: string) => void; onEdit?: (id: string, text: string) => void }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(post.text)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(() => { setCopied(false); setExiting(false) }, 300)
    }, 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const closeCopyNotification = () => {
    setExiting(true)
    setTimeout(() => { setCopied(false); setExiting(false) }, 300)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/#/post/${post.id}`)
    setCopied(true)
    setOpen(false)
  }

  const deletePost = async () => {
    await supabase.from('posts').delete().eq('id', post.id)
    onDelete?.(post.id)
    setOpen(false)
  }

  const saveEdit = async () => {
    await supabase.from('posts').update({ text: editText }).eq('id', post.id)
    onEdit?.(post.id, editText)
    setEditing(false)
    setOpen(false)
  }

  return (
    <>
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(4px)' }} onClick={() => setEditing(false)}>
          <div style={{ background: '#1e1e22', borderRadius: 18, padding: 24, width: '90%', maxWidth: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', marginBottom: 16 }}>Редактировать пост</h3>
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              style={{ width: '100%', padding: 12, background: '#28282e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#ffffff', fontFamily: 'inherit', fontSize: 14, minHeight: 120, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              placeholder="Текст поста"
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditing(false)} style={{ padding: '10px 20px', borderRadius: 18, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#ffffff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}>
                Отмена
              </button>
              <button onClick={saveEdit} style={{ padding: '10px 20px', borderRadius: 18, border: 'none', background: '#ffffff', color: '#151518', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="post-menu-wrap" ref={ref}>
        {copied && (
          <div className={`toast toast--success${exiting ? ' toast--exit' : ''}`}>
            <CheckCircle size={18} strokeWidth={2}/>
            <span>Ссылка скопирована</span>
            <button className="toast-close" onClick={closeCopyNotification}>
              <X size={14} strokeWidth={2}/>
            </button>
          </div>
        )}
        <button className="post-menu-btn" onClick={e => { e.stopPropagation(); setOpen(v => !v) }}>
          <MoreHorizontal size={18} strokeWidth={1.8}/>
        </button>
        {open && (
          <div className="post-menu-dropdown" onClick={e => e.stopPropagation()}>
            <button className="post-menu-item" onClick={copyLink}>
              <Link size={14}/> Скопировать ссылку
            </button>
            {post.mine ? (
              <>
                <button className="post-menu-item" onClick={() => { setEditing(true); setOpen(false) }}>
                  <Pencil size={14}/> Редактировать
                </button>
                <div className="post-menu-divider"/>
                <button className="post-menu-item post-menu-item--danger" onClick={deletePost}>
                  <Trash2 size={14}/> Удалить
                </button>
              </>
            ) : (
              <button className="post-menu-item post-menu-item--danger" onClick={() => setOpen(false)}>
                <Flag size={14}/> Пожаловаться
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}

export default PostMenu
