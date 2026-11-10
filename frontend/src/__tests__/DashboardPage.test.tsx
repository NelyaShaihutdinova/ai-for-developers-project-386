import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import { vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  meetingTypesCreate: vi.fn(),
  meetingTypesList: vi.fn(() => Promise.resolve({ data: [] })),
  bookingsList: vi.fn(() => Promise.resolve({ data: [] })),
}))

vi.mock('../api', async () => {
  const actual = await vi.importActual<typeof import('../api')>('../api')
  return {
    ...actual,
    meetingTypesCreate: mocks.meetingTypesCreate,
    meetingTypesList: mocks.meetingTypesList,
    bookingsList: mocks.bookingsList,
  }
})

afterEach(() => {
  vi.clearAllMocks()
})

test('sends durationMinutes as a number when creating a meeting type', async () => {
  const { default: DashboardPage } = await import('../pages/DashboardPage')

  mocks.meetingTypesCreate.mockResolvedValue({
    data: {
      id: 1,
      name: 'Test',
      description: '',
      durationMinutes: 45,
      isActive: true,
      createdAt: 'now',
    },
  })

  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <MantineProvider>
        <DashboardPage />
      </MantineProvider>
    </MemoryRouter>,
  )

  fireEvent.click(screen.getByRole('button', { name: /Добавить тип/i }))

  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  const dialog = screen.getByRole('dialog')
  const nameInput = within(dialog).getByRole('textbox', { name: /название/i })
  const durationInput = within(dialog).getByRole('spinbutton', { name: /длительность/i })

  fireEvent.change(nameInput, { target: { value: 'Тест' } })
  fireEvent.change(durationInput, { target: { value: '45' } })

  fireEvent.click(within(dialog).getByRole('button', { name: /Создать|Сохранить/i }))

  await waitFor(() => {
    expect(mocks.meetingTypesCreate).toHaveBeenCalledTimes(1)
    const { body } = mocks.meetingTypesCreate.mock.calls[0][0]
    expect(body.durationMinutes).toBe(45)
    expect(typeof body.durationMinutes).toBe('number')
  })
})

test('sends durationMinutes as a number for 15-minute and 60-minute values', async () => {
  const { default: DashboardPage } = await import('../pages/DashboardPage')

  mocks.meetingTypesCreate.mockResolvedValue({
    data: {
      id: 1,
      name: 'Test',
      description: '',
      durationMinutes: 15,
      isActive: true,
      createdAt: 'now',
    },
  })

  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <MantineProvider>
        <DashboardPage />
      </MantineProvider>
    </MemoryRouter>,
  )

  const openModal = async () => {
    fireEvent.click(screen.getByRole('button', { name: /Добавить тип/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    return screen.getByRole('dialog')
  }

  const dialog1 = await openModal()
  const nameInput1 = within(dialog1).getByRole('textbox', { name: /название/i })
  const durationInput1 = within(dialog1).getByRole('spinbutton', { name: /длительность/i })

  fireEvent.change(nameInput1, { target: { value: 'Короткая' } })
  fireEvent.change(durationInput1, { target: { value: '15' } })
  fireEvent.click(within(dialog1).getByRole('button', { name: /Создать|Сохранить/i }))

  await waitFor(() => {
    const { body } = mocks.meetingTypesCreate.mock.calls[0][0]
    expect(body.durationMinutes).toBe(15)
    expect(typeof body.durationMinutes).toBe('number')
  })

  mocks.meetingTypesCreate.mockClear()
  mocks.meetingTypesCreate.mockResolvedValue({
    data: {
      id: 2,
      name: 'Test',
      description: '',
      durationMinutes: 60,
      isActive: true,
      createdAt: 'now',
    },
  })

  const dialog2 = await openModal()
  const nameInput2 = within(dialog2).getByRole('textbox', { name: /название/i })
  const durationInput2 = within(dialog2).getByRole('spinbutton', { name: /длительность/i })

  fireEvent.change(nameInput2, { target: { value: 'Длинная' } })
  fireEvent.change(durationInput2, { target: { value: '60' } })
  fireEvent.click(within(dialog2).getByRole('button', { name: /Создать|Сохранить/i }))

  await waitFor(() => {
    const { body } = mocks.meetingTypesCreate.mock.calls[0][0]
    expect(body.durationMinutes).toBe(60)
    expect(typeof body.durationMinutes).toBe('number')
  })
})
