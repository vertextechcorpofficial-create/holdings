"use client";

import React from "react";
import { Sparkles, Target, BarChart3, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export interface BasicAIAnalysisProps {
  /** The AI tier from dashboard_api.ai_analysis_tier (e.g. 'basic'). Only renders if tier includes 'basic'. */
  tier?: string | null;
  /** Array of at least 3 bullet points generated for this module */
  bulletPoints?: string[];
  /** Custom header title (defaults to "Basic AI Analysis") */
  title?: string;
  /** Custom badge text (defaults to "Basic AI") */
  badgeText?: string;
  /** Loading state indicator */
  loading?: boolean;
  /** Custom additional CSS classes */
  className?: string;
  /** Display variant: 'compact' for preview cards, 'spacious' for deep-dive pages */
  variant?: "compact" | "spacious";
}

const BULLET_ICONS = [Target, BarChart3, Lightbulb];

export function BasicAIAnalysis({
  tier,
  bulletPoints = [],
  title = "Basic AI Analysis",
  badgeText = "Basic AI",
  loading = false,
  className = "",
  variant = "compact",
}: BasicAIAnalysisProps) {
  // Only render if ai_analysis_tier is set to 'basic' (case-insensitive)
  const isBasicTier = typeof tier === "string" && tier.toLowerCase().includes("basic");
  if (!isBasicTier) {
    return null;
  }

  const isCompact = variant === "compact";

  return (
    <div
      className={`rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/5 via-fuchsia-500/5 to-transparent backdrop-blur-xs transition-all ${
        isCompact ? "p-3 space-y-2" : "p-4 sm:p-5 space-y-3.5"
      } ${className}`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 border-b border-violet-500/15 pb-2">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-wider text-foreground">
            {title}
          </span>
        </div>
        <Badge
          variant="outline"
          className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30 shadow-2xs"
        >
          {badgeText}
        </Badge>
      </div>

      {/* Body: Bullet Points */}
      {loading ? (
        <div className="space-y-2 py-1">
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ) : bulletPoints.length > 0 ? (
        <ul className={`space-y-2 ${isCompact ? "text-[11px]" : "text-xs"}`}>
          {bulletPoints.map((point, index) => {
            const IconComponent = BULLET_ICONS[index % BULLET_ICONS.length];
            return (
              <li
                key={index}
                className="flex items-start gap-2 leading-relaxed text-foreground/90 font-medium"
              >
                <span className="p-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5">
                  <IconComponent className="h-3 w-3" />
                </span>
                <span>{point}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[11px] text-muted-foreground italic">
          No automated AI insights available for the current date range.
        </p>
      )}
    </div>
  );
}

/**
 * Generates at least three intelligent executive bullet points for distribution-sales
 */
export function generateDistributionSalesAIBullets(params: {
  sales: number;
  target: number;
  achievement: number;
  topDivisionName?: string;
  topDivisionSales?: number;
  divisionCount?: number;
}): string[] {
  const { sales, target, achievement, topDivisionName, topDivisionSales, divisionCount } = params;

  const formatAmount = (val: number) => {
    const abs = Math.abs(val);
    if (abs >= 1_000_000) return `${val < 0 ? "-" : ""}₱${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${val < 0 ? "-" : ""}₱${(abs / 1_000).toFixed(0)}k`;
    return `${val < 0 ? "-" : ""}₱${abs.toFixed(0)}`;
  };

  const bullets: string[] = [];
  const variance = sales - target;

  // Bullet 1: Quota Attainment & Variance
  if (achievement >= 100) {
    bullets.push(
      `Quota Surpassed: Actual revenue of ${formatAmount(sales)} exceeded the target quota of ${formatAmount(
        target
      )} with an attainment rate of ${achievement.toFixed(1)}% (net favorable surplus of ${formatAmount(
        variance
      )}).`
    );
  } else if (achievement >= 80) {
    bullets.push(
      `On-Track Pacing: Recorded revenue of ${formatAmount(sales)} achieved ${achievement.toFixed(
        1
      )}% of the ${formatAmount(target)} target quota, leaving a manageable variance gap of ${formatAmount(
        variance
      )}.`
    );
  } else {
    bullets.push(
      `Quota Deficit Alert: Period revenue of ${formatAmount(sales)} is lagging at ${achievement.toFixed(
        1
      )}% against the ${formatAmount(target)} target quota, resulting in a deficit variance of ${formatAmount(
        variance
      )}.`
    );
  }

  // Bullet 2: Leading Division / Channel Driver
  if (topDivisionName && topDivisionSales && topDivisionSales > 0) {
    const topShare = sales > 0 ? ((topDivisionSales / sales) * 100).toFixed(1) : "0";
    bullets.push(
      `Key Volume Anchor: ${topDivisionName} represents the primary revenue driver, contributing ${formatAmount(
        topDivisionSales
      )} (${topShare}% of total gross) across ${divisionCount || "active"} operating divisions.`
    );
  } else {
    bullets.push(
      `Division Distribution: Commercial operations maintained broad delivery throughput across all active provincial territories and retail accounts.`
    );
  }

  // Bullet 3: Strategic Pacing & Actionable Takeaway
  if (achievement >= 100) {
    bullets.push(
      `Executive Outlook: Revenue velocity is pacing ahead of schedule. Recommend expediting receivables collection and restocking high-turnover lines to preserve target gains.`
    );
  } else if (achievement >= 80) {
    bullets.push(
      `Run-Rate Outlook: Attainment is within striking distance. A targeted +${((100 - achievement) / 2).toFixed(
        1
      )}% booking lift across mid-tier accounts will secure full period quota realization.`
    );
  } else {
    bullets.push(
      `Corrective Strategy: Recommend intensifying promotional dealer incentives and prioritizing backlog fulfillment to recover the ${formatAmount(
        Math.abs(variance)
      )} target shortfall.`
    );
  }

  return bullets;
}

