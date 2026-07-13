import React, { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge" // ponytail: unused
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DashboardHeader } from "@/components/DashboardHeader"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface BankAnalysis {
  avg_monthly_inflow: number
  stability_score: number
  emi_count: number
  savings_ratio: number
  liquidity_stress: number
  spending_pattern: "conservative" | "moderate" | "aggressive"
  categories: { name: string; amount: number }[]
}

interface Lead {
  id: number
  name: string
  phone: string
  lead_score: number
  priority: "High" | "Medium" | "Low"
  repayment_capacity: number
  disposable_income: number
  affordable_emi: number
  suggested_loan_amount: number
  recommended_product: string
  loan_type: string
  intent_scores: { home: number; auto: number; personal: number; business: number }
  confidence: number
  reasons: string[]
  rank: number
  bank_verified?: boolean
  bank_analysis?: BankAnalysis
}

async function fetchLeads(): Promise<Lead[]> {
  try {
    const resp = await fetch(`/leads`)
    if (!resp.ok) throw new Error(`API error: ${resp.status}`)
    return await resp.json()
  } catch {
    return []
  }
}

function ScoreBar({ score }: { score: number }) {
  const color = score > 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500"
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-gray-200 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-700">{score}</span>
    </div>
  )
}

export function LeadTable() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const [loanType, setLoanType] = useState<string>("all")
  const [page, setPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    fetchLeads().then(data => {
      setLeads(data)
      setLoading(false)
    })
  }, [])

  const filteredLeads = leads.filter((lead) => {
    if (search && !lead.name.toLowerCase().includes(search.toLowerCase())) return false
    if (loanType !== "all" && lead.loan_type !== loanType) return false
    return true
  })

  const totalPages = Math.ceil(filteredLeads.length / pageSize)
  const pagedLeads = filteredLeads.slice((page - 1) * pageSize, page * pageSize)
  useEffect(() => { setPage(1) }, [search, loanType])

  const kpis = {
    total: leads.length,
    avgScore: leads.length > 0 ? (leads.reduce((sum, l) => sum + l.lead_score, 0) / leads.length).toFixed(1) : "0",
    totalCapacity: leads.reduce((sum, l) => sum + l.repayment_capacity, 0),
    highPriority: leads.filter(l => l.priority === "High").length,
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <DashboardHeader title="Officer Dashboard" subtitle="Lead Scoring Platform" showNav />

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-6">

        {/* Page title */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-blue-900">Officer Dashboard</h2>
          <p className="text-gray-500 text-sm">View and manage all scored prospects</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="pt-4">
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Total Prospects</p>
              <p className="text-2xl font-bold text-blue-900">{loading ? "—" : kpis.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="pt-4">
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Avg LQI Score</p>
              <p className="text-2xl font-bold text-blue-900">{loading ? "—" : kpis.avgScore}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="pt-4">
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Loan Book Value</p>
              <p className="text-2xl font-bold text-blue-900">₹{loading ? "—" : (kpis.totalCapacity / 10000000).toFixed(1)} Cr</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="pt-4">
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">High Priority</p>
              <p className="text-2xl font-bold text-orange-600">{loading ? "—" : kpis.highPriority}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:w-72"
          />
          <select
            value={loanType}
            onChange={(e) => setLoanType(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="all">All Products</option>
            <option value="Home">Home Loan</option>
            <option value="Auto">Auto Loan</option>
            <option value="Personal">Personal Loan</option>
            <option value="Business">Business Loan</option>
          </select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-blue-50">
                  <TableHead className="w-10 text-blue-900 font-semibold">#</TableHead>
                  <TableHead className="text-blue-900 font-semibold">Name</TableHead>
                  <TableHead className="text-center text-blue-900 font-semibold">LQI Score</TableHead>
                  <TableHead className="text-center text-blue-900 font-semibold">Priority</TableHead>
                  <TableHead className="text-right text-blue-900 font-semibold">Max Loan</TableHead>
                  <TableHead className="text-blue-900 font-semibold">Product</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-400">Loading leads...</TableCell>
                  </TableRow>
                ) : pagedLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-400">No prospects found</TableCell>
                  </TableRow>
                ) : (
                  pagedLeads.map((lead) => (
                    <React.Fragment key={lead.id}>
                      <TableRow
                        className="hover:bg-blue-50/50 cursor-pointer border-b border-gray-100"
                        onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}
                      >
                        <TableCell className="font-medium text-gray-500">{lead.rank}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-800">{lead.name}</p>
                            <p className="text-xs text-gray-400">{lead.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <ScoreBar score={lead.lead_score} />
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`px-2.5 py-1 rounded text-xs font-semibold ${
                            lead.priority === "High" ? "bg-red-100 text-red-700" :
                            lead.priority === "Medium" ? "bg-yellow-100 text-yellow-700" :
                            "bg-green-100 text-green-700"
                          }`}>
                            {lead.priority}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-gray-700">
                          ₹{(lead.repayment_capacity / 100000).toFixed(1)}L
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {lead.loan_type}
                          {lead.bank_verified && (
                            <span title="Bank Verified" className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded bg-green-100 text-green-700 align-middle">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12zm1-5.5V9h-2v1.5H7.5V11h2V12.5H10v1h1.5v-2H11z"/></svg>
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-400 text-sm">
                          {expanded === lead.id ? "▲" : "▼"}
                        </TableCell>
                      </TableRow>
                      {expanded === lead.id && (
                        <TableRow key={`${lead.id}-details`} className="bg-blue-50/40 border-b border-gray-100">
                          <TableCell colSpan={7} className="p-4">
                            <div className="grid gap-4 text-sm md:grid-cols-3">
                              <div>
                                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">Financials</p>
                                <div className="space-y-1 text-gray-600">
                                  <p>Disposable Income: <span className="font-medium text-gray-800">₹{(lead.disposable_income || 0).toLocaleString("en-IN")}</span></p>
                                  <p>Affordable EMI: <span className="font-medium text-gray-800">₹{(lead.affordable_emi || 0).toLocaleString("en-IN")}</span></p>
                                  <p>Suggested Loan: <span className="font-medium text-gray-800">₹{(lead.suggested_loan_amount / 100000).toFixed(1)}L</span></p>
                                  <p>Confidence: <span className="font-medium text-gray-800">{lead.confidence}%</span></p>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">Intent Scores</p>
                                <div className="space-y-1.5 text-gray-600">
                                  <div className="flex items-center gap-2">
                                    <span className="w-16 text-xs">Home</span>
                                    <div className="flex-1 bg-gray-200 rounded-full h-2"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${lead.intent_scores.home}%` }} /></div>
                                    <span className="text-xs font-medium w-8">{lead.intent_scores.home}%</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="w-16 text-xs">Auto</span>
                                    <div className="flex-1 bg-gray-200 rounded-full h-2"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${lead.intent_scores.auto}%` }} /></div>
                                    <span className="text-xs font-medium w-8">{lead.intent_scores.auto}%</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="w-16 text-xs">Personal</span>
                                    <div className="flex-1 bg-gray-200 rounded-full h-2"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${lead.intent_scores.personal}%` }} /></div>
                                    <span className="text-xs font-medium w-8">{lead.intent_scores.personal}%</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="w-16 text-xs">Business</span>
                                    <div className="flex-1 bg-gray-200 rounded-full h-2"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${lead.intent_scores.business}%` }} /></div>
                                    <span className="text-xs font-medium w-8">{lead.intent_scores.business}%</span>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">Why This Score</p>
                                <ul className="space-y-1">
                                  {lead.reasons.map((r, i) => <li key={i} className="text-gray-600 text-xs">• {r}</li>)}
                                </ul>
                                <p className="text-xs text-gray-500 mt-2">Recommended: <span className="font-medium text-blue-700">{lead.recommended_product}</span></p>
                                {(lead.bank_verified || lead.bank_analysis) && (
                                  <div className="mt-4 pt-3 border-t border-blue-200">
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Bank Statement Analysis</p>
                                      <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">Bank Verified</span>
                                    </div>
                                    {lead.bank_analysis && (
                                      <>
                                        <div className="space-y-0.5 text-xs text-gray-600">
                                          <p>Avg Monthly Inflow: <span className="font-medium text-gray-800">₹{(lead.bank_analysis.avg_monthly_inflow || 0).toLocaleString("en-IN")}</span></p>
                                          <p>EMI Count: <span className="font-medium text-gray-800">{lead.bank_analysis.emi_count}</span></p>
                                          <p>Savings Ratio: <span className="font-medium text-gray-800">{lead.bank_analysis.savings_ratio}%</span></p>
                                          <p>Liquidity Stress: <span className="font-medium text-gray-800">{lead.bank_analysis.liquidity_stress}%</span></p>
                                          <p>Spending Pattern: <span className={`font-medium ${lead.bank_analysis.spending_pattern === "conservative" ? "text-green-700" : lead.bank_analysis.spending_pattern === "moderate" ? "text-yellow-700" : "text-red-700"}`}>{lead.bank_analysis.spending_pattern}</span></p>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-gray-500 w-20">Stability Score</span>
                                            <div className="flex-1 bg-gray-200 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${lead.bank_analysis.stability_score > 70 ? "bg-green-500" : lead.bank_analysis.stability_score >= 40 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${lead.bank_analysis.stability_score}%` }} /></div>
                                            <span className="text-xs font-medium w-8">{lead.bank_analysis.stability_score}/100</span>
                                          </div>
                                        </div>
                                        {lead.bank_analysis.categories && lead.bank_analysis.categories.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-2">
                                            {lead.bank_analysis.categories.map((cat, i) => (
                                              <span key={i} className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">{cat.name}: ₹{(cat.amount / 1000).toFixed(0)}K</span>
                                            ))}
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {!loading && filteredLeads.length > 0 && (
          <div className="flex items-center justify-between text-sm text-gray-500 mt-4">
            <span>Showing {Math.min((page - 1) * pageSize + 1, filteredLeads.length)}–{Math.min(page * pageSize, filteredLeads.length)} of {filteredLeads.length}</span>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <span className="px-3 py-1 text-sm">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-blue-900 text-blue-200 text-center py-4 text-xs">
        IDBI Innovate 2026 — Lead Scoring Platform — Hackathon Project
      </footer>
    </div>
  )
}
