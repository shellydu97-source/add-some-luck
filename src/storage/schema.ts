import { z } from 'zod'

const confirmedBirthLocationSchema = z.object({
  canonicalName: z.string().min(1), province: z.string().min(1), city: z.string().min(1),
  latitude: z.number().finite(), longitude: z.number().finite(), ianaTimeZone: z.literal('Asia/Shanghai'),
  coordinateSource: z.string().min(1), coordinateDataVersion: z.string().min(1), userConfirmed: z.literal(true),
})

const profileSchema = z.object({
  id: z.string().min(1), name: z.string().min(1), gender: z.enum(['male', 'female']),
  relation: z.enum(['self', 'family', 'friend', 'partner', 'other']), calendarType: z.enum(['solar', 'lunar']),
  rawBirthDate: z.string(), lunarLeapMonth: z.boolean(), normalizationStatus: z.enum(['unprocessed', 'normalized', 'failed']),
  birthPlaceText: z.string(), birthLocation: confirmedBirthLocationSchema.optional(),
  daylightSavingStatus: z.enum(['unknown', 'applied', 'not_applied']),
  timeAccuracy: z.enum(['exact_minute', 'known_shichen', 'approximate_period', 'unknown']),
  useTrueSolarTime: z.enum(['system_default', 'on', 'off']), dayBoundaryRule: z.literal('system_default'),
  houseSystem: z.literal('system_default'), unknownTimePolicy: z.literal('time_independent_only'),
  isDefault: z.boolean(), createdAt: z.string(), updatedAt: z.string(),
}).passthrough()

const recordSchema = z.object({
  metaUpdatedAt: z.string().datetime().optional(),
  id: z.string().min(1), type: z.enum(['bazi', 'astrology', 'liuyao', 'meihua', 'tarot']), profileId: z.string(),
  profileNameSnapshot: z.string(), createdAt: z.string(), rawResult: z.record(z.string(), z.unknown()),
  calculationVersion: z.string(), ruleVersion: z.string(), interpretation: z.object({
    headline: z.string(), conclusion: z.string(), evidence: z.array(z.string()), support: z.array(z.string()),
    conflicts: z.array(z.string()), uncertainty: z.string(), advice: z.array(z.string()),
  }), followUpMessages: z.array(z.unknown()), aiInterpretations: z.array(z.unknown()).optional(),
  aiMessages: z.array(z.unknown()).optional(),
  verificationStatus: z.enum(['pending', 'matched', 'partially_matched', 'not_happened', 'opposite', 'unknown']),
  demo: z.boolean().optional(),
}).passthrough()

const draftSchema = z.object({
  id: z.string().min(1), type: z.enum(['liuyao', 'meihua', 'tarot']), profileId: z.string(), question: z.string(),
  createdAt: z.string(), updatedAt: z.string(), state: z.record(z.string(), z.unknown()),
}).passthrough()

export const appDataSchema = z.object({
  schemaVersion: z.literal('1.3'),
  tombstones: z.object({ profiles: z.record(z.string(), z.string().datetime()), records: z.record(z.string(), z.string().datetime()), drafts: z.record(z.string(), z.string().datetime()) }),
  lastPrimaryRoute: z.enum(['charts', 'fortune', 'divination', 'records']),
  reduceMotion: z.boolean(), activeProfileId: z.string(),
  profiles: z.array(profileSchema), records: z.array(recordSchema), drafts: z.array(draftSchema),
})
