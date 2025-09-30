# License Debugging Guide

Follow these steps to debug the license verification issue:

## Step 1: Access Debug Page
Visit: `https://your-domain.com/debug/license-debug`

This page will help you identify exactly what's going wrong with the license verification.

## Step 2: Test License Verification

1. Enter your license key in the debug form
2. Leave domain field empty (it will auto-detect)
3. Click "Debug License"

## Step 3: Check Results

The debug page will show you:

### ✅ What to look for if working:
- All environment variables should show "SET" (not "NOT_SET")
- Database connection should be "SUCCESS"
- License should be found in database
- Domain should match
- Client status should be "active"
- Subscription status should be "active"

### ❌ Common Issues and Solutions:

#### Issue 1: Environment Variables Not Set
**Symptoms:** ADMIN_DB_* variables show "NOT_SET"
**Solution:** Add these to Vercel environment variables:
```
ADMIN_DB_HOST=82.197.82.184
ADMIN_DB_USER=u564818703_fldeup
ADMIN_DB_PASS=AlAQOh3Ys
ADMIN_DB_NAME=u564818703_fldeup
```

#### Issue 2: Database Connection Failed
**Symptoms:** "Database connection failed" message
**Solution:** 
- Check database server is accessible
- Verify credentials are correct
- Make sure database server allows connections from Vercel

#### Issue 3: License Key Not Found
**Symptoms:** "License key not found in database"
**Solution:** 
- Check if license key exists in `saas_clients` table
- Verify you're using the correct license key
- Check if license was created in admin panel

#### Issue 4: Domain Mismatch
**Symptoms:** "Domain mismatch" error
**Solution:** 
- Check `website_domain` field in `saas_clients` table
- Make sure it matches your actual domain
- Update domain in admin panel if needed

#### Issue 5: Client Status Issues
**Symptoms:** "Client status is suspended/cancelled"
**Solution:** 
- Check `status` field in `saas_clients` table
- Update status to 'active' in admin panel

#### Issue 6: Subscription Issues
**Symptoms:** "Subscription is expired/cancelled"
**Solution:** 
- Check `subscription_status` field in `saas_clients` table
- Check `subscription_end_date` field
- Update subscription in admin panel

## Step 4: Manual Database Check

If debug page shows issues, manually check the database:

```sql
-- Check if license exists
SELECT * FROM saas_clients WHERE license_key = 'YOUR_LICENSE_KEY';

-- Check client status
SELECT id, company_name, status, subscription_status, website_domain, license_verified 
FROM saas_clients 
WHERE license_key = 'YOUR_LICENSE_KEY';

-- Update license to verified (if needed)
UPDATE saas_clients 
SET license_verified = 'yes', 
    last_verification_date = NOW() 
WHERE license_key = 'YOUR_LICENSE_KEY';
```

## Step 5: Force License Verification

If everything looks correct but still failing, try this SQL:

```sql
UPDATE saas_clients 
SET 
    license_verified = 'yes',
    status = 'active',
    subscription_status = 'active',
    last_verification_date = NOW(),
    last_access_date = NOW()
WHERE license_key = 'YOUR_LICENSE_KEY';
```

## Step 6: Clear Browser Data

After fixing database issues:
1. Clear browser cookies and localStorage
2. Try accessing the site again
3. Or try in incognito/private mode

## Quick Fix SQL Command

Replace `YOUR_LICENSE_KEY` with your actual license key:

```sql
UPDATE saas_clients 
SET license_verified = 'yes' 
WHERE license_key = 'YOUR_LICENSE_KEY';
```

This should immediately fix the global license verification.