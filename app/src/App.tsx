import { useEffect, useState } from 'react'
import './App.css'
import { supabase } from './lib/supabase'
import SignUp from './SignUp'
import SignIn from './SignIn'
import VerifyEmail from './VerifyEmail'
import ForgotPassword from './ForgotPassword'
import ResetPassword from './ResetPassword'
import TermsPage from './TermsPage'
import PrivacyPage from './PrivacyPage'
import Onboarding from './Onboarding'
import Home from './Home'

type Page = 'signin' | 'signup' | 'verify' | 'forgot' | 'forgot-verify' | 'reset' | 'terms' | 'privacy' | 'onboarding' | 'home' | 'banned'

function App() {
  const [page, setPage] = useState<Page>('signup')
  const [prevPage, setPrevPage] = useState<Page>('signup')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)

  const ensureProfile = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId }, { onConflict: 'id' })
    if (error) console.error('ensureProfile error:', error)
  }

  // Restore session on mount
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (!mounted) return
        if (data.session) {
          await ensureProfile(data.session.user.id)
          const { data: profile } = await supabase
            .from('profiles')
            .select('banned')
            .eq('id', data.session.user.id)
            .maybeSingle()
          if (profile?.banned) {
            await supabase.auth.signOut()
            if (mounted) setPage('banned')
          } else {
            if (mounted) setPage('home')
          }
        }
      } catch (e) {
        console.error('getSession error:', e)
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        ensureProfile(session.user.id)
        if (page !== 'home') setPage('home')
      }
    })

    return () => { mounted = false; subscription.unsubscribe() }
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
    return <VerifyEmail email={email} type="recovery" onBack={() => setPage('forgot')} onSuccess={() => setPage('reset')} />
  }

  if (page === 'reset') {
    return (
      <ResetPassword
        onBack={() => setPage('signin')}
        onDone={async () => { await supabase.auth.signOut(); setPage('signin') }}
      />
    )
  }

  if (page === 'terms') {
    return <TermsPage onBack={() => setPage(prevPage)} />
  }

  if (page === 'privacy') {
    return <PrivacyPage onBack={() => setPage(prevPage)} />
  }

  if (page === 'onboarding') {
    return <Onboarding onDone={() => setPage('home')} onBack={() => setPage('signin')} />
  }

  if (page === 'banned') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#131315', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 0 }}>
        <h2 style={{ fontSize: 22, fontWeight: 500, color: '#fff', margin: '0 0 8px', textAlign: 'center' }}>Аккаунт заблокирован</h2>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, margin: '0 0 28px', textAlign: 'center' }}>Вы нарушили правила сервиса.</p>
        <button
          onClick={() => supabase.auth.signOut().then(() => setPage('signin'))}
          style={{ width: 320, padding: '18px 0', borderRadius: 18, border: 'none', background: '#ffffff', color: '#1a1a1a', cursor: 'pointer', fontSize: 15, fontWeight: 500, fontFamily: 'inherit', marginBottom: 20 }}
        >
          Выйти
        </button>
        <a href="mailto:support@example.com" style={{ color: '#2563eb', fontSize: 14, textDecoration: 'none' }}>
          Считаете что это ошибка? Нажмите здесь.
        </a>
      </div>
    )
  }

  if (page === 'home') {
    return <Home onLogout={handleLogout} onOpenTerms={() => { setPrevPage('home'); setPage('terms') }} onOpenPrivacy={() => { setPrevPage('home'); setPage('privacy') }} />
  }

  return page === 'signup'
    ? <SignUp
        onGoSignIn={() => setPage('signin')}
        onSuccess={e => { setEmail(e); setPage('verify') }}
        onOpenTerms={() => { setPrevPage('signup'); setPage('terms') }}
        onOpenPrivacy={() => { setPrevPage('signup'); setPage('privacy') }}
      />
    : <SignIn onGoSignUp={() => setPage('signup')} onForgot={() => setPage('forgot')} onSuccess={() => setPage('home')} />
}

export default App
