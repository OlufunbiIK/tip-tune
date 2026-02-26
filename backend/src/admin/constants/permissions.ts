export const PERMISSIONS = {
  // User management
  VIEW_USERS: 'view_users',
  BAN_USERS: 'ban_users',
  UNBAN_USERS: 'unban_users',
  FORCE_RESET_USER: 'force_reset_user',
  
  // Artist management
  VIEW_ARTISTS: 'view_artists',
  VERIFY_ARTISTS: 'verify_artists',
  UNVERIFY_ARTISTS: 'unverify_artists',
  SUSPEND_ARTISTS: 'suspend_artists',
  
  // Content management
  VIEW_TRACKS: 'view_tracks',
  REMOVE_TRACKS: 'remove_tracks',
  ADD_WARNING_LABEL: 'add_warning_label',
  
  // Reports management
  VIEW_REPORTS: 'view_reports',
  RESOLVE_REPORTS: 'resolve_reports',
  
  // Analytics
  VIEW_STATS: 'view_stats',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  
  // Admin management
  MANAGE_ADMINS: 'manage_admins',
} as const;

export const ROLE_PERMISSIONS = {
  super_admin: Object.values(PERMISSIONS),
  moderator: [
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.BAN_USERS,
    PERMISSIONS.UNBAN_USERS,
    PERMISSIONS.VIEW_ARTISTS,
    PERMISSIONS.SUSPEND_ARTISTS,
    PERMISSIONS.VIEW_TRACKS,
    PERMISSIONS.REMOVE_TRACKS,
    PERMISSIONS.ADD_WARNING_LABEL,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.RESOLVE_REPORTS,
    PERMISSIONS.VIEW_STATS,
  ],
  support: [
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_ARTISTS,
    PERMISSIONS.VIEW_TRACKS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.RESOLVE_REPORTS,
  ],
  analyst: [
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_ARTISTS,
    PERMISSIONS.VIEW_TRACKS,
    PERMISSIONS.VIEW_STATS,
    PERMISSIONS.VIEW_AUDIT_LOGS,
  ],
};
