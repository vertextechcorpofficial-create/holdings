

import { ExecutiveHealthModule } from "@/modules/holdings/executive-dashboard/executive-health";
import { fetchDashboardGroups } from "@/modules/holdings/executive-dashboard/services/dashboard-groups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ groupId: string }> }) {
    const { groupId } = await params;
    const groups = await fetchDashboardGroups();
    const group = groups.find((g) => String(g.id) === groupId) || null;
    const aiAnalysisTier = group?.ai_analysis_tier || null;

    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4">
                <ExecutiveHealthModule groupId={groupId} aiAnalysisTier={aiAnalysisTier} />
            </main>
        </div>
    );
}
