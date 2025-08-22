export interface SecretariaModalContext {
  orgId: string;
  onSaved: () => void;
  onClose: () => void;
}

export type ModalType = 'alunos' | 'turmas' | 'disciplinas' | 'matriculas' | 'unidades' | 'segmentos' | 'series' | 'periodos' | 'responsaveis' | 'documentos' | 'visitantes' | 'reservas' | 'solicitacoes' | 'ex-alunos' | 'rematricula';

export interface SecretariaModalState {
  isOpen: boolean;
  activeTab: ModalType | null;
  action?: 'novo' | 'editar';
  id?: string;
}