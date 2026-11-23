import {
  FinancialHealthMonthly,
  FinancialHealthMonthlySchema,
} from "../types/financial-health.schema";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";
const ENDPOINT = `${API_BASE_URL}/items/financial_health_monthly`;

const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (DIRECTUS_TOKEN) {
    headers["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  }
  return headers;
};

function normalizeRecord(raw: unknown): FinancialHealthMonthly {
  return FinancialHealthMonthlySchema.parse(raw);
}

export interface FetchMonthlyInputsFilter {
  companyId?: number;
  from?: string;
  to?: string;
}

export async function fetchMonthlyInputs(
  params?: FetchMonthlyInputsFilter
): Promise<FinancialHealthMonthly[]> {
  const filterObj: Record<string, unknown> = {};

  if (params?.companyId && Number.isFinite(params.companyId)) {
    filterObj.company_id = { _eq: params.companyId };
  }
  if (params?.from && params?.to) {
    filterObj.month_end = { _between: [params.from, params.to] };
  } else if (params?.from) {
    filterObj.month_end = { _gte: params.from };
  } else if (params?.to) {
    filterObj.month_end = { _lte: params.to };
  }

  const searchParams = new URLSearchParams({
    sort: "month_end",
    limit: "-1",
  });
  if (Object.keys(filterObj).length > 0) {
    searchParams.set("filter", JSON.stringify(filterObj));
  }

  const response = await fetch(`${ENDPOINT}?${searchParams.toString()}`, {
    method: "GET",
    headers: getHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`Failed to fetch monthly inputs (${response.status}): ${text}`);
  }

  const json = await response.json();
  const rows: unknown[] = Array.isArray(json?.data) ? json.data : [];
  return rows.map(normalizeRecord);
}

export async function createMonthlyInput(
  payload: Omit<FinancialHealthMonthly, "id" | "created_at" | "updated_at">
): Promise<FinancialHealthMonthly> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`Failed to create monthly input (${response.status}): ${text}`);
  }

  const json = await response.json();
  return normalizeRecord(json.data);
}

export async function updateMonthlyInput(
  id: number,
  payload: Partial<FinancialHealthMonthly>
): Promise<FinancialHealthMonthly> {
  const response = await fetch(`${ENDPOINT}/${id}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`Failed to update monthly input ${id} (${response.status}): ${text}`);
  }

  const json = await response.json();
  return normalizeRecord(json.data);
}

export async function deleteMonthlyInput(id: number): Promise<void> {
  const response = await fetch(`${ENDPOINT}/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`Failed to delete monthly input ${id} (${response.status}): ${text}`);
  }
}
