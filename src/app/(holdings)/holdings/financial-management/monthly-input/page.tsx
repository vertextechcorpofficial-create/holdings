import React from "react";
import { Metadata } from "next";
import { MonthlyInputModule } from "@/modules/holdings/financial-management/monthly-input/MonthlyInputModule";

export const metadata: Metadata = {
  title: "Monthly Financial Inputs | Holdings",
  description: "Enter and manage monthly financial health inputs for Holdings subsidiaries.",
};

export default function MonthlyInputPage() {
  return <MonthlyInputModule />;
}

