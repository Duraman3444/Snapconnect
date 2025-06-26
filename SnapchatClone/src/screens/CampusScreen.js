import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';

export default function CampusScreen({ navigation }) {
  const [diningHalls, setDiningHalls] = useState([]);
  const [libraries, setLibraries] = useState([]);
  const [campusEvents, setCampusEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dining'); // dining, libraries, events
  const { currentUser, supabase } = useAuth();
  const { currentTheme } = useTheme();

  useEffect(() => {
    loadCampusData();
  }, [currentUser]);

  const loadCampusData = async () => {
    try {
      await Promise.all([
        loadDiningHalls(),
        loadLibraries(),
        loadCampusEvents()
      ]);
    } catch (error) {
      console.error('Error loading campus data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDiningHalls = async () => {
    if (!currentUser?.university) return;

    try {
      const { data, error } = await supabase
        .from('dining_halls')
        .select('*')
        .eq('university', currentUser.university)
        .order('name');

      if (error) {
        console.error('Error fetching dining halls:', error);
        // Mock data for development
        setDiningHalls([
          {
            id: 1,
            name: "Student Union Food Court",
            status: "open",
            crowd_level: "medium",
            hours: "7:00 AM - 10:00 PM",
            menu_today: "Pizza, Burgers, Salads, Asian Cuisine",
            wait_time: "5-10 min",
            rating: 4.2
          },
          {
            id: 2,
            name: "North Campus Dining Hall",
            status: "open",
            crowd_level: "high",
            hours: "7:00 AM - 9:00 PM",
            menu_today: "All-you-can-eat buffet, Grill, Vegetarian Options",
            wait_time: "15-20 min",
            rating: 4.5
          },
          {
            id: 3,
            name: "Library Café",
            status: "closed",
            crowd_level: "low",
            hours: "8:00 AM - 6:00 PM",
            menu_today: "Coffee, Sandwiches, Pastries",
            wait_time: "2-5 min",
            rating: 4.0
          }
        ]);
        return;
      }

      setDiningHalls(data || []);
    } catch (error) {
      console.error('Error loading dining halls:', error);
    }
  };

  const loadLibraries = async () => {
    if (!currentUser?.university) return;

    try {
      const { data, error } = await supabase
        .from('libraries')
        .select('*')
        .eq('university', currentUser.university)
        .order('name');

      if (error) {
        console.error('Error fetching libraries:', error);
        // Mock data for development
        setLibraries([
          {
            id: 1,
            name: "Main Library",
            status: "open",
            available_seats: 45,
            total_seats: 200,
            floors: 4,
            hours: "24/7",
            quiet_level: "silent",
            amenities: ["WiFi", "Power outlets", "Study rooms", "Printing"]
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
            amenities: ["WiFi", "Power outlets", "Group study areas"]
          },
          {
            id: 3,
            name: "Law Library",
            status: "open",
            available_seats: 67,
            total_seats: 120,
            floors: 3,
            hours: "6:00 AM - 12:00 AM",
            quiet_level: "silent",
            amenities: ["WiFi", "Power outlets", "Study rooms", "Legal databases"]
          }
        ]);
        return;
      }

      setLibraries(data || []);
    } catch (error) {
      console.error('Error loading libraries:', error);
    }
  };

  const loadCampusEvents = async () => {
    if (!currentUser?.university) return;

    try {
      const { data, error } = await supabase
        .from('campus_events')
        .select('*')
        .eq('university', currentUser.university)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(10);

      if (error) {
        console.error('Error fetching campus events:', error);
        // Mock data for development
        setCampusEvents([
          {
            id: 1,
            title: "Career Fair",
            date: "2024-01-15",
            time: "10:00 AM - 4:00 PM",
            location: "Student Union Ballroom",
            type: "career",
            description: "Meet recruiters from top companies",
            attendees: 250,
            organizer: "Career Services"
          },
          {
            id: 2,
            title: "Study Group: Chemistry 101",
            date: "2024-01-16",
            time: "7:00 PM - 9:00 PM",
            location: "Science Building Room 201",
            type: "academic",
            description: "Prepare for midterm exam",
            attendees: 15,
            organizer: "Chemistry Department"
          },
          {
            id: 3,
            title: "Pizza Night",
            date: "2024-01-17",
            time: "6:00 PM - 8:00 PM",
            location: "Residence Hall Common Room",
            type: "social",
            description: "Free pizza for all residents",
            attendees: 80,
            organizer: "Residence Life"
          }
        ]);
        return;
      }

      setCampusEvents(data || []);
    } catch (error) {
      console.error('Error loading campus events:', error);
    }
  };

  const getCrowdLevelColor = (level) => {
    switch (level) {
      case 'low': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      default: return currentTheme.textSecondary;
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
      default: return '📅';
    }
  };

  const renderDiningHalls = () => (
    <View>
      {diningHalls.map((hall) => (
        <View
          key={hall.id}
          style={[{
            backgroundColor: currentTheme.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: currentTheme.border
          }]}
        >
          <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }]}>
            <View style={[{ flex: 1 }]}>
              <Text style={[{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 4 }]}>
                🍽️ {hall.name}
              </Text>
              <Text style={[{ fontSize: 14, color: currentTheme.textSecondary }]}>
                {hall.hours}
              </Text>
            </View>
            <View style={[{
              backgroundColor: getStatusColor(hall.status),
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 6
            }]}>
              <Text style={[{ color: 'white', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }]}>
                {hall.status}
              </Text>
            </View>
          </View>

          <View style={[{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }]}>
            <View style={[{ flex: 1 }]}>
              <Text style={[{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 4 }]}>
                Crowd Level
              </Text>
              <View style={[{ flexDirection: 'row', alignItems: 'center' }]}>
                <View style={[{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: getCrowdLevelColor(hall.crowd_level),
                  marginRight: 8
                }]} />
                <Text style={[{ fontSize: 14, color: currentTheme.primary, fontWeight: '600', textTransform: 'capitalize' }]}>
                  {hall.crowd_level}
                </Text>
              </View>
            </View>
            <View style={[{ flex: 1 }]}>
              <Text style={[{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 4 }]}>
                Wait Time
              </Text>
              <Text style={[{ fontSize: 14, color: currentTheme.primary, fontWeight: '600' }]}>
                {hall.wait_time}
              </Text>
            </View>
            <View style={[{ flex: 1 }]}>
              <Text style={[{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 4 }]}>
                Rating
              </Text>
              <Text style={[{ fontSize: 14, color: currentTheme.primary, fontWeight: '600' }]}>
                ⭐ {hall.rating}
              </Text>
            </View>
          </View>

          <Text style={[{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 4 }]}>
            Today's Menu:
          </Text>
          <Text style={[{ fontSize: 14, color: currentTheme.primary }]}>
            {hall.menu_today}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderLibraries = () => (
    <View>
      {libraries.map((library) => (
        <View
          key={library.id}
          style={[{
            backgroundColor: currentTheme.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: currentTheme.border
          }]}
        >
          <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }]}>
            <View style={[{ flex: 1 }]}>
              <Text style={[{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 4 }]}>
                📚 {library.name}
              </Text>
              <Text style={[{ fontSize: 14, color: currentTheme.textSecondary }]}>
                {library.hours}
              </Text>
            </View>
            <View style={[{
              backgroundColor: getStatusColor(library.status),
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 6
            }]}>
              <Text style={[{ color: 'white', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }]}>
                {library.status}
              </Text>
            </View>
          </View>

          <View style={[{
            backgroundColor: currentTheme.background,
            borderRadius: 12,
            padding: 16,
            marginBottom: 12
          }]}>
            <Text style={[{ fontSize: 16, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 8 }]}>
              Available Seats
            </Text>
            <View style={[{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }]}>
              <Text style={[{ fontSize: 24, fontWeight: 'bold', color: library.available_seats > 20 ? '#10b981' : '#ef4444' }]}>
                {library.available_seats}
              </Text>
              <Text style={[{ fontSize: 16, color: currentTheme.textSecondary, marginLeft: 4 }]}>
                / {library.total_seats}
              </Text>
            </View>
            <View style={[{
              height: 8,
              backgroundColor: currentTheme.border,
              borderRadius: 4,
              overflow: 'hidden'
            }]}>
              <View style={[{
                height: '100%',
                width: `${(library.available_seats / library.total_seats) * 100}%`,
                backgroundColor: library.available_seats > 20 ? '#10b981' : '#ef4444'
              }]} />
            </View>
          </View>

          <View style={[{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }]}>
            <View>
              <Text style={[{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 4 }]}>
                Floors
              </Text>
              <Text style={[{ fontSize: 14, color: currentTheme.primary, fontWeight: '600' }]}>
                {library.floors}
              </Text>
            </View>
            <View>
              <Text style={[{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 4 }]}>
                Quiet Level
              </Text>
              <Text style={[{ fontSize: 14, color: currentTheme.primary, fontWeight: '600', textTransform: 'capitalize' }]}>
                {library.quiet_level}
              </Text>
            </View>
          </View>

          <Text style={[{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 4 }]}>
            Amenities:
          </Text>
          <View style={[{ flexDirection: 'row', flexWrap: 'wrap' }]}>
            {library.amenities?.map((amenity, index) => (
              <View
                key={index}
                style={[{
                  backgroundColor: currentTheme.background,
                  borderRadius: 12,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  marginRight: 8,
                  marginBottom: 8
                }]}
              >
                <Text style={[{ fontSize: 12, color: currentTheme.primary }]}>
                  {amenity}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );

  const renderCampusEvents = () => (
    <View>
      {campusEvents.map((event) => (
        <View
          key={event.id}
          style={[{
            backgroundColor: currentTheme.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: currentTheme.border
          }]}
        >
          <View style={[{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }]}>
            <Text style={[{ fontSize: 24, marginRight: 12 }]}>
              {getEventTypeIcon(event.type)}
            </Text>
            <View style={[{ flex: 1 }]}>
              <Text style={[{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 4 }]}>
                {event.title}
              </Text>
              <Text style={[{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 4 }]}>
                {new Date(event.date).toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })} at {event.time}
              </Text>
              <Text style={[{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 8 }]}>
                📍 {event.location}
              </Text>
            </View>
          </View>

          <Text style={[{ fontSize: 14, color: currentTheme.primary, marginBottom: 12 }]}>
            {event.description}
          </Text>

          <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <View style={[{ flexDirection: 'row', alignItems: 'center' }]}>
              <Text style={[{ fontSize: 14, color: currentTheme.textSecondary, marginRight: 8 }]}>
                👥 {event.attendees} attending
              </Text>
              <Text style={[{ fontSize: 14, color: currentTheme.textSecondary }]}>
                • {event.organizer}
              </Text>
            </View>
            <TouchableOpacity
              style={[{
                backgroundColor: currentTheme.primary,
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 8
              }]}
              onPress={() => Alert.alert('Event', `Would you like to RSVP for ${event.title}?`)}
            >
              <Text style={[{ color: currentTheme.background, fontSize: 12, fontWeight: 'bold' }]}>
                RSVP
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
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
            🏫 Campus Life
          </Text>
          <View style={[{ width: 60 }]} />
        </View>

        {/* Tab Navigation */}
        <View style={[{ flexDirection: 'row', marginTop: 20, backgroundColor: currentTheme.surface, borderRadius: 12, padding: 4 }]}>
          {[
            { key: 'dining', label: '🍽️ Dining', icon: '🍽️' },
            { key: 'libraries', label: '📚 Libraries', icon: '📚' },
            { key: 'events', label: '🎉 Events', icon: '🎉' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[{
                flex: 1,
                backgroundColor: activeTab === tab.key ? currentTheme.primary : 'transparent',
                borderRadius: 8,
                paddingVertical: 12,
                alignItems: 'center'
              }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[{
                color: activeTab === tab.key ? currentTheme.background : currentTheme.primary,
                fontSize: 14,
                fontWeight: '600'
              }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={[{ flex: 1 }]}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadCampusData} />
        }
      >
        {renderTabContent()}
      </ScrollView>
    </View>
  );
} 