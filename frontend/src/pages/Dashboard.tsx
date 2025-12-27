import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, ClipboardList, Users, TrendingUp, Building2, Settings, CheckCircle, AlertCircle, Clock, UsersRound } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { manager } from '../lib/api';
import OnboardingChecklist from '../components/OnboardingChecklist';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [todos, setTodos] = useState<any>(null);
  const [teamActivity, setTeamActivity] = useState<any[]>([]);
  const [teamSummary, setTeamSummary] = useState<any>(null);
  const [isLoadingManagerData, setIsLoadingManagerData] = useState(false);

  const isManager = user?.role === 'MANAGER' || user?.role === 'HR_ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (isManager) {
      loadManagerData();
    }
  }, [isManager]);

  const loadManagerData = async () => {
    try {
      setIsLoadingManagerData(true);
      const [todosData, activityData, summaryData] = await Promise.all([
        manager.getTodos(),
        manager.getTeamActivity(10),
        manager.getTeamSummary(),
      ]);
      setTodos(todosData);
      setTeamActivity(activityData);
      setTeamSummary(summaryData);
    } catch (error) {
      console.error('Failed to load manager data:', error);
    } finally {
      setIsLoadingManagerData(false);
    }
  };

  const mainCards = [
    {
      title: 'Reviews',
      description: 'Performance reviews and feedback',
      icon: ClipboardList,
      path: '/reviews',
      color: '#3b82f6',
    },
    {
      title: 'One-on-Ones',
      description: 'Manage your 1:1 meetings',
      icon: Users,
      path: '/one-on-ones',
      color: '#3b82f6',
    },
    {
      title: 'Goals',
      description: 'Track your OKRs and progress',
      icon: Target,
      path: '/goals',
      color: '#3b82f6',
      comingSoon: true,
    },
    {
      title: 'Development',
      description: 'Your career development plan',
      icon: TrendingUp,
      path: '/development',
      color: '#3b82f6',
      comingSoon: true,
    },
    {
      title: 'Org Chart',
      description: 'Explore the organizational hierarchy',
      icon: UsersRound,
      path: '/employees',
      color: '#3b82f6',
    },
  ];

  const managementCards = [];

  if (user?.role === 'MANAGER' || user?.role === 'HR_ADMIN' || user?.role === 'SUPER_ADMIN') {
    managementCards.push({
      title: 'Team',
      description: 'Manage your team',
      icon: Building2,
      path: '/team',
      color: '#10b981',
    });
  }

  if (user?.role === 'HR_ADMIN' || user?.role === 'SUPER_ADMIN') {
    managementCards.push({
      title: 'Review Management',
      description: 'Create and manage review cycles',
      icon: ClipboardList,
      path: '/review-management',
      color: '#8b5cf6',
    });
    managementCards.push({
      title: 'Admin',
      description: 'System administration',
      icon: Settings,
      path: '/admin',
      color: '#6b7280',
    });
  }

  return (
    <div style={{ padding: '48px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '600', color: '#111827', marginBottom: '8px', letterSpacing: '-0.5px' }}>
          Welcome back, {user?.name}
        </h1>
        <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>
          {user?.title && `${user.title}`}
        </p>
      </div>

      {/* Onboarding Checklist */}
      {user?.role && <OnboardingChecklist userRole={user.role} />}

      {/* Main Navigation Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '48px', maxWidth: '100%' }}>
        {mainCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.path}
              onClick={() => navigate(card.path)}
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: '1px solid #e5e7eb',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                e.currentTarget.style.borderColor = card.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              {(card as any).comingSoon && (
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: '#fef3c7',
                    color: '#92400e',
                    fontSize: '11px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Coming Soon
                </div>
              )}
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '10px',
                  background: `${card.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <Icon size={24} color={card.color} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px', margin: 0 }}>
                {card.title}
              </h3>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, lineHeight: '1.5' }}>
                {card.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Management Section */}
      {managementCards.length > 0 && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '4px', margin: 0 }}>
              Management
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
              Tools for managing your team and organization
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '48px', maxWidth: '100%' }}>
            {managementCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.path}
                  onClick={() => navigate(card.path)}
                  style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    padding: '24px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: '1px solid #e5e7eb',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                    e.currentTarget.style.borderColor = card.color;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '10px',
                      background: `${card.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '16px',
                    }}
                  >
                    <Icon size={24} color={card.color} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px', margin: 0 }}>
                    {card.title}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, lineHeight: '1.5' }}>
                    {card.description}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Manager Sections */}
      {isManager && todos && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          {/* To-Do List */}
          {(todos.reviewsDue.length > 0 || todos.goalsToSet.length > 0) && (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '24px',
              }}
            >
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px', margin: '0 0 16px 0' }}>
                Your To-Dos ({todos.summary.totalTodos})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {todos.reviewsDue.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/reviews`)}
                    style={{
                      padding: '16px 20px',
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(59,130,246,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: '#fef3c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <AlertCircle size={20} color="#f59e0b" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: '500', color: '#111827', marginBottom: '4px' }}>
                        Complete review for {item.reviewee.name}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        {item.cycle.name} • Self-assessment completed
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        background: '#fef3c7',
                        color: '#92400e',
                        fontSize: '12px',
                        fontWeight: '500',
                      }}
                    >
                      High Priority
                    </div>
                  </div>
                ))}
                {todos.goalsToSet.map((item: any, index: number) => (
                  <div
                    key={`goal-${index}`}
                    onClick={() => navigate(`/goals`)}
                    style={{
                      padding: '16px 20px',
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(59,130,246,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: '#dbeafe',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Target size={20} color="#3b82f6" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: '500', color: '#111827', marginBottom: '4px' }}>
                        Set goals with {item.employee.name}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        {item.reason}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        background: '#dbeafe',
                        color: '#1e40af',
                        fontSize: '12px',
                        fontWeight: '500',
                      }}
                    >
                      Medium Priority
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team Activity */}
          {teamActivity.length > 0 && (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '24px',
              }}
            >
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px', margin: '0 0 16px 0' }}>
                Team Activity
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {teamActivity.slice(0, 5).map((activity: any) => (
                  <div
                    key={activity.id}
                    style={{
                      padding: '12px 16px',
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: activity.type === 'review' ? '#dbeafe' : activity.type === 'goal' ? '#dcfce7' : '#fef3c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {activity.type === 'review' && <ClipboardList size={16} color="#3b82f6" />}
                      {activity.type === 'goal' && <Target size={16} color="#10b981" />}
                      {activity.type === 'one_on_one' && <Users size={16} color="#f59e0b" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', color: '#111827', marginBottom: '2px' }}>
                        <strong>{activity.employee.name}</strong>{' '}
                        {activity.action === 'completed' && 'completed'}
                        {activity.action === 'updated' && 'updated'}
                        {activity.action === 'created' && 'created'}
                        {activity.action === 'notes_added' && 'added notes to'}
                        {' '}
                        {activity.type === 'review' && `their ${activity.details.cycleName} review`}
                        {activity.type === 'goal' && activity.details.title}
                        {activity.type === 'one_on_one' && 'a 1:1 meeting'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {new Date(activity.timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
