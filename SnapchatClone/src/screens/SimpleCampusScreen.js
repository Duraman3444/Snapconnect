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
  ActivityIndicator,
  FlatList 
} from 'react-native';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../../supabaseConfig';

export default function CampusScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('dining');
  const [diningHalls, setDiningHalls] = useState([]);
  const [libraries, setLibraries] = useState([]);
  const [events, setEvents] = useState([]);
  const [studyGroups, setStudyGroups] = useState([]);
  const [rsvps, setRsvps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState('event');
  const { currentUser } = useAuth();
  const { currentTheme } = useTheme();

  // Form state for creating new items
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    max_participants: '',
    type: 'academic'
  });

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchDiningHalls(),
        fetchLibraries(), 
        fetchEvents(),
        fetchStudyGroups(),
        fetchRsvps()
      ]);
    } catch (error) {
      console.error('Error fetching campus data:', error);
      // Fall back to mock data if database isn't set up
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const fetchDiningHalls = async () => {
    try {
      const { data, error } = await supabase
        .from('dining_halls')
        .select('*')
        .order('name');

      if (error) throw error;
      setDiningHalls(data || []);
    } catch (error) {
      console.error('Error fetching dining halls:', error);
      throw error;
    }
  };

  const fetchLibraries = async () => {
    try {
      const { data, error } = await supabase
        .from('libraries')
        .select('*')
        .order('name');

      if (error) throw error;
      setLibraries(data || []);
    } catch (error) {
      console.error('Error fetching libraries:', error);
      throw error;
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('campus_events')
        .select('*')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  };

  const fetchStudyGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('study_groups')
        .select('*')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;
      setStudyGroups(data || []);
    } catch (error) {
      console.error('Error fetching study groups:', error);
      throw error;
    }
  };

  const fetchRsvps = async () => {
    try {
      const { data, error } = await supabase
        .from('event_rsvps')
        .select('event_id')
        .eq('user_id', currentUser.id);

      if (error) throw error;
      setRsvps(data?.map(r => r.event_id) || []);
    } catch (error) {
      console.error('Error fetching RSVPs:', error);
      throw error;
    }
  };

  const loadMockData = () => {
    const mockDiningHalls = [
      {
        id: 1,
        name: "Student Union Food Court",
        status: "open",
        crowd_level: "medium",
        hours: "7:00 AM - 10:00 PM",
        menu_today: "Pizza, Burgers, Salads, Asian Cuisine",
        wait_time: "5-10 min",
        rating: 4.2,
        location: "Student Union Building",
        price_range: "$8-15"
      },
      {
        id: 2,
        name: "North Campus Dining Hall",
        status: "open",
        crowd_level: "high",
        hours: "7:00 AM - 9:00 PM",
        menu_today: "All-you-can-eat buffet, Grill, Vegetarian Options",
        wait_time: "15-20 min",
        rating: 4.5,
        location: "North Campus",
        price_range: "$12-18"
      },
      {
        id: 3,
        name: "Coffee Corner",
        status: "open",
        crowd_level: "low",
        hours: "6:00 AM - 11:00 PM",
        menu_today: "Coffee, Pastries, Light Snacks",
        wait_time: "2-5 min",
        rating: 4.0,
        location: "Library Ground Floor",
        price_range: "$3-8"
      }
    ];

    const mockLibraries = [
      {
        id: 1,
        name: "Main Library",
        status: "open",
        available_seats: 45,
        total_seats: 200,
        floors: 4,
        hours: "24/7",
        quiet_level: "silent",
        amenities: ["WiFi", "Power outlets", "Study rooms", "Printing", "Research assistance"],
        current_occupancy: 155
      },
      {
        id: 2,
        name: "Science Library",
        status: "open",
        available_seats: 23,
        total_seats: 80,
        floors: 2,
        hours: "6:00 AM - 2:00 AM",
        quiet_level: "moderate",
        amenities: ["WiFi", "Power outlets", "Group study areas", "Lab equipment"],
        current_occupancy: 57
      },
      {
        id: 3,
        name: "Law Library",
        status: "open",
        available_seats: 12,
        total_seats: 60,
        floors: 3,
        hours: "7:00 AM - 12:00 AM",
        quiet_level: "silent",
        amenities: ["WiFi", "Power outlets", "Legal databases", "Study carrels"],
        current_occupancy: 48
      }
    ];

    const mockEvents = [
      {
        id: 1,
        title: "Career Fair 2024",
        date: "2024-01-20",
        time: "10:00 AM - 4:00 PM",
        location: "Student Union Ballroom",
        type: "career",
        description: "Meet recruiters from top companies in tech, finance, and consulting",
        organizer: "Career Services",
        max_participants: 500,
        current_participants: 267,
        rsvp_required: true
      },
      {
        id: 2,
        title: "International Food Festival",
        date: "2024-01-22",
        time: "5:00 PM - 9:00 PM",
        location: "Campus Quad",
        type: "social",
        description: "Taste authentic cuisine from around the world",
        organizer: "International Students Association",
        max_participants: 300,
        current_participants: 156,
        rsvp_required: false
      },
      {
        id: 3,
        title: "Guest Lecture: AI in Healthcare",
        date: "2024-01-25",
        time: "2:00 PM - 3:30 PM",
        location: "Science Auditorium",
        type: "academic",
        description: "Dr. Sarah Chen discusses the latest developments in AI-driven medical diagnosis",
        organizer: "Computer Science Department",
        max_participants: 150,
        current_participants: 89,
        rsvp_required: true
      }
    ];

    const mockStudyGroups = [
      {
        id: 1,
        title: "Calculus II Study Group",
        subject: "Mathematics",
        date: "2024-01-21",
        time: "7:00 PM - 9:00 PM",
        location: "Library Study Room B",
        description: "Review integration techniques and prepare for midterm",
        organizer_id: "user1",
        organizer_name: "Alex Johnson",
        max_participants: 8,
        current_participants: 5
      },
      {
        id: 2,
        title: "Chemistry Lab Prep",
        subject: "Chemistry",
        date: "2024-01-23",
        time: "3:00 PM - 5:00 PM",
        location: "Science Building Room 201",
        description: "Prepare for organic chemistry lab experiments",
        organizer_id: "user2",
        organizer_name: "Maria Rodriguez",
        max_participants: 6,
        current_participants: 4
      }
    ];

    setDiningHalls(mockDiningHalls);
    setLibraries(mockLibraries);
    setEvents(mockEvents);
    setStudyGroups(mockStudyGroups);
    setRsvps([]);
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

  const handleRSVP = async (eventId) => {
    try {
      const isRsvped = rsvps.includes(eventId);
      
      if (isRsvped) {
        // Remove RSVP
        const { error } = await supabase
          .from('event_rsvps')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', currentUser.id);

        if (!error) {
          setRsvps(prev => prev.filter(id => id !== eventId));
          Alert.alert('Success', 'RSVP cancelled');
        }
      } else {
        // Add RSVP
        const { error } = await supabase
          .from('event_rsvps')
          .insert([{
            event_id: eventId,
            user_id: currentUser.id
          }]);

        if (!error) {
          setRsvps(prev => [...prev, eventId]);
          Alert.alert('Success', 'RSVP confirmed!');
        }
      }
    } catch (error) {
      console.error('Error handling RSVP:', error);
      Alert.alert('Error', 'Unable to process RSVP. Please try again.');
    }
  };

  const createEvent = async () => {
    if (!newItem.title || !newItem.date || !newItem.location) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const eventData = {
        title: newItem.title,
        date: newItem.date,
        time: newItem.time,
        location: newItem.location,
        type: newItem.type,
        description: newItem.description,
        organizer: currentUser.email,
        max_participants: parseInt(newItem.max_participants) || null,
        current_participants: 0,
        rsvp_required: true
      };

      const { data, error } = await supabase
        .from('campus_events')
        .insert([eventData])
        .select();

      if (error) throw error;

      setEvents(prev => [...prev, data[0]]);
      setShowCreateModal(false);
      resetForm();
      Alert.alert('Success', 'Event created successfully!');
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Unable to create event. Please try again.');
    }
  };

  const createStudyGroup = async () => {
    if (!newItem.title || !newItem.date || !newItem.location) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const studyGroupData = {
        title: newItem.title,
        subject: newItem.type, // Using type field for subject
        date: newItem.date,
        time: newItem.time,
        location: newItem.location,
        description: newItem.description,
        organizer_id: currentUser.id,
        organizer_name: currentUser.email,
        max_participants: parseInt(newItem.max_participants) || 8,
        current_participants: 1
      };

      const { data, error } = await supabase
        .from('study_groups')
        .insert([studyGroupData])
        .select();

      if (error) throw error;

      setStudyGroups(prev => [...prev, data[0]]);
      setShowCreateModal(false);
      resetForm();
      Alert.alert('Success', 'Study group created successfully!');
    } catch (error) {
      console.error('Error creating study group:', error);
      Alert.alert('Error', 'Unable to create study group. Please try again.');
    }
  };

  const resetForm = () => {
    setNewItem({
      title: '',
      description: '',
      date: '',
      time: '',
      location: '',
      max_participants: '',
      type: 'academic'
    });
  };

  const getCrowdLevelColor = (level) => {
    switch (level) {
      case 'low': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status) => {
    return status === 'open' ? '#10b981' : '#ef4444';
  };

  const getEventTypeIcon = (type) => {
    switch (type) {
      case 'academic': return '📚';
      case 'social': return '🎉';
      case 'career': return '💼';
      case 'sports': return '⚽';
      case 'cultural': return '🎭';
      default: return '📅';
    }
  };

  const getOccupancyColor = (available, total) => {
    const percentage = (total - available) / total;
    if (percentage < 0.5) return '#10b981';
    if (percentage < 0.8) return '#f59e0b';
    return '#ef4444';
  };

  const renderDiningHalls = () => (
    <View>
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16 }}>
        🍽️ Dining Options
      </Text>
      {diningHalls.map((hall) => (
        <View
          key={hall.id}
          style={{
            backgroundColor: currentTheme.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: currentTheme.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 4 }}>
                {hall.name}
              </Text>
              <Text style={{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 4 }}>
                📍 {hall.location}
              </Text>
              <Text style={{ fontSize: 14, color: currentTheme.textSecondary }}>
                🕐 {hall.hours}
              </Text>
            </View>
            <View style={{
              backgroundColor: getStatusColor(hall.status),
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 6
            }}>
              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }}>
                {hall.status}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 4 }}>
                Crowd Level
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: getCrowdLevelColor(hall.crowd_level),
                  marginRight: 8
                }} />
                <Text style={{ fontSize: 14, color: currentTheme.primary, fontWeight: '600', textTransform: 'capitalize' }}>
                  {hall.crowd_level}
                </Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 4 }}>
                Wait Time
              </Text>
              <Text style={{ fontSize: 14, color: currentTheme.primary, fontWeight: '600' }}>
                {hall.wait_time}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 4 }}>
                Rating
              </Text>
              <Text style={{ fontSize: 14, color: currentTheme.primary, fontWeight: '600' }}>
                ⭐ {hall.rating}
              </Text>
            </View>
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 4 }}>
              Today's Menu:
            </Text>
            <Text style={{ fontSize: 14, color: currentTheme.primary }}>
              {hall.menu_today}
            </Text>
          </View>

          <Text style={{ fontSize: 14, color: currentTheme.secondary, fontWeight: '600' }}>
            💰 {hall.price_range}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderLibraries = () => (
    <View>
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16 }}>
        📚 Study Spaces
      </Text>
      {libraries.map((library) => (
        <View
          key={library.id}
          style={{
            backgroundColor: currentTheme.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: currentTheme.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 4 }}>
                {library.name}
              </Text>
              <Text style={{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 4 }}>
                🏢 {library.floors} floors • 🕐 {library.hours}
              </Text>
              <Text style={{ fontSize: 14, color: currentTheme.textSecondary, textTransform: 'capitalize' }}>
                🔇 {library.quiet_level} study environment
              </Text>
            </View>
            <View style={{
              backgroundColor: getStatusColor(library.status),
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 6
            }}>
              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }}>
                {library.status}
              </Text>
            </View>
          </View>

          {/* Seat Availability */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary }}>
                Seat Availability
              </Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: getOccupancyColor(library.available_seats, library.total_seats) }}>
                {library.available_seats} / {library.total_seats}
              </Text>
            </View>
            
            {/* Progress Bar */}
            <View style={{ 
              backgroundColor: currentTheme.border, 
              borderRadius: 10, 
              height: 8, 
              overflow: 'hidden' 
            }}>
              <View style={{
                backgroundColor: getOccupancyColor(library.available_seats, library.total_seats),
                height: '100%',
                width: `${((library.total_seats - library.available_seats) / library.total_seats) * 100}%`,
                borderRadius: 10
              }} />
            </View>
            
            <Text style={{ fontSize: 12, color: currentTheme.textSecondary, marginTop: 4 }}>
              {library.current_occupancy} people currently studying
            </Text>
          </View>

          {/* Amenities */}
          <View>
            <Text style={{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 8 }}>
              Amenities:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {library.amenities.map((amenity, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: currentTheme.primary + '20',
                    borderRadius: 12,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    marginRight: 8,
                    marginBottom: 8
                  }}
                >
                  <Text style={{ fontSize: 12, color: currentTheme.primary, fontWeight: '600' }}>
                    {amenity}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderCampusEvents = () => (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary }}>
          🎪 Campus Events
        </Text>
        <TouchableOpacity
          onPress={() => {
            setCreateType('event');
            setShowCreateModal(true);
          }}
          style={{
            backgroundColor: currentTheme.primary,
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 6
          }}
        >
          <Text style={{ color: currentTheme.background, fontSize: 12, fontWeight: 'bold' }}>
            + Create Event
          </Text>
        </TouchableOpacity>
      </View>

      {events.map((event) => (
        <View
          key={event.id}
          style={{
            backgroundColor: currentTheme.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: currentTheme.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 24, marginRight: 12 }}>{getEventTypeIcon(event.type)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 4 }}>
                {event.title}
              </Text>
              <Text style={{ fontSize: 14, color: currentTheme.secondary, textTransform: 'capitalize' }}>
                {event.type} Event
              </Text>
            </View>
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 4 }}>
              📅 {new Date(event.date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
            <Text style={{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 4 }}>
              🕐 {event.time}
            </Text>
            <Text style={{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 4 }}>
              📍 {event.location}
            </Text>
            <Text style={{ fontSize: 14, color: currentTheme.textSecondary }}>
              👤 Organized by {event.organizer}
            </Text>
          </View>

          <Text style={{ fontSize: 14, color: currentTheme.primary, marginBottom: 12 }}>
            {event.description}
          </Text>

          {event.max_participants && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 14, color: currentTheme.textSecondary }}>
                👥 {event.current_participants} / {event.max_participants} attending
              </Text>
              <View style={{ 
                backgroundColor: currentTheme.border, 
                borderRadius: 10, 
                height: 6, 
                flex: 1, 
                marginLeft: 12,
                overflow: 'hidden' 
              }}>
                <View style={{
                  backgroundColor: currentTheme.secondary,
                  height: '100%',
                  width: `${(event.current_participants / event.max_participants) * 100}%`,
                  borderRadius: 10
                }} />
                             </View>
             </View>
           )}

           {event.rsvp_required && (
            <TouchableOpacity
              style={{
                backgroundColor: rsvps.includes(event.id) ? '#10b981' : currentTheme.primary,
                borderRadius: 12,
                padding: 12,
                alignItems: 'center'
              }}
              onPress={() => handleRSVP(event.id)}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                {rsvps.includes(event.id) ? '✓ RSVP\'d' : 'RSVP'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      {/* Study Groups Section */}
      <View style={{ marginTop: 30 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary }}>
            📚 Study Groups
          </Text>
          <TouchableOpacity
            onPress={() => {
              setCreateType('study_group');
              setShowCreateModal(true);
            }}
            style={{
              backgroundColor: currentTheme.secondary,
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 6
            }}
          >
            <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
              + Create Group
            </Text>
          </TouchableOpacity>
        </View>

        {studyGroups.map((group) => (
          <View
            key={group.id}
            style={{
              backgroundColor: currentTheme.surface,
              borderRadius: 16,
              padding: 20,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: currentTheme.border,
              borderLeftWidth: 4,
              borderLeftColor: currentTheme.secondary
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 20, marginRight: 8 }}>📖</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 4 }}>
                  {group.title}
                </Text>
                <Text style={{ fontSize: 14, color: currentTheme.secondary }}>
                  {group.subject}
                </Text>
              </View>
            </View>

            <Text style={{ fontSize: 14, color: currentTheme.primary, marginBottom: 8 }}>
              {group.description}
            </Text>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 2 }}>
                📅 {new Date(group.date).toLocaleDateString()} at {group.time}
              </Text>
              <Text style={{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 2 }}>
                📍 {group.location}
              </Text>
              <Text style={{ fontSize: 14, color: currentTheme.textSecondary }}>
                👤 Organized by {group.organizer_name}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: currentTheme.textSecondary }}>
                👥 {group.current_participants} / {group.max_participants} members
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: currentTheme.secondary,
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 8
                }}
                onPress={() => Alert.alert('Join Group', 'Study group joining functionality would be implemented here')}
              >
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>
                  Join Group
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderCreateModal = () => (
    <Modal
      visible={showCreateModal}
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
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary }}>
              Create {createType === 'event' ? 'Event' : 'Study Group'}
            </Text>
            <TouchableOpacity onPress={createType === 'event' ? createEvent : createStudyGroup}>
              <Text style={{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {/* Title */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
              Title *
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
              placeholder={`Enter ${createType === 'event' ? 'event' : 'study group'} title`}
              placeholderTextColor={currentTheme.textSecondary}
              value={newItem.title}
              onChangeText={(text) => setNewItem(prev => ({ ...prev, title: text }))}
            />
          </View>

          {/* Type/Subject */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
              {createType === 'event' ? 'Event Type' : 'Subject'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(createType === 'event' 
                ? ['academic', 'social', 'career', 'sports', 'cultural']
                : ['Mathematics', 'Science', 'Engineering', 'Business', 'Literature', 'History']
              ).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={{
                    backgroundColor: newItem.type === option ? currentTheme.primary : currentTheme.surface,
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    marginRight: 12,
                    borderWidth: 1,
                    borderColor: currentTheme.border
                  }}
                  onPress={() => setNewItem(prev => ({ ...prev, type: option }))}
                >
                  <Text style={{
                    color: newItem.type === option ? currentTheme.background : currentTheme.primary,
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}>
                    {createType === 'event' ? `${getEventTypeIcon(option)} ${option}` : option}
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
              value={newItem.date}
              onChangeText={(text) => setNewItem(prev => ({ ...prev, date: text }))}
            />
          </View>

          {/* Time */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
              Time
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
              placeholder="e.g., 2:00 PM - 4:00 PM"
              placeholderTextColor={currentTheme.textSecondary}
              value={newItem.time}
              onChangeText={(text) => setNewItem(prev => ({ ...prev, time: text }))}
            />
          </View>

          {/* Location */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
              Location *
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
              value={newItem.location}
              onChangeText={(text) => setNewItem(prev => ({ ...prev, location: text }))}
            />
          </View>

          {/* Max Participants */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
              Max Participants
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
              placeholder={createType === 'event' ? "e.g., 100" : "e.g., 8"}
              placeholderTextColor={currentTheme.textSecondary}
              value={newItem.max_participants}
              onChangeText={(text) => setNewItem(prev => ({ ...prev, max_participants: text }))}
              keyboardType="numeric"
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
              value={newItem.description}
              onChangeText={(text) => setNewItem(prev => ({ ...prev, description: text }))}
              multiline
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dining':
        return renderDiningHalls();
      case 'libraries':
        return renderLibraries();
      case 'events':
        return renderCampusEvents();
      default:
        return renderDiningHalls();
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: currentTheme.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={currentTheme.primary} />
        <Text style={{ color: currentTheme.textSecondary, marginTop: 16, fontSize: 16 }}>
          Loading campus info...
        </Text>
      </View>
    );
  }

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
            🏫 Campus Life
          </Text>
          <View style={{ width: 60 }} />
        </View>
      </View>

      {/* Tabs */}
      <View style={{
        backgroundColor: currentTheme.surface,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: currentTheme.border
      }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'dining', label: '🍽️ Dining', icon: '🍽️' },
            { key: 'libraries', label: '📚 Libraries', icon: '📚' },
            { key: 'events', label: '🎪 Events', icon: '🎪' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={{
                backgroundColor: activeTab === tab.key ? currentTheme.primary : 'transparent',
                borderRadius: 25,
                paddingHorizontal: 20,
                paddingVertical: 10,
                marginRight: 12,
                borderWidth: 1,
                borderColor: activeTab === tab.key ? currentTheme.primary : currentTheme.border
              }}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={{
                color: activeTab === tab.key ? currentTheme.background : currentTheme.primary,
                fontWeight: '600',
                fontSize: 16
              }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
        {renderTabContent()}
      </ScrollView>

      {renderCreateModal()}
    </View>
  );
} 