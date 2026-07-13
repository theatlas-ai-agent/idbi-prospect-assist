import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { OfficerLoginPage } from './pages/OfficerLoginPage'
import { LeadTable } from './components/LeadTable'
import { AddProspectsPage } from './pages/AddProspectsPage'
import { ManagerDashboard } from './pages/ManagerDashboard'
import { ProspectListPage } from './pages/ProspectListPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home */}
        <Route path="/" element={<HomePage />} />

        {/* Officer routes */}
        <Route path="/officer/login" element={<OfficerLoginPage />} />
        <Route path="/officer/dashboard" element={<LeadTable />} />

        {/* Prospect Manager routes */}
        <Route path="/manager/login" element={<OfficerLoginPage />} />
        <Route path="/manager/dashboard" element={<ManagerDashboard />} />
        <Route path="/manager/add" element={<AddProspectsPage />} />
        <Route path="/manager/list" element={<ProspectListPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
