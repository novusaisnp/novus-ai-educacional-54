
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PortalPageHeader from '@/components/portal/PortalPageHeader';
import { Download, FileText, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface Document {
  id: string;
  title: string;
  file_path: string;
  created_at: string;
  student?: {
    name: string;
  };
}

export default function PortalDocumentos() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { data: documents = [], isLoading, error } = useQuery({
    queryKey: ['portal-documents'],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('documents')
        .select(`
          id,
          title,
          file_path,
          created_at,
          students (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
        throw error;
      }

      return (data || []).map(doc => ({
        ...doc,
        student: Array.isArray(doc.students) && doc.students.length > 0 
          ? { name: doc.students[0].name } 
          : undefined
      })) as Document[];
    }
  });

  const handleDownload = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('docs')
        .download(document.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Download iniciado com sucesso!');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Erro ao baixar documento');
    }
  };

  const categories = [
    { id: 'all', label: 'Todos os documentos' },
    { id: 'academic', label: 'Acadêmicos' },
    { id: 'financial', label: 'Financeiros' },
    { id: 'administrative', label: 'Administrativos' }
  ];

  if (error) {
    return (
      <div className="p-6">
        <PortalPageHeader 
          title="Documentos" 
          description="Acesse seus documentos acadêmicos e administrativos"
        />
        <Card className="mt-6">
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Erro ao carregar documentos. Tente novamente mais tarde.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PortalPageHeader 
        title="Documentos" 
        description="Acesse seus documentos acadêmicos e administrativos"
      />

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.label}
          </Button>
        ))}
      </div>

      {/* Documents grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum documento encontrado</h3>
            <p className="text-muted-foreground">
              Seus documentos aparecerão aqui quando estiverem disponíveis.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((document) => (
            <Card key={document.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-start justify-between text-sm">
                  <span className="line-clamp-2">{document.title}</span>
                  <Badge variant="outline" className="ml-2 shrink-0">
                    PDF
                  </Badge>
                </CardTitle>
                <div className="text-xs text-muted-foreground space-y-1">
                  {document.student && (
                    <p>Aluno: {document.student.name}</p>
                  )}
                  <p>
                    {new Date(document.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleDownload(document)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Baixar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDownload(document)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
