import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'

export function ManagerDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Prospect Manager</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">Upload and manage prospects for scoring.</p>
          <div className="flex gap-4">
            <Button asChild className="bg-blue-900 hover:bg-blue-800">
              <a href="/manager/add">+ Add Prospects</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/manager/list">View Prospects</a>
            </Button>
          </div>
          <p className="text-center text-sm text-gray-500 mt-4">
            <a href="/" className="text-blue-600 hover:underline">← Back to home</a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
