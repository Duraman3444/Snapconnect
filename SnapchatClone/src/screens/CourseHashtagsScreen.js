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

export default function CourseHashtagsScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  const [userCourses, setUserCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddPost, setShowAddPost] = useState(false);
  const [selectedHashtag, setSelectedHashtag] = useState(null);
  
  const { currentUser, supabase } = useAuth();
  const { currentTheme } = useTheme();

  // New post form state
  const [newPost, setNewPost] = useState({
    content: '',
    post_type: 'general',
    course_hashtags: [],
    visibility: 'public'
  });

  const postTypes = [
    { key: 'general', label: '💬 General', icon: '💬' },
    { key: 'study_tip', label: '💡 Study Tip', icon: '💡' },
    { key: 'question', label: '❓ Question', icon: '❓' },
    { key: 'resource_share', label: '📚 Resource', icon: '📚' }
  ];

  const visibilityOptions = [
    { key: 'public', label: '🌍 Public', description: 'Everyone can see' },
    { key: 'friends', label: '👥 Friends', description: 'Only friends can see' },
    { key: 'course_only', label: '📚 Course Only', description: 'Only students in these courses' }
  ];

  useEffect(() => {
    if (currentUser) {
      Promise.all([
        loadPosts(),
        loadTrendingHashtags(),
        loadUserCourses()
      ]);
    }
  }, [currentUser, selectedHashtag]);

  const loadPosts = async () => {
    if (!currentUser?.id) return;

    try {
      setLoading(true);
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey (
            username,
            display_name
          )
        `)
        .order('created_at', { ascending: false });

      // Filter by selected hashtag
      if (selectedHashtag) {
        query = query.contains('course_hashtags', [selectedHashtag]);
      }

      const { data: postsData, error } = await query;

      if (error) {
        console.error('Error fetching posts:', error);
        // Mock data for development
        setPosts([
          {
            id: '1',
            user_id: currentUser.id,
            content: 'Just finished my CHEM101 lab report! The titration experiment was challenging but fun. Anyone else struggling with molarity calculations? #CHEM101 #StudyTip',
            post_type: 'study_tip',
            course_hashtags: ['CHEM101'],
            visibility: 'public',
            likes_count: 8,
            comments_count: 3,
            created_at: '2024-01-15T10:00:00Z',
            profiles: {
              username: currentUser.username,
              display_name: currentUser.display_name || currentUser.username
            }
          },
          {
            id: '2',
            user_id: '2',
            content: 'Does anyone have good notes for MATH201 Chapter 5? The integration by parts section is confusing me. Will trade for my organic chemistry notes! #MATH201 #StudyGroup',
            post_type: 'question',
            course_hashtags: ['MATH201'],
            visibility: 'public',
            likes_count: 12,
            comments_count: 7,
            created_at: '2024-01-14T15:30:00Z',
            profiles: {
              username: 'sarah_student',
              display_name: 'Sarah Johnson'
            }
          }
        ]);
        return;
      }

      setPosts(postsData || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrendingHashtags = async () => {
    try {
      const { data: hashtagsData, error } = await supabase
        .rpc('get_trending_hashtags', { limit_count: 10 });

      if (error) {
        console.error('Error fetching trending hashtags:', error);
        // Mock data
        setTrendingHashtags([
          { hashtag: '#CHEM101', usage_count: 25 },
          { hashtag: '#MATH201', usage_count: 18 },
          { hashtag: '#CS101', usage_count: 15 },
          { hashtag: '#ENG102', usage_count: 12 },
          { hashtag: '#PHYS101', usage_count: 8 }
        ]);
        return;
      }

      setTrendingHashtags(hashtagsData || []);
    } catch (error) {
      console.error('Error loading trending hashtags:', error);
    }
  };

  const loadUserCourses = async () => {
    if (!currentUser?.id) return;

    try {
      const { data: coursesData, error } = await supabase
        .from('user_courses')
        .select(`
          courses (
            id,
            course_code,
            course_name
          )
        `)
        .eq('user_id', currentUser.id)
        .eq('enrollment_status', 'enrolled');

      if (error) {
        console.error('Error fetching user courses:', error);
        // Mock data
        setUserCourses([
          { id: '1', course_code: 'CHEM101', course_name: 'General Chemistry I' },
          { id: '2', course_code: 'MATH201', course_name: 'Calculus II' },
          { id: '3', course_code: 'CS101', course_name: 'Introduction to Programming' }
        ]);
        return;
      }

      const courses = coursesData?.map(uc => uc.courses).filter(c => c) || [];
      setUserCourses(courses);
    } catch (error) {
      console.error('Error loading user courses:', error);
    }
  };

  const extractHashtags = (text) => {
    const hashtagRegex = /#([A-Z]{2,6}[0-9]{2,4}[A-Z]?)/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  };

  const submitPost = async () => {
    if (!newPost.content.trim()) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }

    try {
      // Auto-detect hashtags from content
      const detectedHashtags = extractHashtags(newPost.content.toUpperCase());
      
      const { data, error } = await supabase
        .from('posts')
        .insert([{
          ...newPost,
          user_id: currentUser.id,
          course_hashtags: [...new Set([...newPost.course_hashtags, ...detectedHashtags])]
        }]);

      if (error) {
        console.error('Error submitting post:', error);
        Alert.alert('Error', 'Failed to create post');
        return;
      }

      Alert.alert('Success', 'Post created successfully!');
      setShowAddPost(false);
      resetPostForm();
      loadPosts();
      loadTrendingHashtags();
    } catch (error) {
      console.error('Error submitting post:', error);
      Alert.alert('Error', 'Failed to create post');
    }
  };

  const resetPostForm = () => {
    setNewPost({
      content: '',
      post_type: 'general',
      course_hashtags: [],
      visibility: 'public'
    });
  };

  const likePost = async (postId) => {
    try {
      const { data, error } = await supabase
        .from('post_interactions')
        .upsert([{
          post_id: postId,
          user_id: currentUser.id,
          interaction_type: 'like'
        }]);

      if (error) {
        console.error('Error liking post:', error);
        return;
      }

      // Update local state
      setPosts(prev =>
        prev.map(post =>
          post.id === postId
            ? { ...post, likes_count: post.likes_count + 1 }
            : post
        )
      );
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const getPostTypeIcon = (type) => {
    const typeObj = postTypes.find(t => t.key === type);
    return typeObj ? typeObj.icon : '💬';
  };

  const renderPostItem = ({ item }) => (
    <View
      style={{
        backgroundColor: currentTheme.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: currentTheme.border
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{
          backgroundColor: currentTheme.primary,
          borderRadius: 24,
          width: 48,
          height: 48,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12
        }}>
          <Text style={{ color: currentTheme.background, fontWeight: 'bold', fontSize: 18 }}>
            {item.profiles?.display_name?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: currentTheme.primary }}>
            {item.profiles?.display_name || 'Anonymous Student'}
          </Text>
          <Text style={{ fontSize: 14, color: currentTheme.textSecondary }}>
            {new Date(item.created_at).toLocaleDateString()} • {new Date(item.created_at).toLocaleTimeString()}
          </Text>
        </View>
        <View style={{
          backgroundColor: currentTheme.border,
          borderRadius: 12,
          paddingHorizontal: 8,
          paddingVertical: 4,
          flexDirection: 'row',
          alignItems: 'center'
        }}>
          <Text style={{ fontSize: 16, marginRight: 4 }}>
            {getPostTypeIcon(item.post_type)}
          </Text>
          <Text style={{ fontSize: 12, color: currentTheme.textSecondary, textTransform: 'capitalize' }}>
            {item.post_type.replace('_', ' ')}
          </Text>
        </View>
      </View>

      {/* Content */}
      <Text style={{
        fontSize: 16,
        color: currentTheme.primary,
        lineHeight: 22,
        marginBottom: 16
      }}>
        {item.content}
      </Text>

      {/* Course Hashtags */}
      {item.course_hashtags && item.course_hashtags.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
          {item.course_hashtags.map((hashtag) => (
            <TouchableOpacity
              key={hashtag}
              style={{
                backgroundColor: currentTheme.primary,
                borderRadius: 12,
                paddingHorizontal: 8,
                paddingVertical: 4,
                marginRight: 8,
                marginBottom: 4
              }}
              onPress={() => setSelectedHashtag(hashtag)}
            >
              <Text style={{ color: currentTheme.background, fontSize: 12, fontWeight: '600' }}>
                #{hashtag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: currentTheme.border,
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 6,
              marginRight: 12
            }}
            onPress={() => likePost(item.id)}
          >
            <Text style={{ fontSize: 16, marginRight: 4 }}>👍</Text>
            <Text style={{ fontSize: 14, color: currentTheme.textSecondary }}>
              {item.likes_count}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: currentTheme.border,
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 6
            }}
          >
            <Text style={{ fontSize: 16, marginRight: 4 }}>💬</Text>
            <Text style={{ fontSize: 14, color: currentTheme.textSecondary }}>
              {item.comments_count}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 12, color: currentTheme.textSecondary, textTransform: 'capitalize' }}>
          {item.visibility}
        </Text>
      </View>
    </View>
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
            {selectedHashtag ? `#${selectedHashtag}` : '# Course Feed'}
          </Text>
          <TouchableOpacity onPress={() => setShowAddPost(true)}>
            <View style={{ backgroundColor: currentTheme.primary, borderRadius: 20, padding: 8 }}>
              <Text style={{ color: currentTheme.background, fontSize: 16, fontWeight: 'bold' }}>+ Post</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Clear Filter */}
        {selectedHashtag && (
          <TouchableOpacity
            style={{
              backgroundColor: currentTheme.surface,
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: currentTheme.border,
              alignItems: 'center'
            }}
            onPress={() => setSelectedHashtag(null)}
          >
            <Text style={{ color: currentTheme.primary, fontWeight: '600' }}>
              ← Show All Posts
            </Text>
          </TouchableOpacity>
        )}

        {/* Trending Hashtags */}
        {!selectedHashtag && (
          <View>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 8 }}>
              🔥 Trending Course Tags
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {trendingHashtags.map((item) => (
                <TouchableOpacity
                  key={item.hashtag}
                  style={{
                    backgroundColor: currentTheme.surface,
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    marginRight: 8,
                    borderWidth: 1,
                    borderColor: currentTheme.border,
                    alignItems: 'center'
                  }}
                  onPress={() => setSelectedHashtag(item.hashtag.substring(1))}
                >
                  <Text style={{ color: currentTheme.primary, fontWeight: '600', fontSize: 14 }}>
                    {item.hashtag}
                  </Text>
                  <Text style={{ color: currentTheme.textSecondary, fontSize: 12 }}>
                    {item.usage_count} posts
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      <FlatList
        data={posts}
        renderItem={renderPostItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadPosts}
            tintColor={currentTheme.primary}
          />
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>📚</Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 8 }}>
              {selectedHashtag ? `No #${selectedHashtag} Posts Yet` : 'No Posts Yet'}
            </Text>
            <Text style={{ color: currentTheme.textSecondary, textAlign: 'center', marginBottom: 20 }}>
              {selectedHashtag 
                ? `Be the first to post about ${selectedHashtag}!`
                : 'Share something with your course hashtags to get started!'}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: currentTheme.primary,
                borderRadius: 24,
                paddingHorizontal: 24,
                paddingVertical: 12
              }}
              onPress={() => setShowAddPost(true)}
            >
              <Text style={{ color: currentTheme.background, fontWeight: 'bold', fontSize: 16 }}>
                📝 Create Post
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Add Post Modal */}
      <Modal
        visible={showAddPost}
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
              <TouchableOpacity onPress={() => setShowAddPost(false)}>
                <Text style={{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary }}>
                📝 Create Post
              </Text>
              <TouchableOpacity onPress={submitPost}>
                <Text style={{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }}>Post</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={{ flex: 1, padding: 20 }}>
            {/* Post Type */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
                Post Type
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {postTypes.map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    style={{
                      backgroundColor: newPost.post_type === type.key ? currentTheme.primary : currentTheme.surface,
                      borderRadius: 20,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      marginRight: 12,
                      borderWidth: 1,
                      borderColor: currentTheme.border,
                      alignItems: 'center'
                    }}
                    onPress={() => setNewPost(prev => ({ ...prev, post_type: type.key }))}
                  >
                    <Text style={{ fontSize: 20, marginBottom: 4 }}>{type.icon}</Text>
                    <Text style={{
                      color: newPost.post_type === type.key ? currentTheme.background : currentTheme.primary,
                      fontWeight: '600',
                      fontSize: 12,
                      textAlign: 'center'
                    }}>
                      {type.label.replace(/💬|💡|❓|📚/, '').trim()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Content */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
                Content *
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
                placeholder="What's on your mind? Use #CHEM101, #MATH201 to tag courses..."
                placeholderTextColor={currentTheme.textSecondary}
                value={newPost.content}
                onChangeText={(text) => setNewPost(prev => ({ ...prev, content: text }))}
                multiline
              />
              <Text style={{ fontSize: 12, color: currentTheme.textSecondary, marginTop: 4 }}>
                Tip: Course hashtags like #CHEM101, #MATH201 will be automatically detected!
              </Text>
            </View>

            {/* Manual Course Tags */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
                Tag Your Courses
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {userCourses.map((course) => (
                  <TouchableOpacity
                    key={course.id}
                    style={{
                      backgroundColor: newPost.course_hashtags.includes(course.course_code) ? currentTheme.primary : currentTheme.surface,
                      borderRadius: 20,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      marginRight: 8,
                      borderWidth: 1,
                      borderColor: currentTheme.border
                    }}
                    onPress={() => {
                      const hashtags = newPost.course_hashtags.includes(course.course_code)
                        ? newPost.course_hashtags.filter(tag => tag !== course.course_code)
                        : [...newPost.course_hashtags, course.course_code];
                      setNewPost(prev => ({ ...prev, course_hashtags: hashtags }));
                    }}
                  >
                    <Text style={{
                      color: newPost.course_hashtags.includes(course.course_code) ? currentTheme.background : currentTheme.primary,
                      fontWeight: '600'
                    }}>
                      #{course.course_code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Visibility */}
            <View style={{ marginBottom: 40 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: currentTheme.primary, marginBottom: 8 }}>
                Who Can See This
              </Text>
              {visibilityOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: newPost.visibility === option.key ? currentTheme.primary : currentTheme.surface,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: currentTheme.border
                  }}
                  onPress={() => setNewPost(prev => ({ ...prev, visibility: option.key }))}
                >
                  <Text style={{
                    fontSize: 18,
                    marginRight: 12,
                    color: newPost.visibility === option.key ? currentTheme.background : currentTheme.primary
                  }}>
                    {newPost.visibility === option.key ? '●' : '○'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: newPost.visibility === option.key ? currentTheme.background : currentTheme.primary,
                      marginBottom: 2
                    }}>
                      {option.label}
                    </Text>
                    <Text style={{
                      fontSize: 14,
                      color: newPost.visibility === option.key ? currentTheme.background : currentTheme.textSecondary
                    }}>
                      {option.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
} 