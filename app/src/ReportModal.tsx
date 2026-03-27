import { useState } from 'react'
import { supabase } from './lib/supabase'

const REASONS = [
  'Спам или нежелательный контент',
  'Насилие или опасные действия',
  'Ненависть или травля',
  'Уважительное отношение к Егору',
  'Другое',
]

interface Props {
  postId: string
  onClose: () => void
  onSent: () => void
}

function ReportModal({ postId, onClose, onSent }: Props) {
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')

  const submit = async () => {
    if (!reason) return
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('reports').insert({
        post_id: postId,
        reporter_id: user.id,
        reason,
        comment: comment.trim() || null,
      })
    }
    onClose()
    onSent()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(4px)', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#1c1c1f', borderRadius: 20, padding: '28px 20px 20px', width: '100%', maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 600, textAlign: 'center', margin: '0 0 6px' }}>Пожаловаться</h3>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', margin: '0 0 20px' }}>Выберите причину жалобы</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {REASONS.map(r => (
            <button
              key={r}
              onClick={() => setReason(r)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '13px 14px', borderRadius: 12,
                border: `1px solid ${reason === r ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
                background: reason === r ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              }}
            >
              <span style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${reason === r ? '#fff' : 'rgba(255,255,255,0.25)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {reason === r && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', display: 'block' }}/>}
              </span>
              <span style={{ fontSize: 14, color: reason === r ? '#fff' : 'rgba(255,255,255,0.7)' }}>{r}</span>
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Опишите подробнее (необязательно)..."
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 12, boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#fff', fontFamily: 'inherit', fontSize: 13, resize: 'none', outline: 'none',
            minHeight: 80, marginBottom: 16,
          }}
        />

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '14px 0', borderRadius: 14, border: 'none', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontFamily: 'inherit', fontSize: 14, cursor: 'pointer' }}>
            Отмена
          </button>
          <button onClick={submit} disabled={!reason} style={{ flex: 1, padding: '14px 0', borderRadius: 14, border: 'none', background: reason ? '#fff' : 'rgba(255,255,255,0.15)', color: reason ? '#151518' : 'rgba(255,255,255,0.3)', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: reason ? 'pointer' : 'default', transition: 'all 0.15s' }}>
            Отправить
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReportModal
