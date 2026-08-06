import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import ChefScoreBadge from '../components/ChefScoreBadge';

export default function Community() {
  const { token, username } = useContext(AuthContext);
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('global'); // 'global' | 'following' | 'recipes' | 'groups' | 'challenges'

  // Social Feed state
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [creatingPost, setCreatingPost] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const [commentsMap, setCommentsMap] = useState({});
  const [newCommentText, setNewCommentText] = useState('');

  // Community Recipes state
  const [communityRecipes, setCommunityRecipes] = useState([]);
  const [recipeSearch, setRecipeSearch] = useState('');

  // Groups state
  const [groups, setGroups] = useState([]);
  const [selectedGroupThread, setSelectedGroupThread] = useState(null);
  const [groupPosts, setGroupPosts] = useState([]);

  // Challenges state
  const [challenges, setChallenges] = useState([]);
  const [evaluatingProgress, setEvaluatingProgress] = useState({});

  // 1. Fetch posts on tab change
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
      api.get('/community/recipes')
        .then(data => setCommunityRecipes(data))
        .catch(err => console.error("Error fetching community recipes:", err));
    } else if (activeTab === 'groups') {
      api.get('/community/groups')
        .then(data => setGroups(data))
        .catch(err => console.error("Error fetching groups:", err));
    } else if (activeTab === 'challenges') {
      api.get('/community/challenges')
        .then(data => setChallenges(data))
        .catch(err => console.error("Error fetching challenges:", err));
    }
  }, [activeTab, token]);

  // Create post
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

  // Like post
  const handleLikePost = async (postId) => {
    if (!token) {
      toast.showError("Please log in to like posts.");
      return;
    }
    try {
      const res = await api.post(`/community/posts/${postId}/like`);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: res.likes_count, is_liked: res.is_liked } : p));
    } catch (err) {
      toast.showError("Failed to update like status.");
    }
  };

  // Toggle Comments
  const handleToggleComments = async (postId) => {
    if (activeCommentPostId === postId) {
      setActiveCommentPostId(null);
    } else {
      setActiveCommentPostId(postId);
      try {
        const comms = await api.get(`/community/posts/${postId}/comments`);
        setCommentsMap(prev => ({ ...prev, [postId]: comms }));
      } catch (err) {
        console.error("Error fetching comments:", err);
      }
    }
  };

  // Add Comment
  const handleAddComment = async (postId) => {
    if (!token) {
      toast.showError("Please log in to comment.");
      return;
    }
    if (!newCommentText.trim()) return;

    try {
      const comm = await api.post(`/community/posts/${postId}/comments`, { content: newCommentText.trim() });
      setCommentsMap(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), comm]
      }));
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));
      setNewCommentText('');
    } catch (err) {
      toast.showError(err.response?.data?.detail || "Failed to add comment.");
    }
  };

  // Join Group
  const handleToggleGroup = async (groupId) => {
    if (!token) {
      toast.showError("Please log in to join groups.");
      return;
    }
    try {
      const res = await api.post(`/community/groups/${groupId}/join`);
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, members_count: res.members_count, is_member: res.is_member } : g));
      toast.showSuccess(res.is_member ? "Joined group!" : "Left group.");
    } catch (err) {
      toast.showError("Failed to update group membership.");
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

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px 15px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>👥</span> CHEF Community Hub
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '14px' }}>
            Share meals, discover community recipes, join culinary groups, and track nutrition challenges.
          </p>
        </div>

        <Link to="/community/submit-recipe" className="action-btn primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
          <span>➕</span> Submit Custom Recipe
        </Link>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border-color)', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { id: 'global', label: '🔥 Global Feed' },
          { id: 'following', label: '👥 Following' },
          { id: 'recipes', label: '👨‍🍳 Community Recipes' },
          { id: 'groups', label: '💬 Groups' },
          { id: 'challenges', label: '🏆 Challenges' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: activeTab === t.id ? 'var(--chef-orange, #f97316)' : 'transparent',
              color: activeTab === t.id ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: activeTab === t.id ? '700' : '500',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontSize: '14px',
              transition: 'all 0.2s ease',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1 & 2: Social Feed (Global / Following) ── */}
      {(activeTab === 'global' || activeTab === 'following') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Post Creation Box */}
          {token ? (
            <form onSubmit={handleCreatePost} style={{ background: 'var(--card-bg, #ffffff)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>👨‍🍳</span>
                <span style={{ fontWeight: '700', fontSize: '14px' }}>Share with the CHEF Community</span>
              </div>

              <textarea
                rows={3}
                placeholder="What are you cooking today? Share a recipe recommendation, meal accomplishment, or tip..."
                value={newPostContent}
                onChange={e => setNewPostContent(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', resize: 'vertical', fontSize: '14px', marginBottom: '10px' }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <input
                  type="url"
                  placeholder="Optional photo URL (Imgur / Unsplash / Cloudinary)"
                  value={newPostImage}
                  onChange={e => setNewPostImage(e.target.value)}
                  style={{ flex: 1, minWidth: '220px', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                />

                <button type="submit" disabled={creatingPost || !newPostContent.trim()} className="action-btn primary" style={{ padding: '8px 20px', fontSize: '14px' }}>
                  {creatingPost ? 'Posting...' : 'Publish Post'}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ background: 'var(--card-bg, #ffffff)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
                🔒 Please log in to publish posts, comment, and follow chefs in the community!
              </p>
            </div>
          )}

          {/* Posts Stream */}
          {loadingPosts ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>Loading community posts...</p>
          ) : posts.length > 0 ? (
            posts.map(post => (
              <div key={post.id} style={{ background: 'var(--card-bg, #ffffff)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                {/* Author Info */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <Link to={`/profile/${post.username}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #f97316, #f59e0b)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '16px' }}>
                      {post.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px' }}>@{post.username}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(post.created_at).toLocaleDateString()}</div>
                    </div>
                  </Link>
                </div>

                {/* Content */}
                <p style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: '1.5', margin: '0 0 12px 0', whiteSpace: 'pre-line' }}>
                  {post.content}
                </p>

                {/* Photo attachment */}
                {post.image_url && (
                  <img
                    src={post.image_url}
                    alt="Community post attachment"
                    style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}

                {/* Interaction Footer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '10px' }}>
                  <button
                    onClick={() => handleLikePost(post.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: post.is_liked ? '#ef4444' : 'var(--text-secondary)', fontWeight: 600, fontSize: '14px' }}
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

                {/* Comments Expandable Section */}
                {activeCommentPostId === post.id && (
                  <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed var(--border-color)' }}>
                    {/* Add comment */}
                    {token && (
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          value={newCommentText}
                          onChange={e => setNewCommentText(e.target.value)}
                          style={{ flex: 1, padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                        />
                        <button onClick={() => handleAddComment(post.id)} className="action-btn primary" style={{ padding: '6px 14px', fontSize: '13px' }}>
                          Reply
                        </button>
                      </div>
                    )}

                    {/* Comments list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(commentsMap[post.id] || []).map(comm => (
                        <div key={comm.id} style={{ background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}>
                          <span style={{ fontWeight: '700', marginRight: '8px', color: 'var(--text-primary)' }}>@{comm.username}:</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{comm.content}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
              No community posts yet. Be the first to share something!
            </p>
          )}
        </div>
      )}

      {/* ── TAB 3: Community Recipes ── */}
      {activeTab === 'recipes' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Search community recipes by title..."
              value={recipeSearch}
              onChange={e => setRecipeSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {communityRecipes
              .filter(r => !recipeSearch || r.title.toLowerCase().includes(recipeSearch.toLowerCase()))
              .map(r => (
                <div key={r.id} style={{ background: 'var(--card-bg, #ffffff)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', background: 'rgba(249, 115, 22, 0.15)', color: '#f97316', padding: '3px 8px', borderRadius: '6px' }}>
                        Community Submission
                      </span>
                      {r.nutri_score_grade && <ChefScoreBadge grade={r.nutri_score_grade} size="sm" />}
                    </div>

                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{r.title}</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 10px 0' }}>Submitted by @{r.submitter_username}</p>

                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                      <span>⏱️ {r.ready_in_minutes} mins</span>
                      <span>🍽️ {r.servings} servings</span>
                      <span>🔥 {Math.round(r.calories)} kcal</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                    💪 Protein: {Math.round(r.protein_g)}g | 🍞 Carbs: {Math.round(r.carbs_g)}g | 🥑 Fat: {Math.round(r.fat_g)}g
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: Groups ── */}
      {activeTab === 'groups' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {groups.map(g => (
            <div key={g.id} style={{ background: 'var(--card-bg, #ffffff)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '2px 6px', borderRadius: '4px' }}>
                  {g.category}
                </span>
                <h3 style={{ margin: '8px 0 4px 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{g.name}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: '1.4' }}>{g.description}</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>👥 {g.members_count} member{g.members_count > 1 ? 's' : ''}</span>
                <button
                  onClick={() => handleToggleGroup(g.id)}
                  className={`action-btn ${g.is_member ? 'secondary' : 'primary'}`}
                  style={{ padding: '6px 14px', fontSize: '13px' }}
                >
                  {g.is_member ? 'Leave Group' : 'Join Group'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB 5: Challenges ── */}
      {activeTab === 'challenges' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {challenges.map(ch => (
            <div key={ch.id} style={{ background: 'var(--card-bg, #ffffff)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '28px' }}>{ch.badge_icon}</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{ch.title}</h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>{ch.description}</p>
                  </div>
                </div>

                {!ch.is_joined ? (
                  <button onClick={() => handleJoinChallenge(ch.id)} className="action-btn primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                    Join Challenge
                  </button>
                ) : (
                  <button
                    onClick={() => handleEvaluateProgress(ch.id)}
                    disabled={evaluatingProgress[ch.id]}
                    className="action-btn secondary"
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                  >
                    {evaluatingProgress[ch.id] ? 'Syncing...' : 'Sync Progress'}
                  </button>
                )}
              </div>

              {/* Progress bar */}
              {ch.is_joined && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    <span>Progress: {ch.current_progress} / {ch.target_value}</span>
                    <span>{ch.is_completed ? '✅ Completed!' : `${Math.round(Math.min(100, (ch.current_progress / ch.target_value) * 100))}%`}</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, (ch.current_progress / ch.target_value) * 100)}%`,
                        height: '100%',
                        background: ch.is_completed ? '#10b981' : 'linear-gradient(90deg, #f97316, #f59e0b)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
