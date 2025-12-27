import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTeam } from '../hooks/useTeam';
import { manager } from '../lib/api';
import type { User } from '../types';
import {
  Users,
  Target,
  ClipboardList,
  Calendar,
  Search,
  Mail,
  Building,
  TrendingUp
} from 'lucide-react';
import Avatar from '../components/Avatar';
import EmployeeDetailModal from '../components/EmployeeDetailModal';

export default function Team() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { employees, isLoading: isLoadingEmployees, error: employeesError } = useTeam();
  const [filteredEmployees, setFilteredEmployees] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [teamStats, setTeamStats] = useState<any>(null);
  const [teamActivity, setTeamActivity] = useState<any[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const isManager = currentUser?.role === 'MANAGER' || currentUser?.role === 'HR_ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (isManager) {
      loadManagerData();
    } else {
      setIsLoadingStats(false);
    }
  }, [isManager]);

  useEffect(() => {
    filterEmployees();
  }, [searchQuery, employees]);

  const loadManagerData = async () => {
    try {
      setIsLoadingStats(true);
      const [stats, activity] = await Promise.all([
        manager.getTeamSummary(),
        manager.getTeamActivity(15),
      ]);
      setTeamStats(stats);
      setTeamActivity(activity);
    } catch (error) {
      console.error('Failed to load manager data:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const filterEmployees = () => {
    if (!searchQuery.trim()) {
      setFilteredEmployees(employees);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = employees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query) ||
        emp.title?.toLowerCase().includes(query)
    );
    setFilteredEmployees(filtered);
  };

  if (isLoadingEmployees || isLoadingStats) {
    return (
      <div style={{ padding: '48px' }}>
        <h1>Team</h1>
        <p>Loading team data...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '48px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '600', color: '#111827', marginBottom: '8px', letterSpacing: '-0.5px' }}>
          Team
        </h1>
        <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>
          Manage and view your team members
        </p>
      </div>

      {/* Team Stats Cards */}
      {isManager && teamStats && (
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '10px',
                  background: '#dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={24} color="#3b82f6" />
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: '600', color: '#111827' }}>
                  {teamStats.totalTeamMembers}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>Team Members</div>
              </div>
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '10px',
                  background: '#dcfce7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Target size={24} color="#10b981" />
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: '600', color: '#111827' }}>
                  {teamStats.activeGoals}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>Active Goals</div>
              </div>
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '10px',
                  background: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ClipboardList size={24} color="#f59e0b" />
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: '600', color: '#111827' }}>
                  {teamStats.completedReviews}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>Completed Reviews</div>
              </div>
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '10px',
                  background: '#e0e7ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Calendar size={24} color="#6366f1" />
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: '600', color: '#111827' }}>
                  {teamStats.upcomingOneOnOnes}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>Upcoming 1:1s</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div style={{ marginBottom: '24px', maxWidth: '400px', position: 'relative' }}>
        <Search
          size={18}
          color="#6b7280"
          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
        />
        <input
          type="text"
          placeholder="Search team members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px 10px 40px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#3b82f6';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#e5e7eb';
          }}
        />
      </div>

      {employeesError && (
        <div style={{ padding: '12px', background: '#fee', color: '#c00', borderRadius: '4px', marginBottom: '20px' }}>
          {employeesError}
        </div>
      )}

      {/* Team Members Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', marginBottom: '32px' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
            Team Members ({filteredEmployees.length})
          </h2>
        </div>
        <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Name
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Title
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Department
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Manager
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Email
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Role
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                  {searchQuery ? 'No team members found matching your search' : 'No team members found'}
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee) => (
                <tr
                  key={employee.id}
                  onClick={() => setSelectedEmployee(employee)}
                  style={{
                    borderBottom: '1px solid #e5e7eb',
                    transition: 'background 0.15s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td data-label="Name" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Avatar user={employee} size="md" />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                          {employee.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Title" style={{ padding: '16px', fontSize: '14px', color: '#374151' }}>
                    {employee.title || '—'}
                  </td>
                  <td data-label="Department" style={{ padding: '16px', fontSize: '14px', color: '#374151' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {(employee as any).department && (
                        <>
                          <Building size={14} color="#6b7280" />
                          {(employee as any).department.name}
                        </>
                      )}
                      {!(employee as any).department && '—'}
                    </div>
                  </td>
                  <td data-label="Manager" style={{ padding: '16px', fontSize: '14px', color: '#374151' }}>
                    {(employee as any).manager?.name || '—'}
                  </td>
                  <td data-label="Email" style={{ padding: '16px', fontSize: '14px', color: '#374151' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={14} color="#6b7280" />
                      {employee.email}
                    </div>
                  </td>
                  <td data-label="Role" style={{ padding: '16px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: employee.role === 'SUPER_ADMIN' || employee.role === 'HR_ADMIN' ? '#fef3c7' : employee.role === 'MANAGER' ? '#dbeafe' : '#f3f4f6',
                        color: employee.role === 'SUPER_ADMIN' || employee.role === 'HR_ADMIN' ? '#92400e' : employee.role === 'MANAGER' ? '#1e40af' : '#374151',
                      }}
                    >
                      {employee.role.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Team Activity Feed */}
      {isManager && teamActivity.length > 0 && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px', margin: '0 0 16px 0' }}>
            Recent Team Activity
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {teamActivity.map((activity: any) => (
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

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
}
