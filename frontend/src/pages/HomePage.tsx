export function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* Header */}
      <header className="bg-blue-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white text-blue-900 font-bold text-sm px-2 py-1 rounded">IDBI</div>
            <div>
              <h1 className="text-lg font-bold">IDBI Bank</h1>
              <p className="text-blue-200 text-xs">Lead Scoring Platform</p>
            </div>
          </div>
          <div className="flex gap-6 text-sm text-blue-200">
            <a href="/officer/login" className="hover:text-white transition">Officer</a>
            <a href="/manager/login" className="hover:text-white transition">Manager</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-3xl mx-auto w-full">
          {/* Two Portals */}
          <div className="grid md:grid-cols-2 gap-8">
          {/* Officer */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-left">
            <h3 className="text-xl font-bold text-blue-900 mb-2">Officer Dashboard</h3>
            <p className="text-gray-600 text-sm mb-6">
              View scored prospects, priorities, repayment capacity, and product recommendations.
            </p>
            <ul className="text-gray-700 text-sm space-y-2 mb-6">
              <li>Dual-engine AI scoring</li>
              <li>Priority queue (High/Medium/Low)</li>
              <li>Product match per prospect</li>
              <li>Repayment capacity breakdown</li>
            </ul>
            <a href="/officer/login" className="block text-center bg-blue-900 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg transition">
              Open Dashboard
            </a>
          </div>

          {/* Manager */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-left">
            <h3 className="text-xl font-bold text-blue-900 mb-2">Prospect Manager</h3>
            <p className="text-gray-600 text-sm mb-6">
              Add prospects in bulk, input scoring data, and track loan applications.
            </p>
            <ul className="text-gray-700 text-sm space-y-2 mb-6">
              <li>Bulk prospect upload</li>
              <li>Income & obligations input</li>
              <li>Credit score entry</li>
              <li>Application tracking</li>
            </ul>
            <a href="/manager/login" className="block text-center bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition">
              Open Manager Portal
            </a>
          </div>
        </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-blue-900 text-blue-200 text-center py-6 text-sm">
        IDBI Innovate 2026 — Prospect Assist AI — Hackathon Project
      </footer>
    </div>
  )
}
