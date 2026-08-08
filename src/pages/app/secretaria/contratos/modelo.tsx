import { useState } from 'react';
import { FileSignature, CheckCircle2 } from 'lucide-react';
import { IconBadge } from '@/components/IconBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  useContractTemplates,
  useUpsertContractTemplate,
  useActivateContractTemplate,
  type ContractTemplate,
} from '@/hooks/useContractTemplates';
import { DEFAULT_TEMPLATE_BODY, renderContractText } from '@/features/secretaria/lib/enrollmentContractTemplate';

const PREVIEW_SAMPLE_DATA = {
  organizationName: 'Escola Exemplo',
  studentName: 'Aluno de Exemplo',
  studentBirthDate: '2015-03-10',
  guardianName: 'Responsável de Exemplo',
  guardianCpf: '12345678900',
  className: 'Turma A - 2026',
  monthlyFeeAmount: 850,
  dueDay: 10,
  enrollmentDate: new Date().toISOString().split('T')[0],
};

export default function ModeloContrato() {
  const { toast } = useToast();
  const { data: templates = [], isLoading } = useContractTemplates();
  const upsertMutation = useUpsertContractTemplate();
  const activateMutation = useActivateContractTemplate();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [versionLabel, setVersionLabel] = useState('');
  const [body, setBody] = useState(DEFAULT_TEMPLATE_BODY);

  const startNew = () => {
    setEditingId(null);
    setVersionLabel('');
    setBody(DEFAULT_TEMPLATE_BODY);
  };

  const startEdit = (template: ContractTemplate) => {
    setEditingId(template.id);
    setVersionLabel(template.version_label);
    setBody(template.body);
  };

  const handleSave = () => {
    if (!versionLabel.trim()) {
      toast({ variant: 'destructive', title: 'Informe um nome para a versão' });
      return;
    }
    upsertMutation.mutate(
      { id: editingId || undefined, version_label: versionLabel, body },
      {
        onSuccess: () => {
          toast({ title: editingId ? 'Modelo atualizado' : 'Modelo criado' });
          if (!editingId) startNew();
        },
        onError: (error: Error) => {
          toast({ variant: 'destructive', title: 'Erro ao salvar modelo', description: error.message });
        },
      }
    );
  };

  const handleActivate = (templateId: string) => {
    activateMutation.mutate(templateId, {
      onSuccess: () => toast({ title: 'Versão ativada', description: 'Esta versão passa a ser usada nas próximas assinaturas de matrícula.' }),
      onError: (error: Error) => {
        toast({ variant: 'destructive', title: 'Erro ao ativar versão', description: error.message });
      },
    });
  };

  const previewText = renderContractText(body, PREVIEW_SAMPLE_DATA);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <IconBadge icon={FileSignature} tone="info" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Modelo de Contrato de Matrícula</h1>
          <p className="text-muted-foreground">
            Edite o texto usado na assinatura eletrônica de matrícula, sem depender de atualização do sistema.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Versões cadastradas</CardTitle>
            <CardDescription>Somente uma versão pode estar ativa por vez.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum modelo cadastrado ainda — o texto padrão abaixo será usado até que uma versão seja criada e ativada.
              </p>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{template.version_label}</span>
                      {template.is_active && (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Ativo
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Atualizado em {new Date(template.updated_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => startEdit(template)}>
                      Editar
                    </Button>
                    {!template.is_active && (
                      <Button
                        size="sm"
                        onClick={() => handleActivate(template.id)}
                        disabled={activateMutation.isPending}
                      >
                        Ativar
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}

            <Separator />

            <Button variant="outline" onClick={startNew} className="w-full">
              + Nova versão
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar versão' : 'Nova versão'}</CardTitle>
            <CardDescription>
              Placeholders disponíveis: <code>{'{{organizacao}}'}</code>, <code>{'{{responsavel}}'}</code>,{' '}
              <code>{'{{responsavel_cpf}}'}</code>, <code>{'{{aluno}}'}</code>, <code>{'{{aluno_nascimento}}'}</code>,{' '}
              <code>{'{{turma}}'}</code>, <code>{'{{data_matricula}}'}</code>, <code>{'{{valor_mensalidade}}'}</code>,{' '}
              <code>{'{{dia_vencimento}}'}</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Nome da versão (ex: Modelo 2026 v2)"
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
            />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={16}
              className="font-mono text-sm"
            />
            <Button onClick={handleSave} disabled={upsertMutation.isPending} className="w-full">
              {upsertMutation.isPending ? 'Salvando...' : 'Salvar modelo'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pré-visualização</CardTitle>
          <CardDescription>Com dados de exemplo, para conferir o texto final gerado.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 border rounded-md p-4">
            <pre className="whitespace-pre-wrap text-sm font-sans">{previewText}</pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
