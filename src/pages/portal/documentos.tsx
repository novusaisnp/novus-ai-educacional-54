
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from '@/hooks/usePortalAuth';
import { PortalPageHeader } from '@/components/portal/PortalPageHeader';
import { PortalSection } from '@/components/portal/PortalSection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Download, FileText, Search } from 'lucide-react';
import { logAuditSafe } from '@/utils/auditSafe';
import { useToast } from '@/hooks/use-toast';

export default function PortalDocumentos() {
  const { guardian } = usePortalAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['portal-documents', guardian?.id],
    queryFn: async () => {
      if (!guardian?.id) return [];

      // Get students of this guardian
      const { data: students } = await supabase
        .from('student_guardians')
        .select('student_id')
        .eq('guardian_id', guardian.id);

      if (!students?.length) return [];

      const studentIds = students.map(s => s.student_id);

      // Get documents for these students
      const { data, error } = await supabase
        .from('documents')
        .select(`
          id,
          title,
          file_path,
          created_at,
          students!inner(id, name)
        `)
        .in('student_id', studentIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!guardian?.id,
  });

  const handleDownload = async (doc: any) => {
    try {
      // Log download audit
      await logAuditSafe('portal_download', {
        docId: doc.id,
        studentId: doc.students.id,
        source: 'portal',
        pathname: window.location.pathname,
      });

      // Get signed URL for download
      const { data, error } = await supabase.storage
        .from('docs')
        .createSignedUrl(doc.file_path, 300); // 5 minutes

      if (error) throw error;

      // Trigger download
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = doc.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Download iniciado',
        description: `Baixando: ${doc.title}`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro no download',
        description: 'Não foi possível baixar o documento.',
        variant: 'destructive',
      });
    }
  };

  const filteredDocuments = documents?.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.students.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <PortalPageHeader 
        title="Documentos" 
        description="Acesse e baixe documentos dos seus filhos"
      />

      <PortalSection>
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar documentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Documents List */}
          {isLoading ? (
            <div className="text-center py-8">Carregando documentos...</div>
          ) : filteredDocuments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum documento encontrado</h3>
                <p className="text-muted-foreground">
                  {searchTerm 
                    ? 'Tente ajustar os termos de busca.' 
                    : 'Documentos aparecerão aqui quando disponibilizados pela escola.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredDocuments.map((doc) => (
                <Card key={doc.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{doc.title}</CardTitle>
                        <CardDescription>
                          Aluno: {doc.students.name} • {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleDownload(doc)}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Baixar
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      </PortalSection>
    </div>
  );
}
