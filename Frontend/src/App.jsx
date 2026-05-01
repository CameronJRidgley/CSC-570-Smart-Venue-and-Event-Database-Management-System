// Author: Nicco Hill
// App.jsx — Root of the application. Defines all client-side routes and maps
// each path to its corresponding page component. Unknown routes redirect to "/".

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import WelcomePage from './pages/WelcomePage'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/DashboardPage'
import VendorApplyPage from './pages/VendorApplyPage'
import RegisterPage from './pages/RegisterPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/vendor-apply" element={<VendorApplyPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
