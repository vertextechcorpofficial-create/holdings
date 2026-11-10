import type {
  InventoryKpis,
  InventoryProductItem,
  InventoryCategorySummary,
  WarehouseLocationSummary,
  InventoryStockStatus,
} from "../inventory/types";
import type {
  InventoryAgingKpis,
  InventoryAgingItem,
  AgingBracketSummary,
  WarehouseAgingSummary,
  AgingBracket,
  AgingStatus,
} from "../inventory-aging/types";

export interface UnifiedInventoryData {
  inventoryKpis: InventoryKpis;
  inventoryItems: InventoryProductItem[];
  categories: InventoryCategorySummary[];
  locations: WarehouseLocationSummary[];

  agingKpis: InventoryAgingKpis;
  agingItems: InventoryAgingItem[];
  brackets: AgingBracketSummary[];
  warehouses: WarehouseAgingSummary[];

  source: "live_engine" | "fallback_mock";
  timestamp: string;
}

type AnyRec = Record<string, unknown>;

// Shared in-memory cache & in-flight promise
let cachedUnifiedData: { data: UnifiedInventoryData; timestamp: number } | null = null;
let inFlightFetch: Promise<UnifiedInventoryData> | null = null;
const CACHE_TTL_MS = 60000; // 60 seconds

// Derive readable category from product name
function categorizeProduct(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("oil") || n.includes("mantika") || n.includes("shortening")) {
    return "Cooking Oils & Shortening";
  }
  if (n.includes("paminta") || n.includes("pepper") || n.includes("spice") || n.includes("seasoning") || n.includes("curry") || n.includes("laurel")) {
    return "Spices & Seasonings";
  }
  if (n.includes("sauce") || n.includes("patis") || n.includes("toyo") || n.includes("vinegar") || n.includes("suka") || n.includes("catsup") || n.includes("ketchup")) {
    return "Sauces & Condiments";
  }
  if (n.includes("flour") || n.includes("harina") || n.includes("starch") || n.includes("baking") || n.includes("premix")) {
    return "Flour & Bakery Supplies";
  }
  if (n.includes("sardine") || n.includes("tuna") || n.includes("can") || n.includes("meat") || n.includes("sausage")) {
    return "Canned Goods & Provisions";
  }
  if (n.includes("bottle") || n.includes("cap") || n.includes("pouch") || n.includes("box") || n.includes("roll")) {
    return "Packaging & Consumables";
  }
  return "General Distribution Goods";
}

// Synchronized baseline fallback (exact same figures for both modules)
const BASELINE_TOTAL_VALUATION = 39655380.77;
const BASELINE_TOTAL_UNITS = 200619;
const BASELINE_SKU_COUNT = 1161;

export async function fetchUnifiedInventoryData(
  springUrl = "http://goatedcodoer:8083",
  username = "dev@men2corp.com",
  password = "Vertex81617",
  force = false
): Promise<UnifiedInventoryData> {
  const now = Date.now();

  if (!force && cachedUnifiedData && now - cachedUnifiedData.timestamp < CACHE_TTL_MS) {
    return cachedUnifiedData.data;
  }

  if (inFlightFetch && !force) {
    return inFlightFetch;
  }

  inFlightFetch = (async () => {
    try {
      const cleanSpringUrl = springUrl.replace(/\/$/, "");

      // 1. Authenticate with Spring Boot
      const loginRes = await fetch(`${cleanSpringUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: username, hashPassword: password }),
        signal: AbortSignal.timeout(6000),
      });

      if (!loginRes.ok) {
        throw new Error(`Spring Boot login failed with status ${loginRes.status}`);
      }

      const loginJson = await loginRes.json();
      const token = loginJson.token;
      if (!token) {
        throw new Error("No auth token received from Spring Boot login");
      }

      // 2. Fetch live warehouse inventory view (25 second timeout)
      const slobRes = await fetch(`${cleanSpringUrl}/api/view-slob-aging/all`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(25000),
      });

      if (!slobRes.ok) {
        throw new Error(`Spring Boot view-slob-aging returned status ${slobRes.status}`);
      }

      const rawRows: AnyRec[] = await slobRes.json();
      if (!Array.isArray(rawRows) || rawRows.length === 0) {
        throw new Error("Empty inventory array returned by Spring Boot");
      }

      // 3. Process raw rows into unified inventory data
      const currentTime = Date.now();
      const inventoryItems: InventoryProductItem[] = [];
      const agingItems: InventoryAgingItem[] = [];

      const categoryMap = new Map<string, { count: number; units: number; valuation: number }>();
      const locationMap = new Map<number, { name: string; count: number; units: number; valuation: number; slobVal: number; slobUnits: number }>();

      const bracketMap = new Map<
        AgingBracket,
        { label: string; skuCount: number; totalUnits: number; totalValuation: number; color: string }
      >([
        ["0-30", { label: "0-30 Days (Fresh)", skuCount: 0, totalUnits: 0, totalValuation: 0, color: "#10b981" }],
        ["31-60", { label: "31-60 Days (Normal)", skuCount: 0, totalUnits: 0, totalValuation: 0, color: "#06b6d4" }],
        ["61-90", { label: "61-90 Days (Slow Moving)", skuCount: 0, totalUnits: 0, totalValuation: 0, color: "#f59e0b" }],
        ["91-120", { label: "91-120 Days (At Risk)", skuCount: 0, totalUnits: 0, totalValuation: 0, color: "#f97316" }],
        ["120+", { label: "120+ Days (SLOB / Obsolete)", skuCount: 0, totalUnits: 0, totalValuation: 0, color: "#ef4444" }],
      ]);

      let grandTotalValuation = 0;
      let grandTotalUnits = 0;
      const uniqueProductIds = new Set<number>();

      let lowStockCount = 0;
      let criticalStockCount = 0;
      let optimalStockCount = 0;

      let totalSlobValue = 0;
      let slobUnits = 0;
      let criticalSlobSkuCount = 0;
      let atRiskSkuCount = 0;
      let totalDaysSum = 0;
      let topAgedProduct = { name: "N/A", value: 0 };

      rawRows.forEach((row, idx) => {
        const branchId = Number(row.branchId || 279);
        const branchName = String(row.branchName || "Central Warehouse");
        const productId = Number(row.productId || 0);
        const productName = String(row.productName || `Product #${productId}`);
        const currentStock = Math.max(0, Number(row.currentStock || 0));
        const costPerUnit = Number(row.costPerUnit || 0);
        const stockVal = Math.max(0, Number(row.stockValue || currentStock * costPerUnit));
        const isSlob = Number(row.isSlob || 0);
        const slobThreshold = Number(row.slobDaysThreshold || 60);

        grandTotalValuation += stockVal;
        grandTotalUnits += currentStock;
        if (productId) uniqueProductIds.add(productId);

        const category = categorizeProduct(productName);
        const brand = String(row.supplierShortcut || "Mama Pina's");

        // Calculate days since last outbound
        let days = 0;
        const lastOutbound = row.lastOutboundDate ? String(row.lastOutboundDate) : null;
        if (lastOutbound) {
          const outboundTime = new Date(lastOutbound).getTime();
          if (!isNaN(outboundTime)) {
            days = Math.max(0, Math.floor((currentTime - outboundTime) / (1000 * 60 * 60 * 24)));
          } else {
            days = isSlob === 1 ? 125 : 35;
          }
        } else {
          days = isSlob === 1 ? 130 : 25;
        }
        totalDaysSum += days;

        // Aging Bracket & Status
        let bracket: AgingBracket = "0-30";
        let agingStatus: AgingStatus = "FRESH";

        if (isSlob === 1 || days > 120) {
          bracket = "120+";
          agingStatus = "SLOB";
        } else if (days > 90) {
          bracket = "91-120";
          agingStatus = "AT_RISK";
        } else if (days > 60) {
          bracket = "61-90";
          agingStatus = "SLOW_MOVING";
        } else if (days > 30) {
          bracket = "31-60";
          agingStatus = "NORMAL";
        } else {
          bracket = "0-30";
          agingStatus = "FRESH";
        }

        if (agingStatus === "SLOB") {
          totalSlobValue += stockVal;
          slobUnits += currentStock;
          criticalSlobSkuCount++;
          if (stockVal > topAgedProduct.value) {
            topAgedProduct = { name: productName, value: stockVal };
          }
        } else if (agingStatus === "AT_RISK" || agingStatus === "SLOW_MOVING") {
          atRiskSkuCount++;
        }

        // Bracket Aggregation
        const b = bracketMap.get(bracket)!;
        b.skuCount++;
        b.totalUnits += currentStock;
        b.totalValuation += stockVal;

        // Stock Status for General Inventory
        let stockStatus: InventoryStockStatus = "OPTIMAL";
        if (currentStock <= 5) {
          stockStatus = "CRITICAL";
          criticalStockCount++;
        } else if (currentStock <= 30) {
          stockStatus = "LOW_STOCK";
          lowStockCount++;
        } else if (currentStock >= 3000) {
          stockStatus = "OVERSTOCK";
        } else {
          optimalStockCount++;
        }

        // Category Aggregation
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { count: 0, units: 0, valuation: 0 });
        }
        const cEntry = categoryMap.get(category)!;
        cEntry.count++;
        cEntry.units += currentStock;
        cEntry.valuation += stockVal;

        // Location Aggregation
        if (!locationMap.has(branchId)) {
          locationMap.set(branchId, {
            name: branchName,
            count: 0,
            units: 0,
            valuation: 0,
            slobVal: 0,
            slobUnits: 0,
          });
        }
        const lEntry = locationMap.get(branchId)!;
        lEntry.count++;
        lEntry.units += currentStock;
        lEntry.valuation += stockVal;
        if (agingStatus === "SLOB") {
          lEntry.slobVal += stockVal;
          lEntry.slobUnits += currentStock;
        }

        const invItem: InventoryProductItem = {
          id: String(row.id || `${branchId}-${productId}-${idx}`),
          productId,
          productCode: String(row.supplierShortcut || "MP") + `-${productId}`,
          productName,
          productBrand: brand,
          productCategory: category,
          unitName: "Pieces",
          unitCount: 1,
          branchId,
          branchName,
          runningInventory: currentStock,
          unitCost: Math.round(costPerUnit * 100) / 100,
          totalValuation: Math.round(stockVal * 100) / 100,
          stockStatus,
          lastMovementDate: lastOutbound ? lastOutbound.slice(0, 10) : null,
        };
        inventoryItems.push(invItem);

        const agingItem: InventoryAgingItem = {
          id: String(row.id || `SLOB:${branchId}:${productId}:${idx}`),
          branchId,
          branchName,
          productId,
          productName,
          productCode: invItem.productCode,
          productBrand: brand,
          productCategory: category,
          supplierId: row.supplierId ? Number(row.supplierId) : undefined,
          supplierShortcut: row.supplierShortcut ? String(row.supplierShortcut) : undefined,
          currentStock,
          costPerUnit: Math.round(costPerUnit * 100) / 100,
          stockValue: Math.round(stockVal * 100) / 100,
          lastOutboundDate: lastOutbound ? lastOutbound.slice(0, 10) : null,
          daysSinceLastOutbound: days,
          isSlob,
          slobDaysThreshold: slobThreshold,
          bracket,
          status: agingStatus,
        };
        agingItems.push(agingItem);
      });

      // Categories summary
      const categories: InventoryCategorySummary[] = Array.from(categoryMap.entries())
        .map(([cat, val]) => ({
          category: cat,
          productCount: val.count,
          totalUnits: val.units,
          totalValuation: Math.round(val.valuation * 100) / 100,
          sharePercentage: grandTotalValuation > 0 ? Math.round((val.valuation / grandTotalValuation) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.totalValuation - a.totalValuation);

      // Locations summary for Inventory
      const locations: WarehouseLocationSummary[] = Array.from(locationMap.entries())
        .map(([bId, val]) => ({
          branchId: bId,
          branchName: val.name,
          productCount: val.count,
          totalUnits: val.units,
          totalValuation: Math.round(val.valuation * 100) / 100,
        }))
        .sort((a, b) => b.totalValuation - a.totalValuation);

      // Warehouses summary for Inventory Aging
      const warehouses: WarehouseAgingSummary[] = Array.from(locationMap.entries())
        .map(([bId, val]) => ({
          branchId: bId,
          branchName: val.name,
          skuCount: val.count,
          totalUnits: val.units,
          totalValuation: Math.round(val.valuation * 100) / 100,
          slobValuation: Math.round(val.slobVal * 100) / 100,
          slobUnits: val.slobUnits,
          slobRatio: val.valuation > 0 ? Math.round((val.slobVal / val.valuation) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.totalValuation - a.totalValuation);

      // Brackets summary for Inventory Aging
      const brackets: AgingBracketSummary[] = Array.from(bracketMap.entries()).map(([bracket, b]) => ({
        bracket,
        ...b,
        totalValuation: Math.round(b.totalValuation * 100) / 100,
        sharePercentage: grandTotalValuation > 0 ? Math.round((b.totalValuation / grandTotalValuation) * 1000) / 10 : 0,
      }));

      const roundedTotalValuation = Math.round(grandTotalValuation * 100) / 100;
      const totalSkuCount = uniqueProductIds.size || rawRows.length;
      const slobRiskRatio = roundedTotalValuation > 0 ? Math.round((totalSlobValue / roundedTotalValuation) * 1000) / 10 : 0;
      const stockHealthRate = rawRows.length > 0 ? Math.round(((optimalStockCount) / rawRows.length) * 1000) / 10 : 90;
      const averageUnitCost = grandTotalUnits > 0 ? Math.round((roundedTotalValuation / grandTotalUnits) * 100) / 100 : 0;
      const averageAgingDays = rawRows.length > 0 ? Math.round((totalDaysSum / rawRows.length) * 10) / 10 : 45;

      const inventoryKpis: InventoryKpis = {
        totalValuation: roundedTotalValuation,
        totalStockUnits: grandTotalUnits,
        inStockSkuCount: totalSkuCount,
        lowStockCount,
        criticalStockCount,
        stockHealthRate,
        topCategoryName: categories[0]?.category || "Cooking Oils & Shortening",
        topCategoryValuation: categories[0]?.totalValuation || 0,
        averageUnitCost,
      };

      const agingKpis: InventoryAgingKpis = {
        totalValuation: roundedTotalValuation,
        totalSlobValue: Math.round(totalSlobValue * 100) / 100,
        slobRiskRatio,
        totalStockUnits: grandTotalUnits,
        slobUnits,
        totalSkuCount,
        criticalSlobSkuCount,
        atRiskSkuCount,
        topAgedProductName: topAgedProduct.name,
        topAgedProductValue: Math.round(topAgedProduct.value * 100) / 100,
        averageAgingDays,
      };

      const result: UnifiedInventoryData = {
        inventoryKpis,
        inventoryItems,
        categories,
        locations,
        agingKpis,
        agingItems,
        brackets,
        warehouses,
        source: "live_engine",
        timestamp: new Date().toISOString(),
      };

      cachedUnifiedData = { data: result, timestamp: Date.now() };
      return result;
    } catch (err) {
      console.warn("[Shared Inventory Service] Live fetch failed, serving synchronized fallback:", err);

      // Return unified synchronized fallback (identical figures)
      const fallbackCategories: InventoryCategorySummary[] = [
        { category: "Cooking Oils & Shortening", productCount: 480, totalUnits: 88500, totalValuation: 17850000.0, sharePercentage: 45.0 },
        { category: "Spices & Seasonings", productCount: 390, totalUnits: 62100, totalValuation: 11890000.0, sharePercentage: 30.0 },
        { category: "Sauces & Condiments", productCount: 180, totalUnits: 32000, totalValuation: 5950000.0, sharePercentage: 15.0 },
        { category: "Flour & Bakery Supplies", productCount: 80, totalUnits: 12019, totalValuation: 2380000.0, sharePercentage: 6.0 },
        { category: "General Distribution Goods", productCount: 31, totalUnits: 6000, totalValuation: 1585380.77, sharePercentage: 4.0 },
      ];

      const fallbackLocations: WarehouseLocationSummary[] = [
        { branchId: 279, branchName: "Central Warehouse Hub", productCount: 450, totalUnits: 95400, totalValuation: 18850000.0 },
        { branchId: 278, branchName: "Dagupan Regional Warehouse", productCount: 380, totalUnits: 58200, totalValuation: 11520000.0 },
        { branchId: 238, branchName: "Pangasinan Fleet Hub", productCount: 220, totalUnits: 32019, totalValuation: 6350000.0 },
        { branchId: 208, branchName: "La Union Depot", productCount: 111, totalUnits: 15000, totalValuation: 2935380.77 },
      ];

      const fallbackBrackets: AgingBracketSummary[] = [
        { bracket: "0-30", label: "0-30 Days (Fresh)", skuCount: 580, totalUnits: 98000, totalValuation: 19430000.0, sharePercentage: 49.0, color: "#10b981" },
        { bracket: "31-60", label: "31-60 Days (Normal)", skuCount: 310, totalUnits: 52000, totalValuation: 10310000.0, sharePercentage: 26.0, color: "#06b6d4" },
        { bracket: "61-90", label: "61-90 Days (Slow Moving)", skuCount: 150, totalUnits: 26000, totalValuation: 5155000.0, sharePercentage: 13.0, color: "#f59e0b" },
        { bracket: "91-120", label: "91-120 Days (At Risk)", skuCount: 71, totalUnits: 14000, totalValuation: 2775000.0, sharePercentage: 7.0, color: "#f97316" },
        { bracket: "120+", label: "120+ Days (SLOB / Obsolete)", skuCount: 50, totalUnits: 10619, totalValuation: 1985380.77, sharePercentage: 5.0, color: "#ef4444" },
      ];

      const fallbackWarehouses: WarehouseAgingSummary[] = fallbackLocations.map((l) => ({
        ...l,
        skuCount: l.productCount,
        slobValuation: Math.round(l.totalValuation * 0.08 * 100) / 100,
        slobUnits: Math.round(l.totalUnits * 0.08),
        slobRatio: 8.0,
      }));

      const result: UnifiedInventoryData = {
        inventoryKpis: {
          totalValuation: BASELINE_TOTAL_VALUATION,
          totalStockUnits: BASELINE_TOTAL_UNITS,
          inStockSkuCount: BASELINE_SKU_COUNT,
          lowStockCount: 45,
          criticalStockCount: 12,
          stockHealthRate: 91.5,
          topCategoryName: "Cooking Oils & Shortening",
          topCategoryValuation: 17850000.0,
          averageUnitCost: 197.66,
        },
        inventoryItems: [],
        categories: fallbackCategories,
        locations: fallbackLocations,
        agingKpis: {
          totalValuation: BASELINE_TOTAL_VALUATION,
          totalSlobValue: 1985380.77,
          slobRiskRatio: 5.0,
          totalStockUnits: BASELINE_TOTAL_UNITS,
          slobUnits: 10619,
          totalSkuCount: BASELINE_SKU_COUNT,
          criticalSlobSkuCount: 50,
          atRiskSkuCount: 221,
          topAgedProductName: "Mama Pina's Palm Oil 17kg Tin",
          topAgedProductValue: 485000.0,
          averageAgingDays: 42.5,
        },
        agingItems: [],
        brackets: fallbackBrackets,
        warehouses: fallbackWarehouses,
        source: "fallback_mock",
        timestamp: new Date().toISOString(),
      };

      return result;
    } finally {
      inFlightFetch = null;
    }
  })();

  return inFlightFetch;
}
