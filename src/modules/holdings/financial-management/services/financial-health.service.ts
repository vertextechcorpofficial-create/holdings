import {
  FinancialHealthMonthly,
  FinancialHealthMonthlySchema,
} from "../types/financial-health.schema";
import {
  decryptFinancialPayload,
  encryptFinancialPayload,
} from "../utils/financial-crypto";

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

interface DirectusEncryptedRow {
  id?: number;
  company_id: number;
  month_end: string;
  currency_code?: string;
  encrypted_payload?: string;
  payload_hash?: string;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

type SensitiveFinancialFields = Omit<
  FinancialHealthMonthly,
  "id" | "company_id" | "month_end" | "currency_code" | "created_by" | "created_at" | "updated_at"
>;

function extractSensitiveFields(data: FinancialHealthMonthly): SensitiveFinancialFields {
  return {
    cash_and_equivalents: data.cash_and_equivalents,
    short_term_investments: data.short_term_investments,
    trade_receivables: data.trade_receivables,
    inventory: data.inventory,
    other_current_assets: data.other_current_assets,
    total_current_assets_override: data.total_current_assets_override ?? null,
    trade_payables: data.trade_payables,
    non_trade_payables: data.non_trade_payables,
    current_portion_loans: data.current_portion_loans,
    other_current_liabilities: data.other_current_liabilities,
    total_current_liabilities_override: data.total_current_liabilities_override ?? null,
    long_term_loans: data.long_term_loans,
    other_non_current_liabilities: data.other_non_current_liabilities,
    total_assets: data.total_assets,
    total_equity: data.total_equity,
    revenue: data.revenue,
    cost_of_goods_sold: data.cost_of_goods_sold,
    net_income: data.net_income,
    operating_cash_flow: data.operating_cash_flow ?? null,
    credit_purchases: data.credit_purchases ?? null,
    management_notes: data.management_notes ?? null,
  };
}

function toDirectusEncryptedBody(
  data: Omit<FinancialHealthMonthly, "id" | "created_at" | "updated_at">
) {
  const sensitive = extractSensitiveFields(data);
  const { encrypted_payload, payload_hash } = encryptFinancialPayload(sensitive);

  return {
    company_id: data.company_id,
    month_end: data.month_end,
    currency_code: data.currency_code || "PHP",
    encrypted_payload,
    payload_hash,
    created_by: data.created_by ?? null,
  };
}

function normalizeRecord(raw: unknown): FinancialHealthMonthly {
  const row = raw as DirectusEncryptedRow;
  if (row && typeof row.encrypted_payload === "string" && row.encrypted_payload.length > 0) {
    const decrypted = decryptFinancialPayload<SensitiveFinancialFields>(
      row.encrypted_payload,
      row.payload_hash
    );

    return FinancialHealthMonthlySchema.parse({
      id: row.id,
      company_id: row.company_id,
      month_end: row.month_end,
      currency_code: row.currency_code || "PHP",
      created_by: row.created_by ?? null,
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
      ...decrypted,
    });
  }

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

export async function fetchMonthlyInputById(id: number): Promise<FinancialHealthMonthly> {
  const response = await fetch(`${ENDPOINT}/${id}`, {
    method: "GET",
    headers: getHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`Failed to fetch monthly input ${id} (${response.status}): ${text}`);
  }

  const json = await response.json();
  return normalizeRecord(json.data);
}

export async function createMonthlyInput(
  payload: Omit<FinancialHealthMonthly, "id" | "created_at" | "updated_at">
): Promise<FinancialHealthMonthly> {
  const encryptedBody = toDirectusEncryptedBody(payload);

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(encryptedBody),
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
  const existing = await fetchMonthlyInputById(id);
  const merged = FinancialHealthMonthlySchema.omit({
    id: true,
    created_at: true,
    updated_at: true,
  }).parse({
    ...existing,
    ...payload,
  });

  const encryptedBody = toDirectusEncryptedBody(merged);

  const response = await fetch(`${ENDPOINT}/${id}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(encryptedBody),
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
