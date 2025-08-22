import { memo } from 'react';
import { Save, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ToolbarProps {
  onSave: () => void;
  onExportCsv: () => void;
  onPrint: () => void;
  isSaving: boolean;
  selectedClass?: { name: string; grade: string };
  selectedSubject?: { name: string };
}

export const Toolbar = memo(({ 
  onSave, 
  onExportCsv, 
  onPrint, 
  isSaving, 
  selectedClass, 
  selectedSubject 
}: ToolbarProps) => {
  return (
    <>
      {/* Toolbar para tela */}
      <div className="flex items-center justify-between no-print">
        <div>
          {selectedClass && (
            <p className="text-sm text-muted-foreground">
              Turma: {selectedClass.name} - {selectedClass.grade}
              {selectedSubject && ` | Disciplina: ${selectedSubject.name}`}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={onSave}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Alterações
          </Button>
          <Button variant="outline" onClick={onExportCsv}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button variant="outline" onClick={onPrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Cabeçalho para impressão */}
      <div className="hidden print:block mb-4">
        <h2 className="text-lg font-bold">Lançamento de Notas</h2>
        {selectedClass && (
          <p className="text-sm">
            Turma: {selectedClass.name} - {selectedClass.grade}
            {selectedSubject && ` | Disciplina: ${selectedSubject.name}`}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Gerado em: {new Date().toLocaleString('pt-BR')}
        </p>
      </div>
    </>
  );
});

Toolbar.displayName = 'Toolbar';