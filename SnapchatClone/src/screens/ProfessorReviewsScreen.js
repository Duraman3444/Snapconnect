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
  RefreshControl
} from 'react-native';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';

export default function ProfessorReviewsScreen({ navigation }) {
  const [professors, setProfessors] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddReview, setShowAddReview] = useState(false);
  const [selectedProfessor, setSelectedProfessor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  
  const { currentUser, supabase } = useAuth();
  const { currentTheme } = useTheme();

  // New review form state
  const [newReview, setNewReview] = useState({
    professor_id: '',
    course_code: '',
    semester: 'Fall',
    year: new Date().getFullYear(),
    overall_rating: 5,
    difficulty_rating: 3,
    teaching_quality: 5,
    accessibility: 5,
    workload_rating: 3,
    review_text: '',
    would_recommend: true,
    attendance_required: false,
    extra_credit_offered: false,
    tags: [],
    is_anonymous: true
  });

  const availableTags = [
    'engaging', 'helpful', 'clear', 'organized', 'fair', 'knowledgeable',
    'tough_grader', 'boring', 'unclear', 'disorganized', 'unfair', 'rude'
  ];

  const departments = ['all', 'Chemistry', 'Mathematics', 'Computer Science', 'English', 'Physics', 'Biology'];

  useEffect(() => {
    loadProfessors();
  }, [currentUser]);

  const loadProfessors = async () => {
    if (!currentUser?.id) return;

    try {
      const { data: professorsData, error } = await supabase
        .from('professors')
        .select('*')
        .eq('university', currentUser.university || 'University Sample')
        .order('name');

      if (error) {
        console.error('Error fetching professors:', error);
        // Mock data for development
        setProfessors([
          {
            id: '1',
            name: 'Dr. Sarah Johnson',
            department: 'Chemistry',
            university: 'University Sample',
            courses_taught: ['CHEM 101', 'CHEM 201', 'CHEM 301'],
            average_rating: 4.2,
            total_reviews: 15,
            research_interests: ['Organic Chemistry', 'Biochemistry']
          },
          {
            id: '2',
            name: 'Prof. Michael Chen',
            department: 'Mathematics',
            university: 'University Sample',
            courses_taught: ['MATH 101', 'MATH 201', 'MATH 301'],
            average_rating: 4.8,
            total_reviews: 23,
            research_interests: ['Calculus', 'Linear Algebra']
          },
          {
            id: '3',
            name: 'Dr. Emily Rodriguez',
            department: 'Computer Science',
            university: 'University Sample',
            courses_taught: ['CS 101', 'CS 201', 'CS 301'],
            average_rating: 4.5,
            total_reviews: 18,
            research_interests: ['Machine Learning', 'Data Structures']
          }
        ]);
        return;
      }

      setProfessors(professorsData || []);
    } catch (error) {
      console.error('Error loading professors:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async (professorId) => {
    try {
      const { data: reviewsData, error } = await supabase
        .from('professor_reviews')
        .select(`
          *,
          profiles!professor_reviews_user_id_fkey (
            username,
            display_name
          )
        `)
        .eq('professor_id', professorId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reviews:', error);
        // Mock data for development
        setReviews([
          {
            id: '1',
            course_code: 'CHEM 101',
            semester: 'Fall',
            year: 2024,
            overall_rating: 4,
            difficulty_rating: 3,
            teaching_quality: 4,
            accessibility: 5,
            workload_rating: 3,
            review_text: 'Great professor! Very clear explanations and always available for help.',
            would_recommend: true,
            attendance_required: true,
            extra_credit_offered: false,
            tags: ['engaging', 'helpful', 'clear'],
            is_anonymous: true,
            created_at: '2024-01-15T10:00:00Z',
            profiles: { username: 'Anonymous', display_name: 'Anonymous Student' }
          }
        ]);
        return;
      }

      setReviews(reviewsData || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const submitReview = async () => {
    if (!newReview.course_code || !newReview.review_text) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('professor_reviews')
        .insert([{
          ...newReview,
          user_id: currentUser.id,
          professor_id: selectedProfessor.id
        }]);

      if (error) {
        console.error('Error submitting review:', error);
        Alert.alert('Error', 'Failed to submit review');
        return;
      }

      Alert.alert('Success', 'Review submitted successfully!');
      setShowAddReview(false);
      resetReviewForm();
      loadReviews(selectedProfessor.id);
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review');
    }
  };

  const resetReviewForm = () => {
    setNewReview({
      professor_id: '',
      course_code: '',
      semester: 'Fall',
      year: new Date().getFullYear(),
      overall_rating: 5,
      difficulty_rating: 3,
      teaching_quality: 5,
      accessibility: 5,
      workload_rating: 3,
      review_text: '',
      would_recommend: true,
      attendance_required: false,
      extra_credit_offered: false,
      tags: [],
      is_anonymous: true
    });
  };

  const filteredProfessors = professors.filter(prof => {
    const matchesSearch = prof.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         prof.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         prof.courses_taught.some(course => course.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDepartment = filterDepartment === 'all' || prof.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return '#10b981';
    if (rating >= 3.5) return '#f59e0b';
    return '#ef4444';
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text key={i} style={{ color: i <= rating ? '#f59e0b' : '#d1d5db', fontSize: 16 }}>
          ★
        </Text>
      );
    }
    return stars;
  };

  const renderProfessorItem = ({ item }) => (
    <TouchableOpacity
      style={{
        backgroundColor: currentTheme.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: currentTheme.border
      }}
      onPress={() => {
        setSelectedProfessor(item);
        loadReviews(item.id);
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 4 }}>
            {item.name}
          </Text>
          <Text style={{ fontSize: 14, color: currentTheme.secondary, marginBottom: 8 }}>
            {item.department} • {item.university}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: getRatingColor(item.average_rating) }}>
            {item.average_rating.toFixed(1)}
          </Text>
          <View style={{ flexDirection: 'row' }}>
            {renderStars(Math.round(item.average_rating))}
          </View>
          <Text style={{ fontSize: 12, color: currentTheme.textSecondary, marginTop: 2 }}>
            {item.total_reviews} reviews
          </Text>
        </View>
      </View>

      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 4 }}>
          Courses Taught:
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {item.courses_taught.map((course, index) => (
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
                {course}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {item.research_interests && item.research_interests.length > 0 && (
        <View>
          <Text style={{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 4 }}>
            Research Interests:
          </Text>
          <Text style={{ fontSize: 14, color: currentTheme.primary }}>
            {item.research_interests.join(', ')}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderReviewItem = ({ item }) => (
    <View
      style={{
        backgroundColor: currentTheme.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: currentTheme.border
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <View>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: currentTheme.primary }}>
            {item.course_code} - {item.semester} {item.year}
          </Text>
          <Text style={{ fontSize: 14, color: currentTheme.textSecondary }}>
            {item.is_anonymous ? 'Anonymous Student' : item.profiles?.display_name || 'Student'}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: getRatingColor(item.overall_rating) }}>
            {item.overall_rating}/5
          </Text>
          <View style={{ flexDirection: 'row' }}>
            {renderStars(item.overall_rating)}
          </View>
        </View>
      </View>

      <Text style={{ fontSize: 14, color: currentTheme.primary, marginBottom: 12, lineHeight: 20 }}>
        {item.review_text}
      </Text>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, color: currentTheme.textSecondary, marginBottom: 2 }}>
            Teaching: {renderStars(item.teaching_quality)}
          </Text>
          <Text style={{ fontSize: 12, color: currentTheme.textSecondary, marginBottom: 2 }}>
            Difficulty: {renderStars(item.difficulty_rating)}
          </Text>
          <Text style={{ fontSize: 12, color: currentTheme.textSecondary }}>
            Accessibility: {renderStars(item.accessibility)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, color: currentTheme.textSecondary, marginBottom: 2 }}>
            Workload: {renderStars(item.workload_rating)}
          </Text>
          <Text style={{ fontSize: 12, color: item.would_recommend ? '#10b981' : '#ef4444' }}>
            {item.would_recommend ? '✅ Would Recommend' : '❌ Would Not Recommend'}
          </Text>
        </View>
      </View>

      {item.tags && item.tags.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
          {item.tags.map((tag, index) => (
            <View
              key={index}
              style={{
                backgroundColor: currentTheme.border,
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 4,
                marginRight: 6,
                marginBottom: 4
              }}
            >
              <Text style={{ color: currentTheme.textSecondary, fontSize: 12 }}>
                {tag.replace('_', ' ')}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: currentTheme.textSecondary }}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: currentTheme.textSecondary, marginRight: 4 }}>
            Attendance: {item.attendance_required ? 'Required' : 'Not Required'}
          </Text>
          {item.extra_credit_offered && (
            <Text style={{ fontSize: 12, color: '#10b981' }}>• Extra Credit Available</Text>
          )}
        </View>
      </View>
    </View>
  );

  if (selectedProfessor) {
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <TouchableOpacity onPress={() => setSelectedProfessor(null)}>
              <Text style={{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAddReview(true)}>
              <View style={{ backgroundColor: currentTheme.primary, borderRadius: 20, padding: 8 }}>
                <Text style={{ color: currentTheme.background, fontSize: 16, fontWeight: 'bold' }}>✍️ Review</Text>
              </View>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 4 }}>
            {selectedProfessor.name}
          </Text>
          <Text style={{ fontSize: 16, color: currentTheme.secondary }}>
            {selectedProfessor.department} • {selectedProfessor.average_rating.toFixed(1)}/5 ({selectedProfessor.total_reviews} reviews)
          </Text>
        </View>

        <FlatList
          data={reviews}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>📝</Text>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 8 }}>
                No Reviews Yet
              </Text>
              <Text style={{ color: currentTheme.textSecondary, textAlign: 'center' }}>
                Be the first to review this professor!
              </Text>
            </View>
          }
        />

        {/* Add Review Modal */}
        <Modal
          visible={showAddReview}
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
                <TouchableOpacity onPress={() => setShowAddReview(false)}>
                  <Text style={{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary }}>
                  Review Professor
                </Text>
                <TouchableOpacity onPress={submitReview}>
                  <Text style={{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }}>Submit</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={{ flex: 1, padding: 20 }}>
              {/* Course Code */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
                  Course Code *
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
                  placeholder="e.g., CHEM 101"
                  placeholderTextColor={currentTheme.textSecondary}
                  value={newReview.course_code}
                  onChangeText={(text) => setNewReview(prev => ({ ...prev, course_code: text.toUpperCase() }))}
                />
              </View>

              {/* Semester and Year */}
              <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
                    Semester
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {['Fall', 'Spring', 'Summer'].map((semester) => (
                      <TouchableOpacity
                        key={semester}
                        style={{
                          backgroundColor: newReview.semester === semester ? currentTheme.primary : currentTheme.surface,
                          borderRadius: 20,
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          marginRight: 8,
                          borderWidth: 1,
                          borderColor: currentTheme.border
                        }}
                        onPress={() => setNewReview(prev => ({ ...prev, semester }))}
                      >
                        <Text style={{
                          color: newReview.semester === semester ? currentTheme.background : currentTheme.primary,
                          fontWeight: '600'
                        }}>
                          {semester}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
                    Year
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
                    placeholder="2024"
                    placeholderTextColor={currentTheme.textSecondary}
                    value={newReview.year.toString()}
                    onChangeText={(text) => setNewReview(prev => ({ ...prev, year: parseInt(text) || new Date().getFullYear() }))}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Ratings */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 12 }}>
                  Ratings
                </Text>
                {[
                  { key: 'overall_rating', label: 'Overall Rating' },
                  { key: 'teaching_quality', label: 'Teaching Quality' },
                  { key: 'difficulty_rating', label: 'Difficulty Level' },
                  { key: 'accessibility', label: 'Accessibility' },
                  { key: 'workload_rating', label: 'Workload' }
                ].map((rating) => (
                  <View key={rating.key} style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 14, color: currentTheme.primary, marginBottom: 8 }}>
                      {rating.label}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                          key={star}
                          onPress={() => setNewReview(prev => ({ ...prev, [rating.key]: star }))}
                          style={{ padding: 8 }}
                        >
                          <Text style={{ 
                            fontSize: 24, 
                            color: star <= newReview[rating.key] ? '#f59e0b' : '#d1d5db' 
                          }}>
                            ★
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </View>

              {/* Review Text */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
                  Your Review *
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
                    minHeight: 120,
                    textAlignVertical: 'top'
                  }}
                  placeholder="Share your experience with this professor..."
                  placeholderTextColor={currentTheme.textSecondary}
                  value={newReview.review_text}
                  onChangeText={(text) => setNewReview(prev => ({ ...prev, review_text: text }))}
                  multiline
                />
              </View>

              {/* Tags */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
                  Tags (Select all that apply)
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {availableTags.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={{
                        backgroundColor: newReview.tags.includes(tag) ? currentTheme.primary : currentTheme.surface,
                        borderRadius: 20,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        marginRight: 8,
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: currentTheme.border
                      }}
                      onPress={() => {
                        const tags = newReview.tags.includes(tag)
                          ? newReview.tags.filter(t => t !== tag)
                          : [...newReview.tags, tag];
                        setNewReview(prev => ({ ...prev, tags }));
                      }}
                    >
                      <Text style={{
                        color: newReview.tags.includes(tag) ? currentTheme.background : currentTheme.primary,
                        fontSize: 12,
                        fontWeight: '600'
                      }}>
                        {tag.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Additional Options */}
              <View style={{ marginBottom: 40 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 12 }}>
                  Additional Information
                </Text>
                
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: currentTheme.surface,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: currentTheme.border
                  }}
                  onPress={() => setNewReview(prev => ({ ...prev, would_recommend: !prev.would_recommend }))}
                >
                  <Text style={{ fontSize: 18, marginRight: 12 }}>
                    {newReview.would_recommend ? '✅' : '⬜'}
                  </Text>
                  <Text style={{ fontSize: 16, color: currentTheme.primary }}>
                    I would recommend this professor
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: currentTheme.surface,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: currentTheme.border
                  }}
                  onPress={() => setNewReview(prev => ({ ...prev, attendance_required: !prev.attendance_required }))}
                >
                  <Text style={{ fontSize: 18, marginRight: 12 }}>
                    {newReview.attendance_required ? '✅' : '⬜'}
                  </Text>
                  <Text style={{ fontSize: 16, color: currentTheme.primary }}>
                    Attendance was required
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: currentTheme.surface,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: currentTheme.border
                  }}
                  onPress={() => setNewReview(prev => ({ ...prev, extra_credit_offered: !prev.extra_credit_offered }))}
                >
                  <Text style={{ fontSize: 18, marginRight: 12 }}>
                    {newReview.extra_credit_offered ? '✅' : '⬜'}
                  </Text>
                  <Text style={{ fontSize: 16, color: currentTheme.primary }}>
                    Extra credit was offered
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: currentTheme.surface,
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: currentTheme.border
                  }}
                  onPress={() => setNewReview(prev => ({ ...prev, is_anonymous: !prev.is_anonymous }))}
                >
                  <Text style={{ fontSize: 18, marginRight: 12 }}>
                    {newReview.is_anonymous ? '✅' : '⬜'}
                  </Text>
                  <Text style={{ fontSize: 16, color: currentTheme.primary }}>
                    Submit review anonymously
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>
      </View>
    );
  }

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
            👨‍🏫 Professor Reviews
          </Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Search */}
        <TextInput
          style={{
            backgroundColor: currentTheme.surface,
            borderRadius: 12,
            padding: 16,
            fontSize: 16,
            color: currentTheme.primary,
            borderWidth: 1,
            borderColor: currentTheme.border,
            marginBottom: 12
          }}
          placeholder="Search professors, departments, or courses..."
          placeholderTextColor={currentTheme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Department Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {departments.map((dept) => (
            <TouchableOpacity
              key={dept}
              style={{
                backgroundColor: filterDepartment === dept ? currentTheme.primary : currentTheme.surface,
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 10,
                marginRight: 8,
                borderWidth: 1,
                borderColor: currentTheme.border
              }}
              onPress={() => setFilterDepartment(dept)}
            >
              <Text style={{
                color: filterDepartment === dept ? currentTheme.background : currentTheme.primary,
                fontWeight: '600',
                textTransform: 'capitalize'
              }}>
                {dept}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredProfessors}
        renderItem={renderProfessorItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadProfessors}
            tintColor={currentTheme.primary}
          />
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🔍</Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 8 }}>
              No Professors Found
            </Text>
            <Text style={{ color: currentTheme.textSecondary, textAlign: 'center' }}>
              Try adjusting your search or filter criteria
            </Text>
          </View>
        }
      />
    </View>
  );
} 