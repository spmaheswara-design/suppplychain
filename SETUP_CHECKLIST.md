# ✅ Setup Checklist - Do This First!

## 🚨 IMPORTANT: Required Setup (5 Minutes)

Before testing your app, you **MUST** complete this setup:

---

## Step 1: Run Database Trigger (REQUIRED) ⚡

**Why:** This makes user profiles automatically appear after email verification

**How:**

1. Open: https://supabase.com/dashboard
2. Select project: `rhynhknihecasmcbqfbm`
3. Click: **SQL Editor** → **New query**
4. Open file: `supabase-auto-user-trigger.sql`
5. Copy **ALL** content → Paste in SQL Editor
6. Click: **Run**
7. See: "Success. No rows returned" ✅

**Time:** 2 minutes

---

## Step 2: Verify Email Settings

**Why:** Ensure email verification is enabled

**How:**

1. In Supabase Dashboard
2. Click: **Authentication** → **Providers** → **Email**
3. Check: "Confirm email" is **ON** (blue/enabled)
4. Click: **Save**

**Time:** 1 minute

---

## Step 3: Test the Flow

**Why:** Make sure everything works

**How:**

1. **Signup**
   - Open app → Sign Up
   - Enter: name, email, password
   - See message: "Please check your email and verify your account"

2. **Verify**
   - Check email inbox
   - Click verification link
   - See: Confirmation page

3. **Check Database**
   - Supabase → Table Editor → users
   - Your profile should be there! ✅

4. **Login**
   - Go back to app
   - Login with verified credentials
   - Should work! ✅

5. **Submit Complaint**
   - Type or record a complaint
   - Submit
   - Should work without errors! ✅

**Time:** 2 minutes

---

## ⚠️ Common Mistakes

### ❌ Skipping the database trigger
**Result:** User profiles won't be created  
**Fix:** Run `supabase-auto-user-trigger.sql` now!

### ❌ Trying to login before verifying email
**Result:** Can't login  
**Fix:** Always verify email first via the link

### ❌ Not checking spam folder
**Result:** "I didn't get the email!"  
**Fix:** Check spam/junk folder

---

## 🎯 Quick Test Command

After setup, run this in Supabase SQL Editor to check if trigger exists:

```sql
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_verified';
```

**Expected result:** Should show one row with trigger name ✅

---

## 📋 What's Fixed

✅ **Signup message** - Now asks to verify email  
✅ **Auto user profile** - Created when email verified  
✅ **Name preservation** - User's name saved correctly  
✅ **Email verification** - Professional security feature  
✅ **Testing mode** - Emails go to your address  

---

## 🎓 For Demo/Presentation

**You can confidently show:**

1. ✅ Professional signup with email verification
2. ✅ Automatic database integration
3. ✅ Secure authentication flow
4. ✅ AI-powered complaint routing
5. ✅ Email notifications
6. ✅ Complete end-to-end workflow

---

## 📞 If Something Doesn't Work

1. **Did you run the trigger script?** → Most important!
2. **Is email verification enabled?** → Check Supabase settings
3. **Did you verify your email?** → Click the link in email
4. **Check Supabase logs** → Authentication → Logs

---

## 🚀 You're Ready When:

- ✅ Trigger script ran successfully
- ✅ Email verification is enabled
- ✅ Test signup works
- ✅ Test login works
- ✅ Test complaint submission works
- ✅ User profile appears in database

**Total setup time: ~5 minutes**

Now your app is production-ready! 🎉

