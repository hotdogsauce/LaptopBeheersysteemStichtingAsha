/**
 * Shown once per user (tracked by localStorage) right after first login.
 * Step 1: Choose a preset avatar (or skip / upload later).
 * Step 2: Tutorial prompt (placeholder — tutorial not yet built).
 *
 * Flag: localStorage key `asha-onboarded-{userId}`
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser, gql } from '../context/UserContext'
import { AVATAR_PRESETS } from '../constants/avatarPresets'
import Avatar from './Avatar'

const OVERLAY: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 500,
  background: 'rgba(0,0,0,0.38)',
  backdropFilter: 'blur(12px) saturate(1.1)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 24,
}

const CARD: React.CSSProperties = {
  background: 'var(--white)',
  borderRadius: 22,
  boxShadow: '0 32px 96px rgba(0,0,0,0.22)',
  width: '100%',
  maxWidth: 400,
  overflow: 'hidden',
}

type Step = 'avatar' | 'tutorial'

interface Props { onDone: () => void }

export default function FirstLoginFlow({ onDone }: Props) {
  const { loggedInUser, users } = useUser()
  const myUser = users.find(u => u.id === loggedInUser?.userId)

  const [step,      setStep]      = useState<Step>('avatar')
  const [selected,  setSelected]  = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  async function applyPreset(url: string) {
    if (!loggedInUser) return
    setSelected(url)
    setUploading(true)
    // Fetch image → canvas → base64 → uploadAvatar
    try {
      const resp   = await fetch(url)
      const blob   = await resp.blob()
      const bitmap = await createImageBitmap(blob)
      const canvas = document.createElement('canvas')
      canvas.width = 80; canvas.height = 80
      const ctx    = canvas.getContext('2d')!
      const s      = Math.min(bitmap.width, bitmap.height)
      const sx     = (bitmap.width  - s) / 2
      const sy     = (bitmap.height - s) / 2
      ctx.beginPath()
      ctx.arc(40, 40, 40, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(bitmap, sx, sy, s, s, 0, 0, 80, 80)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      await gql(
        `mutation($userId: ID!, $avatar: String!) { uploadAvatar(userId: $userId, avatar: $avatar) { id avatar } }`,
        { userId: loggedInUser.userId, avatar: dataUrl },
        loggedInUser.userId
      )
    } catch {
      // Silent — user can change later
    }
    setUploading(false)
  }

  function finishAvatar() {
    setStep('tutorial')
  }

  function finishTutorial() {
    if (loggedInUser) {
      localStorage.setItem(`asha-onboarded-${loggedInUser.userId}`, '1')
    }
    onDone()
  }

  return (
    <div style={OVERLAY}>
      <AnimatePresence mode="wait">
        {step === 'avatar' && (
          <motion.div
            key="avatar"
            style={CARD}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{    opacity: 0, y: -16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          >
            {/* Header */}
            <div style={{ padding: '28px 28px 0', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <Avatar
                  name={loggedInUser?.name || '?'}
                  avatar={selected || myUser?.avatar}
                  size={64}
                />
              </div>
              <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' }}>
                Welkom, {loggedInUser?.name?.split(' ')[0]}
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--grey)', lineHeight: 1.5 }}>
                Kies een profielfoto om te beginnen, of sla dit over.
              </p>
            </div>

            {/* Avatar grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              padding: '20px 20px 0',
              maxHeight: 230,
              overflowY: 'auto',
            }}>
              {AVATAR_PRESETS.map(url => {
                const isActive = selected === url
                return (
                  <motion.button
                    key={url}
                    onClick={() => applyPreset(url)}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                    style={{
                      padding: 0,
                      border: isActive ? '2.5px solid var(--black)' : '2px solid transparent',
                      borderRadius: 10,
                      cursor: uploading ? 'wait' : 'pointer',
                      background: 'var(--border)',
                      overflow: 'hidden',
                      aspectRatio: '1',
                      display: 'block',
                      outline: 'none',
                      opacity: uploading && !isActive ? 0.5 : 1,
                      transition: 'border-color 0.15s, opacity 0.15s',
                    }}
                  >
                    <img
                      src={url}
                      alt=""
                      draggable={false}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </motion.button>
                )
              })}
            </div>

            {/* Actions */}
            <div style={{ padding: '20px 28px 28px', display: 'flex', gap: 10, flexDirection: 'column' }}>
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={finishAvatar}
                disabled={uploading}
              >
                {uploading ? 'Uploaden…' : selected ? 'Doorgaan' : 'Doorgaan zonder foto'}
              </button>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--grey)', textAlign: 'center' }}>
                Je kunt dit altijd later wijzigen via Mijn account.
              </p>
            </div>
          </motion.div>
        )}

        {step === 'tutorial' && (
          <motion.div
            key="tutorial"
            style={CARD}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{    opacity: 0, y: -16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          >
            <div style={{ padding: '36px 32px 32px', textAlign: 'center' }}>
              {/* Compass illustration */}
              <svg viewBox="0 0 80 80" fill="none" style={{ width: 64, height: 64, margin: '0 auto 20px', opacity: 0.18 }}>
                <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="2" />
                <circle cx="40" cy="40" r="28" stroke="currentColor" strokeWidth="1" opacity="0.5" />
                <circle cx="40" cy="40" r="2.5" fill="currentColor" />
                <polygon points="40,6 36,40 44,40" fill="currentColor" />
                <polygon points="40,74 36,40 44,40" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <polygon points="74,40 40,36 40,44" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <polygon points="6,40 40,36 40,44" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>

              <h2 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' }}>
                Rondleiding starten?
              </h2>
              <p style={{ margin: '0 0 28px', fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>
                We kunnen je in een korte rondleiding laten zien hoe het systeem werkt.
                Dit is volledig optioneel.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={finishTutorial}
                >
                  {/* Tutorial not built yet — placeholder */}
                  Rondleiding overslaan
                </button>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--grey)' }}>
                  Rondleiding is nog niet beschikbaar — binnenkort!
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
