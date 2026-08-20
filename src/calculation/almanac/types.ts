export interface AlmanacResult {
  solarDate: string
  week: string
  lunarDate: string
  lunarYear: string
  zodiac: string
  pillars: { year: string; month: string; day: string }
  festivals: string[]
  solarTerm?: string
  yi: string[]
  ji: string[]
  dayOfficer: string
  tianShen: { name: string; luck: string }
  xiu: { name: string; luck: string }
  chong: string
  sha: string
  positions: { xi: string; fu: string; cai: string }
  pengZu: string[]
  taiShen: string
  jiShen: string[]
  xiongSha: string[]
}
