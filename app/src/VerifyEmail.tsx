import { useRef, useState } from 'react'
import type { KeyboardEvent, ClipboardEvent } from 'react'
import { supabase } from './lib/supabase'

interface Props {
  email: string
  type?: 'signup' | 'recovery'
  onBack: () => void
  onSuccess?: () => void
}

const LENGTH = 6

function VerifyEmail({ email, type = 'signup', onBack, onSuccess }: Props) {
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const filled = digits.every(d => d !== '')

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    setError('')
    if (digit && index < LENGTH - 1) {
      inputs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH)
    const next = Array(LENGTH).fill('')
    pasted.split('').forEach((ch, i) => { next[i] = ch })
    setDigits(next)
    const focusIndex = Math.min(pasted.length, LENGTH - 1)
    inputs.current[focusIndex]?.focus()
  }

  const handleSubmit = async () => {
    if (!filled || loading) return
    setLoading(true)
    setError('')

    const token = digits.join('')
    const { error: err } = await supabase.auth.verifyOtp({
      email,
      token,
      type,
    })

    setLoading(false)

    if (err) {
      setError('Неверный или истёкший код. Попробуйте ещё раз.')
      setDigits(Array(LENGTH).fill(''))
      inputs.current[0]?.focus()
      return
    }

    onSuccess?.()
  }

  const handleResend = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (type === 'signup') {
      await supabase.auth.resend({ type: 'signup', email })
    } else {
      await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    }
  }

  return (
    <div className="signup-page">
      <div className="signup-form">
        <div className="signup-header">
          <h1 className="signup-title">Подтверждение действия</h1>
          <p className="signup-subtitle">
            Мы отправили шестизначный код на почту{' '}
            <span className="verify-email-highlight">{email}</span>, чтобы убедиться,
            что вы – настоящий её владелец.
          </p>
        </div>

        <div className="form-fields">
          <div className="field-group">
            <label className="field-label">Код с почты</label>
            <div className="otp-row">
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { inputs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className={`otp-input${error ? ' field-error' : ''}`}
                  value={digit}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                />
              ))}
            </div>
            {error && (
              <div className="alert alert--error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}
          </div>
        </div>

        <button
          className={`submit-btn${filled && !loading ? '' : ' submit-btn--disabled'}`}
          disabled={!filled || loading}
          onClick={handleSubmit}
        >
          {loading ? 'Проверка...' : 'Продолжить'}
        </button>

        <p className="verify-resend">
          <a href="#" className="login-link" onClick={handleResend}>Отправить код повторно</a>
        </p>

        <p className="login-text">
          <a href="#" className="forgot-link" onClick={e => { e.preventDefault(); onBack() }}>
            Назад
          </a>
        </p>
      </div>
    </div>
  )
}

export default VerifyEmail
