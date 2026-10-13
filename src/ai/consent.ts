const CONSENT_KEY='add-luck-deepseek-consent-v1'
export function hasAiConsent() {try {return window.localStorage.getItem(CONSENT_KEY)==='accepted'} catch {return false}}
export function acceptAiConsent() {try {window.localStorage.setItem(CONSENT_KEY,'accepted')} catch { /* the current panel still retains session consent */ }}
