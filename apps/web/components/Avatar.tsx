interface AvatarProps {
  name: string
  avatar?: string | null
  size?: number
}

export default function Avatar({ name, avatar, size = 36 }: AvatarProps) {
  const initial = name.charAt(0).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
      background: 'var(--bg-soft)', border: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 600, color: 'var(--grey)',
    }}>
      {avatar
        ? <img src={avatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initial}
    </div>
  )
}
