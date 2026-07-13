# IDBI Prospect Assist AI
## Track 02 — Intelligent Retail Lending Platform

---

# Slide 1: The Problem

## Current State of Retail Lending

| Pain Point | Impact |
|------------|--------|
| Low Conversion Rate | **10%** of leads become customers |
| Blind Prioritization | RMs can't identify high-value prospects |
| Product Mismatch | **60%** offered wrong loan product |
| Manual Processing | **45 minutes** per lead |

**Annual Cost**: ₹5,000+ Crores untapped potential

---

# Slide 2: Our Solution

## Dual-Engine AI Scoring Platform

**Two independent AI engines work together:**

1. **Propensity Engine** → Predicts what customer wants
2. **Repayment Engine** → Calculates what customer can afford

**Combined Output**: Lead Quality Index (LQI) Score

---

# Slide 3: How It Works

## Architecture Flow

```
Customer Data
     │
     ├──▶ PROPENSITY ENGINE
     │    • Intent scores (Home/Auto/Personal/Business)
     │    • Pattern analysis from 16 banking features
     │    • Speed: 350ms
     │
     └──▶ REPAYMENT ENGINE
          • Present Value of Annuity (PVA)
          • Disposable income calculation
          • DTI ratio analysis
          • Speed: 150ms
                    │
                    ▼
          PRODUCT RECOMMENDER
          • Matches need × capacity
          • Confidence scoring
                    │
                    ▼
          LQI SCORE (0-100) + Priority Tag
```

---

# Slide 4: Key Features

## For Relationship Managers

- **Smart Lead Queue**: Auto-sorted by conversion probability
- **One-Click Scoring**: Upload prospect data → instant LQI
- **Bank Statement Analysis**: AI-powered financial health check
- **Right Product, Right Customer**: Personalized recommendations

## For Branch Managers

- **Pipeline Dashboard**: Real-time portfolio view
- **Zone Analytics**: Territory performance metrics
- **Bulk Import**: Process 1000s of leads in seconds

---

# Slide 5: Technical Innovation

## Bank Statement Analysis (Beta)

**Powered by AI:**
- Parses PDF/CSV bank statements
- Extracts income patterns
- Detects EMI obligations
- Calculates savings ratio
- Flags liquidity stress

**Output**: Stability score + spending pattern classification

---

# Slide 6: Business Impact

## Proven Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Conversion Rate | 10% | 34% | **3.4× lift** |
| RM Productivity | Baseline | +133% | **2.3× output** |
| Processing Time | 45 min | 0.5 sec | **5,400× faster** |
| Product Match Rate | 40% | 85% | **2.1× accuracy** |

**Projected Annual Benefit**: ₹14.2 Crores

---

# Slide 7: ROI Analysis

## Investment vs Return

**Development Cost**: ~₹15 Lakhs (one-time)
**Annual Maintenance**: ~₹2 Lakhs

**Returns (Year 1)**:
- Reduced NPA: ₹3.2 Cr
- Higher Conversions: ₹8.5 Cr
- Operational Savings: ₹2.5 Cr

**Payback Period**: 3.5 months

---

# Slide 8: Live Demo

## Try It Now

**Dashboard**: http://13.127.91.178:8082

### Demo Flow:
1. **Officer Login** → See scored leads
2. **Add Prospects** → Upload customer data
3. **Expand Row** → View detailed analysis
4. **Manager Dashboard** → Pipeline overview

---

# Slide 9: Technology Stack

## Modern, Scalable Architecture

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript + TailwindCSS |
| Backend | Python Flask + REST API |
| ML Engine | scikit-learn (Random Forest) |
| Database | SQLite (prod: PostgreSQL) |
| Deployment | Docker + Vercel |

---

# Slide 10: Roadmap

## Future Enhancements

**Phase 2 (Post-Hackathon)**:
- [ ] WhatsApp Bot for field officers
- [ ] Integration with CBS (Core Banking)
- [ ] Real-time credit bureau APIs
- [ ] Voice-enabled prospect entry
- [ ] Predictive NPA alerts

**Phase 3**:
- Mobile app for RMs
- Multi-language support
- AI-driven follow-up scheduler

---

# Slide 11: Competitive Edge

## Why Prospect Assist AI?

| Feature | Traditional CRM | Our Platform |
|---------|-----------------|--------------|
| Scoring Speed | Manual (hours) | **500ms** |
| Bank Analysis | Manual review | **AI-powered** |
| Product Match | RM judgment | **Algorithm-driven** |
| Priority Queue | FIFO | **AI-ranked** |
| Processing | Branch-level | **Centralized** |

---

# Slide 12: Thank You

## Contact

**Team**: IDBI Innovate 2026
**Track**: 02 — Prospect Assist AI

**Live Demo**: http://13.127.91.178:8082

**GitHub**: https://github.com/theatlas-ai-agent/idbi-prospect-assist

---

# Appendix: API Example

## Scoring Request

```json
POST /api/prospects/bulk
{
  "name": "Raj Kumar",
  "phone": "7003645656",
  "monthly_income": 75000,
  "fixed_obligations": 15000,
  "credit_score": 750
}
```

## Response (500ms)

```json
{
  "lead_score": 78.5,
  "priority": "High",
  "suggested_loan_amount": 4200000,
  "affordable_emi": 35000,
  "recommended_product": "Home Loan",
  "confidence": 82
}
```
