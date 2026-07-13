import { useLocation } from 'react-router-dom'

interface DashboardHeaderProps {
  title: string
  subtitle?: string
  showNav?: boolean
}

export function DashboardHeader({ title: _title, subtitle, showNav }: DashboardHeaderProps) {
  const location = useLocation()
  const isManager = location.pathname.startsWith('/manager')

  return (
    <header className="bg-blue-900 text-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white text-blue-900 font-bold text-sm px-2 py-1 rounded">IDBI</div>
          <div>
            <h1 className="text-lg font-bold">IDBI Bank</h1>
            <p className="text-blue-200 text-xs">{subtitle || 'Lead Scoring Platform'}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {showNav && (
            <div className="flex gap-6 text-sm text-blue-200">
              <a href="/officer/dashboard" className={`hover:text-white transition ${location.pathname === '/officer/dashboard' ? 'text-white font-medium' : ''}`}>Dashboard</a>
              <a href="/manager/dashboard" className={`hover:text-white transition ${isManager ? 'text-white font-medium' : ''}`}>Manager</a>
            </div>
          )}
          <div className="flex items-center gap-3">
            <span className="text-blue-200 text-xs">{isManager ? 'Manager' : 'Officer'}</span>
            <a href="/" className="text-blue-200 text-sm hover:text-white transition">[Logout]</a>
          </div>
        </div>
      </div>
    </header>
  )
}
