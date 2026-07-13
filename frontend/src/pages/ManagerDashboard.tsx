import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { DashboardHeader } from '../components/DashboardHeader'

interface Prospect {
  customer_id: string
  priority: string
  monthly_inflow: number
  repayment_capacity: number
  lead_score: number
  recommended_product?: string
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
  const avgLQI = prospects.length > 0
    ? (prospects.reduce((sum, p) => sum + (p.lead_score || 0), 0) / prospects.length).toFixed(1)
    : '—'
  const highPriority = prospects.filter(p => p.priority === 'High').length
  const totalCapacity = prospects.reduce((sum, p) => sum + (p.repayment_capacity || 0), 0)
  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <DashboardHeader title="Manager Dashboard" subtitle="Prospect Management" showNav />

      <main className="flex-1 w-full">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Prospect Manager</h1>
                <p className="text-slate-400 text-sm mt-1">
                  {loading ? 'Loading...' : `${totalProspects} prospects · Manage and track applications`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 text-white/80 text-xs font-medium rounded-lg border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="max-w-6xl mx-auto px-6 -mt-5 pb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white border-slate-200/80 shadow-lg shadow-slate-200/50">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Prospects</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{loading ? '—' : totalProspects}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200/80 shadow-lg shadow-slate-200/50">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Applications</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{loading ? '—' : totalApplications}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200/80 shadow-lg shadow-slate-200/50">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Avg LQI Score</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{loading ? '—' : avgLQI}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200/80 shadow-lg shadow-slate-200/50">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Conversion Rate</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{conversionRate}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Cards */}
        <div className="max-w-6xl mx-auto px-6 pb-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-white border-slate-200/80 shadow-lg shadow-slate-200/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Add Prospects</h3>
                    <p className="text-xs text-slate-500">Upload new prospects for scoring</p>
                  </div>
                </div>
                <p className="text-slate-600 text-sm mb-4">
                  Enter prospect details including income, obligations, and credit score. The AI will score and prioritize each prospect automatically.
                </p>
                <a href="/manager/add">
                  <Button className="w-full bg-blue-900 hover:bg-blue-800">+ Add New Prospects</Button>
                </a>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200/80 shadow-lg shadow-slate-200/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">View All Prospects</h3>
                    <p className="text-xs text-slate-500">Browse and manage prospects</p>
                  </div>
                </div>
                <p className="text-slate-600 text-sm mb-4">
                  View all uploaded prospects, their LQI scores, priority ratings, and repayment capacity. Track application status.
                </p>
                <Link to="/manager/list">
                  <Button variant="outline" className="w-full border-blue-900 text-blue-900 hover:bg-blue-50">View All Prospects</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="bg-blue-900 text-blue-200 text-center py-4 text-xs">
        IDBI Innovate 2026 — Lead Scoring Platform — Hackathon Project
      </footer>
    </div>
  )
}
