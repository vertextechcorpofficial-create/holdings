"use client";

import React, { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Calendar,
  Info,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFinancialHealthData } from "../hooks/useFinancialHealthData";
import {
  CalculatedRatios,
  RATIO_GUIDE,
  calculateRatios,
  consolidateMonthlyInputs,
  formatRatioValue,
} from "../utils/ratio-calculator";

const DASHBOARD_METRICS = RATIO_GUIDE.filter((item) => item.inDashboard);

const HERO_KEYS: Array<keyof CalculatedRatios> = [
  "cash_and_equivalents",
  "working_capital",
  "current_ratio",
  "net_margin",
];

export function FinancialHealthDashboardModule() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("latest");

  const { companies, records, loading, error, refresh } = useFinancialHealthData({
    companyId: selectedCompanyId,
  });

  const series: CalculatedRatios[] = useMemo(() => {
    const base =
      selectedCompanyId === "all" ? consolidateMonthlyInputs(records) : records;
    return [...base]
      .sort((a, b) => a.month_end.localeCompare(b.month_end))
      .map(calculateRatios);
  }, [records, selectedCompanyId]);

  const activeIndex = useMemo(() => {
    if (series.length === 0) return -1;
    if (selectedMonth === "latest") return series.length - 1;
    const idx = series.findIndex((s) => s.month_end === selectedMonth);
    return idx >= 0 ? idx : series.length - 1;
  }, [series, selectedMonth]);

  const currentSnapshot = activeIndex >= 0 ? series[activeIndex] : null;
  const previousSnapshot = activeIndex > 0 ? series[activeIndex - 1] : null;

  const chartData = useMemo(
    () =>
      series.slice(-24).map((row) => ({
        month: row.month_end,
        currentRatio: row.current_ratio !== null ? Number(row.current_ratio.toFixed(2)) : null,
        quickRatio: row.quick_ratio !== null ? Number(row.quick_ratio.toFixed(2)) : null,
        cashRatio: row.cash_ratio !== null ? Number(row.cash_ratio.toFixed(2)) : null,
        grossMarginPct:
          row.gross_margin !== null ? Number((row.gross_margin * 100).toFixed(1)) : null,
        netMarginPct:
          row.net_margin !== null ? Number((row.net_margin * 100).toFixed(1)) : null,
        currentAssets: Number(row.current_assets.toFixed(2)),
        currentLiabilities: Number(row.current_liabilities.toFixed(2)),
        workingCapital: Number(row.working_capital.toFixed(2)),
      })),
    [series]
  );

  const renderDelta = (key: keyof CalculatedRatios, format: "currency" | "ratio" | "percent" | "days") => {
    if (!currentSnapshot || !previousSnapshot) return null;
    const cur = currentSnapshot[key];
    const prev = previousSnapshot[key];
    if (typeof cur !== "number" || typeof prev !== "number") return null;
    const diff = cur - prev;
    if (Math.abs(diff) < 0.0001) {
      return <span className="text-xs text-muted-foreground">0.0 vs prior</span>;
    }
    const isUp = diff > 0;
    const formatted =
      format === "percent"
        ? `${diff > 0 ? "+" : ""}${(diff * 100).toFixed(1)} pp`
        : format === "ratio"
        ? `${diff > 0 ? "+" : ""}${diff.toFixed(2)}x`
        : format === "days"
        ? `${diff > 0 ? "+" : ""}${diff.toFixed(1)} d`
        : `${diff > 0 ? "+" : ""}${formatRatioValue(diff, "currency", currentSnapshot.currency_code)}`;

    return (
      <span
        className={`inline-flex items-center gap-0.5 text-xs font-medium ${
          isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
        }`}
      >
        {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {formatted}
      </span>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            Financial Health Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Latest reporting month snapshot, key financial ratios, and multi-month liquidity &amp;
            margin trends.
          </p>
        </div>

        {/* Filter Controls */}
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Reporting Month:</span>
              <Badge variant="secondary" className="font-mono">
                {currentSnapshot ? currentSnapshot.month_end : "No data"}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={selectedCompanyId}
                onValueChange={(v) => {
                  setSelectedCompanyId(v);
                  setSelectedMonth("latest");
                }}
              >
                <SelectTrigger className="w-[230px] h-9">
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

              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Latest Month</SelectItem>
                  {[...series].reverse().map((s) => (
                    <SelectItem key={s.month_end} value={s.month_end}>
                      {s.month_end}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon" className="h-9 w-9" onClick={refresh}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading financial health dashboard...
          </div>
        ) : !currentSnapshot ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-14 text-center">
              <LayoutDashboard className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">No financial data entered yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add your first reporting period in Monthly Inputs to populate the dashboard.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Hero KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {HERO_KEYS.map((key) => {
                const meta = RATIO_GUIDE.find((r) => r.key === key);
                if (!meta) return null;
                const val = currentSnapshot[key];
                const numVal = typeof val === "number" ? val : null;
                return (
                  <Card key={key}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        {meta.label}
                      </CardTitle>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs space-y-1">
                          <p className="font-mono text-[11px]">{meta.formula}</p>
                          <p className="text-[11px] text-muted-foreground">{meta.interpretation}</p>
                        </TooltipContent>
                      </Tooltip>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold font-mono">
                        {formatRatioValue(numVal, meta.format, currentSnapshot.currency_code)}
                      </div>
                      <div className="mt-1">{renderDelta(key, meta.format)}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Current Ratio Trend (from Excel Dashboard chart1) */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Current Ratio &amp; Liquidity Trend</CardTitle>
                  <CardDescription>
                    Current, Quick, and Cash ratios (times) — dashed line marks 1.0x threshold
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} unit="x" />
                      <RechartsTooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <ReferenceLine y={1} stroke="#ef4444" strokeDasharray="4 4" />
                      <Line
                        type="monotone"
                        dataKey="currentRatio"
                        name="Current Ratio"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="quickRatio"
                        name="Quick Ratio"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 2.5 }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="cashRatio"
                        name="Cash Ratio"
                        stroke="#f59e0b"
                        strokeWidth={1.8}
                        dot={{ r: 2 }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Profitability Margins Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Profitability Margins Trend</CardTitle>
                  <CardDescription>Gross Profit Margin vs. Net Profit Margin (%)</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} unit="%" />
                      <RechartsTooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                      <Line
                        type="monotone"
                        dataKey="grossMarginPct"
                        name="Gross Margin (%)"
                        stroke="#8b5cf6"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="netMarginPct"
                        name="Net Margin (%)"
                        stroke="#06b6d4"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Current Assets vs Current Liabilities Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current Assets vs. Current Liabilities</CardTitle>
                <CardDescription>
                  Monthly balance comparison ({currentSnapshot.currency_code})
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="currentAssets" name="Current Assets" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="currentLiabilities" name="Current Liabilities" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Full 14-Metric Executive Summary Table (Mirrors Excel Dashboard Sheet) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Latest Period Summary ({currentSnapshot.month_end})
                </CardTitle>
                <CardDescription>
                  Compare with prior months, budget, business context, and loan covenants.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentSnapshot.management_notes && (
                  <div className="mb-4 rounded-md border bg-muted/40 px-4 py-3 text-sm">
                    <span className="font-semibold">Management Notes: </span>
                    <span className="text-muted-foreground">
                      {currentSnapshot.management_notes}
                    </span>
                  </div>
                )}

                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metric</TableHead>
                        <TableHead className="text-right">Latest Result</TableHead>
                        <TableHead className="text-right">vs. Prior Month</TableHead>
                        <TableHead>Management Review / Guidance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {DASHBOARD_METRICS.map((metric) => {
                        const rawVal = currentSnapshot[metric.key];
                        const numVal = typeof rawVal === "number" ? rawVal : null;
                        return (
                          <TableRow key={metric.key}>
                            <TableCell className="font-medium whitespace-nowrap">
                              {metric.label}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm font-semibold whitespace-nowrap">
                              {formatRatioValue(
                                numVal,
                                metric.format,
                                currentSnapshot.currency_code
                              )}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              {renderDelta(metric.key, metric.format) ?? (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {metric.interpretation}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

