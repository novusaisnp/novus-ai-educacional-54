import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserCog, Plus } from 'lucide-react';
import { IconBadge } from '@/components/IconBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { useStaffList, useCreateStaffUser, StaffRole } from '@/hooks/useStaff';
import EmptyState from '@/components/EmptyState';

const staffSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  cpf: z.string().refine((v) => v.replace(/\D/g, '').length === 11, 'Informe um CPF válido (11 dígitos)'),
  role: z.enum(['professor', 'coordenacao', 'secretario'], { required_error: 'Selecione uma role' }),
});

type StaffFormData = z.infer<typeof staffSchema>;

const ROLE_LABELS: Record<StaffRole, string> = {
  professor: 'Professor',
  coordenacao: 'Coordenação',
  secretario: 'Secretário',
};

export default function EquipePage() {
  const { toast } = useToast();
  const { data: role, isLoading: isLoadingRole } = useUserRole();
  const canManage = role === 'admin' || role === 'coordenacao';

  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: staff = [], isLoading } = useStaffList();
  const createStaffUser = useCreateStaffUser();

  const form = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: { full_name: '', email: '', cpf: '', role: undefined },
  });

  const onSubmit = async (data: StaffFormData) => {
    try {
      await createStaffUser.mutateAsync({
        full_name: data.full_name,
        email: data.email,
        cpf: data.cpf.replace(/\D/g, ''),
        role: data.role,
      });
      toast({ title: 'Convite enviado', description: `${data.full_name} vai receber um e-mail para definir a senha.` });
      form.reset();
      setDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Erro ao convidar membro da equipe',
        description: error instanceof Error ? error.message : 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    }
  };

  if (isLoadingRole) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!canManage) {
    return (
      <EmptyState
        title="Acesso restrito"
        description="Esta página é visível apenas para administração e coordenação."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconBadge icon={UserCog} tone="info" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Equipe</h1>
            <p className="text-muted-foreground">
              Convide professores, coordenadores e secretários para acessar o sistema.
            </p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Convidar
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!isLoading && staff.length === 0 && (
        <EmptyState
          title="Nenhum membro da equipe cadastrado"
          description="Convide um professor, coordenador ou secretário para começar."
        />
      )}

      {!isLoading && staff.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Membros ({staff.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.full_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{member.email || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{ROLE_LABELS[member.role as StaffRole] || member.role}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar membro da equipe</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF *</FormLabel>
                    <FormControl>
                      <Input placeholder="000.000.000-00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="professor">Professor</SelectItem>
                        <SelectItem value="coordenacao">Coordenação</SelectItem>
                        <SelectItem value="secretario">Secretário</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createStaffUser.isPending}>
                  {createStaffUser.isPending ? 'Enviando...' : 'Enviar convite'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
