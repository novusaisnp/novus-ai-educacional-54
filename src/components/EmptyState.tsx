export default function EmptyState({ 
  title = "Sem dados", 
  description, 
  action 
}: { 
  title?: string; 
  description?: string; 
  action?: React.ReactNode 
}) {
  return (
    <div className="border rounded-2xl p-6 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}