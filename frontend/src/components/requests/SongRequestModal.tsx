import React, { useState } from 'react';
import Modal from '../common/Modal';
import type { Track } from '../../types';
import RequestForm, { RequestFormValues } from './RequestForm';

export interface SongRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  onCreateRequest: (values: RequestFormValues) => Promise<void>;
}

const SongRequestModal: React.FC<SongRequestModalProps> = ({
  isOpen,
  onClose,
  tracks,
  onCreateRequest,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: RequestFormValues) => {
    try {
      setIsSubmitting(true);
      await onCreateRequest(values);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request a song">
      <RequestForm tracks={tracks} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </Modal>
  );
};

export default SongRequestModal;

