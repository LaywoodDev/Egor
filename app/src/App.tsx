import { useEffect, useState } from 'react'
import './App.css'
import { supabase } from './lib/supabase'
import SignUp from './SignUp'
import SignIn from './SignIn'
import VerifyEmail from './VerifyEmail'
import ForgotPassword from './ForgotPassword'
import Onboarding from './Onboarding'
import Home from './Home'

type Page = 'signin' | 'signup' | 'verify' | 'forgot' | 'forgot-verify' | 'onboarding' | 'home' | 'banned'

function App() {
  const [page, setPage] = useState<Page>('signup')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)

  // Restore session on mount
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('banned')
          .eq('id', data.session.user.id)
          .single()
        if (profile?.banned) {
          await supabase.auth.signOut()
          setPage('banned')
        } else {
          setPage('home')
        }
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && page !== 'home') setPage('home')
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setPage('signup')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100svh' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (page === 'verify') {
    return <VerifyEmail email={email} onBack={() => setPage('signup')} onSuccess={() => setPage('onboarding')} />
  }

  if (page === 'forgot') {
    return <ForgotPassword onBack={() => setPage('signin')} onSuccess={e => { setEmail(e); setPage('forgot-verify') }} />
  }

  if (page === 'forgot-verify') {
    return <VerifyEmail email={email} type="recovery" onBack={() => setPage('forgot')} />
  }

  if (page === 'onboarding') {
    return <Onboarding onDone={() => setPage('home')} onBack={() => setPage('signin')} />
  }

  if (page === 'banned') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100svh', gap: 16, padding: 24 }}>
        <div style={{ fontSize: 48 }}>🚫</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', margin: 0 }}>Аккаунт заблокирован</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0, textAlign: 'center' }}>Ваш аккаунт был заблокирован администратором</p>
        <button onClick={() => setPage('signin')} style={{ padding: '10px 24px', borderRadius: 18, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#ffffff', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
          Войти в другой аккаунт
        </button>
      </div>
    )
  }

  if (page === 'home') {
    return <Home onLogout={handleLogout} />
  }

  return page === 'signup'
    ? <SignUp onGoSignIn={() => setPage('signin')} onSuccess={e => { setEmail(e); setPage('verify') }} />
    : <SignIn onGoSignUp={() => setPage('signup')} onForgot={() => setPage('forgot')} onSuccess={() => setPage('home')} />
}

export default App
