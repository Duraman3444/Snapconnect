# 💬 SnapConnect Messaging System Setup Guide

## 🎯 **Overview**

This guide will help you set up and test the new traditional text messaging system that's been added to SnapConnect. The messaging system includes:

- **Real-time chat** between friends
- **Conversation management** with read receipts
- **Message history** with timestamps
- **Modern chat UI** with message bubbles
- **Integration with existing friend system**

## 📋 **Prerequisites**

Before setting up the messaging system, ensure you have:
- ✅ Completed the basic SnapConnect setup
- ✅ Friends system working (from previous setup)
- ✅ Supabase database connected
- ✅ Test accounts created and friends added

## 🗄️ **Step 1: Database Setup**

### **Run the Messaging System SQL Script**

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to **SQL Editor**

2. **Execute the Messaging Schema**
   ```sql
   -- Copy and paste the contents of: messaging-system-setup.sql
   -- This creates the conversations and messages tables with proper RLS policies
   ```

3. **Verify Tables Created**
   - Go to **Table Editor**
   - Confirm these new tables exist:
     - `conversations` (stores chat conversations between users)
     - `messages` (stores individual text messages)

## 🚀 **Step 2: App Navigation**

The messaging system has been integrated into the main navigation:

### **New Screens Added:**
- **ChatsListScreen** - Shows all conversations
- **ChatScreen** - Individual chat interface

### **New Navigation Paths:**
- **Camera → 💬 button** → ChatsListScreen
- **Friends → 💬 Message button** → ChatScreen (direct)
- **ChatsListScreen → Conversation** → ChatScreen

## 🧪 **Step 3: Testing the Messaging System**

### **Test Scenario 1: Start a New Chat**

1. **Switch to Alice** (using debug switcher 🔧)
2. **Go to Friends screen**
3. **Find Bob** in your friends list
4. **Tap "💬 Message"** button next to Bob
5. **Should navigate** to ChatScreen with Bob
6. **Type a message** and hit send
7. **Message should appear** in blue bubble on right side

### **Test Scenario 2: Receive Messages**

1. **Switch to Bob** (using debug switcher)
2. **Go to Camera screen**
3. **Tap 💬 button** in top left
4. **Should see ChatsListScreen** with Alice's conversation
5. **Should show unread message count** (red badge)
6. **Tap on Alice's conversation**
7. **Should see Alice's message** in gray bubble on left side

### **Test Scenario 3: Real-time Messaging**

1. **Keep Bob's chat with Alice open**
2. **In another window/device, switch to Alice**
3. **Open chat with Bob**
4. **Send message from Alice**
5. **Bob should receive instantly** (real-time update)
6. **Message should appear immediately** without refresh

### **Test Scenario 4: Conversation Management**

1. **Switch to Alice**
2. **Go to ChatsListScreen** (💬 from camera)
3. **Should see conversation with Bob**
4. **Should show last message preview**
5. **Should show timestamp** (e.g., "2h ago", "Yesterday")
6. **Pull to refresh** should update conversations

## 🔧 **Step 4: Advanced Features**

### **Read Receipts**
- Messages are automatically marked as read when viewing chat
- Unread count shows in ChatsListScreen
- Real-time updates when messages are read

### **Message Timestamps**
- Grouped by time (shows timestamp every 5 minutes)
- Smart formatting: "Just now", "2h ago", "Yesterday"
- Full date for older messages

### **Keyboard Handling**
- Proper keyboard avoidance on iOS/Android
- Auto-scroll to bottom when typing
- Multi-line message support

## 🎯 **Quick Test Checklist**

### **Database Tests:**
- [ ] `conversations` table exists
- [ ] `messages` table exists
- [ ] RLS policies working (users can only see their chats)
- [ ] Database functions working (`get_or_create_conversation`)

### **UI/Navigation Tests:**
- [ ] 💬 button appears in Camera screen header
- [ ] ChatsListScreen loads without errors
- [ ] ChatScreen loads with proper header
- [ ] "💬 Message" button appears next to friends
- [ ] Navigation between screens works smoothly

### **Messaging Tests:**
- [ ] Can send text messages
- [ ] Messages appear in correct bubbles (blue=sent, gray=received)
- [ ] Real-time messaging works between accounts
- [ ] Message timestamps display correctly
- [ ] Conversation list updates with latest messages
- [ ] Unread message counts work
- [ ] Pull-to-refresh works in ChatsListScreen

### **Edge Cases:**
- [ ] Empty conversation shows "Start the conversation" message
- [ ] Long messages wrap properly in bubbles
- [ ] Keyboard doesn't cover message input
- [ ] App handles network errors gracefully
- [ ] No duplicate conversations created

## 🛠️ **Troubleshooting**

### **Issue: "Failed to start chat"**
- **Check:** Database functions are properly created
- **Fix:** Re-run the messaging-system-setup.sql script

### **Issue: Messages not appearing**
- **Check:** Real-time subscriptions are working
- **Fix:** Verify Supabase project settings allow real-time
- **Debug:** Check console logs for Supabase connection errors

### **Issue: Can't see conversations**
- **Check:** RLS policies allow users to see their conversations
- **Fix:** Verify the conversation involves the current user
- **Debug:** Check Supabase logs for policy violations

### **Issue: Chat button doesn't work**
- **Check:** Navigation is properly set up in App.js
- **Fix:** Verify ChatScreen and ChatsListScreen are imported
- **Debug:** Check if the screen names match in navigation calls

## 📱 **Using the Messaging System**

### **For Users:**
1. **Start chat from Friends:** Find friend → Tap "💬 Message"
2. **View all chats:** Camera → 💬 button → See all conversations
3. **Send messages:** Type in input box → Tap ➤ to send
4. **Real-time updates:** Messages appear instantly
5. **Read receipts:** Unread counts update automatically

### **Key Features:**
- **Smart UI:** Modern chat bubbles with proper alignment
- **Real-time:** Instant message delivery and read receipts  
- **Responsive:** Works on different screen sizes
- **Integrated:** Seamlessly works with existing friend system

## 🎉 **Success Criteria**

✅ **Messaging system is working when:**
- Users can start chats from the Friends screen
- Real-time messaging works between test accounts
- ChatsListScreen shows all conversations with previews
- Messages display with proper formatting and timestamps
- Read receipts and unread counts work correctly
- Navigation between screens is smooth
- Database properly stores and retrieves messages

## 🔄 **Next Steps**

After the messaging system is working:
1. **Test with multiple users** for group chat scenarios
2. **Add image messaging** (extend message_type support)
3. **Add message reactions** and more interactive features
4. **Implement push notifications** for offline messages
5. **Add message search** functionality

---

## 🆘 **Quick Debug Commands**

### **Check Database:**
```sql
-- See all conversations
SELECT * FROM conversations ORDER BY last_message_at DESC;

-- See all messages
SELECT * FROM messages ORDER BY created_at DESC LIMIT 20;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename IN ('conversations', 'messages');
```

### **Test Real-time:**
```javascript
// In browser console, test Supabase connection
console.log('Supabase URL:', supabase.supabaseUrl);
console.log('Supabase Key:', supabase.supabaseKey);
```

Happy messaging! 💬✨ 