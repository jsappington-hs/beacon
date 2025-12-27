import { useState, useEffect } from 'react';
import { X, CheckSquare, Square } from 'lucide-react';
import { users, reviews } from '../lib/api';
import type { User, ReviewCycle } from '../types';

interface AssignReviewsModalProps {
  cycle: ReviewCycle;
  onClose: () => void;
  onAssigned: () => void;
}

export default function AssignReviewsModal({ cycle, onClose, onAssigned }: AssignReviewsModalProps) {
  const [employees, setEmployees] = useState<User[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setIsLoading(true);
      const data = await users.getAll();
      // Only show employees who have managers
      const employeesWithManagers = data.filter(emp => emp.managerId);
      setEmployees(employeesWithManagers);
      // Select all by default
      setSelectedEmployeeIds(new Set(employeesWithManagers.map(emp => emp.id)));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load employees');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEmployee = (employeeId: string) => {
    const newSelected = new Set(selectedEmployeeIds);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
    } else {
      newSelected.add(employeeId);
    }
    setSelectedEmployeeIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedEmployeeIds.size === employees.length) {
      setSelectedEmployeeIds(new Set());
    } else {
      setSelectedEmployeeIds(new Set(employees.map(emp => emp.id)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedEmployeeIds.size === 0) {
      setError('Please select at least one employee');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      await reviews.bulkAssign(cycle.id, Array.from(selectedEmployeeIds));
      onAssigned();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign reviews');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
      >
        <div style={{ background: '#ffffff', padding: '40px', borderRadius: '12px' }}>
          <p style={{ margin: 0, color: '#374151' }}>Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          maxWidth: '700px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#111827', margin: '0 0 4px 0' }}>
              Assign Reviews
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
              {cycle.name}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X size={20} color="#6b7280" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {error && (
            <div style={{ margin: '24px 24px 0 24px', padding: '12px', background: '#fee', color: '#c00', borderRadius: '8px', fontSize: '14px' }}>
              {error}
            </div>
          )}

          {/* Selection Info */}
          <div className="modal-selection-info" style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontSize: '14px', color: '#374151' }}>
                <strong>{selectedEmployeeIds.size}</strong> of <strong>{employees.length}</strong> employees selected
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                Reviews will be assigned with each employee's manager as the reviewer
              </p>
            </div>
            <button
              type="button"
              onClick={toggleAll}
              style={{
                padding: '8px 16px',
                background: '#ffffff',
                color: '#374151',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
              }}
            >
              {selectedEmployeeIds.size === employees.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* Employee List */}
          <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
            {employees.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#6b7280',
                }}
              >
                <p style={{ margin: 0, fontSize: '14px' }}>
                  No employees with managers found. Employees need a manager assigned to receive reviews.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {employees.map((employee) => {
                  const manager = employees.find(e => e.id === employee.managerId);
                  const isSelected = selectedEmployeeIds.has(employee.id);

                  return (
                    <div
                      key={employee.id}
                      onClick={() => toggleEmployee(employee.id)}
                      style={{
                        padding: '16px',
                        border: `2px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: isSelected ? '#eff6ff' : '#ffffff',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#d1d5db';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }
                      }}
                    >
                      {isSelected ? (
                        <CheckSquare size={20} color="#3b82f6" style={{ flexShrink: 0 }} />
                      ) : (
                        <Square size={20} color="#9ca3af" style={{ flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827', marginBottom: '2px' }}>
                          {employee.name}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                          {employee.title || 'No title'} • Manager: {manager?.name || 'Unknown'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="modal-actions" style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: '#ffffff',
                color: '#374151',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedEmployeeIds.size === 0}
              style={{
                padding: '10px 20px',
                background: isSubmitting || selectedEmployeeIds.size === 0 ? '#9ca3af' : '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: isSubmitting || selectedEmployeeIds.size === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting && selectedEmployeeIds.size > 0) e.currentTarget.style.background = '#2563eb';
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting && selectedEmployeeIds.size > 0) e.currentTarget.style.background = '#3b82f6';
              }}
            >
              {isSubmitting ? 'Assigning...' : `Assign ${selectedEmployeeIds.size} Review${selectedEmployeeIds.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
