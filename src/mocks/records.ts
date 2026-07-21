import type { DivinationRecord } from '../models/types'
import { interpretationMocks } from './interpretations'
import { seedProfiles } from './profiles'

export const seedRecords: DivinationRecord[] = [
  {
    id: 'record-demo-liuyao', profileId: 'profile-self', profileNameSnapshot: '小橙', profileSnapshot: seedProfiles[0],
    type: 'liuyao', question: '这次出行是否顺利？', category: '出行', createdAt: '2026-07-12T09:30:00.000Z',
    rawResult: { originalHexagram: '水山蹇（演示）', changedHexagram: '地山谦（演示）', movingLines: ['二爻', '五爻'] },
    calculationVersion: 'v1.2-demo', ruleVersion: 'mock-adapter-v1.2', interpretationVersion: 'v1.2-mock',
    interpretation: interpretationMocks.liuyao, followUpMessages: [], verificationStatus: 'pending',
    verificationResult: '', verificationDate: '', mood: '有一点犹豫', expectation: '希望行程按计划进行', notes: '', demo: true,
  },
  {
    id: 'record-demo-tarot', profileId: 'profile-self', profileNameSnapshot: '小橙', profileSnapshot: seedProfiles[0],
    type: 'tarot', question: '本周感情状态', category: '感情', createdAt: '2026-07-10T12:00:00.000Z',
    rawResult: { spread: 'three', cards: ['隐者（正位）', '月亮（逆位）', '正义（正位）'] },
    calculationVersion: 'v1.2-demo', ruleVersion: 'fixed-seed-50-percent-demo', interpretationVersion: 'v1.2-mock',
    interpretation: interpretationMocks.tarot, followUpMessages: [], verificationStatus: 'partially_matched',
    verificationResult: '沟通节奏的部分描述较符合。', verificationDate: '2026/07/13', notes: '', demo: true,
  },
]
