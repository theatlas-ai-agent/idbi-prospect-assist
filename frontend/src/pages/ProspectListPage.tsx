import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { DashboardHeader } from '../components/DashboardHeader'

interface Prospect {
  customer_id: string
  name: string
  phone: string
  monthly_inflow: number
  fixed_obligations: number
  credit_score: number
  lead_score: number
  repayment_capacity: number
  priority: string
  recommended_product?: string
  status?: string
}

export function ProspectListPage() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  useEffect(() => {
    fetch('/api/prospects')
      .then(r => r.json())
      .then(data => setProspects(data.prospects || []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = priorityFilter === 'all'
    ? prospects
    : prospects.filter(p => p.priority === priorityFilter)

  const highPriority = prospects.filter(p => p.priority === 'High').length
  const avgScore = prospects.length > 0
    ? (prospects.reduce((sum, p) => sum + (p.lead_score || 0), 0) / prospects.length).toFixed(1)
    : '—'
  const pipelineValue = prospects.reduce((s, p) => s + (p.repayment_capacity || 0), 0)

  const priorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      High: 'bg-red-50 text-red-700 border-red-200',
      Medium: 'bg-amber-50 text-amber-700 border-amber-200',
      Low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    }
    return styles[priority] || 'bg-gray-50 text-gray-600 border-gray-200'
  }

  const lqiBadge = (score: number) => {
    if (score >= 70) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (score >= 40) return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-gray-50 text-gray-600 border-gray-200'
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <DashboardHeader title="Manager Dashboard" subtitle="Prospect Management" showNav />

      <main className="flex-1 w-full">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">All Prospects</h1>
                <p className="text-slate-400 text-sm mt-1">
                  {loading ? 'Loading...' : `${filtered.length} leads · Ranked by Loan Quality Index`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link to="/manager/dashboard">
                  <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 bg-transparent">
                    Dashboard
                  </Button>
                </Link>
                <Link to="/manager/add">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    + Add Prospects
                  </Button>
                </Link>
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
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Leads</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{loading ? '—' : prospects.length}</p>
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
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Avg LQI Score</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{loading ? '—' : avgScore}</p>
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
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">High Priority</p>
                    <p className="text-3xl font-bold text-rose-600 mt-1">{loading ? '—' : highPriority}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200/80 shadow-lg shadow-slate-200/50">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pipeline Value</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">
                      {loading ? '—' : `₹${(pipelineValue / 100000).toFixed(1)}L`}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <span className="text-amber-600 font-bold text-lg">₹</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="max-w-6xl mx-auto px-6 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 font-medium">Filter:</span>
            {['all', 'High', 'Medium', 'Low'].map(f => (
              <button
                key={f}
                onClick={() => setPriorityFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                  priorityFilter === f
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="max-w-6xl mx-auto px-6 pb-6">
          <Card className="bg-white border-slate-200/80 shadow-lg shadow-slate-200/50">
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-16 text-slate-400">Loading prospects...</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-slate-400 mb-4">No prospects found</p>
                  <Link to="/manager/add">
                    <Button className="bg-blue-900 hover:bg-blue-800">+ Add First Prospect</Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <th className="px-5 py-3">Prospect</th>
                        <th className="px-5 py-3">Contact</th>
                        <th className="px-5 py-3 text-right">Income</th>
                        <th className="px-5 py-3 text-center">LQI Score</th>
                        <th className="px-5 py-3 text-right">Capacity</th>
                        <th className="px-5 py-3 text-center">Priority</th>
                        <th className="px-5 py-3 text-center">Product</th>
                        <th className="px-5 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(p => (
                        <React.Fragment key={p.customer_id}>
                          <tr
                            className="border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-colors"
                            onClick={() => setExpanded(expanded === p.customer_id ? null : p.customer_id)}
                          >
                            <td className="px-5 py-4">
                              <div className="font-medium text-slate-800">{p.name || '—'}</div>
                              <div className="text-xs text-slate-400">{p.customer_id}</div>
                            </td>
                            <td className="px-5 py-4 text-slate-600">{p.phone || '—'}</td>
                            <td className="px-5 py-4 text-right font-mono text-slate-700">
                              ₹{(p.monthly_inflow || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${lqiBadge(p.lead_score || 0)}`}>
                                {p.lead_score || '—'}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right font-mono text-slate-700">
                              ₹{((p.repayment_capacity || 0) / 100000).toFixed(1)}L
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${priorityBadge(p.priority)}`}>
                                {p.priority || '—'}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center text-xs text-slate-600">
                              {p.recommended_product || '—'}
                            </td>
                            <td className="px-5 py-4 text-slate-400">
                              <span className="text-lg">{expanded === p.customer_id ? '−' : '+'}</span>
                            </td>
                          </tr>
                          {expanded === p.customer_id && (
                            <tr className="bg-slate-50/60">
                              <td colSpan={8} className="px-5 py-4">
                                <div className="flex flex-wrap gap-8 text-sm">
                                  <div className="min-w-[180px]">
                                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Credit</p>
                                    <div className="space-y-1 text-slate-700">
                                      <p>Credit Score: <span className="font-medium">{p.credit_score || '—'}</span></p>
                                      <p>Obligations: <span className="font-medium">₹{(p.fixed_obligations || 0).toLocaleString('en-IN')}</span></p>
                                    </div>
                                  </div>
                                  <div className="min-w-[180px]">
                                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Capacity</p>
                                    <div className="space-y-1 text-slate-700">
                                      <p>Max Loan: <span className="font-medium">₹{((p.repayment_capacity || 0) / 100000).toFixed(1)}L</span></p>
                                      <p>Product: <span className="font-medium">{p.recommended_product || '—'}</span></p>
                                    </div>
                                  </div>
                                  <div className="min-w-[180px]">
                                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Status</p>
                                    <div className="space-y-1 text-slate-700">
                                      <p>Status: <span className="font-medium">{p.status || 'New'}</span></p>
                                      <p>ID: <span className="font-mono text-xs">{p.customer_id}</span></p>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
