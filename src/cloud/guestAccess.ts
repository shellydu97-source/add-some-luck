const GUEST_ACCESS_KEY = 'add-luck-guest-access-v1'

export function hasGuestAccess() {
  try {
    return window.localStorage.getItem(GUEST_ACCESS_KEY) === 'allowed'
  } catch {
    return false
  }
}

export function allowGuestAccess() {
  window.localStorage.setItem(GUEST_ACCESS_KEY, 'allowed')
}

export function clearGuestAccess() {
  window.localStorage.removeItem(GUEST_ACCESS_KEY)
}

