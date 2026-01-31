# API-Based License System (No Database Access)

## Overview
The license system now uses API calls to the admin panel instead of direct database access for security reasons.

## How It Works

### 1. Domain-Based License Check
**Login-Register API**: `/api/license/check-by-domain`
↓ Calls ↓
**Admin Panel API**: `/api/saas/check-by-domain`

### 2. License Activation
**Login-Register API**: `/api/license/setup-global`
↓ Calls ↓
**Admin Panel API**: `/api/saas/verify-license` (with `setGloballyVerified: true`)

### 3. License Validation Flow
1. User visits website
2. Middleware calls `/api/license/check-by-domain`
3. This calls admin panel to check if domain has `license_verified = 'yes'`
4. If yes → Allow access
5. If no → Redirect to license setup

### 4. License Setup Flow
1. User enters license key
2. System calls admin panel to verify license
3. If valid → Admin panel sets `license_verified = 'yes'`
4. Redirect to homepage
5. All future visits work globally

## Files Created/Modified

### Admin Panel (New)
- `app/api/saas/check-by-domain/route.ts` - Check license by domain

### Login-Register (Modified)
- `src/app/api/license/check-by-domain/route.ts` - Proxy to admin API
- `src/app/api/license/setup-global/route.ts` - Proxy to admin API
- `src/lib/license.ts` - Domain-based validation only
- `middleware.ts` - Domain-based checking
- `src/app/license-setup/page.tsx` - Auto-detection of verified domains

### Debug Tool
- `src/app/api/debug/license-debug/route.ts` - API-based debugging
- `src/app/debug/license-debug/page.tsx` - Debug interface

## Environment Variables Needed

### Login-Register Project (Vercel)
```
ADMIN_PANEL_URL=https://flower-delivery-final-admin.vercel.app
```

### Admin Panel Project (Already Set)
```
# Database credentials (already configured)
DB_HOST=82.197.82.184
DB_USER=u564818703_fldeup
DB_PASS=AlAQOh3Ys
DB_NAME=u564818703_fldeup
```

## Testing Steps

### 1. Deploy Admin Panel Changes
- Deploy the new `/api/saas/check-by-domain` endpoint

### 2. Deploy Login-Register Changes
- Add `ADMIN_PANEL_URL` environment variable
- Deploy the updated code

### 3. Test Domain Check
Visit: `https://doorgas.co/debug/license-debug`
- Should show admin panel connection successful
- Should find license if it exists

### 4. Test License Setup
Visit: `https://doorgas.co/license-setup`
- Should auto-redirect if already verified
- Should allow activation if not verified

## Expected Behavior

### ✅ License Already Verified
- Visit site → Immediate access (no setup page)
- Works on all browsers/devices

### ❌ License Not Verified
- Visit site → Redirect to license setup
- Enter license key → Global activation
- Future visits → Immediate access

## Security Benefits
- No database credentials in login-register project
- All database access through admin panel APIs
- CORS-enabled APIs for cross-origin requests
- Clean separation of concerns

## Troubleshooting

### Issue: API calls failing
- Check `ADMIN_PANEL_URL` environment variable
- Verify admin panel is accessible
- Check CORS headers

### Issue: License not found
- Verify domain matches exactly in database
- Check `website_domain` field in `saas_clients` table

### Issue: License found but not verified
- Check `license_verified` column in database
- Manually set to 'yes' if needed:
```sql
UPDATE saas_clients 
SET license_verified = 'yes' 
WHERE website_domain = 'doorgas.co';
```