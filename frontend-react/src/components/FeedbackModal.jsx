import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  MessageSquare, 
  X, 
  Send, 
  Star, 
  Bug, 
  Salad, 
  Lightbulb, 
  ShieldCheck, 
  CheckCircle2 
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function FeedbackModal({ isOpen, onClose, contextItem = '' }) {
  const toast = useToast();
  const [type, setType] = useState('inaccurate_data'); // 'bug' | 'inaccurate_data' | 'feature' | 'legal'
  const [rating, setRating] = useState(5);
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Please enter a brief description before submitting.');
      return;
    }

    try {
      const feedbackEntry = {
        id: 'fb_' + Date.now(),
        type,
        rating,
        description,
        email,
        contextItem: contextItem || window.location.pathname,
        submittedAt: new Date().toISOString()
      };

      const existing = JSON.parse(localStorage.getItem('chef_feedback_submissions') || '[]');
      localStorage.setItem('chef_feedback_submissions', JSON.stringify([feedbackEntry, ...existing]));

      setSubmitted(true);
      toast.success('Thank you! Your feedback has been recorded.');
      setTimeout(() => {
        setSubmitted(false);
        setDescription('');
        onClose();
      }, 1800);
    } catch (err) {
      toast.error('Failed to submit feedback.');
    }
  };

  return createPortal(
    <div className="modal-overlay">
      <div className="modal-content feedback-modal-content">
        <button className="modal-close" onClick={onClose}>×</button>

        {submitted ? (
          <div className="feedback-success-state">
            <CheckCircle2 size={48} className="success-icon" />
            <h3>Feedback Submitted!</h3>
            <p>Thank you for helping us improve CHEF. Your input has been logged.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="feedback-form">
            <div className="feedback-modal-header">
              <div className="title-group">
                <MessageSquare className="modal-header-icon" size={22} />
                <h3 className="modal-title">Feedback & Data Reporting</h3>
              </div>
              <p className="modal-subtitle">Report inaccurate calorie counts, flag recipe bugs, or share feature ideas.</p>
            </div>

            {/* Type Selector Pills */}
            <div className="form-group">
              <label className="form-label">Feedback Category</label>
              <div className="feedback-type-grid">
                <button
                  type="button"
                  className={`type-btn ${type === 'inaccurate_data' ? 'active' : ''}`}
                  onClick={() => setType('inaccurate_data')}
                >
                  <Salad size={16} />
                  <span>Inaccurate Nutrition Data</span>
                </button>

                <button
                  type="button"
                  className={`type-btn ${type === 'bug' ? 'active' : ''}`}
                  onClick={() => setType('bug')}
                >
                  <Bug size={16} />
                  <span>Bug Report</span>
                </button>

                <button
                  type="button"
                  className={`type-btn ${type === 'feature' ? 'active' : ''}`}
                  onClick={() => setType('feature')}
                >
                  <Lightbulb size={16} />
                  <span>Feature Request</span>
                </button>

                <button
                  type="button"
                  className={`type-btn ${type === 'legal' ? 'active' : ''}`}
                  onClick={() => setType('legal')}
                >
                  <ShieldCheck size={16} />
                  <span>Legal & Privacy Query</span>
                </button>
              </div>
            </div>

            {/* Satisfaction Rating */}
            <div className="form-group">
              <label className="form-label">Overall Platform Satisfaction</label>
              <div className="star-rating-row">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`star-btn ${star <= rating ? 'filled' : ''}`}
                    onClick={() => setRating(star)}
                    title={`${star} Star${star > 1 ? 's' : ''}`}
                  >
                    <Star size={20} fill={star <= rating ? '#f59e0b' : 'none'} color={star <= rating ? '#f59e0b' : '#a1a1aa'} />
                  </button>
                ))}
              </div>
            </div>

            {/* Context & Description */}
            <div className="form-group">
              <label className="form-label">Detailed Explanation</label>
              <textarea
                className="form-textarea"
                rows="4"
                required
                placeholder={
                  type === 'inaccurate_data'
                    ? 'Specify which ingredient or recipe has incorrect calorie or macro counts...'
                    : 'Describe what happened or what you would like to see added...'
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Optional Email */}
            <div className="form-group">
              <label className="form-label">Email (Optional, for follow-up)</label>
              <input
                type="email"
                className="form-input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                <Send size={15} />
                <span>Submit Feedback</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
