import React from 'react';
import { CheckCircle2, Info } from 'lucide-react';

export interface RequestNotificationProps {
  message: string;
  type?: 'success' | 'info';
}

const RequestNotification: React.FC<RequestNotificationProps> = ({
  message,
  type = 'info',
}) => {
  const isSuccess = type === 'success';
  const Icon = isSuccess ? CheckCircle2 : Info;
  const containerClasses = isSuccess
    ? 'bg-emerald-500/10 border-emerald-400/40 text-emerald-100'
    : 'bg-slate-800/80 border-slate-600/60 text-slate-100';

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${containerClasses}`}
      role="status"
    >
      <Icon className="h-4 w-4" />
      <span>{message}</span>
    </div>
  );
};

export default RequestNotification;

