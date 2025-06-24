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

## 🧪 **How to Test Each Feature**

### **Prerequisites**
1. Make sure Supabase database is set up with the SQL script from `supabase-setup.sql`
2. Start the app: `npm start` in SnapchatClone directory
3. Create at least 2 test accounts for testing interactions

### **1. User Registration & Authentication**
```bash
# Test Scenario: New User Signup
✓ Open app → Should show Login screen
✓ Tap "Sign Up" → Enter email, password, username
✓ Submit → Should create account and profile automatically
✓ Check Supabase profiles table → New profile should exist

# Expected Results:
- Profile created in profiles table
- User can login immediately
- Username is properly stored
```

### **2. Friend Search & Discovery**
```bash
# Test Scenario: Search for Users
✓ Go to Friends screen
✓ Enter username in search bar
✓ Hit search button

# Expected Results:
- Shows matching users (case-insensitive)
- Current user not shown in results
- Shows "Add" button for non-friends
- Shows "Remove" button for existing friends
- Shows "Pending" status for sent requests
```

### **3. Friend Request System**
```bash
# Test Scenario: Send Friend Request
✓ Search for another user
✓ Tap "Add" button
✓ Should show "Friend request sent!" alert

# Test in Supabase:
✓ Check friendships table → New row with status='pending'
✓ user_id = sender, friend_id = recipient

# Test Scenario: Receive Friend Request
✓ Login as the other user
✓ Go to Friends screen
✓ Should see "Friend Requests" section with pending request
✓ Tap "Accept" → Should show success alert
✓ Both users should now see each other in "My Friends"

# Test in Supabase:
✓ Check friendships table → status updated to 'accepted'
```

### **4. Friend Management**
```bash
# Test Scenario: View Friends List
✓ Go to Friends screen
✓ Should see "My Friends" section with friend count
✓ Should show all accepted friendships

# Test Scenario: Remove Friend
✓ Find friend in "My Friends" list
✓ Tap "Remove" button
✓ Should show confirmation alert
✓ Friend should disappear from list

# Test in Supabase:
✓ Check friendships table → Row should be deleted
```

### **5. Snap Sending & Receiving**
```bash
# Test Scenario: Send Snap to Friend
✓ Go to Camera screen
✓ Take a photo
✓ Tap send button → Should show friend selection modal
✓ Select friend(s) and send
✓ Should show success message

# Test Scenario: Receive Snap
✓ Login as recipient
✓ Go to Home screen
✓ Should see new snap with "NEW" badge
✓ Tap to view → Should open in Stories screen with timer
✓ Wait for timer or tap to close

# Test in Supabase:
✓ Check snaps table → New snap with viewed=false
✓ After viewing → viewed=true, viewed_at timestamp
```

### **6. Stories System**
```bash
# Test Scenario: Create Story
✓ Go to Camera screen
✓ Take photo → Tap "Add to Story"
✓ Should upload to stories

# Test Scenario: View Stories
✓ Go to Stories screen
✓ Should see stories from friends
✓ Tap to view with timer countdown
✓ Should track viewers

# Test in Supabase:
✓ Check stories table → New story entry
✓ Check viewers array → Should include your user ID after viewing
```

### **7. Real-time Features**
```bash
# Test Scenario: Real-time Snap Notifications
✓ Have two devices/accounts open
✓ Send snap from Device A
✓ Device B should update automatically (may need to refresh)

# Test Scenario: Pull-to-Refresh
✓ Pull down on Friends screen → Should reload friends list
✓ Pull down on Home screen → Should reload snaps
✓ Pull down on Stories screen → Should reload stories
```

## 🐛 **Common Issues & Solutions**

### **Issue: "User not found" when searching**
**Solution:** Make sure the username exists in the profiles table and search is case-insensitive.

### **Issue: Friend requests not appearing**
**Solution:** Check that the friendship row has the correct friend_id matching the logged-in user.

### **Issue: Snaps not loading**
**Solution:** Verify recipient_id in snaps table matches the user ID, and expires_at is in the future.

### **Issue: Real-time updates not working**
**Solution:** Check Supabase real-time settings and ensure subscriptions are properly set up.

## 📊 **Database Verification Queries**

Use these SQL queries in Supabase SQL Editor to verify data:

```sql
-- Check all profiles
SELECT * FROM profiles ORDER BY created_at DESC;

-- Check friendships
SELECT 
  f.*,
  u1.username as user_username,
  u2.username as friend_username
FROM friendships f
JOIN profiles u1 ON f.user_id = u1.id
JOIN profiles u2 ON f.friend_id = u2.id
ORDER BY f.created_at DESC;

-- Check snaps
SELECT 
  s.*,
  p.username as sender_name
FROM snaps s
JOIN profiles p ON s.sender_id = p.id
ORDER BY s.created_at DESC;

-- Check stories
SELECT 
  st.*,
  p.username
FROM stories st
JOIN profiles p ON st.user_id = p.id
ORDER BY st.created_at DESC;
```

## ✅ **Testing Checklist**

- [ ] User registration creates profile automatically
- [ ] Friend search works (case-insensitive)
- [ ] Friend requests can be sent
- [ ] Friend requests appear for recipients
- [ ] Friend requests can be accepted/rejected
- [ ] Friends list shows all accepted friendships
- [ ] Friends can be removed
- [ ] Snaps can be sent to friends
- [ ] Snaps appear in recipient's home screen
- [ ] Snaps can be viewed with timer
- [ ] Viewed snaps are marked as read
- [ ] Stories can be created and viewed
- [ ] Story viewers are tracked
- [ ] Real-time updates work
- [ ] Pull-to-refresh works on all screens

## 🎉 **Success Criteria**

✅ **Phase 1 Priority 1 is COMPLETE when:**
- All above tests pass
- No Firebase references remain in code
- All database operations use Supabase
- Friend system works end-to-end
- Real-time features are functional
- UI is responsive and user-friendly

## 🚀 **Next Steps**

With Priority 1 complete, you can now move to:
- **Priority 2:** Implement Real-time Updates (Enhanced)
- **Priority 3:** Add Video Recording
- **Priority 4:** Improve Disappearing Messages
- **Priority 5:** Add Group Messaging 