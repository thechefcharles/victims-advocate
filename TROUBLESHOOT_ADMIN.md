# Troubleshooting Admin Access

## Quick Check: Debug Endpoint

**In your browser or via curl:**
```
GET /api/debug-admin-check?email=christinanrice@gmail.com
```

This will tell you:
- ✅ If the user exists in `auth.users`
- ✅ If a `profiles` row exists
- ✅ Current `is_admin` status
- ✅ SQL to fix if needed

---

## Manual SQL Checks (Supabase SQL Editor)

### 1. Check if user exists in auth.users
```sql
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'christinanrice@gmail.com';
```

**Expected:** Should return one row with the user's `id` (UUID).

**If empty:** User hasn't signed up yet. They need to create an account first.

---

### 2. Check if profile exists
```sql
SELECT p.*, u.email
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'christinanrice@gmail.com';
```

**Expected:** Should return one row with `is_admin` column.

**If empty:** Profile row is missing. Fix with:
```sql
-- Get the user ID first
SELECT id FROM auth.users WHERE email = 'christinanrice@gmail.com';

-- Then insert profile (replace USER_ID_HERE with the UUID from above)
INSERT INTO public.profiles (id, role, is_admin)
VALUES ('USER_ID_HERE', 'victim', false)
ON CONFLICT (id) DO NOTHING;
```

---

### 3. Check current admin status
```sql
SELECT 
  u.email,
  p.id,
  p.is_admin,
  p.role,
  p.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'christinanrice@gmail.com';
```

**Expected:** `is_admin` should be `true` for admin access.

---

### 4. Set user as admin
```sql
UPDATE public.profiles
SET is_admin = true
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'christinanrice@gmail.com'
);
```

**Verify it worked:**
```sql
SELECT u.email, p.is_admin
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'christinanrice@gmail.com';
```

Should show `is_admin = true`.

---

## Common Issues

### Issue 1: No profile row exists
**Symptom:** User can sign in but `is_admin` check fails silently.

**Fix:**
```sql
-- Create profile for all users missing one
INSERT INTO public.profiles (id, role, is_admin)
SELECT id, 'victim', false
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
```

Then set admin:
```sql
UPDATE public.profiles
SET is_admin = true
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'christinanrice@gmail.com'
);
```

---

### Issue 2: Profile exists but is_admin is false/null
**Symptom:** User exists, profile exists, but admin check returns false.

**Fix:**
```sql
UPDATE public.profiles
SET is_admin = true
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'christinanrice@gmail.com'
);
```

---

### Issue 3: RLS (Row Level Security) blocking read
**Symptom:** Profile exists but client can't read it.

**Check RLS policies:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

**Ensure this policy exists:**
```sql
CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);
```

---

### Issue 4: User ID mismatch
**Symptom:** Profile exists but for different user ID.

**Check:**
```sql
SELECT 
  u.id as auth_id,
  u.email,
  p.id as profile_id,
  p.is_admin
FROM auth.users u
FULL OUTER JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'christinanrice@gmail.com' OR p.id IN (
  SELECT id FROM auth.users WHERE email = 'christinanrice@gmail.com'
);
```

If `auth_id` ≠ `profile_id`, there's a mismatch. Fix by updating profile:
```sql
UPDATE public.profiles
SET id = (SELECT id FROM auth.users WHERE email = 'christinanrice@gmail.com')
WHERE id = 'OLD_PROFILE_ID';
```

---

## Bulk Set Multiple Admins

```sql
UPDATE public.profiles
SET is_admin = true
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email IN (
    'christinanrice@gmail.com',
    'admin2@example.com',
    'admin3@example.com'
  )
);
```

---

## Verify All Admins

```sql
SELECT 
  u.email,
  p.is_admin,
  p.role,
  p.created_at
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE p.is_admin = true
ORDER BY u.email;
```
