import React from "react";
import { TopHeader } from "./_components/top-header";

export default function FinancialManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <TopHeader />
      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}

