import { useState, useEffect } from 'react'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { DashboardHeader } from '../components/DashboardHeader'

interface Prospect {
  customer_id: string
  priority: string
}

interface Application {
  application_id: string
}

export function ManagerDashboard() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/prospects').then(r => r.json()),
      fetch('/api/applications').then(r => r.json()),
    ])
      .then(([prospectsData, appsData]) => {
        setProspects(prospectsData.prospects || [])
        setApplications(appsData.applications || [])
      })
      .finally(() => setLoading(false))
  }, [])

  const totalProspects = prospects.length
  const totalApplications = applications.length
  const conversionRate = loading || totalProspects === 0
    ? '—'
    : ((totalApplications / totalProspects) * 100).toFixed(1) + '%'
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      <DashboardHeader title="Manager Dashboard" subtitle="Prospect Management" showNav />

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-6">

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-blue-900">Prospect Manager</h2>
          <p className="text-gray-500 text-sm">Manage prospects and track loan applications</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="pt-4">
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Total Prospects</p>
              <p className="text-2xl font-bold text-blue-900">{loading ? '—' : totalProspects}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="pt-4">
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Applications</p>
              <p className="text-2xl font-bold text-blue-900">{loading ? '—' : totalApplications}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="pt-4">
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Conversion Rate</p>
              <p className="text-2xl font-bold text-orange-600">{conversionRate}</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl">
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#1e3a8a' }}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-blue-900">Add Prospects</h3>
                  <p className="text-xs text-gray-500">Upload new prospects for scoring</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Enter prospect details including income, obligations, and credit score. The AI will score and prioritize each prospect automatically.
              </p>
              <a href="/manager/add">
                <Button className="w-full bg-blue-900 hover:bg-blue-800">+ Add New Prospects</Button>
              </a>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#1e3a8a' }}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-blue-900">View All Prospects</h3>
                  <p className="text-xs text-gray-500">Browse and manage prospects</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                View all uploaded prospects, their LQI scores, priority ratings, and repayment capacity. Track application status.
              </p>
              <a href="/manager/list">
                <Button variant="outline" className="w-full border-blue-900 text-blue-900 hover:bg-blue-50">View All Prospects</Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="bg-blue-900 text-blue-200 text-center py-4 text-xs">
        IDBI Innovate 2026 — Lead Scoring Platform — Hackathon Project
      </footer>
    </div>
  )
}
