import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserCog, Plus, KeyRound } from 'lucide-react';
import { IconBadge } from '@/components/IconBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import {
  useStaffList, useCreateStaffUser, useResetStaffPassword, useStaffRoleSuggestion, StaffRole, StaffRoleSuggestion,
} from '@/hooks/useStaff';
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
  const [suggestion, setSuggestion] = useState<StaffRoleSuggestion | null>(null);
  const { data: staff = [], isLoading } = useStaffList();
  const createStaffUser = useCreateStaffUser();
  const resetStaffPassword = useResetStaffPassword();
  const roleSuggestion = useStaffRoleSuggestion();

  const form = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: { full_name: '', email: '', cpf: '', role: undefined },
  });

  // Rastreado à parte de `form.formState.dirtyFields.role` de propósito -- esse campo do
  // RHF ficou resíduo=true entre convites (mesma instância de `form` reusada a cada abertura
  // do diálogo) mesmo depois de `form.reset()`, fazendo a sugestão do 2º convite em diante
  // nunca pré-preencher o Select. Flag própria, zerada explicitamente em `closeDialog`, é
  // determinística e não depende do proxy interno do RHF.
  const roleTouchedByUserRef = useRef(false);

  const closeDialog = () => {
    setDialogOpen(false);
    form.reset();
    setSuggestion(null);
    roleTouchedByUserRef.current = false;
  };

  const onCpfBlur = () => {
    const cpfDigits = form.getValues('cpf').replace(/\D/g, '');
    if (cpfDigits.length !== 11) return;
    roleSuggestion.mutate(cpfDigits, {
      onSuccess: (data) => {
        setSuggestion(data);
        // Só pré-preenche se a pessoa ainda não mexeu no Select à mão -- não
        // sobrescreve uma escolha manual já feita antes do blur do CPF.
        if (data.suggestedRole && !roleTouchedByUserRef.current) {
          form.setValue('role', data.suggestedRole, { shouldValidate: true });
        }
      },
    });
  };

  const onSubmit = async (data: StaffFormData) => {
    try {
      await createStaffUser.mutateAsync({
        full_name: data.full_name,
        email: data.email,
        cpf: data.cpf.replace(/\D/g, ''),
        role: data.role,
        suggested_role: suggestion?.suggestedRole ?? null,
      });
      toast({
        title: 'Membro criado',
        description: `Peça pra ${data.full_name} entrar com o e-mail dela nos dois campos (login e senha) no primeiro acesso.`,
      });
      closeDialog();
    } catch (error) {
      toast({
        title: 'Erro ao criar membro da equipe',
        description: error instanceof Error ? error.message : 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    }
  };

  const onResetPassword = async (memberId: string, memberName: string) => {
    try {
      await resetStaffPassword.mutateAsync(memberId);
      toast({
        title: 'Senha redefinida',
        description: `Peça pra ${memberName} entrar com o e-mail dela nos dois campos (login e senha).`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao resetar senha',
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
              Cadastre professores, coordenadores e secretários para acessar o sistema.
            </p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
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
                    <TableHead className="text-right">Ações</TableHead>
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
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" disabled={resetStaffPassword.isPending}>
                              <KeyRound className="w-3 h-3 mr-1" />Resetar senha
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Resetar senha de {member.full_name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Isso invalida a senha atual e exige que a pessoa defina uma nova no próximo login,
                                usando o e-mail dela ({member.email}) como senha temporária nos dois campos.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onResetPassword(member.id, member.full_name)}>
                                Resetar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar membro da equipe</DialogTitle>
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
                      <Input
                        placeholder="000.000.000-00"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setSuggestion(null);
                        }}
                        onBlur={() => {
                          field.onBlur();
                          onCpfBlur();
                        }}
                      />
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
                    <div className="flex items-center gap-2">
                      <FormLabel>Role *</FormLabel>
                      {suggestion?.suggestedRole && (
                        <Badge variant="secondary" className="text-xs font-normal">
                          sugerido pelo ERP
                        </Badge>
                      )}
                    </div>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        roleTouchedByUserRef.current = true;
                      }}
                      value={field.value}
                    >
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
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createStaffUser.isPending}>
                  {createStaffUser.isPending ? 'Criando...' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
