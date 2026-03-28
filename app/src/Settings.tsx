import { useRef, useState, useEffect } from 'react'
import { User, Image, X, Check, ShieldCheck, CheckCircle, Lock, ChevronDown, Bell } from 'lucide-react'
import { supabase } from './lib/supabase'

interface Profile {
  display_name: string
  username: string
  created_at: string
  avatar_url?: string
  banner_url?: string
  bio?: string
  likes_visibility?: string
  mentions_visibility?: string
  notif_enabled?: boolean
  notif_likes?: boolean
  notif_comments?: boolean
  notif_mentions?: boolean
}

interface Props {
  profile: Profile | null
  onClose: () => void
  onSaved: () => void
}

type Section = 'account' | 'media' | 'security' | 'privacy' | 'notifications'

function Settings({ profile, onClose, onSaved }: Props) {
  const [section, setSection] = useState<Section>('account')

  const [name, setName] = useState(profile?.display_name ?? '')
  const [username, setUsername] = useState(profile?.username ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [nameError, setNameError] = useState('')
  const [usernameError, setUsernameError] = useState('')

  const [avatar, setAvatar] = useState<string | null>(profile?.avatar_url ?? null)
  const [banner, setBanner] = useState<string | null>(profile?.banner_url ?? null)
  const avatarRef = useRef<HTMLInputElement>(null)
  const bannerRef = useRef<HTMLInputElement>(null)

  const [saved, setSaved] = useState(false)

  // Privacy
  const [likesVisibility, setLikesVisibility] = useState(profile?.likes_visibility ?? 'everyone')
  const [likesMenuOpen, setLikesMenuOpen] = useState(false)
  const likesMenuRef = useRef<HTMLDivElement>(null)
  const [mentionsVisibility, setMentionsVisibility] = useState(profile?.mentions_visibility ?? 'everyone')
  const [mentionsMenuOpen, setMentionsMenuOpen] = useState(false)
  const mentionsMenuRef = useRef<HTMLDivElement>(null)

  // Notifications
  const [notifEnabled, setNotifEnabled] = useState(profile?.notif_enabled ?? true)
  const [notifLikes, setNotifLikes] = useState(profile?.notif_likes ?? true)
  const [notifComments, setNotifComments] = useState(profile?.notif_comments ?? true)
  const [notifMentions, setNotifMentions] = useState(profile?.notif_mentions ?? true)
  const [notifSound, setNotifSound] = useState(() => localStorage.getItem('notif_sound') !== 'false')

  // Security
  const [pwdError, setPwdError] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState(false)

  useEffect(() => {
    if (!likesMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (likesMenuRef.current && !likesMenuRef.current.contains(e.target as Node)) setLikesMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [likesMenuOpen])

  useEffect(() => {
    if (!mentionsMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (mentionsMenuRef.current && !mentionsMenuRef.current.contains(e.target as Node)) setMentionsMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [mentionsMenuOpen])

  const flashSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }

  const saveFields = async (fields: object) => {
    const user = await getUser()
    if (!user) return
    await supabase.from('profiles').upsert({ id: user.id, ...fields })
    onSaved()
    flashSaved()
  }

  const uploadFile = async (file: File, path: string) => {
    await supabase.storage.from('profile-media').upload(path, file, { upsert: true })
    const { data } = supabase.storage.from('profile-media').getPublicUrl(path)
    return data.publicUrl
  }

  const handleNameBlur = async () => {
    if (name.trim().length < 2) { setNameError('Минимум 2 символа'); return }
    setNameError('')
    await saveFields({ display_name: name.trim() })
  }

  const handleUsernameBlur = async () => {
    if (username.trim().length < 3) { setUsernameError('Минимум 3 символа'); return }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) { setUsernameError('Только латиница, цифры и "_"'); return }
    setUsernameError('')
    await saveFields({ username: username.trim().toLowerCase() })
  }

  const BIO_LIMIT = 200

  const handleBioBlur = async () => {
    await saveFields({ bio: bio.trim() || null })
  }

  const pickFile = (
    ref: React.RefObject<HTMLInputElement | null>,
    setPreview: (u: string) => void,
    onPick: (file: File) => void
  ) => {
    ref.current?.click()
    ref.current!.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) { setPreview(URL.createObjectURL(file)); onPick(file) }
    }
  }

  const handleAvatarPick = async (file: File) => {
    const user = await getUser()
    if (!user) return
    const ext = file.name.split('.').pop() ?? 'jpg'
    const url = await uploadFile(file, `${user.id}/avatar.${ext}`)
    await supabase.from('profiles').upsert({ id: user.id, avatar_url: url })
    onSaved()
    flashSaved()
  }

  const handleBannerPick = async (file: File) => {
    const user = await getUser()
    if (!user) return
    const ext = file.name.split('.').pop() ?? 'jpg'
    const url = await uploadFile(file, `${user.id}/banner.${ext}`)
    await supabase.from('profiles').upsert({ id: user.id, banner_url: url })
    onSaved()
    flashSaved()
  }

  const [pwdToastExiting, setPwdToastExiting] = useState(false)

  const handleChangePassword = async () => {
    setPwdError('')
    setPwdLoading(true)
    const user = await getUser()
    if (!user?.email) { setPwdError('Ошибка авторизации'); setPwdLoading(false); return }
    const { error } = await supabase.auth.resetPasswordForEmail(user.email)
    setPwdLoading(false)
    if (error) { setPwdError(error.message); return }
    setPwdSuccess(true)
    setTimeout(() => {
      setPwdToastExiting(true)
      setTimeout(() => { setPwdSuccess(false); setPwdToastExiting(false) }, 300)
    }, 2500)
  }

  const navItems: { id: Section; label: string; icon: JSX.Element }[] = [
    { id: 'account',       label: 'Аккаунт',      icon: <User size={18} strokeWidth={1.8}/> },
    { id: 'media',         label: 'Медиа',         icon: <Image size={18} strokeWidth={1.8}/> },
    { id: 'notifications', label: 'Уведомления',   icon: <Bell size={18} strokeWidth={1.8}/> },
    { id: 'privacy',       label: 'Приватность',   icon: <Lock size={18} strokeWidth={1.8}/> },
    { id: 'security',      label: 'Безопасность',  icon: <ShieldCheck size={18} strokeWidth={1.8}/> },
  ]

  const sectionTitle = { account: 'Аккаунт', media: 'Медиа', notifications: 'Уведомления', privacy: 'Приватность', security: 'Безопасность' }

  return (
    <div className="settings-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      {pwdSuccess && (
        <div className={`toast toast--success${pwdToastExiting ? ' toast--exit' : ''}`} style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 1100 }}>
          <CheckCircle size={18} strokeWidth={2}/>
          <span>Письмо отправлено на вашу почту</span>
          <button className="toast-close" onClick={() => { setPwdToastExiting(true); setTimeout(() => { setPwdSuccess(false); setPwdToastExiting(false) }, 300) }}><X size={14} strokeWidth={2}/></button>
        </div>
      )}
      <div className="settings-layout">

        <aside className="settings-sidebar">
          <h2 className="settings-title">Настройки</h2>
          <nav className="settings-nav">
            {navItems.map(item => (
              <button
                key={item.id}
                className={`settings-nav-item${section === item.id ? ' settings-nav-item--active' : ''}`}
                onClick={() => setSection(item.id)}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="settings-content">
          <div className="settings-content-header">
            <h3 className="settings-content-title">{sectionTitle[section]}</h3>
            <div className="settings-header-right">
              {saved && (
                <span className="settings-saved-badge">
                  <Check size={13} strokeWidth={2.5}/> Сохранено
                </span>
              )}
              <button className="settings-close" onClick={onClose}>
                <X size={20} strokeWidth={1.8}/>
              </button>
            </div>
          </div>

          {section === 'account' && (
            <div className="settings-fields">
              <div className="settings-row">
                <div className="settings-row-label">
                  <span className="settings-row-title">Имя</span>
                  <span className="settings-row-hint">Ваше отображаемое имя</span>
                </div>
                <div className="settings-row-input-wrap">
                  <input
                    className={`settings-input${nameError ? ' field-error' : ''}`}
                    value={name}
                    onChange={e => { setName(e.target.value); setNameError('') }}
                    onBlur={handleNameBlur}
                    placeholder="Ваше имя"
                  />
                  {nameError && <span className="error-text">{nameError}</span>}
                </div>
              </div>

              <div className="settings-divider"/>

              <div className="settings-row">
                <div className="settings-row-label">
                  <span className="settings-row-title">Username</span>
                  <span className="settings-row-hint">Ваш идентификатор</span>
                </div>
                <div className="settings-row-input-wrap">
                  <input
                    className={`settings-input${usernameError ? ' field-error' : ''}`}
                    value={username}
                    onChange={e => { setUsername(e.target.value); setUsernameError('') }}
                    onBlur={handleUsernameBlur}
                    placeholder="username"
                  />
                  {usernameError && <span className="error-text">{usernameError}</span>}
                </div>
              </div>

              <div className="settings-divider"/>

              <div className="settings-row settings-row--column">
                <div className="settings-row-label">
                  <span className="settings-row-title">О себе</span>
                  <span className="settings-row-hint">Расскажите немного о себе</span>
                </div>
                <div style={{ position: 'relative', width: '100%' }}>
                  <textarea
                    className="settings-textarea"
                    value={bio}
                    onChange={e => setBio(e.target.value.slice(0, BIO_LIMIT))}
                    onBlur={handleBioBlur}
                    placeholder="Напиши что-нибудь о себе..."
                    rows={4}
                  />
                  <span style={{ position: 'absolute', bottom: 10, right: 12, fontSize: 12, color: bio.length >= BIO_LIMIT ? '#ef4444' : 'rgba(255,255,255,0.25)', pointerEvents: 'none' }}>
                    {bio.length}/{BIO_LIMIT}
                  </span>
                </div>
              </div>
            </div>
          )}

          {section === 'media' && (
            <div className="settings-fields">
              <div className="settings-row settings-row--column">
                <div className="settings-row-label">
                  <span className="settings-row-title">Баннер</span>
                  <span className="settings-row-hint">Фоновое изображение профиля</span>
                </div>
                <div
                  className="banner-upload"
                  style={banner ? { backgroundImage: `url(${banner})` } : undefined}
                  onClick={() => pickFile(bannerRef, setBanner, handleBannerPick)}
                >
                  {!banner && (
                    <div className="upload-placeholder">
                      <Image size={22} strokeWidth={1.6}/>
                      <span>Загрузить баннер</span>
                    </div>
                  )}
                </div>
                <input ref={bannerRef} type="file" accept="image/*" style={{ display: 'none' }}/>
              </div>

              <div className="settings-divider"/>

              <div className="settings-row">
                <div className="settings-row-label">
                  <span className="settings-row-title">Аватарка</span>
                  <span className="settings-row-hint">Рекомендуемый размер: 400×400</span>
                </div>
                <div
                  className="avatar-upload"
                  style={avatar ? { backgroundImage: `url(${avatar})` } : undefined}
                  onClick={() => pickFile(avatarRef, setAvatar, handleAvatarPick)}
                >
                  {!avatar && <Image size={22} strokeWidth={1.6}/>}
                </div>
                <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }}/>
              </div>
            </div>
          )}

          {section === 'privacy' && (
            <div className="settings-fields">
              <div className="settings-row">
                <div className="settings-row-label">
                  <span className="settings-row-title">Кто видит мои лайки</span>
                  <span className="settings-row-hint">Кто может видеть вкладку «Лайки» в вашем профиле</span>
                </div>
                <div ref={likesMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
                  <button
                    className="settings-select-btn"
                    onClick={() => setLikesMenuOpen(v => !v)}
                  >
                    {({ everyone: 'Все', followers: 'Подписчики', mutual: 'Взаимные', nobody: 'Никто' } as Record<string,string>)[likesVisibility]}
                    <ChevronDown size={14} strokeWidth={2} style={{ transition: 'transform 0.15s', transform: likesMenuOpen ? 'rotate(180deg)' : 'none' }}/>
                  </button>
                  {likesMenuOpen && (
                    <div className="settings-select-menu">
                      {([
                        { value: 'everyone', label: 'Все' },
                        { value: 'followers', label: 'Подписчики' },
                        { value: 'mutual', label: 'Взаимные подписки' },
                        { value: 'nobody', label: 'Никто' },
                      ] as const).map(opt => (
                        <button
                          key={opt.value}
                          className={`settings-select-option${likesVisibility === opt.value ? ' settings-select-option--active' : ''}`}
                          onClick={async () => { setLikesVisibility(opt.value); setLikesMenuOpen(false); await saveFields({ likes_visibility: opt.value }) }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="settings-divider"/>

              <div className="settings-row">
                <div className="settings-row-label">
                  <span className="settings-row-title">Кто может отмечать меня</span>
                  <span className="settings-row-hint">Кто может упоминать вас через @</span>
                </div>
                <div ref={mentionsMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
                  <button
                    className="settings-select-btn"
                    onClick={() => setMentionsMenuOpen(v => !v)}
                  >
                    {({ everyone: 'Все', followers: 'Подписчики', mutual: 'Взаимные', nobody: 'Никто' } as Record<string,string>)[mentionsVisibility]}
                    <ChevronDown size={14} strokeWidth={2} style={{ transition: 'transform 0.15s', transform: mentionsMenuOpen ? 'rotate(180deg)' : 'none' }}/>
                  </button>
                  {mentionsMenuOpen && (
                    <div className="settings-select-menu">
                      {([
                        { value: 'everyone', label: 'Все' },
                        { value: 'followers', label: 'Подписчики' },
                        { value: 'mutual', label: 'Взаимные подписки' },
                        { value: 'nobody', label: 'Никто' },
                      ] as const).map(opt => (
                        <button
                          key={opt.value}
                          className={`settings-select-option${mentionsVisibility === opt.value ? ' settings-select-option--active' : ''}`}
                          onClick={async () => { setMentionsVisibility(opt.value); setMentionsMenuOpen(false); await saveFields({ mentions_visibility: opt.value }) }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {section === 'notifications' && (
            <div className="settings-fields">
              <div className="settings-row">
                <div className="settings-row-label">
                  <span className="settings-row-title">Уведомления</span>
                  <span className="settings-row-hint">Включить или отключить все уведомления</span>
                </div>
                <label className="settings-toggle">
                  <input type="checkbox" checked={notifEnabled} onChange={async e => {
                    setNotifEnabled(e.target.checked)
                    await saveFields({ notif_enabled: e.target.checked })
                  }}/>
                  <span className="settings-toggle-track"/>
                </label>
              </div>

              <div className="settings-divider"/>

              <div className="settings-row" style={{ opacity: notifEnabled ? 1 : 0.4, pointerEvents: notifEnabled ? 'auto' : 'none' }}>
                <div className="settings-row-label">
                  <span className="settings-row-title">Звук</span>
                  <span className="settings-row-hint">Воспроизводить звук при уведомлении</span>
                </div>
                <label className="settings-toggle">
                  <input type="checkbox" checked={notifSound} onChange={e => {
                    setNotifSound(e.target.checked)
                    localStorage.setItem('notif_sound', String(e.target.checked))
                  }}/>
                  <span className="settings-toggle-track"/>
                </label>
              </div>

              <div className="settings-divider" style={{ opacity: notifEnabled ? 1 : 0.4 }}/>

              <div className="settings-row" style={{ opacity: notifEnabled ? 1 : 0.4, pointerEvents: notifEnabled ? 'auto' : 'none' }}>
                <div className="settings-row-label">
                  <span className="settings-row-title">Лайки</span>
                  <span className="settings-row-hint">Когда кто-то лайкает ваш пост</span>
                </div>
                <label className="settings-toggle">
                  <input type="checkbox" checked={notifLikes} onChange={async e => {
                    setNotifLikes(e.target.checked)
                    await saveFields({ notif_likes: e.target.checked })
                  }}/>
                  <span className="settings-toggle-track"/>
                </label>
              </div>

              <div className="settings-divider" style={{ opacity: notifEnabled ? 1 : 0.4 }}/>

              <div className="settings-row" style={{ opacity: notifEnabled ? 1 : 0.4, pointerEvents: notifEnabled ? 'auto' : 'none' }}>
                <div className="settings-row-label">
                  <span className="settings-row-title">Комментарии</span>
                  <span className="settings-row-hint">Когда кто-то комментирует ваш пост</span>
                </div>
                <label className="settings-toggle">
                  <input type="checkbox" checked={notifComments} onChange={async e => {
                    setNotifComments(e.target.checked)
                    await saveFields({ notif_comments: e.target.checked })
                  }}/>
                  <span className="settings-toggle-track"/>
                </label>
              </div>

              <div className="settings-divider" style={{ opacity: notifEnabled ? 1 : 0.4 }}/>

              <div className="settings-row" style={{ opacity: notifEnabled ? 1 : 0.4, pointerEvents: notifEnabled ? 'auto' : 'none' }}>
                <div className="settings-row-label">
                  <span className="settings-row-title">Упоминания</span>
                  <span className="settings-row-hint">Когда кто-то отмечает вас через @</span>
                </div>
                <label className="settings-toggle">
                  <input type="checkbox" checked={notifMentions} onChange={async e => {
                    setNotifMentions(e.target.checked)
                    await saveFields({ notif_mentions: e.target.checked })
                  }}/>
                  <span className="settings-toggle-track"/>
                </label>
              </div>

            </div>
          )}

          {section === 'security' && (
            <div className="settings-fields">
              <div className="settings-row">
                <div className="settings-row-label">
                  <span className="settings-row-title">Пароль</span>
                  <span className="settings-row-hint">Изменить пароль от аккаунта</span>
                </div>
                <div className="settings-row-input-wrap" style={{ alignItems: 'flex-end' }}>
                  <button
                    className="submit-btn"
                    style={{ width: '160px', padding: '8px 18px', fontSize: 13 }}
                    onClick={handleChangePassword}
                    disabled={pwdLoading}
                  >
                    {pwdLoading ? 'Отправка...' : 'Сменить пароль'}
                  </button>
                  {pwdError && <span className="error-text" style={{ marginTop: 6 }}>{pwdError}</span>}
                </div>
              </div>
            </div>
          )}

          <div className="settings-danger-zone">
            <button className="settings-delete-btn">Удалить аккаунт</button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Settings
