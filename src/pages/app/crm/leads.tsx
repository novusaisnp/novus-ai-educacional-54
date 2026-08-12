
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Phone, Mail, MessageCircle, Eye, GripVertical } from 'lucide-react';
import { useLeads, useUpdateLeadStatus, type Lead } from '@/hooks/useCRM';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';

type LeadStatus = Lead['status'];

const COLUMNS: { status: LeadStatus; label: string; totem: string }[] = [
  { status: 'ativo', label: 'Novo / Ativo', totem: 'totem-teal' },
  { status: 'morno', label: 'Morno', totem: 'totem-gold' },
  { status: 'frio', label: 'Frio', totem: 'totem-info' },
  { status: 'convertido', label: 'Convertido', totem: 'totem-success' },
];

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function waLink(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}

function LeadCard({ lead, onOpen, onDragStart }: { lead: Lead; onOpen: () => void; onDragStart: (e: React.DragEvent) => void }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="rounded-2xl bg-card p-4 shadow-[0_1px_1px_hsl(174_35%_18%/0.05),0_10px_22px_-14px_hsl(174_40%_18%/0.32)] cursor-grab active:cursor-grabbing space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="totem-teal h-8 w-8 shrink-0 flex items-center justify-center rounded-full text-xs font-bold">
            {initials(lead.full_name)}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{lead.full_name}</p>
            {lead.relation && <p className="text-xs text-muted-foreground truncate">{lead.relation}</p>}
          </div>
        </div>
        <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
      </div>

      {lead.purpose && (
        <p className="text-xs text-muted-foreground line-clamp-2">{lead.purpose}</p>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        {lead.phone && (
          <a href={`tel:${lead.phone}`} title={lead.phone} className="p-1.5 rounded-full bg-secondary hover:bg-secondary/70 text-secondary-foreground" onClick={(e) => e.stopPropagation()}>
            <Phone className="h-3.5 w-3.5" />
          </a>
        )}
        {lead.phone && (
          <a href={waLink(lead.phone)} target="_blank" rel="noreferrer" title="WhatsApp" className="p-1.5 rounded-full bg-secondary hover:bg-secondary/70 text-secondary-foreground" onClick={(e) => e.stopPropagation()}>
            <MessageCircle className="h-3.5 w-3.5" />
          </a>
        )}
        {lead.email && (
          <a href={`mailto:${lead.email}`} title={lead.email} className="p-1.5 rounded-full bg-secondary hover:bg-secondary/70 text-secondary-foreground" onClick={(e) => e.stopPropagation()}>
            <Mail className="h-3.5 w-3.5" />
          </a>
        )}
        <button onClick={onOpen} className="ml-auto p-1.5 rounded-full bg-secondary hover:bg-secondary/70 text-secondary-foreground">
          <Eye className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function CRMLeads() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [dragLeadId, setDragLeadId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<LeadStatus | null>(null);

  const { data: leads = [], isLoading } = useLeads({ search: search.trim() });
  const updateStatus = useUpdateLeadStatus();

  const leadsByColumn = useMemo(() => {
    const grouped: Record<LeadStatus, Lead[]> = { ativo: [], morno: [], frio: [], convertido: [] };
    for (const lead of leads) {
      grouped[lead.status]?.push(lead);
    }
    return grouped;
  }, [leads]);

  const handleDrop = (status: LeadStatus) => {
    if (dragLeadId) {
      updateStatus.mutate({ id: dragLeadId, status });
    }
    setDragLeadId(null);
    setDragOverColumn(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/app">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/app/crm">CRM</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Leads</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="text-2xl font-bold mt-2">Gestão de Leads</h1>
        <p className="text-muted-foreground">Arraste um card entre colunas para mudar o status</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, telefone ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            {search ? 'Nenhum lead corresponde à busca.' : 'Ainda não há leads cadastrados.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map((col) => (
            <div
              key={col.status}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverColumn(col.status);
              }}
              onDragLeave={() => setDragOverColumn((c) => (c === col.status ? null : c))}
              onDrop={() => handleDrop(col.status)}
              className={cn(
                'rounded-2xl p-3 space-y-3 min-h-[200px] transition-colors',
                dragOverColumn === col.status ? 'bg-primary/5 ring-2 ring-primary/30' : 'bg-muted/40'
              )}
            >
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', col.totem)} />
                  <h3 className="text-sm font-semibold">{col.label}</h3>
                </div>
                <Badge variant="outline">{leadsByColumn[col.status].length}</Badge>
              </div>

              <div className="space-y-2">
                {leadsByColumn[col.status].map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onOpen={() => navigate(`/app/crm/leads/${lead.id}`)}
                    onDragStart={() => setDragLeadId(lead.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
