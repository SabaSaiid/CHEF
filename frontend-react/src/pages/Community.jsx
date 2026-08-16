import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Flame, 
  ChefHat, 
  MessageSquare, 
  Trophy, 
  ShieldCheck, 
  Share2, 
  Heart, 
  Bookmark, 
  Sparkles, 
  Plus, 
  Trash2, 
  Clock, 
  Send, 
  Image as ImageIcon, 
  Search, 
  Filter, 
  CheckCircle2, 
  ArrowRight, 
  ExternalLink, 
  Tag, 
  Calendar, 
  TrendingUp, 
  Utensils, 
  BookOpen, 
  Info, 
  RefreshCw, 
  AlertTriangle, 
  Check, 
  X,
  Layers,
  ChevronRight
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import ChefScoreBadge from '../components/ChefScoreBadge';
import RecipeModal from '../components/RecipeModal';
import { getRecipeCardVisual } from '../utils/recipeVisuals';
import { 
  playClickSound, 
  playAddSound, 
  playSuccessSound, 
  playWarningSound 
} from '../utils/soundEffects';

export default function Community() {
  const { token, username: currentUsername } = useContext(AuthContext);
  const toast = useToast();
  const navigate = useNavigate();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState('global'); // 'global' | 'following' | 'recipes' | 'groups' | 'challenges' | 'moderation'

  // Social Feed state
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [creatingPost, setCreatingPost] = useState(false);
  const [feedMoodFilter, setFeedMoodFilter] = useState('all'); // 'all' | 'photos' | 'plans' | 'tips'
  const [deletingPostId, setDeletingPostId] = useState(null);

  // Comments state
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const [commentsMap, setCommentsMap] = useState({});
  const [loadingCommentsMap, setLoadingCommentsMap] = useState({});
  const [newCommentText, setNewCommentText] = useState('');

  // Media Lightbox
  const [lightboxImage, setLightboxImage] = useState(null);

  // Community Recipes state
  const [recipeSubTab, setRecipeSubTab] = useState('all'); // 'all' | 'my_submissions'
  const [communityRecipes, setCommunityRecipes] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [loadingMySubmissions, setLoadingMySubmissions] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [recipeDietFilter, setRecipeDietFilter] = useState('All');
  const [recipeSortBy, setRecipeSortBy] = useState('newest'); // 'newest' | 'nutri_score' | 'prep_time' | 'calories' | 'protein'
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [savingRecipeId, setSavingRecipeId] = useState(null);

  // Groups state
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupCategoryFilter, setGroupCategoryFilter] = useState('All');
  const [groupSearch, setGroupSearch] = useState('');
  const [groupPosts, setGroupPosts] = useState([]);
  const [loadingGroupFeed, setLoadingGroupFeed] = useState(false);
  const [newGroupPostContent, setNewGroupPostContent] = useState('');
  const [newGroupPostImage, setNewGroupPostImage] = useState('');
  const [creatingGroupPost, setCreatingGroupPost] = useState(false);

  // Group Creation Modal
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('Diet');
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Challenges state
  const [challenges, setChallenges] = useState([]);
  const [loadingChallenges, setLoadingChallenges] = useState(false);
  const [evaluatingProgress, setEvaluatingProgress] = useState({});

  // Admin Moderation state
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingRecipes, setPendingRecipes] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [moderatingId, setModeratingId] = useState(null);
  const [moderationNote, setModerationNote] = useState('');

  // Close lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && lightboxImage) {
        setLightboxImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImage]);

  // 1. Fetch posts & tab data
  useEffect(() => {
    if (activeTab === 'global') {
      setLoadingPosts(true);
      api.get('/community/feed/global')
        .then(data => setPosts(Array.isArray(data) ? data : []))
        .catch(err => console.error("Error fetching global feed:", err))
        .finally(() => setLoadingPosts(false));
    } else if (activeTab === 'following') {
      if (!token) return;
      setLoadingPosts(true);
      api.get('/community/feed/following')
        .then(data => setPosts(Array.isArray(data) ? data : []))
        .catch(err => console.error("Error fetching following feed:", err))
        .finally(() => setLoadingPosts(false));
    } else if (activeTab === 'recipes') {
      setLoadingRecipes(true);
      api.get('/community/recipes')
        .then(data => setCommunityRecipes(Array.isArray(data) ? data : []))
        .catch(err => console.error("Error fetching community recipes:", err))
        .finally(() => setLoadingRecipes(false));
      
      if (token) {
        setLoadingMySubmissions(true);
        api.get('/community/recipes/my-submissions')
          .then(data => setMySubmissions(Array.isArray(data) ? data : []))
          .catch(err => console.error("Error fetching my submissions:", err))
          .finally(() => setLoadingMySubmissions(false));
      }
    } else if (activeTab === 'groups') {
      setLoadingGroups(true);
      api.get('/community/groups')
        .then(data => setGroups(Array.isArray(data) ? data : []))
        .catch(err => console.error("Error fetching groups:", err))
        .finally(() => setLoadingGroups(false));
    } else if (activeTab === 'challenges') {
      setLoadingChallenges(true);
      api.get('/community/challenges')
        .then(data => setChallenges(Array.isArray(data) ? data : []))
        .catch(err => console.error("Error fetching challenges:", err))
        .finally(() => setLoadingChallenges(false));
    } else if (activeTab === 'moderation') {
      setLoadingPending(true);
      api.get('/community/recipes/pending')
        .then(data => setPendingRecipes(Array.isArray(data) ? data : []))
        .catch(err => console.error("Error fetching pending recipes:", err))
        .finally(() => setLoadingPending(false));
    }
  }, [activeTab, token]);

  // Check admin status on mount
  useEffect(() => {
    if (token) {
      api.get('/community/recipes/admin/check')
        .then(data => setIsAdmin(Boolean(data?.is_admin)))
        .catch(() => setIsAdmin(false));
    }
  }, [token]);

  // Community Overview Metrics
  const communityMetrics = useMemo(() => {
    return {
      postsCount: posts?.length || 12,
      recipesCount: communityRecipes?.length || 24,
      groupsCount: groups?.length || 3,
      challengesCount: challenges?.length || 3,
    };
  }, [posts, communityRecipes, groups, challenges]);

  // Quick Hashtag Tags Helper
  const QUICK_TAGS = ['#MealPrep', '#HighProtein', '#QuickDinner', '#Keto', '#Vegetarian', '#ChefTip'];

  const handleAppendTag = (tag) => {
    playClickSound();
    setNewPostContent(prev => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${tag} ` : `${tag} `;
    });
  };

  // Create Global Post
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!token) {
      playWarningSound();
      toast.showError("Please log in to post to the community.");
      return;
    }
    if (!newPostContent.trim()) return;

    setCreatingPost(true);
    playClickSound();
    try {
      const res = await api.post('/community/posts', {
        content: newPostContent.trim(),
        image_url: newPostImage.trim() || null,
      });
      playSuccessSound();
      toast.showSuccess("Post published to CHEF Community! 🚀");
      setNewPostContent('');
      setNewPostImage('');
      setPosts(prev => [res, ...prev]);
    } catch (err) {
      playWarningSound();
      toast.showError(err.response?.data?.detail || "Failed to create post.");
    } finally {
      setCreatingPost(false);
    }
  };

  // Delete own post
  const handleDeletePost = async (postId) => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    setDeletingPostId(postId);
    playClickSound();
    try {
      await api.delete(`/community/posts/${postId}`);
      setPosts(prev => prev.filter(p => p.id !== postId));
      setGroupPosts(prev => prev.filter(p => p.id !== postId));
      toast.showSuccess("Post deleted successfully.");
    } catch (err) {
      playWarningSound();
      toast.showError(err.response?.data?.detail || "Failed to delete post.");
    } finally {
      setDeletingPostId(null);
    }
  };

  // Create Group Post
  const handleCreateGroupPost = async (e) => {
    e.preventDefault();
    if (!token || !selectedGroup) return;
    if (!newGroupPostContent.trim()) return;

    setCreatingGroupPost(true);
    playClickSound();
    try {
      const res = await api.post('/community/posts', {
        content: newGroupPostContent.trim(),
        image_url: newGroupPostImage.trim() || null,
        group_id: selectedGroup.id
      });
      playSuccessSound();
      toast.showSuccess(`Posted in ${selectedGroup.name}! 💬`);
      setNewGroupPostContent('');
      setNewGroupPostImage('');
      setGroupPosts(prev => [res, ...prev]);
    } catch (err) {
      playWarningSound();
      toast.showError(err.response?.data?.detail || "Failed to post in group.");
    } finally {
      setCreatingGroupPost(false);
    }
  };

  // Helper Relative Time Formatter
  function formatRelativeTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 45) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Like Post (Global or Group) with Optimistic UI Update & Sound
  const handleLikePost = async (postId, isGroupPost = false) => {
    if (!token) {
      playWarningSound();
      toast.showError("Please log in to like posts.");
      return;
    }

    playClickSound();

    const updateOptimistic = prev => prev.map(p => {
      if (p.id === postId) {
        const nextIsLiked = !p.is_liked;
        const nextCount = nextIsLiked ? (p.likes_count || 0) + 1 : Math.max(0, (p.likes_count || 0) - 1);
        return { ...p, is_liked: nextIsLiked, likes_count: nextCount };
      }
      return p;
    });

    if (isGroupPost) setGroupPosts(updateOptimistic);
    else setPosts(updateOptimistic);

    try {
      const res = await api.post(`/community/posts/${postId}/like`);
      const syncFn = prev => prev.map(p => p.id === postId ? { ...p, likes_count: res.likes_count, is_liked: res.is_liked } : p);
      if (isGroupPost) setGroupPosts(syncFn);
      else setPosts(syncFn);
    } catch (err) {
      const rollbackFn = prev => prev.map(p => {
        if (p.id === postId) {
          const revertIsLiked = !p.is_liked;
          const revertCount = revertIsLiked ? (p.likes_count || 0) + 1 : Math.max(0, (p.likes_count || 0) - 1);
          return { ...p, is_liked: revertIsLiked, likes_count: revertCount };
        }
        return p;
      });
      if (isGroupPost) setGroupPosts(rollbackFn);
      else setPosts(rollbackFn);
      toast.showError("Failed to update like status.");
    }
  };

  // Toggle Comments Drawer
  const handleToggleComments = async (postId) => {
    playClickSound();
    if (activeCommentPostId === postId) {
      setActiveCommentPostId(null);
    } else {
      setActiveCommentPostId(postId);
      if (!commentsMap[postId]) {
        setLoadingCommentsMap(prev => ({ ...prev, [postId]: true }));
        try {
          const comms = await api.get(`/community/posts/${postId}/comments`);
          setCommentsMap(prev => ({ ...prev, [postId]: comms }));
        } catch (err) {
          console.error("Error fetching comments:", err);
        } finally {
          setLoadingCommentsMap(prev => ({ ...prev, [postId]: false }));
        }
      }
    }
  };

  // Add Comment with Optimistic UI Update
  const handleAddComment = async (postId, isGroupPost = false) => {
    if (!token) {
      playWarningSound();
      toast.showError("Please log in to comment.");
      return;
    }
    if (!newCommentText.trim()) return;

    const commentText = newCommentText.trim();
    setNewCommentText('');
    playAddSound();

    const tempComment = {
      id: 'temp-' + Date.now(),
      post_id: postId,
      user_id: 9999,
      username: currentUsername || 'You',
      content: commentText,
      created_at: new Date().toISOString()
    };

    setCommentsMap(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), tempComment]
    }));

    const incCountFn = prev => prev.map(p => p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p);
    if (isGroupPost) setGroupPosts(incCountFn);
    else setPosts(incCountFn);

    try {
      const comm = await api.post(`/community/posts/${postId}/comments`, { content: commentText });
      setCommentsMap(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).map(c => c.id === tempComment.id ? comm : c)
      }));
    } catch (err) {
      setCommentsMap(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).filter(c => c.id !== tempComment.id)
      }));
      const decCountFn = prev => prev.map(p => p.id === postId ? { ...p, comments_count: Math.max(0, (p.comments_count || 0) - 1) } : p);
      if (isGroupPost) setGroupPosts(decCountFn);
      else setPosts(decCountFn);
      playWarningSound();
      toast.showError(err.response?.data?.detail || "Failed to add comment.");
    }
  };

  // Save Community Recipe to personal cookbook collection
  const handleSaveCommunityRecipe = async (e, r) => {
    e.stopPropagation();
    if (!token) {
      playWarningSound();
      toast.showError("Please log in to save recipes to your collection.");
      return;
    }

    setSavingRecipeId(r.id);
    playClickSound();
    try {
      await api.post('/recipes/save', {
        title: r.title,
        image_url: r.image_url,
        summary: r.summary,
        ingredients: typeof r.ingredients === 'string' ? r.ingredients : JSON.stringify(r.ingredients),
        instructions: r.instructions,
        calories: r.calories,
        protein_g: r.protein_g,
        carbs_g: r.carbs_g,
        fat_g: r.fat_g,
        ready_in_minutes: r.ready_in_minutes
      });
      playSuccessSound();
      toast.showSuccess(`Saved "${r.title}" to your personal collection! 🔖`);
    } catch (err) {
      playWarningSound();
      toast.showError(err.response?.data?.detail || "Failed to save recipe.");
    } finally {
      setSavingRecipeId(null);
    }
  };

  // Toggle Group Join
  const handleToggleGroup = async (groupId) => {
    if (!token) {
      playWarningSound();
      toast.showError("Please log in to join culinary groups.");
      return;
    }
    playClickSound();
    try {
      const res = await api.post(`/community/groups/${groupId}/join`);
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, members_count: res.members_count, is_member: res.is_member } : g));
      if (selectedGroup && selectedGroup.id === groupId) {
        setSelectedGroup(prev => ({ ...prev, members_count: res.members_count, is_member: res.is_member }));
      }
      playAddSound();
      toast.showSuccess(res.is_member ? "Joined group! 🎉" : "Left group.");
    } catch (err) {
      playWarningSound();
      toast.showError("Failed to update group membership.");
    }
  };

  // Open Group Discussion Thread
  const handleOpenGroupThread = (group) => {
    playClickSound();
    setSelectedGroup(group);
    setLoadingGroupFeed(true);
    api.get(`/community/groups/${group.id}/feed`)
      .then(data => setGroupPosts(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error loading group thread:", err))
      .finally(() => setLoadingGroupFeed(false));
  };

  // Create Custom Group
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!token) return;
    if (!newGroupName.trim() || !newGroupDesc.trim()) return;

    setCreatingGroup(true);
    playClickSound();
    try {
      const res = await api.post('/community/groups', {
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        category: newGroupCategory,
      });
      playSuccessSound();
      toast.showSuccess(`Group "${res.name}" created! 🎉`);
      setGroups(prev => [res, ...prev]);
      setShowCreateGroupModal(false);
      setNewGroupName('');
      setNewGroupDesc('');
    } catch (err) {
      playWarningSound();
      toast.showError(err.response?.data?.detail || "Failed to create group.");
    } finally {
      setCreatingGroup(false);
    }
  };

  // Join Challenge
  const handleJoinChallenge = async (chId) => {
    if (!token) {
      playWarningSound();
      toast.showError("Please log in to enroll in challenges.");
      return;
    }
    playClickSound();
    try {
      await api.post(`/community/challenges/${chId}/join`);
      setChallenges(prev => prev.map(c => c.id === chId ? { ...c, is_joined: true } : c));
      playSuccessSound();
      toast.showSuccess("Enrolled in challenge! Let's conquer your health goals! 🎯");
    } catch (err) {
      playWarningSound();
      toast.showError("Failed to join challenge.");
    }
  };

  // Evaluate Challenge Progress
  const handleEvaluateProgress = async (chId) => {
    if (!token) return;
    setEvaluatingProgress(prev => ({ ...prev, [chId]: true }));
    playClickSound();
    try {
      const res = await api.get(`/community/challenges/${chId}/progress`);
      setChallenges(prev => prev.map(c => c.id === chId ? { ...c, current_progress: res.current_progress, is_completed: res.is_completed } : c));
      if (res.is_completed) {
        playSuccessSound();
        toast.showSuccess("🎉 Challenge Completed! Fantastic accomplishment!");
      } else {
        playAddSound();
        toast.showSuccess(`Progress updated: ${res.current_progress} / ${res.target_value}`);
      }
    } catch (err) {
      playWarningSound();
      toast.showError("Failed to sync progress.");
    } finally {
      setEvaluatingProgress(prev => ({ ...prev, [chId]: false }));
    }
  };

  // Share post link helper
  const handleSharePost = (postId) => {
    playClickSound();
    navigator.clipboard.writeText(`${window.location.origin}/community#post-${postId}`);
    toast.showSuccess("Post link copied to clipboard! 🔗");
  };

  // Admin: Moderate Recipe
  const handleModerateRecipe = async (recipeId, action) => {
    if (!token || !isAdmin) return;
    setModeratingId(recipeId);
    playClickSound();
    try {
      await api.post(`/community/recipes/${recipeId}/moderate`, {
        action,
        moderation_note: moderationNote.trim() || null,
      });
      playSuccessSound();
      toast.showSuccess(`Recipe ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
      setPendingRecipes(prev => prev.filter(r => r.id !== recipeId));
      setModerationNote('');
    } catch (err) {
      playWarningSound();
      toast.showError(err.response?.data?.detail || `Failed to ${action} recipe.`);
    } finally {
      setModeratingId(null);
    }
  };

  // Filtered Social Posts (Mood/Topic filter)
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      if (feedMoodFilter === 'photos') return Boolean(post.image_url);
      if (feedMoodFilter === 'plans') return Boolean(post.shared_meal_plan);
      if (feedMoodFilter === 'tips') return /tip|trick|hack|advice|guide|recipe/i.test(post.content);
      return true;
    });
  }, [posts, feedMoodFilter]);

  // Filtered & Sorted Community Recipes
  const filteredRecipes = useMemo(() => {
    const list = recipeSubTab === 'my_submissions' ? mySubmissions : communityRecipes;
    return list
      .filter(r => {
        const matchesSearch = !recipeSearch || 
          r.title?.toLowerCase().includes(recipeSearch.toLowerCase()) || 
          r.submitter_username?.toLowerCase().includes(recipeSearch.toLowerCase());
        const matchesDiet = recipeDietFilter === 'All' || (
          Array.isArray(r.diets) 
            ? r.diets.some(d => d.toLowerCase().replace(/[\s_]+/g, '-') === recipeDietFilter.toLowerCase().replace(/[\s_]+/g, '-'))
            : typeof r.diets === 'string'
              ? r.diets.toLowerCase().replace(/[\s_]+/g, '-').includes(recipeDietFilter.toLowerCase().replace(/[\s_]+/g, '-'))
              : false
        );
        return matchesSearch && matchesDiet;
      })
      .sort((a, b) => {
        if (recipeSortBy === 'nutri_score') {
          const gradeOrder = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1 };
          return (gradeOrder[b.nutri_score_grade] || 0) - (gradeOrder[a.nutri_score_grade] || 0);
        }
        if (recipeSortBy === 'prep_time') {
          return (a.ready_in_minutes || 0) - (b.ready_in_minutes || 0);
        }
        if (recipeSortBy === 'calories') {
          return (a.calories || 0) - (b.calories || 0);
        }
        if (recipeSortBy === 'protein') {
          return (b.protein_g || 0) - (a.protein_g || 0);
        }
        return (b.id || 0) - (a.id || 0); // Newest default
      });
  }, [communityRecipes, mySubmissions, recipeSubTab, recipeSearch, recipeDietFilter, recipeSortBy]);

  // Filtered Groups
  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      const matchesCategory = groupCategoryFilter === 'All' || g.category === groupCategoryFilter;
      const matchesSearch = !groupSearch || 
        g.name.toLowerCase().includes(groupSearch.toLowerCase()) || 
        g.description.toLowerCase().includes(groupSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [groups, groupCategoryFilter, groupSearch]);

  return (
    <div className="page-container" style={{ maxWidth: '1060px', margin: '0 auto', padding: '24px 16px 80px' }}>

      {/* ── Page Hero & Stats Counter ── */}
      <div className="community-hero-banner">
        <div className="community-hero-top">
          <div>
            <div className="community-hero-badge">
              <Sparkles size={13} />
              <span>CHEF Culinary Network</span>
            </div>
            <h1 className="community-hero-title">
              <Users size={32} color="var(--accent-1)" />
              <span>Community Hub</span>
            </h1>
            <p className="community-hero-desc">
              Connect with passionate home chefs, discover user-crafted healthy recipes with verified Nutri-Scores, join goal-driven culinary groups, and complete wellness habit challenges.
            </p>
          </div>

          <div className="community-hero-actions">
            <Link
              to="/community/submit-recipe"
              className="action-btn primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                padding: '11px 22px',
                borderRadius: '14px',
                fontWeight: '700',
                fontSize: '14px',
                boxShadow: '0 4px 16px rgba(255, 90, 54, 0.35)',
              }}
              onClick={() => playClickSound()}
            >
              <ChefHat size={18} />
              <span>Submit Recipe</span>
            </Link>

            {token && (
              <button
                onClick={() => {
                  playClickSound();
                  setShowCreateGroupModal(true);
                }}
                className="action-btn secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '11px 18px',
                  borderRadius: '14px',
                  fontWeight: '700',
                  fontSize: '14px',
                }}
              >
                <Plus size={16} />
                <span>New Group</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Metrics Strip */}
        <div className="community-stats-strip">
          <div className="community-stat-pill" onClick={() => { setActiveTab('global'); playClickSound(); }} style={{ cursor: 'pointer' }}>
            <div className="community-stat-icon-box" style={{ background: 'rgba(255, 90, 54, 0.12)', color: 'var(--accent-1)' }}>
              <Flame size={20} />
            </div>
            <div className="community-stat-info">
              <span className="community-stat-val">{communityMetrics.postsCount}</span>
              <span className="community-stat-label">Feed Posts</span>
            </div>
          </div>

          <div className="community-stat-pill" onClick={() => { setActiveTab('recipes'); playClickSound(); }} style={{ cursor: 'pointer' }}>
            <div className="community-stat-icon-box" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
              <ChefHat size={20} />
            </div>
            <div className="community-stat-info">
              <span className="community-stat-val">{communityMetrics.recipesCount}</span>
              <span className="community-stat-label">Chef Recipes</span>
            </div>
          </div>

          <div className="community-stat-pill" onClick={() => { setActiveTab('groups'); playClickSound(); }} style={{ cursor: 'pointer' }}>
            <div className="community-stat-icon-box" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
              <MessageSquare size={20} />
            </div>
            <div className="community-stat-info">
              <span className="community-stat-val">{communityMetrics.groupsCount}</span>
              <span className="community-stat-label">Groups</span>
            </div>
          </div>

          <div className="community-stat-pill" onClick={() => { setActiveTab('challenges'); playClickSound(); }} style={{ cursor: 'pointer' }}>
            <div className="community-stat-icon-box" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
              <Trophy size={20} />
            </div>
            <div className="community-stat-info">
              <span className="community-stat-val">{communityMetrics.challengesCount}</span>
              <span className="community-stat-label">Challenges</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="community-tab-bar">
        {[
          { id: 'global', label: 'Global Feed', icon: Flame, count: posts.length },
          { id: 'following', label: 'Following', icon: Users, disabled: !token },
          { id: 'recipes', label: 'Community Recipes', icon: ChefHat, count: communityRecipes.length },
          { id: 'groups', label: 'Culinary Groups', icon: MessageSquare, count: groups.length },
          { id: 'challenges', label: 'Habit Challenges', icon: Trophy, count: challenges.length },
          ...(isAdmin ? [{ id: 'moderation', label: 'Moderation Queue', icon: ShieldCheck, count: pendingRecipes.length }] : []),
        ].map(t => {
          const IconComp = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => {
                playClickSound();
                setActiveTab(t.id);
                if (t.id !== 'groups') setSelectedGroup(null);
              }}
              className={`community-tab-btn ${activeTab === t.id ? 'active' : ''}`}
            >
              <IconComp size={16} />
              <span>{t.label}</span>
              {typeof t.count === 'number' && t.count > 0 && (
                <span className="community-tab-count">{t.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1 & 2: Social Feed (Global / Following) ── */}
      {(activeTab === 'global' || activeTab === 'following') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Feed Mood/Topic Filter Chips */}
          <div className="community-topic-chips">
            {[
              { id: 'all', label: '🌟 All Posts' },
              { id: 'photos', label: '📸 Photos Only' },
              { id: 'plans', label: '🗓️ Shared Meal Plans' },
              { id: 'tips', label: '💡 Cooking Tips & Hacks' },
            ].map(mood => (
              <button
                key={mood.id}
                onClick={() => {
                  playClickSound();
                  setFeedMoodFilter(mood.id);
                }}
                className={`community-topic-chip ${feedMoodFilter === mood.id ? 'active' : ''}`}
              >
                {mood.label}
              </button>
            ))}
          </div>

          {/* Post Creation Box */}
          {token ? (
            <form onSubmit={handleCreatePost} className="community-composer-card community-animate-card">
              <div className="community-composer-header">
                <div className="community-user-info-row">
                  <div className="community-avatar">
                    {currentUsername ? currentUsername.charAt(0).toUpperCase() : '👨‍🍳'}
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14.5px', color: 'var(--text-primary)' }}>Share with CHEF Community</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Posting as @{currentUsername}</div>
                  </div>
                </div>

                <div className="community-char-count">
                  {newPostContent.length} / 500
                </div>
              </div>

              <textarea
                rows={3}
                maxLength={500}
                placeholder="What are you cooking today? Share a culinary tip, high-protein meal win, or ask the community for advice..."
                value={newPostContent}
                onChange={e => setNewPostContent(e.target.value)}
                className="community-composer-textarea"
              />

              {/* Quick Tag Chips */}
              <div className="community-tags-helper">
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Tag size={12} /> Tags:
                </span>
                {QUICK_TAGS.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleAppendTag(t)}
                    className="community-tag-chip"
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Photo preview container */}
              {newPostImage.trim() && (
                <div style={{ position: 'relative', marginBottom: '14px', maxWidth: '320px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                  <img
                    src={newPostImage.trim()}
                    alt="Post preview"
                    style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', display: 'block' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setNewPostImage('')}
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      background: 'rgba(0,0,0,0.65)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Remove Photo"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className="community-composer-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
                  <ImageIcon size={16} color="var(--text-muted)" />
                  <input
                    type="url"
                    placeholder="Optional photo URL (Imgur / Unsplash / Cloudinary)"
                    value={newPostImage}
                    onChange={e => setNewPostImage(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-glass)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingPost || !newPostContent.trim()}
                  className="action-btn primary"
                  style={{
                    padding: '9px 24px',
                    fontSize: '14px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Send size={15} />
                  <span>{creatingPost ? 'Publishing...' : 'Publish Post'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="community-card-glass" style={{ padding: '24px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', fontSize: '14.5px' }}>
                🔒 Log in to share your culinary creations, post tips, and join discussions!
              </p>
              <Link to="/login" className="action-btn primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', padding: '8px 20px', borderRadius: '10px', fontSize: '13.5px' }}>
                <span>Log In / Sign Up</span>
              </Link>
            </div>
          )}

          {/* Posts Stream */}
          {loadingPosts ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="community-card-glass community-skeleton" style={{ height: '160px' }} />
              ))}
            </div>
          ) : filteredPosts.length > 0 ? (
            filteredPosts.map(post => (
              <div key={post.id} className="community-post-card community-animate-card">

                {/* Author Header */}
                <div className="community-post-header">
                  <Link to={`/profile/${post.username}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="community-avatar">
                      {post.username ? post.username.charAt(0).toUpperCase() : '👨‍🍳'}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        @{post.username}
                        {post.is_author && (
                          <span style={{ fontSize: '10px', background: 'rgba(255, 90, 54, 0.12)', color: 'var(--accent-1)', padding: '2px 6px', borderRadius: '6px', fontWeight: 800 }}>YOU</span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        <span>{formatRelativeTime(post.created_at)}</span>
                      </div>
                    </div>
                  </Link>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => handleSharePost(post.id)}
                      className="community-action-btn-sm"
                      title="Share post link"
                    >
                      <Share2 size={15} />
                    </button>

                    {post.is_author && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        disabled={deletingPostId === post.id}
                        className="community-action-btn-sm community-delete-btn"
                        title="Delete post"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Content */}
                <p className="community-post-content">
                  {post.content}
                </p>

                {/* Shared Meal Plan Card Embed */}
                {post.shared_meal_plan && (
                  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-1)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={15} />
                        <span>Weekly Meal Plan ({post.shared_meal_plan.week_start || 'Shared Plan'})</span>
                      </span>
                      {post.shared_meal_plan.total_calories && (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                          🔥 ~{Math.round(post.shared_meal_plan.total_calories)} kcal total
                        </span>
                      )}
                    </div>
                    {post.shared_meal_plan.slots && post.shared_meal_plan.slots.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                        {post.shared_meal_plan.slots.slice(0, 6).map((slot, idx) => (
                          <div key={idx} style={{ background: 'var(--bg-primary)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-glass)', fontSize: '12px' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700 }}>
                              {slot.date || slot.day} • {slot.meal_slot}
                            </div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {slot.recipe_title || 'Planned Meal'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Post photo attachment */}
                {post.image_url && (
                  <div className="community-post-image-wrap" onClick={() => { playClickSound(); setLightboxImage(post.image_url); }}>
                    <img
                      src={post.image_url}
                      alt="Post content"
                      className="community-post-image"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div className="community-image-badge">
                      <ExternalLink size={12} />
                      <span>Click to view full</span>
                    </div>
                  </div>
                )}

                {/* Interaction Row */}
                <div className="community-post-actions-row">
                  <div className="community-post-actions-left">
                    <button
                      onClick={() => handleLikePost(post.id)}
                      className={`community-heart-btn ${post.is_liked ? 'liked' : ''}`}
                    >
                      <Heart size={18} fill={post.is_liked ? '#ef4444' : 'none'} color={post.is_liked ? '#ef4444' : 'currentColor'} />
                      <span>{post.likes_count || 0}</span>
                    </button>

                    <button
                      onClick={() => handleToggleComments(post.id)}
                      className="community-action-btn-sm"
                    >
                      <MessageSquare size={17} />
                      <span>{post.comments_count || 0} Comments</span>
                    </button>
                  </div>

                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Community Post
                  </span>
                </div>

                {/* Comments Section */}
                {activeCommentPostId === post.id && (
                  <div className="community-comments-drawer">
                    {/* Add comment input */}
                    {token && (
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                        <input
                          type="text"
                          placeholder="Write a thoughtful comment or cooking tip..."
                          value={newCommentText}
                          onChange={e => setNewCommentText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddComment(post.id); }}
                          style={{
                            flex: 1,
                            padding: '9px 14px',
                            borderRadius: '10px',
                            border: '1px solid var(--border-glass)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontSize: '13.5px'
                          }}
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          className="action-btn primary"
                          disabled={!newCommentText.trim()}
                          style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Send size={13} />
                          <span>Reply</span>
                        </button>
                      </div>
                    )}

                    {/* Comments List */}
                    {loadingCommentsMap[post.id] ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>Loading comments...</p>
                    ) : (commentsMap[post.id] || []).length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(commentsMap[post.id] || []).map(comm => (
                          <div key={comm.id} className="community-comment-bubble">
                            <div className="community-avatar sm">
                              {comm.username ? comm.username.charAt(0).toUpperCase() : '👨‍🍳'}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>
                                  @{comm.username}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {formatRelativeTime(comm.created_at)}
                                </span>
                              </div>
                              <p style={{ margin: '2px 0 0 0', fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
                                {comm.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0, textAlign: 'center', padding: '6px' }}>
                        No comments yet. Start the conversation!
                      </p>
                    )}
                  </div>
                )}

              </div>
            ))
          ) : (
            <div className="community-card-glass" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', margin: '0 0 14px 0' }}>
                {activeTab === 'following' ? "You aren't following anyone yet or their feed is quiet. Explore the Global Feed!" : "No posts matching this topic yet. Be the first to share something!"}
              </p>
              {activeTab === 'following' && (
                <button onClick={() => { setActiveTab('global'); playClickSound(); }} className="action-btn primary" style={{ padding: '8px 20px', borderRadius: '10px', fontSize: '13.5px' }}>
                  🔥 Explore Global Feed
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Community Recipes Hub ── */}
      {activeTab === 'recipes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Sub-tab switcher: All Recipes vs My Submissions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
              <button
                onClick={() => { setRecipeSubTab('all'); playClickSound(); }}
                style={{
                  padding: '7px 16px',
                  borderRadius: '9px',
                  border: 'none',
                  background: recipeSubTab === 'all' ? 'var(--gradient-primary)' : 'transparent',
                  color: recipeSubTab === 'all' ? '#fff' : 'var(--text-secondary)',
                  fontWeight: recipeSubTab === 'all' ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                🌟 All Community Recipes ({communityRecipes.length})
              </button>

              {token && (
                <button
                  onClick={() => { setRecipeSubTab('my_submissions'); playClickSound(); }}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '9px',
                    border: 'none',
                    background: recipeSubTab === 'my_submissions' ? 'var(--gradient-primary)' : 'transparent',
                    color: recipeSubTab === 'my_submissions' ? '#fff' : 'var(--text-secondary)',
                    fontWeight: recipeSubTab === 'my_submissions' ? 700 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  📂 My Submissions ({mySubmissions.length})
                </button>
              )}
            </div>

            <Link
              to="/community/submit-recipe"
              className="action-btn primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none',
                padding: '8px 18px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700
              }}
              onClick={() => playClickSound()}
            >
              <Plus size={15} />
              <span>Submit Recipe</span>
            </Link>
          </div>

          {/* Search, Diet Pills, Sorting Bar */}
          <div className="community-card-glass" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
                <Search size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search recipes by name or chef username..."
                  value={recipeSearch}
                  onChange={e => setRecipeSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 16px 10px 40px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-glass)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                />
                {recipeSearch && (
                  <button
                    onClick={() => setRecipeSearch('')}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <select
                value={recipeSortBy}
                onChange={e => { setRecipeSortBy(e.target.value); playClickSound(); }}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-glass)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <option value="newest">🕒 Latest Submissions</option>
                <option value="nutri_score">🏆 Highest Nutri-Score</option>
                <option value="prep_time">⚡ Fastest Prep Time</option>
                <option value="protein">💪 Highest Protein</option>
                <option value="calories">🥗 Lowest Calories</option>
              </select>
            </div>

            {/* Diet Filter Pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Filter size={13} /> Diet:
              </span>
              {['All', 'High-Protein', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Low-Carb', 'Keto'].map(diet => (
                <button
                  key={diet}
                  onClick={() => { setRecipeDietFilter(diet); playClickSound(); }}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: recipeDietFilter === diet ? 'var(--accent-1)' : 'var(--border-glass)',
                    background: recipeDietFilter === diet ? 'rgba(255, 90, 54, 0.12)' : 'var(--bg-secondary)',
                    color: recipeDietFilter === diet ? 'var(--accent-1)' : 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: recipeDietFilter === diet ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease'
                  }}
                >
                  {diet}
                </button>
              ))}
            </div>
          </div>

          {/* Recipes Cards Grid */}
          {(loadingRecipes || loadingMySubmissions) ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '20px' }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="community-card-glass community-skeleton" style={{ height: '260px' }} />
              ))}
            </div>
          ) : filteredRecipes.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '20px' }}>
              {filteredRecipes.map(r => {
                const visual = getRecipeCardVisual(r);
                return (
                  <div
                    key={r.id}
                    className="community-recipe-card community-animate-card"
                    onClick={() => { playClickSound(); setSelectedRecipe(r); }}
                  >
                    {/* Visual Cover */}
                    <div className="community-recipe-cover">
                      {r.image_url ? (
                        <img
                          src={r.image_url}
                          alt={r.title}
                          className="community-recipe-img"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextSibling) {
                              e.currentTarget.nextSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div
                        style={{
                          display: r.image_url ? 'none' : 'flex',
                          width: '100%',
                          height: '100%',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: visual.gradient,
                          fontSize: '42px',
                        }}
                      >
                        {visual.icon}
                      </div>

                      {/* Nutri-score grade badge overlay */}
                      {r.nutri_score_grade && (
                        <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 2 }}>
                          <ChefScoreBadge grade={r.nutri_score_grade} size="sm" />
                        </div>
                      )}

                      {/* Moderation status if in my_submissions */}
                      {recipeSubTab === 'my_submissions' && (
                        <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 2 }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: r.moderation_status === 'approved' ? '#10b981' : r.moderation_status === 'rejected' ? '#ef4444' : '#f59e0b',
                              color: '#fff'
                            }}
                          >
                            {r.moderation_status}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Content Body */}
                    <div className="community-recipe-body">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                            By @{r.submitter_username || 'Chef'}
                          </span>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            ⏱️ {r.ready_in_minutes || 25}m
                          </span>
                        </div>

                        <h3 className="community-recipe-title" title={r.title}>
                          {r.title}
                        </h3>

                        {/* Macros Pill Bar */}
                        <div className="community-recipe-macros">
                          <span className="community-macro-pill">🔥 {Math.round(r.calories || 0)} kcal</span>
                          <span className="community-macro-pill">💪 {Math.round(r.protein_g || 0)}g P</span>
                          <span className="community-macro-pill">🍞 {Math.round(r.carbs_g || 0)}g C</span>
                          <span className="community-macro-pill">🥑 {Math.round(r.fat_g || 0)}g F</span>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-glass)', paddingTop: '12px', marginTop: '8px' }}>
                        <button
                          onClick={(e) => handleSaveCommunityRecipe(e, r)}
                          disabled={savingRecipeId === r.id}
                          className="community-action-btn-sm"
                          style={{
                            background: 'rgba(255, 90, 54, 0.08)',
                            color: 'var(--accent-1)',
                            borderRadius: '10px',
                            padding: '5px 12px',
                            fontWeight: 700,
                            fontSize: '12px'
                          }}
                          title="Save to your personal cookbook"
                        >
                          <Bookmark size={13} />
                          <span>Save</span>
                        </button>

                        <span style={{ color: 'var(--accent-1)', fontWeight: 700, fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span>Details</span>
                          <ChevronRight size={15} />
                        </span>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="community-card-glass" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', margin: '0 0 12px 0', fontSize: '15px' }}>
                {recipeSubTab === 'my_submissions' 
                  ? "You haven't submitted any community recipes yet. Share your signature dish!" 
                  : "No community recipes found matching your filters."}
              </p>
              <Link to="/community/submit-recipe" className="action-btn primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', padding: '8px 20px', borderRadius: '10px', fontSize: '13.5px' }}>
                <span>👨‍🍳 Submit a Recipe</span>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: Culinary Groups ── */}
      {activeTab === 'groups' && (
        <div>
          {/* If a group is selected, render Group Discussion Thread */}
          {selectedGroup ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Group Thread Header */}
              <div className="community-card-glass community-animate-card" style={{ padding: '24px' }}>
                <button
                  onClick={() => { setSelectedGroup(null); playClickSound(); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-1)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '13.5px',
                    marginBottom: '14px',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  ← Back to All Groups
                </button>

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '4px 10px', borderRadius: '8px' }}>
                      {selectedGroup.category}
                    </span>
                    <h2 style={{ margin: '8px 0 6px 0', fontSize: '1.8rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                      {selectedGroup.name}
                    </h2>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14.5px', maxWidth: '680px', lineHeight: '1.5' }}>
                      {selectedGroup.description}
                    </p>
                  </div>

                  <button
                    onClick={() => handleToggleGroup(selectedGroup.id)}
                    className={`action-btn ${selectedGroup.is_member ? 'secondary' : 'primary'}`}
                    style={{ padding: '9px 22px', fontSize: '14px', borderRadius: '12px', fontWeight: 700 }}
                  >
                    {selectedGroup.is_member ? 'Leave Group' : 'Join Group'}
                  </button>
                </div>
              </div>

              {/* Group Discussion Composer */}
              {token ? (
                <form onSubmit={handleCreateGroupPost} className="community-composer-card community-animate-card">
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '10px' }}>
                    Start a discussion in {selectedGroup.name}
                  </div>
                  <textarea
                    rows={2}
                    placeholder={`Ask a question or share a meal prep tip with ${selectedGroup.name} members...`}
                    value={newGroupPostContent}
                    onChange={e => setNewGroupPostContent(e.target.value)}
                    className="community-composer-textarea"
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <input
                      type="url"
                      placeholder="Optional photo URL"
                      value={newGroupPostImage}
                      onChange={e => setNewGroupPostImage(e.target.value)}
                      style={{
                        flex: 1,
                        minWidth: '220px',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        border: '1px solid var(--border-glass)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontSize: '13px'
                      }}
                    />
                    <button
                      type="submit"
                      disabled={creatingGroupPost || !newGroupPostContent.trim()}
                      className="action-btn primary"
                      style={{ padding: '9px 22px', fontSize: '13.5px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Send size={14} />
                      <span>{creatingGroupPost ? 'Posting...' : 'Post in Group'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="community-card-glass" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                  🔒 Log in to participate in group discussions.
                </div>
              )}

              {/* Group Posts Thread */}
              {loadingGroupFeed ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {[1, 2].map(i => (
                    <div key={i} className="community-card-glass community-skeleton" style={{ height: '120px' }} />
                  ))}
                </div>
              ) : groupPosts.length > 0 ? (
                groupPosts.map(post => (
                  <div key={post.id} className="community-post-card community-animate-card">
                    <div className="community-post-header">
                      <Link to={`/profile/${post.username}`} style={{ textDecoration: 'none', color: 'inherit', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="community-avatar sm">
                          {post.username ? post.username.charAt(0).toUpperCase() : '👨‍🍳'}
                        </div>
                        <span>@{post.username}</span>
                      </Link>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {formatRelativeTime(post.created_at)}
                      </span>
                    </div>

                    <p className="community-post-content">{post.content}</p>
                    
                    {post.image_url && (
                      <div className="community-post-image-wrap" onClick={() => { playClickSound(); setLightboxImage(post.image_url); }}>
                        <img src={post.image_url} alt="Attachment" className="community-post-image" />
                      </div>
                    )}

                    <div className="community-post-actions-row">
                      <button
                        onClick={() => handleLikePost(post.id, true)}
                        className={`community-heart-btn ${post.is_liked ? 'liked' : ''}`}
                      >
                        <Heart size={16} fill={post.is_liked ? '#ef4444' : 'none'} color={post.is_liked ? '#ef4444' : 'currentColor'} />
                        <span>{post.likes_count || 0}</span>
                      </button>

                      {post.is_author && (
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="community-action-btn-sm community-delete-btn"
                          title="Delete post"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="community-card-glass" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No posts in this group yet. Be the first to start the discussion!
                </div>
              )}

            </div>
          ) : (
            /* All Groups Directory View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Group Directory Controls */}
              <div className="community-card-glass" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                    <Search size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Search groups by topic or name..."
                      value={groupSearch}
                      onChange={e => setGroupSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 16px 10px 40px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-glass)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  {token && (
                    <button
                      onClick={() => { setShowCreateGroupModal(true); playClickSound(); }}
                      className="action-btn primary"
                      style={{ padding: '10px 20px', fontSize: '13.5px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Plus size={15} />
                      <span>Create Group</span>
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Filter size={13} /> Category:
                  </span>
                  {['All', 'Goal', 'Diet', 'Cuisine', 'Lifestyle', 'General'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => { setGroupCategoryFilter(cat); playClickSound(); }}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '20px',
                        border: '1px solid',
                        borderColor: groupCategoryFilter === cat ? '#3b82f6' : 'var(--border-glass)',
                        background: groupCategoryFilter === cat ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-secondary)',
                        color: groupCategoryFilter === cat ? '#3b82f6' : 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: groupCategoryFilter === cat ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.18s ease'
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Group Cards Grid */}
              {loadingGroups ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '18px' }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="community-card-glass community-skeleton" style={{ height: '180px' }} />
                  ))}
                </div>
              ) : filteredGroups.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '18px' }}>
                  {filteredGroups.map(g => (
                    <div key={g.id} className="community-group-card community-animate-card">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '3px 8px', borderRadius: '6px' }}>
                            {g.category}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Users size={13} /> {g.members_count || 1} member{(g.members_count !== 1) ? 's' : ''}
                          </span>
                        </div>

                        <h3 style={{ margin: '6px 0 6px 0', fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                          {g.name}
                        </h3>
                        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: '0 0 14px 0', lineHeight: '1.5' }}>
                          {g.description}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-glass)', paddingTop: '14px', marginTop: '10px' }}>
                        <button
                          onClick={() => handleOpenGroupThread(g)}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-1)', fontWeight: 700, cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <span>Discussion Thread</span>
                          <ChevronRight size={14} />
                        </button>

                        <button
                          onClick={() => handleToggleGroup(g.id)}
                          className={`action-btn ${g.is_member ? 'secondary' : 'primary'}`}
                          style={{ padding: '6px 16px', fontSize: '12.5px', borderRadius: '9px', fontWeight: 700 }}
                        >
                          {g.is_member ? 'Leave' : 'Join'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="community-card-glass" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No culinary groups found matching your search.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5: Habit & Nutrition Challenges ── */}
      {activeTab === 'challenges' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="community-card-glass" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <Trophy size={24} color="#f59e0b" />
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Weekly Wellness & Habit Challenges
              </h2>
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
              Build consistency by conquering weekly challenges synced directly with your daily nutrition logs and water tracker.
            </p>
          </div>

          {loadingChallenges ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="community-card-glass community-skeleton" style={{ height: '140px' }} />
              ))}
            </div>
          ) : (
            challenges.map(ch => {
              const progressPct = Math.min(100, Math.round(((ch.current_progress || 0) / (ch.target_value || 1)) * 100));
              return (
                <div key={ch.id} className="community-challenge-card community-animate-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '54px', height: '54px', borderRadius: '16px', background: 'rgba(255, 90, 54, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', flexShrink: 0 }}>
                        {ch.badge_icon || '🏆'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                            {ch.title}
                          </h3>
                          {ch.is_completed && (
                            <span style={{ fontSize: '11px', fontWeight: 800, background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: '6px' }}>
                              COMPLETED
                            </span>
                          )}
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                          {ch.description}
                        </p>
                      </div>
                    </div>

                    <div>
                      {!ch.is_joined ? (
                        <button
                          onClick={() => handleJoinChallenge(ch.id)}
                          className="action-btn primary"
                          style={{ padding: '10px 22px', fontSize: '13.5px', borderRadius: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Plus size={15} />
                          <span>Enroll Challenge</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEvaluateProgress(ch.id)}
                          disabled={evaluatingProgress[ch.id]}
                          className="action-btn secondary"
                          style={{ padding: '10px 20px', fontSize: '13.5px', borderRadius: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <RefreshCw size={14} className={evaluatingProgress[ch.id] ? 'spin' : ''} />
                          <span>{evaluatingProgress[ch.id] ? 'Syncing...' : 'Sync Live Progress'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Challenge progress track */}
                  {ch.is_joined && (
                    <div style={{ marginTop: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 700, marginBottom: '8px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          Current Progress: {ch.current_progress || 0} / {ch.target_value} target
                        </span>
                        <span style={{ color: ch.is_completed ? '#10b981' : 'var(--accent-1)' }}>
                          {ch.is_completed ? '🎉 Challenge Completed!' : `${progressPct}%`}
                        </span>
                      </div>
                      <div className="community-progress-track">
                        <div
                          className={`community-progress-fill ${ch.is_completed ? 'completed' : ''}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── TAB 6: Admin Moderation Queue ── */}
      {activeTab === 'moderation' && isAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="community-card-glass" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <ShieldCheck size={26} color="#f59e0b" />
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                Recipe Moderation Queue
              </h2>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
              Review community recipe submissions flagged for potential macro density discrepancies or awaiting administrator approval.
            </p>
          </div>

          {loadingPending ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[1, 2].map(i => (
                <div key={i} className="community-card-glass community-skeleton" style={{ height: '180px' }} />
              ))}
            </div>
          ) : pendingRecipes.length > 0 ? (
            pendingRecipes.map(r => (
              <div key={r.id} className="community-card-glass community-animate-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '14px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '4px 10px', borderRadius: '8px' }}>
                      Pending Review
                    </span>
                    <h3 style={{ margin: '8px 0 4px 0', fontSize: '1.35rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                      {r.title}
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                      Submitted by @{r.submitter_username} • {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {r.nutri_score_grade && <ChefScoreBadge grade={r.nutri_score_grade} size="sm" />}
                </div>

                {r.moderation_note && (
                  <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', color: '#d97706', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} />
                    <span><strong>Flag Note:</strong> {r.moderation_note}</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '18px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', flexWrap: 'wrap' }}>
                  <span>⏱️ {r.ready_in_minutes} mins</span>
                  <span>🍽️ {r.servings} servings</span>
                  <span>🔥 {Math.round(r.calories)} kcal</span>
                  <span>💪 {Math.round(r.protein_g)}g P</span>
                  <span>🍞 {Math.round(r.carbs_g)}g C</span>
                  <span>🥑 {Math.round(r.fat_g)}g F</span>
                </div>

                <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.55', margin: '0 0 16px 0' }}>
                  {r.instructions}
                </p>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
                  <input
                    type="text"
                    placeholder="Optional feedback note for submitter..."
                    value={moderationNote}
                    onChange={e => setModerationNote(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '9px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-glass)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '13.5px'
                    }}
                  />

                  <button
                    onClick={() => handleModerateRecipe(r.id, 'approve')}
                    disabled={moderatingId === r.id}
                    className="action-btn primary"
                    style={{ padding: '9px 20px', fontSize: '13.5px', borderRadius: '10px', background: '#10b981', borderColor: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Check size={15} />
                    <span>Approve</span>
                  </button>

                  <button
                    onClick={() => handleModerateRecipe(r.id, 'reject')}
                    disabled={moderatingId === r.id}
                    className="action-btn secondary"
                    style={{ padding: '9px 20px', fontSize: '13.5px', borderRadius: '10px', color: '#ef4444', borderColor: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <X size={15} />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="community-card-glass" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '15px' }}>
                🎉 Moderation queue is empty! All submitted recipes have been reviewed.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Create Group Modal ── */}
      {showCreateGroupModal && (
        <div className="community-lightbox-backdrop" onClick={() => setShowCreateGroupModal(false)}>
          <div
            className="community-card-glass"
            style={{ width: '100%', maxWidth: '500px', padding: '28px', background: 'var(--bg-secondary)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={20} color="var(--accent-1)" />
                <span>Create Culinary Group</span>
              </h2>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontWeight: '700', fontSize: '13.5px', display: 'block', marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Group Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Keto Meal Preppers, Vegan Athletes"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-glass)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ fontWeight: '700', fontSize: '13.5px', display: 'block', marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Category
                </label>
                <select
                  value={newGroupCategory}
                  onChange={e => setNewGroupCategory(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-glass)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px' }}
                >
                  <option value="Diet">Diet (e.g. Keto, Low Carb, Vegan)</option>
                  <option value="Goal">Goal (e.g. Muscle Gain, Weight Loss)</option>
                  <option value="Cuisine">Cuisine (e.g. Mediterranean, Asian)</option>
                  <option value="Lifestyle">Lifestyle (e.g. Quick Meals, Budget Cooking)</option>
                  <option value="General">General Culinary Discussion</option>
                </select>
              </div>

              <div>
                <label style={{ fontWeight: '700', fontSize: '13.5px', display: 'block', marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Description *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="What is this group's focus? Who should join?"
                  value={newGroupDesc}
                  onChange={e => setNewGroupDesc(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-glass)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="action-btn secondary"
                  style={{ padding: '9px 18px', fontSize: '13.5px', borderRadius: '10px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingGroup}
                  className="action-btn primary"
                  style={{ padding: '9px 24px', fontSize: '13.5px', borderRadius: '10px', fontWeight: 700 }}
                >
                  {creatingGroup ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Photo Lightbox Modal ── */}
      {lightboxImage && (
        <div className="community-lightbox-backdrop" onClick={() => setLightboxImage(null)}>
          <img
            src={lightboxImage}
            alt="Expanded photo"
            className="community-lightbox-content"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxImage(null)}
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              fontSize: '24px',
              cursor: 'pointer',
              borderRadius: '50%',
              width: '42px',
              height: '42px',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Recipe Details Modal ── */}
      {selectedRecipe && (
        <RecipeModal
          recipe={{
            ...selectedRecipe,
            id: selectedRecipe.id,
            title: selectedRecipe.title,
            image: selectedRecipe.image_url,
            readyInMinutes: selectedRecipe.ready_in_minutes,
            servings: selectedRecipe.servings,
            summary: selectedRecipe.summary,
            instructions: selectedRecipe.instructions,
            extendedIngredients: (selectedRecipe.ingredients || []).map(ing => typeof ing === 'string' ? { original: ing, name: ing } : ing),
            nutrition: {
              nutrients: [
                { name: 'Calories', amount: selectedRecipe.calories, unit: 'kcal' },
                { name: 'Protein', amount: selectedRecipe.protein_g, unit: 'g' },
                { name: 'Carbohydrates', amount: selectedRecipe.carbs_g, unit: 'g' },
                { name: 'Fat', amount: selectedRecipe.fat_g, unit: 'g' },
                { name: 'Fiber', amount: selectedRecipe.fiber_g || 0, unit: 'g' },
                { name: 'Sodium', amount: selectedRecipe.sodium_mg || 0, unit: 'mg' },
                { name: 'Sugar', amount: selectedRecipe.sugar_g || 0, unit: 'g' },
              ]
            },
            nutri_score_grade: selectedRecipe.nutri_score_grade,
          }}
          onClose={() => setSelectedRecipe(null)}
        />
      )}

    </div>
  );
}
