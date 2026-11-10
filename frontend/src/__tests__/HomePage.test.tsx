import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import HomePage from '../pages/HomePage'
import { OWNER_NAME } from '../config'

function renderHomePage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <MantineProvider>
        <HomePage />
      </MantineProvider>
    </MemoryRouter>,
  )
}

test('displays owner name in header', () => {
  renderHomePage()
  expect(screen.getByText(OWNER_NAME)).toBeInTheDocument()
})

test('displays personalized hero heading', () => {
  renderHomePage()
  const heading = screen.getByRole('heading', { level: 1 })
  expect(heading).toHaveTextContent(`Запись на звонок к ${OWNER_NAME}`)
})

test('displays "Как записаться" section', () => {
  renderHomePage()
  expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Как записаться')
})

test('displays three booking steps', () => {
  renderHomePage()
  expect(screen.getByText('Выберите тип встречи')).toBeInTheDocument()
  expect(screen.getByText('Откройте календарь')).toBeInTheDocument()
  expect(screen.getByText('Забронируйте слот')).toBeInTheDocument()
})

test('CTA button links to /meetings', () => {
  renderHomePage()
  const button = screen.getByRole('link', { name: 'Выбрать тип встречи' })
  expect(button).toHaveAttribute('href', '/meetings')
})

test('displays footer with brand name', () => {
  renderHomePage()
  expect(screen.getByText('© 2026 Запись на звонок')).toBeInTheDocument()
})
