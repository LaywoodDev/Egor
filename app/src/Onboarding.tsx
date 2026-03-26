import { useRef, useState } from 'react'
import { supabase } from './lib/supabase'

interface Props {
  onDone: () => void
  onBack: () => void
}

function Onboarding({ onDone, onBack }: Props) {
  const [step, setStep] = useState(1)

  // Step 1
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [errors, setErrors] = useState({ name: false, username: false })
  const [nameError, setNameError] = useState('')
  const [usernameError, setUsernameError] = useState('')

  // Step 2
  const [avatar, setAvatar] = useState<string | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const avatarRef = useRef<HTMLInputElement>(null)
  const bannerRef = useRef<HTMLInputElement>(null)

  const validateUsername = (u: string): string => {
    if (!u.trim()) return 'Введите username'
    if (u.trim().length < 3) return 'Минимум 3 символа'
    if (!/^[a-zA-Z0-9_]+$/.test(u.trim())) return 'Только латиница, цифры и "_"'
    return ''
  }

  const validateName = (n: string): string => {
    if (!n.trim()) return 'Введите имя'
    if (n.trim().length < 2) return 'Минимум 2 символа'
    return ''
  }

  const handleStep1 = () => {
    const nMsg = validateName(name)
    const uMsg = validateUsername(username)
    setNameError(nMsg)
    setUsernameError(uMsg)
    setErrors({ name: !!nMsg, username: !!uMsg })
    if (!nMsg && !uMsg) setStep(2)
  }

  const [saving, setSaving] = useState(false)

  const pickFile = (
    ref: React.RefObject<HTMLInputElement | null>,
    setPreview: (url: string) => void,
    setFile: (f: File) => void
  ) => {
    ref.current?.click()
    ref.current!.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        setPreview(URL.createObjectURL(file))
        setFile(file)
      }
    }
  }

  const uploadFile = async (file: File, path: string) => {
    await supabase.storage.from('profile-media').upload(path, file, { upsert: true })
    const { data } = supabase.storage.from('profile-media').getPublicUrl(path)
    return data.publicUrl
  }

  const handleDone = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const ext = (f: File) => f.name.split('.').pop() ?? 'jpg'
      const avatar_url = avatarFile ? await uploadFile(avatarFile, `${user.id}/avatar.${ext(avatarFile)}`) : undefined
      const banner_url = bannerFile ? await uploadFile(bannerFile, `${user.id}/banner.${ext(bannerFile)}`) : undefined

      await supabase.from('profiles').upsert({
        id: user.id,
        display_name: name.trim(),
        username: username.trim().toLowerCase(),
        ...(avatar_url && { avatar_url }),
        ...(banner_url && { banner_url }),
      })
    }
    setSaving(false)
    onDone()
  }

  return (
    <div className="signup-page">
      <div className="signup-form">

        <div className="signup-header">
          <h1 className="signup-title">Настройка профиля</h1>
          <p className="signup-subtitle">Пожалуйста, укажите данные профиля</p>
        </div>

        {/* Stepper */}
        <div className="stepper">
          <div className={`stepper-circle${step >= 1 ? ' stepper-circle--active' : ''}`}>1</div>
          <div className="stepper-line" />
          <div className={`stepper-circle${step >= 2 ? ' stepper-circle--active' : ''}`}>2</div>
        </div>

        {step === 1 && (
          <>
            <div className="form-fields">
              <div className="field-group">
                <label className="field-label">Имя</label>
                <p className="field-hint">Как тебя будут видеть другие пользователи</p>
                <input
                  type="text"
                  className={`field-input${errors.name ? ' field-error' : ''}`}
                  placeholder="Давалкин Егор"
                  value={name}
                  onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: false })); setNameError('') }}
                />
                {nameError && <span className="error-text">{nameError}</span>}
              </div>

              <div className="field-group">
                <label className="field-label">Username</label>
                <p className="field-hint">Уникальный никнейм для твоего профиля (латиница, цифры, и "_")</p>
                <input
                  type="text"
                  className={`field-input${errors.username ? ' field-error' : ''}`}
                  placeholder="egor"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setErrors(p => ({ ...p, username: false })); setUsernameError('') }}
                />
                {usernameError && <span className="error-text">{usernameError}</span>}
              </div>
            </div>

            <button
              className="submit-btn"
              onClick={handleStep1}
            >
              Продолжить
            </button>

            <p className="login-text">
              <a href="#" className="login-link" onClick={e => { e.preventDefault(); onBack() }}>
                Вернуться ко входу
              </a>
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <div className="form-fields">
              {/* Banner */}
              <div className="field-group">
                <label className="field-label">Баннер</label>
                <div
                  className="banner-upload"
                  style={banner ? { backgroundImage: `url(${banner})` } : undefined}
                  onClick={() => pickFile(bannerRef, setBanner, setBannerFile)}
                >
                  {!banner && (
                    <div className="upload-placeholder">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      <span>Загрузить баннер</span>
                    </div>
                  )}
                </div>
                <input ref={bannerRef} type="file" accept="image/*" style={{ display: 'none' }} />
              </div>

              {/* Avatar */}
              <div className="field-group">
                <label className="field-label">Аватарка</label>
                <div className="avatar-upload-row">
                  <div
                    className="avatar-upload"
                    style={avatar ? { backgroundImage: `url(${avatar})` } : undefined}
                    onClick={() => pickFile(avatarRef, setAvatar, setAvatarFile)}
                  >
                    {!avatar && (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                    )}
                  </div>
                  <span className="avatar-hint">Рекомендуемый размер: 400×400</span>
                </div>
                <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} />
              </div>
            </div>

            <button className="submit-btn" onClick={handleDone} disabled={saving}>
              {saving ? 'Сохранение...' : 'Завершить'}
            </button>

            <p className="login-text">
              <a href="#" className="forgot-link" onClick={e => { e.preventDefault(); setStep(1) }}>
                Назад
              </a>
            </p>
          </>
        )}

      </div>
    </div>
  )
}

export default Onboarding
