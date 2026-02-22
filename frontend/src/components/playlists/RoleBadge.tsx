interface RoleBadgeProps {
  role: 'owner' | 'editor' | 'viewer';
}

const roleStyles: Record<RoleBadgeProps['role'], string> = {
  owner: 'bg-gold/20 text-gold border border-gold/40',
  editor: 'bg-ice-blue/20 text-ice-blue border border-ice-blue/40',
  viewer: 'bg-white/10 text-white/80 border border-white/20',
};

const RoleBadge = ({ role }: RoleBadgeProps) => {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs uppercase tracking-wide ${roleStyles[role]}`}
    >
      {role}
    </span>
  );
};

export default RoleBadge;
