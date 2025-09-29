// Supabase client + helpers for optional cloud sync
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const hasSupabase = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = hasSupabase
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Fetch cups for a userId. Returns [] on error or when not configured.
export async function fetchCupsCloud(userId) {
  // Return null when cloud is unavailable or an error occurs, to distinguish from truly empty []
  if (!hasSupabase || !userId) return null
  // Try selecting cup_id if present; fallback works even if column is missing
  const { data, error } = await supabase
    .from('cups')
    .select('type, awarded_at, duration_sec, cup_id')
    .eq('user_id', userId)
    .order('awarded_at', { ascending: true })

  if (error) {
    console.warn('Supabase fetch error:', error.message)
    return null
  }
  return (data || []).map((row) => ({
    id: row.cup_id || undefined,
    type: row.type,
    awardedAt: row.awarded_at,
    durationSec: row.duration_sec,
  }))
}

// Upsert cups for a userId by ADDING any missing entries (never delete).
// Two entries are considered the same if (awarded_at,type) match.
export async function upsertCupsCloud(userId, cups) {
  if (!hasSupabase || !userId || !Array.isArray(cups) || cups.length === 0) return
  // Fetch existing keys for this user to avoid duplicates
  const { data: existing, error: fetchErr } = await supabase
    .from('cups')
    .select('cup_id, awarded_at, type, duration_sec')
    .eq('user_id', userId)
  if (fetchErr) {
    console.warn('Supabase fetch existing error:', fetchErr.message)
    return
  }
  const existingKeys = new Set((existing || []).map((r) => r.cup_id ? `id:${r.cup_id}` : `${r.awarded_at ?? ''}|${r.type}|${r.duration_sec ?? ''}`))
  const toInsert = cups.filter((c) => {
    const key = c.id ? `id:${c.id}` : `${c.awardedAt ?? ''}|${c.type}|${c.durationSec ?? ''}`
    return !existingKeys.has(key)
  })
  if (toInsert.length === 0) return
  const payload = toInsert.map((c) => ({
    user_id: userId,
    type: c.type,
    awarded_at: c.awardedAt || new Date().toISOString(),
    duration_sec: typeof c.durationSec === 'number' ? c.durationSec : null,
    cup_id: c.id || null,
  }))
  const { error: insErr } = await supabase.from('cups').insert(payload)
  if (insErr) {
    console.warn('Supabase insert error:', insErr.message)
  }
}

// -------- Auth helpers (optional; no-ops when not configured) --------

export async function getSession() {
  if (!hasSupabase) return null
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    console.warn('Supabase getSession error:', error.message)
    return null
  }
  return data?.session ?? null
}

export function onAuthStateChange(callback) {
  if (!hasSupabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    try { callback(event, session ?? null) } catch (e) { void e; /* noop */ }
  })
  return () => {
    try { data.subscription.unsubscribe() } catch (e) { void e; /* noop */ }
  }
}

export async function signOut() {
  if (!hasSupabase) return
  const { error } = await supabase.auth.signOut()
  if (error) console.warn('Supabase signOut error:', error.message)
}

// -------- Email/Password + Username support --------
export async function signUpWithEmailPassword({ email, password, username }) {
  if (!hasSupabase) return { error: new Error('Supabase not configured') }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } }, // store in user_metadata too
  })
  // Supabase quirk: when an email is already registered, some configurations return a user
  // with identities = [] and no explicit error. Treat that as a duplicate account.
  if (data?.user && (!Array.isArray(data.user.identities) || data.user.identities.length === 0)) {
    return { error: new Error('An account already exists with that email. Please sign in or reset your password.') }
  }

  if (error) {
    const msg = (error.message || '').toLowerCase()
    const looksDuplicate =
      msg.includes('already registered') ||
      msg.includes('already exists') ||
      msg.includes('exists') && msg.includes('email') ||
      msg.includes('duplicate') && msg.includes('email')
    if (looksDuplicate) {
      return { error: new Error('An account already exists with that email. Please sign in or reset your password.') }
    }
    return { error }
  }
  // If email confirmations are OFF, a session will exist now and we can create the profile immediately
  if (username && data?.session && data?.user?.id) {
    const { error: pErr } = await supabase.from('profiles').insert({
      user_id: data.user.id,
      email,
      username,
    })
    if (pErr) {
      // Non-fatal; will be handled on first login by ensureProfileForSession
      console.warn('Profile insert on sign-up failed:', pErr.message)
    }
  }
  return { data }
}

export async function signInWithPasswordEmail({ email, password }) {
  if (!hasSupabase) return { error: new Error('Supabase not configured') }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signInWithIdentifier({ identifier, password }) {
  if (!hasSupabase) return { error: new Error('Supabase not configured') }
  // If identifier looks like an email, sign in directly
  if (identifier.includes('@')) {
    return signInWithPasswordEmail({ email: identifier, password })
  }
  // Otherwise treat as username. Prefer RPC to bypass RLS safely via SECURITY DEFINER function
  let email = null
  const { data: rpcEmail, error: rpcErr } = await supabase.rpc('get_email_for_username', { in_username: identifier })
  if (!rpcErr && rpcEmail) {
    email = typeof rpcEmail === 'string' ? rpcEmail : rpcEmail?.email
  } else {
    // Fallback: direct select (will fail if RLS blocks anonymous select)
    const { data: prof, error: pErr } = await supabase
      .from('profiles')
  .select('email')
  .ilike('username', identifier)
      .maybeSingle()
    if (!pErr && prof?.email) email = prof.email
  }
  if (!email) return { error: new Error('Username not found') }
  return signInWithPasswordEmail({ email, password })
}

// Ensure there's a profiles row for this session's user; optionally attempt a desired username
export async function ensureProfileForSession(session, desiredUsername) {
  if (!hasSupabase || !session?.user) return null
  const { id, email, user_metadata } = session.user
  // 1) check existing
  const { data: existing, error: getErr } = await supabase
    .from('profiles')
    .select('user_id,email,username')
    .eq('user_id', id)
    .maybeSingle()
  if (!getErr && existing) return existing

  // 2) create new
  const base = (desiredUsername || user_metadata?.username || (email ? email.split('@')[0] : 'user'))
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .slice(0, 20)
    || 'user'

  // try a few candidates to satisfy unique constraint
  const candidates = [base, `${base}${Math.floor(Math.random()*1000)}`, `${base}_${Math.floor(Math.random()*10000)}`]
  for (const candidate of candidates) {
    const { data: ins, error: insErr } = await supabase.from('profiles').insert({
      user_id: id,
      email,
      username: candidate,
    }).select('user_id,email,username').maybeSingle()
    if (!insErr && ins) return ins
  }
  console.warn('Failed to create profile for user; username may be conflicting')
  return null
}

// -------- Password reset helpers --------
export async function requestPasswordReset(email) {
  if (!hasSupabase) return { error: new Error('Supabase not configured') }
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    // Do NOT include a hash here; Supabase will append access_token & type=recovery in the hash
    redirectTo: window.location.origin,
  })
  return { data, error }
}

export async function updatePassword(newPassword) {
  if (!hasSupabase) return { error: new Error('Supabase not configured') }
  const { data, error } = await supabase.auth.updateUser({ password: newPassword })
  return { data, error }
}
