import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ClipboardList, Plus, Pencil, Trash2, Calendar, Filter } from 'lucide-react';
import { IconBadge } from '@/components/IconBadge';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

import { useAssessments, useAssessmentMutations, Assessment } from '@/hooks/useAssessments';
import { useClasses, useSubjects, useAcademicTerms } from '@/hooks/useAppQueries';
import { useAssessmentFeedback } from '@/hooks/useAI';
import { useOrganization } from '@/hooks/useOrganization';
import EmptyState from '@/components/EmptyState';
import { logger } from '@/lib/logger';
import { logAudit } from '@/lib/audit';
import { safeToast } from '@/lib/safeToast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { Bot } from 'lucide-react';
import { useIAAccess } from '@/hooks/useIAAccess';

const assessmentSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  date: z.date({ required_error: 'Data é obrigatória' }),
  weight: z.number().min(0.1, 'Peso mínimo é 0.1').max(5, 'Peso máximo é 5'),
  class_id: z.string().min(1, 'Turma é obrigatória'),
  subject_id: z.string().min(1, 'Disciplina é obrigatória'),
  term_id: z.string().min(1, 'Período de avaliação é obrigatório'),
  assessment_type: z.enum(['regular', 'recuperacao']),
  recovers_term_id: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.assessment_type === 'recuperacao' && !data.recovers_term_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Selecione o período que esta recuperação resgata',
      path: ['recovers_term_id'],
    });
  }
});

type AssessmentFormData = z.infer<typeof assessmentSchema>;

interface AIFeedback {
  grammar_score?: number;
  coherence_score?: number;
  overall_feedback?: string;
  suggestions?: string[];
}

export default function Avaliacoes() {
  const searchParams = new URLSearchParams(window.location.search);
  const openModal = searchParams.get('modal') === 'avaliacao';
  const action = searchParams.get('action');

  const [isModalOpen, setIsModalOpen] = useState(openModal);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [feedbackData, setFeedbackData] = useState<AIFeedback | null>(null);
  const [filters, setFilters] = useState({
    classId: '',
    subjectId: '',
    dateStart: '',
    dateEnd: '',
  });

  const { data: orgData } = useOrganization();
  const assessmentFeedback = useAssessmentFeedback();
  const navigate = useNavigate();
  const { canAccess } = useIAAccess();

  const { data: classes = [] } = useClasses();
  const { data: subjects = [] } = useSubjects();
  const { data: academicTerms = [] } = useAcademicTerms();
  const { data: assessments = [], isLoading } = useAssessments(filters);
  const mutations = useAssessmentMutations();

  const form = useForm<AssessmentFormData>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      weight: 1.0,
      assessment_type: 'regular',
    },
  });

  const assessmentType = form.watch('assessment_type');

  useEffect(() => {
    if (openModal && action === 'novo') {
      setIsModalOpen(true);
      setEditingAssessment(null);
      form.reset({ weight: 1.0, assessment_type: 'regular' });
    }
  }, [openModal, action, form]);

  const handleSubmit = (data: AssessmentFormData) => {
    const formattedData = {
      title: data.title,
      date: format(data.date, 'yyyy-MM-dd'),
      weight: data.weight,
      class_id: data.class_id,
      subject_id: data.subject_id,
      term_id: data.term_id,
      assessment_type: data.assessment_type,
      recovers_term_id: data.assessment_type === 'recuperacao' ? data.recovers_term_id : null,
    };

    if (editingAssessment) {
      mutations.update.mutate(
        { id: editingAssessment.id, data: formattedData },
        {
          onSuccess: () => {
            setIsModalOpen(false);
            setEditingAssessment(null);
            form.reset();
          },
        }
      );
    } else {
      mutations.create.mutate(formattedData, {
        onSuccess: () => {
          setIsModalOpen(false);
          form.reset({ weight: 1.0 });
        },
      });
    }
  };

  const handleEdit = (assessment: Assessment) => {
    setEditingAssessment(assessment);
    form.reset({
      title: assessment.title,
      date: new Date(assessment.date),
      weight: assessment.weight,
      class_id: assessment.class_id,
      subject_id: assessment.subject_id,
      term_id: assessment.term_id ?? '',
      assessment_type: (assessment.assessment_type as AssessmentFormData['assessment_type']) ?? 'regular',
      recovers_term_id: assessment.recovers_term_id ?? undefined,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (assessmentId: string) => {
    mutations.delete.mutate(assessmentId);
  };

  const clearFilters = () => {
    setFilters({
      classId: '',
      subjectId: '',
      dateStart: '',
      dateEnd: '',
    });
  };

  const handleAiCorrection = async (assessment: Assessment) => {
    if (!orgData?.organization_id) {
      safeToast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Organização não encontrada'
      });
      return;
    }

    logger.info('open_ai_feedback', { assessmentId: assessment.id });
    logAudit({ 
      table_name: 'ai_features', 
      action: 'open_ai_feedback', 
      diff: { assessmentId: assessment.id }, 
      organization_id: orgData.organization_id 
    });

    setSelectedAssessment(assessment);
    
    try {
      const sampleText = "Esta é uma redação de exemplo para demonstrar o sistema de correção automática. O aluno apresentou bom desenvolvimento das ideias principais, porém precisa melhorar a organização textual e a coesão entre os parágrafos.";
      
      const result = await assessmentFeedback.mutateAsync({
        assessment_id: assessment.id,
        student_id: 'sample-student-id', // Em produção, seria do student selecionado
        text_content: sampleText
      });
      
      setFeedbackData(result.ai_analysis);
      setAiModalOpen(true);
      
      logger.info('Feedback de IA gerado com sucesso', { 
        assessmentId: assessment.id,
        hasGrammarScore: !!result.ai_analysis?.grammar_score,
        hasCoherenceScore: !!result.ai_analysis?.coherence_score
      });
      
    } catch (error) {
      logger.error('Erro ao processar correção de IA', { 
        error,
        assessmentId: assessment.id 
      });
      
        safeToast({
          variant: 'destructive',
          title: 'Não foi possível processar',
          description: 'IA temporariamente indisponível, tente novamente mais tarde'
        });
    }
  };

  const handleOpenChatbot = () => {
    logger.info('open_chatbot_from_avaliacoes');
    if (orgData?.organization_id) {
      logAudit({ 
        table_name: 'ai_features', 
        action: 'open_chatbot', 
        diff: { from: '/app/academico/avaliacoes' }, 
        organization_id: orgData.organization_id 
      });
    }
    navigate('/app/crm/assistente');
  };

  if (!orgData?.organization_id) {
    return (
      <EmptyState
        title="Organização não encontrada"
        description="Selecione ou crie uma organização para gerenciar avaliações."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconBadge icon={ClipboardList} tone="info" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Avaliações</h1>
            <p className="text-muted-foreground">Gerencie as avaliações das turmas</p>
          </div>
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

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingAssessment(null);
              form.reset({ weight: 1.0, assessment_type: 'regular' });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Avaliação
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingAssessment ? 'Editar Avaliação' : 'Nova Avaliação'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Prova Bimestral" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="class_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Turma *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {classes.map((cls) => (
                              <SelectItem key={cls.id} value={cls.id}>
                                {cls.name} - {cls.grade}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subject_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Disciplina *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {subjects.map((subject) => (
                              <SelectItem key={subject.id} value={subject.id}>
                                {subject.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="term_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bimestre/Trimestre *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {academicTerms.map((term) => (
                              <SelectItem key={term.id} value={term.id}>
                                {term.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="assessment_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="regular">Regular</SelectItem>
                            <SelectItem value="recuperacao">Recuperação</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {assessmentType === 'recuperacao' && (
                  <FormField
                    control={form.control}
                    name="recovers_term_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recupera o período *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o período resgatado" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {academicTerms.map((term) => (
                              <SelectItem key={term.id} value={term.id}>
                                {term.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                {field.value ? (
                                  format(field.value, "PPP", { locale: ptBR })
                                ) : (
                                  <span>Selecione</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Peso</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            min="0.1"
                            max="5"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 1.0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    disabled={mutations.create.isPending || mutations.update.isPending}
                  >
                    {editingAssessment ? 'Atualizar' : 'Criar'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingAssessment(null);
                      form.reset();
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              value={filters.classId || "all"}
              onValueChange={(value) => setFilters(prev => ({ ...prev, classId: value === "all" ? "" : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as turmas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as turmas</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} - {cls.grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.subjectId || "all"}
              onValueChange={(value) => setFilters(prev => ({ ...prev, subjectId: value === "all" ? "" : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as disciplinas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as disciplinas</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="Data inicial"
              value={filters.dateStart}
              onChange={(e) => setFilters(prev => ({ ...prev, dateStart: e.target.value }))}
            />

            <Input
              type="date"
              placeholder="Data final"
              value={filters.dateEnd}
              onChange={(e) => setFilters(prev => ({ ...prev, dateEnd: e.target.value }))}
            />
          </div>
          
          {(filters.classId || filters.subjectId || filters.dateStart || filters.dateEnd) && (
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Avaliações */}
      <Card>
        <CardHeader>
          <CardTitle>Avaliações Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : assessments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma avaliação encontrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Peso</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Disciplina</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((assessment) => (
                  <TableRow key={assessment.id}>
                    <TableCell className="font-medium">{assessment.title}</TableCell>
                    <TableCell>
                      {format(new Date(assessment.date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{assessment.weight}</Badge>
                    </TableCell>
                    <TableCell>{assessment.classes?.name}</TableCell>
                    <TableCell>{assessment.subjects?.name}</TableCell>
                    <TableCell>
                      {academicTerms.find((t) => t.id === assessment.term_id)?.name || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={assessment.assessment_type === 'recuperacao' ? 'default' : 'outline'}>
                        {assessment.assessment_type === 'recuperacao' ? 'Recuperação' : 'Regular'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(assessment)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                         <TooltipProvider>
                           <Tooltip>
                             <TooltipTrigger asChild>
                               <Button
                                 size="sm"
                                 variant="outline"
                                 onClick={() => handleAiCorrection(assessment)}
                                 disabled={assessmentFeedback.isPending || !canAccess('feedback')}
                                 className="bg-sky-50 hover:bg-sky-100 border-sky-200"
                               >
                                 <ClipboardList className="h-3 w-3" />
                               </Button>
                             </TooltipTrigger>
                             <TooltipContent>
                               <p>{canAccess('feedback') ? 'Correção com IA' : 'Recurso desabilitado'}</p>
                             </TooltipContent>
                           </Tooltip>
                         </TooltipProvider>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(assessment.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Feedback de IA */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Feedback da IA - {selectedAssessment?.title}</DialogTitle>
          </DialogHeader>
          {feedbackData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Gramática</label>
                  <div className="text-2xl font-bold text-sky-600">
                    {feedbackData.grammar_score?.toFixed(1) || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Coerência</label>
                  <div className="text-2xl font-bold text-emerald-600">
                    {feedbackData.coherence_score?.toFixed(1) || 'N/A'}
                  </div>
                </div>
              </div>
              
              {feedbackData.overall_feedback && (
                <div>
                  <label className="text-sm font-medium">Resumo Geral</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {feedbackData.overall_feedback}
                  </p>
                </div>
              )}
              
              {feedbackData.suggestions && feedbackData.suggestions.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Sugestões</label>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                    {feedbackData.suggestions.map((suggestion: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-sky-500">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <Button 
                onClick={() => setAiModalOpen(false)} 
                className="w-full"
              >
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}