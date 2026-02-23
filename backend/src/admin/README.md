# Admin Module

Comprehensive admin backend module with role-based access control for platform administrators.

## Features

- Role-based access control (RBAC)
- User management (ban/unban)
- Artist management (verify/unverify)
- Content moderation (remove tracks)
- Platform statistics overview
- Report management
- Complete audit trail for all admin actions

## Admin Roles

### Super Admin

Full access to all platform features and permissions.

### Moderator

- User management (ban/unban)
- Artist management (suspend, verify)
- Content moderation (remove tracks, add warnings)
- Report management
- View platform statistics

### Support

- View users, artists, tracks
- View and resolve reports
- Limited moderation capabilities

### Analyst

- View-only access to users, artists, tracks
- Access to platform statistics
- Access to audit logs for analysis

## API Endpoints

### Statistics

- `GET /api/admin/stats/overview` - Platform-wide statistics overview

### User Management

- `GET /api/admin/users?filter=&sort=` - List users with filters
- `PUT /api/admin/users/:userId/ban` - Ban a user
- `PUT /api/admin/users/:userId/unban` - Unban a user

### Artist Management

- `PUT /api/admin/artists/:artistId/verify` - Verify an artist
- `PUT /api/admin/artists/:artistId/unverify` - Remove artist verification

### Content Management

- `DELETE /api/admin/tracks/:trackId` - Remove a track

### Report Management

- `GET /api/admin/reports/pending` - Get pending reports
- `PUT /api/admin/reports/:reportId/resolve` - Resolve a report

### Audit Logs

- `GET /api/admin/audit-logs?limit=100` - Get admin action audit logs

## Permissions

All permissions are defined in `constants/permissions.ts`:

- `view_users` - View user list
- `ban_users` - Ban users
- `unban_users` - Unban users
- `force_reset_user` - Force password reset
- `view_artists` - View artist list
- `verify_artists` - Verify artists
- `unverify_artists` - Remove artist verification
- `suspend_artists` - Suspend artist accounts
- `view_tracks` - View track list
- `remove_tracks` - Remove tracks
- `add_warning_label` - Add content warnings
- `view_reports` - View reports
- `resolve_reports` - Resolve reports
- `view_stats` - View platform statistics
- `view_audit_logs` - View audit logs
- `manage_admins` - Manage admin roles

## Usage

### Protecting Routes

Use the `@RequirePermission` decorator to protect admin routes:

```typescript
@Get('users')
@RequirePermission(PERMISSIONS.VIEW_USERS)
async getUsers() {
  // Only admins with view_users permission can access
}
```

### Audit Logging

All admin actions are automatically logged with:

- Admin user ID
- Action type
- Entity type and ID
- Previous and new state
- Reason for action
- IP address
- Timestamp

## Database Schema

### admin_roles

- `id` - UUID primary key
- `userId` - Foreign key to users table
- `role` - Enum (super_admin, moderator, support, analyst)
- `permissions` - JSON array of permission strings
- `grantedBy` - Foreign key to user who granted the role
- `createdAt` - Timestamp

### admin_audit_logs

- `id` - UUID primary key
- `adminId` - Foreign key to users table
- `action` - Action performed (e.g., "ban_user")
- `entityType` - Type of entity affected
- `entityId` - UUID of affected entity
- `previousState` - JSON snapshot before action
- `newState` - JSON snapshot after action
- `reason` - Text explanation
- `ipAddress` - IP address of admin
- `createdAt` - Timestamp

## Migration

Run the migration to create admin tables:

```bash
npm run migration:run
```

## Security Considerations

1. All admin routes are protected by JWT authentication
2. Role-based permissions are checked on every request
3. All actions are logged for accountability
4. IP addresses are recorded for security auditing
5. Sensitive actions require specific permissions
