import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  Modal, 
  TextInput, 
  RefreshControl,
  FlatList,
  ActivityIndicator 
} from 'react-native';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../../supabaseConfig';

export default function AcademicCalendarScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const { currentUser } = useAuth();
  const { currentTheme } = useTheme();

  // Form state for new event
  const [newEvent, setNewEvent] = useState({
    title: '',
    type: 'assignment',
    course_id: '',
    date: '',
    time: '',
    priority: 'medium',
    description: '',
    location: ''
  });

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchEvents(), fetchCourses()]);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Fall back to mock data if database isn't set up
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data: eventsData, error } = await supabase
        .from('academic_events')
        .select(`
          *,
          courses (
            course_code,
            course_name
          )
        `)
        .eq('user_id', currentUser.id)
        .order('date', { ascending: true });

      if (error) throw error;
      setEvents(eventsData || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  };

  const fetchCourses = async () => {
    try {
      const { data: userCoursesData, error } = await supabase
        .from('user_courses')
        .select(`
          courses (
            id,
            course_code,
            course_name,
            credits,
            instructor,
            schedule
          )
        `)
        .eq('user_id', currentUser.id);

      if (error) throw error;
      
      const coursesData = userCoursesData?.map(uc => uc.courses) || [];
      setCourses(coursesData);
    } catch (error) {
      console.error('Error fetching courses:', error);
      throw error;
    }
  };

  const loadMockData = () => {
    const mockEvents = [
      {
        id: '1',
        title: 'Chemistry Midterm',
        type: 'exam',
        date: '2024-01-20',
        time: '2:00 PM',
        priority: 'high',
        description: 'Chapters 1-5, bring calculator',
        location: 'Science Building Room 101',
        courses: { course_code: 'CHEM 101', course_name: 'General Chemistry' }
      },
      {
        id: '2',
        title: 'Research Paper Draft',
        type: 'assignment',
        date: '2024-01-25',
        time: '11:59 PM',
        priority: 'medium',
        description: '5-page research paper on modern literature',
        location: 'Online Submission',
        courses: { course_code: 'ENG 102', course_name: 'English Composition' }
      },
      {
        id: '3',
        title: 'Study Group Session',
        type: 'study_session',
        date: '2024-01-18',
        time: '7:00 PM',
        priority: 'low',
        description: 'Review integration techniques',
        location: 'Library Study Room B',
        courses: { course_code: 'MATH 201', course_name: 'Calculus II' }
      },
      {
        id: '4',
        title: 'Physics Lab',
        type: 'class',
        date: '2024-01-22',
        time: '2:00 PM',
        priority: 'medium',
        description: 'Electricity and Magnetism Lab',
        location: 'Physics Lab Room 302',
        courses: { course_code: 'PHYS 201', course_name: 'Physics II' }
      }
    ];

    const mockCourses = [
      { id: '1', course_code: 'CHEM 101', course_name: 'General Chemistry', credits: 4, instructor: 'Dr. Smith', schedule: 'MWF 10:00-11:00' },
      { id: '2', course_code: 'ENG 102', course_name: 'English Composition', credits: 3, instructor: 'Prof. Johnson', schedule: 'TTh 1:00-2:30' },
      { id: '3', course_code: 'MATH 201', course_name: 'Calculus II', credits: 4, instructor: 'Dr. Williams', schedule: 'MWF 9:00-10:00' },
      { id: '4', course_code: 'PHYS 201', course_name: 'Physics II', credits: 4, instructor: 'Dr. Brown', schedule: 'TTh 11:00-12:30' }
    ];

    setEvents(mockEvents);
    setCourses(mockCourses);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } catch (error) {
      console.error('Error refreshing:', error);
    }
    setRefreshing(false);
  };

  const addEvent = async () => {
    if (!newEvent.title || !newEvent.date || !newEvent.time) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      // Try to add to database first
      const eventData = {
        ...newEvent,
        user_id: currentUser.id,
        course_id: newEvent.course_id || null
      };

      const { data, error } = await supabase
        .from('academic_events')
        .insert([eventData])
        .select(`
          *,
          courses (
            course_code,
            course_name
          )
        `);

      if (error) throw error;

      // Add to local state
      setEvents(prev => [...prev, data[0]]);
      setShowAddModal(false);
      resetForm();
      Alert.alert('Success', 'Event added successfully!');
    } catch (error) {
      console.error('Error adding event:', error);
      // Fall back to local addition
      const localEvent = {
        ...newEvent,
        id: Date.now().toString(),
        courses: courses.find(c => c.id === newEvent.course_id) || null
      };
      setEvents(prev => [...prev, localEvent]);
      setShowAddModal(false);
      resetForm();
      Alert.alert('Success', 'Event added locally!');
    }
  };

  const resetForm = () => {
    setNewEvent({
      title: '',
      type: 'assignment',
      course_id: '',
      date: '',
      time: '',
      priority: 'medium',
      description: '',
      location: ''
    });
  };

  const deleteEvent = async (eventId) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Try to delete from database
              const { error } = await supabase
                .from('academic_events')
                .delete()
                .eq('id', eventId);

              if (error) throw error;
            } catch (error) {
              console.error('Error deleting event:', error);
            }

            // Remove from local state regardless
            setEvents(prev => prev.filter(event => event.id !== eventId));
          }
        }
      ]
    );
  };

  const getEventTypeIcon = (type) => {
    switch (type) {
      case 'exam': return '📋';
      case 'assignment': return '📝';
      case 'study_session': return '📚';
      case 'class': return '🎓';
      case 'project': return '🔬';
      default: return '📅';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getFilteredEvents = () => {
    let filtered = events;

    if (filter !== 'all') {
      filtered = filtered.filter(event => event.type === filter);
    }

    if (selectedPriority !== 'all') {
      filtered = filtered.filter(event => event.priority === selectedPriority);
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA - dateB;
    });
  };

  const getUpcomingEvents = () => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= today && eventDate <= nextWeek;
    }).sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA - dateB;
    }).slice(0, 3);
  };

  const renderEventItem = (event) => (
    <TouchableOpacity
      key={event.id}
      style={{
        backgroundColor: currentTheme.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: getPriorityColor(event.priority),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
      }}
      onLongPress={() => deleteEvent(event.id)}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 24, marginRight: 12 }}>{getEventTypeIcon(event.type)}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 4 }}>
            {event.title}
          </Text>
          <Text style={{ fontSize: 14, color: currentTheme.secondary, textTransform: 'capitalize' }}>
            {event.type.replace('_', ' ')}
          </Text>
        </View>
        <View style={{
          backgroundColor: getPriorityColor(event.priority),
          borderRadius: 12,
          paddingHorizontal: 10,
          paddingVertical: 6
        }}>
          <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }}>
            {event.priority}
          </Text>
        </View>
      </View>

      {event.courses && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 16, color: currentTheme.secondary, fontWeight: '600' }}>
            {event.courses.course_code}
          </Text>
          <Text style={{ fontSize: 14, color: currentTheme.textSecondary, marginLeft: 8 }}>
            {event.courses.course_name}
          </Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 14, color: currentTheme.textSecondary, marginRight: 16 }}>
          📅 {formatDate(event.date)}
        </Text>
        <Text style={{ fontSize: 14, color: currentTheme.textSecondary }}>
          🕐 {event.time}
        </Text>
      </View>

      {event.location && (
        <Text style={{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 8 }}>
          📍 {event.location}
        </Text>
      )}

      {event.description && (
        <Text style={{ fontSize: 14, color: currentTheme.textSecondary }}>
          {event.description}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderAddEventModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={{ flex: 1, backgroundColor: currentTheme.background }}>
        {/* Header */}
        <View style={{
          backgroundColor: currentTheme.surface,
          paddingTop: 50,
          paddingBottom: 20,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: currentTheme.border
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary }}>
              Add Event
            </Text>
            <TouchableOpacity onPress={addEvent}>
              <Text style={{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {/* Title */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
              Event Title *
            </Text>
            <TextInput
              style={{
                backgroundColor: currentTheme.surface,
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: currentTheme.primary,
                borderWidth: 1,
                borderColor: currentTheme.border
              }}
              placeholder="Enter event title"
              placeholderTextColor={currentTheme.textSecondary}
              value={newEvent.title}
              onChangeText={(text) => setNewEvent(prev => ({ ...prev, title: text }))}
            />
          </View>

          {/* Type */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
              Event Type
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['assignment', 'exam', 'class', 'study_session', 'project'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={{
                    backgroundColor: newEvent.type === type ? currentTheme.primary : currentTheme.surface,
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    marginRight: 12,
                    borderWidth: 1,
                    borderColor: currentTheme.border
                  }}
                  onPress={() => setNewEvent(prev => ({ ...prev, type }))}
                >
                  <Text style={{
                    color: newEvent.type === type ? currentTheme.background : currentTheme.primary,
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}>
                    {getEventTypeIcon(type)} {type.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Course */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
              Course
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={{
                  backgroundColor: !newEvent.course_id ? currentTheme.primary : currentTheme.surface,
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  marginRight: 12,
                  borderWidth: 1,
                  borderColor: currentTheme.border
                }}
                onPress={() => setNewEvent(prev => ({ ...prev, course_id: '' }))}
              >
                <Text style={{
                  color: !newEvent.course_id ? currentTheme.background : currentTheme.primary,
                  fontWeight: '600'
                }}>
                  None
                </Text>
              </TouchableOpacity>
              {courses.map((course) => (
                <TouchableOpacity
                  key={course.id}
                  style={{
                    backgroundColor: newEvent.course_id === course.id ? currentTheme.primary : currentTheme.surface,
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    marginRight: 12,
                    borderWidth: 1,
                    borderColor: currentTheme.border
                  }}
                  onPress={() => setNewEvent(prev => ({ ...prev, course_id: course.id }))}
                >
                  <Text style={{
                    color: newEvent.course_id === course.id ? currentTheme.background : currentTheme.primary,
                    fontWeight: '600'
                  }}>
                    {course.course_code}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Date */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
              Date *
            </Text>
            <TextInput
              style={{
                backgroundColor: currentTheme.surface,
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: currentTheme.primary,
                borderWidth: 1,
                borderColor: currentTheme.border
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={currentTheme.textSecondary}
              value={newEvent.date}
              onChangeText={(text) => setNewEvent(prev => ({ ...prev, date: text }))}
            />
          </View>

          {/* Time */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
              Time *
            </Text>
            <TextInput
              style={{
                backgroundColor: currentTheme.surface,
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: currentTheme.primary,
                borderWidth: 1,
                borderColor: currentTheme.border
              }}
              placeholder="e.g., 2:00 PM"
              placeholderTextColor={currentTheme.textSecondary}
              value={newEvent.time}
              onChangeText={(text) => setNewEvent(prev => ({ ...prev, time: text }))}
            />
          </View>

          {/* Priority */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
              Priority
            </Text>
            <View style={{ flexDirection: 'row' }}>
              {['low', 'medium', 'high'].map((priority) => (
                <TouchableOpacity
                  key={priority}
                  style={{
                    backgroundColor: newEvent.priority === priority ? getPriorityColor(priority) : currentTheme.surface,
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    marginRight: 12,
                    borderWidth: 1,
                    borderColor: currentTheme.border,
                    flex: 1,
                    alignItems: 'center'
                  }}
                  onPress={() => setNewEvent(prev => ({ ...prev, priority }))}
                >
                  <Text style={{
                    color: newEvent.priority === priority ? 'white' : currentTheme.primary,
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}>
                    {priority}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
              Location
            </Text>
            <TextInput
              style={{
                backgroundColor: currentTheme.surface,
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: currentTheme.primary,
                borderWidth: 1,
                borderColor: currentTheme.border
              }}
              placeholder="Enter location"
              placeholderTextColor={currentTheme.textSecondary}
              value={newEvent.location}
              onChangeText={(text) => setNewEvent(prev => ({ ...prev, location: text }))}
            />
          </View>

          {/* Description */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
              Description
            </Text>
            <TextInput
              style={{
                backgroundColor: currentTheme.surface,
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: currentTheme.primary,
                borderWidth: 1,
                borderColor: currentTheme.border,
                minHeight: 100
              }}
              placeholder="Enter description"
              placeholderTextColor={currentTheme.textSecondary}
              value={newEvent.description}
              onChangeText={(text) => setNewEvent(prev => ({ ...prev, description: text }))}
              multiline
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: currentTheme.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={currentTheme.primary} />
        <Text style={{ color: currentTheme.textSecondary, marginTop: 16, fontSize: 16 }}>
          Loading your calendar...
        </Text>
      </View>
    );
  }

  const upcomingEvents = getUpcomingEvents();
  const filteredEvents = getFilteredEvents();

  return (
    <View style={{ flex: 1, backgroundColor: currentTheme.background }}>
      {/* Header */}
      <View style={{
        backgroundColor: currentTheme.surface,
        paddingTop: 56,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: currentTheme.border
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }}>← Back</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: currentTheme.primary }}>
            📅 Academic Calendar
          </Text>
          <TouchableOpacity 
            onPress={() => setShowAddModal(true)}
            style={{ backgroundColor: currentTheme.primary, borderRadius: 20, padding: 8 }}
          >
            <Text style={{ color: currentTheme.background, fontSize: 20 }}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[currentTheme.primary]}
            tintColor={currentTheme.primary}
          />
        }
      >
        {/* Quick Stats */}
        <View style={{ flexDirection: 'row', marginBottom: 30 }}>
          <View style={{
            backgroundColor: currentTheme.surface,
            borderRadius: 16,
            padding: 16,
            flex: 1,
            marginRight: 8,
            alignItems: 'center'
          }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: currentTheme.primary }}>
              {events.length}
            </Text>
            <Text style={{ fontSize: 14, color: currentTheme.textSecondary }}>Total Events</Text>
          </View>
          <View style={{
            backgroundColor: currentTheme.surface,
            borderRadius: 16,
            padding: 16,
            flex: 1,
            marginLeft: 8,
            alignItems: 'center'
          }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#ef4444' }}>
              {events.filter(e => e.priority === 'high').length}
            </Text>
            <Text style={{ fontSize: 14, color: currentTheme.textSecondary }}>High Priority</Text>
          </View>
        </View>

        {/* Upcoming This Week */}
        {upcomingEvents.length > 0 && (
          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16 }}>
              📌 Upcoming This Week
            </Text>
            {upcomingEvents.map(renderEventItem)}
          </View>
        )}

        {/* Filters */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 12 }}>
            Filter Events
          </Text>
          
          {/* Type Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {['all', 'assignment', 'exam', 'class', 'study_session', 'project'].map((type) => (
              <TouchableOpacity
                key={type}
                style={{
                  backgroundColor: filter === type ? currentTheme.primary : currentTheme.surface,
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  marginRight: 12,
                  borderWidth: 1,
                  borderColor: currentTheme.border
                }}
                onPress={() => setFilter(type)}
              >
                <Text style={{
                  color: filter === type ? currentTheme.background : currentTheme.primary,
                  fontWeight: '600',
                  textTransform: 'capitalize'
                }}>
                  {type === 'all' ? 'All' : `${getEventTypeIcon(type)} ${type.replace('_', ' ')}`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Priority Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['all', 'high', 'medium', 'low'].map((priority) => (
              <TouchableOpacity
                key={priority}
                style={{
                  backgroundColor: selectedPriority === priority ? 
                    (priority === 'all' ? currentTheme.primary : getPriorityColor(priority)) : 
                    currentTheme.surface,
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  marginRight: 12,
                  borderWidth: 1,
                  borderColor: currentTheme.border
                }}
                onPress={() => setSelectedPriority(priority)}
              >
                <Text style={{
                  color: selectedPriority === priority ? 'white' : currentTheme.primary,
                  fontWeight: '600',
                  textTransform: 'capitalize'
                }}>
                  {priority === 'all' ? 'All Priorities' : `${priority} Priority`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* All Events */}
        <View style={{ marginBottom: 30 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16 }}>
            📚 All Events ({filteredEvents.length})
          </Text>
          {filteredEvents.length > 0 ? (
            filteredEvents.map(renderEventItem)
          ) : (
            <View style={{
              backgroundColor: currentTheme.surface,
              borderRadius: 16,
              padding: 30,
              alignItems: 'center'
            }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>📅</Text>
              <Text style={{ fontSize: 18, color: currentTheme.primary, fontWeight: 'bold', marginBottom: 8 }}>
                No Events Found
              </Text>
              <Text style={{ color: currentTheme.textSecondary, textAlign: 'center' }}>
                {filter === 'all' && selectedPriority === 'all' 
                  ? 'Add your first academic event to get started!'
                  : 'Try adjusting your filters to see more events.'}
              </Text>
            </View>
          )}
        </View>

        {/* Course Overview */}
        {courses.length > 0 && (
          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16 }}>
              📖 Your Courses
            </Text>
            {courses.map((course) => (
              <View
                key={course.id}
                style={{
                  backgroundColor: currentTheme.surface,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: currentTheme.border
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 4 }}>
                  {course.course_code} - {course.course_name}
                </Text>
                <Text style={{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 2 }}>
                  {course.credits} credits • {course.instructor}
                </Text>
                <Text style={{ fontSize: 14, color: currentTheme.textSecondary }}>
                  {course.schedule}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {renderAddEventModal()}
    </View>
  );
} 