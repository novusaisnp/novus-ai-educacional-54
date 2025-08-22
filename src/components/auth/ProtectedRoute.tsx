import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"

export default function ProtectedRoute() {
  const [loading, setLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const loc = useLocation()

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (!active) return
        setIsAuth(!!data.session?.user)
      } catch {
        setIsAuth(false)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [loc.pathname])

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-sm text-muted-foreground">Carregando…</div>
      </div>
    )
  }
  if (!isAuth) {
    return <Navigate to="/auth/login" replace state={{ from: loc.pathname }} />
  }
  return <Outlet />
}