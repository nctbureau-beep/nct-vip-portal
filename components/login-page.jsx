import React, { useState, useEffect } from 'react';

// NCT VIP Portal - Login Page
// Premium design for VIP translation service customers

const NCTLoginPage = () => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [profileId, setProfileId] = useState('');

  // Simulate getting profile from URL params (e.g., ?profile=NCTV-10)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const profile = params.get('profile') || 'NCTV-10'; // Demo default
    setProfileId(profile);
    
    // In production, this would fetch customer name from API
    // For demo, simulate a customer
    setTimeout(() => {
      setCustomerName('أحمد محمد علي'); // Ahmed Mohammed Ali
    }, 500);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Demo validation (in production, this calls /api/auth/verify)
    if (password === 'NCT12345') {
      // Success - would redirect to dashboard
      window.location.href = '/dashboard';
    } else {
      setError('كلمة المرور غير صحيحة'); // Incorrect password
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Animated background pattern */}
      <div style={styles.backgroundPattern}>
        <div style={styles.patternOverlay} />
        {[...Array(6)].map((_, i) => (
          <div 
            key={i} 
            style={{
              ...styles.floatingShape,
              top: `${15 + i * 15}%`,
              left: `${10 + (i % 3) * 30}%`,
              animationDelay: `${i * 0.5}s`,
              width: `${60 + i * 20}px`,
              height: `${60 + i * 20}px`,
            }} 
          />
        ))}
      </div>

      {/* Main card */}
      <div style={styles.card}>
        {/* Logo section */}
        <div style={styles.logoSection}>
          <div style={styles.logoContainer}>
            <img 
              src="https://lh3.googleusercontent.com/d/16mvURK3b4RO5d_1TDVN7u9kup5Yl4Gw7" 
              alt="NCT Logo" 
              style={styles.logo}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div style={{...styles.logoFallback, display: 'none'}}>
              <span style={styles.logoText}>NCT</span>
            </div>
          </div>
          <h1 style={styles.title}>بوابة العملاء المميزين</h1>
          <p style={styles.subtitle}>VIP Customer Portal</p>
        </div>

        {/* VIP Badge */}
        {profileId && (
          <div style={styles.vipBadge}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={styles.crownIcon}>
              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 3a1 1 0 011-1h12a1 1 0 110 2H6a1 1 0 01-1-1z"/>
            </svg>
            <span>{profileId}</span>
          </div>
        )}

        {/* Welcome message */}
        {customerName && (
          <div style={styles.welcomeSection}>
            <p style={styles.welcomeLabel}>مرحباً بك</p>
            <p style={styles.customerName}>{customerName}</p>
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>كلمة المرور</label>
            <div style={styles.inputWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value.toUpperCase())}
                placeholder="ABC12345"
                style={styles.input}
                disabled={isLoading}
                autoComplete="current-password"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.toggleButton}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div style={styles.errorBox}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Submit button */}
          <button 
            type="submit" 
            style={{
              ...styles.submitButton,
              opacity: isLoading ? 0.7 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
            disabled={isLoading || !password}
          >
            {isLoading ? (
              <div style={styles.loadingSpinner}>
                <div style={styles.spinner} />
                <span>جاري التحقق...</span>
              </div>
            ) : (
              <>
                <span>تسجيل الدخول</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={styles.arrowIcon}>
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={styles.divider}>
          <span style={styles.dividerText}>تحتاج مساعدة؟</span>
        </div>

        {/* Contact section */}
        <div style={styles.contactSection}>
          <a href="https://wa.me/9647735500707" style={styles.whatsappButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span>تواصل عبر واتساب</span>
          </a>
          <p style={styles.phoneNumber}>+964 773 550 0707</p>
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <p>© 2026 National Company for Translation</p>
        <p style={styles.footerLink}>nct-iq.com</p>
      </div>

      {/* CSS Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.03; }
          50% { transform: translateY(-20px) rotate(5deg); opacity: 0.06; }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(212, 165, 116, 0.4); }
          50% { box-shadow: 0 0 0 10px rgba(212, 165, 116, 0); }
        }
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        input::placeholder {
          color: #94a3b8;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        
        input:focus {
          outline: none;
          border-color: #d4a574 !important;
          box-shadow: 0 0 0 3px rgba(212, 165, 116, 0.2) !important;
        }
        
        button:hover:not(:disabled) {
          transform: translateY(-1px);
        }
        
        button:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: "'Noto Sans Arabic', 'Plus Jakarta Sans', sans-serif",
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1a365d 100%)',
    position: 'relative',
    overflow: 'hidden',
    direction: 'rtl',
  },
  backgroundPattern: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
  },
  patternOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `radial-gradient(circle at 20% 50%, rgba(212, 165, 116, 0.08) 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, rgba(212, 165, 116, 0.05) 0%, transparent 40%),
                      radial-gradient(circle at 40% 80%, rgba(45, 90, 135, 0.1) 0%, transparent 50%)`,
  },
  floatingShape: {
    position: 'absolute',
    borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
    background: 'linear-gradient(45deg, rgba(212, 165, 116, 0.1), rgba(45, 90, 135, 0.1))',
    animation: 'float 8s ease-in-out infinite',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: 'rgba(255, 255, 255, 0.98)',
    borderRadius: '24px',
    padding: '40px 32px',
    boxShadow: '0 25px 80px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
    position: 'relative',
    animation: 'slideUp 0.6s ease-out',
    backdropFilter: 'blur(10px)',
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  logoContainer: {
    marginBottom: '16px',
  },
  logo: {
    width: '80px',
    height: '80px',
    objectFit: 'contain',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  },
  logoFallback: {
    width: '80px',
    height: '80px',
    background: 'linear-gradient(135deg, #1a365d, #2d5a87)',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
  },
  logoText: {
    color: '#d4a574',
    fontSize: '24px',
    fontWeight: '700',
    letterSpacing: '2px',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    letterSpacing: '1px',
  },
  vipBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'linear-gradient(135deg, #d4a574, #c9956a)',
    color: '#fff',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    margin: '0 auto 20px',
    width: 'fit-content',
    boxShadow: '0 2px 10px rgba(212, 165, 116, 0.3)',
    animation: 'pulse 2s infinite',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  crownIcon: {
    marginLeft: '2px',
  },
  welcomeSection: {
    textAlign: 'center',
    marginBottom: '28px',
    padding: '16px',
    background: 'linear-gradient(135deg, rgba(26, 54, 93, 0.05), rgba(212, 165, 116, 0.05))',
    borderRadius: '12px',
    border: '1px solid rgba(26, 54, 93, 0.08)',
  },
  welcomeLabel: {
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '4px',
  },
  customerName: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1a365d',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '14px 48px 14px 16px',
    fontSize: '18px',
    fontFamily: "'Plus Jakarta Sans', monospace",
    letterSpacing: '2px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    background: '#f8fafc',
    color: '#1e293b',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    direction: 'ltr',
  },
  toggleButton: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s ease',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    background: 'rgba(220, 38, 38, 0.08)',
    border: '1px solid rgba(220, 38, 38, 0.2)',
    borderRadius: '10px',
    color: '#dc2626',
    fontSize: '14px',
  },
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '16px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    background: 'linear-gradient(135deg, #1a365d, #2d5a87)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '8px',
    boxShadow: '0 4px 15px rgba(26, 54, 93, 0.3)',
    fontFamily: "'Noto Sans Arabic', sans-serif",
  },
  arrowIcon: {
    transform: 'rotate(180deg)',
  },
  loadingSpinner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '24px 0 16px',
    gap: '12px',
  },
  dividerText: {
    flex: '1',
    textAlign: 'center',
    fontSize: '13px',
    color: '#94a3b8',
    position: 'relative',
  },
  contactSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  whatsappButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    background: '#25D366',
    color: '#fff',
    borderRadius: '10px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 10px rgba(37, 211, 102, 0.3)',
  },
  phoneNumber: {
    fontSize: '13px',
    color: '#64748b',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    direction: 'ltr',
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '12px',
  },
  footerLink: {
    color: 'rgba(212, 165, 116, 0.7)',
    marginTop: '4px',
  },
};

export default NCTLoginPage;
