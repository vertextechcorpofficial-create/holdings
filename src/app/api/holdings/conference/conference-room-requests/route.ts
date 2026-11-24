import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, decodeJwtPayload } from "@/lib/auth-utils";
import {
  fetchMyRequests,
  submitConferenceRoomRequest,
} from "@/modules/holdings/conference/conference-room-request/services/conference-room-request.service";

async function resolveLoggedInRequester(): Promise<{
  userId?: number;
  fullName?: string;
}> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return {};

    const payload = decodeJwtPayload(token);
    if (!payload) return {};

    const rawId = payload.id ?? payload.user_id ?? payload.sub;
    const numericId = Number(rawId);
    const userId = Number.isFinite(numericId) && numericId > 0 ? numericId : undefined;

    const first = String(payload.FirstName ?? payload.firstName ?? payload.first_name ?? "").trim();
    const middle = String(payload.MiddleName ?? payload.middleName ?? payload.middle_name ?? "").trim();
    const last = String(payload.LastName ?? payload.lastName ?? payload.last_name ?? "").trim();
    const jwtFullName = [first, middle, last].filter(Boolean).join(" ").trim();

    if (jwtFullName) {
      return { userId, fullName: jwtFullName };
    }

    // Fallback: look up user record in Directus by user_id or user_email
    const directusBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
    const directusToken = process.env.DIRECTUS_STATIC_TOKEN || "";
    if (directusBase && (userId || payload.email)) {
      const headers: HeadersInit = directusToken
        ? { Authorization: `Bearer ${directusToken}` }
        : {};
      const filter = userId
        ? `filter[user_id][_eq]=${userId}`
        : `filter[user_email][_eq]=${encodeURIComponent(String(payload.email))}`;
      const res = await fetch(
        `${directusBase}/items/user?${filter}&fields=user_id,user_fname,user_mname,user_lname,user_email&limit=1`,
        { headers, cache: "no-store" }
      );
      if (res.ok) {
        const json = await res.json();
        const u = json?.data?.[0];
        if (u) {
          const dbName = [u.user_fname, u.user_mname, u.user_lname]
            .map((v: unknown) => String(v ?? "").trim())
            .filter(Boolean)
            .join(" ");
          return {
            userId: Number.isFinite(Number(u.user_id)) ? Number(u.user_id) : userId,
            fullName: dbName || u.user_email || payload.email,
          };
        }
      }
    }

    return {
      userId,
      fullName: typeof payload.name === "string" && payload.name.trim()
        ? payload.name.trim()
        : payload.email || undefined,
    };
  } catch (err) {
    console.warn("[conference-room-requests] Could not resolve logged-in user:", err);
    return {};
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdStr = searchParams.get("userId");
    const userId = userIdStr ? parseInt(userIdStr, 10) : undefined;

    const requests = await fetchMyRequests(userId);
    return NextResponse.json({ success: true, data: requests });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const requester = await resolveLoggedInRequester();

    const enrichedPayload = {
      ...body,
      ...(requester.userId ? { requested_by: requester.userId } : {}),
      ...(requester.fullName ? { requested_by_name: requester.fullName } : {}),
    };

    const result = await submitConferenceRoomRequest(enrichedPayload);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to submit request" },
      { status: 500 }
    );
  }
}
