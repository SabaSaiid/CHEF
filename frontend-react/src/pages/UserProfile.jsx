import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export default function UserProfile() {
  const { username: targetUsername } = useParams();
  const { token, username: currentUsername } = useContext(AuthContext);
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (targetUsername) {
      setLoading(true);
      api.get(`/community/users/${targetUsername}/profile`)
        .then(data => setProfile(data))
        .catch(err => {
          console.error("Error loading user profile:", err);
          toast.showError("Chef profile not found.");
        })
        .finally(() => setLoading(false));
    }
  }, [targetUsername]);

  const handleToggleFollow = async () => {
    if (!token) {
      toast.showError("Please log in to follow chefs.");
      return;
    }
    if (!profile) return;

    try {
      const res = await api.post(`/community/users/${profile.user_id}/follow`);
      setProfile(prev => ({
        ...prev,
        is_following: res.is_following,
        followers_count: res.is_following ? prev.followers_count + 1 : Math.max(0, prev.followers_count - 1),
      }));
      toast.showSuccess(res.is_following ? `Following @${profile.username}` : `Unfollowed @${profile.username}`);
    } catch (err) {
      toast.showError("Failed to update follow status.");
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '60px 0' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading chef profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '60px 0' }}>
        <h2>Chef Not Found</h2>
        <Link to="/community" style={{ color: '#f97316' }}>Return to Community Hub</Link>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px 15px' }}>
      {/* Profile Banner Header */}
      <div style={{ background: 'var(--card-bg, #ffffff)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #f97316, #f59e0b)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '28px' }}>
              {profile.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.6rem', color: 'var(--text-primary)' }}>@{profile.username}</h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>CHEF Community Member</p>
            </div>
          </div>

          {currentUsername !== profile.username && (
            <button
              onClick={handleToggleFollow}
              className={`action-btn ${profile.is_following ? 'secondary' : 'primary'}`}
              style={{ padding: '8px 20px', fontSize: '14px' }}
            >
              {profile.is_following ? 'Following' : 'Follow Chef'}
            </button>
          )}
        </div>

        {/* Stats Row */}
        <div style={{ display: 'flex', gap: '24px', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <div>
            <div style={{ fontWeight: '700', fontSize: '18px', color: 'var(--text-primary)' }}>{profile.posts_count}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Posts</div>
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '18px', color: 'var(--text-primary)' }}>{profile.followers_count}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Followers</div>
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '18px', color: 'var(--text-primary)' }}>{profile.following_count}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Following</div>
          </div>
        </div>
      </div>

      {/* Chef Posts */}
      <h2 style={{ fontSize: '1.3rem', marginBottom: '16px' }}>Recent Posts by @{profile.username}</h2>
      {profile.recent_posts.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {profile.recent_posts.map(post => (
            <div key={post.id} style={{ background: 'var(--card-bg, #ffffff)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '16px' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>{post.content}</p>
              {post.image_url && (
                <img src={post.image_url} alt="Post attachment" style={{ width: '100%', maxHeight: '350px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }} />
              )}
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                ❤️ {post.likes_count} likes · 💬 {post.comments_count} comments · {new Date(post.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No public posts from this chef yet.</p>
      )}
    </div>
  );
}
