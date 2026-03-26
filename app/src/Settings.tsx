import { useRef, useState } from 'react'
import { User, Image, X, Check } from 'lucide-react'
import { supabase } from './lib/supabase'

interface Profile {
  display_name: string
  username: string
  created_at: string
  avatar_url?: string
  banner_url?: string
  bio?: string
}

interface Props {
  profile: Profile | null
  onClose: () => void
  onSaved: () => void
}

type Section = 'account' | 'media'

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

  const navItems: { id: Section; label: string; icon: JSX.Element }[] = [
    { id: 'account', label: 'Аккаунт', icon: <User size={18} strokeWidth={1.8}/> },
    { id: 'media',   label: 'Медиа',   icon: <Image size={18} strokeWidth={1.8}/> },
  ]

  return (
    <div className="settings-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
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

        <div className="settings-content" style={{ justifyContent: 'space-between' }}>
          <div className="settings-content-header">
            <h3 className="settings-content-title">
              {section === 'account' ? 'Аккаунт' : 'Медиа'}
            </h3>
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
                <textarea
                  className="settings-textarea"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  onBlur={handleBioBlur}
                  placeholder="Напиши что-нибудь о себе..."
                  rows={4}
                />
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
          <div className="settings-danger-zone">
            <button className="settings-delete-btn">Удалить аккаунт</button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Settings
