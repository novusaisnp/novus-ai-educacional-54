
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MessageSquare, Plus } from 'lucide-react';
import { useInteractions } from '@/hooks/useCRM';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default function CRMInteracoes() {
  const [entityTypeFilter, setEntityTypeFilter] = useState('todas');
  
  const { data: interactions = [], isLoading } = useInteractions();

  const filteredInteractions = interactions.filter(interaction => 
    entityTypeFilter === 'todas' || interaction.entity_type === entityTypeFilter
  );

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const getChannelBadge = (channel: string) => {
    const variants = {
      phone: 'default',
      email: 'secondary',
      whatsapp: 'outline',
      presencial: 'destructive',
      sistema: 'outline'
    } as const;
    
    return <Badge variant={variants[channel as keyof typeof variants] || 'outline'}>{channel}</Badge>;
  };

  const getDirectionBadge = (direction: string) => {
    return (
      <Badge variant={direction === 'inbound' ? 'default' : 'secondary'}>
        {direction === 'inbound' ? 'Entrada' : 'Saída'}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
                <BreadcrumbPage>Interações</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl font-bold mt-2">Interações</h1>
          <p className="text-muted-foreground">
            Histórico de todas as interações registradas
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nova Interação
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de Entidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="visitor">Visitantes</SelectItem>
                <SelectItem value="guardian">Responsáveis</SelectItem>
                <SelectItem value="student">Alunos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Interações */}
      <Card>
        <CardHeader>
          <CardTitle>Interações ({filteredInteractions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredInteractions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma interação encontrada</h3>
              <p className="text-muted-foreground">
                Ainda não há interações registradas.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Direção</TableHead>
                  <TableHead>Resumo</TableHead>
                  <TableHead>Executado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInteractions.map((interaction) => (
                  <TableRow key={interaction.id}>
                    <TableCell>
                      {formatDate(interaction.created_at)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{interaction.entity_name}</div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {interaction.entity_type === 'visitor' ? 'Visitante' :
                           interaction.entity_type === 'guardian' ? 'Responsável' :
                           interaction.entity_type === 'student' ? 'Aluno' : interaction.entity_type}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getChannelBadge(interaction.channel)}
                    </TableCell>
                    <TableCell>
                      {getDirectionBadge(interaction.direction)}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[300px] truncate" title={interaction.summary}>
                        {interaction.summary}
                      </div>
                    </TableCell>
                    <TableCell>
                      {interaction.performed_by_name}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
