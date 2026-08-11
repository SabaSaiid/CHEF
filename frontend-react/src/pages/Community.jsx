import React, { useState, useEffect, useContext, memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import ChefScoreBadge from '../components/ChefScoreBadge';
import RecipeModal from '../components/RecipeModal';

export default function Community() {
  const { token, username: currentUsername } = useContext(AuthContext);
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('global'); // 'global' | 'following' | 'recipes' | 'groups' | 'challenges' | 'moderation'

  // Social Feed state
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [creatingPost, setCreatingPost] = useState(false);

  // Comments state
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const [commentsMap, setCommentsMap] = useState({});
  const [loadingCommentsMap, setLoadingCommentsMap] = useState({});
  const [newCommentText, setNewCommentText] = useState('');

  // Media Lightbox
  const [lightboxImage, setLightboxImage] = useState(null);

  // Community Recipes state
  const [communityRecipes, setCommunityRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [recipeDietFilter, setRecipeDietFilter] = useState('All');
  const [recipeSortBy, setRecipeSortBy] = useState('newest'); // 'newest' | 'nutri_score' | 'prep_time'
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  // Groups state
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupCategoryFilter, setGroupCategoryFilter] = useState('All');
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

  // 1. Fetch posts & tab data
  useEffect(() => {
    if (activeTab === 'global') {
      setLoadingPosts(true);
      api.get('/community/feed/global')
        .then(data => setPosts(data))
        .catch(err => console.error("Error fetching global feed:", err))
        .finally(() => setLoadingPosts(false));
    } else if (activeTab === 'following') {
      if (!token) return;
      setLoadingPosts(true);
      api.get('/community/feed/following')
        .then(data => setPosts(data))
        .catch(err => console.error("Error fetching following feed:", err))
        .finally(() => setLoadingPosts(false));
    } else if (activeTab === 'recipes') {
      setLoadingRecipes(true);
      api.get('/community/recipes')
        .then(data => setCommunityRecipes(data))
        .catch(err => console.error("Error fetching community recipes:", err))
        .finally(() => setLoadingRecipes(false));
    } else if (activeTab === 'groups') {
      setLoadingGroups(true);
      api.get('/community/groups')
        .then(data => setGroups(data))
        .catch(err => console.error("Error fetching groups:", err))
        .finally(() => setLoadingGroups(false));
    } else if (activeTab === 'challenges') {
      setLoadingChallenges(true);
      api.get('/community/challenges')
        .then(data => setChallenges(data))
        .catch(err => console.error("Error fetching challenges:", err))
        .finally(() => setLoadingChallenges(false));
    } else if (activeTab === 'moderation') {
      setLoadingPending(true);
      api.get('/community/recipes/pending')
        .then(data => setPendingRecipes(data))
        .catch(err => console.error("Error fetching pending recipes:", err))
        .finally(() => setLoadingPending(false));
    }
  }, [activeTab, token]);

  // Check admin status on mount
  useEffect(() => {
    if (token) {
      api.get('/community/recipes/admin/check')
        .then(data => setIsAdmin(data.is_admin))
        .catch(() => setIsAdmin(false));
    }
  }, [token]);

  // Create Global Post
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.showError("Please log in to post to the community.");
      return;
    }
    if (!newPostContent.trim()) return;

    setCreatingPost(true);
    try {
      const res = await api.post('/community/posts', {
        content: newPostContent.trim(),
        image_url: newPostImage.trim() || null,
      });
      toast.showSuccess("Post created successfully!");
      setNewPostContent('');
      setNewPostImage('');
      setPosts(prev => [res, ...prev]);
    } catch (err) {
      toast.showError(err.response?.data?.detail || "Failed to create post.");
    } finally {
      setCreatingPost(false);
    }
  };

  // Create Group Post
  const handleCreateGroupPost = async (e) => {
    e.preventDefault();
    if (!token || !selectedGroup) return;
    if (!newGroupPostContent.trim()) return;

    setCreatingGroupPost(true);
    try {
      const res = await api.post('/community/posts', {
        content: newGroupPostContent.trim(),
        image_url: newGroupPostImage.trim() || null,
        group_id: selectedGroup.id
      });
      toast.showSuccess(`Posted in ${selectedGroup.name}!`);
      setNewGroupPostContent('');
      setNewGroupPostImage('');
      setGroupPosts(prev => [res, ...prev]);
    } catch (err) {
      toast.showError(err.response?.data?.detail || "Failed to post in group.");
    } finally {
      setCreatingGroupPost(false);
    }
  };

  // Like Post (Global or Group)
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

  // Like Post (Global or Group) with Optimistic UI Update
  const handleLikePost = async (postId, isGroupPost = false) => {
    if (!token) {
      toast.showError("Please log in to like posts.");
      return;
    }

    const updateOptimistic = prev => prev.map(p => {
      if (p.id === postId) {
        const nextIsLiked = !p.is_liked;
        const nextCount = nextIsLiked ? p.likes_count + 1 : Math.max(0, p.likes_count - 1);
        return { ...p, is_liked: nextIsLiked, likes_count: nextCount };
      }
      return p;
    });

    if (isGroupPost) {
      setGroupPosts(updateOptimistic);
    } else {
      setPosts(updateOptimistic);
    }

    try {
      const res = await api.post(`/community/posts/${postId}/like`);
      const syncFn = prev => prev.map(p => p.id === postId ? { ...p, likes_count: res.likes_count, is_liked: res.is_liked } : p);
      if (isGroupPost) setGroupPosts(syncFn);
      else setPosts(syncFn);
    } catch (err) {
      const rollbackFn = prev => prev.map(p => {
        if (p.id === postId) {
          const revertIsLiked = !p.is_liked;
          const revertCount = revertIsLiked ? p.likes_count + 1 : Math.max(0, p.likes_count - 1);
          return { ...p, is_liked: revertIsLiked, likes_count: revertCount };
        }
        return p;
      });
      if (isGroupPost) setGroupPosts(rollbackFn);
      else setPosts(rollbackFn);
      toast.showError("Failed to update like status.");
    }
  };

  // Toggle Comments
  const handleToggleComments = async (postId) => {
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
      toast.showError("Please log in to comment.");
      return;
    }
    if (!newCommentText.trim()) return;

    const commentText = newCommentText.trim();
    setNewCommentText('');

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

    const incCountFn = prev => prev.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p);
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
      const decCountFn = prev => prev.map(p => p.id === postId ? { ...p, comments_count: Math.max(0, p.comments_count - 1) } : p);
      if (isGroupPost) setGroupPosts(decCountFn);
      else setPosts(decCountFn);
      toast.showError(err.response?.data?.detail || "Failed to add comment.");
    }
  };

  // Save Community Recipe to personal saved collection
  const handleSaveCommunityRecipe = async (e, r) => {
    e.stopPropagation();
    if (!token) {
      toast.showError("Please log in to save recipes.");
      return;
    }
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
      toast.showSuccess(`Saved "${r.title}" to your personal collection! 🔖`);
    } catch (err) {
      toast.showError(err.response?.data?.detail || "Failed to save recipe.");
    }
  };


  // Toggle Group Join
  const handleToggleGroup = async (groupId) => {
    if (!token) {
      toast.showError("Please log in to join groups.");
      return;
    }
    try {
      const res = await api.post(`/community/groups/${groupId}/join`);
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, members_count: res.members_count, is_member: res.is_member } : g));
      if (selectedGroup && selectedGroup.id === groupId) {
        setSelectedGroup(prev => ({ ...prev, members_count: res.members_count, is_member: res.is_member }));
      }
      toast.showSuccess(res.is_member ? "Joined group!" : "Left group.");
    } catch (err) {
      toast.showError("Failed to update group membership.");
    }
  };

  // Open Group Discussion Thread
  const handleOpenGroupThread = (group) => {
    setSelectedGroup(group);
    setLoadingGroupFeed(true);
    api.get(`/community/groups/${group.id}/feed`)
      .then(data => setGroupPosts(data))
      .catch(err => console.error("Error loading group thread:", err))
      .finally(() => setLoadingGroupFeed(false));
  };

  // Create Custom Group
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!token) return;
    if (!newGroupName.trim() || !newGroupDesc.trim()) return;

    setCreatingGroup(true);
    try {
      const res = await api.post('/community/groups', {
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        category: newGroupCategory,
      });
      toast.showSuccess(`Group "${res.name}" created!`);
      setGroups(prev => [res, ...prev]);
      setShowCreateGroupModal(false);
      setNewGroupName('');
      setNewGroupDesc('');
    } catch (err) {
      toast.showError(err.response?.data?.detail || "Failed to create group.");
    } finally {
      setCreatingGroup(false);
    }
  };

  // Join Challenge
  const handleJoinChallenge = async (chId) => {
    if (!token) {
      toast.showError("Please log in to join challenges.");
      return;
    }
    try {
      await api.post(`/community/challenges/${chId}/join`);
      setChallenges(prev => prev.map(c => c.id === chId ? { ...c, is_joined: true } : c));
      toast.showSuccess("Enrolled in challenge!");
    } catch (err) {
      toast.showError("Failed to join challenge.");
    }
  };

  // Evaluate Challenge Progress
  const handleEvaluateProgress = async (chId) => {
    if (!token) return;
    setEvaluatingProgress(prev => ({ ...prev, [chId]: true }));
    try {
      const res = await api.get(`/community/challenges/${chId}/progress`);
      setChallenges(prev => prev.map(c => c.id === chId ? { ...c, current_progress: res.current_progress, is_completed: res.is_completed } : c));
      toast.showSuccess(res.is_completed ? "🎉 Challenge Completed!" : `Progress updated: ${res.current_progress} / ${res.target_value}`);
    } catch (err) {
      toast.showError("Failed to sync progress.");
    } finally {
      setEvaluatingProgress(prev => ({ ...prev, [chId]: false }));
    }
  };

  // Share post link helper
  const handleSharePost = (postId) => {
    navigator.clipboard.writeText(`${window.location.origin}/community#post-${postId}`);
    toast.showSuccess("Post link copied to clipboard!");
  };

  // Admin: Moderate Recipe
  const handleModerateRecipe = async (recipeId, action) => {
    if (!token || !isAdmin) return;
    setModeratingId(recipeId);
    try {
      await api.post(`/community/recipes/${recipeId}/moderate`, {
        action,
        moderation_note: moderationNote.trim() || null,
      });
      toast.showSuccess(`Recipe ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
      setPendingRecipes(prev => prev.filter(r => r.id !== recipeId));
      setModerationNote('');
    } catch (err) {
      toast.showError(err.response?.data?.detail || `Failed to ${action} recipe.`);
    } finally {
      setModeratingId(null);
    }
  };

  // Filtered & Sorted Community Recipes
  const filteredRecipes = communityRecipes
    .filter(r => {
      const matchesSearch = !recipeSearch || r.title.toLowerCase().includes(recipeSearch.toLowerCase());
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
        return a.ready_in_minutes - b.ready_in_minutes;
      }
      return b.id - a.id; // Newest default
    });

  return (
    <div className="page-container" style={{ maxWidth: '1020px', margin: '0 auto', padding: '24px 16px' }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.1rem', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '800' }}>
            <span style={{ fontSize: '2.2rem' }}>👥</span> CHEF Community Hub
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '6px 0 0 0', fontSize: '14px', maxWidth: '640px', lineHeight: '1.5' }}>
            Share culinary accomplishments, explore community-contributed recipes, join goal-driven groups, and sync daily nutrition challenges.
          </p>
        </div>

        <Link
          to="/community/submit-recipe"
          className="action-btn primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            padding: '10px 20px',
            borderRadius: '12px',
            fontWeight: '700',
            fontSize: '14px',
            boxShadow: '0 4px 14px rgba(255, 90, 54, 0.3)',
            transition: 'all 0.2s ease',
          }}
        >
          <span>👨‍🍳</span> Submit Custom Recipe
        </Link>
      </div>

      {/* ── Navigation Tabs ── */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-glass, rgba(0,0,0,0.08))', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px' }}>
        {[
          { id: 'global', label: '🔥 Global Feed' },
          { id: 'following', label: '👥 Following' },
          { id: 'recipes', label: '👨‍🍳 Community Recipes' },
          { id: 'groups', label: '💬 Culinary Groups' },
          { id: 'challenges', label: '🏆 Habit Challenges' },
          ...(isAdmin ? [{ id: 'moderation', label: '🛡️ Moderation' }] : []),
        ].map(t => (
          <button
            key={t.id}
            onClick={() => {
              setActiveTab(t.id);
              if (t.id !== 'groups') setSelectedGroup(null);
            }}
            className={`community-tab-btn ${activeTab === t.id ? 'active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1 & 2: Social Feed (Global / Following) ── */}
      {(activeTab === 'global' || activeTab === 'following') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

          {/* Post Creation Box */}
          {token ? (
            <form onSubmit={handleCreatePost} className="community-card-glass" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--gradient-primary)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '16px' }}>
                  {currentUsername ? currentUsername.charAt(0).toUpperCase() : '👨‍🍳'}
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>Share with CHEF Community</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Posting as @{currentUsername}</div>
                </div>
              </div>

              <textarea
                rows={3}
                placeholder="What are you cooking today? Share a recipe recommendation, meal accomplishment, or tip..."
                value={newPostContent}
                onChange={e => setNewPostContent(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-glass)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  resize: 'vertical',
                  fontSize: '14px',
                  marginBottom: '12px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                }}
              />

              {/* Photo preview container */}
              {newPostImage.trim() && (
                <div style={{ position: 'relative', marginBottom: '12px', maxWidth: '300px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                  <img
                    src={newPostImage.trim()}
                    alt="Post preview"
                    style={{ width: '100%', maxHeight: '180px', objectFit: 'cover' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <div style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontSize: '11px' }}>
                    Photo Preview
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <input
                  type="url"
                  placeholder="📷 Optional photo URL (Imgur / Unsplash / Cloudinary)"
                  value={newPostImage}
                  onChange={e => setNewPostImage(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: '240px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-glass)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                />

                <button
                  type="submit"
                  disabled={creatingPost || !newPostContent.trim()}
                  className="action-btn primary"
                  style={{ padding: '9px 24px', fontSize: '14px', borderRadius: '10px' }}
                >
                  {creatingPost ? 'Publishing...' : '🚀 Publish Post'}
                </button>
              </div>
            </form>
          ) : (
            <div className="community-card-glass" style={{ padding: '20px', textAlign: 'center' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
                🔒 Log in to share your culinary creations, comment, and connect with chefs!
              </p>
            </div>
          )}

          {/* Posts Stream */}
          {loadingPosts ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="community-card-glass community-skeleton" style={{ height: '140px' }} />
              ))}
            </div>
          ) : posts.length > 0 ? (
            posts.map(post => (
              <div key={post.id} className="community-card-glass community-animate-card" style={{ padding: '20px' }}>

                {/* Author Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <Link to={`/profile/${post.username}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--gradient-primary)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '18px' }}>
                      {post.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        @{post.username}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatRelativeTime(post.created_at)}</div>
                    </div>
                  </Link>

                  <button
                    onClick={() => handleSharePost(post.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px', padding: '6px', borderRadius: '6px', transition: 'color 0.2s ease' }}
                    title="Share post"
                  >
                    🔗 Share
                  </button>
                </div>

                {/* Content */}
                <p style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: '1.6', margin: '0 0 14px 0', whiteSpace: 'pre-line' }}>
                  {post.content}
                </p>

                {/* Shared Meal Plan Card Embed */}
                {post.shared_meal_plan && (
                  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-1)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🗓️</span> Weekly Meal Plan ({post.shared_meal_plan.week_start || 'Shared'})
                      </span>
                      {post.shared_meal_plan.total_calories && (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                          🔥 ~{Math.round(post.shared_meal_plan.total_calories)} kcal total
                        </span>
                      )}
                    </div>
                    {post.shared_meal_plan.slots && post.shared_meal_plan.slots.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                        {post.shared_meal_plan.slots.slice(0, 6).map((slot, idx) => (
                          <div key={idx} style={{ background: 'var(--bg-primary)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-glass)', fontSize: '12px' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>{slot.date || slot.day} • {slot.meal_slot}</div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{slot.recipe_title || 'Planned Meal'}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Post photo attachment */}
                {post.image_url && (
                  <div style={{ position: 'relative', marginBottom: '14px', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setLightboxImage(post.image_url)}>
                    <img
                      src={post.image_url}
                      alt="Post content photo"
                      style={{ width: '100%', maxHeight: '420px', objectFit: 'cover', display: 'block', transition: 'transform 0.3s ease' }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', backdropFilter: 'blur(4px)' }}>
                      🔍 Click to expand
                    </div>
                  </div>
                )}

                {/* Interaction Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', borderTop: '1px solid var(--border-glass)', paddingTop: '12px', marginTop: '10px' }}>
                  <button
                    onClick={() => handleLikePost(post.id)}
                    className="community-heart-btn"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: post.is_liked ? '#ef4444' : 'var(--text-secondary)', fontWeight: 600, fontSize: '14px', transition: 'transform 0.15s ease' }}
                  >
                    <span>{post.is_liked ? '❤️' : '🤍'}</span>
                    <span>{post.likes_count}</span>
                  </button>

                  <button
                    onClick={() => handleToggleComments(post.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '14px' }}
                  >
                    <span>💬</span>
                    <span>{post.comments_count} Comments</span>
                  </button>
                </div>

                {/* Comments Section */}
                {activeCommentPostId === post.id && (
                  <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px dashed var(--border-glass)', animation: 'communityFadeInUp 0.25s ease' }}>
                    {/* Add comment input */}
                    {token && (
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          value={newCommentText}
                          onChange={e => setNewCommentText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddComment(post.id); }}
                          style={{ flex: 1, padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          className="action-btn primary"
                          disabled={!newCommentText.trim()}
                          style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '8px' }}
                        >
                          Reply
                        </button>
                      </div>
                    )}

                    {/* Comments List */}
                    {loadingCommentsMap[post.id] ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>Loading comments...</p>
                    ) : (commentsMap[post.id] || []).length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {(commentsMap[post.id] || []).map(comm => (
                          <div key={comm.id} className="community-comment-animate" style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', border: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <div>
                              <span style={{ fontWeight: '700', marginRight: '8px', color: 'var(--text-primary)' }}>@{comm.username}:</span>
                              <span style={{ color: 'var(--text-secondary)' }}>{comm.content}</span>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatRelativeTime(comm.created_at)}</span>
                          </div>
                        ))}

                      </div>
                    ) : (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>No comments yet. Start the conversation!</p>
                    )}
                  </div>
                )}

              </div>
            ))
          ) : (
            <div className="community-card-glass" style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', margin: 0 }}>
                {activeTab === 'following' ? "You aren't following anyone yet or your feed is quiet. Explore the Global Feed!" : "No community posts yet. Be the first to share something!"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Community Recipes ── */}
      {activeTab === 'recipes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Controls: Search, Diet Pills, Sorting */}
          <div className="community-card-glass" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="🔍 Search community recipes by title..."
                value={recipeSearch}
                onChange={e => setRecipeSearch(e.target.value)}
                style={{ flex: 1, minWidth: '260px', padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px' }}
              />

              <select
                value={recipeSortBy}
                onChange={e => setRecipeSortBy(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px', cursor: 'pointer' }}
              >
                <option value="newest">Latest Submissions</option>
                <option value="nutri_score">Highest Nutri-Score</option>
                <option value="prep_time">Fastest Prep Time</option>
              </select>
            </div>

            {/* Diet Filter Pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginRight: '4px' }}>Filter Diet:</span>
              {['All', 'High-Protein', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Low-Carb', 'Keto'].map(diet => (
                <button
                  key={diet}
                  onClick={() => setRecipeDietFilter(diet)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: recipeDietFilter === diet ? 'var(--accent-1)' : 'var(--border-glass)',
                    background: recipeDietFilter === diet ? 'rgba(255, 90, 54, 0.12)' : 'var(--bg-secondary)',
                    color: recipeDietFilter === diet ? 'var(--accent-1)' : 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: recipeDietFilter === diet ? '700' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {diet}
                </button>
              ))}
            </div>
          </div>

          {/* Recipes Cards Grid */}
          {loadingRecipes ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '18px' }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="community-card-glass community-skeleton" style={{ height: '220px' }} />
              ))}
            </div>
          ) : filteredRecipes.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '18px' }}>
              {filteredRecipes.map(r => (
                <div
                  key={r.id}
                  className="community-card-glass community-animate-card"
                  onClick={() => setSelectedRecipe(r)}
                  style={{ padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', background: 'rgba(255, 90, 54, 0.12)', color: 'var(--accent-1)', padding: '4px 10px', borderRadius: '8px' }}>
                        Community Recipe
                      </span>
                      {r.nutri_score_grade && <ChefScoreBadge grade={r.nutri_score_grade} size="sm" />}
                    </div>

                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: '700' }}>{r.title}</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>By @{r.submitter_username}</p>

                    <div style={{ display: 'flex', gap: '14px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '500' }}>
                      <span>⏱️ {r.ready_in_minutes} mins</span>
                      <span>🍽️ {r.servings} servings</span>
                      <span>🔥 {Math.round(r.calories)} kcal</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-glass)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>💪 {Math.round(r.protein_g)}g P | 🍞 {Math.round(r.carbs_g)}g C</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={(e) => handleSaveCommunityRecipe(e, r)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '14px',
                          border: '1px solid var(--border-glass)',
                          background: 'rgba(255, 90, 54, 0.08)',
                          color: 'var(--accent-1)',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                        title="Save recipe to your personal collection"
                      >
                        🔖 Save
                      </button>
                      <span style={{ color: 'var(--accent-1)', fontWeight: '700', fontSize: '13px' }}>View →</span>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className="community-card-glass" style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>No recipes found matching your filters.</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: Culinary Groups ── */}
      {activeTab === 'groups' && (
        <div>
          {/* If a group is selected, render Group Thread Discussion View */}
          {selectedGroup ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Group Thread Header */}
              <div className="community-card-glass" style={{ padding: '20px' }}>
                <button
                  onClick={() => setSelectedGroup(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-1)', fontWeight: '700', cursor: 'pointer', fontSize: '14px', marginBottom: '12px', padding: 0 }}
                >
                  ← Back to All Groups
                </button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '3px 10px', borderRadius: '6px' }}>
                      {selectedGroup.category}
                    </span>
                    <h2 style={{ margin: '8px 0 4px 0', fontSize: '1.6rem', color: 'var(--text-primary)' }}>{selectedGroup.name}</h2>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>{selectedGroup.description}</p>
                  </div>

                  <button
                    onClick={() => handleToggleGroup(selectedGroup.id)}
                    className={`action-btn ${selectedGroup.is_member ? 'secondary' : 'primary'}`}
                    style={{ padding: '8px 20px', fontSize: '14px', borderRadius: '10px' }}
                  >
                    {selectedGroup.is_member ? 'Leave Group' : 'Join Group'}
                  </button>
                </div>
              </div>

              {/* Group Post Creation Box */}
              {token ? (
                <form onSubmit={handleCreateGroupPost} className="community-card-glass" style={{ padding: '18px' }}>
                  <textarea
                    rows={2}
                    placeholder={`Write a discussion post in ${selectedGroup.name}...`}
                    value={newGroupPostContent}
                    onChange={e => setNewGroupPostContent(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px', marginBottom: '10px' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <input
                      type="url"
                      placeholder="Optional photo URL"
                      value={newGroupPostImage}
                      onChange={e => setNewGroupPostImage(e.target.value)}
                      style={{ flex: 1, minWidth: '220px', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                    />
                    <button type="submit" disabled={creatingGroupPost || !newGroupPostContent.trim()} className="action-btn primary" style={{ padding: '8px 20px', fontSize: '14px', borderRadius: '8px' }}>
                      {creatingGroupPost ? 'Posting...' : 'Post in Group'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="community-card-glass" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                  🔒 Log in to participate in group discussions.
                </div>
              )}

              {/* Group Posts Thread */}
              {loadingGroupFeed ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading group posts...</p>
              ) : groupPosts.length > 0 ? (
                groupPosts.map(post => (
                  <div key={post.id} className="community-card-glass community-animate-card" style={{ padding: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <Link to={`/profile/${post.username}`} style={{ textDecoration: 'none', color: 'inherit', fontWeight: '700', fontSize: '14px' }}>
                        @{post.username}
                      </Link>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>

                    <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '0 0 10px 0', whiteSpace: 'pre-line' }}>{post.content}</p>
                    {post.image_url && (
                      <img src={post.image_url} alt="Attachment" style={{ width: '100%', maxHeight: '350px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }} />
                    )}

                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', borderTop: '1px solid var(--border-glass)', paddingTop: '10px' }}>
                      <button onClick={() => handleLikePost(post.id, true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: post.is_liked ? '#ef4444' : 'var(--text-secondary)', fontWeight: 600 }}>
                        {post.is_liked ? '❤️' : '🤍'} {post.likes_count}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="community-card-glass" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No posts in this group yet. Start the conversation!
                </div>
              )}

            </div>
          ) : (
            /* All Groups Directory View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Header with Create Group Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>
                  Connect with members sharing your specific nutrition goals and dietary preferences.
                </p>
                {token && (
                  <button
                    onClick={() => setShowCreateGroupModal(true)}
                    className="action-btn primary"
                    style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '10px' }}
                  >
                    ➕ Create New Group
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginRight: '4px' }}>Filter Category:</span>
                {['All', 'Goal', 'Diet', 'Cuisine', 'Lifestyle'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setGroupCategoryFilter(cat)}
                    className={`community-filter-pill ${groupCategoryFilter === cat ? 'active' : ''}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Group Cards Grid */}
              {loadingGroups ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px' }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="community-card-glass community-skeleton" style={{ height: '180px' }} />
                  ))}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px' }}>
                  {groups.filter(g => groupCategoryFilter === 'All' || g.category === groupCategoryFilter).map(g => (
                    <div key={g.id} className="community-card-glass community-animate-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '3px 8px', borderRadius: '6px' }}>
                            {g.category}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>👥 {g.members_count} member{g.members_count !== 1 ? 's' : ''}</span>
                        </div>

                        <h3 style={{ margin: '6px 0 6px 0', fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: '700' }}>{g.name}</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 14px 0', lineHeight: '1.5' }}>{g.description}</p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                        <button
                          onClick={() => handleOpenGroupThread(g)}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-1)', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
                        >
                          💬 View Thread
                        </button>

                        <button
                          onClick={() => handleToggleGroup(g.id)}
                          className={`action-btn ${g.is_member ? 'secondary' : 'primary'}`}
                          style={{ padding: '6px 16px', fontSize: '13px', borderRadius: '8px' }}
                        >
                          {g.is_member ? 'Leave' : 'Join Group'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5: Challenges ── */}
      {activeTab === 'challenges' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {loadingChallenges ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="community-card-glass community-skeleton" style={{ height: '120px' }} />
              ))}
            </div>
          ) : (
            challenges.map(ch => (
              <div key={ch.id} className="community-card-glass community-animate-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255, 90, 54, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
                      {ch.badge_icon}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: '700' }}>{ch.title}</h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>{ch.description}</p>
                    </div>
                  </div>

                  {!ch.is_joined ? (
                    <button onClick={() => handleJoinChallenge(ch.id)} className="action-btn primary" style={{ padding: '9px 20px', fontSize: '13px', borderRadius: '10px' }}>
                      🎯 Enroll Challenge
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEvaluateProgress(ch.id)}
                      disabled={evaluatingProgress[ch.id]}
                      className="action-btn secondary"
                      style={{ padding: '9px 20px', fontSize: '13px', borderRadius: '10px' }}
                    >
                      {evaluatingProgress[ch.id] ? 'Syncing...' : '🔄 Sync Progress'}
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                {ch.is_joined && (
                  <div style={{ marginTop: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Progress: {ch.current_progress} / {ch.target_value}</span>
                      <span style={{ color: ch.is_completed ? '#10b981' : 'var(--accent-1)' }}>
                        {ch.is_completed ? '🎉 Completed!' : `${Math.round(Math.min(100, (ch.current_progress / ch.target_value) * 100))}%`}
                      </span>
                    </div>
                    <div style={{ height: '10px', background: 'var(--bg-secondary)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                      <div
                        style={{
                          width: `${Math.min(100, (ch.current_progress / ch.target_value) * 100)}%`,
                          height: '100%',
                          background: ch.is_completed ? 'var(--gradient-success)' : 'var(--gradient-primary)',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── TAB 6: Admin Moderation Queue ── */}
      {activeTab === 'moderation' && isAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="community-card-glass" style={{ padding: '20px' }}>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>🛡️</span> Recipe Moderation Queue
            </h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
              Review community recipe submissions flagged for potential macro density discrepancies or pending approval.
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
              <div key={r.id} className="community-card-glass community-animate-card" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '14px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '4px 10px', borderRadius: '8px' }}>
                      Pending Moderation
                    </span>
                    <h3 style={{ margin: '8px 0 4px 0', fontSize: '1.3rem', color: 'var(--text-primary)' }}>{r.title}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Submitted by @{r.submitter_username} • {new Date(r.created_at).toLocaleDateString()}</p>
                  </div>

                  {r.nutri_score_grade && <ChefScoreBadge grade={r.nutri_score_grade} size="sm" />}
                </div>

                {r.moderation_note && (
                  <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', color: '#d97706', marginBottom: '14px' }}>
                    ⚠️ <strong>Flag Note:</strong> {r.moderation_note}
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

                <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.5', margin: '0 0 16px 0' }}>{r.instructions}</p>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '14px' }}>
                  <input
                    type="text"
                    placeholder="Optional feedback note for submitter..."
                    value={moderationNote}
                    onChange={e => setModerationNote(e.target.value)}
                    style={{ flex: 1, padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                  />

                  <button
                    onClick={() => handleModerateRecipe(r.id, 'approve')}
                    disabled={moderatingId === r.id}
                    className="action-btn primary"
                    style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '8px', background: '#10b981', borderColor: '#10b981' }}
                  >
                    ✓ Approve
                  </button>

                  <button
                    onClick={() => handleModerateRecipe(r.id, 'reject')}
                    disabled={moderatingId === r.id}
                    className="action-btn secondary"
                    style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '8px', color: '#ef4444', borderColor: '#ef4444' }}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="community-card-glass" style={{ padding: '40px', textAlign: 'center' }}>
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
            style={{ width: '100%', maxWidth: '480px', padding: '24px', background: 'var(--bg-secondary)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem' }}>💬 Create Culinary Group</h2>
              <button onClick={() => setShowCreateGroupModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontWeight: '700', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Group Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Keto Meal Preppers"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ fontWeight: '700', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Category</label>
                <select
                  value={newGroupCategory}
                  onChange={e => setNewGroupCategory(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px' }}
                >
                  <option value="Diet">Diet</option>
                  <option value="Goal">Goal</option>
                  <option value="Cuisine">Cuisine</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label style={{ fontWeight: '700', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="What is this group about?"
                  value={newGroupDesc}
                  onChange={e => setNewGroupDesc(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowCreateGroupModal(false)} className="action-btn secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                  Cancel
                </button>
                <button type="submit" disabled={creatingGroup} className="action-btn primary" style={{ padding: '8px 20px', fontSize: '13px' }}>
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
          <img src={lightboxImage} alt="Expanded photo" className="community-lightbox-content" onClick={e => e.stopPropagation()} />
          <button
            onClick={() => setLightboxImage(null)}
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', borderRadius: '50%', width: '40px', height: '40px', backdropFilter: 'blur(4px)' }}
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
            // Ensure recipe fields fit RecipeModal expected structure
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
