import { useEffect } from 'react'
import { saveDivinationRecord } from '../utils/divinationRecords'

// Saving is idempotent, so a repeated effect (e.g. React StrictMode) still yields one record.
export default function AutoSaveRecord({ draftId }: { draftId: string }) {
  useEffect(() => { saveDivinationRecord(draftId) }, [draftId])
  return null
}
