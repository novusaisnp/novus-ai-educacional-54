import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getSignedUrl } from '@/lib/storage';
import { issueBoletim, issueHistorico, type IssueBoletimInput, type IssueHistoricoInput } from '@/features/academico/lib/issueAcademicReports';

async function openGeneratedPdf(storagePath: string) {
  const url = await getSignedUrl('docs', storagePath);
  window.open(url, '_blank', 'noopener,noreferrer');
}

export const useIssueBoletim = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: IssueBoletimInput) => issueBoletim(input),
    onSuccess: async (result) => {
      toast({ title: 'Boletim gerado', description: 'O PDF foi anexado aos documentos do aluno.' });
      await openGeneratedPdf(result.storagePath);
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Erro ao gerar boletim', description: error.message });
    },
  });
};

export const useIssueHistorico = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: IssueHistoricoInput) => issueHistorico(input),
    onSuccess: async (result) => {
      toast({ title: 'Histórico escolar gerado', description: 'O PDF foi anexado aos documentos do aluno.' });
      await openGeneratedPdf(result.storagePath);
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Erro ao gerar histórico', description: error.message });
    },
  });
};
