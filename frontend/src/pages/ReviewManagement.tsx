import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { reviewCycles } from '../lib/api';
import type { ReviewCycle } from '../types';
import { Plus, Calendar, Users, CheckCircle } from 'lucide-react';
import CreateReviewCycleModal from '../components/CreateReviewCycleModal';
import AssignReviewsModal from '../components/AssignReviewsModal';

export default function ReviewManagement() {
  const { user } = useAuth();
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateCycleModal, setShowCreateCycleModal] = useState(false);
  const [showAssignReviewsModal, setShowAssignReviewsModal] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<ReviewCycle | null>(null);

  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    loadCycles();
  }, []);

  const loadCycles = async () => {
    try {
      setIsLoading(true);
      const data = await reviewCycles.getAll();
      setCycles(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load review cycles');
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      QUARTERLY: 'Quarterly',
      SEMI_ANNUAL: 'Semi-Annual',
      ANNUAL: 'Annual',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (cycle: ReviewCycle) => {
    const now = new Date();
    const start = new Date(cycle.startDate);
    const end = new Date(cycle.endDate);

    let status = '';
    let color = '';

    if (now < start) {
      status = 'Upcoming';
      color = '#6b7280';
    } else if (now >= start && now <= end) {
      status = 'Active';
      color = '#10b981';
    } else {
      status = 'Completed';
      color = '#3b82f6';
    }

    return (
      <span
        style={{
          padding: '4px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '500',
          background: `${color}20`,
          color,
        }}
      >
        {status}
      </span>
    );
  };

  const renderCycleCard = (cycle: ReviewCycle) => {
    return (
      <div
        key={cycle.id}
        className="review-cycle-card"
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '16px',
          background: '#ffffff',
          transition: 'all 0.2s',
        }}
      >
        <div className="review-cycle-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px', gap: '16px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="review-cycle-card-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                {cycle.name}
              </h3>
              {getStatusBadge(cycle)}
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500',
                  background: '#f3f4f6',
                  color: '#374151',
                }}
              >
                {getTypeLabel(cycle.type)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '24px', fontSize: '14px', color: '#6b7280' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={16} />
                {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
              </div>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={() => {
                setSelectedCycle(cycle);
                setShowAssignReviewsModal(true);
              }}
              className="assign-reviews-btn"
              style={{
                padding: '8px 16px',
                background: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2563eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#3b82f6';
              }}
            >
              <Users size={16} />
              Assign Reviews
            </button>
          )}
        </div>
      </div>
    );
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: '48px' }}>
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: '#f9fafb',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', color: '#111827', fontSize: '18px', fontWeight: '600' }}>
            Access Denied
          </h3>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
            Only HR Admins can access review management.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: '48px' }}>
        <h1>Review Management</h1>
        <p>Loading review cycles...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '48px' }}>
      <div className="page-header-with-action" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '600', color: '#111827', marginBottom: '8px', letterSpacing: '-0.5px' }}>
            Review Management
          </h1>
          <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>
            Create and manage performance review cycles
          </p>
        </div>

        <button
          onClick={() => setShowCreateCycleModal(true)}
          className="create-cycle-btn"
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
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#2563eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#3b82f6';
          }}
        >
          <Plus size={18} />
          Create Review Cycle
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px', background: '#fee', color: '#c00', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <div style={{ maxWidth: '1200px' }}>
        {cycles.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: '#f9fafb',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', color: '#111827', fontSize: '18px', fontWeight: '600' }}>
              No review cycles found
            </h3>
            <p style={{ margin: '0 0 16px 0', color: '#6b7280', fontSize: '14px' }}>
              Get started by creating your first review cycle
            </p>
            <button
              onClick={() => setShowCreateCycleModal(true)}
              style={{
                padding: '10px 20px',
                background: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2563eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#3b82f6';
              }}
            >
              Create Review Cycle
            </button>
          </div>
        ) : (
          cycles.map(renderCycleCard)
        )}
      </div>

      {/* Modals */}
      {showCreateCycleModal && (
        <CreateReviewCycleModal
          onClose={() => setShowCreateCycleModal(false)}
          onCreated={(cycle) => {
            setCycles([cycle, ...cycles]);
            setShowCreateCycleModal(false);
          }}
        />
      )}

      {showAssignReviewsModal && selectedCycle && (
        <AssignReviewsModal
          cycle={selectedCycle}
          onClose={() => {
            setShowAssignReviewsModal(false);
            setSelectedCycle(null);
          }}
          onAssigned={() => {
            setShowAssignReviewsModal(false);
            setSelectedCycle(null);
            loadCycles();
          }}
        />
      )}
    </div>
  );
}
