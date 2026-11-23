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
import { Separator } from "@/components/ui/separator";
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

function toStr(val: number | null | undefined, blankIfNull = false): string {
  if (val === null || val === undefined) return blankIfNull ? "" : "0";
  return String(val);
}

function toNum(val: string): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

function toNullableNum(val: string): number | null {
  if (val.trim() === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

const createEmptyState = (defaultCompanyId?: number): FormState => ({
  company_id: defaultCompanyId ? String(defaultCompanyId) : "",
  month_end: getDefaultMonthEnd(),
  currency_code: "PHP",
  cash_and_equivalents: "0",
  short_term_investments: "0",
  trade_receivables: "0",
  inventory: "0",
  other_current_assets: "0",
  total_current_assets_override: "",
  trade_payables: "0",
  non_trade_payables: "0",
  current_portion_loans: "0",
  other_current_liabilities: "0",
  total_current_liabilities_override: "",
  long_term_loans: "0",
  other_non_current_liabilities: "0",
  total_assets: "0",
  total_equity: "0",
  revenue: "0",
  cost_of_goods_sold: "0",
  net_income: "0",
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
        cash_and_equivalents: toStr(editingRecord.cash_and_equivalents),
        short_term_investments: toStr(editingRecord.short_term_investments),
        trade_receivables: toStr(editingRecord.trade_receivables),
        inventory: toStr(editingRecord.inventory),
        other_current_assets: toStr(editingRecord.other_current_assets),
        total_current_assets_override: toStr(editingRecord.total_current_assets_override, true),
        trade_payables: toStr(editingRecord.trade_payables),
        non_trade_payables: toStr(editingRecord.non_trade_payables),
        current_portion_loans: toStr(editingRecord.current_portion_loans),
        other_current_liabilities: toStr(editingRecord.other_current_liabilities),
        total_current_liabilities_override: toStr(
          editingRecord.total_current_liabilities_override,
          true
        ),
        long_term_loans: toStr(editingRecord.long_term_loans),
        other_non_current_liabilities: toStr(editingRecord.other_non_current_liabilities),
        total_assets: toStr(editingRecord.total_assets),
        total_equity: toStr(editingRecord.total_equity),
        revenue: toStr(editingRecord.revenue),
        cost_of_goods_sold: toStr(editingRecord.cost_of_goods_sold),
        net_income: toStr(editingRecord.net_income),
        operating_cash_flow: toStr(editingRecord.operating_cash_flow, true),
        credit_purchases: toStr(editingRecord.credit_purchases, true),
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
    <div className="space-y-1.5">
      <Label htmlFor={key} className="text-xs font-medium">
        {label}
        {optional && <span className="ml-1 text-muted-foreground font-normal">(optional)</span>}
      </Label>
      <Input
        id={key}
        type="number"
        step="0.01"
        value={form[key]}
        onChange={(e) => setField(key, e.target.value)}
        placeholder={placeholder}
        className="h-9 text-right font-mono"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingRecord ? "Edit Monthly Financial Input" : "Add Monthly Financial Input"}
          </DialogTitle>
          <DialogDescription>
            Enter month-end balances and monthly income/cash-flow figures using one consistent
            currency and scale.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          )}

          {/* Section 1: Period & Company */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Company / Subsidiary</Label>
              <Select
                value={form.company_id}
                onValueChange={(val) => setField("company_id", val)}
              >
                <SelectTrigger className="h-9">
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
            <div className="space-y-1.5">
              <Label htmlFor="month_end" className="text-xs font-medium">
                Month End Date
              </Label>
              <Input
                id="month_end"
                type="date"
                value={form.month_end}
                onChange={(e) => setField("month_end", e.target.value)}
                className="h-9"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Currency</Label>
              <Select
                value={form.currency_code}
                onValueChange={(val) => setField("currency_code", val)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHP">PHP (Philippine Peso)</SelectItem>
                  <SelectItem value="USD">USD (US Dollar)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Section 2: Current Assets */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold">Current Assets</h4>
              <span className="text-xs text-muted-foreground">
                Component Sum:{" "}
                <strong className="font-mono text-foreground">
                  {formatRatioValue(caSum, "currency", form.currency_code)}
                </strong>
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {renderNumberInput("cash_and_equivalents", "Cash & Cash Equivalents")}
              {renderNumberInput("short_term_investments", "Short-term Investments")}
              {renderNumberInput("trade_receivables", "Trade Receivables")}
              {renderNumberInput("inventory", "Inventory")}
              {renderNumberInput("other_current_assets", "Other Current Assets")}
              {renderNumberInput(
                "total_current_assets_override",
                "Total Current Assets",
                "Leave blank to auto-sum",
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

          <Separator />

          {/* Section 3: Current Liabilities */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold">Current Liabilities</h4>
              <span className="text-xs text-muted-foreground">
                Component Sum:{" "}
                <strong className="font-mono text-foreground">
                  {formatRatioValue(clSum, "currency", form.currency_code)}
                </strong>
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {renderNumberInput("trade_payables", "Trade Payables")}
              {renderNumberInput("non_trade_payables", "Non-trade Payables")}
              {renderNumberInput("current_portion_loans", "Current Portion of Loans")}
              {renderNumberInput("other_current_liabilities", "Other Current Liabilities")}
              {renderNumberInput(
                "total_current_liabilities_override",
                "Total Current Liabilities",
                "Leave blank to auto-sum",
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

          <Separator />

          {/* Section 4: Non-Current Liabilities & Equity */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Non-Current Liabilities, Assets &amp; Equity</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
              {renderNumberInput("long_term_loans", "Long-term Loans")}
              {renderNumberInput("other_non_current_liabilities", "Other Non-current Liab.")}
              {renderNumberInput("total_assets", "Total Assets")}
              {renderNumberInput("total_equity", "Total Equity")}
            </div>
          </div>

          <Separator />

          {/* Section 5: Income & Cash Flow */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Monthly Income &amp; Cash Flow</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
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

          <Separator />

          {/* Section 6: Management Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="management_notes" className="text-xs font-medium">
              Management Review Notes{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="management_notes"
              rows={2}
              value={form.management_notes}
              onChange={(e) => setField("management_notes", e.target.value)}
              placeholder="Document unusual movements, causes, risks, owners, or actions..."
            />
          </div>

          <DialogFooter>
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

