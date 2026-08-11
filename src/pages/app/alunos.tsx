
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, User, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StudentAvatar } from '@/components/StudentAvatar';
import { StudentAttachments } from '@/components/StudentAttachments';
import { StudentPeiSection } from '@/components/StudentPeiSection';
import { useDocuments, useStudentAvatars } from '@/hooks/useDocuments';
import { useOrganization } from '@/hooks/useOrganization';
import { SubmodalAlunos, LinkedGuardian } from '@/features/secretaria/alunos/SubmodalAlunos';
import { ModalMestre } from '@/features/secretaria/hub/ModalMestre';
import { FormEntidade } from '@/features/secretaria/entidades/FormEntidade';
import { useRiscoEvasao, useRiskAnalysis } from '@/hooks/useAI';
import { RiskBadge } from '@/components/RiskBadge';
import EmptyState from '@/components/EmptyState';
import { Bot, Activity } from 'lucide-react';
import { logger } from '@/lib/logger';
import { logAudit } from '@/lib/audit/logAudit';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { useIAAccess } from '@/hooks/useIAAccess';
import type { StudentRow } from '@/integrations/supabase/db-types';

type StudentWithEnrollments = StudentRow & {
  enrollments: { status: string; classes: { name: string; year: number } | null }[];
};

export default function Alunos() {
  const [searchParams] = useSearchParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentWithEnrollments | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithEnrollments | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('modal') === 'alunos');
  const [showRiskOnly, setShowRiskOnly] = useState(false);
  const [editingGuardianFromStudent, setEditingGuardianFromStudent] = useState<LinkedGuardian | null>(null);
  const [isGuardianModalOpen, setIsGuardianModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const riskAnalysis = useRiskAnalysis();
  const { canAccess, getAccessStatus } = useIAAccess();
  const {
    avatar: selectedStudentAvatar,
    attachments: selectedStudentAttachments,
    uploadAvatarMutation,
    uploadDocMutation,
    deleteDocMutation,
  } = useDocuments(selectedStudent?.id);

  // Hook para obter organização do usuário
  const { data: orgData, isLoading: isLoadingOrg } = useOrganization();
  
  // Hook para risco de evasão
  const { data: riscoEvasao, isLoading: isLoadingRisco, error: errorRisco } = useRiscoEvasao();

  // Query para listar alunos
  const { data: students, isLoading } = useQuery({
    queryKey: ['students.list', orgData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          enrollments(
            status,
            classes(name, year)
          )
        `)
        .eq('status', 'ativo')
        .order('first_name');

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar alunos',
          description: error.message,
        });
        throw error;
      }

      return data;
    },
    enabled: !!orgData?.organization_id,
  });

  const { data: avatarUrlByStudentId = {} } = useStudentAvatars((students || []).map((s) => s.id));

  // Mutation para deletar aluno
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('students')
        .update({ status: 'inativo' })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students.list'] });
      toast({
        title: 'Aluno removido',
        description: 'Aluno foi marcado como inativo.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover aluno',
        description: error.message,
      });
    },
  });

  const handleEdit = (student: StudentWithEnrollments) => {
    setEditingStudent(student);
    setIsCreateOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover este aluno?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleStudentClick = (student: StudentWithEnrollments) => {
    setSelectedStudent(student);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ['students.list'] });
  };

  const handleOpenChatbot = () => {
    logger.info('open_chatbot_from_alunos');
    if (orgData?.organization_id) {
      logAudit({ 
        table_name: 'ai_features', 
        action: 'open_chatbot', 
        diff: { from: '/app/alunos' }, 
        organization_id: orgData.organization_id 
      });
    }
    navigate('/app/crm/assistente');
  };

  const handleUpdateRiskAnalysis = () => {
    riskAnalysis.mutate({ model_type: 'evasao' }, {
      onSuccess: () => {
        toast({
          title: 'Análise de risco atualizada',
          description: 'A análise de risco foi recalculada com sucesso.'
        });
        logger.info('run_risk_analysis');
        if (orgData?.organization_id) {
          logAudit({ 
            table_name: 'ai_features', 
            action: 'run_risk_analysis', 
            diff: { scope: 'evasao' }, 
            organization_id: orgData.organization_id 
          });
        }
      },
      onError: () => {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'IA temporariamente indisponível, tente novamente mais tarde'
        });
        logger.error('Erro ao executar análise de risco');
      }
    });
  };

  const handleToggleRiskFilter = (isRiskFilter: boolean) => {
    setShowRiskOnly(isRiskFilter);
    logger.info('open_risk_panel');
    if (orgData?.organization_id) {
      logAudit({ 
        table_name: 'ai_features', 
        action: 'open_risk_panel', 
        diff: { risco: '>0.6' }, 
        organization_id: orgData.organization_id 
      });
    }
  };

  // Context para o submodal
  const modalContext = {
    orgId: orgData?.organization_id || '',
    onSaved: () => {
      queryClient.invalidateQueries({ queryKey: ['students.list'] });
      setIsCreateOpen(false);
      setEditingStudent(null);
    },
    onClose: () => {
      setIsCreateOpen(false);
      setEditingStudent(null);
    },
  };

  if (isLoadingOrg) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg">Carregando...</div>
        </div>
      </div>
    );
  }

  if (!orgData?.organization_id) {
    return (
      <EmptyState
        title="Organização não encontrada"
        description="Selecione ou crie uma organização para visualizar os alunos."
      />
    );
  }

  const getRiskScore = (studentId: string) => {
    if (errorRisco) {
      logger.error('Erro ao carregar risco de evasão', { error: errorRisco });
      return null;
    }
    return riscoEvasao?.find(r => r.id === studentId)?.risco_score || null;
  };

  const filteredStudents = showRiskOnly 
    ? students?.filter(student => {
        const riskScore = getRiskScore(student.id);
        return riskScore && riskScore > 0.6;
      }) || []
    : students || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alunos</h1>
          <p className="text-muted-foreground">Gerenciar alunos da instituição</p>
        </div>

        <div className="flex gap-2">
          {canAccess('chatbot') && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={handleOpenChatbot}>
                    <Bot className="mr-2 h-4 w-4" />
                    Assistente IA
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Abrir Assistente IA</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {canAccess('risco') && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    onClick={handleUpdateRiskAnalysis}
                    disabled={riskAnalysis.isPending}
                  >
                    <Activity className="mr-2 h-4 w-4" />
                    {riskAnalysis.isPending ? 'Analisando...' : 'Atualizar Risco (IA)'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Atualizar análise de risco (IA)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingStudent(null);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Aluno
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingStudent ? 'Editar Aluno' : 'Novo Aluno'}
              </DialogTitle>
            </DialogHeader>
            <SubmodalAlunos
              context={modalContext}
              editingStudent={editingStudent}
              onEditingChange={(student) => setEditingStudent(student as StudentWithEnrollments | null)}
              onEditGuardian={(guardian) => {
                setIsCreateOpen(false);
                setEditingGuardianFromStudent(guardian);
                setIsGuardianModalOpen(true);
              }}
            />
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Filtros */}
      {canAccess('risco') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button
                variant={showRiskOnly ? "default" : "outline"}
                onClick={() => handleToggleRiskFilter(!showRiskOnly)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Alunos em risco
              </Button>
              {errorRisco && (
                <div className="text-sm text-destructive">
                  Erro ao carregar dados de risco: sistema de análise indisponível
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de alunos */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Alunos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Data de Nascimento</TableHead>
                    <TableHead>Turma</TableHead>
                    {canAccess('risco') && <TableHead>Risco de Evasão</TableHead>}
                    <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => {
                  const riskScore = getRiskScore(student.id);
                  return (
                  <TableRow 
                    key={student.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleStudentClick(student)}
                  >
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={avatarUrlByStudentId[student.id] || `https://api.dicebear.com/7.x/initials/svg?seed=${student.first_name} ${student.last_name}`}
                          />
                          <AvatarFallback>
                            {student.first_name?.[0]}{student.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {student.first_name} {student.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ID: {student.document_id || 'Não informado'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{student.document_id || '-'}</TableCell>
                    <TableCell>
                      {student.birth_date ? new Date(student.birth_date).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell>
                      {student.enrollments?.[0]?.classes ? (
                        <>
                          {student.enrollments[0].classes.name} ({student.enrollments[0].classes.year})
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sem matrícula</span>
                      )}
                    </TableCell>
                    {canAccess('risco') && (
                      <TableCell>
                        {riskScore !== null ? (
                          <RiskBadge score={riskScore} />
                        ) : isLoadingRisco ? (
                          <Badge variant="outline">Calculando...</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            N/A
                          </Badge>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      {student.enrollments?.[0] ? (
                        <Badge variant={student.enrollments[0].status === 'ativa' ? 'default' : 'secondary'}>
                          {student.enrollments[0].status === 'ativa' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Sem matrícula</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(student);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(student.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalhes do aluno */}
      {selectedStudent && (
        <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-3">
                <User className="h-5 w-5" />
                <span>{selectedStudent.first_name} {selectedStudent.last_name}</span>
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Informações Pessoais</h3>
                <div className="space-y-2">
                  <p><strong>Nome:</strong> {selectedStudent.first_name} {selectedStudent.last_name}</p>
                  <p><strong>Data de Nascimento:</strong> {selectedStudent.birth_date ? new Date(selectedStudent.birth_date).toLocaleDateString('pt-BR') : 'Não informada'}</p>
                  <p><strong>Documento:</strong> {selectedStudent.document_id || 'Não informado'}</p>
                  <p><strong>Gênero:</strong> {selectedStudent.gender || 'Não informado'}</p>
                  <p><strong>Status:</strong> {selectedStudent.status}</p>
                </div>
                
                <div className="pt-4">
                  <h4 className="font-medium mb-2">Avatar</h4>
                  <StudentAvatar
                    studentName={`${selectedStudent.first_name} ${selectedStudent.last_name}`}
                    avatar={selectedStudentAvatar}
                    onUpload={(file) => uploadAvatarMutation.mutate(file)}
                    isUploading={uploadAvatarMutation.isPending}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Documentos</h3>
                <StudentAttachments
                  attachments={selectedStudentAttachments}
                  onUpload={(file) => uploadDocMutation.mutate(file)}
                  onDelete={(doc) => deleteDocMutation.mutate(doc)}
                  isUploading={uploadDocMutation.isPending}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <StudentPeiSection studentId={selectedStudent.id} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <ModalMestre
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        defaultTab="alunos"
      />

      <Dialog
        open={isGuardianModalOpen}
        onOpenChange={(open) => {
          if (open) return;
          setIsGuardianModalOpen(false);
          setEditingGuardianFromStudent(null);
          queryClient.invalidateQueries({ queryKey: ['students.list'] });
          queryClient.invalidateQueries({ queryKey: ['student-guardians'] });
        }}
      >
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Responsável</DialogTitle>
          </DialogHeader>
          {orgData?.organization_id && (
            <FormEntidade
              orgId={orgData.organization_id}
              entidadeId={editingGuardianFromStudent?.id ?? null}
              papelInicial="RESPONSAVEL"
              onSaved={() => {
                setIsGuardianModalOpen(false);
                setEditingGuardianFromStudent(null);
                queryClient.invalidateQueries({ queryKey: ['students.list'] });
                queryClient.invalidateQueries({ queryKey: ['student-guardians'] });
              }}
              onCancel={() => {
                setIsGuardianModalOpen(false);
                setEditingGuardianFromStudent(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
