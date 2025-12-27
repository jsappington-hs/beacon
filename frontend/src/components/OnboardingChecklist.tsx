import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Users, Building2, ClipboardList, User, X, Sparkles } from 'lucide-react';
import api from '../lib/api';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action: () => void;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

interface OnboardingChecklistProps {
  userRole: string;
}

export default function OnboardingChecklist({ userRole }: OnboardingChecklistProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [stats, setStats] = useState({
    departments: 0,
    users: 0,
    reviewCycles: 0,
    hasProfilePicture: false,
    hasBio: false,
  });
  const [loading, setLoading] = useState(true);

  const isAdmin = userRole === 'HR_ADMIN' || userRole === 'SUPER_ADMIN';

  useEffect(() => {
    // Check if user has dismissed the checklist
    const dismissedKey = `onboarding_dismissed_${userRole}`;
    if (localStorage.getItem(dismissedKey) === 'true') {
      setDismissed(true);
      setLoading(false);
      return;
    }

    loadStats();
  }, [userRole]);

  const loadStats = async () => {
    try {
      const [deptRes, usersRes, cyclesRes, meRes] = await Promise.all([
        api.get('/departments').catch(() => ({ data: [] })),
        api.get('/users').catch(() => ({ data: [] })),
        api.get('/review-cycles').catch(() => ({ data: [] })),
        api.get('/auth/me').catch(() => ({ data: {} })),
      ]);

      setStats({
        departments: deptRes.data.length,
        users: usersRes.data.length,
        reviewCycles: cyclesRes.data.length,
        hasProfilePicture: !!meRes.data.profilePicture,
        hasBio: !!meRes.data.bio,
      });
    } catch (error) {
      console.error('Failed to load onboarding stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    const dismissedKey = `onboarding_dismissed_${userRole}`;
    localStorage.setItem(dismissedKey, 'true');
    setDismissed(true);
  };

  // Define checklist items based on role
  const adminItems: ChecklistItem[] = [
    {
      id: 'departments',
      title: 'Create your first department',
      description: 'Organize your team by department',
      completed: stats.departments > 0,
      action: () => navigate('/admin'),
      icon: Building2,
    },
    {
      id: 'users',
      title: 'Invite team members',
      description: 'Add employees to your organization',
      completed: stats.users > 1,
      action: () => navigate('/admin'),
      icon: Users,
    },
    {
      id: 'reviews',
      title: 'Create a review cycle',
      description: 'Start your first performance review',
      completed: stats.reviewCycles > 0,
      action: () => navigate('/review-management'),
      icon: ClipboardList,
    },
    {
      id: 'profile',
      title: 'Complete your profile',
      description: 'Add a photo and bio',
      completed: stats.hasProfilePicture && stats.hasBio,
      action: () => navigate('/settings'),
      icon: User,
    },
  ];

  const employeeItems: ChecklistItem[] = [
    {
      id: 'profile',
      title: 'Complete your profile',
      description: 'Add a photo and bio to help your team know you',
      completed: stats.hasProfilePicture && stats.hasBio,
      action: () => navigate('/settings'),
      icon: User,
    },
  ];

  const items = isAdmin ? adminItems : employeeItems;
  const completedCount = items.filter(i => i.completed).length;
  const progress = Math.round((completedCount / items.length) * 100);

  // Don't show if dismissed or all items completed or still loading
  if (loading || dismissed || completedCount === items.length) {
    return null;
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '32px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        top: '-50px',
        right: '-50px',
        width: '200px',
        height: '200px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '50%',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-30px',
        left: '30%',
        width: '100px',
        height: '100px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '50%',
      }} />

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          borderRadius: '6px',
          padding: '6px',
          cursor: 'pointer',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="Dismiss checklist"
      >
        <X size={16} />
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', position: 'relative' }}>
        <div style={{
          width: '44px',
          height: '44px',
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Sparkles size={24} color="white" />
        </div>
        <div>
          <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '600', margin: 0 }}>
            Getting Started
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', margin: 0 }}>
            {completedCount} of {items.length} tasks completed
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        background: 'rgba(255,255,255,0.2)',
        borderRadius: '8px',
        height: '8px',
        marginBottom: '20px',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          background: 'white',
          height: '100%',
          width: `${progress}%`,
          borderRadius: '8px',
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Checklist items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              onClick={item.action}
              style={{
                background: item.completed ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.95)',
                borderRadius: '10px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: item.completed ? 'default' : 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!item.completed) {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!item.completed) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.95)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: item.completed ? 'rgba(255,255,255,0.2)' : '#667eea15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {item.completed ? (
                  <Check size={18} color="white" />
                ) : (
                  <Icon size={18} color="#667eea" />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: item.completed ? 'rgba(255,255,255,0.9)' : '#111827',
                  textDecoration: item.completed ? 'line-through' : 'none',
                }}>
                  {item.title}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: item.completed ? 'rgba(255,255,255,0.6)' : '#6b7280',
                }}>
                  {item.description}
                </div>
              </div>
              {!item.completed && (
                <ChevronRight size={18} color="#667eea" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
