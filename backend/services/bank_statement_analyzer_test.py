"""Bank Statement Analyzer — PDF/CSV parsing for income extraction, EMI detection, spending patterns.

Ponytail: stdlib csv for CSV, pdfplumber for PDF tables. No over-engineering.
"""

import csv
import re
from pathlib import Path
from typing import NamedTuple, Optional
from collections import defaultdict


class Transaction(NamedTuple):
    """Normalized bank transaction."""
    date: str
    description: str
    amount: float
    balance: float
    tx_type: str  # 'credit' or 'debit'


class EMI(NamedTuple):
    """Detected EMI."""
    description: str
    amount: float
    frequency: str  # 'monthly'
    confidence: float  # 0-1


class Cashflow(NamedTuple):
    """Cashflow summary."""
    total_credits: float
    total_debits: float
    net_flow: float
    avg_monthly_credit: float
    avg_monthly_debit: float
    credit_count: int
    debit_count: int


# Income keywords (Indian banking context)
_INCOME_KEYWORDS = (
    'salary', 'wages', 'credit salary', 'salary credit', 'payroll',
    'neft credit', 'rtgs credit', 'imps credit', 'inward remittance',
    'transfer credit', 'deposit', 'interest credit', 'refund',
)

# EMI keywords
_EMI_KEYWORDS = ('emi', 'loan', 'repayment', 'instalment', 'installment')

