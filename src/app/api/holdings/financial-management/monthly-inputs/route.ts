import { NextRequest, NextResponse } from "next/server";
import {
  createMonthlyInput,
  fetchMonthlyInputs,
} from "@/modules/holdings/financial-management/services/financial-health.service";
import { FinancialHealthMonthlySchema } from "@/modules/holdings/financial-management/types/financial-health.schema";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyIdParam = searchParams.get("company_id");
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    const companyId =
      companyIdParam && companyIdParam !== "all" ? Number(companyIdParam) : undefined;

    const records = await fetchMonthlyInputs({
      companyId: Number.isFinite(companyId) ? companyId : undefined,
      from,
      to,
    });

    return NextResponse.json({ success: true, data: records });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = FinancialHealthMonthlySchema.omit({
      id: true,
      created_at: true,
      updated_at: true,
    }).parse(body);

    const created = await createMonthlyInput(validated);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "name" in error && error.name === "ZodError") {
      return NextResponse.json(
        {
          success: false,
          message: "Validation error",
          errors: (error as Record<string, unknown>).issues,
        },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

