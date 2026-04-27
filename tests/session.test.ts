import { decodeToken, isTokenExpired } from "../src/lib/session"

function makeToken(payload: object): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.fakesig`
}

describe("decodeToken", () => {
  it("extracts userId, name, email, role from JWT", () => {
    const token = makeToken({
      sub: "user-123",
      name: "Jean",
      email: "jean@example.com",
      role: "user",
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
    const session = decodeToken(token)
    expect(session.userId).toBe("user-123")
    expect(session.name).toBe("Jean")
    expect(session.email).toBe("jean@example.com")
    expect(session.role).toBe("user")
  })

  it("falls back to empty strings for missing fields", () => {
    const token = makeToken({ sub: "u1" })
    const session = decodeToken(token)
    expect(session.name).toBe("")
    expect(session.email).toBe("")
    expect(session.role).toBe("user")
  })
})

describe("isTokenExpired", () => {
  it("returns false for a future exp", () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) + 3600 })
    expect(isTokenExpired(token)).toBe(false)
  })

  it("returns true for a past exp", () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) - 1 })
    expect(isTokenExpired(token)).toBe(true)
  })

  it("returns true when exp is missing", () => {
    const token = makeToken({})
    expect(isTokenExpired(token)).toBe(true)
  })
})
