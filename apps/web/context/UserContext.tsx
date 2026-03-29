import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface User {
  id: string
  name: string
  role: string
  email: string
}

interface UserContextType {
  users: User[]
  selectedUserId: string
  setSelectedUserId: (id: string) => void
  selectedUser: User | undefined
  theme: 'light' | 'dark'
  toggleTheme: () => void
  loggedIn: boolean
  loggedInUser: { userId: string; name: string; role: string; email: string } | null
  loginWithCredentials: (email: string, password: string) => Promise<string | null>
  logout: () => void
}

const UserContext = createContext<UserContextType>({
  users: [],
  selectedUserId: '',
  setSelectedUserId: () => {},
  selectedUser: undefined,
  theme: 'light',
  toggleTheme: () => {},
  loggedIn: false,
  loggedInUser: null,
  loginWithCredentials: async () => null,
  logout: () => {},
})

export const API = 'https://laptopbeheersysteemstichtingasha-production.up.railway.app/graphql'

export function gql(query: string, variables?: Record<string, unknown>, userId?: string) {
  return fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {}),
    },
    body: JSON.stringify({ query, variables }),
  }).then(r => r.json())
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [loggedInUser, setLoggedInUser] = useState<UserContextType['loggedInUser']>(null)

  // Load saved theme and session on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('asha-theme') as 'light' | 'dark' | null
    if (savedTheme) setTheme(savedTheme)

    const savedSession = localStorage.getItem('asha-session')
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession)
        setLoggedInUser(parsed)
        setSelectedUserId(parsed.userId)
      } catch {}
    }
  }, [])

  // Apply theme to <html> whenever it changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('asha-theme', theme)
  }, [theme])

  useEffect(() => {
    gql('{ users { id name role email } }')
      .then(data => setUsers(data.data?.users || []))
  }, [])

  const selectedUser = users.find(u => u.id === selectedUserId)

  function toggleTheme() {
    setTheme(t => t === 'light' ? 'dark' : 'light')
  }

  async function loginWithCredentials(email: string, password: string): Promise<string | null> {
    const data = await gql(
      `mutation($email: String!, $password: String!) {
        login(email: $email, password: $password) {
          userId name role email
        }
      }`,
      { email, password }
    )
    if (data.errors) return data.errors[0].message
    const session = data.data.login
    setLoggedInUser(session)
    setSelectedUserId(session.userId)
    localStorage.setItem('asha-session', JSON.stringify(session))
    return null
  }

  function logout() {
    setLoggedInUser(null)
    setSelectedUserId('')
    localStorage.removeItem('asha-session')
  }

  return (
    <UserContext.Provider value={{
      users, selectedUserId, setSelectedUserId, selectedUser,
      theme, toggleTheme,
      loggedIn: !!loggedInUser, loggedInUser,
      loginWithCredentials, logout,
    }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
