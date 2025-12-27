import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { oneOnOnes, googleCalendar, users } from '../lib/api';
import type { OneOnOne, User } from '../types';
import { Calendar, FileText, Link as LinkIcon, Plus } from 'lucide-react';

export default function OneOnOnes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'all'>('upcoming');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [employees, setEmployees] = useState<User[]>([]);
  const [selectedEventEmployees, setSelectedEventEmployees] = useState<{ [eventId: string]: string }>({});
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    employeeId: '',
    date: '',
    time: '',
    agenda: '',
  });

  useEffect(() => {
    loadMeetings();
    checkCalendarConnection();
    checkOAuthCallback();
  }, []);

  const loadMeetings = async () => {
    try {
      setIsLoading(true);
      const [allMeetings, upcoming] = await Promise.all([
        oneOnOnes.getMyMeetings(),
        oneOnOnes.getUpcoming(),
      ]);
      setMeetings(allMeetings);
      setUpcomingMeetings(upcoming);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load meetings');
    } finally {
      setIsLoading(false);
    }
  };

  const checkCalendarConnection = async () => {
    try {
      const status = await googleCalendar.getConnectionStatus();
      setCalendarConnected(status.connected);
    } catch (err) {
      console.error('Failed to check calendar status:', err);
    }
  };

  const checkOAuthCallback = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      setShowSuccessMessage(true);
      setCalendarConnected(true);
      // Clean up URL
      window.history.replaceState({}, '', '/one-on-ones');
      setTimeout(() => setShowSuccessMessage(false), 5000);
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const { authUrl } = await googleCalendar.connect();
      window.location.href = authUrl;
    } catch (err) {
      console.error('Failed to connect calendar:', err);
      setError('Failed to connect Google Calendar');
    }
  };

  const loadEmployees = async () => {
    if (!user?.id) return;
    try {
      // Admins can see all employees, managers only their direct reports
      if (user.role === 'HR_ADMIN' || user.role === 'SUPER_ADMIN') {
        const allUsers = await users.getAll();
        setEmployees(allUsers.filter(u => u.id !== user.id));
      } else {
        const reports = await users.getDirectReports(user.id);
        setEmployees(reports);
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };

  const handleOpenImportModal = async () => {
    setShowImportModal(true);
    setLoadingEvents(true);
    loadEmployees();

    try {
      const { events } = await googleCalendar.getEvents(100);

      // Filter to only show events with attendees (potential 1:1s)
      const filteredEvents = events.filter((event: any) =>
        event.attendees && event.attendees.length > 0 && event.start
      );

      setCalendarEvents(filteredEvents);
    } catch (err) {
      console.error('Failed to load calendar events:', err);
      setError('Failed to load calendar events');
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleLinkCalendarEvent = async (event: any) => {
    const employeeId = selectedEventEmployees[event.id];

    if (!employeeId) {
      setError('Please select an employee for this meeting');
      return;
    }

    try {
      await oneOnOnes.linkCalendarEvent({
        googleEventId: event.id,
        googleEventUrl: event.htmlLink,
        employeeId,
        scheduledAt: event.start.dateTime || event.start.date,
        title: event.summary,
      });

      // Remove from list
      setCalendarEvents(calendarEvents.filter(e => e.id !== event.id));
      loadMeetings();
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to link calendar event');
    }
  };

  const handleScheduleMeeting = async () => {
    const { employeeId, date, time, agenda } = scheduleForm;

    // Validate form
    if (!employeeId || !date || !time) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      // Combine date and time into ISO string
      const scheduledAt = new Date(`${date}T${time}`).toISOString();

      await oneOnOnes.create({
        employeeId,
        scheduledAt,
        agenda: agenda || undefined,
        syncToCalendar: false, // Manual creation, no calendar sync
      });

      // Success - close modal and reload
      setShowScheduleModal(false);
      setScheduleForm({ employeeId: '', date: '', time: '', agenda: '' });
      loadMeetings();
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create meeting');
    }
  };

  const isManager = (meeting: any) => {
    return meeting.manager.id === user?.id;
  };

  const getOtherPerson = (meeting: any) => {
    return isManager(meeting) ? meeting.employee : meeting.manager;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return '#3b82f6';
      case 'completed':
        return '#10b981';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const renderMeetingCard = (meeting: any) => {
    const otherPerson = getOtherPerson(meeting);
    const roleLabel = isManager(meeting) ? 'With Employee' : 'With Manager';
    const isUpcoming = new Date(meeting.scheduledAt) > new Date();

    return (
      <div
        key={meeting.id}
        className="one-on-one-card"
        onClick={() => navigate(`/one-on-ones/${meeting.id}`)}
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '16px',
          background: '#ffffff',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#3b82f6';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(59,130,246,0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#e5e7eb';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div className="one-on-one-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <h3 style={{ margin: 0 }}>
                {new Date(meeting.scheduledAt).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </h3>
              <span style={{ fontSize: '16px', color: '#666' }}>
                {new Date(meeting.scheduledAt).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <p style={{ margin: '0', color: '#666' }}>
              {roleLabel}: <strong>{otherPerson.name}</strong> ({otherPerson.title})
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {isUpcoming && (
              <span
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  background: '#e7f3ff',
                  color: '#004085',
                }}
              >
                Upcoming
              </span>
            )}
            <span
              style={{
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 'bold',
                background: getStatusColor(meeting.status),
                color: 'white',
              }}
            >
              {meeting.status.toUpperCase()}
            </span>
          </div>
        </div>

        {meeting.agenda && (
          <div style={{ marginTop: '12px', padding: '12px', background: '#f8f9fa', borderRadius: '4px' }}>
            <strong style={{ fontSize: '14px' }}>Agenda:</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#666' }}>{meeting.agenda}</p>
          </div>
        )}

        <div style={{ marginTop: '12px', fontSize: '14px', color: '#666', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {meeting.sharedNotes && <span>📝 Has shared notes</span>}
          {meeting.actionItems && <span>✅ Has action items</span>}
          {isManager(meeting) && meeting.managerNotes && <span>🔒 Has private notes</span>}
          {(meeting.transcript || meeting.transcriptFileUrl) && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FileText size={14} /> Transcript
            </span>
          )}
          {meeting.documentUrl && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <LinkIcon size={14} /> Document
            </span>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>One-on-One Meetings</h1>
        <p>Loading meetings...</p>
      </div>
    );
  }

  const displayMeetings = activeTab === 'upcoming' ? upcomingMeetings : meetings;

  return (
    <div style={{ padding: '48px' }}>
      <div className="page-header-with-action" style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>One-on-One Meetings</h1>
          <p style={{ fontSize: '16px', color: '#666', margin: 0 }}>Manage your 1:1 meetings and action items</p>
        </div>
        {(user?.role === 'MANAGER' || user?.role === 'HR_ADMIN' || user?.role === 'SUPER_ADMIN') && (
          <div className="one-on-one-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setShowScheduleModal(true);
                loadEmployees();
              }}
              style={{
                padding: '12px 24px',
                background: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2563eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#3b82f6';
              }}
            >
              <Calendar size={18} />
              Schedule Meeting
            </button>
            {calendarConnected && (
              <button
                onClick={handleOpenImportModal}
                style={{
                  padding: '12px 24px',
                  background: '#ffffff',
                  color: '#3b82f6',
                  border: '1px solid #3b82f6',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#eff6ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                }}
              >
                <Calendar size={18} />
                Import from Calendar
              </button>
            )}
          </div>
        )}
      </div>

      {showSuccessMessage && (
        <div style={{ padding: '12px', background: '#d4edda', color: '#155724', borderRadius: '8px', marginBottom: '20px', border: '1px solid #c3e6cb' }}>
          ✓ Google Calendar connected successfully!
        </div>
      )}

      {error && (
        <div style={{ padding: '12px', background: '#fee', color: '#c00', borderRadius: '4px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {!calendarConnected && (user?.role === 'MANAGER' || user?.role === 'HR_ADMIN' || user?.role === 'SUPER_ADMIN') && (
        <div
          className="calendar-connect-banner"
          style={{
            padding: '16px 20px',
            background: '#eff6ff',
            borderRadius: '8px',
            marginBottom: '24px',
            border: '1px solid #bfdbfe',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar size={20} color="#3b82f6" />
            <span style={{ fontSize: '14px', color: '#1e40af' }}>
              Connect Google Calendar to automatically sync your one-on-ones
            </span>
          </div>
          <button
            onClick={handleConnectCalendar}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#3b82f6';
            }}
          >
            Connect Calendar
          </button>
        </div>
      )}

      <div className="one-on-one-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
        <button
          onClick={() => setActiveTab('upcoming')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'upcoming' ? '2px solid #3b82f6' : '2px solid transparent',
            marginBottom: '-2px',
            fontWeight: activeTab === 'upcoming' ? '500' : '400',
            color: activeTab === 'upcoming' ? '#3b82f6' : '#6b7280',
          }}
        >
          Upcoming ({upcomingMeetings.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'all' ? '2px solid #3b82f6' : '2px solid transparent',
            marginBottom: '-2px',
            fontWeight: activeTab === 'all' ? '500' : '400',
            color: activeTab === 'all' ? '#3b82f6' : '#6b7280',
          }}
        >
          All Meetings ({meetings.length})
        </button>
      </div>

      {displayMeetings.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: '#f9fafb',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', color: '#111827', fontSize: '18px', fontWeight: '600' }}>No meetings found</h3>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>{activeTab === 'upcoming' ? 'No upcoming 1:1 meetings scheduled.' : 'No 1:1 meetings yet.'}</p>
        </div>
      ) : (
        <div style={{ maxWidth: '1400px' }}>{displayMeetings.map(renderMeetingCard)}</div>
      )}

      {/* Schedule Meeting Modal */}
      {showScheduleModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowScheduleModal(false)}
        >
          <div
            className="modal-content"
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '24px' }}>
              Schedule Meeting
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Employee Selection */}
              <div>
                <label
                  htmlFor="employee"
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                  }}
                >
                  Employee <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  id="employee"
                  value={scheduleForm.employeeId}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, employeeId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  <option value="">Select an employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} {emp.title && `- ${emp.title}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label
                  htmlFor="date"
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                  }}
                >
                  Date <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  id="date"
                  value={scheduleForm.date}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              {/* Time */}
              <div>
                <label
                  htmlFor="time"
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                  }}
                >
                  Time <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="time"
                  id="time"
                  value={scheduleForm.time}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              {/* Agenda (Optional) */}
              <div>
                <label
                  htmlFor="agenda"
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                  }}
                >
                  Agenda (Optional)
                </label>
                <textarea
                  id="agenda"
                  value={scheduleForm.agenda}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, agenda: e.target.value })}
                  placeholder="Add meeting agenda or topics to discuss..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div
              className="modal-actions"
              style={{
                marginTop: '24px',
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setScheduleForm({ employeeId: '', date: '', time: '', agenda: '' });
                }}
                style={{
                  padding: '10px 20px',
                  background: '#ffffff',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleMeeting}
                style={{
                  padding: '10px 20px',
                  background: '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#2563eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#3b82f6';
                }}
              >
                Schedule Meeting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import from Calendar Modal */}
      {showImportModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setShowImportModal(false)}
        >
          <div
            className="modal-content"
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600', color: '#111827' }}>
              Import from Calendar
            </h2>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#6b7280' }}>
              Select calendar events to convert into one-on-ones
            </p>

            {loadingEvents ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>Loading calendar events...</p>
              </div>
            ) : calendarEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', background: '#f9fafb', borderRadius: '8px' }}>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                  No upcoming calendar events found with attendees.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {calendarEvents.map((event) => (
                  <div
                    key={event.id}
                    style={{
                      padding: '16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      background: '#ffffff',
                    }}
                  >
                    <div style={{ marginBottom: '12px' }}>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                        {event.summary || 'Untitled Event'}
                      </h3>
                      <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                        {new Date(event.start.dateTime || event.start.date).toLocaleString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        {event.recurringEventId && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#f59e0b' }}>🔁 Recurring</span>}
                      </p>
                    </div>

                    <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#111827', minWidth: '100px' }}>
                        Employee:
                      </label>
                      <select
                        value={selectedEventEmployees[event.id] || ''}
                        onChange={(e) => setSelectedEventEmployees({ ...selectedEventEmployees, [event.id]: e.target.value })}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#3b82f6';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }}
                      >
                        <option value="">Select employee...</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} - {emp.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => handleLinkCalendarEvent(event)}
                      disabled={!selectedEventEmployees[event.id]}
                      style={{
                        padding: '8px 16px',
                        background: selectedEventEmployees[event.id] ? '#10b981' : '#9ca3af',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: selectedEventEmployees[event.id] ? 'pointer' : 'not-allowed',
                        fontSize: '14px',
                        fontWeight: '500',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedEventEmployees[event.id]) {
                          e.currentTarget.style.background = '#059669';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedEventEmployees[event.id]) {
                          e.currentTarget.style.background = '#10b981';
                        }
                      }}
                    >
                      Link as One-on-One
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
