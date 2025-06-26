import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  Modal,
  FlatList,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';
import ragService from '../services/ragService';
import userProfileService from '../services/userProfileService';

export default function TutoringMarketplaceScreen({ navigation }) {
  const [tutors, setTutors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [userTutorProfile, setUserTutorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('find_tutors'); // find_tutors, tutor_requests, become_tutor, ai_recommendations
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [showTutorProfile, setShowTutorProfile] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  
  const { currentUser, supabase } = useAuth();
  const { currentTheme } = useTheme();

  // New request form state
  const [newRequest, setNewRequest] = useState({
    subject: '',
    course_code: '',
    topic_description: '',
    session_type: 'one_time',
    preferred_schedule: '',
    budget_range: '',
    urgency_level: 'medium',
    location_preference: 'both',
    additional_notes: ''
  });

  // Tutor profile form state
  const [tutorProfileForm, setTutorProfileForm] = useState({
    bio: '',
    subjects: [],
    hourly_rate: '',
    preferred_location: 'both',
    tutoring_experience: '',
    academic_achievements: '',
    teaching_methods: ''
  });

  const subjects = [
    'Mathematics', 'Chemistry', 'Physics', 'Biology', 'Computer Science',
    'English', 'History', 'Economics', 'Psychology', 'Statistics'
  ];

  const sessionTypes = [
    { key: 'one_time', label: '🎯 One-time Session' },
    { key: 'recurring', label: '🔄 Recurring Sessions' },
    { key: 'exam_prep', label: '📋 Exam Prep' },
    { key: 'project_help', label: '🛠️ Project Help' }
  ];

  const urgencyLevels = [
    { key: 'low', label: '🟢 Low', color: '#10b981' },
    { key: 'medium', label: '🟡 Medium', color: '#f59e0b' },
    { key: 'high', label: '🟠 High', color: '#ef4444' },
    { key: 'urgent', label: '🔴 Urgent', color: '#dc2626' }
  ];

  useEffect(() => {
    if (currentUser) {
      Promise.all([
        loadTutors(),
        loadRequests(),
        loadUserTutorProfile()
      ]);
    }
  }, [currentUser, activeTab]);

  // Load AI recommendations when switching to AI tab
  useEffect(() => {
    if (activeTab === 'ai_recommendations' && !aiRecommendations) {
      loadAIRecommendations();
    }
  }, [activeTab]);

  const loadAIRecommendations = async () => {
    if (!currentUser?.id) return;

    setLoadingAI(true);
    try {
      const userProfile = await userProfileService.getMockUserProfile(currentUser.id);
      const contextualData = await userProfileService.getContextualUserData(currentUser.id, 'tutoring');
      
      // Generate AI-powered tutoring recommendations
      const recommendations = await ragService.generateTutoringRecommendations(
        userProfile,
        {
          subject: 'Data Structures', // Could be dynamic based on struggling subjects
          topics: ['Binary Trees', 'Hash Tables', 'Graph Algorithms'],
          goal: 'Improve understanding and exam performance',
          timeline: '2 weeks',
          struggles: ['Algorithm complexity', 'Implementation details']
        }
      );

      setAiRecommendations(recommendations);

      // Track AI usage
      await userProfileService.trackActivity(currentUser.id, {
        type: 'ai_tutoring_recommendations',
        feature: 'tutoring_marketplace',
        success: recommendations !== null
      });

    } catch (error) {
      console.error('Error loading AI recommendations:', error);
      Alert.alert('AI Error', 'Unable to load personalized recommendations at this time.');
    } finally {
      setLoadingAI(false);
    }
  };

  // AI-Enhanced Request Creation
  const handleAIAssistedRequest = async () => {
    if (!newRequest.subject || !newRequest.topic_description) {
      Alert.alert('Missing Information', 'Please provide subject and topic description for AI assistance.');
      return;
    }

    setLoadingAI(true);
    try {
      const userProfile = await userProfileService.getMockUserProfile(currentUser.id);
      
      // Generate enhanced request description using AI
      const enhancedRequest = await ragService.generateTutoringRecommendations(
        userProfile,
        {
          subject: newRequest.subject,
          topics: [newRequest.topic_description],
          goal: 'Get personalized tutoring help',
          timeline: newRequest.urgency_level === 'urgent' ? '1 week' : '2-3 weeks'
        }
      );

      if (enhancedRequest.recommendations) {
        // Update the request with AI suggestions
        setNewRequest(prev => ({
          ...prev,
          additional_notes: `AI-Enhanced Request:\n\n${enhancedRequest.recommendations.tutorCriteria?.teachingStyle || 'Personalized teaching approach recommended'}\n\nSuggested Study Plan:\n${enhancedRequest.recommendations.studyPlan?.weeklyGoals?.join('\n• ') || 'Structured learning goals'}`
        }));

        Alert.alert(
          '🤖 AI Enhancement Complete',
          'Your request has been enhanced with personalized recommendations. Review the additional notes section.',
          [{ text: 'Continue' }]
        );
      }

    } catch (error) {
      console.error('Error generating AI assistance:', error);
      Alert.alert('AI Error', 'Unable to enhance request at this time.');
    } finally {
      setLoadingAI(false);
    }
  };

  const loadTutors = async () => {
    if (!currentUser?.id) return;

    try {
      setLoading(true);
      const { data: tutorsData, error } = await supabase
        .from('tutor_profiles')
        .select(`
          *,
          profiles!tutor_profiles_user_id_fkey (
            username,
            display_name
          )
        `)
        .eq('is_active', true)
        .order('rating', { ascending: false });

      if (error) {
        console.error('Error fetching tutors:', error);
        // Mock data for development
        setTutors([
          {
            id: '1',
            user_id: '2',
            bio: 'Mathematics tutor with 3 years of experience. Specialized in Calculus and Statistics.',
            subjects: ['Mathematics', 'Statistics'],
            hourly_rate: 25.00,
            preferred_location: 'both',
            rating: 4.8,
            total_reviews: 15,
            total_sessions: 45,
            is_verified: true,
            profiles: {
              username: 'math_tutor_sarah',
              display_name: 'Sarah Johnson'
            }
          },
          {
            id: '2',
            user_id: '3',
            bio: 'Chemistry PhD student offering tutoring in organic and general chemistry.',
            subjects: ['Chemistry', 'Biology'],
            hourly_rate: 30.00,
            preferred_location: 'in_person',
            rating: 4.9,
            total_reviews: 22,
            total_sessions: 68,
            is_verified: true,
            profiles: {
              username: 'chem_expert',
              display_name: 'Dr. Michael Chen'
            }
          }
        ]);
        return;
      }

      setTutors(tutorsData || []);
    } catch (error) {
      console.error('Error loading tutors:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    if (!currentUser?.id) return;

    try {
      const { data: requestsData, error } = await supabase
        .from('tutoring_requests')
        .select(`
          *,
          profiles!tutoring_requests_student_id_fkey (
            username,
            display_name
          )
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching requests:', error);
        // Mock data for development
        setRequests([
          {
            id: '1',
            student_id: '4',
            subject: 'Mathematics',
            course_code: 'MATH201',
            topic_description: 'Need help with integration by parts and trigonometric substitution',
            session_type: 'exam_prep',
            urgency_level: 'high',
            location_preference: 'online',
            budget_range: '$20-30/hour',
            created_at: '2024-01-15T10:00:00Z',
            profiles: {
              username: 'struggling_student',
              display_name: 'Alex Thompson'
            }
          }
        ]);
        return;
      }

      setRequests(requestsData || []);
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  };

  const loadUserTutorProfile = async () => {
    if (!currentUser?.id) return;

    try {
      const { data: profileData, error } = await supabase
        .from('tutor_profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching tutor profile:', error);
        return;
      }

      setUserTutorProfile(profileData);
      if (profileData) {
        setTutorProfileForm({
          bio: profileData.bio || '',
          subjects: profileData.subjects || [],
          hourly_rate: profileData.hourly_rate?.toString() || '',
          preferred_location: profileData.preferred_location || 'both',
          tutoring_experience: profileData.tutoring_experience || '',
          academic_achievements: profileData.academic_achievements || '',
          teaching_methods: profileData.teaching_methods || ''
        });
      }
    } catch (error) {
      console.error('Error loading tutor profile:', error);
    }
  };

  const submitRequest = async () => {
    if (!newRequest.subject || !newRequest.topic_description) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tutoring_requests')
        .insert([{
          ...newRequest,
          student_id: currentUser.id
        }]);

      if (error) {
        console.error('Error submitting request:', error);
        Alert.alert('Error', 'Failed to create tutoring request');
        return;
      }

      Alert.alert('Success', 'Tutoring request created successfully!');
      setShowCreateRequest(false);
      resetRequestForm();
      loadRequests();
    } catch (error) {
      console.error('Error submitting request:', error);
      Alert.alert('Error', 'Failed to create tutoring request');
    }
  };

  const submitTutorProfile = async () => {
    if (!tutorProfileForm.bio || tutorProfileForm.subjects.length === 0) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const profileData = {
        ...tutorProfileForm,
        user_id: currentUser.id,
        hourly_rate: parseFloat(tutorProfileForm.hourly_rate) || null,
        is_active: true
      };

      let query;
      if (userTutorProfile) {
        query = supabase
          .from('tutor_profiles')
          .update(profileData)
          .eq('user_id', currentUser.id);
      } else {
        query = supabase
          .from('tutor_profiles')
          .insert([profileData]);
      }

      const { error } = await query;

      if (error) {
        console.error('Error saving tutor profile:', error);
        Alert.alert('Error', 'Failed to save tutor profile');
        return;
      }

      Alert.alert('Success', userTutorProfile ? 'Profile updated!' : 'Welcome to tutoring!');
      setShowTutorProfile(false);
      loadUserTutorProfile();
      loadTutors();
    } catch (error) {
      console.error('Error saving tutor profile:', error);
      Alert.alert('Error', 'Failed to save tutor profile');
    }
  };

  const resetRequestForm = () => {
    setNewRequest({
      subject: '',
      course_code: '',
      topic_description: '',
      session_type: 'one_time',
      preferred_schedule: '',
      budget_range: '',
      urgency_level: 'medium',
      location_preference: 'both',
      additional_notes: ''
    });
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return '#10b981';
    if (rating >= 4.0) return '#3b82f6';
    if (rating >= 3.5) return '#f59e0b';
    return '#ef4444';
  };

  const getUrgencyColor = (level) => {
    const urgency = urgencyLevels.find(u => u.key === level);
    return urgency ? urgency.color : '#6b7280';
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text key={i} style={{ color: i <= rating ? '#f59e0b' : '#d1d5db', fontSize: 14 }}>
          ★
        </Text>
      );
    }
    return stars;
  };

  const renderTutorItem = ({ item }) => (
    <View
      style={{
        backgroundColor: currentTheme.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: currentTheme.border,
        borderLeftWidth: item.is_verified ? 4 : 1,
        borderLeftColor: item.is_verified ? '#10b981' : currentTheme.border
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginRight: 8 }}>
              {item.profiles?.display_name || 'Tutor'}
            </Text>
            {item.is_verified && (
              <Text style={{ fontSize: 16 }}>✅</Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: getRatingColor(item.rating), marginRight: 4 }}>
              {item.rating.toFixed(1)}
            </Text>
            <View style={{ flexDirection: 'row', marginRight: 8 }}>
              {renderStars(Math.round(item.rating))}
            </View>
            <Text style={{ fontSize: 12, color: currentTheme.textSecondary }}>
              ({item.total_reviews} reviews • {item.total_sessions} sessions)
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary }}>
            ${item.hourly_rate}
          </Text>
          <Text style={{ fontSize: 12, color: currentTheme.textSecondary }}>
            per hour
          </Text>
        </View>
      </View>

      {/* Bio */}
      <Text style={{ fontSize: 14, color: currentTheme.primary, lineHeight: 20, marginBottom: 12 }}>
        {item.bio}
      </Text>

      {/* Subjects */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 4 }}>
          Subjects:
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {item.subjects.map((subject, index) => (
            <View
              key={index}
              style={{
                backgroundColor: currentTheme.primary,
                borderRadius: 12,
                paddingHorizontal: 8,
                paddingVertical: 4,
                marginRight: 8,
                marginBottom: 4
              }}
            >
              <Text style={{ color: currentTheme.background, fontSize: 12, fontWeight: '600' }}>
                {subject}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Location Preference */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 14, color: currentTheme.textSecondary }}>
          📍 {item.preferred_location === 'online' ? 'Online Only' : 
               item.preferred_location === 'in_person' ? 'In-Person Only' : 'Online & In-Person'}
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: currentTheme.primary,
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 8
          }}
        >
          <Text style={{ color: currentTheme.background, fontWeight: '600' }}>
            📩 Contact
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRequestItem = ({ item }) => (
    <View
      style={{
        backgroundColor: currentTheme.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: currentTheme.border,
        borderLeftWidth: 4,
        borderLeftColor: getUrgencyColor(item.urgency_level)
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 4 }}>
            {item.subject} {item.course_code && `- ${item.course_code}`}
          </Text>
          <Text style={{ fontSize: 14, color: currentTheme.textSecondary }}>
            by {item.profiles?.display_name || 'Student'} • {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={{
          backgroundColor: getUrgencyColor(item.urgency_level),
          borderRadius: 12,
          paddingHorizontal: 8,
          paddingVertical: 4
        }}>
          <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }}>
            {item.urgency_level}
          </Text>
        </View>
      </View>

      {/* Description */}
      <Text style={{ fontSize: 14, color: currentTheme.primary, lineHeight: 20, marginBottom: 12 }}>
        {item.topic_description}
      </Text>

      {/* Details */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
        <View style={{
          backgroundColor: currentTheme.border,
          borderRadius: 8,
          paddingHorizontal: 8,
          paddingVertical: 4,
          marginRight: 8,
          marginBottom: 4
        }}>
          <Text style={{ color: currentTheme.textSecondary, fontSize: 12 }}>
            {sessionTypes.find(t => t.key === item.session_type)?.label || item.session_type}
          </Text>
        </View>
        <View style={{
          backgroundColor: currentTheme.border,
          borderRadius: 8,
          paddingHorizontal: 8,
          paddingVertical: 4,
          marginRight: 8,
          marginBottom: 4
        }}>
          <Text style={{ color: currentTheme.textSecondary, fontSize: 12 }}>
            📍 {item.location_preference === 'online' ? 'Online' : 
                 item.location_preference === 'in_person' ? 'In-Person' : 'Flexible'}
          </Text>
        </View>
        {item.budget_range && (
          <View style={{
            backgroundColor: currentTheme.border,
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
            marginBottom: 4
          }}>
            <Text style={{ color: currentTheme.textSecondary, fontSize: 12 }}>
              💰 {item.budget_range}
            </Text>
          </View>
        )}
      </View>

      {/* Action */}
      <TouchableOpacity
        style={{
          backgroundColor: currentTheme.primary,
          borderRadius: 12,
          padding: 12,
          alignItems: 'center'
        }}
      >
        <Text style={{ color: currentTheme.background, fontWeight: '600' }}>
          🤝 Offer Help
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render AI Recommendations Tab
  const renderAIRecommendations = () => (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 8 }}>
          🤖 AI Tutoring Assistant
        </Text>
        <Text style={{ color: currentTheme.textSecondary, fontSize: 16, lineHeight: 24 }}>
          Get personalized tutoring recommendations based on your academic profile and learning patterns.
        </Text>
      </View>

      {loadingAI ? (
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
          <ActivityIndicator size="large" color={currentTheme.primary} />
          <Text style={{ color: currentTheme.textSecondary, marginTop: 16 }}>
            Analyzing your academic profile...
          </Text>
        </View>
      ) : aiRecommendations?.recommendations ? (
        <View>
          {/* Tutor Criteria */}
          {aiRecommendations.recommendations.tutorCriteria && (
            <View style={{ backgroundColor: currentTheme.surface, borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 12 }}>
                🎯 Ideal Tutor Profile
              </Text>
              <Text style={{ color: currentTheme.text, lineHeight: 20, marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold' }}>Background: </Text>
                {aiRecommendations.recommendations.tutorCriteria.preferredBackground}
              </Text>
              <Text style={{ color: currentTheme.text, lineHeight: 20, marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold' }}>Teaching Style: </Text>
                {aiRecommendations.recommendations.tutorCriteria.teachingStyle}
              </Text>
              <Text style={{ color: currentTheme.text, lineHeight: 20 }}>
                <Text style={{ fontWeight: 'bold' }}>Session Structure: </Text>
                {aiRecommendations.recommendations.tutorCriteria.sessionStructure}
              </Text>
            </View>
          )}

          {/* Study Plan */}
          {aiRecommendations.recommendations.studyPlan && (
            <View style={{ backgroundColor: currentTheme.surface, borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 12 }}>
                📚 Personalized Study Plan
              </Text>
              
              {aiRecommendations.recommendations.studyPlan.weeklyGoals && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontWeight: 'bold', color: currentTheme.text, marginBottom: 8 }}>Weekly Goals:</Text>
                  {aiRecommendations.recommendations.studyPlan.weeklyGoals.map((goal, index) => (
                    <Text key={index} style={{ color: currentTheme.text, marginLeft: 16, marginBottom: 4 }}>
                      • {goal}
                    </Text>
                  ))}
                </View>
              )}

              {aiRecommendations.recommendations.studyPlan.practiceAreas && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontWeight: 'bold', color: currentTheme.text, marginBottom: 8 }}>Focus Areas:</Text>
                  {aiRecommendations.recommendations.studyPlan.practiceAreas.map((area, index) => (
                    <Text key={index} style={{ color: currentTheme.text, marginLeft: 16, marginBottom: 4 }}>
                      • {area}
                    </Text>
                  ))}
                </View>
              )}

              {aiRecommendations.recommendations.studyPlan.milestones && (
                <View>
                  <Text style={{ fontWeight: 'bold', color: currentTheme.text, marginBottom: 8 }}>Milestones:</Text>
                  {aiRecommendations.recommendations.studyPlan.milestones.map((milestone, index) => (
                    <Text key={index} style={{ color: currentTheme.text, marginLeft: 16, marginBottom: 4 }}>
                      🎯 {milestone}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Questions to Ask Tutors */}
          {aiRecommendations.recommendations.questions && (
            <View style={{ backgroundColor: currentTheme.surface, borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 12 }}>
                ❓ Smart Questions to Ask Tutors
              </Text>
              {aiRecommendations.recommendations.questions.map((question, index) => (
                <Text key={index} style={{ color: currentTheme.text, marginBottom: 8, lineHeight: 20 }}>
                  {index + 1}. {question}
                </Text>
              ))}
            </View>
          )}

          {/* Resources */}
          {aiRecommendations.recommendations.resources && (
            <View style={{ backgroundColor: currentTheme.surface, borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 12 }}>
                📖 Additional Resources
              </Text>
              {aiRecommendations.recommendations.resources.map((resource, index) => (
                <Text key={index} style={{ color: currentTheme.text, marginBottom: 4 }}>
                  • {resource}
                </Text>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={{ backgroundColor: currentTheme.primary, borderRadius: 12, padding: 16, alignItems: 'center' }}
            onPress={() => setActiveTab('find_tutors')}
          >
            <Text style={{ color: currentTheme.background, fontSize: 16, fontWeight: 'bold' }}>
              Find Matching Tutors
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🤖</Text>
          <Text style={{ color: currentTheme.textSecondary, textAlign: 'center', marginBottom: 20 }}>
            No recommendations loaded yet.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: currentTheme.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
            onPress={loadAIRecommendations}
          >
            <Text style={{ color: currentTheme.background, fontWeight: 'bold' }}>
              Get AI Recommendations
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: currentTheme.background }}>
      {/* Header */}
      <View style={{
        backgroundColor: currentTheme.background,
        paddingTop: 56,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: currentTheme.border
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }}>← Back</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: currentTheme.primary }}>
            🎓 Tutoring Hub
          </Text>
          <TouchableOpacity 
            onPress={() => activeTab === 'find_tutors' ? setShowCreateRequest(true) : setShowTutorProfile(true)}
          >
            <View style={{ backgroundColor: currentTheme.primary, borderRadius: 20, padding: 8 }}>
              <Text style={{ color: currentTheme.background, fontSize: 16, fontWeight: 'bold' }}>
                {activeTab === 'find_tutors' ? '📝 Request' : '👨‍🏫 Profile'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'find_tutors', label: '🔍 Find Tutors' },
            { key: 'tutor_requests', label: '📋 Requests' },
            { key: 'become_tutor', label: userTutorProfile ? '👨‍🏫 My Profile' : '🎯 Become Tutor' },
            { key: 'ai_recommendations', label: '🤖 AI Recommendations' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={{
                backgroundColor: activeTab === tab.key ? currentTheme.primary : currentTheme.surface,
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 10,
                marginRight: 8,
                borderWidth: 1,
                borderColor: currentTheme.border
              }}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={{
                color: activeTab === tab.key ? currentTheme.background : currentTheme.primary,
                fontWeight: '600'
              }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {activeTab === 'find_tutors' && (
        <FlatList
          data={tutors}
          renderItem={renderTutorItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadTutors}
              tintColor={currentTheme.primary}
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>👨‍🏫</Text>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 8 }}>
                No Tutors Available
              </Text>
              <Text style={{ color: currentTheme.textSecondary, textAlign: 'center' }}>
                Be the first to become a tutor!
              </Text>
            </View>
          }
        />
      )}

      {activeTab === 'tutor_requests' && (
        <FlatList
          data={requests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadRequests}
              tintColor={currentTheme.primary}
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>📋</Text>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 8 }}>
                No Tutoring Requests
              </Text>
              <Text style={{ color: currentTheme.textSecondary, textAlign: 'center', marginBottom: 20 }}>
                Create a request to find help!
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: currentTheme.primary,
                  borderRadius: 24,
                  paddingHorizontal: 24,
                  paddingVertical: 12
                }}
                onPress={() => setShowCreateRequest(true)}
              >
                <Text style={{ color: currentTheme.background, fontWeight: 'bold', fontSize: 16 }}>
                  📝 Create Request
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {activeTab === 'become_tutor' && (
        <ScrollView style={{ flex: 1, padding: 20 }}>
          {userTutorProfile ? (
            <View>
              <View style={{
                backgroundColor: currentTheme.surface,
                borderRadius: 16,
                padding: 20,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: currentTheme.border
              }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16 }}>
                  Your Tutor Profile
                </Text>
                <Text style={{ fontSize: 16, color: currentTheme.primary, marginBottom: 12 }}>
                  Rating: {userTutorProfile.rating?.toFixed(1) || 'New'}/5.0
                </Text>
                <Text style={{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 12 }}>
                  Total Sessions: {userTutorProfile.total_sessions || 0}
                </Text>
                <Text style={{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 12 }}>
                  Reviews: {userTutorProfile.total_reviews || 0}
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: currentTheme.primary,
                    borderRadius: 12,
                    padding: 12,
                    alignItems: 'center'
                  }}
                  onPress={() => setShowTutorProfile(true)}
                >
                  <Text style={{ color: currentTheme.background, fontWeight: '600' }}>
                    ✏️ Edit Profile
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>🎓</Text>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 8 }}>
                Become a Tutor
              </Text>
              <Text style={{ color: currentTheme.textSecondary, textAlign: 'center', marginBottom: 20 }}>
                Share your knowledge and help fellow students while earning money!
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: currentTheme.primary,
                  borderRadius: 24,
                  paddingHorizontal: 24,
                  paddingVertical: 12
                }}
                onPress={() => setShowTutorProfile(true)}
              >
                <Text style={{ color: currentTheme.background, fontWeight: 'bold', fontSize: 16 }}>
                  🎯 Create Tutor Profile
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {activeTab === 'ai_recommendations' && renderAIRecommendations()}

      {/* Create Request Modal */}
      <Modal
        visible={showCreateRequest}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: currentTheme.background }}>
          <View style={{
            backgroundColor: currentTheme.background,
            paddingTop: 56,
            paddingBottom: 20,
            paddingHorizontal: 20,
            borderBottomWidth: 1,
            borderBottomColor: currentTheme.border
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setShowCreateRequest(false)}>
                <Text style={{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary }}>
                📝 Request Tutoring
              </Text>
              <TouchableOpacity onPress={submitRequest}>
                <Text style={{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={{ flex: 1, padding: 20 }}>
            {/* Subject */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
                Subject *
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {subjects.map((subject) => (
                  <TouchableOpacity
                    key={subject}
                    style={{
                      backgroundColor: newRequest.subject === subject ? currentTheme.primary : currentTheme.surface,
                      borderRadius: 20,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      marginRight: 8,
                      borderWidth: 1,
                      borderColor: currentTheme.border
                    }}
                    onPress={() => setNewRequest(prev => ({ ...prev, subject }))}
                  >
                    <Text style={{
                      color: newRequest.subject === subject ? currentTheme.background : currentTheme.primary,
                      fontWeight: '600'
                    }}>
                      {subject}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Course Code */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
                Course Code
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
                placeholder="e.g., MATH201, CHEM101"
                placeholderTextColor={currentTheme.textSecondary}
                value={newRequest.course_code}
                onChangeText={(text) => setNewRequest(prev => ({ ...prev, course_code: text.toUpperCase() }))}
              />
            </View>

            {/* Topic Description */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
                What do you need help with? *
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
                  minHeight: 100,
                  textAlignVertical: 'top'
                }}
                placeholder="Describe the specific topics or concepts you need help with..."
                placeholderTextColor={currentTheme.textSecondary}
                value={newRequest.topic_description}
                onChangeText={(text) => setNewRequest(prev => ({ ...prev, topic_description: text }))}
                multiline
              />
            </View>

            {/* Session Type */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
                Session Type
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {sessionTypes.map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    style={{
                      backgroundColor: newRequest.session_type === type.key ? currentTheme.primary : currentTheme.surface,
                      borderRadius: 20,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      marginRight: 12,
                      borderWidth: 1,
                      borderColor: currentTheme.border
                    }}
                    onPress={() => setNewRequest(prev => ({ ...prev, session_type: type.key }))}
                  >
                    <Text style={{
                      color: newRequest.session_type === type.key ? currentTheme.background : currentTheme.primary,
                      fontWeight: '600',
                      fontSize: 12,
                      textAlign: 'center'
                    }}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Urgency Level */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
                Urgency Level
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {urgencyLevels.map((urgency) => (
                  <TouchableOpacity
                    key={urgency.key}
                    style={{
                      backgroundColor: newRequest.urgency_level === urgency.key ? urgency.color : currentTheme.surface,
                      borderRadius: 20,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      marginRight: 8,
                      borderWidth: 1,
                      borderColor: currentTheme.border
                    }}
                    onPress={() => setNewRequest(prev => ({ ...prev, urgency_level: urgency.key }))}
                  >
                    <Text style={{
                      color: newRequest.urgency_level === urgency.key ? 'white' : currentTheme.primary,
                      fontWeight: '600'
                    }}>
                      {urgency.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Budget Range */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
                Budget Range
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
                placeholder="e.g., $20-30/hour, $50 total"
                placeholderTextColor={currentTheme.textSecondary}
                value={newRequest.budget_range}
                onChangeText={(text) => setNewRequest(prev => ({ ...prev, budget_range: text }))}
              />
            </View>

            {/* Additional Notes */}
            <View style={{ marginBottom: 40 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
                Additional Notes
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
                  minHeight: 80,
                  textAlignVertical: 'top'
                }}
                placeholder="Any additional information for potential tutors..."
                placeholderTextColor={currentTheme.textSecondary}
                value={newRequest.additional_notes}
                onChangeText={(text) => setNewRequest(prev => ({ ...prev, additional_notes: text }))}
                multiline
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Tutor Profile Modal */}
      <Modal
        visible={showTutorProfile}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: currentTheme.background }}>
          <View style={{
            backgroundColor: currentTheme.background,
            paddingTop: 56,
            paddingBottom: 20,
            paddingHorizontal: 20,
            borderBottomWidth: 1,
            borderBottomColor: currentTheme.border
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setShowTutorProfile(false)}>
                <Text style={{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary }}>
                🎓 Tutor Profile
              </Text>
              <TouchableOpacity onPress={submitTutorProfile}>
                <Text style={{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={{ flex: 1, padding: 20 }}>
            {/* Bio */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
                Bio *
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
                  minHeight: 100,
                  textAlignVertical: 'top'
                }}
                placeholder="Tell students about your tutoring experience and teaching style..."
                placeholderTextColor={currentTheme.textSecondary}
                value={tutorProfileForm.bio}
                onChangeText={(text) => setTutorProfileForm(prev => ({ ...prev, bio: text }))}
                multiline
              />
            </View>

            {/* Subjects */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
                Subjects You Can Tutor *
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {subjects.map((subject) => (
                  <TouchableOpacity
                    key={subject}
                    style={{
                      backgroundColor: tutorProfileForm.subjects.includes(subject) ? currentTheme.primary : currentTheme.surface,
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      marginRight: 8,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: currentTheme.border
                    }}
                    onPress={() => {
                      const subjects = tutorProfileForm.subjects.includes(subject)
                        ? tutorProfileForm.subjects.filter(s => s !== subject)
                        : [...tutorProfileForm.subjects, subject];
                      setTutorProfileForm(prev => ({ ...prev, subjects }));
                    }}
                  >
                    <Text style={{
                      color: tutorProfileForm.subjects.includes(subject) ? currentTheme.background : currentTheme.primary,
                      fontSize: 12,
                      fontWeight: '600'
                    }}>
                      {subject}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Hourly Rate */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
                Hourly Rate (USD)
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
                placeholder="e.g., 25.00"
                placeholderTextColor={currentTheme.textSecondary}
                value={tutorProfileForm.hourly_rate}
                onChangeText={(text) => setTutorProfileForm(prev => ({ ...prev, hourly_rate: text }))}
                keyboardType="numeric"
              />
            </View>

            {/* Tutoring Experience */}
            <View style={{ marginBottom: 40 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
                Tutoring Experience
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
                  minHeight: 80,
                  textAlignVertical: 'top'
                }}
                placeholder="Describe your tutoring experience, teaching methods, etc..."
                placeholderTextColor={currentTheme.textSecondary}
                value={tutorProfileForm.tutoring_experience}
                onChangeText={(text) => setTutorProfileForm(prev => ({ ...prev, tutoring_experience: text }))}
                multiline
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
} 