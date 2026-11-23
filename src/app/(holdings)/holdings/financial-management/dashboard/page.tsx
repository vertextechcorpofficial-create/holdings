import React from "react";
import { Metadata } from "next";
import { FinancialHealthDashboardModule } from "@/modules/holdings/financial-management/dashboard/FinancialHealthDashboardModule";

export const metadata: Metadata = {
  title: "Financial Health Dashboard | Holdings",
  description: "Executive overview of monthly financial health metrics and ratio trends.",
};

export default function FinancialHealthDashboardPage() {
  return <FinancialHealthDashboardModule />;
}

