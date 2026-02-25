import { ChangeEvent, FormEvent, useState } from 'react';
import Modal from '../common/Modal';

type CreatePlaylistPayload = {
  name: string;
  description?: string;
  isPublic: boolean;
  approvalRequired: boolean;
  coverImage?: string;
};

type CreatePlaylistModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: CreatePlaylistPayload) => Promise<void>;
};

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function CreatePlaylistModal({
  isOpen,
  onClose,
  onCreate,
}: CreatePlaylistModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [coverImage, setCoverImage] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const onCoverSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setCoverImage(dataUrl);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        isPublic,
        approvalRequired,
        coverImage,
      });
      setName('');
      setDescription('');
      setIsPublic(false);
      setApprovalRequired(false);
      setCoverImage(undefined);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Playlist">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Playlist name"
          className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-sm text-white"
          required
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-sm text-white"
          rows={3}
        />
        <input type="file" accept="image/*" onChange={onCoverSelected} className="text-sm text-white/80" />
        <label className="flex items-center gap-2 text-sm text-white/80">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          Public playlist
        </label>
        <label className="flex items-center gap-2 text-sm text-white/80">
          <input
            type="checkbox"
            checked={approvalRequired}
            onChange={(e) => setApprovalRequired(e.target.checked)}
          />
          Require approval for edits
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-white/20 px-3 py-2 text-sm">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-primary-blue px-3 py-2 text-sm text-white disabled:opacity-60"
          >
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
