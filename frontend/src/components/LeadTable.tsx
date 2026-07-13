import React, { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
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
  const pct = Math.min(100, Math.max(0, score))
  const color =
    score >= 75
      ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
      : score >= 45
      ? "bg-gradient-to-r from-amber-500 to-amber-400"
      : "bg-gradient-to-r from-rose-500 to-rose-400"
  const trackColor =
    score >= 75
      ? "bg-emerald-50"
      : score >= 45
      ? "bg-amber-50"
      : "bg-rose-50"

  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-24 h-1.5 rounded-full ${trackColor} overflow-hidden`}>
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`text-xs font-semibold w-8 text-right ${
          score >= 75 ? "text-emerald-600" : score >= 45 ? "text-amber-600" : "text-rose-600"
        }`}
      >
        {score}
      </span>
    </div>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    High: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60",
    Medium: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60",
    Low: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60",
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${styles[priority] || ""}`}
    >
      {priority === "High" && (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {priority}
    </span>
  )
}

function BankVerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-xs font-medium rounded border border-emerald-200/50">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      Verified
    </span>
  )
}

function IntentBar({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-xs text-slate-500">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-600 w-7 text-right">{value}</span>
    </div>
  )
}

function ExpandedRow({ lead }: { lead: Lead }) {
  return (
    <div className="bg-slate-50 border-y border-slate-200 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 py-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Financials */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Financial Overview
              </h4>
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Disposable Income</span>
                <span className="font-semibold text-slate-800">
                  ₹{(lead.disposable_income || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Affordable EMI</span>
                <span className="font-semibold text-slate-800">
                  ₹{(lead.affordable_emi || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Suggested Loan</span>
                <span className="font-semibold text-slate-800">
                  ₹{(lead.suggested_loan_amount / 100000).toFixed(1)}L
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Confidence</span>
                <span className="font-semibold text-blue-600">{lead.confidence}%</span>
              </div>
            </div>
          </div>

          {/* Intent Scores */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Intent Analysis
              </h4>
            </div>
            <div className="space-y-3">
              <IntentBar label="Home" value={lead.intent_scores.home} color="bg-blue-500" />
              <IntentBar label="Auto" value={lead.intent_scores.auto} color="bg-cyan-500" />
              <IntentBar label="Personal" value={lead.intent_scores.personal} color="bg-violet-500" />
              <IntentBar label="Business" value={lead.intent_scores.business} color="bg-amber-500" />
            </div>
          </div>

          {/* Why & Bank Analysis */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Score Breakdown
              </h4>
            </div>
            <div className="mb-3">
              <p className="text-xs text-slate-500 mb-1.5">Why This Score</p>
              <ul className="space-y-1">
                {lead.reasons.slice(0, 3).map((r, i) => (
                  <li key={i} className="text-xs text-slate-600 flex gap-1.5">
                    <span className="text-blue-400 mt-0.5">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-1">Recommended</p>
              <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md">
                {lead.recommended_product}
              </span>
            </div>

            {/* Bank Statement Analysis */}
            {(lead.bank_verified || lead.bank_analysis) && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Bank Analysis
                  </p>
                  <BankVerifiedBadge />
                </div>
                {lead.bank_analysis && (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Avg Inflow</span>
                      <span className="font-medium text-slate-700">
                        ₹{(lead.bank_analysis.avg_monthly_inflow || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">EMI Count</span>
                      <span className="font-medium text-slate-700">
                        {lead.bank_analysis.emi_count}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Savings Ratio</span>
                      <span className="font-medium text-slate-700">
                        {lead.bank_analysis.savings_ratio}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 w-20">Stability</span>
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            lead.bank_analysis.stability_score > 70
                              ? "bg-emerald-500"
                              : lead.bank_analysis.stability_score >= 40
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${lead.bank_analysis.stability_score}%` }}
                        />
                      </div>
                      <span className="font-medium text-slate-700 w-8 text-right">
                        {lead.bank_analysis.stability_score}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
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
    fetchLeads().then((data) => {
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
  useEffect(() => {
    setPage(1)
  }, [search, loanType])

  const kpis = {
    total: leads.length,
    avgScore:
      leads.length > 0
        ? (leads.reduce((sum, l) => sum + l.lead_score, 0) / leads.length).toFixed(1)
        : "0",
    totalCapacity: leads.reduce((sum, l) => sum + l.repayment_capacity, 0),
    highPriority: leads.filter((l) => l.priority === "High").length,
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <DashboardHeader title="Officer Dashboard" subtitle="Lead Scoring Platform" showNav />

      <main className="flex-1 w-full">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Prospect Pipeline</h1>
                <p className="text-slate-400 text-sm mt-1">
                  {loading ? "Loading..." : `${filteredLeads.length} leads · Ranked by Loan Quality Index`}
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
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Total Prospects
                    </p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">
                      {loading ? "—" : kpis.total}
                    </p>
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
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Avg LQI Score
                    </p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">
                      {loading ? "—" : kpis.avgScore}
                    </p>
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
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Loan Book Value
                    </p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">
                      {loading ? "—" : `₹${(kpis.totalCapacity / 10000000).toFixed(1)}Cr`}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <span className="text-amber-600 font-bold text-lg">₹</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-rose-200/50 shadow-lg shadow-rose-200/30">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-rose-600 uppercase tracking-wide">
                      High Priority
                    </p>
                    <p className="text-3xl font-bold text-rose-600 mt-1">
                      {loading ? "—" : kpis.highPriority}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Table Section */}
        <div className="max-w-6xl mx-auto px-6 py-6">
          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 mb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <Input
                  placeholder="Search by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Product:</span>
                <select
                  value={loanType}
                  onChange={(e) => setLoanType(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all outline-none cursor-pointer"
                >
                  <option value="all">All Products</option>
                  <option value="Home">Home Loan</option>
                  <option value="Auto">Auto Loan</option>
                  <option value="Personal">Personal Loan</option>
                  <option value="Business">Business Loan</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-200/80">
                  <TableHead className="w-10 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                    #
                  </TableHead>
                  <TableHead className="text-slate-600 font-semibold text-xs uppercase tracking-wider">
                    Prospect
                  </TableHead>
                  <TableHead className="text-center text-slate-600 font-semibold text-xs uppercase tracking-wider">
                    LQI Score
                  </TableHead>
                  <TableHead className="text-center text-slate-600 font-semibold text-xs uppercase tracking-wider">
                    Priority
                  </TableHead>
                  <TableHead className="text-right text-slate-600 font-semibold text-xs uppercase tracking-wider">
                    Max Loan
                  </TableHead>
                  <TableHead className="text-slate-600 font-semibold text-xs uppercase tracking-wider">
                    Product
                  </TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                        <span className="text-slate-400 text-sm">Loading prospects...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pagedLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="text-slate-500 text-sm">No prospects found</p>
                        <p className="text-slate-400 text-xs">Try adjusting your filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedLeads.map((lead, idx) => (
                    <React.Fragment key={lead.id}>
                      <TableRow
                        className={`group hover:bg-slate-50/60 cursor-pointer transition-colors ${
                          idx % 2 === 0 ? "" : "bg-slate-50/20"
                        }`}
                        onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}
                      >
                        <TableCell className="pl-5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                            <span className="text-xs font-bold text-slate-500">{lead.rank}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-sm font-semibold">
                              {lead.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{lead.name}</p>
                              <p className="text-xs text-slate-400">{lead.phone}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <ScoreBar score={lead.lead_score} />
                        </TableCell>
                        <TableCell className="text-center">
                          <PriorityBadge priority={lead.priority} />
                        </TableCell>
                        <TableCell className="pr-5 text-right">
                          <span className="font-mono text-sm font-semibold text-slate-700">
                            ₹{(lead.repayment_capacity / 100000).toFixed(1)}
                            <span className="text-slate-400 font-normal text-xs ml-0.5">L</span>
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-600">{lead.loan_type}</span>
                            {lead.bank_verified && <BankVerifiedBadge />}
                          </div>
                        </TableCell>
                        <TableCell className="pr-5">
                          <div
                            className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                              expanded === lead.id
                                ? "bg-slate-200 rotate-180"
                                : "bg-slate-100 group-hover:bg-slate-200"
                            }`}
                          >
                            <svg
                              className="w-3.5 h-3.5 text-slate-500 transition-transform"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        </TableCell>
                      </TableRow>

                      {expanded === lead.id && (
                        <TableRow>
                          <TableCell colSpan={7} className="p-0">
                            <ExpandedRow lead={lead} />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!loading && filteredLeads.length > 0 && (
            <div className="flex items-center justify-between mt-4 px-2">
              <span className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-medium text-slate-700">
                  {Math.min((page - 1) * pageSize + 1, filteredLeads.length)}–
                  {Math.min(page * pageSize, filteredLeads.length)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-slate-700">{filteredLeads.length}</span> prospects
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Prev
                  </Button>
                  <div className="flex items-center gap-1 mx-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (page <= 3) {
                        pageNum = i + 1
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = page - 2 + i
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${
                            page === pageNum
                              ? "bg-blue-600 text-white"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  >
                    Next
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-center py-4 text-xs border-t border-slate-800">
        IDBI Innovate 2026 — Lead Scoring Platform — Hackathon Project
      </footer>
    </div>
  )
}
