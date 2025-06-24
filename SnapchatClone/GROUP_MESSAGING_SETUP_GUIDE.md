# 👥 SnapConnect Group Messaging Setup Guide

## 🎯 **Overview**

This guide will help you set up and test the new group messaging functionality that's been added to SnapConnect. The group messaging system includes:

- **Create group chats** with multiple friends
- **Group conversation management** with participant tracking
- **Group message sending** with sender identification
- **Group-specific UI** with participant counts and group avatars
- **Real-time updates** for group messages and participant changes
- **Admin controls** for adding/removing participants

## 📋 **Prerequisites**

Before setting up group messaging, ensure you have:
- ✅ Completed the basic SnapConnect setup
- ✅ 1-on-1 messaging system working
- ✅ Friends system working
- ✅ Supabase database connected
- ✅ Test accounts created with multiple friends

## 🗄️ **Step 1: Database Setup**

### **Run the Group Messaging SQL Script**

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to **SQL Editor**

2. **Execute the Group Messaging Schema**
   ```sql
   -- Copy and paste the contents of: GROUP_MESSAGING_SETUP.sql
   -- This modifies existing tables and creates new group functionality
   ```

3. **Verify Tables Updated**
   - Go to **Table Editor**
   - Confirm these tables have been updated:
     - `conversations` (new columns: `is_group`, `group_name`, `group_description`, etc.)
     - `messages` (new columns: `mentions`, `reply_to_message_id`)
   - Confirm new table created:
     - `group_participants` (manages group membership)

## 🚀 **Step 2: App Features Added**

### **New Screens:**
- **CreateGroupScreen** - Create new group chats with friend selection

### **Updated Screens:**
- **ChatsListScreen** - Shows both 1-on-1 and group conversations
- **ChatScreen** - Handles both individual and group messaging

### **New Navigation Paths:**
- **ChatsListScreen → "👥 Group" button** → CreateGroupScreen
- **CreateGroupScreen → Create** → ChatScreen (group)
- **ChatScreen → Info button** → Group member list (for groups)

## 🧪 **Step 3: Testing Group Messaging**

### **Test Scenario 1: Create a Group**

1. **Switch to Alice** (using debug switcher 🔧)
2. **Go to Chats screen** (💬 from camera)
3. **Tap "👥 Group" button** in top right
4. **Enter group information:**
   - Group Name: "Test Group"
   - Description: "Testing group messaging"
5. **Select friends** (tap to select Bob and Charlie)
6. **Tap "Create"**
7. **Should navigate** to group chat screen

### **Test Scenario 2: Send Group Messages**

1. **In the group chat (as Alice):**
   - Type "Hello everyone!" and send
   - Message should appear with your name
2. **Switch to Bob:**
   - Go to Chats screen
   - Should see "Test Group" with green avatar and 👥 icon
   - Should show unread message count
   - Tap on group to enter chat
3. **Send message as Bob:**
   - Type "Hi Alice!"
   - Should see sender name "Alice" above previous message
   - Bob's message should appear without sender name (since it's yours)

### **Test Scenario 3: Real-time Group Updates**

1. **Keep Bob in group chat**
2. **Switch to Charlie** (third member)
3. **Navigate to group chat**
4. **Send message from Charlie:** "Hey team!"
5. **Bob should see** Charlie's message appear instantly
6. **Switch back to Alice** and verify all messages are visible

### **Test Scenario 4: Group UI Features**

1. **In any group chat, verify:**
   - Group name appears in header (instead of username)
   - Green group avatar with 👥 icon
   - Member count shows "3 members" in subtitle
   - Sender names appear above messages from others
   - Info button (ℹ️) shows member list when tapped

### **Test Scenario 5: Mixed Conversations**

1. **In ChatsListScreen, verify:**
   - Both 1-on-1 and group conversations appear
   - Group chats have green avatars with 👥 icon
   - Individual chats have regular blue avatars
   - Group names vs. usernames display correctly
   - Participant names show under group titles

## 🔧 **Step 4: Advanced Features**

### **Group Administration**
- Group creator becomes admin automatically
- Admins can add new members (function available)
- Members can leave groups
- Participant tracking with join/leave times

### **Group Messaging Features**
- Messages sent to groups have `receiver_id = null`
- Sender identification for group context
- Real-time participant updates
- Group-specific RLS policies

### **Database Functions Available**
- `create_group_conversation()` - Create new groups
- `add_user_to_group()` - Add members (admin only)
- `remove_user_from_group()` - Remove members
- `get_group_participants()` - Get member list
- `send_group_message()` - Send group messages

## 🎯 **Quick Test Checklist**

### **Database Tests:**
- [ ] `conversations` table has new group columns
- [ ] `group_participants` table exists
- [ ] `messages` table updated for group support
- [ ] Group RLS policies working

### **UI Tests:**
- [ ] "👥 Group" button appears in ChatsListScreen
- [ ] CreateGroupScreen loads and functions
- [ ] Group chats display with green avatars
- [ ] Sender names appear in group messages
- [ ] Group info button works

### **Functionality Tests:**
- [ ] Can create groups with multiple friends
- [ ] Group messages send and receive
- [ ] Real-time updates work for groups
- [ ] Mixed 1-on-1 and group conversations display
- [ ] Group member count displays correctly

## 🚨 **Troubleshooting**

### **Common Issues:**

1. **"Create Group" button doesn't appear**
   - Check that CreateGroupScreen is imported in App.js
   - Verify navigation setup includes CreateGroup route

2. **Group conversations don't load**
   - Check Supabase SQL logs for RLS policy errors
   - Verify group_participants table exists and has data
   - Check that user is active participant in group

3. **Group messages don't send**
   - Verify `send_group_message` function exists in database
   - Check that user has permission to send to group
   - Ensure receiver_id is null for group messages

4. **Sender names don't appear**
   - Check that `get_group_participants` function returns data
   - Verify groupParticipants state is populated
   - Ensure sender names are being looked up correctly

## ✅ **Success Indicators**

You'll know group messaging is working when:
- ✅ Can create groups with multiple friends
- ✅ Group and individual chats both appear in chat list
- ✅ Group messages show sender names
- ✅ Real-time updates work for all conversation types
- ✅ Group UI elements (green avatars, member counts) display
- ✅ Navigation between all screens works smoothly

## 🎉 **Next Steps**

With group messaging working, you can now:
- Test with larger groups (up to 50 members)
- Implement group admin features
- Add group image uploads
- Create group settings screen
- Add group notification controls
- Implement message mentions (@username) 