export function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏦</span>
            <div>
              <h1 className="text-xl font-bold text-white">IDBI Bank</h1>
              <p className="text-xs text-blue-200">Prospect Assist AI</p>
            </div>
          </div>
          <div className="flex gap-4">
            <a href="/officer/login" className="text-white/80 hover:text-white text-sm">Officer</a>
            <a href="/manager/login" className="text-white/80 hover:text-white text-sm">Prospect Manager</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-4">
            Prospect Assist AI
          </h2>
          <p className="text-xl text-blue-200 max-w-2xl mx-auto">
            Score leads, recommend products, prioritize prospects with ML
          </p>
        </div>

        {/* Two Portals */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Officer */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition">
            <div className="text-5xl mb-4">👔</div>
            <h3 className="text-2xl font-bold text-white mb-2">Officer Dashboard</h3>
            <p className="text-blue-200 mb-6">
              View scored prospects, priorities, repayment capacity, and product recommendations
            </p>
            <ul className="text-white/80 mb-6 space-y-2">
              <li>✓ Dual-engine scoring</li>
              <li>✓ Priority queue</li>
              <li>✓ Product match</li>
              <li>✓ Repayment capacity</li>
            </ul>
            <a
              href="/officer/login"
              className="block text-center bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-lg transition"
            >
              Officer Login
            </a>
          </div>

          {/* Manager */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-2xl font-bold text-white mb-2">Prospect Manager</h3>
            <p className="text-blue-200 mb-6">
              Add prospects in bulk, input ML scoring data, and track submissions
            </p>
            <ul className="text-white/80 mb-6 space-y-2">
              <li>✓ Bulk upload</li>
              <li>✓ Income & obligations</li>
              <li>✓ Credit score</li>
              <li>✓ Auto-scoring</li>
            </ul>
            <a
              href="/manager/login"
              className="block text-center bg-green-600 hover:bg-green-500 text-white font-semibold py-3 px-6 rounded-lg transition"
            >
              Manager Login
            </a>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid md:grid-cols-3 gap-6 text-center">
          <div className="p-6">
            <div className="text-4xl mb-2">🤖</div>
            <h4 className="text-lg font-semibold text-white mb-1">AI Scoring</h4>
            <p className="text-blue-200 text-sm">ML models predict loan intent & capacity</p>
          </div>
          <div className="p-6">
            <div className="text-4xl mb-2">⚡</div>
            <h4 className="text-lg font-semibold text-white mb-1">Instant Decisions</h4>
            <p className="text-blue-200 text-sm">Real-time eligibility assessment</p>
          </div>
          <div className="p-6">
            <div className="text-4xl mb-2">🔒</div>
            <h4 className="text-lg font-semibold text-white mb-1">Secure</h4>
            <p className="text-blue-200 text-sm">Bank-grade data protection</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-20">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-blue-200 text-sm">
          <p>IDBI Innovate 2026 — Hackathon Project</p>
        </div>
      </footer>
    </div>
  )
}
