import { useRef, useState, useEffect } from 'react'
import { User, Image, X, Check, ShieldCheck, CheckCircle, Lock, ChevronDown, Bell, Sun, Ban } from 'lucide-react'
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

type Section = 'account' | 'media' | 'security' | 'privacy' | 'notifications' | 'appearance'

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

  // Blocklist
  const BLOCK_PAGE = 20
  const [blocklist, setBlocklist] = useState<{ id: string; display_name: string; username: string; avatar_url?: string }[]>([])
  const [blocklistLoaded, setBlocklistLoaded] = useState(false)
  const [blocklistHasMore, setBlocklistHasMore] = useState(false)
  const [blocklistOffset, setBlocklistOffset] = useState(0)
  const [blocklistLoadingMore, setBlocklistLoadingMore] = useState(false)

  const fetchBlockPage = async (offset: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data: blocks } = await supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', user.id)
      .range(offset, offset + BLOCK_PAGE - 1)
    if (!blocks || blocks.length === 0) return []
    const ids = blocks.map((b: any) => b.blocked_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .in('id', ids)
    return (profiles ?? []).map((p: any) => ({
      id: p.id,
      display_name: p.display_name ?? 'Пользователь',
      username: p.username ?? '',
      avatar_url: p.avatar_url,
    }))
  }

  const loadBlocklist = async () => {
    const page = await fetchBlockPage(0)
    setBlocklist(page)
    setBlocklistOffset(page.length)
    setBlocklistHasMore(page.length === BLOCK_PAGE)
    setBlocklistLoaded(true)
  }

  const loadMoreBlocklist = async () => {
    setBlocklistLoadingMore(true)
    const page = await fetchBlockPage(blocklistOffset)
    setBlocklist(prev => [...prev, ...page])
    setBlocklistOffset(prev => prev + page.length)
    setBlocklistHasMore(page.length === BLOCK_PAGE)
    setBlocklistLoadingMore(false)
  }

  const unblockUser = async (blockedId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('blocks').delete().eq('blocker_id', user.id).eq('blocked_id', blockedId)
    setBlocklist(prev => prev.filter(u => u.id !== blockedId))
  }

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

  // Appearance
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    (localStorage.getItem('theme') as 'dark' | 'light') ?? 'dark'
  )
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const themeMenuRef = useRef<HTMLDivElement>(null)
  const applyTheme = (t: 'dark' | 'light') => {
    setTheme(t)
    setThemeMenuOpen(false)
    localStorage.setItem('theme', t)
    if (t === 'light') document.documentElement.setAttribute('data-theme', 'light')
    else document.documentElement.removeAttribute('data-theme')
  }

  // Security
  const [pwdError, setPwdError] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState(false)
  // Delete account
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteEmail, setDeleteEmail] = useState('')
  const [deleteCode, setDeleteCode] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteCodeSent, setDeleteCodeSent] = useState(false)
  const [deleteCooldown, setDeleteCooldown] = useState(0)

  useEffect(() => {
    if (section === 'privacy' && !blocklistLoaded) loadBlocklist()
  }, [section])

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

  useEffect(() => {
    if (!themeMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) setThemeMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [themeMenuOpen])

  useEffect(() => {
    if (deleteCooldown <= 0) return
    const timer = setTimeout(() => setDeleteCooldown(v => v - 1), 1000)
    return () => clearTimeout(timer)
  }, [deleteCooldown])

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

  const resetDeleteState = () => {
    setDeleteEmail('')
    setDeleteCode('')
    setDeletePassword('')
    setDeleteError('')
    setDeleteLoading(false)
    setDeleteCodeSent(false)
    setDeleteCooldown(0)
  }

  const openDeleteModal = async () => {
    resetDeleteState()
    const user = await getUser()
    setDeleteEmail(user?.email ?? '')
    setDeleteOpen(true)
  }

  const closeDeleteModal = () => {
    setDeleteOpen(false)
    resetDeleteState()
  }

  const sendDeleteCode = async () => {
    setDeleteError('')
    setDeleteLoading(true)
    const user = await getUser()
    if (!user?.email) { setDeleteError('Ошибка авторизации'); setDeleteLoading(false); return }
    const { error } = await supabase.auth.signInWithOtp({
      email: user.email,
      options: { shouldCreateUser: false },
    })
    setDeleteLoading(false)
    if (error) { setDeleteError(error.message); return }
    setDeleteEmail(user.email)
    setDeleteCodeSent(true)
    setDeleteCooldown(60)
  }

  const handleDeleteAccount = async () => {
    setDeleteError('')
    setDeleteLoading(true)
    const user = await getUser()
    if (!user?.email) { setDeleteError('Ошибка авторизации'); setDeleteLoading(false); return }
    if (!deleteCode.trim() || !deletePassword) { setDeleteError('Введите код и пароль'); setDeleteLoading(false); return }

    const { error: otpError } = await supabase.auth.verifyOtp({
      email: user.email,
      token: deleteCode.trim(),
      type: 'email',
    })
    if (otpError) { setDeleteError('Неверный код'); setDeleteLoading(false); return }

    const { error: pwdErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: deletePassword,
    })
    if (pwdErr) { setDeleteError('Неверный пароль'); setDeleteLoading(false); return }

    const { error: deleteErr } = await supabase.rpc('admin_delete_user', { target_user_id: user.id })
    if (deleteErr) { setDeleteError(deleteErr.message); setDeleteLoading(false); return }

    await supabase.auth.signOut()
    window.location.reload()
  }

  const navItems: { id: Section; label: string; icon: JSX.Element }[] = [
    { id: 'account',       label: 'Аккаунт',      icon: <User size={18} strokeWidth={1.8}/> },
    { id: 'media',         label: 'Медиа',         icon: <Image size={18} strokeWidth={1.8}/> },
    { id: 'appearance',    label: 'Оформление',    icon: <Sun size={18} strokeWidth={1.8}/> },
    { id: 'notifications', label: 'Уведомления',   icon: <Bell size={18} strokeWidth={1.8}/> },
    { id: 'privacy',       label: 'Приватность',   icon: <Lock size={18} strokeWidth={1.8}/> },
    { id: 'security',      label: 'Безопасность',  icon: <ShieldCheck size={18} strokeWidth={1.8}/> },
  ]

  const sectionTitle = { account: 'Аккаунт', media: 'Медиа', appearance: 'Оформление', notifications: 'Уведомления', privacy: 'Приватность', security: 'Безопасность' }

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
                  <span style={{ position: 'absolute', bottom: 10, right: 12, fontSize: 12, color: bio.length >= BIO_LIMIT ? '#ef4444' : 'rgba(var(--t),0.25)', pointerEvents: 'none' }}>
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
              <div className="settings-divider"/>

              <div className="settings-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 12 }}>
                <div className="settings-row-label">
                  <span className="settings-row-title">Чёрный список</span>
                  <span className="settings-row-hint">Заблокированные пользователи</span>
                </div>
                {!blocklistLoaded ? (
                  <div className="spinner" style={{ margin: '8px auto' }}/>
                ) : blocklist.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'rgba(var(--t),0.35)', margin: 0 }}>Список пуст</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                    {blocklist.map(u => (
                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(var(--t),0.04)', borderRadius: 12 }}>
                        {u.avatar_url
                          ? <img src={u.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}/>
                          : <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#a78bfa,#6d28d9)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', fontWeight: 600 }}>{u.display_name.charAt(0).toUpperCase()}</div>
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.display_name}</div>
                          <div style={{ fontSize: 12, color: 'rgba(var(--t),0.4)' }}>@{u.username}</div>
                        </div>
                        <button
                          onClick={() => unblockUser(u.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 10, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                        >
                          <Ban size={13}/> Разблокировать
                        </button>
                      </div>
                    ))}
                    {blocklistHasMore && (
                      <button
                        onClick={loadMoreBlocklist}
                        disabled={blocklistLoadingMore}
                        style={{ width: '100%', padding: '10px', borderRadius: 12, border: 'none', background: 'rgba(var(--t),0.06)', color: 'rgba(var(--t),0.6)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        {blocklistLoadingMore ? 'Загрузка…' : 'Загрузить ещё'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {section === 'appearance' && (
            <div className="settings-fields">
              <div className="settings-row">
                <div className="settings-row-label">
                  <span className="settings-row-title">Тема</span>
                  <span className="settings-row-hint">Выберите светлую или тёмную тему интерфейса</span>
                </div>
                <div ref={themeMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
                  <button
                    className="settings-select-btn"
                    onClick={() => setThemeMenuOpen(v => !v)}
                  >
                    {theme === 'dark' ? 'Тёмная' : 'Светлая'}
                    <ChevronDown size={14} strokeWidth={2} style={{ transition: 'transform 0.15s', transform: themeMenuOpen ? 'rotate(180deg)' : 'none' }}/>
                  </button>
                  {themeMenuOpen && (
                    <div className="settings-select-menu">
                      {([
                        { value: 'dark' as const, label: 'Тёмная' },
                        { value: 'light' as const, label: 'Светлая' },
                      ]).map(opt => (
                        <button
                          key={opt.value}
                          className={`settings-select-option${theme === opt.value ? ' settings-select-option--active' : ''}`}
                          onClick={() => applyTheme(opt.value)}
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
            <button className="settings-delete-btn" onClick={openDeleteModal}>Удалить аккаунт</button>
          </div>
        </div>

      </div>

      {deleteOpen && (
        <div className="settings-delete-overlay" onClick={e => { if (e.target === e.currentTarget) closeDeleteModal() }}>
          <div className="settings-delete-modal" onClick={e => e.stopPropagation()}>
            <div className="settings-delete-header">
              <div>
                <h3>Удаление аккаунта</h3>
                <p>Для удаления нужен код из письма и пароль от аккаунта.</p>
              </div>
              <button className="settings-delete-close" onClick={closeDeleteModal}>
                <X size={18} strokeWidth={1.8}/>
              </button>
            </div>

            <div className="settings-delete-field">
              <label>Почта</label>
              <input className="settings-input" value={deleteEmail} readOnly placeholder="email@example.com"/>
            </div>

            <div className="settings-delete-actions">
              <button
                className="settings-delete-send"
                onClick={sendDeleteCode}
                disabled={deleteLoading || deleteCooldown > 0}
              >
                {deleteCooldown > 0 ? `Отправить код (${deleteCooldown}s)` : (deleteCodeSent ? 'Отправить ещё раз' : 'Отправить код')}
              </button>
            </div>

            {deleteCodeSent && (
              <>
                <div className="settings-delete-field">
                  <label>Код из письма</label>
                  <input
                    className="settings-input"
                    value={deleteCode}
                    onChange={e => setDeleteCode(e.target.value)}
                    placeholder="123456"
                  />
                </div>
                <div className="settings-delete-field">
                  <label>Пароль</label>
                  <input
                    className="settings-input"
                    type="password"
                    value={deletePassword}
                    onChange={e => setDeletePassword(e.target.value)}
                    placeholder="Пароль"
                  />
                </div>
              </>
            )}

            {deleteError && <div className="error-text" style={{ marginTop: 8 }}>{deleteError}</div>}

            <div className="settings-delete-actions settings-delete-actions--danger">
              <button
                className="settings-delete-confirm"
                onClick={handleDeleteAccount}
                disabled={!deleteCodeSent || deleteLoading}
              >
                {deleteLoading ? 'Удаление...' : 'Удалить аккаунт'}
              </button>
              <button className="settings-delete-cancel" onClick={closeDeleteModal}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
