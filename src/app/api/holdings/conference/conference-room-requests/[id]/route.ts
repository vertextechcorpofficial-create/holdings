import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateConferenceRoomRequestStatus } from "@/modules/holdings/conference/conference-room-request/services/conference-room-request.service";

const UpdateStatusSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "cancelled"]),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const numericId = Number(id);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid request ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { status } = UpdateStatusSchema.parse(body);

    const result = await updateConferenceRoomRequestStatus(numericId, status);
    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "name" in error && error.name === "ZodError") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid status value",
          errors: (error as Record<string, unknown>).issues,
        },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to update request status";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
