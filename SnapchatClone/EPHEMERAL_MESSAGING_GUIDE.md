# 👻 SnapConnect Ephemeral Messaging Setup Guide

## 🎯 **Overview**

This guide will help you set up the new **Ephemeral Messaging** feature in SnapConnect, which works just like Snapchat! Messages now:

- **Disappear after 24 hours** automatically ⏰
- **Disappear when viewed** by the recipient 👀
- **Show countdown timers** for remaining time ⏱️
- **Visual indicators** for ephemeral vs regular messages 👻💬
- **Toggle between modes** within conversations 🔄

## 📋 **Prerequisites**

Before setting up ephemeral messaging, ensure you have:
- ✅ Completed the basic SnapConnect messaging system setup
- ✅ Supabase database connected and working
- ✅ Current messaging system functioning properly
- ✅ Test accounts created for testing

## 🗄️ **Step 1: Database Setup**

### **Run the Ephemeral Messaging SQL Script**

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to **SQL Editor**

2. **Execute the Ephemeral Messaging Schema**
   ```sql
   -- Copy and paste the contents of: EPHEMERAL_MESSAGING_SETUP.sql
   -- This adds ephemeral functionality to your existing messages table
   ```

3. **Verify New Columns Added**
   - Go to **Table Editor** → **messages**
   - Confirm these new columns exist:
     - `is_ephemeral` (BOOLEAN, defaults to TRUE)
     - `expires_at` (TIMESTAMP WITH TIME ZONE)
     - `viewed_at` (TIMESTAMP WITH TIME ZONE)
     - `auto_delete_at` (TIMESTAMP WITH TIME ZONE)

## 🚀 **Step 2: New Features Overview**

### **🔥 Key Features Added:**

1. **Ephemeral Mode Toggle**
   - 👻 icon in chat header = Ephemeral mode ON
   - 💬 icon in chat header = Regular mode ON
   - Tap to switch between modes

2. **Message Expiration**
   - All ephemeral messages expire in **24 hours**
   - Real-time countdown shows remaining time
   - Format: "23h 45m", "2h 30m", "45s"

3. **View-to-Delete**
   - **Received ephemeral messages** disappear when tapped
   - **Sent ephemeral messages** disappear when recipient views them
   - Immediate deletion after viewing

4. **Visual Indicators**
   - **Border around ephemeral messages** (colored outline)
   - **👻 Disappears** label on ephemeral messages
   - **Countdown timer** showing time remaining
   - **Different placeholder text** for ephemeral mode

5. **Automatic Cleanup**
   - Database automatically removes expired messages
   - Real-time removal from chat when deleted
   - No manual cleanup required

## 🧪 **Step 3: Testing the Ephemeral Messaging**

### **Test Scenario 1: Send Ephemeral Message**

1. **Switch to Alice** (using debug switcher 🔧)
2. **Open chat with Bob**
3. **Verify ephemeral mode is ON** (👻 icon in header)
4. **Send message**: "This will disappear! 👻"
5. **Should see**:
   - Blue bubble with colored border
   - "👻 Disappears" label
   - Countdown timer (e.g., "23h 59m")

### **Test Scenario 2: Receive and View Ephemeral Message**

1. **Switch to Bob**
2. **Open chat with Alice**
3. **Should see Alice's message** with:
   - Gray bubble with colored border
   - "👻 Disappears" label
   - Countdown timer
4. **Tap the message** to view it
5. **Message should disappear immediately** 💨

### **Test Scenario 3: 24-Hour Auto-Deletion**

1. **Send ephemeral message from Alice**
2. **Don't let Bob view it**
3. **Wait or simulate 24 hours passing**
4. **Message should auto-delete** from both sides

### **Test Scenario 4: Toggle Between Modes**

1. **In any chat, tap the 👻/💬 icon** in header
2. **Mode should switch**:
   - 👻 → 💬 (Ephemeral to Regular)
   - 💬 → 👻 (Regular to Ephemeral)
3. **Send messages in different modes**
4. **Verify behavior**:
   - Regular messages: No border, no timer, don't disappear
   - Ephemeral messages: Border, timer, disappear when viewed

### **Test Scenario 5: Real-time Countdown**

1. **Send ephemeral message**
2. **Watch the countdown timer**
3. **Should update every second**:
   - "23h 59m 45s" → "23h 59m 44s" → etc.
4. **Timer should be accurate** and count down in real-time

## 🎯 **Quick Test Checklist**

### **Database Tests:**
- [ ] New columns added to `messages` table
- [ ] Trigger sets expiration time automatically
- [ ] Function `get_active_messages` works
- [ ] Function `mark_message_viewed` works
- [ ] Function `cleanup_expired_messages` works
- [ ] RLS policies updated for ephemeral messages

### **UI/UX Tests:**
- [ ] 👻/💬 toggle button appears in chat header
- [ ] Ephemeral mode toggle works
- [ ] Ephemeral messages have colored borders
- [ ] "👻 Disappears" label shows on ephemeral messages
- [ ] Countdown timer displays and updates
- [ ] Different placeholder text in ephemeral mode
- [ ] Empty state shows different message for ephemeral mode

### **Functionality Tests:**
- [ ] Ephemeral messages auto-expire in 24 hours
- [ ] Received ephemeral messages disappear when tapped
- [ ] Sent ephemeral messages disappear when viewed by recipient
- [ ] Real-time countdown timer works
- [ ] Messages removed from chat in real-time when deleted
- [ ] Regular messages work normally (don't disappear)
- [ ] Database cleanup function removes expired messages

### **Edge Cases:**
- [ ] Switching modes mid-conversation works
- [ ] App handles network errors gracefully
- [ ] Expired messages don't show up when reopening chat
- [ ] Timers continue accurately across app restarts
- [ ] Multiple ephemeral messages handle correctly

## 🛠️ **Troubleshooting**

### **Issue: "Ephemeral messages not expiring"**
- **Check:** Database trigger is properly created
- **Fix:** Re-run the EPHEMERAL_MESSAGING_SETUP.sql script
- **Debug:** Check if `expires_at` and `auto_delete_at` are being set

### **Issue: "Messages not disappearing when viewed"**
- **Check:** `mark_message_viewed` function exists and works
- **Fix:** Verify RLS policies allow DELETE operations
- **Debug:** Check console logs for function call errors

### **Issue: "Countdown timer not updating"**
- **Check:** Timer intervals are being set up correctly
- **Fix:** Verify message loading includes timer setup
- **Debug:** Check for JavaScript timer cleanup issues

### **Issue: "Toggle button not working"**
- **Check:** State management for `ephemeralMode`
- **Fix:** Verify `setEphemeralMode` function calls
- **Debug:** Check if toggle affects message sending

### **Issue: "Database cleanup not working"**
- **Check:** `cleanup_expired_messages` function permissions
- **Fix:** Run cleanup manually via SQL editor
- **Debug:** Check for expired messages in database

## 📱 **Using Ephemeral Messaging**

### **For Users:**

1. **Start Ephemeral Chat:**
   - Open any conversation
   - Ensure 👻 icon is showing in header
   - Send message - it will disappear!

2. **Switch Modes:**
   - Tap 👻 icon to switch to regular messages 💬
   - Tap 💬 icon to switch to ephemeral messages 👻
   - Current mode shown in header

3. **View Ephemeral Messages:**
   - **Received messages**: Tap to view and delete
   - **Sent messages**: Disappear when recipient views
   - Watch countdown timer for auto-deletion

4. **Message Indicators:**
   - **Border**: Message is ephemeral
   - **👻 Disappears**: Ephemeral message label
   - **Timer**: Time remaining before auto-deletion
   - **No border**: Regular message (won't disappear)

### **Key Behaviors:**

- **Default mode**: Ephemeral (👻) - like Snapchat
- **24-hour rule**: All ephemeral messages auto-delete
- **View-to-delete**: Tap received ephemeral messages to delete
- **Real-time**: Changes happen instantly across devices
- **Visual feedback**: Clear indicators for message type and status

## 🔄 **Advanced Features**

### **Database Functions Available:**

```sql
-- Get active (non-expired) messages for a conversation
SELECT * FROM get_active_messages('conversation-uuid', 'user-uuid');

-- Mark message as viewed (deletes ephemeral messages)
SELECT mark_message_viewed('message-uuid', 'viewer-uuid');

-- Clean up expired messages
SELECT cleanup_expired_messages();

-- Get ephemeral messaging statistics
SELECT * FROM get_ephemeral_stats();
```

### **Customization Options:**

1. **Change expiration time**: Modify `INTERVAL '24 hours'` in trigger
2. **Add message categories**: Extend `message_type` handling
3. **Custom deletion rules**: Modify `mark_message_viewed` function
4. **Batch operations**: Use utility functions for cleanup

## 🎉 **Success Criteria**

✅ **Ephemeral messaging is working when:**
- Users can toggle between ephemeral and regular modes
- Ephemeral messages show visual indicators (border, ghost icon, timer)
- Received ephemeral messages disappear when tapped
- Messages auto-delete after 24 hours
- Countdown timers update in real-time
- Regular messages continue to work normally
- Real-time deletions work across devices
- Database cleanup removes expired messages

## 🔄 **Next Steps**

After ephemeral messaging is working:
1. **Add screenshot detection** (requires native modules)
2. **Implement message reactions** for ephemeral messages
3. **Add ephemeral image messages** (photos that disappear)
4. **Create ephemeral group chats** 
5. **Add message replay** (view once more before deletion)
6. **Implement Snapchat Stories** with similar ephemeral behavior

---

## 🆘 **Quick Debug Commands**

### **Check Database:**
```sql
-- See ephemeral message structure
SELECT id, content, is_ephemeral, expires_at, viewed_at, 
       EXTRACT(EPOCH FROM (expires_at - NOW())) as seconds_remaining
FROM messages 
WHERE is_ephemeral = TRUE 
ORDER BY created_at DESC;

-- Check active messages function
SELECT * FROM get_active_messages('your-conversation-id', 'your-user-id');

-- Manual cleanup
SELECT cleanup_expired_messages();

-- Statistics
SELECT * FROM get_ephemeral_stats();
```

### **Test Real-time:**
```javascript
// In browser console, test message deletion
console.log('Testing ephemeral message deletion...');

// Check if messages have proper timer data
console.log('Messages with timers:', messages.filter(m => m.time_remaining_seconds));
```

### **Check Performance:**
```sql
-- Check indexes are being used
EXPLAIN ANALYZE SELECT * FROM messages WHERE is_ephemeral = TRUE AND expires_at < NOW();

-- Check policy performance
EXPLAIN ANALYZE SELECT * FROM messages WHERE conversation_id = 'test-id';
```

---

## 🚨 **Important Notes**

1. **Default Behavior**: All new messages are ephemeral by default (like Snapchat)
2. **Database Cleanup**: Expired messages are automatically removed
3. **Privacy**: Viewed ephemeral messages are permanently deleted
4. **Performance**: Indexes are optimized for ephemeral message queries
5. **Real-time**: All changes sync instantly across devices

Happy disappearing! 👻✨

---

### 📞 **Support**

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all SQL scripts ran successfully
3. Test with simple scenarios first
4. Check browser/app console for errors
5. Verify Supabase real-time subscriptions are working

The ephemeral messaging system brings true Snapchat-like functionality to your app! 🎉 