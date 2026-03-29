import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface ConfirmState {
  message: string
  resolve: (value: boolean) => void
}

interface ConfirmContextType {
  confirm: (message: string) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType>({ confirm: async () => false })

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null)

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise(resolve => {
      setState({ message, resolve })
    })
  }, [])

  function respond(value: boolean) {
    state?.resolve(value)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div className="confirm-overlay" onClick={() => respond(false)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <p className="confirm-message">{state.message}</p>
            <div className="confirm-buttons">
              <button className="btn btn-ghost" onClick={() => respond(false)}>Annuleren</button>
              <button className="btn btn-primary" onClick={() => respond(true)}>Bevestigen</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  return useContext(ConfirmContext)
}
