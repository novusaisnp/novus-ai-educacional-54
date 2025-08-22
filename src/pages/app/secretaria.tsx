import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SecretariaHub } from '@/features/secretaria/hub/SecretariaHub';
import { ModalMestre } from '@/features/secretaria/hub/ModalMestre';
import { ModalType } from '@/features/secretaria/types';

export default function Secretaria() {
  const [searchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedModal, setSelectedModal] = useState<ModalType | null>(null);

  // Verificar se deve abrir modal baseado na URL
  const modalParam = searchParams.get('modal') as ModalType;
  const shouldOpenModal = modalParam && ['alunos', 'turmas', 'disciplinas', 'matriculas'].includes(modalParam);

  const handleOpenModal = (modal: ModalType) => {
    setSelectedModal(modal);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedModal(null);
  };

  return (
    <>
      <SecretariaHub onOpenModal={handleOpenModal} />
      
      <ModalMestre
        isOpen={isModalOpen || shouldOpenModal}
        onClose={handleCloseModal}
        defaultTab={selectedModal || modalParam}
      />
    </>
  );
}