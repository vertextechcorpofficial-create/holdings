import { NextRequest, NextResponse } from "next/server";
import {
  deleteMonthlyInput,
  updateMonthlyInput,
} from "@/modules/holdings/financial-management/services/financial-health.service";
import { FinancialHealthUpdateSchema } from "@/modules/holdings/financial-management/types/financial-health.schema";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const numericId = Number(id);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid record ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validated = FinancialHealthUpdateSchema.omit({
      id: true,
      created_at: true,
      updated_at: true,
    }).parse(body);

    const updated = await updateMonthlyInput(numericId, validated);
    return NextResponse.json({ success: true, data: updated });
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

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const numericId = Number(id);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid record ID" },
        { status: 400 }
      );
    }

    await deleteMonthlyInput(numericId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

