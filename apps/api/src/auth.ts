export function requireRole(user: any, ...roles: string[]) {
  if (!user) throw new Error('Niet ingelogd.')
  if (!roles.includes(user.role)) {
    throw new Error(`Toegang geweigerd. Vereiste rol: ${roles.join(' of ')}.`)
  }
}