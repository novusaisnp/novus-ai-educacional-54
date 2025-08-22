import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Paperclip, 
  Download, 
  Trash2, 
  MoreVertical, 
  Search,
  Upload,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { DocumentRecord, getSignedUrl, getFileTypeFromPath } from '@/lib/storage';
import { useQuery } from '@tanstack/react-query';

interface StudentAttachmentsProps {
  attachments: DocumentRecord[];
  onUpload: (file: File) => void;
  onDelete: (doc: DocumentRecord) => void;
  isUploading: boolean;
}

export function StudentAttachments({ 
  attachments, 
  onUpload, 
  onDelete,
  isUploading 
}: StudentAttachmentsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deleteDoc, setDeleteDoc] = useState<DocumentRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtrar anexos
  const filteredAttachments = attachments.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
    const docType = getFileTypeFromPath(doc.file_path);
    const matchesType = typeFilter === 'all' || 
      (typeFilter === 'image' && docType === 'Imagem') ||
      (typeFilter === 'pdf' && docType === 'PDF') ||
      (typeFilter === 'other' && !['Imagem', 'PDF'].includes(docType));
    
    return matchesSearch && matchesType;
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach(file => {
      // Validar tipo de arquivo
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert(`Arquivo ${file.name} não é um tipo suportado. Use PDF ou imagens.`);
        return;
      }
      
      // Validar tamanho (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`Arquivo ${file.name} deve ter no máximo 10MB.`);
        return;
      }
      
      onUpload(file);
    });
    
    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (doc: DocumentRecord) => {
    try {
      const [bucket, ...pathParts] = doc.file_path.split('/');
      const path = pathParts.join('/');
      
      const url = await getSignedUrl(bucket, path, 300); // 5 minutos
      
      // Abrir em nova aba
      window.open(url, '_blank');
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      alert('Erro ao baixar arquivo. Tente novamente.');
    }
  };

  const getFileIcon = (filePath: string) => {
    const type = getFileTypeFromPath(filePath);
    
    switch (type) {
      case 'Imagem':
        return <ImageIcon className="h-4 w-4 text-blue-500" />;
      case 'PDF':
        return <FileText className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">Anexos de Matrícula</CardTitle>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Upload className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4 mr-2" />
            )}
            {isUploading ? 'Enviando...' : 'Anexar Arquivo'}
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome do arquivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {typeFilter === 'all' ? 'Todos os tipos' :
                 typeFilter === 'image' ? 'Imagens' :
                 typeFilter === 'pdf' ? 'PDFs' : 'Outros'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setTypeFilter('all')}>
                Todos os tipos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter('image')}>
                Imagens
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter('pdf')}>
                PDFs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter('other')}>
                Outros
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tabela de anexos */}
        {filteredAttachments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm || typeFilter !== 'all' 
              ? 'Nenhum anexo encontrado com os filtros aplicados.' 
              : 'Nenhum anexo encontrado. Use o botão "Anexar Arquivo" para adicionar documentos.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttachments.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    {getFileIcon(doc.file_path)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {doc.title}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getFileTypeFromPath(doc.file_path)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(doc.created_at), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleDownload(doc)}>
                          <Download className="h-4 w-4 mr-2" />
                          Baixar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeleteDoc(doc)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o arquivo "{deleteDoc?.title}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteDoc) {
                  onDelete(deleteDoc);
                  setDeleteDoc(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}