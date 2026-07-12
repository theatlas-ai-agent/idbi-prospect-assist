import { useState, useEffect } from "react"
import { fetchLeads, type Lead } from "@/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// ponytail: shadcn dashboard-01 style components inline - horizontal topbar
function Topbar() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background px-6 lg:px-24 xl:px-32 lg:h-[60px]">
      <div className="flex items-center gap-6">
        <span className="font-semibold">IDBI Bank</span>
        <nav className="hidden md:flex gap-1 text-sm">
          <a href="#" className="rounded-lg bg-primary px-3 py-2 text-primary-foreground">Dashboard</a>
          <a href="#" className="rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted">Prospects</a>
          <a href="#" className="rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted">Analytics</a>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">Export</Button>
      </div>
    </header>
  )
}

function getScoreColor(score: number): "green" | "yellow" | "red" {
  if (score > 70) return "green"
  if (score >= 40) return "yellow"
  return "red"
}

function getPriorityVariant(priority: Lead["priority"]): "high" | "medium" | "low" {
  return priority.toLowerCase() as "high" | "medium" | "low"
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
    avgScore: leads.length > 0 ? (leads.reduce((sum, l) => sum + l.lead_score, 0) / leads.length).toFixed(1) : 0,
    totalCapacity: leads.reduce((sum, l) => sum + l.repayment_capacity, 0),
    highPriority: leads.filter(l => l.priority === "High").length,
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Topbar />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:px-24 xl:px-32 lg:py-6 border-x">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold md:text-2xl">Dashboard</h1>
          </div>

          {/* Bento Grid KPIs */}
          {!loading && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Prospects</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpis.total}</div>
                  <p className="text-xs text-muted-foreground">Active leads in pipeline</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Avg LQI Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpis.avgScore}</div>
                  <p className="text-xs text-muted-foreground">Lead Quality Index avg</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Loan Book Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{(kpis.totalCapacity / 10000000).toFixed(2)} Cr</div>
                  <p className="text-xs text-muted-foreground">Potential disbursement</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">High Priority</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{kpis.highPriority}</div>
                  <p className="text-xs text-muted-foreground">Requires immediate attention</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Search prospects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="md:w-80"
            />
            <select
              value={loanType}
              onChange={(e) => setLoanType(e.target.value)}
              className="flex h-9 w-full md:w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="all">All Products</option>
              <option value="Home">Home</option>
              <option value="Auto">Auto</option>
              <option value="Personal">Personal</option>
              <option value="Business">Business</option>
            </select>
          </div>

          {/* Data Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-center">LQI</TableHead>
                    <TableHead className="text-center">Priority</TableHead>
                    <TableHead className="text-right">Loan</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : (
                    pagedLeads.map((lead) => (
                      <>
                        <TableRow
                          key={lead.id}
                          className="hover:bg-muted/30 cursor-pointer"
                          onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}
                        >
                          <TableCell className="font-medium">{lead.rank}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{lead.name}</p>
                              <p className="text-xs text-muted-foreground">{lead.phone}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={getScoreColor(lead.lead_score)}>{lead.lead_score}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={getPriorityVariant(lead.priority)}>{lead.priority}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            ₹{(lead.repayment_capacity / 100000).toFixed(1)}L
                          </TableCell>
                          <TableCell className="text-sm">{lead.loan_type}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {expanded === lead.id ? "▴" : "▾"}
                          </TableCell>
                        </TableRow>
                        {expanded === lead.id && (
                          <TableRow key={`${lead.id}-details`} className="bg-muted/20">
                            <TableCell colSpan={7} className="p-4">
                              <div className="grid gap-4 text-sm md:grid-cols-3">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Financials</p>
                                  <div className="space-y-1">
                                    <p>Disposable Income: ₹{lead.disposable_income.toLocaleString("en-IN")}</p>
                                    <p>Permissible EMI: ₹{lead.affordable_emi.toLocaleString("en-IN")}</p>
                                    <p>Confidence: {lead.confidence}%</p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Intent Scores</p>
                                  <div className="grid grid-cols-2 gap-1 text-xs">
                                    <span>🏠 Home: {lead.intent_scores.home}%</span>
                                    <span>🚗 Auto: {lead.intent_scores.auto}%</span>
                                    <span>💳 Personal: {lead.intent_scores.personal}%</span>
                                    <span>🏢 Business: {lead.intent_scores.business}%</span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Reasons</p>
                                  <ul className="text-xs space-y-0.5">
                                    {lead.reasons.map((r, i) => <li key={i}>• {r}</li>)}
                                  </ul>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {!loading && filteredLeads.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Showing {pagedLeads.length} of {filteredLeads.length}</span>
              {totalPages > 1 && (
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                  <span className="px-3 py-1">{page}/{totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
                </div>
              )}
            </div>
          )}
        </main>
    </div>
  )
}
