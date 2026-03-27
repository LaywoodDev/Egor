import { useState } from 'react'
import { supabase } from './lib/supabase'

interface Props {
  onBack: () => void
  onSuccess: (email: string) => void
}

function ForgotPassword({ onBack, onSuccess }: Props) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(false)
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError(true)
      return
    }
    setLoading(true)
    setApiError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    })
    setLoading(false)
    if (err) {
      setApiError(err.message)
      return
    }
    onSuccess(email.trim())
  }

  return (
    <div className="signup-page">
      <div className="signup-form">
        <div className="signup-header">
          <h1 className="signup-title">Забыли пароль?</h1>
          <p className="signup-subtitle">Введите ваш E-Mail для восстановления</p>
        </div>

        <div className="form-fields">
          <div className="field-group">
            <label className="field-label">E-Mail</label>
            <input
              type="email"
              className={`field-input${error ? ' field-error' : ''}`}
              placeholder="egor@daun.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(false) }}
            />
            {error && <span className="error-text">Введите email</span>}
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
          className={`submit-btn${email.trim() && !loading ? '' : ' submit-btn--disabled'}`}
          onClick={handleSubmit}
          disabled={!email.trim() || loading}
        >
          {loading ? 'Отправка...' : 'Продолжить'}
        </button>

        <p className="login-text">
          <a href="#" className="login-link" onClick={e => { e.preventDefault(); onBack() }}>
            Вернуться ко входу
          </a>
        </p>
      </div>
    </div>
  )
}

export default ForgotPassword

