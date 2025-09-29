import React, { useEffect, useState } from 'react'
import Timer from './components/Timer'
import Shelf from './components/Shelf'
import ProfileButton from './components/ProfileButton'
import FooterCredits from './components/FooterCredits'
import Login from './components/Login'
import ResetPassword from './components/ResetPassword'
import './App.css'
import { hasSupabase, fetchCupsCloud, upsertCupsCloud, getSession, onAuthStateChange, ensureProfileForSession } from './lib/cloud'

function App() {
  const [view, setView] = useState('timer');
  const [cups, setCups] = useState([]);
  const [diamondSchedule, setDiamondSchedule] = useState({ since: 0, nextAt: 0 });
  // Gate autosave to cloud until initial fetch/merge after login completes
  const [cloudSyncReady, setCloudSyncReady] = useState(false)

  const DIAMOND_STORAGE_KEY = 'focusbrew.diamond';
  const CUPS_STORAGE_KEY = 'focusbrew.cups';
  const randBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  // Local persistence keys
  const USER_ID_KEY = 'focusbrew.user';

  // Supabase auth session (if enabled)
  const [session, setSession] = useState(null)
  const [isRecovery, setIsRecovery] = useState(false)

  // Simple UUID v4 generator (no external deps)
  const uuidv4 = () => {
    // credit: RFC4122-ish random UUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (crypto?.getRandomValues?.(new Uint8Array(1))[0] ?? Math.floor(Math.random()*256)) & 15
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  // Load saved cups on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CUPS_STORAGE_KEY) || '[]');
      if (Array.isArray(saved)) {
        // migrate legacy string entries to object form
        const migrated = saved.map((entry) => (
          typeof entry === 'string'
            ? { type: entry, awardedAt: new Date().toISOString(), durationSec: null }
            : entry
        ));
        setCups(migrated);
      }
      // load diamond schedule
      const savedSched = JSON.parse(localStorage.getItem(DIAMOND_STORAGE_KEY) || 'null');
      if (savedSched && typeof savedSched.since === 'number' && typeof savedSched.nextAt === 'number' && savedSched.nextAt >= 1) {
        setDiamondSchedule(savedSched);
      } else {
        setDiamondSchedule({ since: 0, nextAt: randBetween(10, 20) });
      }
      // If supabase is enabled, initialize session and subscribe
      if (hasSupabase) {
        getSession().then((s) => {
          setSession(s)
          const hash = window.location.hash || ''
          if (hash.includes('type=recovery') || hash.includes('access_token')) setIsRecovery(true)
        })
        const unsubscribe = onAuthStateChange((event, s) => {
          setSession(s)
          const hash = window.location.hash || ''
          if (event === 'PASSWORD_RECOVERY' || hash.includes('type=recovery') || hash.includes('access_token')) setIsRecovery(true)
          // On sign out, clear local cups ONLY when explicitly initiated by the user
          if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            const userInitiated = (() => { try { return localStorage.getItem('focusbrew.signout') === '1' } catch { return false } })()
            if (userInitiated) {
              try { localStorage.removeItem(CUPS_STORAGE_KEY) } catch { /* ignore */ }
              setCups([])
            }
            try { localStorage.removeItem('focusbrew.signout') } catch { /* ignore */ }
          }
        })
        // Clean up on unmount
        return () => unsubscribe()
      }
  } catch {
      console.warn('Failed to load cups from storage');
    }
  }, []);

  // When logging in, fetch cloud cups and merge non-destructively
  useEffect(() => {
    if (hasSupabase && session?.user?.id) {
  // ensure a profile row exists so future username logins work reliably
  ensureProfileForSession(session)
      setCloudSyncReady(false)
      const uid = session.user.id
      const MERGE_FLAG = `focusbrew.merged.${uid}`
      const localCups = (() => {
        try { return JSON.parse(localStorage.getItem(CUPS_STORAGE_KEY) || '[]') } catch { return [] }
      })()
  fetchCupsCloud(uid).then(async (cloudCups) => {
        const alreadyMerged = localStorage.getItem(MERGE_FLAG) === '1'
        const hasLocal = Array.isArray(localCups) && localCups.length > 0

    // Helper: dedupe preferring stable id, fallback to awardedAt+type+durationSec
    const dedupe = (arr) => {
          const seen = new Set()
          return (arr || []).filter((c) => {
      const key = c.id ? `id:${c.id}` : `${c.awardedAt ?? ''}|${c.type}|${c.durationSec ?? ''}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
          }).sort((a,b) => new Date(a.awardedAt) - new Date(b.awardedAt))
        }

        if (cloudCups === null) {
          // Cloud unavailable/error; keep local, but DO NOT enable cloud upserts
          setCups(dedupe(localCups))
          setCloudSyncReady(false)
          return
        }

        if ((cloudCups || []).length > 0) {
          // Merge cloud + local; show everything (older cloud entries preserved)
          const merged = dedupe([...(cloudCups || []), ...(localCups || [])])
          setCups(merged)
          // Add-only upsert: insert only truly new local entries
          if (!alreadyMerged && hasLocal) {
            await upsertCupsCloud(uid, localCups)
            localStorage.setItem(MERGE_FLAG, '1')
            try { localStorage.removeItem(CUPS_STORAGE_KEY) } catch { /* ignore */ }
          } else if (!alreadyMerged) {
            localStorage.setItem(MERGE_FLAG, '1')
          }
          try { localStorage.removeItem(CUPS_STORAGE_KEY) } catch { /* ignore */ }
          setCloudSyncReady(true)
        } else {
          // Cloud empty; push local if any, otherwise keep as-is
          if (hasLocal && !alreadyMerged) {
            await upsertCupsCloud(uid, localCups)
            setCups(dedupe(localCups))
            localStorage.setItem(MERGE_FLAG, '1')
            // Clear local after first push to cloud
            try { localStorage.removeItem(CUPS_STORAGE_KEY) } catch { /* ignore */ }
          } else {
            // Keep whatever is already in state (likely local)
            setCups((prev) => dedupe(prev))
            if (!alreadyMerged) localStorage.setItem(MERGE_FLAG, '1')
          }
          // Ensure local cups are cleared while signed in
          try { localStorage.removeItem(CUPS_STORAGE_KEY) } catch { /* ignore */ }
          setCloudSyncReady(true)
        }
      })
    }
  }, [session])

  // Save cups when changed
  useEffect(() => {
    try {
      if (session?.user?.id) {
        // While signed in, keep local cups cleared to prevent duplication
        localStorage.removeItem(CUPS_STORAGE_KEY)
      } else {
        // Signed out: persist locally for reloads
        if (Array.isArray(cups) && cups.length > 0) {
          localStorage.setItem(CUPS_STORAGE_KEY, JSON.stringify(cups))
        } else {
          localStorage.removeItem(CUPS_STORAGE_KEY)
        }
      }
    } catch { /* ignore */ }
    if (hasSupabase && session?.user?.id && cloudSyncReady) {
      upsertCupsCloud(session.user.id, cups)
    }
  }, [cups, session, cloudSyncReady]);

  // Save diamond schedule when changed
  useEffect(() => {
    localStorage.setItem(DIAMOND_STORAGE_KEY, JSON.stringify(diamondSchedule));
  }, [diamondSchedule]);

  const handleAddCup = (cup) => {
    // accept legacy string or new object
    const normalized = typeof cup === 'string'
  ? { id: uuidv4(), type: cup, awardedAt: new Date().toISOString(), durationSec: null }
  : { id: cup.id || uuidv4(), ...cup };

    // decide diamond award based on schedule; only count non-diamond awards toward the schedule
    if (normalized.type !== 'diamond') {
      const nextSince = diamondSchedule.since + 1;
      if (nextSince >= diamondSchedule.nextAt) {
        // Award a diamond instead of the normal cup
        const diamond = {
          id: uuidv4(),
          type: 'diamond',
          awardedAt: new Date().toISOString(),
          durationSec: normalized.durationSec ?? null,
        };
        setCups((prev) => [...prev, diamond]);
        setDiamondSchedule({ since: 0, nextAt: randBetween(10, 20) });
        return;
      } else {
        setDiamondSchedule((prev) => ({ ...prev, since: nextSince }));
      }
    }

    setCups((prev) => [...prev, normalized]);
  };

  return (
    <div className="App">
      {hasSupabase && isRecovery ? (
        <ResetPassword onDone={() => { setIsRecovery(false); window.history.replaceState(null, '', window.location.pathname) }} />
      ) : (
        <>
          <div className="AppContent">
            {/* App remains usable; show timer/shelf. Profile button at bottom handles auth options. */}
            {view === 'timer' ? (
              <Timer onOpenShelf={() => setView('shelf')} onAwardCup={handleAddCup} />
            ) : (
              <Shelf
                cups={cups}
                isSignedIn={Boolean(hasSupabase && session?.user)}
                onBack={() => setView('timer')}
              />
            )}
          </div>
          <ProfileButton session={session} cupsCount={cups.length} />
          <FooterCredits />
        </>
      )}
    </div>
  )
}

export default App
