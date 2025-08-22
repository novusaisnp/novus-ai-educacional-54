import { ReactNode } from "react"

type PortalPageHeaderProps = {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}

export default function PortalPageHeader({ title, description, action, icon }: PortalPageHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div className="flex items-start gap-3">
        {icon && <div className="mt-1">{icon}</div>}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}