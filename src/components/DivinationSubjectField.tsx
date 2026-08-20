import type { Gender, Profile } from '../models/types'
import { Segmented } from './UI'

export const TEMPORARY_SUBJECT_ID = 'temporary'

type GenderChoice = Gender | 'unspecified'

const genderOptions = [
  { value: 'unspecified' as const, label: '不填写' },
  { value: 'female' as const, label: '女' },
  { value: 'male' as const, label: '男' },
]

interface Props {
  profiles: Profile[]
  subjectId: string
  temporaryName: string
  temporaryGender?: Gender
  includeGender?: boolean
  onSubjectChange: (id: string) => void
  onTemporaryNameChange: (name: string) => void
  onTemporaryGenderChange?: (gender?: Gender) => void
}

export default function DivinationSubjectField({
  profiles, subjectId, temporaryName, temporaryGender, includeGender = false,
  onSubjectChange, onTemporaryNameChange, onTemporaryGenderChange,
}: Props) {
  const selected = profiles.find((item) => item.id === subjectId)
  const gender: GenderChoice = temporaryGender ?? 'unspecified'

  return <div className="divination-subject-field">
    <label className="field">
      <span>这次为谁测</span>
      <select value={subjectId} onChange={(event) => onSubjectChange(event.target.value)}>
        {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
        <option value={TEMPORARY_SUBJECT_ID}>临时测算</option>
      </select>
    </label>
    {selected && <p className="subject-note">本次结果会保存到“{selected.name}”名下。</p>}
    {subjectId === TEMPORARY_SUBJECT_ID && <div className="temporary-subject-fields">
      <label className="field">
        <span>称呼（选填）</span>
        <input value={temporaryName} maxLength={20} onChange={(event) => onTemporaryNameChange(event.target.value)} placeholder="例如：朋友小林" />
      </label>
      {includeGender && <div className="field">
        <span>性别（选填）</span>
        <Segmented value={gender} options={genderOptions} onChange={(value) => onTemporaryGenderChange?.(value === 'unspecified' ? undefined : value)} label="临时测算对象性别" />
      </div>}
      <p className="subject-note">临时测算不会自动并入现有人物档案，会作为独立记录保存。</p>
    </div>}
  </div>
}
