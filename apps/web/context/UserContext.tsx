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
}

const UserContext = createContext<UserContextType>({
  users: [],
  selectedUserId: '',
  setSelectedUserId: () => {},
  selectedUser: undefined,
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

  useEffect(() => {
    gql('{ users { id name role email } }')
      .then(data => setUsers(data.data?.users || []))
  }, [])

  const selectedUser = users.find(u => u.id === selectedUserId)

  return (
    <UserContext.Provider value={{ users, selectedUserId, setSelectedUserId, selectedUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
