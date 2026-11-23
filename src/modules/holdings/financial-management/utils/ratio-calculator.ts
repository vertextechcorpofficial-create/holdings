import { format as formatDateFns, isValid, parseISO } from "date-fns";
import { FinancialHealthMonthly } from "../types/financial-health.schema";

export interface CalculatedRatios {
  id?: number;
  company_id: number;
  month_end: string;
  currency_code: string;
  cash_and_equivalents: number;
  current_assets: number;
  current_liabilities: number;
  working_capital: number;
  current_ratio: number | null;
  quick_ratio: number | null;
  cash_ratio: number | null;
  total_liabilities: number;
  total_debt: number;
  debt_ratio: number | null;
  debt_to_equity: number | null;
  gross_margin: number | null;
  net_margin: number | null;
  roa: number | null;
  roe: number | null;
  operating_cash_flow_ratio: number | null;
  dpo_days: number | null;
  management_notes?: string | null;
  has_current_assets_variance: boolean;
  has_current_liabilities_variance: boolean;
}

export type RatioFormat = "currency" | "ratio" | "percent" | "days";

export interface RatioGuideItem {
  key: keyof CalculatedRatios;
  label: string;
  formula: string;
  whatItMeasures: string;
  managementQuestion: string;
  interpretation: string;
  format: RatioFormat;
  category: "liquidity" | "leverage" | "profitability" | "cashflow";
  inDashboard: boolean;
}

export const RATIO_GUIDE: RatioGuideItem[] = [
  {
    key: "cash_and_equivalents",
    label: "Cash & Cash Equivalents",
    formula: "Direct input from month-end balance sheet",
    whatItMeasures: "Immediately available cash on hand and in banks at month-end.",
    managementQuestion: "Do we have enough liquid cash on hand to cover near-term obligations?",
    interpretation: "Compare with prior months, budget, cash forecast, and upcoming obligations.",
    format: "currency",
    category: "liquidity",
    inDashboard: true,
  },
  {
    key: "current_assets",
    label: "Current Assets",
    formula: "Cash + Short-term Investments + Trade Receivables + Inventory + Other Current Assets (or Override)",
    whatItMeasures: "Total short-term resources expected to convert to cash within 12 months.",
    managementQuestion: "Are our short-term assets liquid and collectible enough to fund operations?",
    interpretation: "Short-term resources expected to convert to cash within 12 months.",
    format: "currency",
    category: "liquidity",
    inDashboard: true,
  },
  {
    key: "current_liabilities",
    label: "Current Liabilities",
    formula: "Trade Payables + Non-trade Payables + Current Portion of Loans + Other Current Liabilities (or Override)",
    whatItMeasures: "Total short-term obligations due within 12 months.",
    managementQuestion: "Are short-term obligations growing faster than our ability to collect cash?",
    interpretation: "Obligations due within 12 months; compare against liquid assets.",
    format: "currency",
    category: "liquidity",
    inDashboard: true,
  },
  {
    key: "working_capital",
    label: "Working Capital",
    formula: "Current Assets - Current Liabilities",
    whatItMeasures: "The net peso amount of excess current assets over current liabilities.",
    managementQuestion: "Do we have enough working capital to support daily operations?",
    interpretation: "Positive means current assets exceed current liabilities; negative signals potential pressure.",
    format: "currency",
    category: "liquidity",
    inDashboard: true,
  },
  {
    key: "current_ratio",
    label: "Current Ratio",
    formula: "Current Assets / Current Liabilities",
    whatItMeasures: "Whether the company has enough short-term assets to cover its short-term obligations.",
    managementQuestion: "Can the company settle its short-term obligations without experiencing cash pressure?",
    interpretation: "Above 1.0: assets exceed liabilities; Below 1.0: potential liquidity concern. Watch slow-moving inventory or overdue receivables.",
    format: "ratio",
    category: "liquidity",
    inDashboard: true,
  },
  {
    key: "quick_ratio",
    label: "Quick Ratio",
    formula: "(Cash + Short-term Investments + Trade Receivables) / Current Liabilities",
    whatItMeasures: "Whether the company can pay its short-term obligations without relying on inventory sales.",
    managementQuestion: "If we cannot sell our inventory immediately, can we still meet our obligations?",
    interpretation: "Excludes inventory; check whether receivables are collectible soon.",
    format: "ratio",
    category: "liquidity",
    inDashboard: true,
  },
  {
    key: "cash_ratio",
    label: "Cash Ratio",
    formula: "Cash & Cash Equivalents / Current Liabilities",
    whatItMeasures: "The strictest liquidity ratio — how much of current liabilities can be paid immediately using available cash.",
    managementQuestion: "How much of our outstanding obligations can we settle using our current cash position?",
    interpretation: "Consider incoming customer collections and timing of supplier payments alongside this ratio.",
    format: "ratio",
    category: "liquidity",
    inDashboard: true,
  },
  {
    key: "total_liabilities",
    label: "Total Liabilities",
    formula: "Current Liabilities + Long-term Loans + Other Non-current Liabilities",
    whatItMeasures: "Total short-term and long-term obligations owed to creditors and suppliers.",
    managementQuestion: "Are total liabilities staying within manageable levels relative to assets and equity?",
    interpretation: "Total obligations owed to creditors and suppliers.",
    format: "currency",
    category: "leverage",
    inDashboard: false,
  },
  {
    key: "total_debt",
    label: "Total Debt",
    formula: "Current Portion of Loans + Long-term Loans",
    whatItMeasures: "Total interest-bearing bank and loan borrowing exposure (excludes non-interest-bearing payables).",
    managementQuestion: "Is our total interest-bearing loan exposure within safe repayment and covenant limits?",
    interpretation: "Interest-bearing loans only (excludes non-interest-bearing payables).",
    format: "currency",
    category: "leverage",
    inDashboard: true,
  },
  {
    key: "debt_ratio",
    label: "Debt Ratio",
    formula: "Total Liabilities / Total Assets",
    whatItMeasures: "What percentage of the company's assets is financed through liabilities.",
    managementQuestion: "Are we relying too heavily on borrowed funds and other liabilities to finance our assets?",
    interpretation: "A higher percentage may indicate greater reliance on creditor financing and increased financial risk.",
    format: "percent",
    category: "leverage",
    inDashboard: true,
  },
  {
    key: "debt_to_equity",
    label: "Debt-to-Equity",
    formula: "Total Liabilities / Total Equity",
    whatItMeasures: "Compares the company's total obligations against owners' equity.",
    managementQuestion: "Is the company becoming increasingly dependent on creditors rather than its own capital?",
    interpretation: "Uses total liabilities, not just bank loans; monitor Total Debt separately for bank borrowing exposure.",
    format: "ratio",
    category: "leverage",
    inDashboard: true,
  },
  {
    key: "gross_margin",
    label: "Gross Profit Margin",
    formula: "(Revenue - Cost of Goods Sold) / Revenue x 100",
    whatItMeasures: "How much gross profit is earned from sales after covering the direct cost of goods or services.",
    managementQuestion: "Are we earning enough from our sales after covering the direct cost of goods or services?",
    interpretation: "A declining margin may indicate higher purchasing costs, lower prices, excessive discounts, or unfavorable product mix.",
    format: "percent",
    category: "profitability",
    inDashboard: true,
  },
  {
    key: "net_margin",
    label: "Net Profit Margin",
    formula: "Net Income / Revenue x 100",
    whatItMeasures: "How much of each peso of sales is retained as net profit after all expenses, interest, and taxes.",
    managementQuestion: "After all expenses, how much profit does the company actually retain?",
    interpretation: "If gross margin rises while net margin falls, operating expenses, financing costs, or taxes may be consuming earnings.",
    format: "percent",
    category: "profitability",
    inDashboard: true,
  },
  {
    key: "roa",
    label: "ROA*",
    formula: "Net Income / Ending Total Assets x 100",
    whatItMeasures: "How efficiently the company uses its assets to generate profits.",
    managementQuestion: "Are we making sufficient profit from the assets we own?",
    interpretation: "A declining ROA may indicate underutilized assets or declining profitability. Uses ending assets as proxy.",
    format: "percent",
    category: "profitability",
    inDashboard: false,
  },
  {
    key: "roe",
    label: "ROE*",
    formula: "Net Income / Ending Total Equity x 100",
    whatItMeasures: "The return generated on shareholders' investment.",
    managementQuestion: "Are the owners receiving a reasonable return on their investment?",
    interpretation: "A higher ROE may indicate better profitability, but can also result from high financial leverage.",
    format: "percent",
    category: "profitability",
    inDashboard: false,
  },
  {
    key: "operating_cash_flow_ratio",
    label: "Operating Cash Flow Ratio",
    formula: "Operating Cash Flow / Current Liabilities",
    whatItMeasures: "How much operating cash flow the company generates for every peso of current liabilities.",
    managementQuestion: "Are our actual business operations generating sufficient cash to support our obligations?",
    interpretation: "A declining ratio could indicate weakening cash generation or increasing short-term obligations.",
    format: "ratio",
    category: "cashflow",
    inDashboard: true,
  },
  {
    key: "dpo_days",
    label: "DPO (Days)",
    formula: "(Trade Payables / Credit Purchases) x 30",
    whatItMeasures: "Estimates how many days the company takes to pay its suppliers.",
    managementQuestion: "Are we managing supplier payments efficiently without damaging supplier relationships?",
    interpretation: "Increasing = paying more slowly; Decreasing = paying more quickly. Uses ending trade payables as approximation.",
    format: "days",
    category: "cashflow",
    inDashboard: true,
  },
];

const num = (v: number | null | undefined): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

const safeDiv = (numerator: number, denominator: number): number | null => {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return null;
  }
  return numerator / denominator;
};

export function sumCurrentAssetsComponents(input: Partial<FinancialHealthMonthly>): number {
  return (
    num(input.cash_and_equivalents) +
    num(input.short_term_investments) +
    num(input.trade_receivables) +
    num(input.inventory) +
    num(input.other_current_assets)
  );
}

export function sumCurrentLiabilitiesComponents(input: Partial<FinancialHealthMonthly>): number {
  return (
    num(input.trade_payables) +
    num(input.non_trade_payables) +
    num(input.current_portion_loans) +
    num(input.other_current_liabilities)
  );
}

export function calculateRatios(input: FinancialHealthMonthly): CalculatedRatios {
  const caComponents = sumCurrentAssetsComponents(input);
  const clComponents = sumCurrentLiabilitiesComponents(input);

  const hasCaOverride =
    input.total_current_assets_override !== null &&
    input.total_current_assets_override !== undefined;
  const hasClOverride =
    input.total_current_liabilities_override !== null &&
    input.total_current_liabilities_override !== undefined;

  const currentAssets = hasCaOverride ? num(input.total_current_assets_override) : caComponents;
  const currentLiabilities = hasClOverride ? num(input.total_current_liabilities_override) : clComponents;

  const workingCapital = currentAssets - currentLiabilities;
  const quickNumerator =
    num(input.cash_and_equivalents) +
    num(input.short_term_investments) +
    num(input.trade_receivables);

  const totalLiabilities =
    currentLiabilities +
    num(input.long_term_loans) +
    num(input.other_non_current_liabilities);

  const totalDebt = num(input.current_portion_loans) + num(input.long_term_loans);
  const totalAssets = num(input.total_assets);
  const totalEquity = num(input.total_equity);
  const revenue = num(input.revenue);
  const cogs = num(input.cost_of_goods_sold);
  const netIncome = num(input.net_income);

  const ocfRatio =
    input.operating_cash_flow !== null && input.operating_cash_flow !== undefined
      ? safeDiv(num(input.operating_cash_flow), currentLiabilities)
      : null;

  const dpoDays =
    input.credit_purchases !== null &&
    input.credit_purchases !== undefined &&
    input.credit_purchases !== 0
      ? (num(input.trade_payables) / input.credit_purchases) * 30
      : null;

  return {
    id: input.id,
    company_id: input.company_id,
    month_end: input.month_end,
    currency_code: input.currency_code || "PHP",
    cash_and_equivalents: num(input.cash_and_equivalents),
    current_assets: currentAssets,
    current_liabilities: currentLiabilities,
    working_capital: workingCapital,
    current_ratio: safeDiv(currentAssets, currentLiabilities),
    quick_ratio: safeDiv(quickNumerator, currentLiabilities),
    cash_ratio: safeDiv(num(input.cash_and_equivalents), currentLiabilities),
    total_liabilities: totalLiabilities,
    total_debt: totalDebt,
    debt_ratio: safeDiv(totalLiabilities, totalAssets),
    debt_to_equity: safeDiv(totalLiabilities, totalEquity),
    gross_margin: safeDiv(revenue - cogs, revenue),
    net_margin: safeDiv(netIncome, revenue),
    roa: safeDiv(netIncome, totalAssets),
    roe: safeDiv(netIncome, totalEquity),
    operating_cash_flow_ratio: ocfRatio,
    dpo_days: dpoDays,
    management_notes: input.management_notes ?? null,
    has_current_assets_variance: hasCaOverride && Math.abs(currentAssets - caComponents) > 0.01,
    has_current_liabilities_variance: hasClOverride && Math.abs(currentLiabilities - clComponents) > 0.01,
  };
}

/**
 * Consolidates multiple subsidiary monthly records by month_end (sum of balances/flows)
 * for Holdings-level analysis.
 */
export function consolidateMonthlyInputs(records: FinancialHealthMonthly[]): FinancialHealthMonthly[] {
  const byMonth = new Map<string, FinancialHealthMonthly>();

  for (const r of records) {
    const existing = byMonth.get(r.month_end);
    const ca =
      r.total_current_assets_override !== null && r.total_current_assets_override !== undefined
        ? r.total_current_assets_override
        : sumCurrentAssetsComponents(r);
    const cl =
      r.total_current_liabilities_override !== null && r.total_current_liabilities_override !== undefined
        ? r.total_current_liabilities_override
        : sumCurrentLiabilitiesComponents(r);

    if (!existing) {
      byMonth.set(r.month_end, {
        company_id: 0,
        month_end: r.month_end,
        currency_code: r.currency_code || "PHP",
        cash_and_equivalents: num(r.cash_and_equivalents),
        short_term_investments: num(r.short_term_investments),
        trade_receivables: num(r.trade_receivables),
        inventory: num(r.inventory),
        other_current_assets: num(r.other_current_assets),
        total_current_assets_override: ca,
        trade_payables: num(r.trade_payables),
        non_trade_payables: num(r.non_trade_payables),
        current_portion_loans: num(r.current_portion_loans),
        other_current_liabilities: num(r.other_current_liabilities),
        total_current_liabilities_override: cl,
        long_term_loans: num(r.long_term_loans),
        other_non_current_liabilities: num(r.other_non_current_liabilities),
        total_assets: num(r.total_assets),
        total_equity: num(r.total_equity),
        revenue: num(r.revenue),
        cost_of_goods_sold: num(r.cost_of_goods_sold),
        net_income: num(r.net_income),
        operating_cash_flow: r.operating_cash_flow ?? null,
        credit_purchases: r.credit_purchases ?? null,
        management_notes: null,
      });
    } else {
      existing.cash_and_equivalents += num(r.cash_and_equivalents);
      existing.short_term_investments += num(r.short_term_investments);
      existing.trade_receivables += num(r.trade_receivables);
      existing.inventory += num(r.inventory);
      existing.other_current_assets += num(r.other_current_assets);
      existing.total_current_assets_override = num(existing.total_current_assets_override) + ca;
      existing.trade_payables += num(r.trade_payables);
      existing.non_trade_payables += num(r.non_trade_payables);
      existing.current_portion_loans += num(r.current_portion_loans);
      existing.other_current_liabilities += num(r.other_current_liabilities);
      existing.total_current_liabilities_override = num(existing.total_current_liabilities_override) + cl;
      existing.long_term_loans += num(r.long_term_loans);
      existing.other_non_current_liabilities += num(r.other_non_current_liabilities);
      existing.total_assets += num(r.total_assets);
      existing.total_equity += num(r.total_equity);
      existing.revenue += num(r.revenue);
      existing.cost_of_goods_sold += num(r.cost_of_goods_sold);
      existing.net_income += num(r.net_income);
      if (r.operating_cash_flow !== null && r.operating_cash_flow !== undefined) {
        existing.operating_cash_flow = num(existing.operating_cash_flow) + r.operating_cash_flow;
      }
      if (r.credit_purchases !== null && r.credit_purchases !== undefined) {
        existing.credit_purchases = num(existing.credit_purchases) + r.credit_purchases;
      }
    }
  }

  return Array.from(byMonth.values()).sort((a, b) => a.month_end.localeCompare(b.month_end));
}

export function formatRatioValue(
  value: number | null | undefined,
  format: RatioFormat,
  currencyCode = "PHP"
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  switch (format) {
    case "currency":
      return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: currencyCode === "PHP" ? "PHP" : currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    case "ratio":
      return `${value.toFixed(2)}x`;
    case "percent":
      return `${(value * 100).toFixed(1)}%`;
    case "days":
      return `${value.toFixed(1)} days`;
    default:
      return value.toFixed(2);
  }
}

export function formatMonthEndDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const parsed = parseISO(dateStr);
  if (!isValid(parsed)) return dateStr;
  return formatDateFns(parsed, "MMM dd, yyyy");
}

export function formatMonthShort(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const parsed = parseISO(dateStr);
  if (!isValid(parsed)) return dateStr;
  return formatDateFns(parsed, "MMM yyyy");
}

