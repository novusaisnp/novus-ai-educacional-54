import { HeartHandshake } from 'lucide-react';
import { IconBadge } from '@/components/IconBadge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveStudentPeiList } from '@/hooks/useStudentPei';
import { useUserRole } from '@/hooks/useUserRole';
import EmptyState from '@/components/EmptyState';

const isOverdue = (reviewDate: string | null) => {
  if (!reviewDate) return false;
  return reviewDate < new Date().toISOString().slice(0, 10);
};

export default function PeiCoordenacaoPage() {
  const { data: role, isLoading: isLoadingRole } = useUserRole();
  const canView = role === 'admin' || role === 'coordenacao';

  const { data: peiList = [], isLoading } = useActiveStudentPeiList();

  if (isLoadingRole) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!canView) {
    return (
      <EmptyState
        title="Acesso restrito"
        description="Este painel é visível apenas para administração e coordenação."
      />
    );
  }

  const overdueCount = peiList.filter((p) => isOverdue(p.review_date)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <IconBadge icon={HeartHandshake} tone="warm" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Coordenação Inclusiva</h1>
          <p className="text-muted-foreground">
            Visão consolidada de todos os PEIs ativos e revisões pendentes.
          </p>
        </div>
      </div>

      {!isLoading && overdueCount > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-sm">
              <strong>{overdueCount}</strong> {overdueCount === 1 ? 'PEI com revisão vencida' : 'PEIs com revisão vencida'}.
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!isLoading && peiList.length === 0 && (
        <EmptyState
          title="Nenhum PEI ativo"
          description="Quando um PEI for criado e marcado como ativo na ficha de um aluno, ele aparece aqui."
        />
      )}

      {!isLoading && peiList.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Diagnóstico</TableHead>
                    <TableHead>Adaptações</TableHead>
                    <TableHead>Profissional responsável</TableHead>
                    <TableHead>Próxima revisão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {peiList.map((pei) => (
                    <TableRow key={pei.id}>
                      <TableCell className="font-medium">
                        {pei.student ? `${pei.student.first_name} ${pei.student.last_name}` : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[240px] truncate">
                        {pei.diagnosis || '—'}
                      </TableCell>
                      <TableCell>
                        {pei.accommodations.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {pei.accommodations.slice(0, 2).map((item) => (
                              <Badge key={item} variant="outline" className="text-xs">
                                {item}
                              </Badge>
                            ))}
                            {pei.accommodations.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{pei.accommodations.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{pei.responsible_professional || '—'}</TableCell>
                      <TableCell>
                        {pei.review_date ? (
                          <Badge variant={isOverdue(pei.review_date) ? 'destructive' : 'secondary'}>
                            {new Date(pei.review_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Sem data definida</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
