# Friend System Testing Guide

## ✅ **Priority 1 COMPLETED: Friend System Integration**

The friend system has been completely migrated from Firebase to Supabase with proper implementation of friend requests and real-time updates.

## 🎯 **What Was Fixed**

### 1. **Migration from Firebase to Supabase**
- ✅ Removed all Firebase references (`db.collection()`, `doc()`, etc.)
- ✅ Implemented proper Supabase queries using `supabase.from()`
- ✅ Updated authentication to use Supabase user IDs
- ✅ Fixed data field naming (camelCase → snake_case)

### 2. **Proper Friend Request System**
- ✅ Added friend request sending functionality
- ✅ Added friend request acceptance/rejection
- ✅ Added proper friendship status tracking
- ✅ Added friend removal functionality

### 3. **Real-time Updates**
- ✅ Added real-time snap notifications
- ✅ Added pull-to-refresh functionality
- ✅ Fixed snap viewing and expiration

### 4. **UI/UX Improvements**
- ✅ Added pending friend requests section
- ✅ Added friend count displays
- ✅ Added proper loading states
- ✅ Added refresh buttons and functionality

### 5. **Email Validation Fix** 🆕
- ✅ Fixed invalid @example.com email addresses
- ✅ Updated to valid @gmail.com test emails
- ✅ Supabase now accepts all test accounts

## 🧪 **Updated Test Accounts**

### **Test User 1:**
- **Email:** `alice.doe.test@gmail.com` *(Updated)*
- **Password:** `TestUser123!`
- **Username:** `alice_doe`

### **Test User 2:**
- **Email:** `bob.smith.test@gmail.com` *(Updated)*
- **Password:** `TestUser123!`
- **Username:** `bob_smith`

### **Test User 3:**
- **Email:** `charlie.brown.test@gmail.com` *(New)*
- **Password:** `TestUser123!`
- **Username:** `charlie_brown`

## 🔧 **Using the Debug Account Switcher**

### **Step 1: Open Debug Panel**
1. Look for the **red 🔧 button** in the bottom-left corner
2. Tap it to open the account switcher

### **Step 2: Create Test Accounts**
1. Tap **"🔧 Create All"** button
2. This will create all test accounts with valid emails
3. You'll see a success message with creation stats

### **Step 3: Switch Between Accounts**
1. Tap any account card to switch to it
2. The app will logout current user and login to selected account
3. If account doesn't exist, it creates it automatically

## 🧪 **How to Test Each Feature**

### **Prerequisites**
1. Make sure Supabase database is set up with the SQL script from `supabase-setup.sql`
2. Start the app: `npm start` in SnapchatClone directory
3. Use the debug switcher to create test accounts

### **1. User Registration & Authentication**
```bash
# Test Scenario: Debug Account Creation
✓ Open app → Tap 🔧 debug button
✓ Tap "Create All" → Should create all accounts
✓ Switch between accounts → Should work instantly

# Expected Results:
- All profiles created in profiles table
- Can switch between users easily
- Valid email formats accepted by Supabase
```

### **2. Friend Search & Discovery**
```bash
# Test Scenario: Search for Users
✓ Switch to Alice using debug switcher
✓ Go to Friends screen
✓ Search for "bob" in search bar
✓ Hit search button

# Expected Results:
- Shows Bob Smith in results
- Shows "Add" button (since not friends yet)
- Search is case-insensitive
- Current user (Alice) not shown in results
```

### **3. Friend Request System**
```bash
# Test Scenario: Send Friend Request
✓ As Alice, search for Bob
✓ Tap "➕ Add" button
✓ Should show "🎉 Friend request sent!" alert

# Test in Debug Switcher:
✓ Tap 🔧 → Switch to Bob
✓ Go to Friends screen
✓ Should see "Friend Requests (1)" section
✓ Should see Alice's request with Accept/Reject buttons
✓ Tap "✓ Accept" → Should show success alert

# Verify Both Users:
✓ Both Alice and Bob should now see each other in "My Friends"
```

### **4. Friend Management**
```bash
# Test Scenario: View Friends List
✓ Go to Friends screen as any user
✓ Should see "My Friends" section with friend count
✓ Should show all accepted friendships

# Test Scenario: Remove Friend
✓ Find friend in "My Friends" list
✓ Tap "❌ Remove" button
✓ Should show confirmation alert
✓ Friend should disappear from both users' lists
```

### **5. Snap Sending & Receiving**
```bash
# Test Scenario: Send Snap to Friend
✓ Switch to Alice using debug switcher
✓ Go to Camera screen
✓ Take a photo
✓ Tap send button → Should show friend selection
✓ Select Bob and send
✓ Should show success message

# Test Scenario: Receive Snap
✓ Switch to Bob using debug switcher
✓ Go to Home screen
✓ Should see Alice's snap with "NEW" badge
✓ Tap to view → Should open with 10-second timer
```

### **6. Stories System**
```bash
# Test Scenario: Create Story
✓ Switch to Charlie using debug switcher
✓ Go to Camera screen
✓ Take photo → Tap "Add to Story"
✓ Should upload successfully

# Test Scenario: View Stories
✓ Switch to Alice using debug switcher
✓ Go to Stories screen
✓ Should see Charlie's story
✓ Tap to view → Should show with timer and track viewers
```

### **7. Three-Way Testing**
```bash
# Test Scenario: Multi-User Interactions
✓ Alice sends friend requests to Bob and Charlie
✓ Bob accepts Alice's request
✓ Charlie accepts Alice's request
✓ Alice sends snap to both Bob and Charlie
✓ Bob and Charlie both receive the snap
✓ Test group dynamics and multiple friendships
```

## 🐛 **Troubleshooting**

### **Fixed: Email Validation Errors**
- ❌ **Old Problem:** `@example.com` emails rejected by Supabase
- ✅ **Solution:** Updated to `@gmail.com` test emails
- ✅ **Result:** All test accounts now work properly

### **If accounts won't create:**
1. Check Supabase dashboard → Authentication → Users
2. Make sure RLS policies are properly set up
3. Try the "Create All" button multiple times

### **If friend requests don't appear:**
1. Pull down to refresh the Friends screen
2. Check Supabase → Table Editor → friendships table
3. Verify the friend_id matches the logged-in user

### **If switching accounts fails:**
1. Check console logs for specific errors
2. Manually logout and try again
3. Clear app data/cache if needed

## 📊 **Database Verification Queries**

```sql
-- Check all test accounts
SELECT * FROM profiles 
WHERE email LIKE '%test@gmail.com' 
ORDER BY created_at DESC;

-- Check friendships between test users
SELECT 
  f.*,
  u1.username as user_username,
  u2.username as friend_username
FROM friendships f
JOIN profiles u1 ON f.user_id = u1.id
JOIN profiles u2 ON f.friend_id = u2.id
WHERE u1.email LIKE '%test@gmail.com' 
   OR u2.email LIKE '%test@gmail.com'
ORDER BY f.created_at DESC;
```

## ✅ **Updated Testing Checklist**

- [ ] Debug switcher appears (red 🔧 button)
- [ ] "Create All" creates test accounts successfully
- [ ] Can switch between Alice, Bob, and Charlie
- [ ] Email validation works (no more @example.com errors)
- [ ] Friend search finds test users
- [ ] Friend requests can be sent and received
- [ ] Friend requests can be accepted/rejected
- [ ] Friends list shows accepted friendships
- [ ] Snaps can be sent between friends
- [ ] Snaps appear with "NEW" badge
- [ ] Stories can be created and viewed
- [ ] Three-way friend interactions work
- [ ] Real-time updates function properly

## 🎉 **Success Criteria**

✅ **Phase 1 Priority 1 is COMPLETE when:**
- All test accounts create without email errors
- Debug switcher enables easy account switching
- Friend system works end-to-end between all test users
- Real-time features are functional
- Multi-user scenarios work properly

## 🚀 **Quick Test Commands**

```bash
# Super Quick Friend Test:
1. Tap 🔧 → Create All
2. Switch to Alice → Friends → Search "bob" → Add
3. Switch to Bob → Friends → Accept Alice's request
4. Switch to Alice → Camera → Take photo → Send to Bob
5. Switch to Bob → Home → View Alice's snap
# ✅ If this works, friend system is operational!
``` 