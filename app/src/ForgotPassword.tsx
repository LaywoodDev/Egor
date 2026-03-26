import { useState } from 'react'

interface Props {
  onBack: () => void
  onSuccess: (email: string) => void
}

function ForgotPassword({ onBack, onSuccess }: Props) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = () => {
    if (!email.trim()) {
      setError(true)
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

        <button
          className={`submit-btn${email.trim() ? '' : ' submit-btn--disabled'}`}
          onClick={handleSubmit}
        >
          Продолжить
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
