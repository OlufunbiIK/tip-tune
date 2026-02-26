# Admin Module Implementation Guide

## Setup Instructions

### 1. Run Migration

```bash
npm run migration:run
```

This creates the `admin_roles` and `admin_audit_logs` tables.

### 2. Create Initial Super Admin

You'll need to manually insert a super admin role into the database:

```sql
-- First, find your user ID
SELECT id, username, email FROM users WHERE email = 'your-admin@example.com';

-- Insert admin role
INSERT INTO admin_roles (id, "userId", role, permissions, "createdAt")
VALUES (
  uuid_generate_v4(),
  'YOUR_USER_ID_HERE',
  'super_admin',
  '["view_users","ban_users","unban_users","force_reset_user","view_artists","verify_artists","unverify_artists","suspend_artists","view_tracks","remove_tracks","add_warning_label","view_reports","resolve_reports","view_stats","view_audit_logs","manage_admins"]',
  NOW()
);
```

### 3. Test Admin Endpoints

All admin endpoints require:

1. Valid JWT token in Authorization header
2. User must have an admin role in `admin_roles` table
3. User must have required permissions for the specific endpoint

Example request:

```bash
curl -X GET http://localhost:3000/api/admin/stats/overview \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## API Examples

### Get Platform Statistics

```bash
GET /api/admin/stats/overview
Authorization: Bearer {token}
```

Response:

```json
{
  "totalUsers": 1250,
  "totalArtists": 340,
  "totalTracks": 5600,
  "totalTips": "125000.50",
  "activeUsers24h": 450,
  "newUsers7d": 89,
  "pendingReports": 12,
  "bannedUsers": 5,
  "verifiedArtists": 120
}
```

### List Users with Filters

```bash
GET /api/admin/users?status=active&search=john&sort=createdAt&order=DESC
Authorization: Bearer {token}
```

### Ban a User

```bash
PUT /api/admin/users/{userId}/ban
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "Violation of community guidelines - spam content"
}
```

### Verify an Artist

```bash
PUT /api/admin/artists/{artistId}/verify
Authorization: Bearer {token}
```

### Remove a Track

```bash
DELETE /api/admin/tracks/{trackId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "Copyright violation"
}
```

### Get Pending Reports

```bash
GET /api/admin/reports/pending
Authorization: Bearer {token}
```

### Resolve a Report

```bash
PUT /api/admin/reports/{reportId}/resolve
Authorization: Bearer {token}
Content-Type: application/json

{
  "resolution": "action_taken",
  "notes": "User has been warned and content removed"
}
```

### View Audit Logs

```bash
GET /api/admin/audit-logs?limit=50
Authorization: Bearer {token}
```

## Permission Matrix

| Action          | Super Admin | Moderator | Support | Analyst |
| --------------- | ----------- | --------- | ------- | ------- |
| View Users      | ✓           | ✓         | ✓       | ✓       |
| Ban/Unban Users | ✓           | ✓         | ✗       | ✗       |
| View Artists    | ✓           | ✓         | ✓       | ✓       |
| Verify Artists  | ✓           | ✓         | ✗       | ✗       |
| Suspend Artists | ✓           | ✓         | ✗       | ✗       |
| View Tracks     | ✓           | ✓         | ✓       | ✓       |
| Remove Tracks   | ✓           | ✓         | ✗       | ✗       |
| View Reports    | ✓           | ✓         | ✓       | ✗       |
| Resolve Reports | ✓           | ✓         | ✓       | ✗       |
| View Stats      | ✓           | ✓         | ✗       | ✓       |
| View Audit Logs | ✓           | ✗         | ✗       | ✓       |
| Manage Admins   | ✓           | ✗         | ✗       | ✗       |

## Error Handling

The module includes proper error handling:

- `401 Unauthorized` - No valid JWT token
- `403 Forbidden` - User lacks admin role or required permissions
- `404 Not Found` - Entity (user, artist, track, report) not found
- `400 Bad Request` - Invalid action (e.g., banning already banned user)

## Audit Trail

Every admin action is logged with:

- Who performed the action (admin user ID)
- What action was performed
- When it was performed
- What entity was affected
- Previous and new state
- Reason for the action
- IP address of the admin

This ensures full accountability and traceability.

## Security Best Practices

1. **Never expose admin endpoints publicly** - Always behind authentication
2. **Regularly review audit logs** - Monitor for suspicious activity
3. **Principle of least privilege** - Grant minimum required permissions
4. **Rotate admin credentials** - Especially for super admins
5. **Monitor failed access attempts** - Set up alerts for unauthorized access
6. **IP whitelisting** - Consider restricting admin access to specific IPs
7. **Two-factor authentication** - Implement for admin accounts (future enhancement)

## Future Enhancements

- [ ] Bulk user operations
- [ ] Advanced filtering and search
- [ ] Export audit logs to CSV
- [ ] Real-time admin activity dashboard
- [ ] Email notifications for critical actions
- [ ] Two-factor authentication for admins
- [ ] Admin role management UI
- [ ] Scheduled reports
- [ ] Content warning labels system
- [ ] User force password reset
