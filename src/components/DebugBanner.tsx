import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import { useOrganization } from "@/hooks/useOrganization"
import { getERPConfig } from "@/lib/featureFlags"

export default function DebugBanner() {
  const { pathname } = useLocation()
  const { orgId } = useOrganization()
  const [userId, setUserId] = useState<string | null>(null)
  
  useEffect(() => {
    // ler sessão de forma tolerante; useSession pode não estar disponível aqui
    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client")
        const { data } = await supabase.auth.getSession()
        setUserId(data.session?.user?.id ?? null)
      } catch {}
    })()
  }, [])
  
  const cfg = orgId ? getERPConfig(orgId) : null
  
  return (
    <div className="fixed z-[60] bottom-3 right-3 text-[11px] bg-muted/90 backdrop-blur px-3 py-2 rounded-full shadow border">
      path:{pathname} | user:{userId ?? "—"} | org:{orgId ?? "—"} | ERP:{cfg?.enabled ? (cfg?.mock ? "mock" : "on") : "off"}
    </div>
  )
}