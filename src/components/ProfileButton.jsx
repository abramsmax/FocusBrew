import React, { useEffect, useRef, useState } from 'react'
import {
  hasSupabase,
  signOut,
  signInWithIdentifier,
  signUpWithEmailPassword,
  requestPasswordReset,
} from '../lib/cloud'

export default function ProfileButton({ session, cupsCount = 0 }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('menu') // menu | login | register | reset
  const ref = useRef(null)
  const [bottomOffset, setBottomOffset] = useState(16)

  // Compact auth form state
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Close on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (!ref.current) return
      if (open && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  // Keep the profile button above the footer if footer is visible
  useEffect(() => {
    const footer = document.getElementById('app-footer')
    if (!footer) return
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          // Footer visible, lift the button above it
          const h = entry.target.getBoundingClientRect().height
          setBottomOffset(16 + Math.ceil(h))
        } else {
          // Footer not visible
          setBottomOffset(16)
        }
      }
    }, { root: null, threshold: 0.01 })
    observer.observe(footer)
    return () => observer.disconnect()
  }, [])

  const user = session?.user
  const username = user?.user_metadata?.username || user?.email || (user?.id ? `${user.id.slice(0, 6)}…` : '')

  const resetMsgs = () => { setError(''); setSuccess('') }

  // Clear messages whenever the form mode changes (e.g., switching to register/reset)
  useEffect(() => {
    resetMsgs()
  }, [mode])

  const doSignIn = async () => {
    resetMsgs()
    const { error: err } = await signInWithIdentifier({ identifier, password })
    if (err) setError(err.message)
    else {
      setSuccess('Signed in!')
      setMode('menu')
    }
  }

  const doRegister = async () => {
    resetMsgs()
    if (!regEmail || !regUsername || !regPassword) {
      setError('Please fill email, username, and password')
      return
    }
    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) {
      setError('Please enter a valid email address')
      return
    }
    const { error: err } = await signUpWithEmailPassword({ email: regEmail, password: regPassword, username: regUsername })
  if (err) setError(err.message)
  else setSuccess('Registration successful! Please check your email to confirm your account.')
  }

  const doSendReset = async () => {
    resetMsgs()
    if (!resetEmail) { setError('Enter your email to reset password'); return }
    const { error: err } = await requestPasswordReset(resetEmail)
    if (err) setError(err.message)
    else setSuccess('Reset link sent. Check your email.')
  }

  return (
  <div ref={ref} style={{ ...styles.wrapper, bottom: bottomOffset }}>
      <button
        onClick={() => { setOpen((v) => !v); setMode('menu'); resetMsgs() }}
        style={styles.fab}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Profile"
      >
        Profile
      </button>
      {open && (
        <div style={styles.sheet} role="dialog" aria-label="Profile menu">
          {user ? (
            <div>
              <div style={styles.row}><span style={styles.label}>User</span><span>{username}</span></div>
              <div style={styles.row}><span style={styles.label}>Cups</span><span>{cupsCount}</span></div>
              <div style={{ height: 8 }} />
              <button onClick={() => { try { localStorage.setItem('focusbrew.signout', '1') } catch { /* ignore */ } resetMsgs(); signOut(); setOpen(false) }} style={styles.primaryBtn}>Sign out</button>
            </div>
          ) : (
            <div>
              {hasSupabase ? (
                <>
                  {mode === 'menu' && (
                    <div style={{ display: 'grid', gap: 8 }}>
                      <button style={styles.primaryBtn} onClick={() => setMode('login')}>Log in</button>
                      <button style={styles.secondaryBtn} onClick={() => setMode('register')}>Register</button>
                      <button style={styles.tertiaryBtn} onClick={() => setMode('reset')}>Reset password</button>
                    </div>
                  )}

                  {mode !== 'menu' && (
                    <div>
                      {error ? <div style={styles.error}>{error}</div> : null}
                      {success ? <div style={styles.success}>{success}</div> : null}
                      {mode === 'login' && (
                        <div style={{ display: 'grid', gap: 8 }}>
                          <input
                            type="text"
                            placeholder="username or email"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            style={styles.input}
                          />
                          <input
                            type="password"
                            placeholder="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={styles.input}
                          />
                          <button onClick={doSignIn} style={styles.primaryBtn}>Sign in</button>
                        </div>
                      )}
                      {mode === 'register' && (
                        <div style={{ display: 'grid', gap: 8 }}>
                          <input
                            type="email"
                            placeholder="email"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            style={styles.input}
                          />
                          <input
                            type="text"
                            placeholder="username"
                            value={regUsername}
                            onChange={(e) => setRegUsername(e.target.value)}
                            style={styles.input}
                          />
                          <input
                            type="password"
                            placeholder="password"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            style={styles.input}
                          />
                          <button onClick={doRegister} style={styles.primaryBtn}>Create account</button>
                        </div>
                      )}
                      {mode === 'reset' && (
                        <div style={{ display: 'grid', gap: 8 }}>
                          <input
                            type="email"
                            placeholder="your account email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            style={styles.input}
                          />
                          <button onClick={doSendReset} style={styles.primaryBtn}>Send reset link</button>
                        </div>
                      )}

                      <button onClick={() => { setMode('menu'); resetMsgs() }} style={{ ...styles.tertiaryBtn, marginTop: 8 }}>Back</button>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 12, opacity: 0.8 }}>Cloud auth not configured</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const styles = {
  wrapper: {
    position: 'fixed',
    bottom: 16,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 1000,
  },
  fab: {
    pointerEvents: 'auto',
    background: '#111',
    color: '#fff',
    border: '1px solid #333',
    borderRadius: 999,
    padding: '10px 16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
    cursor: 'pointer',
  },
  sheet: {
    position: 'absolute',
    bottom: 56,
    width: 'min(92vw, 360px)',
    background: '#fff',
    color: '#111',
    border: '1px solid #ddd',
    borderRadius: 12,
    padding: 12,
    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
    pointerEvents: 'auto',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '6px 2px',
    fontSize: 14,
  },
  label: { opacity: 0.7 },
  input: {
    fontSize: 14,
    padding: '8px 10px',
    width: '100%',
    border: '1px solid #ccc',
    borderRadius: 6,
  },
  primaryBtn: {
    background: '#111',
    color: '#fff',
    border: '1px solid #111',
    borderRadius: 6,
    padding: '8px 10px',
    cursor: 'pointer',
    width: '100%'
  },
  secondaryBtn: {
    background: '#fff',
    color: '#111',
    border: '1px solid #111',
    borderRadius: 6,
    padding: '8px 10px',
    cursor: 'pointer',
    width: '100%'
  },
  tertiaryBtn: {
    background: 'transparent',
    color: '#111',
    border: '1px solid #ddd',
    borderRadius: 6,
    padding: '8px 10px',
    cursor: 'pointer',
    width: '100%'
  },
  error: { color: 'crimson', fontSize: 12, marginBottom: 8 },
  success: { color: 'seagreen', fontSize: 12, marginBottom: 8 },
}
