export function accountGateDestination(input: {
  configured: boolean
  authLoading: boolean
  signedIn: boolean
  guestAllowed: boolean
  currentPath: string
}) {
  if (!input.configured || input.authLoading || input.signedIn || input.guestAllowed) return undefined
  return `/account?onboarding=1&next=${encodeURIComponent(input.currentPath || '/')}`
}

