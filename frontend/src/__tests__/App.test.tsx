import { render, screen } from '@testing-library/react'
import App from '../App'
import { OWNER_NAME } from '../config'

test('renders home page at root route', () => {
  render(<App />)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    `Запись на звонок к ${OWNER_NAME}`,
  )
})
