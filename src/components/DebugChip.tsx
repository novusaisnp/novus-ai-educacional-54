import { useEffect, useState } from "react"
import { getERPConfig, type ERPConfig } from "@/lib/featureFlags"
import { useOrganization } from "@/hooks/useOrganization"

export default function DebugChip() {
  const { orgId } = useOrganization()
  const [cfg, setCfg] = useState<ERPConfig | null>(null)

  useEffect(() => {
    if (!orgId) {
      setCfg(null)
      return
    }
    getERPConfig(orgId).then(setCfg)
  }, [orgId])


  return (
    <div className="fixed bottom-4 right-4 text-xs bg-muted px-3 py-2 rounded-full shadow">
      orgId: {orgId ?? "—"} | ERP: {cfg?.enabled ? (cfg?.mock ? "mock" : "on") : "off"}
    </div>
  )
}