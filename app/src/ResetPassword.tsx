import { useState } from 'react'
import { supabase } from './lib/supabase'

interface Props {
  onBack: () => void
  onDone: () => void
}

function ResetPassword({ onBack, onDone }: Props) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  const validatePassword = (p: string): string => {
    if (!p) return 'Введите пароль'
    if (p.length < 10) return 'Минимум 10 символов'
    if (!/[A-Z]/.test(p)) return 'Нужна хотя бы одна заглавная буква'
    if (!/[0-9]/.test(p)) return 'Нужна хотя бы одна цифра'
    return ''
  }

  const handleSubmit = async () => {
    const msg = validatePassword(password)
    if (msg) { setError(msg); return }
    if (password !== confirm) { setError('Пароли не совпадают'); return }
    setLoading(true)
    setApiError('')
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setApiError(err.message); return }
    onDone()
  }

  return (
    <div className="signup-page">
      <div className="signup-form">
        <div className="signup-header">
          <h1 className="signup-title">Новый пароль</h1>
          <p className="signup-subtitle">Введите новый пароль для вашего аккаунта</p>
        </div>

        <div className="form-fields">
          <div className="field-group">
            <label className="field-label">Пароль</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className={`field-input password-input${error ? ' field-error' : ''}`}
                placeholder="Минимум 10 символов"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); setApiError('') }}
              />
              <button type="button" className="eye-btn" onClick={() => setShowPassword(v => !v)}>
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Повторите пароль</label>
            <input
              type={showPassword ? 'text' : 'password'}
              className={`field-input${error ? ' field-error' : ''}`}
              placeholder="Повторите пароль"
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setError(''); setApiError('') }}
            />
            {error && <span className="error-text">{error}</span>}
          </div>
        </div>

        {apiError && (
          <div className="alert alert--error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {apiError}
          </div>
        )}

        <button
          className={`submit-btn${password && confirm && !loading ? '' : ' submit-btn--disabled'}`}
          disabled={!password || !confirm || loading}
          onClick={handleSubmit}
        >
          {loading ? 'Сохранение...' : 'Сохранить'}
        </button>

        <p className="login-text">
          <a href="#" className="login-link" onClick={e => { e.preventDefault(); onBack() }}>
            Назад
          </a>
        </p>
      </div>
    </div>
  )
}

export default ResetPassword
