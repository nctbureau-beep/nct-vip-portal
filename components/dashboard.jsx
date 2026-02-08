import React, { useState, useEffect } from 'react';

// NCT VIP Portal - Dashboard
// Complete dashboard with stats, profile, and projects table

const NCTDashboard = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Real data state
  const [customer, setCustomer] = useState(null);
  const [stats, setStats] = useState({
    totalPages: 0,
    totalWords: 0,
    totalSpent: 0,
    activeProjects: 0,
  });
  const [allProjects, setAllProjects] = useState([]);

  // Fetch data from API
  useEffect(() => {
    const token = localStorage.getItem('nct_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    const fetchData = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${token}` };

        // Fetch profile, stats, and projects in parallel
        const [profileRes, statsRes, projectsRes] = await Promise.all([
          fetch('/api/customer/profile', { headers }),
          fetch('/api/customer/stats', { headers }),
          fetch('/api/projects', { headers }),
        ]);

        const profileData = await profileRes.json();
        const statsData = await statsRes.json();
        const projectsData = await projectsRes.json();

        if (profileData.success) {
          setCustomer({
            profileId: profileData.profile.profileId,
            name: profileData.profile.name,
            nameEn: profileData.profile.name,
            phone: profileData.profile.phone || '',
            email: profileData.profile.email || '',
            memberSince: profileData.profile.createdAt,
            driveFolder: profileData.profile.portalFolder || profileData.profile.driveFolder || '',
          });
        }

        if (statsData.success) {
          setStats({
            totalPages: statsData.stats.totalPages || 0,
            totalWords: statsData.stats.totalWords || 0,
            totalSpent: statsData.stats.totalSpent || 0,
            activeProjects: statsData.stats.activeProjects || 0,
          });
        }

        if (projectsData.success) {
          setAllProjects(projectsData.projects.map(p => ({
            id: p.customerId || p.id,
            documentName: p.documentName,
            documentNameEn: p.documentName,
            language: p.language || '',
            pages: p.pages || 0,
            words: p.words || 0,
            status: p.status || 'New Request',
            paymentStatus: p.paymentStatus || 'Unpaid',
            amount: p.total || 0,
            date: p.createdAt,
            folder: p.folder || '',
            filesFolder: p.pdfFolder || p.folder || '',
          })));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter and sort projects
  // Archive = Done = مكتمل (completed)
  const completedStatuses = ['Done', 'Archive', 'Delivered'];
  const filteredProjects = allProjects
    .filter(p => {
      if (activeFilter === 'active') return !completedStatuses.includes(p.status);
      if (activeFilter === 'completed') return completedStatuses.includes(p.status);
      return true;
    })
    .filter(p => 
      p.documentName.includes(searchQuery) || 
      p.documentNameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.date) - new Date(a.date);
      if (sortBy === 'date_asc') return new Date(a.date) - new Date(b.date);
      if (sortBy === 'amount_desc') return b.amount - a.amount;
      if (sortBy === 'amount_asc') return a.amount - b.amount;
      return 0;
    });

  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US').format(amount) + ' IQD';
  };

  // Format date
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Status badge colors
  const getStatusStyle = (status) => {
    const styles = {
      'New Request': { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
      'Translation': { bg: '#fef3c7', color: '#b45309', border: '#fcd34d' },
      'Proofreading': { bg: '#e0e7ff', color: '#4338ca', border: '#a5b4fc' },
      'Delivery': { bg: '#d1fae5', color: '#047857', border: '#6ee7b7' },
      'Done': { bg: '#dcfce7', color: '#15803d', border: '#86efac' },
    };
    return styles[status] || styles['New Request'];
  };

  // Payment status badge colors
  const getPaymentStyle = (status) => {
    const styles = {
      'Unpaid': { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
      'Partially Paid': { bg: '#fef3c7', color: '#b45309', border: '#fcd34d' },
      'Fully Paid': { bg: '#dcfce7', color: '#15803d', border: '#86efac' },
    };
    return styles[status] || styles['Unpaid'];
  };

  // Status translation
  const translateStatus = (status) => {
    const translations = {
      'New Request': 'طلب جديد',
      'Translation': 'قيد الترجمة',
      'Proofreading': 'المراجعة',
      'Delivery': 'جاري التسليم',
      'Done': 'مكتمل',
    };
    return translations[status] || status;
  };

  const translatePayment = (status) => {
    const translations = {
      'Unpaid': 'غير مدفوع',
      'Partially Paid': 'مدفوع جزئياً',
      'Fully Paid': 'مدفوع بالكامل',
    };
    return translations[status] || status;
  };

  const handleLogout = () => {
    if (confirm('هل تريد تسجيل الخروج؟')) {
      localStorage.removeItem('nct_token');
      localStorage.removeItem('nct_profile');
      window.location.href = '/login';
    }
  };

  // Show loading if customer not loaded yet
  if (!customer && isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#1a365d', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Fallback customer data if API failed
  const displayCustomer = customer || {
    profileId: 'N/A',
    name: 'Loading...',
    nameEn: '',
    phone: '',
    email: '',
    memberSince: new Date().toISOString(),
    driveFolder: '',
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <div style={styles.logoMini}>
              <img 
                src="https://lh3.googleusercontent.com/d/16mvURK3b4RO5d_1TDVN7u9kup5Yl4Gw7" 
                alt="NCT" 
                style={styles.logoImg}
                onError={(e) => e.target.src = ''}
              />
            </div>
            <div style={styles.headerTitle}>
              <h1 style={styles.portalTitle}>بوابة العملاء</h1>
              <span style={styles.vipBadgeSmall}>
                <CrownIcon />
                {displayCustomer.profileId}
              </span>
            </div>
          </div>
          
          <div style={styles.headerRight}>
            <div style={styles.userInfo}>
              <span style={styles.userName}>{displayCustomer.name}</span>
              <a href="/settings" style={styles.settingsBtn}>
                <SettingsIcon />
              </a>
              <button onClick={handleLogout} style={styles.logoutBtn}>
                <LogoutIcon />
                <span style={styles.logoutText}>خروج</span>
              </button>
            </div>
            
            {/* Mobile menu button */}
            <button 
              style={styles.menuBtn} 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <MenuIcon />
            </button>
          </div>
        </div>
        
        {/* Mobile menu */}
        {isMenuOpen && (
          <div style={styles.mobileMenu}>
            <div style={styles.mobileUserInfo}>
              <span style={styles.mobileUserName}>{displayCustomer.name}</span>
              <span style={styles.mobileVipBadge}>{displayCustomer.profileId}</span>
            </div>
            <a href="/settings" style={styles.mobileSettingsBtn}>
              <SettingsIcon />
              الإعدادات
            </a>
            <button onClick={handleLogout} style={styles.mobileLogoutBtn}>
              <LogoutIcon />
              تسجيل الخروج
            </button>
          </div>
        )}
      </header>

      <main style={styles.main}>
        {/* Stats Cards */}
        <section style={styles.statsSection}>
          <div style={styles.statsGrid}>
            <StatCard
              icon={<PagesIcon />}
              label="إجمالي الصفحات"
              value={stats.totalPages.toLocaleString()}
              color="#3b82f6"
              isLoading={isLoading}
            />
            <StatCard
              icon={<WordsIcon />}
              label="إجمالي الكلمات"
              value={stats.totalWords.toLocaleString()}
              color="#8b5cf6"
              isLoading={isLoading}
            />
            <StatCard
              icon={<MoneyIcon />}
              label="إجمالي المدفوعات"
              value={formatCurrency(stats.totalSpent)}
              color="#d4a574"
              isLoading={isLoading}
            />
            <StatCard
              icon={<ActiveIcon />}
              label="المشاريع النشطة"
              value={stats.activeProjects}
              color="#10b981"
              isLoading={isLoading}
            />
          </div>
        </section>

        {/* Profile Card */}
        <section style={styles.profileSection}>
          <div style={styles.profileCard}>
            <div style={styles.profileHeader}>
              <div style={styles.avatarSection}>
                <div style={styles.avatar}>
                  {displayCustomer.name.charAt(0)}
                </div>
                <div style={styles.profileInfo}>
                  <h2 style={styles.profileName}>{displayCustomer.name}</h2>
                  <p style={styles.profileNameEn}>{displayCustomer.nameEn}</p>
                </div>
              </div>
              <a 
                href={displayCustomer.driveFolder} 
                target="_blank" 
                rel="noopener noreferrer"
                style={styles.driveButton}
              >
                <DriveIcon />
                <span>ملفاتي</span>
              </a>
            </div>
            
            <div style={styles.profileDetails}>
              <div style={styles.profileItem}>
                <PhoneIcon />
                <span style={{direction: 'ltr'}}>{displayCustomer.phone}</span>
              </div>
              <div style={styles.profileItem}>
                <EmailIcon />
                <span>{displayCustomer.email}</span>
              </div>
              <div style={styles.profileItem}>
                <CalendarIcon />
                <span>عضو منذ {formatDate(displayCustomer.memberSince)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Projects Section */}
        <section style={styles.projectsSection}>
          <div style={styles.projectsHeader}>
            <h2 style={styles.sectionTitle}>
              <FolderIcon />
              مشاريع الترجمة
            </h2>
            
            <div style={styles.projectsControls}>
              {/* Search */}
              <div style={styles.searchBox}>
                <SearchIcon />
                <input
                  type="text"
                  placeholder="بحث..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={styles.searchInput}
                />
              </div>
              
              {/* Filter */}
              <div style={styles.filterTabs}>
                {[
                  { key: 'all', label: 'الكل' },
                  { key: 'active', label: 'نشط' },
                  { key: 'completed', label: 'مكتمل' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveFilter(tab.key); setCurrentPage(1); }}
                    style={{
                      ...styles.filterTab,
                      ...(activeFilter === tab.key ? styles.filterTabActive : {}),
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              
              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={styles.sortSelect}
              >
                <option value="date_desc">الأحدث أولاً</option>
                <option value="date_asc">الأقدم أولاً</option>
                <option value="amount_desc">الأعلى قيمة</option>
                <option value="amount_asc">الأقل قيمة</option>
              </select>
            </div>
          </div>

          {/* Projects Table */}
          <div style={styles.tableContainer}>
            {isLoading ? (
              <div style={styles.loadingState}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={styles.skeletonRow}>
                    <div style={{...styles.skeleton, width: '80px'}} />
                    <div style={{...styles.skeleton, width: '200px'}} />
                    <div style={{...styles.skeleton, width: '60px'}} />
                    <div style={{...styles.skeleton, width: '100px'}} />
                    <div style={{...styles.skeleton, width: '100px'}} />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th style={styles.th}>رقم التذكرة</th>
                      <th style={styles.th}>المستند</th>
                      <th style={styles.th}>اللغة</th>
                      <th style={styles.th}>الصفحات</th>
                      <th style={styles.th}>الحالة</th>
                      <th style={styles.th}>الدفع</th>
                      <th style={styles.th}>المبلغ</th>
                      <th style={styles.th}>الملفات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProjects.map((project) => (
                      <tr 
                        key={project.id} 
                        style={styles.tableRow}
                        onClick={() => setSelectedProject(project)}
                      >
                        <td style={styles.td}>
                          <span style={styles.ticketId}>{project.id}</span>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.docInfo}>
                            <span style={styles.docName}>{project.documentName}</span>
                            <span style={styles.docNameEn}>{project.documentNameEn}</span>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.langBadge}>{project.language}</span>
                        </td>
                        <td style={styles.td}>{project.pages}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.statusBadge,
                            backgroundColor: getStatusStyle(project.status).bg,
                            color: getStatusStyle(project.status).color,
                            borderColor: getStatusStyle(project.status).border,
                          }}>
                            {translateStatus(project.status)}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.paymentBadge,
                            backgroundColor: getPaymentStyle(project.paymentStatus).bg,
                            color: getPaymentStyle(project.paymentStatus).color,
                            borderColor: getPaymentStyle(project.paymentStatus).border,
                          }}>
                            {translatePayment(project.paymentStatus)}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.amount}>{formatCurrency(project.amount)}</span>
                        </td>
                        <td style={styles.td}>
                          <a
                            href={project.filesFolder}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.filesBtn}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FolderOpenIcon />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Cards */}
                <div style={styles.mobileCards}>
                  {paginatedProjects.map((project) => (
                    <div 
                      key={project.id} 
                      style={styles.mobileCard}
                      onClick={() => setSelectedProject(project)}
                    >
                      <div style={styles.mobileCardHeader}>
                        <span style={styles.ticketId}>{project.id}</span>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: getStatusStyle(project.status).bg,
                          color: getStatusStyle(project.status).color,
                        }}>
                          {translateStatus(project.status)}
                        </span>
                      </div>
                      <div style={styles.mobileCardBody}>
                        <h3 style={styles.mobileDocName}>{project.documentName}</h3>
                        <p style={styles.mobileDocNameEn}>{project.documentNameEn}</p>
                      </div>
                      <div style={styles.mobileCardFooter}>
                        <div style={styles.mobileCardMeta}>
                          <span style={styles.langBadge}>{project.language}</span>
                          <span>{project.pages} صفحة</span>
                        </div>
                        <div style={styles.mobileCardActions}>
                          <span style={styles.mobileAmount}>{formatCurrency(project.amount)}</span>
                          <a
                            href={project.filesFolder}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.filesBtn}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FolderOpenIcon />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Empty state */}
                {paginatedProjects.length === 0 && (
                  <div style={styles.emptyState}>
                    <FolderIcon />
                    <p>لا توجد مشاريع</p>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={styles.pagination}>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{
                        ...styles.pageBtn,
                        opacity: currentPage === 1 ? 0.5 : 1,
                      }}
                    >
                      السابق
                    </button>
                    <span style={styles.pageInfo}>
                      صفحة {currentPage} من {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      style={{
                        ...styles.pageBtn,
                        opacity: currentPage === totalPages ? 0.5 : 1,
                      }}
                    >
                      التالي
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      {/* Project Detail Modal */}
      {selectedProject && (
        <div style={styles.modalOverlay} onClick={() => setSelectedProject(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.modalTicketId}>{selectedProject.id}</span>
                <h2 style={styles.modalTitle}>{selectedProject.documentName}</h2>
                <p style={styles.modalSubtitle}>{selectedProject.documentNameEn}</p>
              </div>
              <button 
                onClick={() => setSelectedProject(null)} 
                style={styles.closeBtn}
              >
                ✕
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.modalGrid}>
                <div style={styles.modalItem}>
                  <span style={styles.modalLabel}>اللغة</span>
                  <span style={styles.langBadge}>{selectedProject.language}</span>
                </div>
                <div style={styles.modalItem}>
                  <span style={styles.modalLabel}>الصفحات</span>
                  <span style={styles.modalValue}>{selectedProject.pages}</span>
                </div>
                <div style={styles.modalItem}>
                  <span style={styles.modalLabel}>الكلمات</span>
                  <span style={styles.modalValue}>{selectedProject.words.toLocaleString()}</span>
                </div>
                <div style={styles.modalItem}>
                  <span style={styles.modalLabel}>التاريخ</span>
                  <span style={styles.modalValue}>{formatDate(selectedProject.date)}</span>
                </div>
              </div>
              
              <div style={styles.modalStatusRow}>
                <div style={styles.modalItem}>
                  <span style={styles.modalLabel}>حالة المشروع</span>
                  <span style={{
                    ...styles.statusBadge,
                    ...styles.statusBadgeLarge,
                    backgroundColor: getStatusStyle(selectedProject.status).bg,
                    color: getStatusStyle(selectedProject.status).color,
                  }}>
                    {translateStatus(selectedProject.status)}
                  </span>
                </div>
                <div style={styles.modalItem}>
                  <span style={styles.modalLabel}>حالة الدفع</span>
                  <span style={{
                    ...styles.paymentBadge,
                    ...styles.statusBadgeLarge,
                    backgroundColor: getPaymentStyle(selectedProject.paymentStatus).bg,
                    color: getPaymentStyle(selectedProject.paymentStatus).color,
                  }}>
                    {translatePayment(selectedProject.paymentStatus)}
                  </span>
                </div>
              </div>
              
              <div style={styles.modalAmount}>
                <span style={styles.modalLabel}>المبلغ الإجمالي</span>
                <span style={styles.modalAmountValue}>{formatCurrency(selectedProject.amount)}</span>
              </div>
            </div>
            
            <div style={styles.modalFooter}>
              <a
                href={selectedProject.folder}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.modalBtn}
              >
                <FolderIcon />
                المستندات الأصلية
              </a>
              <a
                href={selectedProject.filesFolder}
                target="_blank"
                rel="noopener noreferrer"
                style={{...styles.modalBtn, ...styles.modalBtnPrimary}}
              >
                <DownloadIcon />
                الملفات المترجمة
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <p>© 2026 National Company for Translation</p>
          <div style={styles.footerLinks}>
            <a href="https://wa.me/9647735500707" style={styles.footerLink}>
              <WhatsAppIcon /> +964 773 550 0707
            </a>
            <a href="https://nct-iq.com" style={styles.footerLink}>nct-iq.com</a>
          </div>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: 200px 0; }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        
        input:focus, select:focus {
          outline: none;
          border-color: #d4a574 !important;
          box-shadow: 0 0 0 3px rgba(212, 165, 116, 0.15) !important;
        }
        
        tr:hover {
          background-color: rgba(26, 54, 93, 0.02) !important;
        }
        
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
        }
        
        @media (min-width: 769px) {
          .mobile-only { display: none !important; }
        }
      `}</style>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon, label, value, color, isLoading }) => (
  <div style={{
    ...statCardStyles.card,
    borderTopColor: color,
  }}>
    {isLoading ? (
      <div style={statCardStyles.skeleton} />
    ) : (
      <>
        <div style={{...statCardStyles.iconBox, backgroundColor: `${color}15`, color}}>
          {icon}
        </div>
        <div style={statCardStyles.content}>
          <span style={statCardStyles.value}>{value}</span>
          <span style={statCardStyles.label}>{label}</span>
        </div>
      </>
    )}
  </div>
);

const statCardStyles = {
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.03)',
    borderTop: '3px solid',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'default',
  },
  iconBox: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  value: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  label: {
    fontSize: '13px',
    color: '#64748b',
  },
  skeleton: {
    width: '100%',
    height: '48px',
    background: 'linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)',
    backgroundSize: '200px 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '8px',
  },
};

// Icons
const CrownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 3a1 1 0 011-1h12a1 1 0 110 2H6a1 1 0 01-1-1z"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);

const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

const PagesIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
  </svg>
);

const WordsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 7V4h16v3M9 20h6M12 4v16"/>
  </svg>
);

const MoneyIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 100 4h4a2 2 0 110 4H8M12 18V6"/>
  </svg>
);

const ActiveIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
  </svg>
);

const DriveIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5L7.71 3.5zm1.42 0l6.56 11.5H22L15.44 3.5H9.13zm6.56 12.5H4.56l-3.42 6h14.13l3.43-6h-2.59z"/>
  </svg>
);

const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
  </svg>
);

const EmailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/>
  </svg>
);

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const FolderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
  </svg>
);

const FolderOpenIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z"/><path d="M2 10h20"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
  </svg>
);

const WhatsAppIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// Main Styles
const styles = {
  container: {
    minHeight: '100vh',
    fontFamily: "'Noto Sans Arabic', 'Plus Jakarta Sans', sans-serif",
    background: '#f1f5f9',
    direction: 'rtl',
    display: 'flex',
    flexDirection: 'column',
  },
  
  // Header
  header: {
    background: 'linear-gradient(135deg, #1a365d 0%, #234876 100%)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoMini: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.1)',
  },
  logoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  headerTitle: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  portalTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    margin: 0,
  },
  vipBadgeSmall: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    color: '#d4a574',
    fontWeight: '600',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userName: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: '500',
  },
  settingsBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    padding: '8px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textDecoration: 'none',
  },
  settingsBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textDecoration: 'none',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  logoutText: {
    '@media (max-width: 640px)': {
      display: 'none',
    },
  },
  menuBtn: {
    display: 'none',
    padding: '8px',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
  },
  mobileMenu: {
    padding: '16px 24px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  mobileUserInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  mobileUserName: {
    color: '#fff',
    fontSize: '16px',
    fontWeight: '500',
  },
  mobileVipBadge: {
    background: 'rgba(212, 165, 116, 0.2)',
    color: '#d4a574',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  mobileSettingsBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
    textDecoration: 'none',
    marginBottom: '8px',
  },
  mobileLogoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
  },

  // Main
  main: {
    flex: 1,
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
    width: '100%',
  },

  // Stats
  statsSection: {
    marginBottom: '24px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
  },

  // Profile
  profileSection: {
    marginBottom: '24px',
  },
  profileCard: {
    background: '#fff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.03)',
  },
  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  avatarSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  avatar: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #1a365d, #2d5a87)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    fontWeight: '600',
  },
  profileInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  profileName: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0,
  },
  profileNameEn: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  driveButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    background: '#fff',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    color: '#1a365d',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  profileDetails: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '24px',
  },
  profileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#64748b',
    fontSize: '14px',
  },

  // Projects
  projectsSection: {
    background: '#fff',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.03)',
    overflow: 'hidden',
  },
  projectsHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0,
  },
  projectsControls: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    minWidth: '200px',
  },
  searchInput: {
    border: 'none',
    background: 'transparent',
    fontSize: '14px',
    width: '100%',
    fontFamily: 'inherit',
  },
  filterTabs: {
    display: 'flex',
    gap: '4px',
    padding: '4px',
    background: '#f1f5f9',
    borderRadius: '8px',
  },
  filterTab: {
    padding: '6px 14px',
    border: 'none',
    background: 'transparent',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
  },
  filterTabActive: {
    background: '#fff',
    color: '#1a365d',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  sortSelect: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '13px',
    background: '#fff',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },

  // Table
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    background: '#f8fafc',
  },
  th: {
    padding: '14px 16px',
    textAlign: 'right',
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap',
  },
  tableRow: {
    cursor: 'pointer',
    transition: 'background 0.15s',
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#1e293b',
    verticalAlign: 'middle',
  },
  ticketId: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '13px',
    fontWeight: '500',
    color: '#1a365d',
    background: '#f1f5f9',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  docInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  docName: {
    fontWeight: '500',
    color: '#1e293b',
  },
  docNameEn: {
    fontSize: '12px',
    color: '#94a3b8',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  langBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    background: '#f1f5f9',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    color: '#475569',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    border: '1px solid',
  },
  paymentBadge: {
    display: 'inline-block',
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    border: '1px solid',
  },
  amount: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: '600',
    color: '#1e293b',
    whiteSpace: 'nowrap',
  },
  filesBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    color: '#1a365d',
    textDecoration: 'none',
    transition: 'all 0.2s',
  },

  // Mobile Cards
  mobileCards: {
    display: 'none',
    padding: '16px',
    flexDirection: 'column',
    gap: '12px',
  },
  mobileCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  mobileCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  mobileCardBody: {
    marginBottom: '12px',
  },
  mobileDocName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  mobileDocNameEn: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
  },
  mobileCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: '1px solid #f1f5f9',
  },
  mobileCardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '13px',
    color: '#64748b',
  },
  mobileCardActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  mobileAmount: {
    fontWeight: '600',
    color: '#1e293b',
    fontSize: '14px',
  },

  // Loading
  loadingState: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  skeletonRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  skeleton: {
    height: '20px',
    background: 'linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)',
    backgroundSize: '200px 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '4px',
  },

  // Empty State
  emptyState: {
    padding: '48px',
    textAlign: 'center',
    color: '#94a3b8',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },

  // Pagination
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    borderTop: '1px solid #e2e8f0',
  },
  pageBtn: {
    padding: '8px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    background: '#fff',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
  },
  pageInfo: {
    fontSize: '14px',
    color: '#64748b',
  },

  // Modal
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 200,
    animation: 'fadeIn 0.2s ease',
  },
  modal: {
    background: '#fff',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    animation: 'slideIn 0.3s ease',
  },
  modalHeader: {
    padding: '24px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalTicketId: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '12px',
    color: '#d4a574',
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '4px 0',
  },
  modalSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: '#f1f5f9',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#64748b',
  },
  modalBody: {
    padding: '24px',
  },
  modalGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '20px',
  },
  modalItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  modalLabel: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500',
  },
  modalValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
  },
  modalStatusRow: {
    display: 'flex',
    gap: '24px',
    marginBottom: '20px',
    paddingBottom: '20px',
    borderBottom: '1px solid #f1f5f9',
  },
  statusBadgeLarge: {
    padding: '8px 16px',
    fontSize: '14px',
  },
  modalAmount: {
    background: '#f8fafc',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center',
  },
  modalAmountValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a365d',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  modalFooter: {
    padding: '20px 24px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    gap: '12px',
  },
  modalBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    background: '#fff',
    color: '#1e293b',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  modalBtnPrimary: {
    background: 'linear-gradient(135deg, #1a365d, #2d5a87)',
    border: 'none',
    color: '#fff',
  },

  // Footer
  footer: {
    background: '#1e293b',
    padding: '20px 24px',
    marginTop: 'auto',
  },
  footerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    color: '#94a3b8',
    fontSize: '13px',
  },
  footerLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  footerLink: {
    color: '#94a3b8',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'color 0.2s',
  },
};

// Add media query styles via CSS
const mediaStyles = `
  @media (max-width: 768px) {
    .desktop-table { display: none !important; }
    .mobile-cards { display: flex !important; }
    .user-info { display: none !important; }
    .menu-btn { display: flex !important; }
  }
`;

export default NCTDashboard;
