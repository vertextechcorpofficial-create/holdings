"use client";

import React, { useMemo, useState } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  BookOpen,
  Calculator,
  Download,
  Info,
  Loader2,
  RefreshCw,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useFinancialHealthData } from "../hooks/useFinancialHealthData";
import {
  CalculatedRatios,
  RATIO_GUIDE,
  RatioGuideItem,
  calculateRatios,
  consolidateMonthlyInputs,
  formatMonthEndDate,
  formatRatioValue,
} from "../utils/ratio-calculator";

type CategoryFilter = "all" | "liquidity" | "leverage" | "profitability" | "cashflow";

const RATIO_ANALYSIS_COLUMNS: RatioGuideItem[] = RATIO_GUIDE.filter(
  (item) => item.key !== "cash_and_equivalents"
);

export function RatioAnalysisModule() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [exporting, setExporting] = useState(false);

  const { companies, records, loading, error, refresh } = useFinancialHealthData({
    companyId: selectedCompanyId,
    from: fromDate || undefined,
    to: toDate || undefined,
  });

  const ratioRows: CalculatedRatios[] = useMemo(() => {
    const base =
      selectedCompanyId === "all" ? consolidateMonthlyInputs(records) : records;
    return [...base]
      .sort((a, b) => a.month_end.localeCompare(b.month_end))
      .map(calculateRatios);
  }, [records, selectedCompanyId]);

  const latestRow = ratioRows.length > 0 ? ratioRows[ratioRows.length - 1] : null;

  const visibleColumns = useMemo(() => {
    if (category === "all") return RATIO_ANALYSIS_COLUMNS;
    return RATIO_ANALYSIS_COLUMNS.filter((c) => c.category === category);
  }, [category]);

  const handleExportExcel = async () => {
    if (ratioRows.length === 0) {
      toast.info("No ratio data to export.");
      return;
    }
    setExporting(true);
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Ratio Analysis");

      ws.addRow(["Month End", ...RATIO_ANALYSIS_COLUMNS.map((c) => c.label)]);
      ws.getRow(1).font = { bold: true };

      for (const row of ratioRows) {
        const values = RATIO_ANALYSIS_COLUMNS.map((col) => {
          const val = row[col.key];
          return typeof val === "number" ? val : null;
        });
        ws.addRow([formatMonthEndDate(row.month_end), ...values]);
      }

      ws.columns.forEach((col, idx) => {
        col.width = idx === 0 ? 16 : 20;
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const companyLabel =
        selectedCompanyId === "all"
          ? "consolidated"
          : companies.find((c) => String(c.company_id) === selectedCompanyId)?.company_code ||
            selectedCompanyId;
      saveAs(blob, `ratio_analysis_${companyLabel}.xlsx`);
      toast.success("Ratio analysis exported to Excel.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export Excel.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Calculator className="h-6 w-6 text-primary" />
              Ratio Analysis
            </h1>
            <p className="text-sm text-muted-foreground">
              Calculated financial ratios &amp; metrics derived automatically from Monthly Inputs.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <BookOpen className="mr-1.5 h-4 w-4" />
                  Ratio Guide
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[85vh] overflow-y-auto p-6">
                <DialogHeader>
                  <DialogTitle>Ratio Guide &amp; Interpretation Notes</DialogTitle>
                  <DialogDescription>
                    Ratios are signals, not verdicts. Compare trends, budget, industry context,
                    seasonality, and loan covenants.
                  </DialogDescription>
                </DialogHeader>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="px-4 py-3 whitespace-nowrap">Metric</TableHead>
                        <TableHead className="px-4 py-3 whitespace-nowrap">Formula</TableHead>
                        <TableHead className="px-4 py-3">What It Measures &amp; Management Question</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {RATIO_GUIDE.map((item) => (
                        <TableRow key={item.key} className="even:bg-muted/15">
                          <TableCell className="px-4 py-2.5 font-medium whitespace-nowrap align-top">
                            {item.label}
                          </TableCell>
                          <TableCell className="px-4 py-2.5 text-xs font-mono align-top">
                            {item.formula}
                          </TableCell>
                          <TableCell className="px-4 py-2.5 text-xs leading-relaxed align-top">
                            <p className="text-foreground/90">
                              <span className="font-semibold text-foreground">
                                What it measures:{" "}
                              </span>
                              {item.whatItMeasures}
                            </p>
                            <p className="mt-1 text-muted-foreground">
                              <span className="font-semibold text-foreground/80">
                                Management question:{" "}
                              </span>
                              {item.managementQuestion}
                            </p>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              size="sm"
              onClick={handleExportExcel}
              disabled={exporting || ratioRows.length === 0}
            >
              {exporting ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-4 w-4" />
              )}
              Export Excel
            </Button>
          </div>
        </div>

        {/* Latest Period Quick Highlights */}
        {latestRow && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Current Ratio
                  </span>
                  <Badge
                    variant={
                      latestRow.current_ratio !== null && latestRow.current_ratio < 1
                        ? "destructive"
                        : "secondary"
                    }
                    className="text-[11px]"
                  >
                    {latestRow.current_ratio !== null && latestRow.current_ratio < 1
                      ? "Below 1.0x"
                      : "Healthy"}
                  </Badge>
                </div>
                <div className="mt-2 text-2xl font-bold font-mono">
                  {formatRatioValue(latestRow.current_ratio, "ratio")}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  As of {formatMonthEndDate(latestRow.month_end)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Working Capital
                  </span>
                  <Badge
                    variant={latestRow.working_capital < 0 ? "destructive" : "secondary"}
                    className="text-[11px]"
                  >
                    {latestRow.working_capital < 0 ? "Negative" : "Positive"}
                  </Badge>
                </div>
                <div className="mt-2 text-2xl font-bold font-mono truncate">
                  {formatRatioValue(latestRow.working_capital, "currency", latestRow.currency_code)}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Current Assets minus Liabilities
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Debt-to-Equity
                  </span>
                  <Badge variant="outline" className="text-[11px]">
                    Leverage
                  </Badge>
                </div>
                <div className="mt-2 text-2xl font-bold font-mono">
                  {formatRatioValue(latestRow.debt_to_equity, "ratio")}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Debt Ratio: {formatRatioValue(latestRow.debt_ratio, "percent")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Net Profit Margin
                  </span>
                  <Badge
                    variant={
                      latestRow.net_margin !== null && latestRow.net_margin < 0
                        ? "destructive"
                        : "secondary"
                    }
                    className="text-[11px]"
                  >
                    Profitability
                  </Badge>
                </div>
                <div className="mt-2 text-2xl font-bold font-mono">
                  {formatRatioValue(latestRow.net_margin, "percent")}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Gross Margin: {formatRatioValue(latestRow.gross_margin, "percent")}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters & Table */}
        <Card>
          <CardHeader className="space-y-4 pb-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <CardTitle className="text-base">
                  Calculated Ratios &amp; Metrics ({ratioRows.length} period
                  {ratioRows.length === 1 ? "" : "s"})
                </CardTitle>
                <CardDescription>
                  {selectedCompanyId === "all"
                    ? "Showing consolidated totals across all subsidiaries per month."
                    : "Showing ratios for the selected subsidiary."}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger className="h-9 w-[260px] overflow-hidden [&>span]:truncate">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subsidiaries (Consolidated)</SelectItem>
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
                    onChange={(e) => setFromDate(e.target.value)}
                    className="h-9 w-[145px]"
                    title="From Month End"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">To</span>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
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

            <Tabs value={category} onValueChange={(v) => setCategory(v as CategoryFilter)}>
              <TabsList className="h-auto w-fit flex-wrap gap-1 p-1">
                <TabsTrigger value="all" className="px-3 py-1.5 text-xs whitespace-nowrap">
                  All Metrics (16)
                </TabsTrigger>
                <TabsTrigger value="liquidity" className="px-3 py-1.5 text-xs whitespace-nowrap">
                  Liquidity
                </TabsTrigger>
                <TabsTrigger value="leverage" className="px-3 py-1.5 text-xs whitespace-nowrap">
                  Leverage
                </TabsTrigger>
                <TabsTrigger value="profitability" className="px-3 py-1.5 text-xs whitespace-nowrap">
                  Profitability
                </TabsTrigger>
                <TabsTrigger value="cashflow" className="px-3 py-1.5 text-xs whitespace-nowrap">
                  Cash Flow &amp; DPO
                </TabsTrigger>
              </TabsList>
            </Tabs>
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
                Calculating ratios...
              </div>
            ) : ratioRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
                <Calculator className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">No periods available for ratio analysis</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add monthly figures in Monthly Inputs to view calculated metrics here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="sticky left-0 z-10 border-r bg-muted/80 px-4 py-3 text-xs font-semibold whitespace-nowrap backdrop-blur-sm">
                        Month End
                      </TableHead>
                      {visibleColumns.map((col) => (
                        <TableHead
                          key={col.key}
                          className="px-4 py-3 text-right text-xs font-semibold whitespace-nowrap"
                        >
                          <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                            <span className="whitespace-nowrap">{col.label}</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 shrink-0 cursor-help text-muted-foreground/80 hover:text-foreground" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs space-y-1.5">
                                <p className="font-semibold">{col.label}</p>
                                <p className="font-mono text-[11px]">{col.formula}</p>
                                <p className="text-[11px]">
                                  <span className="font-semibold">What it measures: </span>
                                  {col.whatItMeasures}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  <span className="font-semibold text-foreground">
                                    Management question:{" "}
                                  </span>
                                  {col.managementQuestion}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ratioRows.map((row) => (
                      <TableRow
                        key={`${row.company_id}-${row.month_end}`}
                        className="even:bg-muted/15 hover:bg-muted/35"
                      >
                        <TableCell className="sticky left-0 z-10 border-r bg-card px-4 py-3 text-xs font-medium whitespace-nowrap">
                          {formatMonthEndDate(row.month_end)}
                        </TableCell>
                        {visibleColumns.map((col) => {
                          const rawVal = row[col.key];
                          const numVal = typeof rawVal === "number" ? rawVal : null;
                          const isWarning =
                            (col.key === "current_ratio" && numVal !== null && numVal < 1) ||
                            (col.key === "working_capital" && numVal !== null && numVal < 0) ||
                            (col.key === "net_margin" && numVal !== null && numVal < 0);

                          return (
                            <TableCell
                              key={col.key}
                              className={`px-4 py-3 text-right font-mono text-xs tabular-nums whitespace-nowrap ${
                                isWarning ? "font-semibold text-destructive" : ""
                              }`}
                            >
                              {formatRatioValue(numVal, col.format, row.currency_code)}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
