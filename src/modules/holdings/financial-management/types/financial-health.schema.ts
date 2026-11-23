import { z } from "zod";

const numericField = z.coerce.number().finite().default(0);
const optionalNumericField = z
  .union([z.number().finite(), z.string(), z.null(), z.undefined()])
  .transform((val) => {
    if (val === "" || val === null || val === undefined) return null;
    const parsed = Number(val);
    return Number.isFinite(parsed) ? parsed : null;
  })
  .nullable()
  .optional();

export const FinancialHealthMonthlySchema = z.object({
  id: z.number().optional(),
  company_id: z.coerce.number().int().positive("Company is required"),
  month_end: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Month end must be in YYYY-MM-DD format"),
  currency_code: z.string().trim().min(1).max(10).default("PHP"),

  // Current Assets
  cash_and_equivalents: numericField,
  short_term_investments: numericField,
  trade_receivables: numericField,
  inventory: numericField,
  other_current_assets: numericField,
  total_current_assets_override: optionalNumericField,

  // Current Liabilities
  trade_payables: numericField,
  non_trade_payables: numericField,
  current_portion_loans: numericField,
  other_current_liabilities: numericField,
  total_current_liabilities_override: optionalNumericField,

  // Non-Current Liabilities & Equity
  long_term_loans: numericField,
  other_non_current_liabilities: numericField,
  total_assets: numericField,
  total_equity: numericField,

  // Income Statement & Cash Flow
  revenue: numericField,
  cost_of_goods_sold: numericField,
  net_income: numericField,
  operating_cash_flow: optionalNumericField,
  credit_purchases: optionalNumericField,

  // Notes & Audit
  management_notes: z.string().max(5000).nullable().optional(),
  created_by: z.string().max(255).nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const FinancialHealthUpdateSchema = FinancialHealthMonthlySchema.partial();

export type FinancialHealthMonthly = z.infer<typeof FinancialHealthMonthlySchema>;
export type FinancialHealthMonthlyFormValues = z.input<typeof FinancialHealthMonthlySchema>;

export interface CompanyOption {
  company_id: number;
  company_name: string | null;
  company_code: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: unknown;
}

