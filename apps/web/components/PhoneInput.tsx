import { useEffect, useRef, useState } from 'react'

export interface Country {
  code: string  // ISO 3166-1 alpha-2
  dial: string  // e.g. "+31"
  flag: string  // emoji
  name: string
}

const COUNTRIES: Country[] = [
  // Most relevant first (Netherlands-based org)
  { code: 'NL', dial: '+31',  flag: '🇳🇱', name: 'Nederland' },
  { code: 'SR', dial: '+597', flag: '🇸🇷', name: 'Suriname' },
  { code: 'AW', dial: '+297', flag: '🇦🇼', name: 'Aruba' },
  { code: 'CW', dial: '+599', flag: '🇨🇼', name: 'Curaçao' },
  { code: 'BE', dial: '+32',  flag: '🇧🇪', name: 'België' },
  { code: 'DE', dial: '+49',  flag: '🇩🇪', name: 'Duitsland' },
  { code: 'FR', dial: '+33',  flag: '🇫🇷', name: 'Frankrijk' },
  { code: 'GB', dial: '+44',  flag: '🇬🇧', name: 'Verenigd Koninkrijk' },
  { code: 'US', dial: '+1',   flag: '🇺🇸', name: 'Verenigde Staten' },
  { code: 'TR', dial: '+90',  flag: '🇹🇷', name: 'Turkije' },
  { code: 'MA', dial: '+212', flag: '🇲🇦', name: 'Marokko' },
  { code: 'GH', dial: '+233', flag: '🇬🇭', name: 'Ghana' },
  { code: 'NG', dial: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: 'ID', dial: '+62',  flag: '🇮🇩', name: 'Indonesië' },
  { code: 'CN', dial: '+86',  flag: '🇨🇳', name: 'China' },
  { code: 'IN', dial: '+91',  flag: '🇮🇳', name: 'India' },
  { code: 'PK', dial: '+92',  flag: '🇵🇰', name: 'Pakistan' },
  // Rest alphabetically
  { code: 'AF', dial: '+93',  flag: '🇦🇫', name: 'Afghanistan' },
  { code: 'AL', dial: '+355', flag: '🇦🇱', name: 'Albanië' },
  { code: 'DZ', dial: '+213', flag: '🇩🇿', name: 'Algerije' },
  { code: 'AR', dial: '+54',  flag: '🇦🇷', name: 'Argentinië' },
  { code: 'AM', dial: '+374', flag: '🇦🇲', name: 'Armenië' },
  { code: 'AU', dial: '+61',  flag: '🇦🇺', name: 'Australië' },
  { code: 'AZ', dial: '+994', flag: '🇦🇿', name: 'Azerbeidzjan' },
  { code: 'BD', dial: '+880', flag: '🇧🇩', name: 'Bangladesh' },
  { code: 'BA', dial: '+387', flag: '🇧🇦', name: 'Bosnië-Herzegovina' },
  { code: 'BR', dial: '+55',  flag: '🇧🇷', name: 'Brazilië' },
  { code: 'BG', dial: '+359', flag: '🇧🇬', name: 'Bulgarije' },
  { code: 'CA', dial: '+1',   flag: '🇨🇦', name: 'Canada' },
  { code: 'CL', dial: '+56',  flag: '🇨🇱', name: 'Chili' },
  { code: 'CO', dial: '+57',  flag: '🇨🇴', name: 'Colombia' },
  { code: 'HR', dial: '+385', flag: '🇭🇷', name: 'Kroatië' },
  { code: 'CY', dial: '+357', flag: '🇨🇾', name: 'Cyprus' },
  { code: 'CZ', dial: '+420', flag: '🇨🇿', name: 'Tsjechië' },
  { code: 'DK', dial: '+45',  flag: '🇩🇰', name: 'Denemarken' },
  { code: 'EG', dial: '+20',  flag: '🇪🇬', name: 'Egypte' },
  { code: 'ET', dial: '+251', flag: '🇪🇹', name: 'Ethiopië' },
  { code: 'FI', dial: '+358', flag: '🇫🇮', name: 'Finland' },
  { code: 'GE', dial: '+995', flag: '🇬🇪', name: 'Georgië' },
  { code: 'GR', dial: '+30',  flag: '🇬🇷', name: 'Griekenland' },
  { code: 'HU', dial: '+36',  flag: '🇭🇺', name: 'Hongarije' },
  { code: 'IR', dial: '+98',  flag: '🇮🇷', name: 'Iran' },
  { code: 'IQ', dial: '+964', flag: '🇮🇶', name: 'Irak' },
  { code: 'IE', dial: '+353', flag: '🇮🇪', name: 'Ierland' },
  { code: 'IL', dial: '+972', flag: '🇮🇱', name: 'Israël' },
  { code: 'IT', dial: '+39',  flag: '🇮🇹', name: 'Italië' },
  { code: 'JP', dial: '+81',  flag: '🇯🇵', name: 'Japan' },
  { code: 'JO', dial: '+962', flag: '🇯🇴', name: 'Jordanië' },
  { code: 'KZ', dial: '+7',   flag: '🇰🇿', name: 'Kazachstan' },
  { code: 'KE', dial: '+254', flag: '🇰🇪', name: 'Kenia' },
  { code: 'KR', dial: '+82',  flag: '🇰🇷', name: 'Zuid-Korea' },
  { code: 'LB', dial: '+961', flag: '🇱🇧', name: 'Libanon' },
  { code: 'LY', dial: '+218', flag: '🇱🇾', name: 'Libië' },
  { code: 'LT', dial: '+370', flag: '🇱🇹', name: 'Litouwen' },
  { code: 'LU', dial: '+352', flag: '🇱🇺', name: 'Luxemburg' },
  { code: 'MK', dial: '+389', flag: '🇲🇰', name: 'Noord-Macedonië' },
  { code: 'MY', dial: '+60',  flag: '🇲🇾', name: 'Maleisië' },
  { code: 'MV', dial: '+960', flag: '🇲🇻', name: 'Malediven' },
  { code: 'ML', dial: '+223', flag: '🇲🇱', name: 'Mali' },
  { code: 'MX', dial: '+52',  flag: '🇲🇽', name: 'Mexico' },
  { code: 'MD', dial: '+373', flag: '🇲🇩', name: 'Moldavië' },
  { code: 'MN', dial: '+976', flag: '🇲🇳', name: 'Mongolië' },
  { code: 'ME', dial: '+382', flag: '🇲🇪', name: 'Montenegro' },
  { code: 'MZ', dial: '+258', flag: '🇲🇿', name: 'Mozambique' },
  { code: 'MM', dial: '+95',  flag: '🇲🇲', name: 'Myanmar' },
  { code: 'NP', dial: '+977', flag: '🇳🇵', name: 'Nepal' },
  { code: 'NZ', dial: '+64',  flag: '🇳🇿', name: 'Nieuw-Zeeland' },
  { code: 'NE', dial: '+227', flag: '🇳🇪', name: 'Niger' },
  { code: 'NO', dial: '+47',  flag: '🇳🇴', name: 'Noorwegen' },
  { code: 'OM', dial: '+968', flag: '🇴🇲', name: 'Oman' },
  { code: 'PE', dial: '+51',  flag: '🇵🇪', name: 'Peru' },
  { code: 'PH', dial: '+63',  flag: '🇵🇭', name: 'Filipijnen' },
  { code: 'PL', dial: '+48',  flag: '🇵🇱', name: 'Polen' },
  { code: 'PT', dial: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: 'QA', dial: '+974', flag: '🇶🇦', name: 'Qatar' },
  { code: 'RO', dial: '+40',  flag: '🇷🇴', name: 'Roemenië' },
  { code: 'RU', dial: '+7',   flag: '🇷🇺', name: 'Rusland' },
  { code: 'SA', dial: '+966', flag: '🇸🇦', name: 'Saudi-Arabië' },
  { code: 'SN', dial: '+221', flag: '🇸🇳', name: 'Senegal' },
  { code: 'RS', dial: '+381', flag: '🇷🇸', name: 'Servië' },
  { code: 'LK', dial: '+94',  flag: '🇱🇰', name: 'Sri Lanka' },
  { code: 'ES', dial: '+34',  flag: '🇪🇸', name: 'Spanje' },
  { code: 'SD', dial: '+249', flag: '🇸🇩', name: 'Soedan' },
  { code: 'SE', dial: '+46',  flag: '🇸🇪', name: 'Zweden' },
  { code: 'CH', dial: '+41',  flag: '🇨🇭', name: 'Zwitserland' },
  { code: 'SY', dial: '+963', flag: '🇸🇾', name: 'Syrië' },
  { code: 'TW', dial: '+886', flag: '🇹🇼', name: 'Taiwan' },
  { code: 'TZ', dial: '+255', flag: '🇹🇿', name: 'Tanzania' },
  { code: 'TH', dial: '+66',  flag: '🇹🇭', name: 'Thailand' },
  { code: 'TN', dial: '+216', flag: '🇹🇳', name: 'Tunesië' },
  { code: 'UG', dial: '+256', flag: '🇺🇬', name: 'Oeganda' },
  { code: 'UA', dial: '+380', flag: '🇺🇦', name: 'Oekraïne' },
  { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'Verenigde Arabische Emiraten' },
  { code: 'UZ', dial: '+998', flag: '🇺🇿', name: 'Oezbekistan' },
  { code: 'VE', dial: '+58',  flag: '🇻🇪', name: 'Venezuela' },
  { code: 'VN', dial: '+84',  flag: '🇻🇳', name: 'Vietnam' },
  { code: 'YE', dial: '+967', flag: '🇾🇪', name: 'Jemen' },
  { code: 'ZM', dial: '+260', flag: '🇿🇲', name: 'Zambia' },
  { code: 'ZW', dial: '+263', flag: '🇿🇼', name: 'Zimbabwe' },
  { code: 'ZA', dial: '+27',  flag: '🇿🇦', name: 'Zuid-Afrika' },
]

interface Props {
  value: string
  onChange: (formatted: string) => void
  required?: boolean
}

/** Returns the combined "+XX number" string, or "" if number is empty */
export default function PhoneInput({ value, onChange, required }: Props) {
  const [selected, setSelected] = useState<Country>(COUNTRIES[0])
  const [number, setNumber] = useState('')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  // Parse incoming value to restore state (e.g. after reset)
  useEffect(() => {
    if (!value) { setNumber(''); return }
    const match = COUNTRIES.find(c => value.startsWith(c.dial + ' '))
    if (match) {
      setSelected(match)
      setNumber(value.slice(match.dial.length + 1))
    } else {
      setNumber(value)
    }
  }, [value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false); setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function pick(c: Country) {
    setSelected(c); setOpen(false); setSearch('')
    onChange(number.trim() ? `${c.dial} ${number.trim()}` : '')
  }

  function handleNumber(val: string) {
    setNumber(val)
    onChange(val.trim() ? `${selected.dial} ${val.trim()}` : '')
  }

  const filtered = search
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.dial.includes(search) ||
        c.code.toLowerCase().includes(search.toLowerCase())
      )
    : COUNTRIES

  return (
    <div style={{ display: 'flex', gap: 8, position: 'relative' }} ref={dropRef}>
      {/* Country code button */}
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch('') }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 10px', height: 40, border: '1.5px solid var(--border)',
          borderRadius: 8, background: 'var(--bg-soft)', cursor: 'pointer',
          fontSize: 14, fontFamily: 'var(--font)', whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 18 }}>{selected.flag}</span>
        <span style={{ color: 'var(--grey)', fontSize: 13 }}>{selected.dial}</span>
        <span style={{ fontSize: 10, color: 'var(--grey)', marginLeft: 2 }}>▾</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 200,
          background: 'var(--bg)', border: '1.5px solid var(--border)',
          borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.12)',
          width: 260, marginTop: 4,
        }}>
          <div style={{ padding: '8px 8px 4px' }}>
            <input
              autoFocus
              placeholder="Zoek land of kengetal…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '6px 10px', fontSize: 13,
                border: '1.5px solid var(--border)', borderRadius: 6,
                background: 'var(--bg-soft)', fontFamily: 'var(--font)',
                color: 'var(--black)', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <ul style={{
            listStyle: 'none', margin: 0, padding: '4px 0',
            maxHeight: 240, overflowY: 'auto',
          }}>
            {filtered.map(c => (
              <li key={c.code + c.dial}>
                <button
                  type="button"
                  onClick={() => pick(c)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 12px', background: selected.code === c.code ? 'var(--bg-soft)' : 'none',
                    border: 'none', cursor: 'pointer', fontSize: 13,
                    fontFamily: 'var(--font)', color: 'var(--black)', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 16, width: 22 }}>{c.flag}</span>
                  <span style={{ flex: 1 }}>{c.name}</span>
                  <span style={{ color: 'var(--grey)', fontSize: 12 }}>{c.dial}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li style={{ padding: '10px 12px', color: 'var(--grey)', fontSize: 13 }}>
                Geen resultaten
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Number input */}
      <input
        type="tel"
        className="input"
        placeholder="telefoonnummer"
        value={number}
        onChange={e => handleNumber(e.target.value)}
        required={required}
        style={{ flex: 1 }}
      />
    </div>
  )
}
