import React from "react";
import { Metadata } from "next";
import { RatioAnalysisModule } from "@/modules/holdings/financial-management/ratio-analysis/RatioAnalysisModule";

export const metadata: Metadata = {
  title: "Financial Ratio Analysis | Holdings",
  description: "Calculated monthly liquidity, leverage, profitability, and cash-flow ratios.",
};

export default function RatioAnalysisPage() {
  return <RatioAnalysisModule />;
}
