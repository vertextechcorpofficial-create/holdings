"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calculator,
  FileSpreadsheet,
  LayoutDashboard,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFinancialHealthData } from "../hooks/useFinancialHealthData";
import { FinancialHealthMonthly } from "../types/financial-health.schema";
import { calculateRatios, formatRatioValue } from "../utils/ratio-calculator";
import { MonthlyInputFormDialog } from "./components/MonthlyInputFormDialog";

export function MonthlyInputModule() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinancialHealthMonthly | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinancialHealthMonthly | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    companies,
    records,
    loading,
    error,
    refresh,
    createRecord,
    updateRecord,
    deleteRecord,
  } = useFinancialHealthData({ companyId: selectedCompanyId });

  const companyNameMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of companies) {
      map.set(c.company_id, c.company_name || c.company_code);
    }
    return map;
  }, [companies]);

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => b.month_end.localeCompare(a.month_end)),
    [records]
  );

  const handleOpenCreate = () => {
    setEditingRecord(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (record: FinancialHealthMonthly) => {
    setEditingRecord(record);
    setDialogOpen(true);
  };

  const handleFormSubmit = async (
    payload: Omit<FinancialHealthMonthly, "id" | "created_at" | "updated_at">,
    id?: number
  ) => {
    if (id) {
      await updateRecord(id, payload);
      toast.success("Monthly financial input updated.");
    } else {
      await createRecord(payload);
      toast.success("Monthly financial input saved.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await deleteRecord(deleteTarget.id);
      toast.success("Monthly input deleted.");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete record.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            Monthly Financial Inputs
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter month-end balances and monthly income/cash-flow figures. Ratios and the
            dashboard update automatically.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/holdings/financial-management/ratio-analysis">
              <Calculator className="mr-1.5 h-4 w-4" />
              Ratio Analysis
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/holdings/financial-management/dashboard">
              <LayoutDashboard className="mr-1.5 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Monthly Input
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Entered Periods</CardTitle>
              <CardDescription>
                {sortedRecords.length} monthly record{sortedRecords.length === 1 ? "" : "s"} found
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger className="w-[240px] h-9">
                  <SelectValue placeholder="Filter by company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subsidiaries</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.company_id} value={String(c.company_id)}>
                      {c.company_name || c.company_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={refresh}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading monthly inputs...
            </div>
          ) : sortedRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
              <FileSpreadsheet className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">No monthly financial inputs yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Click &ldquo;Add Monthly Input&rdquo; to enter your first reporting period.
              </p>
              <Button size="sm" className="mt-4" onClick={handleOpenCreate}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add Monthly Input
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month End</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Cash &amp; Equiv.</TableHead>
                    <TableHead className="text-right">Current Assets</TableHead>
                    <TableHead className="text-right">Current Liab.</TableHead>
                    <TableHead className="text-right">Total Assets</TableHead>
                    <TableHead className="text-right">Total Equity</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Net Income</TableHead>
                    <TableHead className="text-right">Current Ratio</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRecords.map((rec) => {
                    const computed = calculateRatios(rec);
                    const hasVariance =
                      computed.has_current_assets_variance ||
                      computed.has_current_liabilities_variance;

                    return (
                      <TableRow key={rec.id ?? `${rec.company_id}-${rec.month_end}`}>
                        <TableCell className="font-medium whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {rec.month_end}
                            {hasVariance && (
                              <span title="Override total differs from component sum">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {companyNameMap.get(rec.company_id) || `Company #${rec.company_id}`}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs whitespace-nowrap">
                          {formatRatioValue(rec.cash_and_equivalents, "currency", rec.currency_code)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs whitespace-nowrap">
                          {formatRatioValue(computed.current_assets, "currency", rec.currency_code)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs whitespace-nowrap">
                          {formatRatioValue(
                            computed.current_liabilities,
                            "currency",
                            rec.currency_code
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs whitespace-nowrap">
                          {formatRatioValue(rec.total_assets, "currency", rec.currency_code)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs whitespace-nowrap">
                          {formatRatioValue(rec.total_equity, "currency", rec.currency_code)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs whitespace-nowrap">
                          {formatRatioValue(rec.revenue, "currency", rec.currency_code)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs whitespace-nowrap">
                          {formatRatioValue(rec.net_income, "currency", rec.currency_code)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Badge
                            variant={
                              computed.current_ratio !== null && computed.current_ratio < 1
                                ? "destructive"
                                : "secondary"
                            }
                            className="font-mono text-xs"
                          >
                            {formatRatioValue(computed.current_ratio, "ratio")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenEdit(rec)}
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(rec)}
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <MonthlyInputFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        companies={companies}
        defaultCompanyId={
          selectedCompanyId !== "all" ? Number(selectedCompanyId) : undefined
        }
        editingRecord={editingRecord}
        onSubmit={handleFormSubmit}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Monthly Financial Input?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the financial data for{" "}
              <strong>{deleteTarget?.month_end}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
