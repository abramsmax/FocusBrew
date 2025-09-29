import React, { useState } from 'react'
import { updatePassword } from '../lib/cloud'

export default function ResetPassword({ onDone }) {
  const [pwd, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  // No recovery-session gate: the reset flow works without showing a warning.

  const submit = async () => {
    setError(''); setSuccess('')
    if (!pwd || pwd.length < 6) { setError('Password must be at least 6 characters'); return }
    if (pwd !== confirm) { setError('Passwords do not match'); return }
    const { error: err } = await updatePassword(pwd)
    if (err) setError(err.message)
    else {
      setSuccess('Password updated. You can now sign in.');
      if (onDone) setTimeout(onDone, 800)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: 24, maxWidth: 420 }}>
        <h1 style={{ marginBottom: 8 }}>Reset password</h1>
        {error ? <div style={{ color: 'crimson', marginBottom: 12 }}>{error}</div> : null}
        {success ? <div style={{ color: 'seagreen', marginBottom: 12 }}>{success}</div> : null}
        <input
          type="password"
          placeholder="new password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          style={{ fontSize: 14, padding: '8px 10px', width: '100%', marginBottom: 8 }}
        />
        <input
          type="password"
          placeholder="confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          style={{ fontSize: 14, padding: '8px 10px', width: '100%', marginBottom: 8 }}
        />
        <button onClick={submit} style={{ width: '100%' }}>Update password</button>
      </div>
    </div>
  )
}
