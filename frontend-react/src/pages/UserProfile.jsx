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
  const [lightboxImage, setLightboxImage] = useState(null);

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
      <div className="page-container" style={{ maxWidth: '820px', margin: '0 auto', padding: '60px 16px', textAlign: 'center' }}>
        <div className="community-card-glass community-skeleton" style={{ height: '220px', width: '100%' }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-container" style={{ maxWidth: '820px', margin: '0 auto', padding: '60px 16px', textAlign: 'center' }}>
        <div className="community-card-glass" style={{ padding: '40px' }}>
          <h2>Chef Profile Not Found</h2>
          <Link to="/community" style={{ color: 'var(--accent-1)', fontWeight: 700 }}>← Return to Community Hub</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '820px', margin: '0 auto', padding: '24px 16px' }}>
      
      {/* Back Link */}
      <Link to="/community" style={{ textDecoration: 'none', color: 'var(--accent-1)', fontWeight: 700, fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '20px' }}>
        ← Back to Community Hub
      </Link>

      {/* Profile Card Header */}
      <div className="community-card-glass community-animate-card" style={{ padding: '28px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: 'var(--gradient-primary)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '30px', boxShadow: '0 4px 16px rgba(255, 90, 54, 0.3)' }}>
              {profile.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>@{profile.username}</h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>CHEF Culinary Community Member</p>
            </div>
          </div>

          {currentUsername !== profile.username ? (
            <button
              onClick={handleToggleFollow}
              className={`action-btn ${profile.is_following ? 'secondary' : 'primary'}`}
              style={{ padding: '10px 24px', fontSize: '14px', borderRadius: '10px', fontWeight: '700' }}
            >
              {profile.is_following ? '✓ Following' : '➕ Follow Chef'}
            </button>
          ) : (
            <Link
              to="/tdee"
              className="action-btn primary"
              style={{ padding: '10px 20px', fontSize: '14px', borderRadius: '10px', fontWeight: '700', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              ⚙️ Manage Profile & Goals
            </Link>
          )}
        </div>

        {/* Stats Row */}
        <div style={{ display: 'flex', gap: '32px', marginTop: '24px', borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
          <div>
            <div style={{ fontWeight: '800', fontSize: '20px', color: 'var(--text-primary)' }}>{profile.posts_count}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Posts</div>
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '20px', color: 'var(--text-primary)' }}>{profile.followers_count}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Followers</div>
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '20px', color: 'var(--text-primary)' }}>{profile.following_count}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Following</div>
          </div>
        </div>

        {/* Challenge Badges Cabinet */}
        <div style={{ marginTop: '24px', borderTop: '1px dashed var(--border-glass)', paddingTop: '20px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🏆</span> Achievements & Badges
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255, 90, 54, 0.12)', border: '1px solid rgba(255, 90, 54, 0.25)', borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '22px' }}>🥩</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>High-Protein Master</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>7-Day Target Achieved</div>
              </div>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '22px' }}>🥗</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>Nutri-Score Champion</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Grade A/B Streak</div>
              </div>
            </div>

            <div style={{ background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '22px' }}>💧</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>Hydration Hero</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Daily Water Target Met</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chef Posts Stream */}
      <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '18px', color: 'var(--text-primary)' }}>
        Recent Posts by @{profile.username}
      </h2>

      {profile.recent_posts.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {profile.recent_posts.map(post => (
            <div key={post.id} className="community-card-glass community-animate-card" style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '15px', color: 'var(--text-primary)', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                {post.content}
              </p>

              {post.image_url && (
                <div style={{ position: 'relative', marginBottom: '12px', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setLightboxImage(post.image_url)}>
                  <img
                    src={post.image_url}
                    alt="Post attachment"
                    style={{ width: '100%', maxHeight: '380px', objectFit: 'cover', display: 'block' }}
                  />
                </div>
              )}

              <div style={{ fontSize: '13px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-glass)', paddingTop: '10px', display: 'flex', gap: '16px' }}>
                <span>❤️ {post.likes_count} likes</span>
                <span>💬 {post.comments_count} comments</span>
                <span>• {new Date(post.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="community-card-glass" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No public posts published by this chef yet.
        </div>
      )}

      {/* Lightbox modal */}
      {lightboxImage && (
        <div className="community-lightbox-backdrop" onClick={() => setLightboxImage(null)}>
          <img src={lightboxImage} alt="Expanded photo" className="community-lightbox-content" onClick={e => e.stopPropagation()} />
          <button
            onClick={() => setLightboxImage(null)}
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', borderRadius: '50%', width: '40px', height: '40px' }}
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
}
