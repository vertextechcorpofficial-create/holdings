import { NextRequest, NextResponse } from "next/server";
import { fetchDashboardGroups } from "@/modules/holdings/executive-dashboard/services/dashboard-groups";
import { fetchUnifiedInventoryData } from "@/modules/holdings/executive-dashboard/services/shared-inventory";
import type { InventoryResponse } from "@/modules/holdings/executive-dashboard/inventory/types";
import { FALLBACK_INVENTORY_DATA } from "@/modules/holdings/executive-dashboard/inventory/providers/fetchProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CachedInventoryData {
  data: InventoryResponse;
  timestamp: number;
}

const memoryCache = new Map<string, CachedInventoryData>();
const CACHE_TTL_MS = 30000; // 30s

async function getGroupConfig(groupId: string) {
  try {
    const groups = await fetchDashboardGroups();
    return (
      groups.find((g) => String(g.id) === groupId) ||
      groups.find(
        (g) =>
          g.category === "inventory" ||
          g.category === "distribution-inventory" ||
          g.category === "warehouse-inventory" ||
          g.category === "stock-inventory" ||
          g.category === "running-inventory"
      ) ||
      null
    );
  } catch (e) {
    console.error("[Inventory Route] fetchDashboardGroups error:", e);
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
    const categoryFilter = searchParams.get("category");
    const branchFilter = searchParams.get("branchId");
    const statusFilter = searchParams.get("status")?.toUpperCase();
    const searchTerm = searchParams.get("search")?.toLowerCase().trim();

    const cacheKey = `inv_${groupId}_${categoryFilter || "all"}_${branchFilter || "all"}_${statusFilter || "all"}_${searchTerm || ""}`;
    if (!force && memoryCache.has(cacheKey)) {
      const cached = memoryCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return NextResponse.json(cached.data);
      }
    }

    const springUrl = (group?.springboot as string | undefined) || "http://goatedcodoer:8083";
    const username = (group?.username as string | undefined) || "dev@men2corp.com";

    // Fetch unified inventory data (shared with inventory-aging for 100% data consistency)
    const unified = await fetchUnifiedInventoryData(springUrl, username, "Vertex81617", force);

    // Apply search filters
    let filteredItems = unified.inventoryItems;
    if (categoryFilter && categoryFilter !== "ALL") {
      filteredItems = filteredItems.filter(
        (i) => i.productCategory.toLowerCase() === categoryFilter.toLowerCase()
      );
    }
    if (branchFilter && branchFilter !== "ALL") {
      filteredItems = filteredItems.filter((i) => String(i.branchId) === branchFilter);
    }
    if (statusFilter && statusFilter !== "ALL") {
      filteredItems = filteredItems.filter((i) => i.stockStatus === statusFilter);
    }
    if (searchTerm) {
      filteredItems = filteredItems.filter(
        (i) =>
          i.productName.toLowerCase().includes(searchTerm) ||
          i.productCode.toLowerCase().includes(searchTerm) ||
          i.branchName.toLowerCase().includes(searchTerm)
      );
    }

    const responseData: InventoryResponse = {
      kpis: unified.inventoryKpis,
      items: filteredItems,
      categories: unified.categories,
      locations: unified.locations,
      filters: {
        category: categoryFilter || undefined,
        branchId: branchFilter ? Number(branchFilter) : undefined,
        status: statusFilter,
        search: searchTerm || undefined,
      },
      source: unified.source,
      timestamp: unified.timestamp,
    };

    memoryCache.set(cacheKey, { data: responseData, timestamp: Date.now() });
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("[Inventory Route] Fatal error:", error);
    return NextResponse.json(FALLBACK_INVENTORY_DATA);
  }
}
