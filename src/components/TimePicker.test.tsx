import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, expect, it } from 'vitest'
import TimePicker from './TimePicker'

afterEach(cleanup)
function Harness() {
  const [value, setValue] = useState('')
  return <><TimePicker label="出生时间" value={value} onChange={setValue} /><output>{value}</output></>
}

it('uses a text field instead of a native time input and normalizes typed times', () => {
  const { container } = render(<Harness />)
  expect(container.querySelector('input[type="time"]')).toBeNull()
  const input = screen.getByLabelText('出生时间')
  fireEvent.change(input, { target: { value: '930' } })
  fireEvent.blur(input)
  expect(screen.getByText('请按 时:分 填写，例如 09:30')).toBeTruthy()
  fireEvent.change(input, { target: { value: '9:30' } })
  fireEvent.blur(input)
  expect(screen.getByText('09:30').tagName).toBe('OUTPUT')
})

it('picks hour and minute from the wheels', () => {
  render(<Harness />)
  fireEvent.click(screen.getByText('滚轮选择'))
  fireEvent.click(screen.getByRole('option', { name: '08时' }))
  fireEvent.click(screen.getByRole('option', { name: '45分' }))
  fireEvent.click(screen.getByText('确认时间'))
  expect(screen.getByText('08:45')).toBeTruthy()
})
