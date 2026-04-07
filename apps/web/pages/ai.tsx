import { useState } from 'react'
import Layout from '../components/Layout'
import { useUser, gql } from '../context/UserContext'
import { useToast } from '../context/ToastContext'

const roleLabel: Record<string, string> = {
  ADMIN: 'Beheerder',
  OWNER: 'Eigenaar activiteit',
  HELPDESK: 'Helpdesk',
}

const roleContext: Record<string, string> = {
  ADMIN: 'Je hebt toegang tot alle laptops, openstaande reserveringen, open storingen en softwareaanvragen.',
  OWNER: 'Je hebt toegang tot jouw eigen reserveringen en beschikbare activiteiten.',
  HELPDESK: 'Je hebt toegang tot open storingen en laptops met status IN_CONTROL.',
}

export default function AI() {
  const { selectedUserId, selectedUser } = useUser()
  const { toast } = useToast()
  const [vraag, setVraag] = useState('')
  const [antwoord, setAntwoord] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function stelVraag() {
    if (!vraag.trim()) { toast('Voer een vraag in.', 'error'); return }
    if (vraag.length > 500) { toast('Vraag mag maximaal 500 tekens bevatten.', 'error'); return }
    setAntwoord(null)
    setLoading(true)

    const data = await gql(
      `mutation($question: String!) { askAI(question: $question) }`,
      { question: vraag },
      selectedUserId
    )
    setLoading(false)
    if (data.errors) {
      toast(data.errors[0].message, 'error')
    } else {
      setAntwoord(data.data?.askAI ?? '')
    }
  }

  return (
    <Layout title="AI assistent" subtitle="Stel vragen over het laptopbeheer">

      {!selectedUserId && (
        <div className="empty">
          <div className="empty-icon">🤖</div>
          <p className="empty-text">Selecteer een gebruiker om de AI assistent te gebruiken</p>
        </div>
      )}

      {selectedUserId && (
        <>
          {selectedUser && (
            <div style={{ marginBottom: 40 }}>
              <p style={{ fontSize: 12, color: 'var(--grey)', margin: 0 }}>
                Ingelogd als <strong>{roleLabel[selectedUser.role] || selectedUser.role}</strong>
                {' — '}
                {roleContext[selectedUser.role]}
              </p>
            </div>
          )}

          <div style={{ display: 'grid', gap: 20, maxWidth: 640 }}>
            <div>
              <label className="label">Stel een vraag</label>
              <textarea
                className="input"
                placeholder="bijv. Hoeveel laptops zijn beschikbaar? Of: Zijn er open storingen?"
                value={vraag}
                onChange={e => setVraag(e.target.value)}
                rows={3}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); stelVraag() }
                }}
              />
              <p style={{ fontSize: 11, color: 'var(--grey)', marginTop: 6 }}>
                {vraag.length}/500 tekens · Enter om te verzenden
              </p>
            </div>

            <div>
              <button
                className="btn btn-primary"
                onClick={stelVraag}
                disabled={loading || !vraag.trim()}
              >
                {loading ? 'Bezig...' : 'Vraag stellen'}
              </button>
            </div>
          </div>

          {loading && (
            <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, color: 'var(--grey)' }}>AI verwerkt je vraag...</span>
            </div>
          )}

          {antwoord !== null && !loading && (
            <div style={{ marginTop: 40 }}>
              <p className="section-label" style={{ marginBottom: 16 }}>Antwoord</p>
              <div
                style={{
                  background: 'var(--bg-soft)',
                  borderRadius: 10,
                  padding: '24px 28px',
                  fontSize: 14,
                  lineHeight: 1.8,
                  color: 'var(--black)',
                  whiteSpace: 'pre-wrap',
                  maxWidth: 640,
                }}
              >
                {antwoord}
              </div>
              <button
                className="btn btn-ghost"
                style={{ marginTop: 16, fontSize: 12, padding: '4px 12px' }}
                onClick={() => { setAntwoord(null); setVraag('') }}
              >
                Nieuwe vraag
              </button>
            </div>
          )}

          <div style={{ marginTop: 56, paddingTop: 28, borderTop: '1px solid var(--border-subtle)', maxWidth: 640 }}>
            <p className="section-label" style={{ marginBottom: 12 }}>Beperkingen</p>
            <ul style={{ fontSize: 12, color: 'var(--grey)', margin: 0, padding: '0 0 0 16px', lineHeight: 2 }}>
              <li>De AI kan geen beslissingen nemen (goedkeuren, afwijzen, toewijzen).</li>
              <li>De AI kan geen data aanpassen in het systeem.</li>
              <li>Antwoorden zijn gebaseerd op actuele systeemdata van jouw rol.</li>
              <li>Maximaal 500 tekens per vraag.</li>
            </ul>
          </div>
        </>
      )}
    </Layout>
  )
}
