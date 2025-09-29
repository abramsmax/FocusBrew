import React, { useState } from 'react'
import { hasSupabase, signInWithIdentifier, signUpWithEmailPassword, requestPasswordReset } from '../lib/cloud'

export default function Login() {
  const [identifier, setIdentifier] = useState('') // username or email
  const [password, setPassword] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resetEmail, setResetEmail] = useState('')

  if (!hasSupabase) return null

  const doSignIn = async () => {
    setError(''); setSuccess('')
    const { error: err } = await signInWithIdentifier({ identifier, password })
    if (err) setError(err.message)
  }

  const doRegister = async () => {
    setError(''); setSuccess('')
    if (!regEmail || !regUsername || !regPassword) {
      setError('Please fill email, username, and password')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) {
      setError('Please enter a valid email address')
      return
    }
    const { error: err } = await signUpWithEmailPassword({ email: regEmail, password: regPassword, username: regUsername })
  if (err) setError(err.message)
  else setSuccess('Registration successful! Please check your email to confirm your account.')
  }

  const doSendReset = async () => {
    setError(''); setSuccess('')
    if (!resetEmail) { setError('Enter your email to reset password'); return }
    const { error: err } = await requestPasswordReset(resetEmail)
    if (err) setError(err.message)
    else setSuccess('Reset link sent. Check your email.')
  }

  return (
    <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: 24, maxWidth: 440 }}>
        <h1 style={{ marginBottom: 8 }}>FocusBrew</h1>
        <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.8 }}>Sign in or create an account</p>
        {error ? <div style={{ color: 'crimson', marginBottom: 12 }}>{error}</div> : null}
        {success ? <div style={{ color: 'seagreen', marginBottom: 12 }}>{success}</div> : null}

  <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px 0' }}>Sign in</h3>
          <input
            type="text"
            placeholder="username or email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            style={{ fontSize: 14, padding: '8px 10px', width: '100%', marginBottom: 8 }}
          />
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ fontSize: 14, padding: '8px 10px', width: '100%', marginBottom: 8 }}
          />
          <button onClick={doSignIn} style={{ width: '100%' }}>Sign in</button>
        </div>

  <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px 0' }}>Register</h3>
          <input
            type="email"
            placeholder="email"
            value={regEmail}
            onChange={(e) => setRegEmail(e.target.value)}
            style={{ fontSize: 14, padding: '8px 10px', width: '100%', marginBottom: 8 }}
          />
          <input
            type="text"
            placeholder="username"
            value={regUsername}
            onChange={(e) => setRegUsername(e.target.value)}
            style={{ fontSize: 14, padding: '8px 10px', width: '100%', marginBottom: 8 }}
          />
          <input
            type="password"
            placeholder="password"
            value={regPassword}
            onChange={(e) => setRegPassword(e.target.value)}
            style={{ fontSize: 14, padding: '8px 10px', width: '100%', marginBottom: 8 }}
          />
          <button onClick={doRegister} style={{ width: '100%' }}>Create account</button>
        </div>

        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
          <h3 style={{ margin: '0 0 12px 0' }}>Forgot password</h3>
          <input
            type="email"
            placeholder="your account email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            style={{ fontSize: 14, padding: '8px 10px', width: '100%', marginBottom: 8 }}
          />
          <button onClick={doSendReset} style={{ width: '100%' }}>Send reset link</button>
        </div>
      </div>
    </div>
  )
}
