import type { AppDataState } from '../models/types'

export function pickAppData(state: AppDataState): AppDataState {
  return {
    schemaVersion: state.schemaVersion,
    lastPrimaryRoute: state.lastPrimaryRoute,
    reduceMotion: state.reduceMotion,
    activeProfileId: state.activeProfileId,
    profiles: state.profiles,
    records: state.records,
    drafts: state.drafts,
  }
}

export function hasUserData(data: AppDataState) {
  return data.profiles.length > 0 || data.records.length > 0 || data.drafts.length > 0
}
