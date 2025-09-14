# SaaS License System Setup Instructions

## Overview
This system consists of two parts:
1. **Admin Panel** - Where you manage clients and generate license keys
2. **Client Sites** - The ecommerce script your customers deploy

## Setup Steps

### 1. Admin Panel Setup
1. Deploy your admin panel to a domain (e.g., `admin.yourcompany.com`)
2. Set up the database and configure environment variables
3. The admin panel already has CORS enabled for cross-domain requests

### 2. Client Site Configuration
Each client site needs to be configured with your admin panel URL:

#### Environment Variables (.env.local)
```bash
# Admin Panel Configuration (REQUIRED)
ADMIN_PANEL_URL="https://admin.yourcompany.com"
NEXT_PUBLIC_ADMIN_PANEL_URL="https://admin.yourcompany.com"

# Other configurations...
DATABASE_URL="mysql://..."
NEXTAUTH_SECRET="..."
```

### 3. Testing the Connection

#### Method 1: Using the Test Page
1. Visit `/test-admin-connection` on any client site
2. Enter your admin panel URL
3. Test the connection and license verification

#### Method 2: Using the Debug Pages
1. Visit `/debug/license-test` for license testing
2. Visit `/debug/connection-test` for connection testing

### 4. Adding a New Client

#### In Admin Panel:
1. Go to SaaS Clients section
2. Add new client with:
   - Company name
   - Contact details
   - **Website domain** (exact match required, e.g., `client-domain.com`)
   - Subscription details
3. Generate license key
4. Provide license key to client

#### Client Setup:
1. Client deploys the ecommerce script
2. Client visits `their-domain.com/license-setup`
3. Client enters the license key you provided
4. System verifies license with your admin panel
5. If valid, client site is activated

### 5. License Verification Flow

```
Client Site ──→ Admin Panel
    │               │
    │               ├─ Verify license key
    │               ├─ Check domain match
    │               ├─ Check subscription status
    │               └─ Return validation result
    │
    └─ Allow/Block access based on result
```

### 6. API Endpoints

#### Admin Panel APIs (with CORS enabled):
- `POST /api/saas/verify-license` - Main license verification
- `GET /api/saas/verify-license` - Quick license check
- `GET /api/test/ping` - Basic connectivity test
- `GET /api/saas/test` - SaaS system test

#### Client Site APIs:
- `POST /api/debug/verify-license` - Debug license verification
- `GET /api/debug/test-license-connection` - Test admin panel connection
- `GET /api/debug/diagnose-connection` - Detailed connection diagnostics

### 7. Security Features

- **Domain Validation**: License keys are tied to specific domains
- **Subscription Checks**: Validates subscription status and expiry
- **Rate Limiting**: Built-in verification intervals
- **Grace Periods**: Temporary access during connection issues
- **Audit Logging**: All verification attempts are logged

### 8. Troubleshooting

#### Common Issues:
1. **CORS Errors**: Admin panel has CORS enabled (`Access-Control-Allow-Origin: *`)
2. **Domain Mismatch**: Ensure exact domain match in admin panel
3. **Network Issues**: Check firewall and DNS settings
4. **SSL Issues**: Ensure both domains have valid SSL certificates

#### Debug Steps:
1. Use `/test-admin-connection` to test connectivity
2. Check browser console for detailed error messages
3. Verify environment variables are set correctly
4. Test with a known valid license key

### 9. Client Onboarding Process

#### For You (SaaS Provider):
1. Client purchases license
2. Add client in admin panel
3. Generate license key
4. Provide setup instructions to client

#### For Client:
1. Deploy the ecommerce script
2. Configure database and basic settings
3. Visit `/license-setup` on their domain
4. Enter license key
5. System activates automatically

### 10. Monitoring

- Check license verification logs in admin panel
- Monitor client access patterns
- Set up alerts for failed verifications
- Track subscription renewals

## Test URLs

Once deployed, test these URLs (accessible without license verification):
- `https://client-domain.com/test-admin-connection` - Connection test + Domain verification
- `https://client-domain.com/debug/license-test` - License verification test  
- `https://client-domain.com/debug/connection-test` - Connection diagnostics
- `https://client-domain.com/license-setup` - License setup

### Domain Verification Feature

The `/test-admin-connection` page now includes a **Domain Database Check** feature that:

✅ **Checks if the current domain exists in the admin panel's SAAS clients database**
✅ **Shows complete client information if found** (company, contact, status, subscription, license key)
✅ **Provides detailed troubleshooting** if domain is not found
✅ **Supports exact and partial domain matching**

**Usage:**
1. Visit `/test-admin-connection` 
2. Click "Check Domain in Admin Database"
3. View results:
   - **Domain Found**: Shows complete SAAS client details
   - **Domain Not Found**: Shows troubleshooting suggestions

**Note**: All debug and test URLs are accessible without authentication or license verification for troubleshooting purposes.

## Support

If clients have issues:
1. Check their domain configuration in admin panel
2. Verify license key is correct
3. Test connectivity using debug pages
4. Check admin panel logs for failed attempts
