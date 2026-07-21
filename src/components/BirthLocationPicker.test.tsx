import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ConfirmedBirthLocation } from '../models/types'
import BirthLocationPicker from './BirthLocationPicker'

afterEach(cleanup)

function ControlledPicker({ onChange }: { onChange: (value: string, location?: ConfirmedBirthLocation) => void }) {
  const [value, setValue] = useState('')
  const [location, setLocation] = useState<ConfirmedBirthLocation>()
  return (
    <BirthLocationPicker
      value={value}
      selected={location}
      onChange={(nextValue, nextLocation) => {
        setValue(nextValue)
        setLocation(nextLocation)
        onChange(nextValue, nextLocation)
      }}
    />
  )
}

describe('出生城市选择器', () => {
  it('打开选择器并确认城市后才返回坐标，同时收起面板', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ControlledPicker onChange={onChange} />)
    const trigger = screen.getByRole('button', { name: /选择省份和城市/ })
    await waitFor(() => expect(trigger).toBeEnabled())
    await user.click(trigger)
    const province = screen.getByRole('combobox', { name: '选择出生省份' })
    await waitFor(() => expect(province).toBeEnabled())
    await user.selectOptions(province, '上海市')
    const cityList = await screen.findByRole('listbox', { name: '上海市城市列表' })
    const option = within(cityList).getByRole('option', { name: /上海市/ })
    await user.click(option)
    expect(onChange).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: '确定' }))
    const lastCall = onChange.mock.calls.at(-1)
    expect(lastCall).toBeDefined()
    const location = lastCall?.[1]
    expect(location).toMatchObject({ canonicalName: '上海市', ianaTimeZone: 'Asia/Shanghai', userConfirmed: true, coordinateSource: 'GeoNames CN country dump' })
    expect(location.coordinateDataVersion).toContain('cn-admin-2023-geonames-2026')
    expect(screen.queryByRole('dialog', { name: '选择出生地点' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /上海市 · 上海市/ })).toBeInTheDocument()
  })

  it('旧文本地点保持待确认，不静默匹配', async () => {
    const view = render(<BirthLocationPicker value="杭州市" onChange={() => undefined} />)
    expect(view.getByText(/还没有确认具体城市/)).toBeInTheDocument()
    await waitFor(() => expect(view.queryByText('已确认')).not.toBeInTheDocument())
  })

  it('城市只能直接选择，不显示城市输入框', async () => {
    const user = userEvent.setup()
    render(<ControlledPicker onChange={() => undefined} />)
    const trigger = screen.getByRole('button', { name: /选择省份和城市/ })
    await waitFor(() => expect(trigger).toBeEnabled())
    await user.click(trigger)
    const province = screen.getByRole('combobox', { name: '选择出生省份' })
    await waitFor(() => expect(province).toBeEnabled())
    await user.selectOptions(province, '贵州省')
    expect(screen.queryByRole('textbox', { name: /城市/ })).not.toBeInTheDocument()
    expect(await screen.findByRole('listbox', { name: '贵州省城市列表' })).toBeInTheDocument()
  })
})
