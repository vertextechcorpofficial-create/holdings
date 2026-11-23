"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  calculateRatios,
  formatMonthEndDate,
  formatRatioValue,
} from "../utils/ratio-calculator";
import { MonthlyInputFormDialog } from "./components/MonthlyInputFormDialog";

const PAGE_SIZE = 10;

export function MonthlyInputModule() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [page, setPage] = useState<number>(1);
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
  } = useFinancialHealthData({
    companyId: selectedCompanyId,
    from: fromDate || undefined,
    to: toDate || undefined,
  });

  const companyNameMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of companies) {
      map.set(c.company_id, c.company_name || c.company_code);
    }
    return map;
  }, [companies]);

  const sortedRecords = useMemo(
    () =>
      [...records].sort((a, b) => {
        const dateCmp = b.month_end.localeCompare(a.month_end);
        if (dateCmp !== 0) return dateCmp;
        return a.company_id - b.company_id;
      }),
    [records]
  );

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedRecords.slice(start, start + PAGE_SIZE);
  }, [sortedRecords, currentPage]);

  const latestPeriod = sortedRecords.length > 0 ? sortedRecords[0].month_end : null;
  const uniqueCompaniesCount = useMemo(
    () => new Set(sortedRecords.map((r) => r.company_id)).size,
    [sortedRecords]
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

  const startItem = sortedRecords.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, sortedRecords.length);

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
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Monthly Input
          </Button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between pt-5">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Entries</p>
              <p className="mt-1 text-2xl font-bold font-mono">{sortedRecords.length}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between pt-5">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Latest Reporting Month</p>
              <p className="mt-1 text-2xl font-bold">
                {latestPeriod ? formatMonthEndDate(latestPeriod) : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <Calendar className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between pt-5">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Subsidiaries Tracked</p>
              <p className="mt-1 text-2xl font-bold font-mono">{uniqueCompaniesCount}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar & Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle className="text-base">Entered Periods</CardTitle>
              <CardDescription>
                {sortedRecords.length} monthly record{sortedRecords.length === 1 ? "" : "s"} found
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={selectedCompanyId}
                onValueChange={(v) => {
                  setSelectedCompanyId(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[260px] overflow-hidden [&>span]:truncate">
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
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">From</span>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 w-[145px]"
                  title="From Month End"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">To</span>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 w-[145px]"
                  title="To Month End"
                />
              </div>
              {(fromDate || toDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2 text-xs text-muted-foreground"
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                    setPage(1);
                  }}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Clear
                </Button>
              )}
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={refresh}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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
            <>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="sticky left-0 z-10 border-r bg-muted/80 px-4 py-3 text-xs font-semibold whitespace-nowrap backdrop-blur-sm">
                        Month End
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold whitespace-nowrap">
                        Company
                      </TableHead>
                      <TableHead className="px-4 py-3 text-right text-xs font-semibold whitespace-nowrap">
                        Cash &amp; Equiv.
                      </TableHead>
                      <TableHead className="px-4 py-3 text-right text-xs font-semibold whitespace-nowrap">
                        Current Assets
                      </TableHead>
                      <TableHead className="px-4 py-3 text-right text-xs font-semibold whitespace-nowrap">
                        Current Liab.
                      </TableHead>
                      <TableHead className="px-4 py-3 text-right text-xs font-semibold whitespace-nowrap">
                        Total Assets
                      </TableHead>
                      <TableHead className="px-4 py-3 text-right text-xs font-semibold whitespace-nowrap">
                        Total Equity
                      </TableHead>
                      <TableHead className="px-4 py-3 text-right text-xs font-semibold whitespace-nowrap">
                        Revenue
                      </TableHead>
                      <TableHead className="px-4 py-3 text-right text-xs font-semibold whitespace-nowrap">
                        Net Income
                      </TableHead>
                      <TableHead className="px-4 py-3 text-right text-xs font-semibold whitespace-nowrap">
                        Current Ratio
                      </TableHead>
                      <TableHead className="sticky right-0 z-10 border-l bg-muted/80 px-4 py-3 text-right text-xs font-semibold whitespace-nowrap backdrop-blur-sm">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRecords.map((rec) => {
                      const computed = calculateRatios(rec);
                      const hasVariance =
                        computed.has_current_assets_variance ||
                        computed.has_current_liabilities_variance;

                      return (
                        <TableRow
                          key={rec.id ?? `${rec.company_id}-${rec.month_end}`}
                          className="even:bg-muted/15 hover:bg-muted/35"
                        >
                          <TableCell className="sticky left-0 z-10 border-r bg-card px-4 py-3 text-xs font-medium whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {formatMonthEndDate(rec.month_end)}
                              {hasVariance && (
                                <span title="Override total differs from component sum">
                                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-xs font-medium whitespace-nowrap">
                            {companyNameMap.get(rec.company_id) || `Company #${rec.company_id}`}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                            {formatRatioValue(
                              rec.cash_and_equivalents,
                              "currency",
                              rec.currency_code
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                            {formatRatioValue(
                              computed.current_assets,
                              "currency",
                              rec.currency_code
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                            {formatRatioValue(
                              computed.current_liabilities,
                              "currency",
                              rec.currency_code
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                            {formatRatioValue(rec.total_assets, "currency", rec.currency_code)}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                            {formatRatioValue(rec.total_equity, "currency", rec.currency_code)}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                            {formatRatioValue(rec.revenue, "currency", rec.currency_code)}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                            {formatRatioValue(rec.net_income, "currency", rec.currency_code)}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right whitespace-nowrap">
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
                          <TableCell className="sticky right-0 z-10 border-l bg-card px-3 py-2 text-right whitespace-nowrap">
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

              {/* Pagination */}
              <div className="flex flex-col items-center justify-between gap-2 pt-1 text-xs text-muted-foreground sm:flex-row">
                <span>
                  Showing <strong className="text-foreground">{startItem}</strong>–
                  <strong className="text-foreground">{endItem}</strong> of{" "}
                  <strong className="text-foreground">{sortedRecords.length}</strong> entries
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                    Previous
                  </Button>
                  <span className="px-1 font-medium text-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </>
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
              <strong>{formatMonthEndDate(deleteTarget?.month_end)}</strong>. This action cannot be
              undone.
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
