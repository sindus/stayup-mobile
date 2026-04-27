export interface AppSession {
  userId: string
  name: string
  email: string
  role: string
}

export function decodeToken(token: string): AppSession {
  const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
  const padded = b64 + "==".slice(0, (4 - (b64.length % 4)) % 4)
  const payload = JSON.parse(atob(padded)) as {
    sub?: string
    name?: string
    email?: string
    role?: string
    exp?: number
  }
  return {
    userId: payload.sub ?? "",
    name: payload.name ?? "",
    email: payload.email ?? "",
    role: payload.role ?? "user",
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = b64 + "==".slice(0, (4 - (b64.length % 4)) % 4)
    const payload = JSON.parse(atob(padded)) as { exp?: number }
    if (!payload.exp) return true
    return payload.exp < Date.now() / 1000
  } catch {
    return true
  }
}
