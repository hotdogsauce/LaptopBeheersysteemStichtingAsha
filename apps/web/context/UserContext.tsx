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
}

const UserContext = createContext<UserContextType>({
  users: [],
  selectedUserId: '',
  setSelectedUserId: () => {},
  selectedUser: undefined,
  theme: 'light',
  toggleTheme: () => {},
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

  // Load saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('asha-theme') as 'light' | 'dark' | null
    if (saved) setTheme(saved)
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

  return (
    <UserContext.Provider value={{ users, selectedUserId, setSelectedUserId, selectedUser, theme, toggleTheme }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
