import type { RentalApartment, RentalStatus } from '../types'

function normalizeApartment(a: RentalApartment): RentalApartment {
  return { ...a, status: a.status ?? 'new' }
}

const STORAGE_KEY = 'estatemind_rent_apartments'

export function loadUserApartments(): RentalApartment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return (parsed as RentalApartment[]).map(normalizeApartment)
  } catch {
    return []
  }
}

export function saveUserApartment(apartment: RentalApartment): void {
  const existing = loadUserApartments()
  const updated = [...existing, apartment]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

export function getUserApartmentById(id: string): RentalApartment | null {
  const apartments = loadUserApartments()
  const found = apartments.find((a) => a.id === id) ?? null
  return found ? normalizeApartment(found) : null
}

export function updateUserApartment(apartment: RentalApartment): void {
  const existing = loadUserApartments()
  const updated = existing.map((a) => (a.id === apartment.id ? normalizeApartment(apartment) : a))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

export function updateApartmentStatus(id: string, status: RentalStatus): void {
  const existing = loadUserApartments()
  const updated = existing.map((a) =>
    a.id === id
      ? { ...a, status, ...(status === 'viewed' && !a.viewedAt ? { viewedAt: new Date().toISOString() } : {}) }
      : a,
  )
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

export function deleteUserApartment(id: string): void {
  const existing = loadUserApartments()
  const updated = existing.filter((a) => a.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

export function isUserApartment(id: string): boolean {
  return id.startsWith('rent-user-')
}
