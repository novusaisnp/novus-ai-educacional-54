import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Upload } from 'lucide-react';
import { getSignedUrl } from '@/lib/storage';
import { useQuery } from '@tanstack/react-query';
import { DocumentRecord } from '@/lib/storage';

interface StudentAvatarProps {
  studentName: string;
  avatar?: DocumentRecord;
  onUpload: (file: File) => void;
  isUploading: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StudentAvatar({ 
  studentName, 
  avatar, 
  onUpload, 
  isUploading,
  size = 'md' 
}: StudentAvatarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Query para gerar signed URL do avatar
  const { data: avatarUrl } = useQuery({
    queryKey: ['avatarUrl', avatar?.id],
    queryFn: async () => {
      if (!avatar) return null;
      
      const [bucket, ...pathParts] = avatar.file_path.split('/');
      const path = pathParts.join('/');
      
      return getSignedUrl(bucket, path, 3600);
    },
    enabled: !!avatar,
    staleTime: 30 * 60 * 1000, // 30 minutos
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas arquivos de imagem.');
        return;
      }
      
      // Validar tamanho (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('O arquivo deve ter no máximo 5MB.');
        return;
      }
      
      onUpload(file);
    }
    
    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-24 w-24',
    lg: 'h-32 w-32'
  };

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="relative">
        <Avatar className={sizeClasses[size]}>
          <AvatarImage 
            src={avatarUrl || undefined} 
            alt={`Avatar de ${studentName}`}
          />
          <AvatarFallback className="text-lg font-medium">
            {getInitials(studentName)}
          </AvatarFallback>
        </Avatar>
        
        {/* Botão de câmera sobreposto */}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
          onClick={openFileDialog}
          disabled={isUploading}
        >
          {isUploading ? (
            <Upload className="h-3 w-3 animate-spin" />
          ) : (
            <Camera className="h-3 w-3" />
          )}
        </Button>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={openFileDialog}
        disabled={isUploading}
      >
        {isUploading ? 'Enviando...' : 'Trocar Foto'}
      </Button>
    </div>
  );
}