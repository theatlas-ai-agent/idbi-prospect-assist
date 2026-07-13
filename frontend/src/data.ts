export interface Lead {
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
  loan_type: "Home" | "Auto" | "Personal" | "Business"
  intent_scores: {
    home: number
    auto: number
    personal: number
    business: number
  }
  confidence: number
  reasons: string[]
  rank: number
}

// ponytail: API_URL comes from Vite proxy in dev, hardcode for production
const API_URL = "/leads"

export async function fetchLeads(): Promise<Lead[]> {
  try {
    const resp = await fetch(`${API_URL}`)
    if (!resp.ok) throw new Error(`API error: ${resp.status}`)
    return await resp.json()
  } catch (e) {
    console.error("API fetch failed:", e)
    return []
  }
}
