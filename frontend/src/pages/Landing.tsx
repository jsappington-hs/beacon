import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: 'clamp(20px, 5vw, 40px)',
      paddingTop: 'clamp(80px, 15vw, 120px)',
      boxSizing: 'border-box',
      overflowX: 'hidden',
    }}>
      {/* Logo in top left */}
      <div style={{
        position: 'absolute',
        top: 'clamp(16px, 4vw, 40px)',
        left: 'clamp(16px, 4vw, 40px)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <div style={{
          width: 'clamp(32px, 8vw, 40px)',
          height: 'clamp(32px, 8vw, 40px)',
          background: 'white',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '700',
          color: '#667eea',
          fontSize: 'clamp(16px, 4vw, 20px)'
        }}>
          B
        </div>
        <h1 style={{
          color: 'white',
          fontSize: 'clamp(18px, 5vw, 24px)',
          fontWeight: '700',
          margin: 0
        }}>
          Beacon
        </h1>
      </div>

      {/* Hero Content */}
      <div style={{
        maxWidth: '900px',
        width: '100%',
        padding: '0 clamp(8px, 2vw, 20px)',
        boxSizing: 'border-box',
      }}>
        <h2 style={{
          fontSize: 'clamp(28px, 8vw, 72px)',
          fontWeight: '800',
          color: 'white',
          margin: '0 0 clamp(16px, 4vw, 32px) 0',
          lineHeight: '1.1',
          wordWrap: 'break-word',
        }}>
          Performance Management That Actually Works
        </h2>
        <p style={{
          fontSize: 'clamp(16px, 4vw, 24px)',
          color: 'rgba(255, 255, 255, 0.95)',
          margin: '0 0 clamp(32px, 6vw, 56px) 0',
          lineHeight: '1.5',
        }}>
          Empower your team with continuous feedback, goal alignment, and meaningful development conversations.
        </p>
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 'clamp(12px, 3vw, 20px)',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          <Link
            to="/register"
            style={{
              display: 'inline-block',
              padding: 'clamp(14px, 3vw, 20px) clamp(32px, 8vw, 56px)',
              background: 'white',
              color: '#667eea',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: '700',
              fontSize: 'clamp(16px, 4vw, 20px)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 25px 70px rgba(0, 0, 0, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.3)';
            }}
          >
            Get Started
          </Link>
          <Link
            to="/login"
            style={{
              display: 'inline-block',
              padding: 'clamp(14px, 3vw, 20px) clamp(32px, 8vw, 56px)',
              background: 'transparent',
              color: 'white',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: '700',
              fontSize: 'clamp(16px, 4vw, 20px)',
              border: '2px solid white',
              transition: 'transform 0.2s, background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
