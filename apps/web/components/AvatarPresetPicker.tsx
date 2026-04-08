/**
 * Draggable floating panel for choosing a preset avatar.
 * Used on the account page and in the beheer edit panel.
 * 6 images visible at a time, scrollable. Framer Motion drag.
 */
import { motion } from 'framer-motion'
import { AVATAR_PRESETS } from '../constants/avatarPresets'

interface Props {
  currentAvatar?: string | null
  onSelect: (url: string) => void
  onClose: () => void
  uploading?: boolean
}

export default function AvatarPresetPicker({ currentAvatar, onSelect, onClose, uploading }: Props) {
  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.92, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 8 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 400,
        width: 300,
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border: '1px solid rgba(255,255,255,0.7)',
        borderRadius: 18,
        boxShadow: '0 28px 80px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        cursor: 'default',
        userSelect: 'none',
      }}
    >
      {/* Drag handle */}
      <div style={{
        padding: '14px 18px 12px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        cursor: 'grab',
        background: 'var(--bg-soft)',
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--black)' }}>Kies een preset</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--grey)' }}>Sleep om te verplaatsen</p>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 24, height: 24, borderRadius: '50%',
            border: '1px solid var(--border)', background: 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 12, color: 'var(--grey)',
            fontFamily: 'var(--font)',
          }}
        >
          ✕
        </button>
      </div>

      {/* Scrollable grid — 3 columns, ~2 rows visible */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
        padding: 14,
        maxHeight: 232,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        {AVATAR_PRESETS.map(url => {
          const isActive = currentAvatar === url
          return (
            <motion.button
              key={url}
              onClick={() => !uploading && onSelect(url)}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              style={{
                padding: 0,
                border: isActive ? '2.5px solid var(--black)' : '2px solid transparent',
                borderRadius: '50%',
                cursor: uploading ? 'wait' : 'pointer',
                background: 'var(--border)',
                overflow: 'hidden',
                aspectRatio: '1',
                display: 'block',
                outline: 'none',
                opacity: uploading ? 0.6 : 1,
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

      {/* Footer */}
      <div style={{
        padding: '10px 14px 14px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex', justifyContent: 'center',
      }}>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--grey)', textAlign: 'center', lineHeight: 1.4 }}>
          {uploading ? 'Uploaden…' : 'Klik een afbeelding om te kiezen'}
        </p>
      </div>
    </motion.div>
  )
}
