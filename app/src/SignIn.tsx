import { useState } from 'react'
import { supabase } from './lib/supabase'

interface Props {
  onGoSignUp: () => void
  onForgot: () => void
  onSuccess: () => void
}

function SignIn({ onGoSignUp, onForgot, onSuccess }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({ email: false, password: false })
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    const newErrors = { email: !email.trim(), password: !password.trim() }
    setErrors(newErrors)
    if (newErrors.email || newErrors.password) return

    setLoading(true)
    setApiError('')

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })

    setLoading(false)

    if (error) {
      setApiError('Неверный email или пароль')
      return
    }

    onSuccess()
  }

  return (
    <div className="signup-page">
      <div className="signup-form">
        <div className="signup-header">
          <h1 className="signup-title">Вход</h1>
          <p className="signup-subtitle">Пожалуйста введите ваши данные</p>
        </div>

        <div className="form-fields">
          <div className="field-group">
            <label className="field-label">E-Mail</label>
            <input
              type="email"
              className={`field-input${errors.email ? ' field-error' : ''}`}
              placeholder="egor@daun.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: false })); setApiError('') }}
            />
            {errors.email && <span className="error-text">Введите email</span>}
          </div>

          <div className="field-group">
            <label className="field-label">Пароль</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className={`field-input password-input${errors.password ? ' field-error' : ''}`}
                placeholder="Минимум 10 символов"
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: false })); setApiError('') }}
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
            {errors.password && <span className="error-text">Введите пароль</span>}
            <div className="forgot-row">
              <a href="#" className="forgot-link" onClick={e => { e.preventDefault(); onForgot() }}>Забыли пароль?</a>
            </div>
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

        <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Загрузка...' : 'Войти'}
        </button>

        <p className="login-text">
          Еще нет аккаунта?{' '}
          <a href="#" className="login-link" onClick={e => { e.preventDefault(); onGoSignUp() }}>Создать аккаунт</a>
        </p>
      </div>
    </div>
  )
}

export default SignIn
