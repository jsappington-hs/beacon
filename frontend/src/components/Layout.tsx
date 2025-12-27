import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Home, Target, ClipboardList, Users, TrendingUp, LogOut, Menu, X, Building2, UsersRound, Settings } from 'lucide-react';
import Avatar from './Avatar';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/reviews', label: 'Reviews', icon: ClipboardList },
    { path: '/one-on-ones', label: 'One-on-Ones', icon: Users },
    { path: '/goals', label: 'Goals', icon: Target, comingSoon: true },
    { path: '/development', label: 'Development', icon: TrendingUp, comingSoon: true },
    { path: '/employees', label: 'Org Chart', icon: UsersRound },
  ];

  const isManager = user?.role === 'MANAGER' || user?.role === 'HR_ADMIN' || user?.role === 'SUPER_ADMIN';
  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SUPER_ADMIN';

  const managementItems = [];
  if (isManager) {
    managementItems.push({ path: '/team', label: 'Team', icon: Building2 });
  }
  if (isAdmin) {
    managementItems.push({ path: '/review-management', label: 'Review Management', icon: ClipboardList });
    managementItems.push({ path: '/admin', label: 'Admin', icon: Settings });
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f3f4f6' }}>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        style={{
          position: 'fixed',
          top: '16px',
          left: '16px',
          zIndex: 1001,
          padding: '8px',
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'none',
        }}
        className="mobile-menu-button"
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
            display: 'none',
          }}
          className="mobile-overlay"
        />
      )}

      {/* Left Sidebar */}
      <aside
        style={{
          width: '240px',
          background: '#ffffff',
          borderRight: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          height: '100vh',
          left: 0,
          top: 0,
          zIndex: 1000,
          transition: 'transform 0.3s ease',
        }}
        className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}
      >
        {/* Logo */}
        <div
          style={{
            padding: '24px 20px',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <div
            onClick={() => navigate('/')}
            style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#000000',
              cursor: 'pointer',
              letterSpacing: '-0.5px',
            }}
          >
            Beacon
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setIsMobileMenuOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  marginBottom: '4px',
                  border: 'none',
                  background: active ? '#3b82f6' : 'transparent',
                  color: active ? '#ffffff' : '#6b7280',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: active ? '500' : '400',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.15s',
                  textAlign: 'left',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.color = '#111827';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#6b7280';
                  }
                }}
              >
                <Icon size={18} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {(item as any).comingSoon && (
                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: active ? 'rgba(254, 243, 199, 0.2)' : '#fef3c7',
                      color: active ? '#fef3c7' : '#92400e',
                      fontSize: '9px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Soon
                  </span>
                )}
              </button>
            );
          })}

          {/* Management Section */}
          {managementItems.length > 0 && (
            <>
              <div
                style={{
                  padding: '16px 8px 8px 8px',
                  marginTop: '8px',
                  borderTop: '1px solid #e5e7eb',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#9ca3af',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Management
                </div>
              </div>
              {managementItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);

                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setIsMobileMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      marginBottom: '4px',
                      border: 'none',
                      background: active ? '#10b981' : 'transparent',
                      color: active ? '#ffffff' : '#6b7280',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: active ? '500' : '400',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.15s',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = '#f3f4f6';
                        e.currentTarget.style.color = '#111827';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#6b7280';
                      }
                    }}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </>
          )}
        </nav>

        {/* User Info & Logout */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <button
            onClick={() => {
              navigate('/settings');
              setIsMobileMenuOpen(false);
            }}
            style={{
              width: '100%',
              padding: '12px',
              background: '#f9fafb',
              border: 'none',
              borderRadius: '8px',
              marginBottom: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f9fafb';
            }}
          >
            <Avatar
              user={{ name: user?.name || '', profilePicture: user?.profilePicture }}
              size="sm"
            />
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827', marginBottom: '2px' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                {user?.role.replace('_', ' ')}
              </div>
            </div>
            <Settings size={16} style={{ color: '#9ca3af' }} />
          </button>
          <button
            onClick={logout}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: 'transparent',
              color: '#6b7280',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '400',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fef2f2';
              e.currentTarget.style.borderColor = '#ef4444';
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        style={{
          marginLeft: '240px',
          flex: 1,
          minHeight: '100vh',
          background: '#f3f4f6',
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
