// app/settings/page.jsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [language, setLanguage] = useState('ar'); // 'ar' or 'en'
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);

  const isRTL = language === 'ar';

  useEffect(() => {
    // Load profile and language preference
    const savedProfile = localStorage.getItem('nct_profile');
    const savedLang = localStorage.getItem('nct_language') || 'ar';
    
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    }
    setLanguage(savedLang);

    // Check auth
    const token = localStorage.getItem('nct_token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    localStorage.setItem('nct_language', lang);
    // Update document direction
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (newPassword !== confirmPassword) {
      setMessage({ 
        type: 'error', 
        text: isRTL ? 'كلمات المرور غير متطابقة' : 'Passwords do not match' 
      });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ 
        type: 'error', 
        text: isRTL ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters' 
      });
      return;
    }

    setIsLoading(true);
    
    // Note: Password change would require a new API endpoint
    // For now, show a message that this feature requires backend support
    setTimeout(() => {
      setMessage({ 
        type: 'info', 
        text: isRTL 
          ? 'لتغيير كلمة المرور، يرجى التواصل معنا عبر واتساب' 
          : 'To change password, please contact us via WhatsApp' 
      });
      setIsLoading(false);
    }, 1000);
  };

  const handleLogout = () => {
    localStorage.removeItem('nct_token');
    localStorage.removeItem('nct_profile');
    router.push('/login');
  };

  const texts = {
    ar: {
      title: 'الإعدادات',
      back: 'العودة للوحة التحكم',
      profile: 'الملف الشخصي',
      name: 'الاسم',
      phone: 'الهاتف',
      email: 'البريد الإلكتروني',
      vipId: 'رقم العضوية',
      memberSince: 'عضو منذ',
      language: 'اللغة',
      arabic: 'العربية',
      english: 'English',
      changePassword: 'تغيير كلمة المرور',
      currentPassword: 'كلمة المرور الحالية',
      newPassword: 'كلمة المرور الجديدة',
      confirmPassword: 'تأكيد كلمة المرور',
      save: 'حفظ',
      logout: 'تسجيل الخروج',
      contact: 'تواصل معنا',
      whatsapp: 'واتساب',
    },
    en: {
      title: 'Settings',
      back: 'Back to Dashboard',
      profile: 'Profile',
      name: 'Name',
      phone: 'Phone',
      email: 'Email',
      vipId: 'VIP ID',
      memberSince: 'Member Since',
      language: 'Language',
      arabic: 'العربية',
      english: 'English',
      changePassword: 'Change Password',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm Password',
      save: 'Save',
      logout: 'Logout',
      contact: 'Contact Us',
      whatsapp: 'WhatsApp',
    },
  };

  const t = texts[language];

  return (
    <div style={{
      ...styles.container,
      direction: isRTL ? 'rtl' : 'ltr',
    }}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <button onClick={() => router.push('/dashboard')} style={styles.backBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transform: isRTL ? 'rotate(0)' : 'rotate(180deg)' }}>
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            {t.back}
          </button>
          <h1 style={styles.pageTitle}>{t.title}</h1>
        </div>
      </header>

      <main style={styles.main}>
        {/* Language Toggle */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>{t.language}</h2>
          <div style={styles.languageToggle}>
            <button
              onClick={() => handleLanguageChange('ar')}
              style={{
                ...styles.langBtn,
                ...(language === 'ar' ? styles.langBtnActive : {}),
              }}
            >
              🇮🇶 {t.arabic}
            </button>
            <button
              onClick={() => handleLanguageChange('en')}
              style={{
                ...styles.langBtn,
                ...(language === 'en' ? styles.langBtnActive : {}),
              }}
            >
              🇬🇧 {t.english}
            </button>
          </div>
        </section>

        {/* Profile Info */}
        {profile && (
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>{t.profile}</h2>
            <div style={styles.profileGrid}>
              <div style={styles.profileItem}>
                <span style={styles.profileLabel}>{t.name}</span>
                <span style={styles.profileValue}>{profile.name}</span>
              </div>
              <div style={styles.profileItem}>
                <span style={styles.profileLabel}>{t.vipId}</span>
                <span style={styles.profileValueBadge}>{profile.profileId}</span>
              </div>
              <div style={styles.profileItem}>
                <span style={styles.profileLabel}>{t.phone}</span>
                <span style={{...styles.profileValue, direction: 'ltr'}}>{profile.phone || '—'}</span>
              </div>
              <div style={styles.profileItem}>
                <span style={styles.profileLabel}>{t.email}</span>
                <span style={styles.profileValue}>{profile.email || '—'}</span>
              </div>
            </div>
          </section>
        )}

        {/* Change Password */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>{t.changePassword}</h2>
          
          {message.text && (
            <div style={{
              ...styles.message,
              background: message.type === 'error' ? '#fee2e2' : 
                         message.type === 'success' ? '#dcfce7' : '#dbeafe',
              color: message.type === 'error' ? '#b91c1c' : 
                     message.type === 'success' ? '#15803d' : '#1d4ed8',
            }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handlePasswordChange} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>{t.currentPassword}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={styles.input}
                required
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>{t.newPassword}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={styles.input}
                required
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>{t.confirmPassword}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={styles.input}
                required
              />
            </div>
            <button type="submit" style={styles.saveBtn} disabled={isLoading}>
              {isLoading ? '...' : t.save}
            </button>
          </form>
        </section>

        {/* Contact & Logout */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>{t.contact}</h2>
          <a href="https://wa.me/9647735500707" style={styles.whatsappBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {t.whatsapp}: +964 773 550 0707
          </a>
          
          <button onClick={handleLogout} style={styles.logoutBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            {t.logout}
          </button>
        </section>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { outline: none; border-color: #d4a574 !important; box-shadow: 0 0 0 3px rgba(212, 165, 116, 0.15) !important; }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    fontFamily: "'Noto Sans Arabic', 'Plus Jakarta Sans', sans-serif",
    background: '#f1f5f9',
  },
  header: {
    background: 'linear-gradient(135deg, #1a365d 0%, #234876 100%)',
    padding: '16px 24px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerContent: {
    maxWidth: '800px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  pageTitle: {
    color: '#fff',
    fontSize: '18px',
    fontWeight: '600',
    margin: 0,
  },
  main: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.03)',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #f1f5f9',
  },
  languageToggle: {
    display: 'flex',
    gap: '12px',
  },
  langBtn: {
    flex: 1,
    padding: '14px 20px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    background: '#fff',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
  },
  langBtnActive: {
    borderColor: '#1a365d',
    background: '#1a365d',
    color: '#fff',
  },
  profileGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  profileItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  profileLabel: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500',
  },
  profileValue: {
    fontSize: '15px',
    color: '#1e293b',
    fontWeight: '500',
  },
  profileValueBadge: {
    display: 'inline-block',
    background: 'linear-gradient(135deg, #d4a574, #c9956a)',
    color: '#fff',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    width: 'fit-content',
  },
  message: {
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '15px',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
  },
  saveBtn: {
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #1a365d, #2d5a87)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
    fontFamily: 'inherit',
  },
  whatsappBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '14px 20px',
    background: '#25D366',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '15px',
    fontWeight: '500',
    textDecoration: 'none',
    marginBottom: '12px',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '14px 20px',
    background: '#fff',
    border: '2px solid #fee2e2',
    borderRadius: '10px',
    color: '#b91c1c',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};
