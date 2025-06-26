# Academic Calendar & Campus Features Setup Guide

This guide explains how to set up and use the new college-focused features in SnapConnect: Academic Calendar Integration and Campus-Specific Features.

## 🎯 Features Overview

### 📅 Academic Calendar
- **Personal Academic Events**: Track assignments, exams, study sessions, and classes
- **Priority System**: High, medium, and low priority categorization
- **Course Integration**: Link events to specific courses
- **Smart Reminders**: Upcoming deadline notifications
- **Weekly Overview**: See what's coming up this week

### 🏫 Campus Features
- **Dining Hall Status**: Real-time crowd levels, wait times, and menu information
- **Library Seat Finder**: Available seats, quiet levels, and amenities
- **Campus Events**: University events with RSVP functionality
- **Location-Based Services**: Campus-specific information

## 🔧 Setup Instructions

### 1. Database Setup

Run the SQL script in your Supabase dashboard:

```bash
# Copy and run the ACADEMIC_CAMPUS_SETUP.sql file in your Supabase SQL editor
```

This creates the following tables:
- `academic_events` - Personal academic calendar entries
- `campus_events` - University-wide events
- `event_rsvps` - Event registration tracking
- `dining_halls` - Campus dining information
- `libraries` - Library information and seat availability
- `study_groups` - Student study group organization
- `courses` - Course catalog and information
- `user_courses` - Student course enrollments

### 2. Profile Updates

Update user profiles to include university information:
- University name
- Graduation year
- Major
- Class year (freshman, sophomore, etc.)

### 3. Sample Data

The setup script includes sample data for:
- ✅ Campus events (Career Fair, Study Groups, Social Events)
- ✅ Dining halls with real-time status
- ✅ Libraries with seat availability
- ✅ Course catalog

## 📱 How to Use

### Academic Calendar

#### Adding Events
1. Navigate to **📅 Academic Calendar**
2. Tap the **+** button
3. Fill in event details:
   - Title (required)
   - Course (required)
   - Event type (Assignment, Exam, Study Session, Class)
   - Priority level
   - Date and time
   - Description

#### Viewing Events
- **This Week**: Shows urgent upcoming events
- **All Events**: Complete list of future academic events
- **Priority Indicators**: Color-coded priority levels
  - 🔴 High Priority (Red)
  - 🟡 Medium Priority (Yellow)
  - 🟢 Low Priority (Green)

### Campus Features

#### Dining Halls Tab
- **Status**: Open/Closed indicator
- **Crowd Level**: Live crowd status with color coding
  - 🟢 Low (Green)
  - 🟡 Medium (Yellow)
  - 🔴 High (Red)
- **Wait Times**: Estimated wait times
- **Menu**: Today's featured items
- **Ratings**: Student review ratings

#### Libraries Tab
- **Seat Availability**: Real-time available seats with progress bar
- **Quiet Levels**: Silent, Moderate, or Collaborative
- **Amenities**: WiFi, power outlets, study rooms, etc.
- **Hours**: Operating hours
- **Floors**: Number of floors available

#### Campus Events Tab
- **Event Types**: Academic, Social, Career, Sports, Cultural
- **Event Details**: Date, time, location, description
- **RSVP System**: Register for events
- **Attendance**: See how many people are attending
- **Organizer**: See who's hosting the event

## 🎨 Features for College Students

### Academic Focus
- **Course Integration**: Link all activities to specific courses
- **Semester Planning**: Long-term academic calendar management
- **Study Group Formation**: Find and organize study groups
- **Grade Tracking**: Monitor academic performance

### Social Integration
- **Campus Community**: Connect with students at your university
- **Event Discovery**: Find relevant campus activities
- **RSVP System**: Coordinate attendance with friends
- **Real-time Updates**: Live campus information

### Practical Tools
- **Dining Optimization**: Avoid crowded dining halls
- **Study Space Finding**: Locate quiet study spots
- **Schedule Coordination**: Plan around class schedules
- **Campus Navigation**: Know what's happening where

## 🔒 Privacy & Security

### Data Protection
- **Personal Events**: Only you can see your academic calendar
- **University Scoped**: Campus data filtered by your university
- **RSVP Privacy**: Control who sees your event attendance
- **Academic Information**: Secure handling of course data

### Row Level Security (RLS)
- ✅ Academic events: User-specific access only
- ✅ Campus events: Public read access
- ✅ RSVPs: User manages their own registrations
- ✅ Dining/Library data: Public campus information

## 🚀 Advanced Features (Future)

### AI-Powered Recommendations
- **Study Time Optimization**: AI suggests best study times
- **Event Matching**: Recommend events based on interests
- **Course Planning**: Smart course selection assistance
- **Social Matching**: Connect with compatible study partners

### Integration Possibilities
- **University Calendar Sync**: Import official academic calendars
- **Course Management Systems**: Connect with LMS platforms
- **Campus Services API**: Real-time dining and library data
- **Weather Integration**: Campus activity recommendations

## 📊 Analytics & Insights

### For Students
- Study pattern analysis
- Academic performance tracking
- Campus engagement metrics
- Social connection insights

### For Universities
- Campus space utilization
- Event attendance patterns
- Student engagement data
- Service optimization insights

## 🛠️ Technical Implementation

### React Native Components
- `AcademicCalendarScreen.js` - Academic calendar interface
- `CampusScreen.js` - Campus features with tabbed interface
- Modal-based event creation
- Real-time data updates with Supabase

### Database Architecture
- Normalized schema for academic and campus data
- UUID primary keys for security
- JSONB for flexible data storage
- Automated timestamp management

### Real-time Features
- Supabase real-time subscriptions
- Live updates for dining hall status
- Dynamic library seat availability
- Event attendance tracking

## 🔄 Regular Updates

### Automated Updates
- Dining hall crowd levels (hourly)
- Library seat availability (every 15 minutes)
- Campus event notifications
- Academic deadline reminders

### Manual Updates
- Course catalog updates (per semester)
- Campus facility information
- Event calendar maintenance
- User preference updates

## 📞 Support & Feedback

For technical issues or feature requests:
1. Check the troubleshooting section
2. Review database logs in Supabase
3. Test with sample data first
4. Submit feedback through the app

## 🎓 Best Practices

### For Students
- Keep academic calendar updated
- Set appropriate priority levels
- RSVP to events early
- Check dining status before going
- Reserve library seats in advance

### For Developers
- Regular database maintenance
- Monitor real-time performance
- Update sample data seasonally
- Test with multiple universities
- Implement proper error handling

---

**Note**: This is a complete implementation ready for college campuses. The features are designed specifically for the unique needs of college students, combining academic management with social discovery and campus navigation. 