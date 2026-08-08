import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Grid3X3, Search, Plus, Edit, Trash2 } from 'lucide-react';
import { ModalMestre } from '@/features/secretaria/hub/ModalMestre';

export default function SecretariaSeriesListPage() {
  const [searchParams] = useSearchParams();
  const { data: orgData } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('modal') === 'series');
  const [editingId, setEditingId] = useState<string | undefined>(undefined);

  const { data: segments = [] } = useQuery({
    queryKey: ['segments', orgData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('segments')
        .select('id, name')
        .eq('active', true)
        .order('order_index');
      
      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organization_id,
  });

  const { data: series = [], isLoading } = useQuery({
    queryKey: ['series', orgData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('series')
        .select(`
          *,
          segments(name)
        `)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organization_id,
  });

  const deleteSerie = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('series')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series'] });
      toast({ title: 'Série excluída com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ 
        variant: 'destructive',
        title: 'Erro ao excluir série',
        description: error.message 
      });
    },
  });

  const handleOpenModal = () => {
    setEditingId(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(undefined);
    queryClient.invalidateQueries({ queryKey: ['series'] });
  };

  const filteredSeries = series.filter(serie => {
    const matchesSearch = serie.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (serie.code && serie.code.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSegment = selectedSegment === 'all' || serie.segment_id === selectedSegment;
    
    return matchesSearch && matchesSegment;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Grid3X3 className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Séries</h1>
        </div>
        <Button onClick={handleOpenModal}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Série
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={selectedSegment} onValueChange={setSelectedSegment}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por segmento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os segmentos</SelectItem>
                {segments.map((segment) => (
                  <SelectItem key={segment.id} value={segment.id}>
                    {segment.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Séries ({filteredSeries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSeries.map((serie) => (
                  <TableRow key={serie.id}>
                    <TableCell>{serie.order_index}</TableCell>
                    <TableCell>{serie.segments?.name}</TableCell>
                    <TableCell className="font-medium">{serie.name}</TableCell>
                    <TableCell>{serie.code || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={serie.active ? 'default' : 'secondary'}>
                        {serie.active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(serie.id)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm('Tem certeza que deseja excluir esta série?')) {
                              deleteSerie.mutate(serie.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ModalMestre
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        defaultTab="series"
        editingItem={editingId}
      />
    </div>
  );
}