import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Plus, Search } from 'lucide-react';
import { FormEntidade } from '@/features/secretaria/entidades/FormEntidade';

type Papel = 'RESPONSAVEL' | 'VISITANTE';

interface EntidadeRow {
  id: string;
  nome: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  papeis: Papel[];
}

/**
 * Cadastro Unificado de Entidades (Educacional) — único lugar onde se cria/
 * edita um Responsável ou Visitante. `/app/secretaria/responsaveis` e
 * `/app/secretaria/visitantes` só listam quem já tem aquele papel e trazem
 * o usuário pra cá via `?papel=`/`?edit=` pra criar/editar.
 */
export default function SecretariaEntidades() {
  const { data: orgData } = useOrganization();
  const orgId = orgData?.organization_id;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const papelParam = searchParams.get('papel') as Papel | null;
  const editParam = searchParams.get('edit');

  const { data: entidades = [], isLoading } = useQuery({
    queryKey: ['entidades-secretaria', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entidades')
        .select('id, nome, cpf, email, telefone, entidade_papeis(papel)')
        .eq('organization_id', orgId)
        .order('nome');
      if (error) throw error;
      return (data || [])
        .map((e): EntidadeRow => ({
          id: e.id, nome: e.nome, cpf: e.cpf, email: e.email, telefone: e.telefone,
          papeis: e.entidade_papeis.map((p) => p.papel as Papel),
        }))
        .filter((e) => e.papeis.includes('RESPONSAVEL') || e.papeis.includes('VISITANTE'));
    },
    enabled: !!orgId,
  });

  // Deep-link das telas satélite: ?papel=X abre criação com o papel
  // pré-marcado, ?edit=<id> abre edição direto.
  useEffect(() => {
    if (editParam) {
      setEditingId(editParam);
      setIsDialogOpen(true);
    } else if (papelParam && !isDialogOpen) {
      setEditingId(null);
      setIsDialogOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editParam, papelParam]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['entidades-secretaria'] });
    queryClient.invalidateQueries({ queryKey: ['guardians'] });
    queryClient.invalidateQueries({ queryKey: ['visitors'] });
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    // Chegou via deep-link de Responsáveis/Visitantes — volta pra lá ao
    // terminar, em vez de deixar o usuário preso na tela central.
    if (papelParam || editParam) {
      navigate(-1);
      return;
    }
    setIsDialogOpen(false);
    setEditingId(null);
  };

  const handleSaved = () => {
    invalidateAll();
    handleCloseDialog();
  };

  const filtered = entidades.filter((e) =>
    e.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.cpf && e.cpf.includes(searchTerm)) ||
    (e.email && e.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Cadastro de Entidades</h1>
          <p className="text-muted-foreground">Cadastro único de Responsáveis e Visitantes — marque os papéis que cada pessoa exerce</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) handleCloseDialog(); else setIsDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={() => setEditingId(null)}>
              <Plus className="h-4 w-4" />
              Novo Cadastro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Cadastro' : 'Novo Cadastro'}</DialogTitle>
            </DialogHeader>
            {orgId && (
              <FormEntidade
                orgId={orgId}
                entidadeId={editingId}
                papelInicial={papelParam || undefined}
                onSaved={handleSaved}
                onCancel={handleCloseDialog}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Responsáveis e Visitantes
          </CardTitle>
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome, CPF ou email..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12"><p>Carregando...</p></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{searchTerm ? 'Nenhuma entidade encontrada' : 'Nenhuma entidade cadastrada'}</h3>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Papéis</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.nome}</TableCell>
                    <TableCell>{e.cpf || '-'}</TableCell>
                    <TableCell>{e.email || '-'}</TableCell>
                    <TableCell>{e.telefone || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {e.papeis.map((p) => (
                          <Badge key={p} variant="secondary" className="text-xs">{p === 'RESPONSAVEL' ? 'Responsável' : 'Visitante'}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(e.id)}>Editar</Button>
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
