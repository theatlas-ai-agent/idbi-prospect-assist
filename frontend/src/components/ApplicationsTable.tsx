import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Application {
  application_id: string
  customer_id: string
  loan_type: string
  amount: number
  purpose: string
  status: string
  created_at: string
}

export function ApplicationsTable() {
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/applications")
      .then(r => r.json())
      .then((data: any) => {
        setApps(data.applications || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-muted-foreground p-4">Loading applications...</p>

  return (
    <Card>
      <CardHeader>
        <CardTitle>Loan Applications ({apps.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {apps.length === 0 ? (
          <p className="p-4 text-muted-foreground">No applications submitted yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Application ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Loan Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apps.map(a => (
                <TableRow key={a.application_id}>
                  <TableCell className="font-mono text-xs">{a.application_id}</TableCell>
                  <TableCell>{a.customer_id}</TableCell>
                  <TableCell>{a.loan_type}</TableCell>
                  <TableCell>₹{Number(a.amount).toLocaleString()}</TableCell>
                  <TableCell>{a.purpose}</TableCell>
                  <TableCell><Badge>{a.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
