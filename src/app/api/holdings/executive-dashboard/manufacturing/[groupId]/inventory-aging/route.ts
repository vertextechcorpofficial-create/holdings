import { NextRequest, NextResponse } from "next/server";
import { fetchDashboardGroups } from "@/modules/holdings/executive-dashboard/services/dashboard-groups";
import { fetchUnifiedInventoryData } from "@/modules/holdings/executive-dashboard/services/shared-inventory";
import type { InventoryAgingResponse } from "@/modules/holdings/executive-dashboard/inventory-aging/types";
import { FALLBACK_INVENTORY_AGING_DATA } from "@/modules/holdings/executive-dashboard/inventory-aging/providers/fetchProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CachedAgingData {
  data: InventoryAgingResponse;
  timestamp: number;
}

const memoryCache = new Map<string, CachedAgingData>();
const CACHE_TTL_MS = 30000; // 30 seconds

async function getGroupConfig(groupId: string) {
  try {
    const groups = await fetchDashboardGroups();
    return (
      groups.find((g) => String(g.id) === groupId) ||
      groups.find(
        (g) =>
          g.category === "inventory-aging" ||
          g.category === "inventory_aging" ||
          g.category === "stock-aging" ||
          g.category === "aging-inventory" ||
          g.category === "slob-aging" ||
          g.category === "aging-and-slob-inventory"
      ) ||
      null
    );
  } catch (e) {
    console.error("[Inventory Aging Route] fetchDashboardGroups error:", e);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const group = await getGroupConfig(groupId);

    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";
    const bracketFilter = searchParams.get("bracket");
    const statusFilter = searchParams.get("status")?.toUpperCase();
    const branchFilter = searchParams.get("branchId");
    const searchTerm = searchParams.get("search")?.toLowerCase().trim();

    const cacheKey = `aging_${groupId}_${bracketFilter || "all"}_${statusFilter || "all"}_${branchFilter || "all"}_${searchTerm || ""}`;
    if (!force && memoryCache.has(cacheKey)) {
      const cached = memoryCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return NextResponse.json(cached.data);
      }
    }

    const springUrl = ((group?.springboot as string | undefined) || "http://goatedcodoer:8083").replace(/\/$/, "");
    const username = (group?.username as string | undefined) || "dev@men2corp.com";

    // Fetch unified inventory data (shared with inventory for 100% data consistency)
    const unified = await fetchUnifiedInventoryData(springUrl, username, "Vertex81617", force);

    // Filter items
    let filteredItems = unified.agingItems;
    if (bracketFilter && bracketFilter !== "ALL") {
      filteredItems = filteredItems.filter((i) => i.bracket === bracketFilter);
    }
    if (statusFilter && statusFilter !== "ALL") {
      filteredItems = filteredItems.filter((i) => i.status === statusFilter);
    }
    if (branchFilter && branchFilter !== "ALL") {
      filteredItems = filteredItems.filter((i) => String(i.branchId) === branchFilter);
    }
    if (searchTerm) {
      filteredItems = filteredItems.filter(
        (i) =>
          i.productName.toLowerCase().includes(searchTerm) ||
          (i.productCode && i.productCode.toLowerCase().includes(searchTerm)) ||
          i.branchName.toLowerCase().includes(searchTerm)
      );
    }

    const response: InventoryAgingResponse = {
      kpis: unified.agingKpis,
      brackets: unified.brackets,
      warehouses: unified.warehouses,
      items: filteredItems,
      filters: {
        bracket: bracketFilter,
        status: statusFilter,
        branchId: branchFilter ? Number(branchFilter) : null,
        search: searchTerm,
      },
      source: unified.source,
      timestamp: unified.timestamp,
    };

    memoryCache.set(cacheKey, { data: response, timestamp: Date.now() });
    return NextResponse.json(response);
  } catch (error) {
    console.error("[Inventory Aging Route] Fatal error:", error);
    return NextResponse.json(FALLBACK_INVENTORY_AGING_DATA);
  }
}
