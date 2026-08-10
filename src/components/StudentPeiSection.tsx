import { useState } from 'react';
import { Plus, HeartHandshake, Eye, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useStudentPei, useUpsertStudentPei, type StudentPei } from '@/hooks/useStudentPei';
import { useUserRole } from '@/hooks/useUserRole';
import { useDocuments } from '@/hooks/useDocuments';
import { getSignedUrl } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

interface StudentPeiSectionProps {
  studentId: string;
}

// Radix Select proíbe value="" (crashou SubmodalTurmas.tsx antes, ver STATUS.md) — sentinela pra "sem laudo".
const NO_LAUDO = '__none__';

const emptyForm = {
  diagnosis: '',
  needs: '',
  goals: '',
  accommodations: '',
  responsibleProfessional: '',
  status: 'ativo' as 'ativo' | 'encerrado',
  startDate: new Date().toISOString().slice(0, 10),
  reviewDate: '',
  laudoDocumentId: NO_LAUDO,
};

export function StudentPeiSection({ studentId }: StudentPeiSectionProps) {
  const { data: role } = useUserRole();
  const canManage = role === 'admin' || role === 'coordenacao';

  const { data: peiList = [], isLoading } = useStudentPei(studentId);
  const upsertPei = useUpsertStudentPei();
  const { attachments } = useDocuments(studentId);
  const { toast } = useToast();

  const openLaudo = async (filePath: string) => {
    try {
      const [bucket, ...pathParts] = filePath.split('/');
      const url = await getSignedUrl(bucket, pathParts.join('/'), 3600);
      window.open(url, '_blank');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao abrir laudo',
        description: (error as Error).message,
      });
    }
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const current = peiList.find((p) => p.status === 'ativo') ?? peiList[0] ?? null;

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (pei: StudentPei) => {
    setEditingId(pei.id);
    setForm({
      diagnosis: pei.diagnosis ?? '',
      needs: pei.needs ?? '',
      goals: pei.goals ?? '',
      accommodations: pei.accommodations.join(', '),
      responsibleProfessional: pei.responsible_professional ?? '',
      status: pei.status,
      startDate: pei.start_date,
      reviewDate: pei.review_date ?? '',
      laudoDocumentId: pei.laudo_document_id ?? NO_LAUDO,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    upsertPei.mutate(
      {
        id: editingId ?? undefined,
        studentId,
        diagnosis: form.diagnosis || null,
        needs: form.needs || null,
        goals: form.goals || null,
        accommodations: form.accommodations
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        responsibleProfessional: form.responsibleProfessional || null,
        status: form.status,
        startDate: form.startDate,
        reviewDate: form.reviewDate || null,
        laudoDocumentId: form.laudoDocumentId === NO_LAUDO ? null : form.laudoDocumentId,
      },
      { onSuccess: () => setDialogOpen(false) }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <HeartHandshake className="h-4 w-4" />
          PEI (Plano Educacional Individualizado)
        </h3>
        {canManage && (
          <Button size="sm" variant="outline" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            {current ? 'Novo registro' : 'Criar PEI'}
          </Button>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {!isLoading && !current && (
        <p className="text-sm text-muted-foreground">Nenhum PEI registrado para este aluno.</p>
      )}

      {current && (
        <div
          className="rounded-md border p-3 space-y-2 cursor-pointer hover:bg-accent/50"
          onClick={() => canManage && openEdit(current)}
        >
          <div className="flex items-center justify-between">
            <Badge variant={current.status === 'ativo' ? 'default' : 'secondary'}>
              {current.status === 'ativo' ? 'Ativo' : 'Encerrado'}
            </Badge>
            {current.review_date && (
              <span className="text-xs text-muted-foreground">
                Próxima revisão: {new Date(current.review_date + 'T00:00:00').toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
          {current.needs && <p className="text-sm"><strong>Necessidades:</strong> {current.needs}</p>}
          {current.goals && <p className="text-sm"><strong>Metas:</strong> {current.goals}</p>}
          {current.accommodations.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {current.accommodations.map((item) => (
                <Badge key={item} variant="outline">{item}</Badge>
              ))}
            </div>
          )}
          {current.responsible_professional && (
            <p className="text-xs text-muted-foreground">
              Responsável: {current.responsible_professional}
            </p>
          )}
          {current.laudo_document_id && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                const doc = attachments.find((a) => a.id === current.laudo_document_id);
                if (doc) openLaudo(doc.file_path);
              }}
            >
              <Eye className="h-3 w-3 mr-1" />
              {attachments.find((a) => a.id === current.laudo_document_id)?.title ?? 'Ver laudo'}
            </Button>
          )}
        </div>
      )}

      {peiList.length > 1 && (
        <p className="text-xs text-muted-foreground">
          + {peiList.length - 1} registro(s) anterior(es) no histórico.
        </p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar PEI' : 'Novo PEI'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Diagnóstico</Label>
              <Textarea
                value={form.diagnosis}
                onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                placeholder="Ex.: TEA nível 1, TDAH..."
              />
            </div>
            <div className="space-y-2">
              <Label>Necessidades</Label>
              <Textarea
                value={form.needs}
                onChange={(e) => setForm({ ...form, needs: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Metas</Label>
              <Textarea
                value={form.goals}
                onChange={(e) => setForm({ ...form, goals: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Adaptações (separadas por vírgula)</Label>
              <Textarea
                value={form.accommodations}
                onChange={(e) => setForm({ ...form, accommodations: e.target.value })}
                placeholder="Ex.: tempo extra em provas, material ampliado"
              />
            </div>
            <div className="space-y-2">
              <Label>Profissional responsável</Label>
              <Input
                value={form.responsibleProfessional}
                onChange={(e) => setForm({ ...form, responsibleProfessional: e.target.value })}
                placeholder="Nome (pode ser profissional externo)"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Início</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Próxima revisão</Label>
                <Input
                  type="date"
                  value={form.reviewDate}
                  onChange={(e) => setForm({ ...form, reviewDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Laudo (documento anexado do aluno)</Label>
              <Select
                value={form.laudoDocumentId}
                onValueChange={(v) => setForm({ ...form, laudoDocumentId: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_LAUDO}>Nenhum laudo vinculado</SelectItem>
                  {attachments.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {doc.title}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {attachments.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum documento anexado ainda — anexe o laudo na seção Documentos do aluno primeiro.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as 'ativo' | 'encerrado' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="encerrado">Encerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={upsertPei.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
