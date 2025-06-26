import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, RefreshControl } from 'react-native';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';

export default function AcademicCalendarScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newEvent, setNewEvent] = useState({
    title: '',
    type: 'assignment', // assignment, exam, study_session, class
    course: '',
    date: new Date(),
    time: '',
    description: '',
    priority: 'medium'
  });
  const { currentUser, supabase } = useAuth();
  const { currentTheme } = useTheme();

  useEffect(() => {
    loadAcademicEvents();
  }, [currentUser]);

  const loadAcademicEvents = async () => {
    if (!currentUser?.id) return;

    try {
      const { data: eventsData, error } = await supabase
        .from('academic_events')
        .select('*')
        .eq('user_id', currentUser.id)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching academic events:', error);
        return;
      }

      setEvents(eventsData || []);
    } catch (error) {
      console.error('Error loading academic events:', error);
    } finally {
      setLoading(false);
    }
  };

  const addAcademicEvent = async () => {
    if (!newEvent.title || !newEvent.course) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('academic_events')
        .insert([{
          user_id: currentUser.id,
          title: newEvent.title,
          type: newEvent.type,
          course: newEvent.course,
          date: newEvent.date.toISOString().split('T')[0],
          time: newEvent.time,
          description: newEvent.description,
          priority: newEvent.priority,
          created_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('Error adding event:', error);
        Alert.alert('Error', 'Failed to add event');
        return;
      }

      setShowAddEvent(false);
      setNewEvent({
        title: '',
        type: 'assignment',
        course: '',
        date: new Date(),
        time: '',
        description: '',
        priority: 'medium'
      });
      loadAcademicEvents();
      Alert.alert('Success', 'Event added successfully!');
    } catch (error) {
      console.error('Error adding academic event:', error);
      Alert.alert('Error', 'Failed to add event');
    }
  };

  const getEventTypeIcon = (type) => {
    switch (type) {
      case 'exam': return '📋';
      case 'assignment': return '📝';
      case 'study_session': return '📚';
      case 'class': return '🎓';
      default: return '📅';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return currentTheme.textSecondary;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getUpcomingEvents = () => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= today && eventDate <= nextWeek;
    });
  };

  const renderEventItem = (event) => (
    <View
      key={event.id}
      style={[{
        backgroundColor: currentTheme.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: getPriorityColor(event.priority)
      }]}
    >
      <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }]}>
        <View style={[{ flex: 1 }]}>
          <View style={[{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }]}>
            <Text style={[{ fontSize: 20, marginRight: 8 }]}>{getEventTypeIcon(event.type)}</Text>
            <Text style={[{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, flex: 1 }]}>
              {event.title}
            </Text>
          </View>
          <Text style={[{ fontSize: 16, color: currentTheme.secondary, marginBottom: 4 }]}>
            {event.course}
          </Text>
          <Text style={[{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 4 }]}>
            {formatDate(event.date)} {event.time && `at ${event.time}`}
          </Text>
          {event.description && (
            <Text style={[{ fontSize: 14, color: currentTheme.textSecondary, marginTop: 8 }]}>
              {event.description}
            </Text>
          )}
        </View>
        <View style={[{
          backgroundColor: getPriorityColor(event.priority),
          borderRadius: 8,
          paddingHorizontal: 8,
          paddingVertical: 4
        }]}>
          <Text style={[{ color: 'white', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }]}>
            {event.priority}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[{ flex: 1, backgroundColor: currentTheme.background }]}>
      {/* Header */}
      <View style={[{
        backgroundColor: currentTheme.background,
        paddingTop: 56,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: currentTheme.border
      }]}>
        <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[{ fontSize: 24, fontWeight: 'bold', color: currentTheme.primary }]}>
            📅 Academic Calendar
          </Text>
          <TouchableOpacity onPress={() => setShowAddEvent(true)}>
            <View style={[{ backgroundColor: currentTheme.primary, borderRadius: 20, padding: 8 }]}>
              <Text style={[{ color: currentTheme.background, fontSize: 20 }]}>+</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={[{ flex: 1 }]}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadAcademicEvents} />
        }
      >
        {/* Upcoming Events Section */}
        <View style={[{ marginBottom: 30 }]}>
          <Text style={[{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16 }]}>
            📌 This Week
          </Text>
          {getUpcomingEvents().length === 0 ? (
            <View style={[{
              backgroundColor: currentTheme.surface,
              borderRadius: 12,
              padding: 20,
              alignItems: 'center'
            }]}>
              <Text style={[{ fontSize: 32, marginBottom: 8 }]}>🎉</Text>
              <Text style={[{ fontSize: 18, color: currentTheme.primary, fontWeight: 'bold', marginBottom: 4 }]}>
                Looking good!
              </Text>
              <Text style={[{ color: currentTheme.textSecondary, textAlign: 'center' }]}>
                No urgent deadlines this week
              </Text>
            </View>
          ) : (
            getUpcomingEvents().map(renderEventItem)
          )}
        </View>

        {/* All Events Section */}
        <View>
          <Text style={[{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16 }]}>
            📚 All Upcoming Events
          </Text>
          {events.length === 0 ? (
            <View style={[{
              backgroundColor: currentTheme.surface,
              borderRadius: 12,
              padding: 30,
              alignItems: 'center'
            }]}>
              <Text style={[{ fontSize: 48, marginBottom: 16 }]}>📅</Text>
              <Text style={[{ fontSize: 20, color: currentTheme.primary, fontWeight: 'bold', marginBottom: 8 }]}>
                Start organizing!
              </Text>
              <Text style={[{ color: currentTheme.textSecondary, textAlign: 'center', marginBottom: 20 }]}>
                Add your exams, assignments, and study sessions to stay on track
              </Text>
              <TouchableOpacity
                style={[{
                  backgroundColor: currentTheme.primary,
                  borderRadius: 20,
                  paddingHorizontal: 24,
                  paddingVertical: 12
                }]}
                onPress={() => setShowAddEvent(true)}
              >
                <Text style={[{ color: currentTheme.background, fontWeight: 'bold' }]}>
                  Add Your First Event
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            events.map(renderEventItem)
          )}
        </View>
      </ScrollView>

      {/* Add Event Modal */}
      <Modal
        visible={showAddEvent}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[{ flex: 1, backgroundColor: currentTheme.background }]}>
          <View style={[{
            backgroundColor: currentTheme.background,
            paddingTop: 56,
            paddingBottom: 20,
            paddingHorizontal: 20,
            borderBottomWidth: 1,
            borderBottomColor: currentTheme.border
          }]}>
            <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
              <TouchableOpacity onPress={() => setShowAddEvent(false)}>
                <Text style={[{ color: currentTheme.primary, fontSize: 18 }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary }]}>
                Add Event
              </Text>
              <TouchableOpacity onPress={addAcademicEvent}>
                <Text style={[{ color: currentTheme.primary, fontSize: 18, fontWeight: 'bold' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={[{ flex: 1, padding: 20 }]}>
            <TextInput
              style={[{
                backgroundColor: currentTheme.surface,
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: currentTheme.primary,
                marginBottom: 16
              }]}
              placeholder="Event title *"
              placeholderTextColor={currentTheme.textSecondary}
              value={newEvent.title}
              onChangeText={(text) => setNewEvent({...newEvent, title: text})}
            />

            <TextInput
              style={[{
                backgroundColor: currentTheme.surface,
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: currentTheme.primary,
                marginBottom: 16
              }]}
              placeholder="Course (e.g., CHEM 101) *"
              placeholderTextColor={currentTheme.textSecondary}
              value={newEvent.course}
              onChangeText={(text) => setNewEvent({...newEvent, course: text})}
            />

            {/* Event Type Selection */}
            <Text style={[{ fontSize: 16, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 12 }]}>
              Event Type
            </Text>
            <View style={[{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }]}>
              {[
                { type: 'assignment', label: '📝 Assignment', icon: '📝' },
                { type: 'exam', label: '📋 Exam', icon: '📋' },
                { type: 'study_session', label: '📚 Study Session', icon: '📚' },
                { type: 'class', label: '🎓 Class', icon: '🎓' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.type}
                  style={[{
                    backgroundColor: newEvent.type === option.type ? currentTheme.primary : currentTheme.surface,
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    marginRight: 8,
                    marginBottom: 8
                  }]}
                  onPress={() => setNewEvent({...newEvent, type: option.type})}
                >
                  <Text style={[{
                    color: newEvent.type === option.type ? currentTheme.background : currentTheme.primary,
                    fontWeight: '600'
                  }]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Priority Selection */}
            <Text style={[{ fontSize: 16, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 12 }]}>
              Priority
            </Text>
            <View style={[{ flexDirection: 'row', marginBottom: 16 }]}>
              {[
                { priority: 'high', label: 'High', color: '#ef4444' },
                { priority: 'medium', label: 'Medium', color: '#f59e0b' },
                { priority: 'low', label: 'Low', color: '#10b981' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.priority}
                  style={[{
                    backgroundColor: newEvent.priority === option.priority ? option.color : currentTheme.surface,
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    marginRight: 8
                  }]}
                  onPress={() => setNewEvent({...newEvent, priority: option.priority})}
                >
                  <Text style={[{
                    color: newEvent.priority === option.priority ? 'white' : currentTheme.primary,
                    fontWeight: '600'
                  }]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[{
                backgroundColor: currentTheme.surface,
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: currentTheme.primary,
                marginBottom: 16
              }]}
              placeholder="Time (optional)"
              placeholderTextColor={currentTheme.textSecondary}
              value={newEvent.time}
              onChangeText={(text) => setNewEvent({...newEvent, time: text})}
            />

            <TextInput
              style={[{
                backgroundColor: currentTheme.surface,
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: currentTheme.primary,
                height: 100,
                textAlignVertical: 'top'
              }]}
              placeholder="Description (optional)"
              placeholderTextColor={currentTheme.textSecondary}
              multiline
              value={newEvent.description}
              onChangeText={(text) => setNewEvent({...newEvent, description: text})}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
} 