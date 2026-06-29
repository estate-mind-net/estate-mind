/**
 * ContextValidation.ts
 *
 * Shared authentication and organization context validation.
 * Every business data operation must call requireDataContext() before executing.
 *
 * No module should implement its own authentication checks.
 */

export interface DataContext {
  userId: string
  organizationId: string
}

// ── Typed Errors ─────────────────────────────────────────────────

export class AuthenticationRequiredError extends Error {
  constructor(message = 'You must be signed in to perform this action.') {
    super(message)
    this.name = 'AuthenticationRequiredError'
  }
}

export class OrganizationRequiredError extends Error {
  constructor(message = 'An active organization is required to manage workspace data.') {
    super(message)
    this.name = 'OrganizationRequiredError'
  }
}

export class InvalidContextError extends Error {
  constructor(message = 'Invalid operation context.') {
    super(message)
    this.name = 'InvalidContextError'
  }
}

// ── Validation ───────────────────────────────────────────────────

/**
 * Validate that a DataContext has valid authentication and organization.
 * Throws a typed error if either is missing.
 *
 * Usage:
 *   requireDataContext(context)  // throws if invalid
 *   await repository.list(context)  // safe to proceed
 */
export function requireDataContext(context: Partial<DataContext> | null | undefined): asserts context is DataContext {
  if (!context) {
    console.warn('[ContextValidation] No context provided.')
    throw new InvalidContextError('No operation context provided.')
  }

  if (!context.userId || typeof context.userId !== 'string' || context.userId.trim().length === 0) {
    console.warn('[ContextValidation] Missing or empty userId.')
    throw new AuthenticationRequiredError()
  }

  if (!context.organizationId || typeof context.organizationId !== 'string' || context.organizationId.trim().length === 0) {
    console.warn('[ContextValidation] Missing or empty organizationId.')
    throw new OrganizationRequiredError()
  }
}

/**
 * Check if a context is valid without throwing.
 * Returns true if both userId and organizationId are present.
 */
export function isValidContext(context: Partial<DataContext> | null | undefined): context is DataContext {
  return (
    !!context &&
    typeof context.userId === 'string' &&
    context.userId.trim().length > 0 &&
    typeof context.organizationId === 'string' &&
    context.organizationId.trim().length > 0
  )
}

/**
 * Get a user-friendly error message for a context validation failure.
 * Returns null if context is valid.
 */
export function getContextError(context: Partial<DataContext> | null | undefined): string | null {
  if (!context) return 'No operation context provided.'
  if (!context.userId?.trim()) return 'You must be signed in to perform this action.'
  if (!context.organizationId?.trim()) return 'An active organization is required to manage workspace data.'
  return null
}
