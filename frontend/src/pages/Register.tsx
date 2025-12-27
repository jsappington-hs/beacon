import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { onboarding } from '../lib/api';

export default function Register() {
  const [step, setStep] = useState(1);
  const [organizationName, setOrganizationName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const passwordRequirements = [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'Lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { label: 'Number', test: (p: string) => /\d/.test(p) },
    { label: 'Special character', test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
  ];

  const allPasswordRequirementsMet = passwordRequirements.every(req => req.test(adminPassword));
  const passwordsMatch = adminPassword === confirmPassword && confirmPassword !== '';

  const handleStep1Submit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!organizationName.trim()) {
      setError('Organization name is required');
      return;
    }

    setStep(2);
  };

  const handleStep2Submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!adminName.trim() || !adminEmail.trim() || !adminPassword) {
      setError('All fields are required');
      return;
    }

    if (!allPasswordRequirementsMet) {
      setError('Password does not meet all requirements');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await onboarding.register({
        organizationName: organizationName.trim(),
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim().toLowerCase(),
        adminPassword,
      });

      // Store the token and redirect to dashboard
      localStorage.setItem('auth_token', response.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600' as const,
    color: '#374151',
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
    }}>
      {/* Back Link */}
      <Link
        to="/"
        style={{
          position: 'absolute',
          top: '40px',
          left: '40px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'white',
          textDecoration: 'none',
          fontSize: '16px',
          fontWeight: '500',
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
      >
        <ArrowLeft size={20} />
        Back to Home
      </Link>

      {/* Registration Card */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        padding: '48px',
        width: '100%',
        maxWidth: '480px',
      }}>
        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '800',
            color: 'white',
            fontSize: '28px',
            margin: '0 auto 16px auto',
          }}>
            B
          </div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#1a202c',
            margin: '0 0 8px 0',
          }}>
            Create Your Account
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#6b7280',
            margin: 0,
          }}>
            {step === 1 ? 'Set up your organization' : 'Create your admin account'}
          </p>
        </div>

        {/* Progress Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '32px',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '600',
            fontSize: '14px',
          }}>
            {step > 1 ? <Check size={16} /> : '1'}
          </div>
          <div style={{
            width: '60px',
            height: '3px',
            background: step === 2 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e5e7eb',
            borderRadius: '2px',
          }} />
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: step === 2 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e5e7eb',
            color: step === 2 ? 'white' : '#9ca3af',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '600',
            fontSize: '14px',
          }}>
            2
          </div>
        </div>

        {/* Step 1: Organization */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit}>
            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="organizationName" style={labelStyle}>
                Organization Name
              </label>
              <input
                id="organizationName"
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="e.g., Acme Corporation"
                required
                style={inputStyle}
                onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
              />
              <p style={{
                fontSize: '13px',
                color: '#6b7280',
                marginTop: '8px',
                margin: '8px 0 0 0',
              }}>
                This is the name of your company or team
              </p>
            </div>

            {error && (
              <div style={{
                color: '#991b1b',
                marginBottom: '20px',
                padding: '12px 16px',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                fontSize: '14px',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                fontWeight: '600',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
              }}
            >
              Continue
            </button>
          </form>
        )}

        {/* Step 2: Admin Account */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit}>
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="adminName" style={labelStyle}>
                Your Name
              </label>
              <input
                id="adminName"
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="John Smith"
                required
                style={inputStyle}
                onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="adminEmail" style={labelStyle}>
                Email Address
              </label>
              <input
                id="adminEmail"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="john@company.com"
                required
                style={inputStyle}
                onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="adminPassword" style={labelStyle}>
                Password
              </label>
              <input
                id="adminPassword"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                style={inputStyle}
                onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
              />
              {/* Password Requirements */}
              <div style={{ marginTop: '12px' }}>
                {passwordRequirements.map((req, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      color: req.test(adminPassword) ? '#059669' : '#6b7280',
                      marginBottom: '4px',
                    }}
                  >
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: req.test(adminPassword) ? '#059669' : '#e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {req.test(adminPassword) && <Check size={10} color="white" />}
                    </div>
                    {req.label}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="confirmPassword" style={labelStyle}>
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{
                  ...inputStyle,
                  borderColor: confirmPassword && !passwordsMatch ? '#dc2626' : '#e5e7eb',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                onBlur={(e) => e.currentTarget.style.borderColor = confirmPassword && !passwordsMatch ? '#dc2626' : '#e5e7eb'}
              />
              {confirmPassword && !passwordsMatch && (
                <p style={{
                  fontSize: '13px',
                  color: '#dc2626',
                  marginTop: '8px',
                  margin: '8px 0 0 0',
                }}>
                  Passwords do not match
                </p>
              )}
            </div>

            {error && (
              <div style={{
                color: '#991b1b',
                marginBottom: '20px',
                padding: '12px 16px',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                fontSize: '14px',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  flex: '0 0 auto',
                  padding: '14px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  background: 'white',
                  color: '#667eea',
                  border: '2px solid #667eea',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f5f3ff'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading || !allPasswordRequirementsMet || !passwordsMatch}
                style={{
                  flex: 1,
                  padding: '14px',
                  fontSize: '16px',
                  fontWeight: '600',
                  background: isLoading || !allPasswordRequirementsMet || !passwordsMatch
                    ? '#9ca3af'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isLoading || !allPasswordRequirementsMet || !passwordsMatch ? 'not-allowed' : 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                }}
                onMouseEnter={(e) => {
                  if (!isLoading && allPasswordRequirementsMet && passwordsMatch) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading && allPasswordRequirementsMet && passwordsMatch) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                  }
                }}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </form>
        )}

        {/* Sign In Link */}
        <p style={{
          textAlign: 'center',
          marginTop: '24px',
          fontSize: '14px',
          color: '#6b7280',
        }}>
          Already have an account?{' '}
          <Link
            to="/login"
            style={{
              color: '#667eea',
              textDecoration: 'none',
              fontWeight: '600',
            }}
            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
