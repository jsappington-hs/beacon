import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { CreditCard, Check, ExternalLink, AlertCircle, Users, Minus, Plus } from 'lucide-react';

const MONTHLY_PRICE_ID = 'price_1SjRAACwCNHtAVIQ9mD1IPEC';
const YEARLY_PRICE_ID = 'price_1SjRAACwCNHtAVIQVacO8Dbm';
const PRICE_PER_SEAT_MONTHLY = 7;
const PRICE_PER_SEAT_YEARLY = 60;

const FEATURES = [
  'Performance reviews',
  'Goal tracking',
  '1:1 meetings',
  'Development plans',
  'Email support',
];

export default function AdminBillingTab() {
  const { organization } = useAuth();
  const [isYearly, setIsYearly] = useState(true);
  const [seatCount, setSeatCount] = useState(1);
  const [currentUserCount, setCurrentUserCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);

  useEffect(() => {
    if (organization) {
      loadSubscriptionDetails();
      loadUserCount();
    }
  }, [organization]);

  const loadSubscriptionDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('subscription_status, subscription_tier, stripe_customer_id, stripe_subscription_id')
        .eq('id', organization?.id)
        .single();

      if (error) throw error;
      setSubscriptionDetails(data);
    } catch (err) {
      console.error('Failed to load subscription:', err);
    }
  };

  const loadUserCount = async () => {
    try {
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization?.id);

      if (error) throw error;
      const userCount = count || 1;
      setCurrentUserCount(userCount);
      setSeatCount(Math.max(userCount, 1));
    } catch (err) {
      console.error('Failed to load user count:', err);
    }
  };

  const handleSubscribe = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    const priceId = isYearly ? YEARLY_PRICE_ID : MONTHLY_PRICE_ID;

    try {
      console.log('Calling create-checkout-session with:', { priceId, quantity: seatCount });
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId,
          quantity: seatCount,
          successUrl: `${window.location.origin}/admin?billing=success`,
          cancelUrl: `${window.location.origin}/admin?billing=canceled`,
        },
      });

      console.log('Response:', { data, error });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'Failed to start checkout');
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        body: {
          returnUrl: `${window.location.origin}/admin`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to open billing portal');
    } finally {
      setLoading(false);
    }
  };

  const currentTier = subscriptionDetails?.subscription_tier || 'free';
  const subscriptionStatus = subscriptionDetails?.subscription_status || 'inactive';
  const isSubscribed = ['active', 'trialing'].includes(subscriptionStatus);

  const pricePerSeat = isYearly ? PRICE_PER_SEAT_YEARLY : PRICE_PER_SEAT_MONTHLY;
  const totalPrice = pricePerSeat * seatCount;
  const monthlyEquivalent = isYearly ? (PRICE_PER_SEAT_YEARLY / 12) : PRICE_PER_SEAT_MONTHLY;
  const savings = isYearly ? (PRICE_PER_SEAT_MONTHLY * 12 - PRICE_PER_SEAT_YEARLY) * seatCount : 0;

  const getStatusBadge = () => {
    const styles: Record<string, { bg: string; color: string; text: string }> = {
      active: { bg: '#dcfce7', color: '#166534', text: 'Active' },
      trialing: { bg: '#dbeafe', color: '#1e40af', text: 'Trial' },
      past_due: { bg: '#fef3c7', color: '#92400e', text: 'Past Due' },
      canceled: { bg: '#fee2e2', color: '#991b1b', text: 'Canceled' },
      inactive: { bg: '#f3f4f6', color: '#6b7280', text: 'Free' },
    };

    const style = styles[subscriptionStatus] || styles.inactive;

    return (
      <span
        style={{
          padding: '4px 12px',
          borderRadius: '9999px',
          fontSize: '13px',
          fontWeight: '500',
          background: style.bg,
          color: style.color,
        }}
      >
        {style.text}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '600px' }}>
      {/* Current Plan Section */}
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '24px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <CreditCard size={20} style={{ color: '#3b82f6' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
            Current Plan
          </h3>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>
                {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
              </span>
              {getStatusBadge()}
            </div>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
              {currentTier === 'free'
                ? `You have ${currentUserCount} user${currentUserCount !== 1 ? 's' : ''} in your organization`
                : subscriptionStatus === 'active'
                ? 'Your subscription is active and will renew automatically'
                : subscriptionStatus === 'trialing'
                ? 'Your trial is active. Subscribe to continue after trial ends.'
                : 'Please update your payment method'}
            </p>
          </div>

          {subscriptionDetails?.stripe_customer_id && (
            <button
              onClick={handleManageBilling}
              disabled={loading}
              style={{
                padding: '10px 20px',
                background: 'white',
                color: '#374151',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <ExternalLink size={16} />
              {loading ? 'Loading...' : 'Manage Billing'}
            </button>
          )}
        </div>

        {subscriptionStatus === 'past_due' && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: '#fef3c7',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <AlertCircle size={20} style={{ color: '#92400e' }} />
            <span style={{ color: '#92400e', fontSize: '14px' }}>
              Your payment is past due. Please update your payment method to avoid service
              interruption.
            </span>
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            background: '#fee2e2',
            borderRadius: '8px',
            marginBottom: '24px',
            color: '#991b1b',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      {/* Pricing Section */}
      {!isSubscribed && (
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '24px',
          }}
        >
          {/* Billing Toggle */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '4px',
                background: '#f3f4f6',
                borderRadius: '8px',
              }}
            >
              <button
                onClick={() => setIsYearly(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  background: !isYearly ? 'white' : 'transparent',
                  color: !isYearly ? '#111827' : '#6b7280',
                  boxShadow: !isYearly ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsYearly(true)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  background: isYearly ? 'white' : 'transparent',
                  color: isYearly ? '#111827' : '#6b7280',
                  boxShadow: isYearly ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                Yearly
                <span
                  style={{
                    padding: '2px 6px',
                    background: '#dcfce7',
                    color: '#166534',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                  }}
                >
                  Save 29%
                </span>
              </button>
            </div>
          </div>

          {/* Price Display */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '48px', fontWeight: '700', color: '#111827' }}>
                ${monthlyEquivalent.toFixed(0)}
              </span>
              <span style={{ fontSize: '18px', color: '#6b7280' }}>/seat/month</span>
            </div>
            {isYearly && (
              <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                Billed annually at ${PRICE_PER_SEAT_YEARLY}/seat/year
              </p>
            )}
          </div>

          {/* Seat Selection */}
          <div
            style={{
              padding: '16px',
              background: '#f9fafb',
              borderRadius: '8px',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} style={{ color: '#6b7280' }} />
                <span style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                  Number of seats
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={() => setSeatCount(Math.max(currentUserCount, seatCount - 1))}
                  disabled={seatCount <= currentUserCount}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    background: 'white',
                    cursor: seatCount <= currentUserCount ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: seatCount <= currentUserCount ? 0.5 : 1,
                  }}
                >
                  <Minus size={16} />
                </button>
                <span style={{ fontSize: '18px', fontWeight: '600', color: '#111827', minWidth: '40px', textAlign: 'center' }}>
                  {seatCount}
                </span>
                <button
                  onClick={() => setSeatCount(seatCount + 1)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    background: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            {seatCount < currentUserCount && (
              <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '8px', marginBottom: 0 }}>
                Minimum {currentUserCount} seats required for your current users
              </p>
            )}
            {seatCount === currentUserCount && (
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', marginBottom: 0 }}>
                Based on your current {currentUserCount} user{currentUserCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Total */}
          <div
            style={{
              padding: '16px',
              background: '#f0fdf4',
              borderRadius: '8px',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#374151' }}>
                {seatCount} seat{seatCount !== 1 ? 's' : ''} × ${pricePerSeat}/{isYearly ? 'year' : 'month'}
              </span>
              <span style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>
                ${totalPrice}/{isYearly ? 'year' : 'month'}
              </span>
            </div>
            {isYearly && savings > 0 && (
              <p style={{ fontSize: '13px', color: '#166534', marginTop: '8px', marginBottom: 0 }}>
                You save ${savings}/year compared to monthly billing
              </p>
            )}
          </div>

          {/* Features */}
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0' }}>
            {FEATURES.map((feature, idx) => (
              <li
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 0',
                  color: '#374151',
                  fontSize: '14px',
                }}
              >
                <Check size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                {feature}
              </li>
            ))}
          </ul>

          {/* Subscribe Button */}
          <button
            onClick={handleSubscribe}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Loading...' : `Subscribe for $${totalPrice}/${isYearly ? 'year' : 'month'}`}
          </button>

          <p
            style={{
              marginTop: '16px',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '13px',
            }}
          >
            14-day free trial included. Cancel anytime.
          </p>
        </div>
      )}
    </div>
  );
}
