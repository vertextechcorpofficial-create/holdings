"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CompanyOption,
  FinancialHealthMonthly,
} from "../../types/financial-health.schema";
import {
  formatRatioValue,
  sumCurrentAssetsComponents,
  sumCurrentLiabilitiesComponents,
} from "../../utils/ratio-calculator";

interface MonthlyInputFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: CompanyOption[];
  defaultCompanyId?: number;
  editingRecord: FinancialHealthMonthly | null;
  onSubmit: (
    payload: Omit<FinancialHealthMonthly, "id" | "created_at" | "updated_at">,
    id?: number
  ) => Promise<void>;
}

interface FormState {
  company_id: string;
  month_end: string;
  currency_code: string;
  cash_and_equivalents: string;
  short_term_investments: string;
  trade_receivables: string;
  inventory: string;
  other_current_assets: string;
  total_current_assets_override: string;
  trade_payables: string;
  non_trade_payables: string;
  current_portion_loans: string;
  other_current_liabilities: string;
  total_current_liabilities_override: string;
  long_term_loans: string;
  other_non_current_liabilities: string;
  total_assets: string;
  total_equity: string;
  revenue: string;
  cost_of_goods_sold: string;
  net_income: string;
  operating_cash_flow: string;
  credit_purchases: string;
  management_notes: string;
}

function getDefaultMonthEnd(): string {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const y = lastDay.getFullYear();
  const m = String(lastDay.getMonth() + 1).padStart(2, "0");
  const d = String(lastDay.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Formats a user-typed numeric string with thousand-separator commas
 * while preserving negative signs, decimals, and stripping stray leading zeros.
 */
function formatNumberInput(raw: string): string {
  const cleaned = raw.replace(/,/g, "").replace(/[^\d.-]/g, "");
  if (cleaned === "" || cleaned === "-") return cleaned;

  const isNegative = cleaned.startsWith("-");
  const unsigned = cleaned.replace(/-/g, "");

  const dotIdx = unsigned.indexOf(".");
  let intPart = dotIdx >= 0 ? unsigned.slice(0, dotIdx) : unsigned;
  const decPart = dotIdx >= 0 ? unsigned.slice(dotIdx + 1).replace(/\./g, "").slice(0, 2) : null;

  // Strip redundant leading zeros (e.g. "05" -> "5", "00" -> "0", ".5" -> "0.5")
  intPart = intPart.replace(/^0+(?=\d)/, "");
  if (intPart === "" && decPart !== null) intPart = "0";

  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sign = isNegative ? "-" : "";

  if (decPart !== null) {
    return `${sign}${formattedInt}.${decPart}`;
  }
  return `${sign}${formattedInt}`;
}

function toFormattedStr(val: number | null | undefined, blankIfZero = false): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return "";
  if (blankIfZero && val === 0) return "";
  return formatNumberInput(String(val));
}

function toNum(val: string): number {
  const cleaned = val.replace(/,/g, "").trim();
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function toNullableNum(val: string): number | null {
  const cleaned = val.replace(/,/g, "").trim();
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const createEmptyState = (defaultCompanyId?: number): FormState => ({
  company_id: defaultCompanyId ? String(defaultCompanyId) : "",
  month_end: getDefaultMonthEnd(),
  currency_code: "PHP",
  cash_and_equivalents: "",
  short_term_investments: "",
  trade_receivables: "",
  inventory: "",
  other_current_assets: "",
  total_current_assets_override: "",
  trade_payables: "",
  non_trade_payables: "",
  current_portion_loans: "",
  other_current_liabilities: "",
  total_current_liabilities_override: "",
  long_term_loans: "",
  other_non_current_liabilities: "",
  total_assets: "",
  total_equity: "",
  revenue: "",
  cost_of_goods_sold: "",
  net_income: "",
  operating_cash_flow: "",
  credit_purchases: "",
  management_notes: "",
});

export function MonthlyInputFormDialog({
  open,
  onOpenChange,
  companies,
  defaultCompanyId,
  editingRecord,
  onSubmit,
}: MonthlyInputFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => createEmptyState(defaultCompanyId));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    if (editingRecord) {
      setForm({
        company_id: String(editingRecord.company_id),
        month_end: editingRecord.month_end,
        currency_code: editingRecord.currency_code || "PHP",
        cash_and_equivalents: toFormattedStr(editingRecord.cash_and_equivalents, true),
        short_term_investments: toFormattedStr(editingRecord.short_term_investments, true),
        trade_receivables: toFormattedStr(editingRecord.trade_receivables, true),
        inventory: toFormattedStr(editingRecord.inventory, true),
        other_current_assets: toFormattedStr(editingRecord.other_current_assets, true),
        total_current_assets_override: toFormattedStr(
          editingRecord.total_current_assets_override,
          false
        ),
        trade_payables: toFormattedStr(editingRecord.trade_payables, true),
        non_trade_payables: toFormattedStr(editingRecord.non_trade_payables, true),
        current_portion_loans: toFormattedStr(editingRecord.current_portion_loans, true),
        other_current_liabilities: toFormattedStr(editingRecord.other_current_liabilities, true),
        total_current_liabilities_override: toFormattedStr(
          editingRecord.total_current_liabilities_override,
          false
        ),
        long_term_loans: toFormattedStr(editingRecord.long_term_loans, true),
        other_non_current_liabilities: toFormattedStr(
          editingRecord.other_non_current_liabilities,
          true
        ),
        total_assets: toFormattedStr(editingRecord.total_assets, true),
        total_equity: toFormattedStr(editingRecord.total_equity, true),
        revenue: toFormattedStr(editingRecord.revenue, true),
        cost_of_goods_sold: toFormattedStr(editingRecord.cost_of_goods_sold, true),
        net_income: toFormattedStr(editingRecord.net_income, true),
        operating_cash_flow: toFormattedStr(editingRecord.operating_cash_flow, false),
        credit_purchases: toFormattedStr(editingRecord.credit_purchases, false),
        management_notes: editingRecord.management_notes ?? "",
      });
    } else {
      const initialCompany =
        defaultCompanyId || (companies.length > 0 ? companies[0].company_id : undefined);
      setForm(createEmptyState(initialCompany));
    }
  }, [open, editingRecord, defaultCompanyId, companies]);

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setFormattedNumberField = (key: keyof FormState, raw: string) => {
    setForm((prev) => ({ ...prev, [key]: formatNumberInput(raw) }));
  };

  const caSum = useMemo(
    () =>
      sumCurrentAssetsComponents({
        cash_and_equivalents: toNum(form.cash_and_equivalents),
        short_term_investments: toNum(form.short_term_investments),
        trade_receivables: toNum(form.trade_receivables),
        inventory: toNum(form.inventory),
        other_current_assets: toNum(form.other_current_assets),
      }),
    [
      form.cash_and_equivalents,
      form.short_term_investments,
      form.trade_receivables,
      form.inventory,
      form.other_current_assets,
    ]
  );

  const clSum = useMemo(
    () =>
      sumCurrentLiabilitiesComponents({
        trade_payables: toNum(form.trade_payables),
        non_trade_payables: toNum(form.non_trade_payables),
        current_portion_loans: toNum(form.current_portion_loans),
        other_current_liabilities: toNum(form.other_current_liabilities),
      }),
    [
      form.trade_payables,
      form.non_trade_payables,
      form.current_portion_loans,
      form.other_current_liabilities,
    ]
  );

  const caOverride = toNullableNum(form.total_current_assets_override);
  const clOverride = toNullableNum(form.total_current_liabilities_override);
  const caVariance = caOverride !== null && Math.abs(caOverride - caSum) > 0.01;
  const clVariance = clOverride !== null && Math.abs(clOverride - clSum) > 0.01;

  const currencySymbol = form.currency_code === "USD" ? "$" : "₱";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const companyIdNum = Number(form.company_id);
    if (!Number.isFinite(companyIdNum) || companyIdNum <= 0) {
      setFormError("Please select a company / subsidiary.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.month_end)) {
      setFormError("Please enter a valid Month End date.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(
        {
          company_id: companyIdNum,
          month_end: form.month_end,
          currency_code: form.currency_code || "PHP",
          cash_and_equivalents: toNum(form.cash_and_equivalents),
          short_term_investments: toNum(form.short_term_investments),
          trade_receivables: toNum(form.trade_receivables),
          inventory: toNum(form.inventory),
          other_current_assets: toNum(form.other_current_assets),
          total_current_assets_override: caOverride,
          trade_payables: toNum(form.trade_payables),
          non_trade_payables: toNum(form.non_trade_payables),
          current_portion_loans: toNum(form.current_portion_loans),
          other_current_liabilities: toNum(form.other_current_liabilities),
          total_current_liabilities_override: clOverride,
          long_term_loans: toNum(form.long_term_loans),
          other_non_current_liabilities: toNum(form.other_non_current_liabilities),
          total_assets: toNum(form.total_assets),
          total_equity: toNum(form.total_equity),
          revenue: toNum(form.revenue),
          cost_of_goods_sold: toNum(form.cost_of_goods_sold),
          net_income: toNum(form.net_income),
          operating_cash_flow: toNullableNum(form.operating_cash_flow),
          credit_purchases: toNullableNum(form.credit_purchases),
          management_notes: form.management_notes.trim() || null,
        },
        editingRecord?.id
      );
      onOpenChange(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save monthly input");
    } finally {
      setSubmitting(false);
    }
  };

  const renderNumberInput = (
    key: keyof FormState,
    label: string,
    placeholder = "0.00",
    optional = false
  ) => (
    <div className="flex flex-col justify-between gap-1.5">
      <Label htmlFor={key} className="text-xs font-medium leading-tight text-foreground/90">
        <span>{label}</span>
        {optional && (
          <span className="ml-1 text-[11px] font-normal text-muted-foreground">(opt.)</span>
        )}
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
          {currencySymbol}
        </span>
        <Input
          id={key}
          type="text"
          inputMode="decimal"
          value={form[key]}
          onFocus={() => {
            if (form[key] === "0" || form[key] === "0.00") {
              setField(key, "");
            }
          }}
          onChange={(e) => setFormattedNumberField(key, e.target.value)}
          placeholder={placeholder}
          className="h-9 w-full pl-7 pr-3 text-right font-mono tabular-nums"
        />
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle>
            {editingRecord ? "Edit Monthly Financial Input" : "Add Monthly Financial Input"}
          </DialogTitle>
          <DialogDescription>
            Enter month-end balances and monthly income/cash-flow figures. Commas are formatted
            automatically as you type; blank required fields default to 0.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {formError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          )}

          {/* Section 1: Period & Company */}
          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
              <div className="flex flex-col gap-1.5 sm:col-span-6">
                <Label className="text-xs font-medium">Company / Subsidiary</Label>
                <Select
                  value={form.company_id}
                  onValueChange={(val) => setField("company_id", val)}
                >
                  <SelectTrigger className="h-9 w-full overflow-hidden bg-background [&>span]:truncate">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.company_id} value={String(c.company_id)}>
                        {c.company_name || c.company_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-3">
                <Label htmlFor="month_end" className="text-xs font-medium">
                  Month End Date
                </Label>
                <Input
                  id="month_end"
                  type="date"
                  value={form.month_end}
                  onChange={(e) => setField("month_end", e.target.value)}
                  className="h-9 w-full bg-background"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-3">
                <Label className="text-xs font-medium">Currency</Label>
                <Select
                  value={form.currency_code}
                  onValueChange={(val) => setField("currency_code", val)}
                >
                  <SelectTrigger className="h-9 w-full overflow-hidden bg-background [&>span]:truncate">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PHP">PHP — Peso</SelectItem>
                    <SelectItem value="USD">USD — Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 2: Current Assets */}
          <div className="space-y-3 rounded-lg border bg-muted/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
              <h4 className="text-sm font-semibold">Current Assets</h4>
              <span className="rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                Component Sum:{" "}
                <strong className="font-mono text-foreground tabular-nums">
                  {formatRatioValue(caSum, "currency", form.currency_code)}
                </strong>
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {renderNumberInput("cash_and_equivalents", "Cash & Cash Equivalents")}
              {renderNumberInput("short_term_investments", "Short-term Investments")}
              {renderNumberInput("trade_receivables", "Trade Receivables")}
              {renderNumberInput("inventory", "Inventory")}
              {renderNumberInput("other_current_assets", "Other Current Assets")}
              {renderNumberInput(
                "total_current_assets_override",
                "Total Current Assets",
                "Auto-sum if blank",
                true
              )}
            </div>
            {caVariance && (
              <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Override total differs from the component sum by{" "}
                  {formatRatioValue((caOverride ?? 0) - caSum, "currency", form.currency_code)}.
                  Ratios will use the override value.
                </span>
              </div>
            )}
          </div>

          {/* Section 3: Current Liabilities */}
          <div className="space-y-3 rounded-lg border bg-muted/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
              <h4 className="text-sm font-semibold">Current Liabilities</h4>
              <span className="rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                Component Sum:{" "}
                <strong className="font-mono text-foreground tabular-nums">
                  {formatRatioValue(clSum, "currency", form.currency_code)}
                </strong>
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {renderNumberInput("trade_payables", "Trade Payables")}
              {renderNumberInput("non_trade_payables", "Non-trade Payables")}
              {renderNumberInput("current_portion_loans", "Current Portion of Loans")}
              {renderNumberInput("other_current_liabilities", "Other Current Liabilities")}
              {renderNumberInput(
                "total_current_liabilities_override",
                "Total Current Liabilities",
                "Auto-sum if blank",
                true
              )}
            </div>
            {clVariance && (
              <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Override total differs from the component sum by{" "}
                  {formatRatioValue((clOverride ?? 0) - clSum, "currency", form.currency_code)}.
                  Ratios will use the override value.
                </span>
              </div>
            )}
          </div>

          {/* Section 4: Non-Current Liabilities & Equity */}
          <div className="space-y-3 rounded-lg border bg-muted/10 p-4">
            <h4 className="border-b pb-2 text-sm font-semibold">
              Non-Current Liabilities, Assets &amp; Equity
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
              {renderNumberInput("long_term_loans", "Long-term Loans")}
              {renderNumberInput("other_non_current_liabilities", "Other Non-current Liab.")}
              {renderNumberInput("total_assets", "Total Assets")}
              {renderNumberInput("total_equity", "Total Equity")}
            </div>
          </div>

          {/* Section 5: Income & Cash Flow */}
          <div className="space-y-3 rounded-lg border bg-muted/10 p-4">
            <h4 className="border-b pb-2 text-sm font-semibold">
              Monthly Income &amp; Cash Flow
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {renderNumberInput("revenue", "Revenue")}
              {renderNumberInput("cost_of_goods_sold", "Cost of Goods Sold")}
              {renderNumberInput("net_income", "Net Income")}
              {renderNumberInput(
                "operating_cash_flow",
                "Operating Cash Flow",
                "Optional",
                true
              )}
              {renderNumberInput(
                "credit_purchases",
                "Credit Purchases",
                "Optional (for DPO)",
                true
              )}
            </div>
          </div>

          {/* Section 6: Management Notes */}
          <div className="space-y-1.5 rounded-lg border bg-muted/10 p-4">
            <Label htmlFor="management_notes" className="text-xs font-medium">
              Management Review Notes{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="management_notes"
              rows={2}
              value={form.management_notes}
              onChange={(e) => setField("management_notes", e.target.value)}
              placeholder="Document unusual movements, causes, risks, owners, or actions..."
              className="bg-background"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingRecord ? "Update Entry" : "Save Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
