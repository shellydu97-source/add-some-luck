import type { AppDataState } from '../models/types'

export function createEmptyAppData(): AppDataState {
  return {
    schemaVersion: '1.3',
    tombstones: { profiles: {}, records: {}, drafts: {} },
    lastPrimaryRoute: 'charts',
    reduceMotion: false,
    activeProfileId: '',
    profiles: [],
    records: [],
    drafts: [],
  }
}

export function pickAppData(state: AppDataState): AppDataState {
  return {
    schemaVersion: state.schemaVersion,
    tombstones: state.tombstones,
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
