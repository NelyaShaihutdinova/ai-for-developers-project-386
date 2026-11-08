import '@mantine/core/styles.css'

import { MantineProvider } from '@mantine/core'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import MeetingsPage from './pages/MeetingsPage'

function App() {
  return (
    <MantineProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/meetings" element={<MeetingsPage />} />
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  )
}

export default App
