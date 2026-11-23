"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CompanyOption,
  FinancialHealthMonthly,
} from "../types/financial-health.schema";

interface UseFinancialHealthDataOptions {
  companyId?: string; // "all" or numeric string
  from?: string;
  to?: string;
}

export function useFinancialHealthData(options?: UseFinancialHealthDataOptions) {
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [records, setRecords] = useState<FinancialHealthMonthly[]>([]);
  const [loading, setLoading] = useState(true);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const companyId = options?.companyId;
  const from = options?.from;
  const to = options?.to;

  useEffect(() => {
    let active = true;
    const loadCompanies = async () => {
      setCompaniesLoading(true);
      try {
        const res = await fetch("/api/holdings/management/subsidiary", {
          cache: "no-store",
        });
        const json = await res.json();
        if (!active) return;
        if (json?.success && Array.isArray(json.data)) {
          const mapped: CompanyOption[] = json.data
            .filter((c: Record<string, unknown>) => typeof c.company_id === "number")
            .map((c: Record<string, unknown>) => ({
              company_id: Number(c.company_id),
              company_name: (c.company_name as string | null) ?? null,
              company_code: String(c.company_code ?? ""),
            }));
          setCompanies(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch companies:", err);
      } finally {
        if (active) setCompaniesLoading(false);
      }
    };
    loadCompanies();
    return () => {
      active = false;
    };
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (companyId && companyId !== "all") qs.set("company_id", companyId);
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);

      const url = `/api/holdings/financial-management/monthly-inputs${
        qs.toString() ? `?${qs.toString()}` : ""
      }`;
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();

      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to load monthly financial inputs");
      }

      setRecords(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, from, to]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const createRecord = useCallback(
    async (payload: Omit<FinancialHealthMonthly, "id" | "created_at" | "updated_at">) => {
      const res = await fetch("/api/holdings/financial-management/monthly-inputs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to save monthly input");
      }
      await fetchRecords();
      return json.data as FinancialHealthMonthly;
    },
    [fetchRecords]
  );

  const updateRecord = useCallback(
    async (id: number, payload: Partial<FinancialHealthMonthly>) => {
      const res = await fetch(`/api/holdings/financial-management/monthly-inputs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to update monthly input");
      }
      await fetchRecords();
      return json.data as FinancialHealthMonthly;
    },
    [fetchRecords]
  );

  const deleteRecord = useCallback(
    async (id: number) => {
      const res = await fetch(`/api/holdings/financial-management/monthly-inputs/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to delete monthly input");
      }
      await fetchRecords();
    },
    [fetchRecords]
  );

  return {
    companies,
    companiesLoading,
    records,
    loading,
    error,
    refresh: fetchRecords,
    createRecord,
    updateRecord,
    deleteRecord,
  };
}
