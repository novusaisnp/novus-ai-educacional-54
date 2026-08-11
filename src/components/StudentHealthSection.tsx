import { useEffect, useState } from 'react';
import { HeartPulse, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  useStudentHealthRecord,
  useUpsertStudentHealthRecord,
  type StudentHealthRecord,
} from '@/hooks/useStudentHealthRecord';
import { useUserRole } from '@/hooks/useUserRole';

interface StudentHealthSectionProps {
  studentId: string;
}

const emptyForm = {
  bloodType: '',
  allergies: '',
  medicalConditions: '',
  medications: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
  notes: '',
};

const toForm = (record: StudentHealthRecord) => ({
  bloodType: record.blood_type ?? '',
  allergies: record.allergies ?? '',
  medicalConditions: record.medical_conditions ?? '',
  medications: record.medications ?? '',
  emergencyContactName: record.emergency_contact_name ?? '',
  emergencyContactPhone: record.emergency_contact_phone ?? '',
  emergencyContactRelationship: record.emergency_contact_relationship ?? '',
  notes: record.notes ?? '',
});

export function StudentHealthSection({ studentId }: StudentHealthSectionProps) {
  const { data: role } = useUserRole();
  const canManage = role === 'admin' || role === 'coordenacao' || role === 'secretario';

  const { data: record, isLoading } = useStudentHealthRecord(studentId);
  const upsert = useUpsertStudentHealthRecord();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    setForm(record ? toForm(record) : emptyForm);
  }, [record]);

  const handleSave = () => {
    upsert.mutate(
      {
        studentId,
        bloodType: form.bloodType || null,
        allergies: form.allergies || null,
        medicalConditions: form.medicalConditions || null,
        medications: form.medications || null,
        emergencyContactName: form.emergencyContactName || null,
        emergencyContactPhone: form.emergencyContactPhone || null,
        emergencyContactRelationship: form.emergencyContactRelationship || null,
        notes: form.notes || null,
      },
      { onSuccess: () => setDialogOpen(false) }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <HeartPulse className="h-4 w-4" />
          Prontuário (saúde e emergência)
        </h3>
        {canManage && (
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
            {record ? 'Editar' : 'Preencher'}
          </Button>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {!isLoading && !record && (
        <p className="text-sm text-muted-foreground">Nenhum dado de saúde/emergência registrado para este aluno.</p>
      )}

      {record && (
        <div className="rounded-md border p-3 space-y-2">
          {record.blood_type && <p className="text-sm"><strong>Tipo sanguíneo:</strong> {record.blood_type}</p>}
          {record.allergies && <p className="text-sm"><strong>Alergias:</strong> {record.allergies}</p>}
          {record.medical_conditions && (
            <p className="text-sm"><strong>Condições médicas:</strong> {record.medical_conditions}</p>
          )}
          {record.medications && <p className="text-sm"><strong>Medicações:</strong> {record.medications}</p>}
          {record.emergency_contact_name && (
            <p className="text-sm flex items-center gap-1">
              <Phone className="h-3 w-3" />
              <strong>Contato de emergência:</strong> {record.emergency_contact_name}
              {record.emergency_contact_relationship && ` (${record.emergency_contact_relationship})`}
              {record.emergency_contact_phone && ` — ${record.emergency_contact_phone}`}
            </p>
          )}
          {record.notes && <p className="text-sm text-muted-foreground">{record.notes}</p>}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prontuário — saúde e emergência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo sanguíneo</Label>
              <Input
                value={form.bloodType}
                onChange={(e) => setForm({ ...form, bloodType: e.target.value })}
                placeholder="Ex.: O+"
              />
            </div>
            <div className="space-y-2">
              <Label>Alergias</Label>
              <Textarea
                value={form.allergies}
                onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                placeholder="Ex.: amendoim, penicilina"
              />
            </div>
            <div className="space-y-2">
              <Label>Condições médicas</Label>
              <Textarea
                value={form.medicalConditions}
                onChange={(e) => setForm({ ...form, medicalConditions: e.target.value })}
                placeholder="Ex.: asma, diabetes tipo 1"
              />
            </div>
            <div className="space-y-2">
              <Label>Medicações em uso contínuo</Label>
              <Textarea
                value={form.medications}
                onChange={(e) => setForm({ ...form, medications: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contato de emergência — nome</Label>
                <Input
                  value={form.emergencyContactName}
                  onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={form.emergencyContactPhone}
                  onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Parentesco/relação</Label>
              <Input
                value={form.emergencyContactRelationship}
                onChange={(e) => setForm({ ...form, emergencyContactRelationship: e.target.value })}
                placeholder="Ex.: mãe, avô, vizinho autorizado"
              />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
