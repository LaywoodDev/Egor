import { useRef, useState } from 'react'
import { Paperclip, BarChart2, X, Plus, LayoutGrid, HelpCircle, Laugh, Images, Video } from 'lucide-react'
import { supabase } from './lib/supabase'

interface Props {
  avatarUrl?: string
  onPublish: (text: string, imageUrl?: string | string[], poll?: string[], category?: string) => Promise<void>
}

const CATEGORIES = [
  { id: 'ask',     name: 'Спросить Егора', icon: HelpCircle, color: '#a78bfa' },
  { id: 'memes',   name: 'Мемы',           icon: Laugh,      color: '#f59e0b' },
  { id: 'gallery', name: 'Галерея',        icon: Images,     color: '#34d399' },
  { id: 'video',   name: 'Видео',          icon: Video,      color: '#f87171' },
]

function Composer({ avatarUrl, onPublish }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const imageRef = useRef<HTMLInputElement>(null)

  const [pollMode, setPollMode] = useState(false)
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [category, setCategory] = useState<string | undefined>(undefined)
  const [catOpen, setCatOpen] = useState(false)

  const validPoll = pollOptions.filter(o => o.trim())
  const hasContent = text.trim() || imageFiles.length > 0 || (pollMode && validPoll.length >= 2)

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    setImageFiles(prev => [...prev, ...files])
    files.forEach(file => {
      setImagePreviews(prev => [...prev, URL.createObjectURL(file)])
    })
  }

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
    if (imageRef.current) imageRef.current.value = ''
  }

  const togglePoll = () => {
    setPollMode(v => !v)
    setPollOptions(['', ''])
  }

  const handlePublish = async () => {
    if (!hasContent || loading) return
    setLoading(true)

    let imageUrl: string | string[] | undefined
    if (imageFiles.length > 0) {
      const { data: { user } } = await supabase.auth.getUser()
      const urls: string[] = []
      for (const file of imageFiles) {
        const ext = file.name.split('.').pop() ?? 'jpg'
        const path = `${user!.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        await supabase.storage.from('post-media').upload(path, file)
        const { data } = supabase.storage.from('post-media').getPublicUrl(path)
        urls.push(data.publicUrl)
      }
      imageUrl = urls.length === 1 ? urls[0] : urls
    }

    const poll = pollMode && validPoll.length >= 2 ? validPoll : undefined
    await onPublish(text.trim(), imageUrl, poll, category)

    setText(''); setImageFiles([]); setImagePreviews([])
    if (imageRef.current) imageRef.current.value = ''
    setPollMode(false); setPollOptions(['', ''])
    setCategory(undefined)
    setLoading(false)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && hasContent) { e.preventDefault(); handlePublish() }
  }

  return (
    <div className="card composer">
      <div className="composer-top">
        <div className="composer-avatar">
          {avatarUrl
            ? <img src={avatarUrl} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', display: 'block' }}/>
            : <svg width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="url(#cAv)"/><defs><radialGradient id="cAv" cx="30%" cy="30%"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#6d28d9"/></radialGradient></defs></svg>
          }
        </div>
        <textarea
          className="composer-input composer-textarea"
          placeholder="Что нового?"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
        />
      </div>

      {imagePreviews.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(imagePreviews.length, 4)}, 1fr)`, gap: 8, marginBottom: 12 }}>
          {imagePreviews.map((preview, i) => (
            <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', backgroundColor: '#2a2a30' }}>
              <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
              <button className="composer-remove-img" onClick={() => removeImage(i)} style={{ position: 'absolute', top: 4, right: 4 }}><X size={14}/></button>
            </div>
          ))}
        </div>
      )}

      {pollMode && (
        <div className="composer-poll">
          <div className="composer-poll-header">
            <span className="composer-poll-title">Опрос</span>
            <button className="composer-poll-close" onClick={togglePoll}><X size={14}/></button>
          </div>
          {pollOptions.map((opt, i) => (
            <div key={i} className="composer-poll-option">
              <input
                className="composer-poll-input"
                placeholder={`Вариант ${i + 1}`}
                value={opt}
                onChange={e => setPollOptions(prev => prev.map((o, idx) => idx === i ? e.target.value : o))}
              />
              {pollOptions.length > 2 && (
                <button className="composer-poll-remove" onClick={() => setPollOptions(prev => prev.filter((_, idx) => idx !== i))}>
                  <X size={14}/>
                </button>
              )}
            </div>
          ))}
          {pollOptions.length < 4 && (
            <button className="composer-poll-add" onClick={() => setPollOptions(prev => [...prev, ''])}>
              <Plus size={14}/> Добавить вариант
            </button>
          )}
        </div>
      )}

      <div className="composer-actions">
        <div className="composer-tools">
          <button className="tool-btn" onClick={() => imageRef.current?.click()}>
            <Paperclip size={18} strokeWidth={1.8}/>
          </button>
          <button className={`tool-btn${pollMode ? ' tool-btn--active' : ''}`} onClick={togglePoll}>
            <BarChart2 size={18} strokeWidth={1.8}/>
          </button>
          <div style={{ position: 'relative' }}>
            <button
              className={`tool-btn${category ? ' tool-btn--active' : ''}`}
              onClick={() => setCatOpen(v => !v)}
              style={category ? { color: CATEGORIES.find(c => c.id === category)?.color } : undefined}
            >
              <LayoutGrid size={18} strokeWidth={1.8}/>
            </button>
            {catOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: '#2a2a32', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 6, zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', minWidth: 180 }}>
                {category && (
                  <button
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', fontSize: 13, fontFamily: 'inherit', padding: '8px 10px', borderRadius: 8, transition: 'background 0.12s' }}
                    onClick={() => { setCategory(undefined); setCatOpen(false) }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <X size={14}/> Убрать категорию
                  </button>
                )}
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon
                  return (
                    <button
                      key={cat.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: category === cat.id ? 'rgba(255,255,255,0.07)' : 'none', border: 'none', cursor: 'pointer', color: category === cat.id ? cat.color : 'rgba(255,255,255,0.85)', fontSize: 13, fontFamily: 'inherit', padding: '8px 10px', borderRadius: 8, transition: 'background 0.12s', whiteSpace: 'nowrap' }}
                      onClick={() => { setCategory(cat.id); setCatOpen(false) }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                      onMouseLeave={e => e.currentTarget.style.background = category === cat.id ? 'rgba(255,255,255,0.07)' : 'none'}
                    >
                      <Icon size={14} color={cat.color}/> {cat.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <input ref={imageRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImagePick}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {category && (() => {
            const cat = CATEGORIES.find(c => c.id === category)!
            const Icon = cat.icon
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 18, background: 'rgba(255,255,255,0.07)', fontSize: 12, color: cat.color, fontWeight: 500 }}>
                <Icon size={12} color={cat.color}/> {cat.name}
              </div>
            )
          })()}
          <button
            className={`publish-btn${hasContent && !loading ? ' publish-btn--active' : ''}`}
            onClick={handlePublish}
            disabled={!hasContent || loading}
          >
            {loading ? 'Публикация...' : 'Опубликовать'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Composer
