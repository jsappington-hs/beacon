import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { platformAdmin } from '../lib/api';
import { supabase } from '../lib/supabase';
import {
  Building2,
  Users,
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Power,
  PowerOff,
  BarChart3,
  MoreVertical,
  Edit3,
  AlertTriangle,
} from 'lucide-react';

type Tab = 'organizations' | 'metrics';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  isActive: boolean;
  createdAt: string;
  userCount: number;
}

interface OrgDetails {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  stats: {
    users: number;
    departments: number;
    reviewCycles: number;
    goals: number;
  };
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    title: string | null;
    isActive: boolean;
    lastLoginAt: string | null;
    createdAt: string;
  }>;
}

export default function PlatformAdmin() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('organizations');
  const [isPlatformAdmin, setIsPlatformAdmin] = useState<boolean | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Metrics state
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

  // Organizations state
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);

  // Organization detail modal
  const [selectedOrg, setSelectedOrg] = useState<OrgDetails | null>(null);
  const [isLoadingOrgDetails, setIsLoadingOrgDetails] = useState(false);

  // Dropdown menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Edit modal state
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [editForm, setEditForm] = useState({ name: '', slug: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  // Deactivate confirmation state
  const [confirmDeactivate, setConfirmDeactivate] = useState<Organization | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  // Check platform admin access
  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setIsPlatformAdmin(false);
        setCheckingAccess(false);
        return;
      }
      const { data, error } = await supabase
        .from('platform_admins')
        .select('id')
        .eq('user_id', user.id)
        .single();
      setIsPlatformAdmin(!error && !!data);
      setCheckingAccess(false);
    };
    checkAccess();
  }, [user]);

  useEffect(() => {
    if (isPlatformAdmin) {
      loadMetrics();
      loadOrganizations();
    }
  }, [isPlatformAdmin]);

  useEffect(() => {
    loadOrganizations();
  }, [pagination.page, searchQuery, statusFilter]);

  const loadMetrics = async () => {
    try {
      setIsLoadingMetrics(true);
      const data = await platformAdmin.getMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      setIsLoadingOrgs(true);
      const data = await platformAdmin.getOrganizations({
        search: searchQuery || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        page: pagination.page,
        limit: pagination.limit,
      });
      setOrganizations(data.organizations);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  const openOrgDetails = async (orgId: string) => {
    try {
      setIsLoadingOrgDetails(true);
      const [orgData, usersData] = await Promise.all([
        platformAdmin.getOrganization(orgId),
        platformAdmin.getOrganizationUsers(orgId, { limit: 50 }),
      ]);
      setSelectedOrg({
        ...orgData,
        users: usersData.users,
      });
    } catch (error) {
      console.error('Failed to load org details:', error);
    } finally {
      setIsLoadingOrgDetails(false);
    }
  };

  const toggleOrgStatus = async (orgId: string, currentStatus: boolean) => {
    try {
      await platformAdmin.updateOrganizationStatus(orgId, !currentStatus);
      // Refresh the list
      loadOrganizations();
      // Update modal if open
      if (selectedOrg?.id === orgId) {
        setSelectedOrg({ ...selectedOrg, isActive: !currentStatus });
      }
      setConfirmDeactivate(null);
    } catch (error) {
      console.error('Failed to update org status:', error);
    }
  };

  const openEditModal = (org: Organization) => {
    setEditingOrg(org);
    setEditForm({ name: org.name, slug: org.slug });
    setOpenMenuId(null);
  };

  const handleUpdateOrg = async () => {
    if (!editingOrg) return;
    setIsUpdating(true);
    try {
      await platformAdmin.updateOrganization(editingOrg.id, editForm);
      loadOrganizations();
      setEditingOrg(null);
    } catch (error) {
      console.error('Failed to update organization:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeactivateClick = (org: Organization) => {
    setConfirmDeactivate(org);
    setOpenMenuId(null);
  };

  // Loading state
  if (checkingAccess) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <p style={{ color: '#6b7280' }}>Checking access...</p>
      </div>
    );
  }

  // Access denied
  if (!isPlatformAdmin) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <h1 style={{ color: '#dc2626', marginBottom: '16px' }}>Access Denied</h1>
        <p style={{ color: '#6b7280' }}>You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '48px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '600', color: '#111827', marginBottom: '8px', letterSpacing: '-0.5px' }}>
          Platform Admin
        </h1>
        <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>
          Manage all organizations and view platform metrics
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', borderBottom: '2px solid #e5e7eb' }}>
        <button
          onClick={() => setActiveTab('organizations')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'organizations' ? '2px solid #3b82f6' : '2px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'organizations' ? '600' : '500',
            color: activeTab === 'organizations' ? '#3b82f6' : '#6b7280',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Building2 size={18} />
          Organizations
        </button>
        <button
          onClick={() => setActiveTab('metrics')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'metrics' ? '2px solid #3b82f6' : '2px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'metrics' ? '600' : '500',
            color: activeTab === 'metrics' ? '#3b82f6' : '#6b7280',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <BarChart3 size={18} />
          Metrics
        </button>
      </div>

      {/* Organizations Tab */}
      {activeTab === 'organizations' && (
        <div>
          {/* Search & Filters */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '250px', maxWidth: '400px' }}>
              <Search
                size={18}
                color="#6b7280"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPagination(p => ({ ...p, page: 1 }));
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {(['all', 'active', 'inactive'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setStatusFilter(status);
                    setPagination(p => ({ ...p, page: 1 }));
                  }}
                  style={{
                    padding: '8px 16px',
                    background: statusFilter === status ? '#3b82f6' : '#ffffff',
                    color: statusFilter === status ? '#ffffff' : '#374151',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    textTransform: 'capitalize',
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Organizations Table */}
          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                    Organization
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                    Slug
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                    Users
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                    Status
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                    Created
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoadingOrgs ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                      Loading...
                    </td>
                  </tr>
                ) : organizations.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                      No organizations found
                    </td>
                  </tr>
                ) : (
                  organizations.map((org) => (
                    <tr
                      key={org.id}
                      style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }}
                      onClick={() => openOrgDetails(org.id)}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                        {org.name}
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                        {org.slug}
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#374151' }}>
                        {org.userCount}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '500',
                            background: org.isActive ? '#d1fae5' : '#fee2e2',
                            color: org.isActive ? '#065f46' : '#991b1b',
                          }}
                        >
                          {org.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                        {new Date(org.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', position: 'relative' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === org.id ? null : org.id);
                          }}
                          style={{
                            padding: '8px',
                            background: openMenuId === org.id ? '#f3f4f6' : 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: '#6b7280',
                          }}
                        >
                          <MoreVertical size={18} />
                        </button>
                        {openMenuId === org.id && (
                          <div
                            style={{
                              position: 'absolute',
                              right: '16px',
                              top: '100%',
                              background: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              zIndex: 100,
                              minWidth: '160px',
                              overflow: 'hidden',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => openEditModal(org)}
                              style={{
                                width: '100%',
                                padding: '10px 14px',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '14px',
                                color: '#374151',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                textAlign: 'left',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <Edit3 size={16} />
                              Edit Details
                            </button>
                            <div style={{ height: '1px', background: '#e5e7eb' }} />
                            <button
                              onClick={() => handleDeactivateClick(org)}
                              style={{
                                width: '100%',
                                padding: '10px 14px',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '14px',
                                color: org.isActive ? '#dc2626' : '#059669',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                textAlign: 'left',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = org.isActive ? '#fef2f2' : '#f0fdf4'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              {org.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                              {org.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                  Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                    disabled={pagination.page <= 1}
                    style={{
                      padding: '8px 12px',
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                      opacity: pagination.page <= 1 ? 0.5 : 1,
                    }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                    disabled={pagination.page >= pagination.totalPages}
                    style={{
                      padding: '8px 12px',
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer',
                      opacity: pagination.page >= pagination.totalPages ? 0.5 : 1,
                    }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metrics Tab */}
      {activeTab === 'metrics' && (
        <div>
          {isLoadingMetrics ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>Loading metrics...</div>
          ) : metrics ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
              <MetricCard
                title="Total Organizations"
                value={metrics.totalOrganizations}
                icon={<Building2 size={24} color="#3b82f6" />}
                bgColor="#dbeafe"
              />
              <MetricCard
                title="Active Organizations"
                value={metrics.activeOrganizations}
                icon={<Power size={24} color="#059669" />}
                bgColor="#d1fae5"
              />
              <MetricCard
                title="Total Users"
                value={metrics.totalUsers}
                icon={<Users size={24} color="#8b5cf6" />}
                bgColor="#ede9fe"
              />
              <MetricCard
                title="Active Users (30d)"
                value={metrics.activeUsers}
                icon={<TrendingUp size={24} color="#f59e0b" />}
                bgColor="#fef3c7"
              />
              <MetricCard
                title="New Orgs This Month"
                value={metrics.newOrgsThisMonth}
                icon={<Building2 size={24} color="#10b981" />}
                bgColor="#d1fae5"
              />
              <MetricCard
                title="New Users This Month"
                value={metrics.newUsersThisMonth}
                icon={<Users size={24} color="#6366f1" />}
                bgColor="#e0e7ff"
              />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>Failed to load metrics</div>
          )}
        </div>
      )}

      {/* Organization Detail Modal */}
      {selectedOrg && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setSelectedOrg(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>
                  {selectedOrg.name}
                </h2>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
                  {selectedOrg.slug}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrg(null)}
                style={{
                  padding: '8px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '6px',
                }}
              >
                <X size={20} color="#6b7280" />
              </button>
            </div>

            {isLoadingOrgDetails ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>Loading...</div>
            ) : (
              <>
                {/* Stats Grid */}
                <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  <div style={{ textAlign: 'center', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: '600', color: '#111827' }}>{selectedOrg.stats.users}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Users</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: '600', color: '#111827' }}>{selectedOrg.stats.departments}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Departments</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: '600', color: '#111827' }}>{selectedOrg.stats.reviewCycles}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Review Cycles</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: '600', color: '#111827' }}>{selectedOrg.stats.goals}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Goals</div>
                  </div>
                </div>

                {/* Users List */}
                <div style={{ padding: '0 24px 24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
                    Users ({selectedOrg.users.length})
                  </h3>
                  <div style={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Name</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Email</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Role</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Last Login</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrg.users.map((user) => (
                          <tr key={user.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '10px 12px', fontSize: '13px', color: '#111827' }}>{user.name}</td>
                            <td style={{ padding: '10px 12px', fontSize: '13px', color: '#6b7280' }}>{user.email}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: '500',
                                  background: user.role === 'SUPER_ADMIN' || user.role === 'HR_ADMIN' ? '#fef3c7' : user.role === 'MANAGER' ? '#dbeafe' : '#f3f4f6',
                                  color: user.role === 'SUPER_ADMIN' || user.role === 'HR_ADMIN' ? '#92400e' : user.role === 'MANAGER' ? '#1e40af' : '#374151',
                                }}
                              >
                                {user.role.replace('_', ' ')}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', fontSize: '13px', color: '#6b7280' }}>
                              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    onClick={() => toggleOrgStatus(selectedOrg.id, selectedOrg.isActive)}
                    style={{
                      padding: '10px 20px',
                      background: selectedOrg.isActive ? '#fee2e2' : '#d1fae5',
                      color: selectedOrg.isActive ? '#dc2626' : '#059669',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {selectedOrg.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                    {selectedOrg.isActive ? 'Deactivate Organization' : 'Activate Organization'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Organization Modal */}
      {editingOrg && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setEditingOrg(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              maxWidth: '450px',
              width: '100%',
              padding: '24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
                Edit Organization
              </h2>
              <button
                onClick={() => setEditingOrg(null)}
                style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '6px' }}
              >
                <X size={20} color="#6b7280" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                  Organization Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                  Slug (URL identifier)
                </label>
                <input
                  type="text"
                  value={editForm.slug}
                  onChange={(e) => setEditForm({ ...editForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Only lowercase letters, numbers, and hyphens allowed
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                onClick={() => setEditingOrg(null)}
                style={{
                  padding: '10px 20px',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  color: '#374151',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateOrg}
                disabled={isUpdating}
                style={{
                  padding: '10px 20px',
                  background: isUpdating ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                }}
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal */}
      {confirmDeactivate && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setConfirmDeactivate(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              maxWidth: '400px',
              width: '100%',
              padding: '24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: confirmDeactivate.isActive ? '#fef2f2' : '#f0fdf4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <AlertTriangle size={20} color={confirmDeactivate.isActive ? '#dc2626' : '#059669'} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
                {confirmDeactivate.isActive ? 'Deactivate' : 'Activate'} Organization?
              </h2>
            </div>

            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
              {confirmDeactivate.isActive
                ? `Are you sure you want to deactivate "${confirmDeactivate.name}"? Users in this organization will no longer be able to access the platform.`
                : `Are you sure you want to activate "${confirmDeactivate.name}"? Users will regain access to the platform.`}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDeactivate(null)}
                style={{
                  padding: '10px 20px',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  color: '#374151',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => toggleOrgStatus(confirmDeactivate.id, confirmDeactivate.isActive)}
                style={{
                  padding: '10px 20px',
                  background: confirmDeactivate.isActive ? '#dc2626' : '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                {confirmDeactivate.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  bgColor,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  bgColor: string;
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            background: bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
        <div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#111827' }}>
            {value.toLocaleString()}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>{title}</div>
        </div>
      </div>
    </div>
  );
}
