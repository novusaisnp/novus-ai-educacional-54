import { getERPConfig } from "@/lib/featureFlags"
import { useOrganization } from "@/hooks/useOrganization"

export default function DebugChip() {
  const { orgId } = useOrganization()
  const cfg = orgId ? getERPConfig(orgId) : null
  
  return (
    <div className="fixed bottom-4 right-4 text-xs bg-muted px-3 py-2 rounded-full shadow">
      orgId: {orgId ?? "—"} | ERP: {cfg?.enabled ? (cfg?.mock ? "mock" : "on") : "off"}
    </div>
  )
}