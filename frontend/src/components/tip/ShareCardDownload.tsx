import React from 'react';
import { Download } from 'lucide-react';
import { toPng } from 'html-to-image';

export interface ShareCardDownloadProps {
  cardRef: React.RefObject<HTMLDivElement>;
  filename?: string;
}

const ShareCardDownload: React.FC<ShareCardDownloadProps> = ({
  cardRef,
  filename,
}) => {
  const handleDownload = async () => {
    if (!cardRef.current) return;

    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        backgroundColor: '#020617', // match dark theme background
      });
      const link = document.createElement('a');
      link.download = filename ?? `tiptune-tip-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to export share card as image', error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-primary-blue text-white hover:bg-secondary-indigo transition-colors"
    >
      <Download className="w-4 h-4" />
      Download PNG
    </button>
  );
};

export default ShareCardDownload;

