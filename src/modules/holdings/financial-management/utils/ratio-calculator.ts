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
    interpretation: "Compare with prior months, budget, cash forecast, and upcoming obligations.",
    format: "currency",
    category: "liquidity",
    inDashboard: true,
  },
  {
    key: "current_assets",
    label: "Current Assets",
    formula: "Cash + Short-term Investments + Trade Receivables + Inventory + Other Current Assets (or Override)",
    interpretation: "Short-term resources expected to convert to cash within 12 months.",
    format: "currency",
    category: "liquidity",
    inDashboard: true,
  },
  {
    key: "current_liabilities",
    label: "Current Liabilities",
    formula: "Trade Payables + Non-trade Payables + Current Portion of Loans + Other Current Liabilities (or Override)",
    interpretation: "Obligations due within 12 months; compare against liquid assets.",
    format: "currency",
    category: "liquidity",
    inDashboard: true,
  },
  {
    key: "working_capital",
    label: "Working Capital",
    formula: "Current Assets - Current Liabilities",
    interpretation: "Positive working capital means current assets exceed current liabilities; review asset quality and timing.",
    format: "currency",
    category: "liquidity",
    inDashboard: true,
  },
  {
    key: "current_ratio",
    label: "Current Ratio",
    formula: "Current Assets / Current Liabilities",
    interpretation: "Below 1.0x may signal pressure; assess receivable collection, inventory liquidity, and payment timing.",
    format: "ratio",
    category: "liquidity",
    inDashboard: true,
  },
  {
    key: "quick_ratio",
    label: "Quick Ratio",
    formula: "(Cash + Short-term Investments + Trade Receivables) / Current Liabilities",
    interpretation: "Excludes inventory; check whether receivables are collectible soon.",
    format: "ratio",
    category: "liquidity",
    inDashboard: true,
  },
  {
    key: "cash_ratio",
    label: "Cash Ratio",
    formula: "Cash & Cash Equivalents / Current Liabilities",
    interpretation: "Strict liquidity measure; compare with cash forecast and timing of obligations.",
    format: "ratio",
    category: "liquidity",
    inDashboard: true,
  },
  {
    key: "total_liabilities",
    label: "Total Liabilities",
    formula: "Current Liabilities + Long-term Loans + Other Non-current Liabilities",
    interpretation: "Total obligations owed to creditors and suppliers.",
    format: "currency",
    category: "leverage",
    inDashboard: false,
  },
  {
    key: "total_debt",
    label: "Total Debt",
    formula: "Current Portion of Loans + Long-term Loans",
    interpretation: "Interest-bearing loans only (excludes non-interest-bearing payables).",
    format: "currency",
    category: "leverage",
    inDashboard: true,
  },
  {
    key: "debt_ratio",
    label: "Debt Ratio",
    formula: "Total Liabilities / Total Assets",
    interpretation: "Shows share of assets funded by liabilities; consider asset quality and business risk.",
    format: "percent",
    category: "leverage",
    inDashboard: true,
  },
  {
    key: "debt_to_equity",
    label: "Debt-to-Equity",
    formula: "Total Liabilities / Total Equity",
    interpretation: "Shows creditor funding relative to equity; can be misleading if equity is negative or very low.",
    format: "ratio",
    category: "leverage",
    inDashboard: true,
  },
  {
    key: "gross_margin",
    label: "Gross Profit Margin",
    formula: "(Revenue - Cost of Goods Sold) / Revenue",
    interpretation: "Investigate pricing, product mix, discounts, and direct costs when it changes.",
    format: "percent",
    category: "profitability",
    inDashboard: true,
  },
  {
    key: "net_margin",
    label: "Net Profit Margin",
    formula: "Net Income / Revenue",
    interpretation: "Review operating expenses, financing costs, taxes, and one-off items.",
    format: "percent",
    category: "profitability",
    inDashboard: true,
  },
  {
    key: "roa",
    label: "ROA*",
    formula: "Net Income / Ending Total Assets",
    interpretation: "Uses ending assets as a proxy; average opening and closing assets are ideal for annual review.",
    format: "percent",
    category: "profitability",
    inDashboard: false,
  },
  {
    key: "roe",
    label: "ROE*",
    formula: "Net Income / Ending Total Equity",
    interpretation: "Uses ending equity as a proxy; interpret cautiously if equity is very low or negative.",
    format: "percent",
    category: "profitability",
    inDashboard: false,
  },
  {
    key: "operating_cash_flow_ratio",
    label: "Operating Cash Flow Ratio",
    formula: "Operating Cash Flow / Current Liabilities",
    interpretation: "Use period-matched data; consider seasonality and timing of cash flows.",
    format: "ratio",
    category: "cashflow",
    inDashboard: true,
  },
  {
    key: "dpo_days",
    label: "DPO (Days)",
    formula: "(Trade Payables / Credit Purchases) * 30",
    interpretation: "Monthly approximation using ending trade payables and monthly credit purchases x 30.",
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

