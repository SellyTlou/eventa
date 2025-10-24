import React, { useState, useEffect, useMemo, useRef } from "react";
import "../../App.css";
import "../../index.css";
import { Footer } from "../components";
import activityQueue from "../activityQueue";

function AdminDashboard() {
    const [activeTab, setActiveTab] = useState("dashboard");
    const [dashboardData, setDashboardData] = useState({
        total_users: 0,
        active_users: 0,
        active_events: 0,
        response_rate: 0,
        inactive_users: 0 
    });
    const [systemActivities, setSystemActivities] = useState([]);
    const [invitationAnalytics, setInvitationAnalytics] = useState([]);
    const [pricingPlans, setPricingPlans] = useState([]);
    const [usersData, setUsersData] = useState([]);
    const [revenueData, setRevenueData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [adminUserId, setAdminUserId] = useState("ADMIN-003");
    const [adminProfile, setAdminProfile] = useState(null);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [profileImage, setProfileImage] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showBackupModal, setShowBackupModal] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [reportForm, setReportForm] = useState({
    report_type: 'users',
    date_range: 'all',
    format: 'csv'
});
const [downloadUrl, setDownloadUrl] = useState('');
const [actionMessage, setActionMessage] = useState('');   
const [showLogsModal, setShowLogsModal] = useState(false);
const [allActivities, setAllActivities] = useState([]);
const [logsLoading, setLogsLoading] = useState(false);
const [logsSearch, setLogsSearch] = useState("");
const [logsFilter, setLogsFilter] = useState("all");  

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';
    
    // Create refs for the profile trigger and dropdown
    const profileTriggerRef = useRef(null);
    const profileDropdownRef = useRef(null);

    // Silent logging function
    const logActivity = (action, description, userId = null) => {
        activityQueue.enqueue({
            userId: userId || adminUserId,
            action: action,
            description: description
        });
    };

    // Reset forms when modals open
useEffect(() => {
    if (showReportModal) {
        setReportForm({
            report_type: 'users',
            date_range: 'all'
        });
        setActionMessage('');
    }
}, [showReportModal]);

useEffect(() => {
    if (showBackupModal) {
        setActionMessage('');
        setDownloadUrl('');
    }
}, [showBackupModal]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                profileTriggerRef.current && 
                !profileTriggerRef.current.contains(event.target) &&
                profileDropdownRef.current && 
                !profileDropdownRef.current.contains(event.target)
            ) {
                setShowProfileDropdown(false);
            }
        };

        if (showProfileDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showProfileDropdown]);

    useEffect(() => {
        window.fetchDashboardData = fetchDashboardData;
        window.fetchUsersData = fetchUsersData;
        fetchAdminProfile();

        // Log admin dashboard access
        logActivity('Admin Dashboard Accessed', 'Administrator accessed the system dashboard');

        // Load profile image from localStorage
        const savedImage = localStorage.getItem('adminProfileImage');
        if (savedImage) {
            setProfileImage(savedImage);
        }
        
        return () => {
            window.fetchDashboardData = null;
            window.fetchUsersData = null;
        };
    }, []);

    // Fetch admin profile
    const fetchAdminProfile = async () => {
        try {
            const formData = new FormData();
            formData.append('function', 'getAdminProfile');
            formData.append('admin_user_id', adminUserId);
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setAdminProfile(data.admin);
                }
            }
        } catch (error) {
            console.error('Error fetching admin profile:', error);
            logActivity('Profile Fetch Failed', `Failed to fetch admin profile: ${error.message}`);
        }
    };

    // Fetch data based on active tab
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                switch(activeTab) {
                    case "dashboard":
                        await fetchDashboardData();
                        await fetchSystemActivities();
                        logActivity('Dashboard Tab Viewed', 'Administrator viewed dashboard statistics');
                        break;
                    case "invitations":
                        await fetchInvitationAnalytics();
                        logActivity('Invitations Tab Viewed', 'Administrator viewed invitation analytics');
                        break;
                    case "pricing":
                        await fetchPricingPlans();
                        await fetchRevenueData();
                        logActivity('Pricing Tab Viewed', 'Administrator viewed pricing management');
                        break;
                    case "users":
                        await fetchUsersData();
                        logActivity('Users Tab Viewed', 'Administrator viewed user management');
                        break;
                    case "profile":
                        await fetchAdminProfile();
                        logActivity('Profile Tab Viewed', 'Administrator viewed profile settings');
                        break;
                    default:
                        break;
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                logActivity('Data Fetch Error', `Failed to fetch ${activeTab} data: ${error.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [activeTab]);

    const fetchDashboardData = async () => {
        try {
            const formData = new FormData();
            formData.append('function', 'getDashboardStats');
            formData.append('admin_user_id', adminUserId);
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setDashboardData(data.stats);
                } else if (data.message && data.message.includes("Unauthorized")) {
                    console.error("Admin access denied:", data.message);
                    alert("Admin access denied. Please log in as administrator.");
                }
            }
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        }
    };

    const fetchSystemActivities = async () => {
        try {
            const formData = new FormData();
            formData.append('function', 'getSystemActivity');
            formData.append('limit', 5);
            formData.append('admin_user_id', adminUserId);
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setSystemActivities(data.activities);
                } else if (data.message && data.message.includes("Unauthorized")) {
                    console.error("Admin access denied:", data.message);
                }
            }
        } catch (error) {
            console.error('Error fetching system activities:', error);
        }
    };

    // Handle quick actions
    const handleQuickAction = async (action) => {
        switch (action) {
            case 'generateReports':
                setShowReportModal(true);
                logActivity('Report Generation Initiated', 'Administrator opened report generation modal');
                break;
            case 'runBackup':
                setShowBackupModal(true);
                logActivity('Backup Initiated', 'Administrator opened backup modal');
                break;
            default:
                break;
        }
    };

    // Generate report function
 const generateReport = async () => {
    try {
        setGenerating(true);
        setActionMessage('Generating report...');

        const formData = new FormData();
        formData.append('function', 'generateReport');
        formData.append('admin_user_id', adminUserId);
        formData.append('report_type', reportForm.report_type);
        formData.append('date_range', reportForm.date_range);
        
        const response = await fetch(`${API_BASE_URL}/query.php`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            setActionMessage('Report generated! Downloading...');
            
            // Download the CSV file
            const downloadUrl = `${API_BASE_URL}/reports/${data.filename}`;
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = data.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setShowReportModal(false);
            setActionMessage('');
            
        } else {
            setActionMessage('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error generating report:', error);
        setActionMessage('Error generating report');
    } finally {
        setGenerating(false);
    }
};

    // Run backup function
    const runBackup = async () => {
        try {
            setGenerating(true);
            setActionMessage('Creating database backup...');

            const formData = new FormData();
            formData.append('function', 'backupDatabase');
            formData.append('admin_user_id', adminUserId);
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            if (data.success) {
                setActionMessage('Backup created successfully! Download will start shortly...');
                logActivity('Database Backup Created', 'System database backup completed successfully');
                
                // Create download link
                const downloadUrl = `${API_BASE_URL}/backups/${data.filename}`;
                setDownloadUrl(downloadUrl);
                
                // Auto download after 2 seconds
                setTimeout(() => {
                    window.open(downloadUrl, '_blank');
                    setShowBackupModal(false);
                    setActionMessage('');
                    setGenerating(false);
                }, 2000);
            } else {
                setActionMessage('Error: ' + data.message);
                setGenerating(false);
                logActivity('Backup Failed', `Database backup failed: ${data.message}`);
            }
        } catch (error) {
            console.error('Error creating backup:', error);
            setActionMessage('Error creating backup');
            setGenerating(false);
            logActivity('Backup Error', `Backup creation error: ${error.message}`);
        }
    };

    const fetchInvitationAnalytics = async () => {
        try {
            const formData = new FormData();
            formData.append('function', 'getInvitationAnalytics');
            formData.append('admin_user_id', adminUserId);
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setInvitationAnalytics(data.analytics);
                } else if (data.message && data.message.includes("Unauthorized")) {
                    console.error("Admin access denied:", data.message);
                    alert("Admin access denied. Please log in as administrator.");
                }
            }
        } catch (error) {
            console.error('Error fetching invitation analytics:', error);
        }
    };

    const fetchPricingPlans = async () => {
        try {
            const formData = new FormData();
            formData.append('function', 'getAllPackages');
            formData.append('admin_user_id', adminUserId);
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setPricingPlans(data.packages);
                } else if (data.message && data.message.includes("Unauthorized")) {
                    console.error("Admin access denied:", data.message);
                    alert("Admin access denied. Please log in as administrator.");
                }
            }
        } catch (error) {
            console.error('Error fetching pricing plans:', error);
        }
    };

    const fetchRevenueData = async () => {
        try {
            const formData = new FormData();
            formData.append('function', 'getRevenueData');
            formData.append('admin_user_id', adminUserId);
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setRevenueData(data.revenueData);
                } else if (data.message && data.message.includes("Unauthorized")) {
                    console.error("Admin access denied:", data.message);
                }
            }
        } catch (error) {
            console.error('Error fetching revenue data:', error);
        }
    };

    const fetchUsersData = async () => {
        try {
            const formData = new FormData();
            formData.append('function', 'getAllUsers');
            formData.append('admin_user_id', adminUserId);
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
           if (response.ok) {
            const data = await response.json();
            if (data.success) {
                setUsersData(data.users); // ✅ This updates the state that gets passed as props
            }
        }
        } catch (error) {
            console.error('Error fetching users data:', error);
        }
    };

    const fetchAllSystemActivities = async () => {
        try {
            setLogsLoading(true);
            setShowLogsModal(true);
            logActivity('System Logs Viewed', 'Administrator accessed complete system activity logs');
            
            const formData = new FormData();
            formData.append('function', 'getSystemActivity');
            formData.append('admin_user_id', adminUserId);
            formData.append('limit', 1000);
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setAllActivities(data.activities);
                }
            }
        } catch (error) {
            console.error('Error fetching system activities:', error);
        } finally {
            setLogsLoading(false);
        }
    };

    // Handle profile image upload
    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageData = e.target.result;
                setProfileImage(imageData);
                localStorage.setItem('adminProfileImage', imageData);
                logActivity('Profile Image Updated', 'Administrator updated their profile picture');
            };
            reader.readAsDataURL(file);
        }
    };

    // Profile dropdown component
    const ProfileDropdown = () => {
        if (!adminProfile) return null;

        const handleLogout = async () => {
            try {
                logActivity('Admin Logout', 'Administrator signed out of the system');
                
                // Call backend logout if needed
                const formData = new FormData();
                formData.append('function', 'logout');
                formData.append('user_id', adminUserId);
                
                await fetch(`${API_BASE_URL}/query.php`, {
                    method: 'POST',
                    body: formData
                });
            } catch (error) {
                console.error('Logout API error:', error);
            } finally {
                // Clear authentication data but KEEP profile image
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminUser');
                localStorage.removeItem('adminData');
                sessionStorage.clear();
                
                // Redirect to login page
                window.location.href = '/';
            }
        };

        return (
            <div className="profile-dropdown" ref={profileDropdownRef}>
                <div className="profile-dropdown-header">
                    <div className="profile-avatar">
                        {profileImage ? (
                            <img src={profileImage} alt="Profile" />
                        ) : (
                            <div className="avatar-placeholder">
                                <i className="bi bi-person-circle"></i>
                            </div>
                        )}
                    </div>
                    <div className="profile-info">
                        <div className="profile-name">
                            {adminProfile.name} {adminProfile.lastname}
                        </div>
                        <div className="profile-email">{adminProfile.email}</div>
                        <div className="profile-role">Administrator</div>
                    </div>
                </div>
                <div className="profile-dropdown-menu">
                    <button 
                        className="dropdown-item"
                        onClick={() => {
                            setActiveTab("profile");
                            setShowProfileDropdown(false);
                        }}
                    >
                        <i className="bi bi-person"></i>
                        My Profile
                    </button>
                    <button className="dropdown-item">
                        <i className="bi bi-gear"></i>
                        Settings
                    </button>
                    <div className="dropdown-divider"></div>
                    <button 
                        className="dropdown-item logout-btn"
                        onClick={handleLogout}
                    >
                        <i className="bi bi-box-arrow-right"></i>
                        Sign Out
                    </button>
                </div>
            </div>
        );
    };

    // Filter activities based on search and filter
    const filteredActivities = useMemo(() => {
        if (!allActivities || !Array.isArray(allActivities)) return [];
        
        return allActivities.filter(activity => {
            const matchesSearch = logsSearch === '' || 
                activity.action.toLowerCase().includes(logsSearch.toLowerCase()) ||
                activity.description.toLowerCase().includes(logsSearch.toLowerCase()) ||
                (activity.user_name && activity.user_name.toLowerCase().includes(logsSearch.toLowerCase()));
            
            const matchesFilter = logsFilter === 'all' || activity.action === logsFilter;
            
            return matchesSearch && matchesFilter;
        });
    }, [allActivities, logsSearch, logsFilter]);

    // Get action type for styling
    const getActionType = (action) => {
        const actionTypes = {
            'User Login': 'login',
            'User Registered': 'register', 
            'Event Created': 'create',
            'Event Updated': 'update',
            'User Blocked': 'blocked',
            'User Activated': 'activated',
            'Package Updated': 'package'
        };
        return actionTypes[action] || 'default';
    };

    // Export logs function
    const exportLogs = () => {
        const csvContent = "data:text/csv;charset=utf-8," 
            + "User,Action,Description,Date\n"
            + filteredActivities.map(activity => 
                `"${activity.user_name || 'System'}","${activity.action}","${activity.description}","${activity.created_at}"`
            ).join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `system_logs_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        logActivity('Logs Exported', 'System activity logs exported to CSV file');
    };

    // Format dashboard stats for display
    const dashboardStats = useMemo(() => [
        { 
            id: 1, 
            title: "Total Users", 
            value: dashboardData.total_users.toString(), 
            icon: "bi bi-people",
            color: "blue"
        },
        { 
            id: 2, 
            title: "Active Events", 
            value: dashboardData.active_events.toString(), 
            icon: "bi bi-calendar-event",
            color: "green"
        },
        { 
            id: 3, 
            title: "Response Rate", 
            value: `${dashboardData.response_rate}%`, 
            icon: "bi bi-graph-up",
            color: "purple"
        },
        { 
            id: 4, 
            title: "Active Users", 
            value: dashboardData.active_users.toString(), 
            icon: "bi bi-check-circle",
            color: "green"
        },
        { 
            id: 5, 
            title: "Inactive Users", 
            value: dashboardData.inactive_users.toString(), 
            icon: "bi bi-x-circle",
            color: "red"
        }
    ], [dashboardData]);

    const quickActions = useMemo(() => [
        { 
            id: 1, 
            title: "Generate Reports", 
            icon: "bi bi-file-earmark-bar-graph",
            action: 'generateReports'
        },
        { 
            id: 2, 
            title: "Run System Backup", 
            icon: "bi bi-cloud-arrow-up",
            action: 'runBackup'
        }
    ], []);

    // Format recent activities for display
    const recentActivities = useMemo(() => {
        return systemActivities.map(activity => ({
            id: activity.id,
            action: activity.action,
            user: activity.user_name || 'System',
            time: new Date(activity.created_at).toLocaleDateString(),
            icon: "bi bi-activity"
        }));
    }, [systemActivities]);

    // Render different content based on active tab
    const renderContent = () => {
        if (loading) {
            return <div className="loading">Loading...</div>;
        }

        switch(activeTab) {
            case "invitations":
                return <InvitationsTabContent analytics={invitationAnalytics} logActivity={logActivity} adminUserId={adminUserId} />;
            case "pricing":
                return <PricingTabContent plans={pricingPlans} revenueData={revenueData} adminUserId={adminUserId} logActivity={logActivity} />;
            case "users":
                return <UsersTabContent users={usersData} adminUserId={adminUserId} logActivity={logActivity} />;
            case "profile":
                return <ProfileTabContent 
                    adminProfile={adminProfile} 
                    adminUserId={adminUserId} 
                    profileImage={profileImage}
                    onImageUpload={handleImageUpload}
                    onProfileUpdate={fetchAdminProfile}
                    logActivity={logActivity}
                />;
            case "dashboard":
            default:
                return <>
                    {/* Stats Grid */}
                    <section className="admin-dashboard-stats">
                        <div className="admin-dashboard-stats-grid">
                            {dashboardStats.map(stat => (
                                <div key={stat.id} className="admin-dashboard-stat-card" data-color={stat.color}>
                                    <div className="admin-dashboard-stat-icon">
                                        <i className={stat.icon}></i>
                                    </div>
                                    <div className="admin-dashboard-stat-content">
                                        <h3>{stat.title}</h3>
                                        <p>{stat.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Two Column Section - Recent Activity and Quick Actions */}
                    <section className="admin-dashboard-content-grid">
                        {/* Recent Activity Section */}
                        <div className="admin-dashboard-recent-activity">
                            <div className="admin-dashboard-section-header">
                                <h2>System Activity</h2>
                                <button 
                                    className="admin-dashboard-view-all" 
                                    onClick={fetchAllSystemActivities}
                                >
                                    View Logs
                                </button>
                            </div>
                            <div className="admin-dashboard-activity-list">
                                {recentActivities.map(activity => (
                                    <div key={activity.id} className="admin-dashboard-activity-item">
                                        <div className="admin-dashboard-activity-icon">
                                            <i className={activity.icon}></i>
                                        </div>
                                        <div className="admin-dashboard-activity-content">
                                            <h4>{activity.action}</h4>
                                            <p>{activity.user} • {activity.time}</p>
                                        </div>
                                    </div>
                                ))}
                                {recentActivities.length === 0 && (
                                    <div key="no-activities" className="no-activities">No recent activities</div>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions Section */}
                        <div className="admin-dashboard-actions">
                            <div className="admin-dashboard-section-header">
                                <h2>Admin Actions</h2>
                            </div>
                            <div className="admin-dashboard-actions-grid">
                                {quickActions.map(action => (
                                    <button 
                                        key={action.id}
                                        className="admin-dashboard-action-btn"
                                        onClick={() => handleQuickAction(action.action)}
                                        disabled={generating}
                                    >
                                        <i className={action.icon}></i>
                                        <span>{action.title}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>
                </>;
        }
    };

    return (
        <>
            <div className="admin-dashboard-page">
                <div className="admin-dashboard-container">
                    {/* Sidebar Navigation */}
                    <aside className="admin-dashboard-sidebar">
                        <div className="admin-dashboard-logo">
                            <h2>System Management</h2>
                        </div>
                        <nav className="admin-dashboard-nav">
                            <ul>
                                <li 
                                    className={`admin-dashboard-nav-item ${activeTab === "dashboard" ? "active" : ""}`}
                                    onClick={() => setActiveTab("dashboard")}
                                >
                                    <i className="bi bi-speedometer2"></i>
                                    <span>Dashboard</span>
                                </li>
                                <li 
                                    className={`admin-dashboard-nav-item ${activeTab === "invitations" ? "active" : ""}`}
                                    onClick={() => setActiveTab("invitations")}
                                >
                                    <i className="bi bi-envelope"></i>
                                    <span>Invitations</span>
                                </li>
                                <li 
                                    className={`admin-dashboard-nav-item ${activeTab === "pricing" ? "active" : ""}`}
                                    onClick={() => setActiveTab("pricing")}
                                >
                                    <i className="bi bi-tags"></i>
                                    <span>Pricing Plans</span>
                                </li>
                                <li 
                                    className={`admin-dashboard-nav-item ${activeTab === "users" ? "active" : ""}`}
                                    onClick={() => setActiveTab("users")}
                                >
                                    <i className="bi bi-people"></i>
                                    <span>User Management</span>
                                </li>
                            </ul>
                        </nav>
                    </aside>

                    {/* Main Content Area */}
                    <main className="admin-dashboard-main">
                        <header className="admin-dashboard-header">
                            <h1>
                                {activeTab === "dashboard" && "System Dashboard"}
                                {activeTab === "invitations" && "Invitation Analytics"}
                                {activeTab === "pricing" && "Pricing Management"}
                                {activeTab === "users" && "User Administration"}
                            </h1>
                            <div className="admin-header-actions">
                                <div className="profile-section">
                                    <button 
                                        ref={profileTriggerRef}
                                        className="profile-trigger"
                                        onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                                    >
                                        <div className="profile-avatar-sm">
                                            {profileImage ? (
                                                <img src={profileImage} alt="Profile" />
                                            ) : (
                                                <div className="avatar-placeholder-sm">
                                                    <i className="bi bi-person-circle"></i>
                                                </div>
                                            )}
                                        </div>
                                        <span className="profile-name-sm">
                                            {adminProfile ? `${adminProfile.name} ${adminProfile.lastname}` : 'Admin'}
                                        </span>
                                        <i className="bi bi-chevron-down"></i>
                                    </button>
                                    {showProfileDropdown && <ProfileDropdown />}
                                </div>
                            </div>
                        </header>

                        {renderContent()}
                    </main>
                </div>
            </div>

            {/* Generate Reports Modal */}
            {showReportModal && (
                <div className="modal-overlay-new" onClick={() => !generating && setShowReportModal(false)}>
                    <div className="modal-content-new" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-new">
                            <div className="modal-title-section">
                                <div className="modal-icon-large">
                                    <i className="bi bi-file-earmark-bar-graph"></i>
                                </div>
                                <div className="modal-title">
                                    <h2>Generate Report</h2>
                                    <p>Create detailed analytics reports</p>
                                </div>
                            </div>
                            <button 
                                className="close-btn-new"
                                onClick={() => !generating && setShowReportModal(false)}
                                disabled={generating}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="modal-body-new">
                            {!generating ? (
                                <>
                                    <div className="form-group-new">
                                        <label>Report Type</label>
                                        <select 
                                            className="form-select-new"
                                            value={reportForm.report_type}
                                            onChange={(e) => setReportForm(prev => ({...prev, report_type: e.target.value}))}
                                        >
                                            <option value="users">User Analytics</option>
                                            <option value="revenue">Revenue Report</option>
                                            <option value="events">Event Report</option>
                                            <option value="system">System Report</option>
                                        </select>
                                    </div>
                                    <div className="form-group-new">
                                        <label>Date Range</label>
                                        <select 
                                            className="form-select-new"
                                            value={reportForm.date_range}
                                            onChange={(e) => setReportForm(prev => ({...prev, date_range: e.target.value}))}
                                        >
                                            <option value="all">All Time</option>
                                            <option value="today">Today</option>
                                            <option value="week">This Week</option>
                                            <option value="month">This Month</option>
                                            <option value="year">This Year</option>
                                        </select>
                                    </div>
                                    <div className="form-group-new">
                                        <label>Format</label>
                                        <select 
                                            className="form-select-new"
                                            value={reportForm.format}
                                            onChange={(e) => setReportForm(prev => ({...prev, format: e.target.value}))}
                                        >
                                            <option value="pdf">PDF</option>
                                            <option value="csv">CSV</option>
                                            <option value="excel">Excel</option>
                                        </select>
                                    </div>
                                    <div className="modal-actions-new">
                                        <button 
                                            className="action-btn-new primary"
                                            onClick={generateReport}
                                        >
                                            <i className="bi bi-file-earmark-arrow-down"></i>
                                            Generate Report
                                        </button>
                                        <button 
                                            className="action-btn-new secondary"
                                            onClick={() => setShowReportModal(false)}
                                        >
                                            <i className="bi bi-x-circle"></i>
                                            Cancel
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="generating-state-new">
                                    <div className="loading-spinner-new"></div>
                                    <p>{actionMessage}</p>
                                    {downloadUrl && (
                                        <p>Download will start automatically...</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Backup Database Modal */}
            {showBackupModal && (
                <div className="modal-overlay-new" onClick={() => !generating && setShowBackupModal(false)}>
                    <div className="modal-content-new" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-new">
                            <div className="modal-title-section">
                                <div className="modal-icon-large">
                                    <i className="bi bi-cloud-arrow-up"></i>
                                </div>
                                <div className="modal-title">
                                    <h2>Database Backup</h2>
                                    <p>Secure your system data</p>
                                </div>
                            </div>
                            <button 
                                className="close-btn-new"
                                onClick={() => !generating && setShowBackupModal(false)}
                                disabled={generating}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="modal-body-new">
                            {!generating ? (
                                <>
                                    <div className="info-card-new">
                                        <div className="info-icon-new">
                                            <i className="bi bi-info-circle"></i>
                                        </div>
                                        <div className="info-content-new">
                                            <p>This will create a complete backup of your database. The backup file will be downloaded automatically for secure storage.</p>
                                        </div>
                                    </div>
                                    <div className="modal-actions-new">
                                        <button 
                                            className="action-btn-new primary"
                                            onClick={runBackup}
                                        >
                                            <i className="bi bi-database-check"></i>
                                            Start Backup
                                        </button>
                                        <button 
                                            className="action-btn-new secondary"
                                            onClick={() => setShowBackupModal(false)}
                                        >
                                            <i className="bi bi-x-circle"></i>
                                            Cancel
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="generating-state-new">
                                    <div className="loading-spinner-new"></div>
                                    <p>{actionMessage}</p>
                                    {downloadUrl && (
                                        <p>Download will start automatically...</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )} 

            {/* System Logs Modal */}
            {showLogsModal && (
                <div className="modal-overlay-new" onClick={() => setShowLogsModal(false)}>
                    <div className="modal-content-new logs-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-new">
                            <div className="modal-title-section">
                                <div className="modal-icon-large">
                                    <i className="bi bi-journal-text"></i>
                                </div>
                                <div className="modal-title">
                                    <h2>System Activity Logs</h2>
                                    <p>Complete history of system activities</p>
                                </div>
                            </div>
                            <button 
                                className="close-btn-new"
                                onClick={() => setShowLogsModal(false)}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="modal-body-new">
                            {/* Search and Filter Controls */}
                            <div className="logs-controls">
                                <div className="search-box">
                                    <i className="bi bi-search"></i>
                                    <input
                                        type="text"
                                        placeholder="Search activities..."
                                        value={logsSearch}
                                        onChange={(e) => setLogsSearch(e.target.value)}
                                        className="search-input"
                                    />
                                </div>
                                <div className="filter-controls">
                                    <select 
                                        value={logsFilter}
                                        onChange={(e) => setLogsFilter(e.target.value)}
                                        className="filter-select"
                                    >
                                        <option value="all">All Activities</option>
                                        <option value="User Login">User Logins</option>
                                        <option value="Event Created">Event Created</option>
                                        <option value="Event Updated">Event Updated</option>
                                        <option value="User Registered">User Registered</option>
                                        <option value="User Blocked">User Blocked</option>
                                        <option value="User Activated">User Activated</option>
                                        <option value="Package Updated">Package Updated</option>
                                    </select>
                                </div>
                                <button className="export-btn" onClick={exportLogs}>
                                    <i className="bi bi-download"></i> Export
                                </button>
                            </div>

                            {/* Logs Table */}
                            {logsLoading ? (
                                <div className="loading-container">
                                    <div className="spinner-border text-info" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                    <div className="loading-text">Loading system logs...</div>
                                </div>
                            ) : (
                                <div className="logs-table-container">
                                    <div className="table-header">
                                        <span>User</span>
                                        <span>Action</span>
                                        <span>Description</span>
                                        <span>Date & Time</span>
                                    </div>
                                    
                                    <div className="table-body">
                                        {filteredActivities.length > 0 ? (
                                            filteredActivities.map(activity => (
                                                <div key={activity.id} className="table-row">
                                                    <span className="user-cell">
                                                        {activity.user_name || 'System'}
                                                    </span>
                                                    <span>
                                                        <span className={`action-badge ${getActionType(activity.action)}`}>
                                                            {activity.action}
                                                        </span>
                                                    </span>
                                                    <span className="description-cell">
                                                        {activity.description}
                                                    </span>
                                                    <span className="date-cell">
                                                        {new Date(activity.created_at).toLocaleString()}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <div key="no-logs" className="no-logs">
                                                <i className="bi bi-inbox"></i>
                                                <p>No system activities found</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </>
    );
}

// Profile Tab Component with Logging
const ProfileTabContent = ({ adminProfile, adminUserId, profileImage, onImageUpload, onProfileUpdate, logActivity }) => {
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        lastname: '',
        email: '',
        username: '',
        title: 'Administrator',
        language: 'English'
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';

    useEffect(() => {
        if (adminProfile) {
            setFormData({
                name: adminProfile.name || '',
                lastname: adminProfile.lastname || '',
                email: adminProfile.email || '',
                username: adminProfile.email?.split('@')[0] || '',
                title: 'Administrator',
                language: 'English'
            });
        }
    }, [adminProfile]);

    // Auto-hide message after 5 seconds
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                setMessage('');
                setMessageType('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSaveProfile = async () => {
        try {
            setLoading(true);
            setMessage('');

            const formDataToSend = new FormData();
            formDataToSend.append('function', 'updateAdminProfile');
            formDataToSend.append('admin_user_id', adminUserId);
            formDataToSend.append('name', formData.name);
            formDataToSend.append('lastname', formData.lastname);
            formDataToSend.append('email', formData.email);
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formDataToSend
            });
            
            const data = await response.json();
            if (data.success) {
                setMessage('Profile updated successfully!');
                setMessageType('success');
                setEditMode(false);
                onProfileUpdate();
                logActivity('Profile Updated', 'Administrator updated their profile information');
            } else {
                setMessage(data.message || 'Error updating profile');
                setMessageType('error');
                logActivity('Profile Update Failed', `Failed to update profile: ${data.message}`);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage('Error updating profile');
            setMessageType('error');
            logActivity('Profile Update Error', `Profile update error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!adminProfile) {
        return <div className="loading">Loading profile...</div>;
    }

    return (
        <div className="admin-tab-content">
            <div className="admin-content-header">
                <h2>My Profile</h2>
                <div className="header-actions">
                    {!editMode ? (
                        <button 
                            className="btn btn-primary"
                            onClick={() => setEditMode(true)}
                        >
                            <i className="bi bi-pencil"></i> Edit Profile
                        </button> 
                    ) : (
                        <div className="edit-actions">
                            <button 
                                className="btn btn-success"
                                onClick={handleSaveProfile}
                                disabled={loading}
                            >
                                <i className="bi bi-check"></i> Save Changes
                            </button>
                            <button 
                                className="btn btn-outline"
                                onClick={() => {
                                    setEditMode(false);
                                    setMessage(''); 
                                    setMessageType('');
                                }}
                                disabled={loading}
                            >
                                <i className="bi bi-x"></i> Cancel
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {message && (
                <div className={`message ${messageType}`}>
                    {message}
                    <button 
                        className="message-close"
                        onClick={() => {
                            setMessage('');
                            setMessageType('');
                        }}
                    >
                        <i className="bi bi-x"></i>
                    </button>
                </div>
            )}

            <div className="profile-content">
                <div className="profile-avatar-section">
                    <div className="avatar-upload">
                        <div className="avatar-preview">
                            {profileImage ? (
                                <img src={profileImage} alt="Profile" className="avatar-image" />
                            ) : (
                                <div className="avatar-placeholder-large">
                                    <i className="bi bi-person-circle"></i>
                                </div>
                            )}
                        </div>
                        <div className="avatar-upload-info">
                            <h4>Profile Picture</h4>
                            <p>upload your own...</p>
                            <div className="upload-area">
                                <input 
                                    type="file" 
                                    id="avatar-upload"
                                    accept="image/*"
                                    onChange={onImageUpload}
                                    style={{ display: 'none' }}
                                />
                                <label htmlFor="avatar-upload" className="upload-label">
                                    <i className="bi bi-cloud-arrow-up"></i>
                                    <span>Drop your files here or click in this area</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="profile-form-section">
                    <div className="form-section">
                        <h3>Account</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Username</label>
                                <input 
                                    type="text" 
                                    value={formData.username}
                                    onChange={(e) => handleInputChange('username', e.target.value)}
                                    disabled={!editMode}
                                    className={!editMode ? 'disabled' : ''}
                                />
                            </div>
                            <div className="form-group">
                                <label>Email *</label>
                                <input 
                                    type="email" 
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    disabled={!editMode}
                                    className={!editMode ? 'disabled' : ''}
                                />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <div className="password-field">
                                    <input 
                                        type="password" 
                                        value="••••••••"
                                        disabled
                                        className="disabled"
                                    />
                                    <button className="btn-text" disabled={!editMode}>
                                        Change
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Full Name *</label>
                                <input 
                                    type="text" 
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    disabled={!editMode}
                                    className={!editMode ? 'disabled' : ''}
                                />
                            </div>
                            <div className="form-group">
                                <label>Last Name</label>
                                <input 
                                    type="text" 
                                    value={formData.lastname}
                                    onChange={(e) => handleInputChange('lastname', e.target.value)}
                                    disabled={!editMode}
                                    className={!editMode ? 'disabled' : ''}
                                />
                            </div>
                            <div className="form-group">
                                <label>Title</label>
                                <input 
                                    type="text" 
                                    value={formData.title}
                                    onChange={(e) => handleInputChange('title', e.target.value)}
                                    disabled={!editMode}
                                    className={!editMode ? 'disabled' : ''}
                                />
                            </div>
                            <div className="form-group">
                                <label>Language</label>
                                <select 
                                    value={formData.language}
                                    onChange={(e) => handleInputChange('language', e.target.value)}
                                    disabled={!editMode}
                                    className={!editMode ? 'disabled' : ''}
                                >
                                    <option value="English">English</option>
                                    <option value="Spanish">Spanish</option>
                                    <option value="French">French</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Enhanced Invitations Tab Content with proper data fetching
const InvitationsTabContent = ({ analytics, logActivity, adminUserId }) => {
    const [invitationStats, setInvitationStats] = useState({
        total_invitations: 0,
        open_rate: 0,
        response_rate: 0
    });
    const [statsLoading, setStatsLoading] = useState(true); // Add separate loading state
    const [enhancedAnalytics, setEnhancedAnalytics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [sortField, setSortField] = useState('eventName');
    const [sortDirection, setSortDirection] = useState('asc');
    const [filters, setFilters] = useState({
        eventType: 'all',
        eventStatus: 'all'
    });
    const [showExportModal, setShowExportModal] = useState(false);
    
    // ADD ALL THE MISSING STATES:
    const [exportFilters, setExportFilters] = useState({
        event_type: 'all',
        status: 'all',
        user_id: ''
    });
    
    const [users, setUsers] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showEventModal, setShowEventModal] = useState(false);

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';

    // Fetch data when component mounts
    useEffect(() => {
        fetchInvitationStats();
        fetchInvitationAnalytics();
        fetchUsers();
    }, []);

    const fetchInvitationStats = async () => {
    try {
        setStatsLoading(true);
        console.log('Fetching invitation stats...');
        
        const formData = new FormData();
        formData.append('function', 'getInvitationStats');
        formData.append('admin_user_id', adminUserId);
        
        const response = await fetch(`${API_BASE_URL}/query.php`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Stats API Response:', data);
        
        if (data.success && data.stats) {
            setInvitationStats(data.stats);
        } else {
            console.error('API Error:', data.message);
            // Keep default values (0, 0, 0)
        }
    } catch (error) {
        console.error('Network Error:', error);
        // Keep default values (0, 0, 0)
    } finally {
        setStatsLoading(false);
    }
};

    const fetchInvitationAnalytics = async () => {

        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('function', 'getInvitationAnalytics');
            formData.append('admin_user_id', adminUserId);
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setEnhancedAnalytics(data.analytics);
                }
            }
        } catch (error) {
            console.error('Error fetching invitation analytics:', error);
        } finally {
            setLoading(false);
        }
    };
 /*   const fetchEnhancedAnalytics = async () => {
        try {
            const formData = new FormData();
            formData.append('function', 'getEnhancedInvitationAnalytics');
            formData.append('admin_user_id', adminUserId);
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setEnhancedAnalytics(data.analytics);
                }
            }
        } catch (error) {
            console.error('Error fetching enhanced analytics:', error);
        }
    };
    
*/

    const fetchUsers = async () => {
        try {
            const formData = new FormData();
            formData.append('function', 'getAllUsers');
            formData.append('admin_user_id', adminUserId);
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setUsers(data.users);
                }
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleFilterChange = (filterType, value) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

const handleExport = async () => {
    try {
        setLoading(true);
        const formData = new FormData();
        formData.append('function', 'exportInvitationData');
        formData.append('admin_user_id', adminUserId);
        formData.append('status', exportFilters.status);
        formData.append('user_id', exportFilters.user_id);
        
        const response = await fetch(`${API_BASE_URL}/query.php`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (data.success) {
            // Fix the download URL - use the correct path
            const downloadUrl = `${API_BASE_URL}/exports/${data.filename}`;
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = data.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setShowExportModal(false);
            logActivity('Invitation Data Exported', 'Exported invitation analytics to CSV');
            alert('Export downloaded successfully!');
        } else {
            alert('Error exporting data: ' + data.message);
            logActivity('Export Failed', `Failed to export invitation data: ${data.message}`);
        }
    } catch (error) {
        console.error('Error exporting data:', error);
        alert('Error exporting data');
        logActivity('Export Error', `Invitation data export error: ${error.message}`);
    } finally {
        setLoading(false);
    }
};

    const viewEventDetails = (event) => {
        setSelectedEvent(event);
        setShowEventModal(true);
        logActivity('Event Details Viewed', `Viewed invitation analytics for: ${event.eventName}`);
    };

    const refreshData = async () => {
        setLoading(true);
        await Promise.all([
            fetchInvitationStats(),
            fetchInvitationAnalytics()
        ]);
        setLoading(false);
        logActivity('Invitation Data Refreshed', 'Refreshed invitation analytics data');
    };

    // Sort and filter analytics
    const sortedAnalytics = useMemo(() => {
        if (!analytics || !Array.isArray(analytics)) return [];
        
        return [...analytics].sort((a, b) => {
            let aValue = a[sortField];
            let bValue = b[sortField];
            
            if (sortField === 'responseRate') {
                aValue = parseFloat(aValue) || 0;
                bValue = parseFloat(bValue) || 0;
            }
            
            if (sortField === 'sent' || sortField === 'opened' || sortField === 'responded') {
                aValue = parseInt(aValue) || 0;
                bValue = parseInt(bValue) || 0;
            }
            
            if (sortDirection === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });
    }, [analytics, sortField, sortDirection]);

    const filteredAnalytics = useMemo(() => {
        if (!sortedAnalytics) return [];
        
        return sortedAnalytics.filter(item => {
            if (filters.eventStatus !== 'all' && item.status !== filters.eventStatus) {
                return false;
            }
            return true;
        });
    }, [sortedAnalytics, filters]);

    const getSortIcon = (field) => {
        if (sortField !== field) return '';
        return sortDirection === 'asc' ? '↑' : '↓';
    };

    return (
        <div className="admin-tab-content">
            <div className="admin-content-header">
                <h2>Invitation Performance Analytics</h2>
                <div className="header-actions">
                    <button 
                        className="btn btn-outline" 
                        onClick={refreshData}
                        disabled={loading}
                    >
                        <i className="bi bi-arrow-clockwise"></i> Refresh
                    </button>
                    <button 
                        className="btn btn-primary"
                        onClick={() => setShowExportModal(true)}
                    >
                        <i className="bi bi-download"></i> Export Data
                    </button>
                </div>
            </div>

            {loading && <div className="loading">Loading invitation data...</div>}

           {/* Analytics Overview Cards */}
<div className="analytics-overview">
    <div className="analytics-card">
        <div className="analytics-icon">
            <i className="bi bi-envelope"></i>
        </div>
        <div className="analytics-content">
            <h3>Total Invitations Sent</h3>
            {statsLoading ? (
                <div className="stats-loading">Loading...</div>
            ) : (
                <p className="analytics-number">
                    {invitationStats.total_invitations?.toLocaleString() || 0}
                </p>
            )}
            <span className="analytics-trend">All events</span>
        </div>
    </div>
    
    <div className="analytics-card">
        <div className="analytics-icon">
            <i className="bi bi-eye"></i>
        </div>
        <div className="analytics-content">
            <h3>Average Open Rate</h3>
            {statsLoading ? (
                <div className="stats-loading">Loading...</div>
            ) : (
                <p className="analytics-number">
                    {invitationStats.open_rate || 0}%
                </p>
            )}
            <span className="analytics-trend">Based on responses</span>
        </div>
    </div>
    
    <div className="analytics-card">
        <div className="analytics-icon">
            <i className="bi bi-check-circle"></i>
        </div>
        <div className="analytics-content">
            <h3>Average Response Rate</h3>
            {statsLoading ? (
                <div className="stats-loading">Loading...</div>
            ) : (
                <p className="analytics-number">
                    {invitationStats.response_rate || 0}%
                </p>
            )}
            <span className="analytics-trend">All events</span>
        </div>
    </div>
</div>

            {/* Analytics Table */}
            <div className="analytics-table">
                <div className="table-header">
                    <span className="sortable" onClick={() => handleSort('eventName')}>
                        Event Name {getSortIcon('eventName')}
                    </span>
                    <span className="sortable" onClick={() => handleSort('sent')}>
                        Sent {getSortIcon('sent')}
                    </span>
                    <span className="sortable" onClick={() => handleSort('opened')}>
                        Opened {getSortIcon('opened')}
                    </span>
                    <span className="sortable" onClick={() => handleSort('responded')}>
                        Responses {getSortIcon('responded')}
                    </span>
                    <span className="sortable" onClick={() => handleSort('responseRate')}>
                        Response Rate {getSortIcon('responseRate')}
                    </span>
                    <span>Status</span>
                    <span>Actions</span>
                </div>
                
                <div className="table-body">
                    {filteredAnalytics.map((item, index) => (
                        <div key={index} className="table-row">
                            <span className="event-name">{item.eventName}</span>
                            <span>{item.sent}</span>
                            <span>{item.opened}</span>
                            <span>{item.responded}</span>
                            <span>
                                <span className={`response-rate ${parseInt(item.responseRate) > 50 ? 'high' : parseInt(item.responseRate) > 25 ? 'medium' : 'low'}`}>
                                    {item.responseRate}
                                </span>
                            </span>
                            <span>
                                <span className={`status-badge ${item.status}`}>
                                    {item.status}
                                </span>
                            </span>
                            <span>
                                <button 
                                    className="btn-icon" 
                                    title="View Details"
                                    onClick={() => viewEventDetails(item)}
                                >
                                    <i className="bi bi-eye"></i>
                                </button>
                            </span>
                        </div>
                    ))}
                    {(!analytics || analytics.length === 0) && (
                        <div className="no-data">
                            <p>No invitation data available. Create events and send invitations to see analytics.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Event Details Modal */}
            {showEventModal && selectedEvent && (
                <div className="modal-overlay-new" onClick={() => setShowEventModal(false)}>
                    <div className="modal-content-new" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-new">
                            <div className="modal-title-section">
                                <div className="modal-icon-large">
                                    <i className="bi bi-calendar-event"></i>
                                </div>
                                <div className="modal-title">
                                    <h2>{selectedEvent.eventName}</h2>
                                    <p>Invitation Performance Details</p>
                                </div>
                            </div>
                            <button 
                                className="close-btn-new"
                                onClick={() => setShowEventModal(false)}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="modal-body-new">
                            <div className="event-details-grid">
                                <div className="detail-card">
                                    <div className="detail-icon">
                                        <i className="bi bi-envelope"></i>
                                    </div>
                                    <div className="detail-content">
                                        <label>Invitations Sent</label>
                                        <p className="detail-value">{selectedEvent.sent}</p>
                                    </div>
                                </div>
                                
                                <div className="detail-card">
                                    <div className="detail-icon">
                                        <i className="bi bi-eye"></i>
                                    </div>
                                    <div className="detail-content">
                                        <label>Invitations Opened</label>
                                        <p className="detail-value">{selectedEvent.opened}</p>
                                    </div>
                                </div>
                                
                                <div className="detail-card">
                                    <div className="detail-icon">
                                        <i className="bi bi-check-circle"></i>
                                    </div>
                                    <div className="detail-content">
                                        <label>Responses Received</label>
                                        <p className="detail-value">{selectedEvent.responded}</p>
                                    </div>
                                </div>
                                
                                <div className="detail-card">
                                    <div className="detail-icon">
                                        <i className="bi bi-graph-up"></i>
                                    </div>
                                    <div className="detail-content">
                                        <label>Response Rate</label>
                                        <p className="detail-value highlight">{selectedEvent.responseRate}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="modal-actions">
                                <button 
                                    className="action-btn secondary"
                                    onClick={() => setShowEventModal(false)}
                                >
                                    <i className="bi bi-x-circle"></i>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Export Modal */}
            {showExportModal && (
                <div className="modal-overlay-new" onClick={() => setShowExportModal(false)}>
                    <div className="modal-content-new" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-new">
                            <div className="modal-title-section">
                                <div className="modal-icon-large">
                                    <i className="bi bi-download"></i>
                                </div>
                                <div className="modal-title">
                                    <h2>Export Invitation Data</h2>
                                    <p>Export invitation analytics and performance data</p>
                                </div>
                            </div>
                            <button 
                                className="close-btn-new"
                                onClick={() => setShowExportModal(false)}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="modal-body-new">
                            <div className="form-group-new">
                                <label>Event Status</label>
                                <select 
                                    className="form-select-new"
                                    value={exportFilters.status}
                                    onChange={(e) => setExportFilters(prev => ({...prev, status: e.target.value}))}
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="active">Active Only</option>
                                    <option value="draft">Draft Only</option>
                                </select>
                            </div>
                            <div className="form-group-new">
                                <label>Specific User (Optional)</label>
                                <select 
                                    className="form-select-new"
                                    value={exportFilters.user_id}
                                    onChange={(e) => setExportFilters(prev => ({...prev, user_id: e.target.value}))}
                                >
                                    <option value="">All Users</option>
                                    {users.map(user => (
                                        <option key={user.user_id} value={user.user_id}>
                                            {user.name} ({user.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="modal-actions-new">
                                <button 
                                    className="action-btn-new primary"
                                    onClick={handleExport}
                                    disabled={loading}
                                >
                                    <i className="bi bi-file-earmark-arrow-down"></i>
                                    Export to CSV
                                </button>
                                <button 
                                    className="action-btn-new secondary"
                                    onClick={() => setShowExportModal(false)}
                                >
                                    <i className="bi bi-x-circle"></i>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Enhanced Pricing Tab Content with Logging
const PricingTabContent = ({ plans, adminUserId, logActivity }) => {
    const [activeSection, setActiveSection] = useState('plans');
    const [editingPlan, setEditingPlan] = useState(null);
    const [editForm, setEditForm] = useState({
        package_type: '',
        max_guests: '',
        max_events: '',
        price: ''
    });
    const [allPlans, setAllPlans] = useState(plans);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [revenueAnalytics, setRevenueAnalytics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showManualPayment, setShowManualPayment] = useState(false);
    const [manualPaymentForm, setManualPaymentForm] = useState({
        user_id: '',
        package_id: '',
        amount: '',
        payment_method: 'manual',
        billing_cycle: 'monthly'
    });
    const [users, setUsers] = useState([]);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [packageFilter, setPackageFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [sortBy, setSortBy] = useState('payment_date');
    const [sortOrder, setSortOrder] = useState('desc');
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // New states for real data
    const [activeSubscriptions, setActiveSubscriptions] = useState({});
    const [packageUsageStats, setPackageUsageStats] = useState([]);

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';

    useEffect(() => {
        if (activeSection === 'payments') {
            fetchPaymentHistory();
            fetchRevenueAnalytics();
            fetchUsers();
            logActivity('Payments Tab Viewed', 'Administrator viewed payment history and revenue analytics');
        } else if (activeSection === 'plans') {
            fetchActiveSubscriptions();
            fetchPackageUsageStats();
        }
    }, [activeSection]);

    const fetchPaymentHistory = async () => {
        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('function', 'getPaymentHistory');
            formData.append('admin_user_id', adminUserId);
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setPaymentHistory(data.payments);
                }
            }
        } catch (error) {
            console.error('Error fetching payment history:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRevenueAnalytics = async () => {
        try {
            const formData = new FormData();
            formData.append('function', 'getRevenueAnalytics');
            formData.append('admin_user_id', adminUserId);
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setRevenueAnalytics(data.analytics);
                }
            }
        } catch (error) {
            console.error('Error fetching revenue analytics:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const formData = new FormData();
            formData.append('function', 'getAllUsers');
            formData.append('admin_user_id', adminUserId);
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setUsers(data.users);
                }
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    // New fetch functions for real data
    const fetchActiveSubscriptions = async () => {
        try {
            const formData = new FormData();
            formData.append('function', 'getActiveSubscriptions');
            formData.append('admin_user_id', adminUserId);
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Convert array to object for easy lookup
                    const subscriptionsObj = {};
                    data.subscriptions.forEach(sub => {
                        subscriptionsObj[sub.package_type] = sub.active_subscriptions;
                    });
                    setActiveSubscriptions(subscriptionsObj);
                }
            }
        } catch (error) {
            console.error('Error fetching active subscriptions:', error);
        }
    };

    const fetchPackageUsageStats = async () => {
        try {
            const formData = new FormData();
            formData.append('function', 'getPackageUsageStats');
            formData.append('admin_user_id', adminUserId);
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setPackageUsageStats(data.usage_stats);
                }
            }
        } catch (error) {
            console.error('Error fetching package usage stats:', error);
        }
    };

    const filteredPayments = useMemo(() => {
        if (!paymentHistory || !Array.isArray(paymentHistory)) return [];
        
        let filtered = [...paymentHistory];
        
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(payment => 
                (payment.user_name && payment.user_name.toLowerCase().includes(query)) ||
                (payment.user_email && payment.user_email.toLowerCase().includes(query)) ||
                (payment.transaction_id && payment.transaction_id.toLowerCase().includes(query)) ||
                (payment.package_type && payment.package_type.toLowerCase().includes(query))
            );
        }
        
        if (statusFilter !== 'all') {
            filtered = filtered.filter(payment => payment.payment_status === statusFilter);
        }
        
        if (packageFilter !== 'all') {
            filtered = filtered.filter(payment => payment.package_type === packageFilter);
        }
        
        if (dateFilter !== 'all') {
            const now = new Date();
            filtered = filtered.filter(payment => {
                const paymentDate = new Date(payment.payment_date);
                
                switch (dateFilter) {
                    case 'today':
                        return paymentDate.toDateString() === now.toDateString();
                    case 'week':
                        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        return paymentDate >= weekAgo;
                    case 'month':
                        const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
                        return paymentDate >= monthAgo;
                    case 'year':
                        const yearAgo = new Date(now.getFullYear(), 0, 1);
                        return paymentDate >= yearAgo;
                    default:
                        return true;
                }
            });
        }
        
        filtered.sort((a, b) => {
            let aValue = a[sortBy];
            let bValue = b[sortBy];
            
            if (sortBy === 'amount') {
                aValue = parseFloat(aValue) || 0;
                bValue = parseFloat(bValue) || 0;
            } else if (sortBy === 'payment_date') {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            } else {
                aValue = String(aValue || '').toLowerCase();
                bValue = String(bValue || '').toLowerCase();
            }
            
            if (sortOrder === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });
        
        return filtered;
    }, [paymentHistory, searchQuery, statusFilter, packageFilter, dateFilter, sortBy, sortOrder]);

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('desc');
        }
    };

    const viewPaymentDetails = (payment) => {
        setSelectedPayment(payment);
        setShowPaymentModal(true);
        logActivity('Payment Details Viewed', `Viewed payment details for transaction: ${payment.transaction_id}`);
    };

    const startEditing = (plan) => {
        setEditingPlan(plan.package_id);
        setEditForm({
            package_type: plan.package_type || '',
            max_guests: plan.max_guests || '',
            max_events: plan.max_events || '',
            price: plan.price || ''
        });
    };

    const cancelEditing = () => {
        setEditingPlan(null);
        setEditForm({
            package_type: '',
            max_guests: '',
            max_events: '',
            price: ''
        });
    };

    const handleEditChange = (field, value) => {
        setEditForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const savePackage = async (packageId) => {
        try {
            const formData = new FormData();
            formData.append('function', 'updatePackage');
            formData.append('package_id', packageId);
            formData.append('package_type', editForm.package_type);
            formData.append('max_guests', editForm.max_guests);
            formData.append('max_events', editForm.max_events);
            formData.append('price', editForm.price);
            formData.append('admin_user_id', adminUserId);
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            if (data.success) {
                setAllPlans(prevPlans => 
                    prevPlans.map(plan => 
                        plan.package_id === packageId 
                            ? { ...plan, ...editForm }
                            : plan
                    )
                );
                setEditingPlan(null);
                // Refresh subscription data
                fetchActiveSubscriptions();
                fetchPackageUsageStats();
                logActivity('Package Updated', 
                    `Updated ${editForm.package_type} package: ${editForm.max_events} events, ${editForm.max_guests} guests, R${editForm.price}`
                );
                alert('Package updated successfully!');
            } else {
                if (data.message && data.message.includes("Unauthorized")) {
                    alert('Access denied: Admin privileges required');
                } else {
                    alert('Error updating package: ' + data.message);
                }
                logActivity('Package Update Failed', `Failed to update package: ${data.message}`);
            }
        } catch (error) {
            console.error('Error updating package:', error);
            alert('Error updating package');
            logActivity('Package Update Error', `Package update error: ${error.message}`);
        }
    };

    const handleManualPayment = async () => {
        try {
            const formData = new FormData();
            formData.append('function', 'addManualPayment');
            formData.append('admin_user_id', adminUserId);
            formData.append('user_id', manualPaymentForm.user_id);
            formData.append('package_id', manualPaymentForm.package_id);
            formData.append('amount', manualPaymentForm.amount);
            formData.append('payment_method', manualPaymentForm.payment_method);
            formData.append('billing_cycle', manualPaymentForm.billing_cycle);
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });

            
            
            const data = await response.json();
            if (data.success) {
                logActivity('Manual Payment Added', 
                    `Manual payment of R${manualPaymentForm.amount} processed for user ${manualPaymentForm.user_id}`
                );
                alert('Manual payment added successfully!');
                setShowManualPayment(false);
                setManualPaymentForm({
                    user_id: '',
                    package_id: '',
                    amount: '',
                    payment_method: 'manual',
                    billing_cycle: 'monthly'
                });
                // Refresh data
                fetchPaymentHistory();
                fetchRevenueAnalytics();
                fetchActiveSubscriptions();
                fetchPackageUsageStats();
            } else {
                alert('Error adding payment: ' + data.message);
                logActivity('Manual Payment Failed', `Failed to add manual payment: ${data.message}`);
            }
        } catch (error) {
            console.error('Error adding manual payment:', error);
            alert('Error adding manual payment');
            logActivity('Manual Payment Error', `Manual payment error: ${error.message}`);
        }
    };

    const updatePaymentStatus = async (paymentId, status) => {
        try {
            const formData = new FormData();
            formData.append('function', 'updatePaymentStatus');
            formData.append('admin_user_id', adminUserId);
            formData.append('payment_id', paymentId);
            formData.append('status', status);
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            if (data.success) {
                logActivity('Payment Status Updated', `Payment ${paymentId} status changed to ${status}`);
                alert('Payment status updated successfully!');
                fetchPaymentHistory();
                fetchRevenueAnalytics();
            } else {
                alert('Error updating status: ' + data.message);
                logActivity('Payment Status Update Failed', `Failed to update payment status: ${data.message}`);
            }
        } catch (error) {
            console.error('Error updating payment status:', error);
            alert('Error updating payment status');
            logActivity('Payment Status Update Error', `Payment status update error: ${error.message}`);
        }
    };

    const formatPlanName = (packageType) => {
        if (!packageType) return 'Unknown';
        return packageType.charAt(0).toUpperCase() + packageType.slice(1);
    };

    // Real subscription count function
    const getActiveSubscriptions = (packageType) => {
        return activeSubscriptions[packageType] || 0;
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-ZA', {
            style: 'currency',
            currency: 'ZAR'
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    const getStatusBadgeClass = (status) => {
        const statusClasses = {
            'completed': 'status-completed',
            'pending': 'status-pending',
            'failed': 'status-failed',
            'refunded': 'status-refunded'
        };
        return statusClasses[status] || 'status-pending';
    };

    return (
        <div className="admin-tab-content">
            <div className="admin-content-header">
                <h2>Pricing & Payments Management</h2>
                <div className="header-actions">
                    <div className="tab-buttons">
                        <button 
                            className={`tab-button ${activeSection === 'plans' ? 'active' : ''}`}
                            onClick={() => setActiveSection('plans')}
                        >
                            Pricing Plans
                        </button>
                        <button 
                            className={`tab-button ${activeSection === 'payments' ? 'active' : ''}`}
                            onClick={() => setActiveSection('payments')}
                        >
                            Payment History
                        </button>
                    </div>
                </div>
            </div>

            {activeSection === 'plans' ? (
                <div className="pricing-plans-grid">
                    {allPlans.map(plan => (
                        <div key={plan.package_id} className="pricing-plan-card">
                            <div className="plan-header">
                                <h3>
                                    {editingPlan === plan.package_id ? (
                                        <select 
                                            value={editForm.package_type} 
                                            onChange={(e) => handleEditChange('package_type', e.target.value)}
                                            className="form-control-sm"
                                        >
                                            <option value="basic">Basic</option>
                                            <option value="premium">Premium</option>
                                            <option value="enterprise">Enterprise</option>
                                        </select>
                                    ) : (
                                        formatPlanName(plan.package_type)
                                    )}
                                </h3>
                                <span className="plan-status active">Active</span>
                            </div>
                            
                            <div className="plan-price">
                                {editingPlan === plan.package_id ? (
                                    <div className="price-edit">
                                        <span className="price-prefix">R</span>
                                        <input 
                                            type="number" 
                                            value={editForm.price} 
                                            onChange={(e) => handleEditChange('price', e.target.value)}
                                            className="form-control-sm"
                                            step="0.01"
                                            min="0"
                                            style={{width: '80px'}}
                                        />
                                        <span className="price-interval">/monthly</span>
                                    </div>
                                ) : (
                                    <>
                                        <span className="price-amount">R{plan.price || '0.00'}</span>
                                        <span className="price-interval">/monthly</span>
                                    </>
                                )}
                            </div>
                            
                            <div className="plan-subscriptions">
                                <i className="bi bi-people"></i>
                                <span>{getActiveSubscriptions(plan.package_type)} active subscriptions</span>
                            </div>
                            
                            <div className="plan-features">
                                <h4>Features & Usage:</h4>
                                <ul>
                                    <li>
                                        {editingPlan === plan.package_id ? (
                                            <input 
                                                type="number" 
                                                value={editForm.max_guests} 
                                                onChange={(e) => handleEditChange('max_guests', e.target.value)}
                                                className="form-control-sm"
                                                placeholder="Max Guests"
                                                style={{width: '120px'}}
                                            />
                                        ) : (
                                            `${plan.max_guests || 0} guests/event`
                                        )}
                                    </li>
                                    <li>
                                        {editingPlan === plan.package_id ? (
                                            <input 
                                                type="number" 
                                                value={editForm.max_events} 
                                                onChange={(e) => handleEditChange('max_events', e.target.value)}
                                                className="form-control-sm"
                                                placeholder="Max Events"
                                                style={{width: '120px'}}
                                            />
                                        ) : (
                                            `${plan.max_events || 0} events/month`
                                        )}
                                    </li>
                                    <li>
                                        <strong>Active Users:</strong> {getActiveSubscriptions(plan.package_type)}
                                    </li>
                                    {packageUsageStats.find(stat => stat.package_id === plan.package_id) && (
                                        <li>
                                            <strong>Avg Usage:</strong> {Math.round(packageUsageStats.find(stat => stat.package_id === plan.package_id)?.avg_events_used || 0)} events
                                        </li>
                                    )}
                                    <li>Premium templates</li>
                                    <li>Email support</li>
                                    {plan.package_type === 'premium' && <li>Custom branding</li>}
                                    {plan.package_type === 'enterprise' && <li>Advanced analytics</li>}
                                    {plan.package_type === 'enterprise' && <li>API access</li>}
                                </ul>
                            </div>
                            
                            <div className="plan-actions">
                                {editingPlan === plan.package_id ? (
                                    <>
                                        <button 
                                            className="btn btn-success btn-sm"
                                            onClick={() => savePackage(plan.package_id)}
                                        >
                                            <i className="bi bi-check"></i> Save
                                        </button>
                                        <button 
                                            className="btn btn-outline btn-sm"
                                            onClick={cancelEditing}
                                        >
                                            <i className="bi bi-x"></i> Cancel
                                        </button>
                                    </>
                                ) : (
                                    <button 
                                        className="btn btn-outline btn-sm"
                                        onClick={() => startEditing(plan)}
                                    >
                                        <i className="bi bi-pencil"></i> Edit
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="payment-history-section">
                    {/* Revenue Stats Cards */}
                    <div className="revenue-stats-grid">
                        <div className="revenue-card total">
                            <div className="revenue-icon">
                                <i className="bi bi-currency-dollar"></i>
                            </div>
                            <div className="revenue-content">
                                <h3>Total Revenue</h3>
                                <p className="revenue-amount">
                                    {revenueAnalytics ? formatCurrency(revenueAnalytics.total_revenue) : 'Loading...'}
                                </p>
                                <span className="revenue-trend">All time</span>
                            </div>
                        </div>
                        
                        <div className="revenue-card monthly">
                            <div className="revenue-icon">
                                <i className="bi bi-graph-up"></i>
                            </div>
                            <div className="revenue-content">
                                <h3>This Month</h3>
                                <p className="revenue-amount">
                                    {revenueAnalytics ? formatCurrency(revenueAnalytics.current_month_revenue) : 'Loading...'}
                                </p>
                                <span className="revenue-trend">Current month</span>
                            </div>
                        </div>
                        
                        <div className="revenue-card pending">
                            <div className="revenue-icon">
                                <i className="bi bi-clock"></i>
                            </div>
                            <div className="revenue-content">
                                <h3>Pending Payments</h3>
                                <p className="revenue-amount">
                                    {revenueAnalytics ? 
                                        revenueAnalytics.payment_status_counts.find(s => s.payment_status === 'pending')?.count || 0 
                                        : 'Loading...'
                                    }
                                </p>
                                <span className="revenue-trend">Awaiting processing</span>
                            </div>
                        </div>

                        <div className="revenue-card users">
                            <div className="revenue-icon">
                                <i className="bi bi-people"></i>
                            </div>
                            <div className="revenue-content">
                                <h3>Active Subscriptions</h3>
                                <p className="revenue-amount">
                                    {Object.values(activeSubscriptions).reduce((sum, count) => sum + count, 0)}
                                </p>
                                <span className="revenue-trend">Total active users</span>
                            </div>
                        </div>
                    </div>

                    {/* Filter, Sort, and Search Controls */}
                    <div className="payment-controls">
                        <div className="control-group">
                            <div className="search-box">
                                <i className="bi bi-search"></i>
                                <input 
                                    type="text" 
                                    placeholder="Search by user name, email, or transaction ID..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && (
                                    <button className="clear-search" onClick={() => setSearchQuery('')}>
                                        <i className="bi bi-x"></i>
                                    </button>
                                )}
                            </div>
                            
                            <div className="filter-controls">
                                <select 
                                    value={statusFilter} 
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="completed">Completed</option>
                                    <option value="pending">Pending</option>
                                    <option value="failed">Failed</option>
                                    <option value="refunded">Refunded</option>
                                </select>
                                
                                <select 
                                    value={packageFilter} 
                                    onChange={(e) => setPackageFilter(e.target.value)}
                                >
                                    <option value="all">All Packages</option>
                                    {allPlans.map(plan => (
                                        <option key={plan.package_id} value={plan.package_type}>
                                            {formatPlanName(plan.package_type)}
                                        </option>
                                    ))}
                                </select>
                                
                                <select 
                                    value={dateFilter} 
                                    onChange={(e) => setDateFilter(e.target.value)}
                                >
                                    <option value="all">All Time</option>
                                    <option value="today">Today</option>
                                    <option value="week">This Week</option>
                                    <option value="month">This Month</option>
                                    <option value="year">This Year</option>
                                </select>
                            </div>
                        </div>
                        
                    </div>

                    {/* Payment History Table */}
                    <div className="payment-table-container">
                        <div className="table-header-actions">
                            <h3>
                                Payment History 
                                <span className="result-count">({filteredPayments.length} payments)</span>
                            </h3>
                            <button 
                                className="btn btn-primary"
                                onClick={() => setShowManualPayment(true)}
                            >
                                <i className="bi bi-plus-circle"></i> Add Manual Payment
                            </button>
                        </div>

                        {loading ? (
                            <div className="loading">Loading payments...</div>
                        ) : (
                            <div className="payment-table">
                                <div className="table-header">
                                    <span className="sortable" onClick={() => handleSort('payment_date')}>
                                        Date {sortBy === 'payment_date' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </span>
                                    <span className="sortable" onClick={() => handleSort('user_name')}>
                                        User {sortBy === 'user_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </span>
                                    <span className="sortable" onClick={() => handleSort('package_type')}>
                                        Package {sortBy === 'package_type' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </span>
                                    <span >
                                        Amount 
                                    </span>
                                    <span>Method</span>
                                    <span>Status</span>
                                    <span>Actions</span>
                                </div>
                                
                                {filteredPayments.map(payment => (
                                    <div key={payment.payment_id} className="table-row">
                                        <span>{formatDate(payment.payment_date)}</span>
                                        <span className="user-info">
                                            <div className="user-name">{payment.user_name || 'N/A'}</div>
                                            <div className="user-email">{payment.user_email}</div>
                                        </span>
                                        <span>
                                            <span className="package-badge">
                                                {formatPlanName(payment.package_type)}
                                            </span>
                                        </span>
                                        <span className="amount">{formatCurrency(payment.amount)}</span>
                                        <span>
                                            <span className={`method-badge ${payment.payment_method}`}>
                                                {payment.payment_method}
                                            </span>
                                        </span>
                                        <span>
                                            <span className={`status-badge ${getStatusBadgeClass(payment.payment_status)}`}>
                                                {payment.payment_status}
                                            </span>
                                        </span>
                                        <span className="actions">
                                            {payment.payment_status === 'pending' && (
                                                <button 
                                                    className="btn-icon success"
                                                    onClick={() => updatePaymentStatus(payment.payment_id, 'completed')}
                                                    title="Mark as Completed"
                                                >
                                                    <i className="bi bi-check"></i>
                                                </button>
                                            )}
                                            {payment.payment_status === 'completed' && (
                                                <button 
                                                    className="btn-icon warning"
                                                    onClick={() => updatePaymentStatus(payment.payment_id, 'refunded')}
                                                    title="Mark as Refunded"
                                                >
                                                    <i className="bi bi-arrow-counterclockwise"></i>
                                                </button>
                                            )}
                                            <button 
                                                className="btn-icon info"
                                                onClick={() => viewPaymentDetails(payment)}
                                                title="View Details"
                                            >
                                                <i className="bi bi-eye"></i>
                                            </button>
                                        </span>
                                    </div>
                                ))}
                                {filteredPayments.length === 0 && (
                                    <div key="no-payments" className="no-payments">
                                        <i className="bi bi-receipt"></i>
                                        <p>No payments found matching your criteria</p>
                                        <button 
                                            className="btn btn-outline"
                                            onClick={() => {
                                                setSearchQuery('');
                                                setStatusFilter('all');
                                                setPackageFilter('all');
                                                setDateFilter('all');
                                            }}
                                        >
                                            Clear Filters
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Manual Payment Modal */}
            {showManualPayment && (
                <div className="modal-overlay" onClick={() => setShowManualPayment(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add Manual Payment</h2>
                            <button 
                                className="close-btn"
                                onClick={() => setShowManualPayment(false)}
                            >
                                &times;
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>User *</label>
                                    <select 
                                        value={manualPaymentForm.user_id}
                                        onChange={(e) => setManualPaymentForm(prev => ({...prev, user_id: e.target.value}))}
                                    >
                                        <option value="">Select User</option>
                                        {users.map(user => (
                                            <option key={user.user_id} value={user.user_id}>
                                                {user.name} ({user.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Package *</label>
                                    <select 
                                        value={manualPaymentForm.package_id}
                                        onChange={(e) => setManualPaymentForm(prev => ({...prev, package_id: e.target.value}))}
                                    >
                                        <option value="">Select Package</option>
                                        {allPlans.map(plan => (
                                            <option key={plan.package_id} value={plan.package_id}>
                                                {formatPlanName(plan.package_type)} - R{plan.price}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Amount *</label>
                                    <input 
                                        type="number"
                                        step="0.01"
                                        value={manualPaymentForm.amount}
                                        onChange={(e) => setManualPaymentForm(prev => ({...prev, amount: e.target.value}))}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Billing Cycle</label>
                                    <select 
                                        value={manualPaymentForm.billing_cycle}
                                        onChange={(e) => setManualPaymentForm(prev => ({...prev, billing_cycle: e.target.value}))}
                                    >
                                        <option value="monthly">Monthly</option>
                                        <option value="yearly">Yearly</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button 
                                    className="btn btn-primary"
                                    onClick={handleManualPayment}
                                    disabled={!manualPaymentForm.user_id || !manualPaymentForm.package_id || !manualPaymentForm.amount}
                                >
                                    Add Payment
                                </button>
                                <button 
                                    className="btn btn-outline"
                                    onClick={() => setShowManualPayment(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Details Modal */}
            {showPaymentModal && selectedPayment && (
                <div className="modal-overlay-new" onClick={() => setShowPaymentModal(false)}>
                    <div className="modal-content-new" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-new">
                            <div className="payment-title-section">
                                <div className="payment-icon-large">
                                    <i className="bi bi-credit-card"></i>
                                </div>
                                <div className="payment-title">
                                    <h2>Payment Details</h2>
                                    <p>Transaction ID: {selectedPayment.transaction_id}</p>
                                </div>
                            </div>
                            <button 
                                className="close-btn-new"
                                onClick={() => setShowPaymentModal(false)}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="modal-body-new">
                            <div className="payment-details-grid-new">
                                <div className="detail-card-new amount-card">
                                    <div className="detail-icon-new">
                                        <i className="bi bi-currency-dollar"></i>
                                    </div>
                                    <div className="detail-content-new">
                                        <label>Amount</label>
                                        <p className="amount-large-new">{formatCurrency(selectedPayment.amount)}</p>
                                    </div>
                                </div>

                                <div className="detail-card-new status-card">
                                    <div className="detail-icon-new">
                                        <i className="bi bi-activity"></i>
                                    </div>
                                    <div className="detail-content-new">
                                        <label>Status</label>
                                        <p className={`status-indicator-new ${selectedPayment.payment_status}`}>
                                            {selectedPayment.payment_status}
                                        </p>
                                    </div>
                                </div>

                                <div className="detail-card-new package-card">
                                    <div className="detail-icon-new">
                                        <i className="bi bi-box-seam"></i>
                                    </div>
                                    <div className="detail-content-new">
                                        <label>Package</label>
                                        <p>{formatPlanName(selectedPayment.package_type)}</p>
                                    </div>
                                </div>

                                <div className="detail-card-new user-card">
                                    <div className="detail-icon-new">
                                        <i className="bi bi-person"></i>
                                    </div>
                                    <div className="detail-content-new">
                                        <label>User</label>
                                        <p>{selectedPayment.user_name || 'N/A'}</p>
                                        <small>{selectedPayment.user_email}</small>
                                    </div>
                                </div>

                                <div className="detail-card-new method-card">
                                    <div className="detail-icon-new">
                                        <i className="bi bi-wallet2"></i>
                                    </div>
                                    <div className="detail-content-new">
                                        <label>Payment Method</label>
                                        <p className={`method-badge-new ${selectedPayment.payment_method}`}>
                                            {selectedPayment.payment_method}
                                        </p>
                                    </div>
                                </div>

                                <div className="detail-card-new date-card">
                                    <div className="detail-icon-new">
                                        <i className="bi bi-calendar"></i>
                                    </div>
                                    <div className="detail-content-new">
                                        <label>Payment Date</label>
                                        <p>{formatDate(selectedPayment.payment_date)}</p>
                                    </div>
                                </div>

                                <div className="detail-card-new transaction-card">
                                    <div className="detail-icon-new">
                                        <i className="bi bi-receipt"></i>
                                    </div>
                                    <div className="detail-content-new">
                                        <label>Payment ID</label>
                                        <p>{selectedPayment.payment_id}</p>
                                    </div>
                                </div>

                                <div className="detail-card-new billing-card">
                                    <div className="detail-icon-new">
                                        <i className="bi bi-arrow-repeat"></i>
                                    </div>
                                    <div className="detail-content-new">
                                        <label>Billing Cycle</label>
                                        <p>{selectedPayment.billing_cycle}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Actions */}
                            <div className="payment-actions-new">
                                {selectedPayment.payment_status === 'pending' && (
                                    <button 
                                        className="action-btn-new success"
                                        onClick={() => {
                                            updatePaymentStatus(selectedPayment.payment_id, 'completed');
                                            setShowPaymentModal(false);
                                        }}
                                    >
                                        <i className="bi bi-check-circle"></i>
                                        Mark as Completed
                                    </button>
                                )}
                                {selectedPayment.payment_status === 'completed' && (
                                    <button 
                                        className="action-btn-new warning"
                                        onClick={() => {
                                            updatePaymentStatus(selectedPayment.payment_id, 'refunded');
                                            setShowPaymentModal(false);
                                        }}
                                    >
                                        <i className="bi bi-arrow-counterclockwise"></i>
                                        Mark as Refunded
                                    </button>
                                )}
                                <button 
                                    className="action-btn-new secondary"
                                    onClick={() => setShowPaymentModal(false)}
                                >
                                    <i className="bi bi-x-circle"></i>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Users Tab Content with Logging
const UsersTabContent = ({ users: initialUsers, adminUserId, logActivity }) => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showUserModal, setShowUserModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [userStats, setUserStats] = useState(null);

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';

    // Always fetch fresh data when component mounts
    useEffect(() => {
        fetchUsersData();
    }, []);

    const fetchUsersData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const formData = new FormData();
            formData.append('function', 'getAllUsers');
            formData.append('admin_user_id', adminUserId);
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            
            if (data.success) {
                const formattedUsers = data.users.map(user => ({
                    id: user.user_id,
                    name: user.name,
                    email: user.email,
                    role: user.role || 'event_planner',
                    status: user.status || 'active',
                    joined: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'
                }));
                
                setUsers(formattedUsers);
                setFilteredUsers(formattedUsers);
                logActivity('Users Data Loaded', 'Loaded user management data');
            } else {
                throw new Error(data.message || 'Failed to fetch users');
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedUser && showUserModal) {
            fetchUserStats(selectedUser.id);
        }
    }, [selectedUser, showUserModal]);

    const fetchUserStats = async (userId) => {
        try {
            const formData = new FormData();
            formData.append('function', 'getUserEventsCount');
            formData.append('admin_user_id', adminUserId);
            formData.append('user_id', userId);
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setUserStats(data);
                }
            }
        } catch (error) {
            console.error('Error fetching user stats:', error);
        }
    };

    useEffect(() => {
        const filterAndSortUsers = () => {
            if (!users || !Array.isArray(users)) {
                setFilteredUsers([]);
                return;
            }
            
            let result = [...users];
            
            if (searchQuery.trim() !== '') {
                const query = searchQuery.toLowerCase().trim();
                result = result.filter(user => 
                    user.name.toLowerCase().includes(query) || 
                    user.email.toLowerCase().includes(query) ||
                    (user.role && user.role.toLowerCase().includes(query))
                );
            }
            
            if (selectedStatus !== 'all') {
                result = result.filter(user => user.status === selectedStatus);
            }
            
            result.sort((a, b) => {
                if (sortBy === 'name') {
                    return sortOrder === 'asc' 
                        ? a.name.localeCompare(b.name) 
                        : b.name.localeCompare(a.name);
                } else if (sortBy === 'role') {
                    return sortOrder === 'asc' 
                        ? a.role.localeCompare(b.role) 
                        : b.role.localeCompare(a.role);
                } else if (sortBy === 'status') {
                    return sortOrder === 'asc' 
                        ? a.status.localeCompare(b.status) 
                        : b.status.localeCompare(a.status);
                } else if (sortBy === 'joined') {
                    const dateA = a.joined === 'N/A' ? new Date(0) : new Date(a.joined);
                    const dateB = b.joined === 'N/A' ? new Date(0) : new Date(b.joined);
                    return sortOrder === 'asc' 
                        ? dateA - dateB
                        : dateB - dateA;
                }
                return 0;
            });
            
            setFilteredUsers(result);
        };

        filterAndSortUsers();
    }, [users, selectedStatus, sortBy, sortOrder, searchQuery]);

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    const handleSearch = (e) => {
        setSearchQuery(e.target.value);
    };

    const clearSearch = () => {
        setSearchQuery('');
    };

    const viewUserDetails = (user) => {
        setSelectedUser(user);
        setShowUserModal(true);
        setUserStats(null);
        logActivity('User Details Viewed', `Viewed details for user: ${user.name} (${user.email})`);
    };

    const updateUserStatus = async (userId, newStatus) => {
        try {
            const formData = new FormData();
            formData.append('function', 'updateUserStatus');
            formData.append('user_id', userId);
            formData.append('status', newStatus);
            formData.append('admin_user_id', adminUserId);
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            if (data.success) {
                // Update local state immediately for better UX
                setUsers(prevUsers => 
                    prevUsers.map(user => 
                        user.id === userId 
                            ? { ...user, status: newStatus }
                            : user
                    )
                );
                
                logActivity('User Status Updated', `User ${userId} status changed to ${newStatus}`);
                alert(`User ${newStatus === 'active' ? 'activated' : 'blocked'} successfully!`);
            } else {
                throw new Error(data.message || 'Failed to update user status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Error: ' + error.message);
            logActivity('User Status Update Failed', `Failed to update user status: ${error.message}`);
        }
    };

    const totalUsers = users.length;
    const activeUsers = users.filter(user => user.status === 'active').length;
    const inactiveUsers = users.filter(user => user.status === 'inactive').length;

    if (loading) {
        return <div className="loading">Loading users...</div>;
    }

    if (error) {
        return (
            <div className="admin-tab-content">
                <div className="error-message">
                    <p>Error loading users: {error}</p>
                    <button onClick={fetchUsersData} className="btn btn-primary">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-tab-content">
            <div className="admin-content-header">
                <h2>User Management</h2>
                <div className="header-actions">
                    <button className="btn btn-outline" onClick={fetchUsersData}>
                        <i className="bi bi-arrow-clockwise"></i> Refresh
                    </button>
                </div>
            </div>

            <div className="users-overview">
                <div className="users-card">
                    <div className="users-icon">
                        <i className="bi bi-people"></i>
                    </div>
                    <div className="users-content">
                        <h3>Total Users</h3>
                        <p className="users-number">{totalUsers}</p>
                    </div>
                </div>
                
                <div className="users-card">
                    <div className="users-icon">
                        <i className="bi bi-check-circle"></i>
                    </div>
                    <div className="users-content">
                        <h3>Active Users</h3>
                        <p className="users-number">{activeUsers}</p>
                    </div>
                </div>
                
                <div className="users-card">
                    <div className="users-icon">
                        <i className="bi bi-x-circle"></i>
                    </div>
                    <div className="users-content">
                        <h3>Inactive Users</h3>
                        <p className="users-number">{inactiveUsers}</p>
                    </div>
                </div>
            </div>

            <div className="users-table-container">
                <div className="table-controls">
                    <div className="search-box">
                        <i className="bi bi-search"></i>
                        <input 
                            type="text" 
                            placeholder="Search users by name, email, or role..." 
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                        {searchQuery && (
                            <button className="clear-search" onClick={clearSearch}>
                                <i className="bi bi-x"></i>
                            </button>
                        )}
                    </div>
                    <div className="filter-controls">
                        <select 
                            value={selectedStatus} 
                            onChange={(e) => setSelectedStatus(e.target.value)}
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        <button 
                            className={sortBy === 'name' ? 'active' : ''}
                            onClick={() => handleSort('name')}
                        >
                            Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </button>
                        <button 
                            className={sortBy === 'role' ? 'active' : ''}
                            onClick={() => handleSort('role')}
                        >
                            Role {sortBy === 'role' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </button>
                        <button 
                            className={sortBy === 'status' ? 'active' : ''}
                            onClick={() => handleSort('status')}
                        >
                            Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </button>
                    </div>
                </div>

                <div className="users-table">
                    <div className="table-header">
                        <span>User</span>
                        <span>Role</span>
                        <span>Joined</span>
                        <span>Status</span>
                        <span>Actions</span>
                    </div>
                    
                    {filteredUsers.map(user => (
                        <div key={user.id} className="table-row">
                            <span className="user-info">
                                <div className="user-name">{user.name}</div>
                                <div className="user-email">{user.email}</div>
                            </span>
                            <span>
                                <span className={`user-role ${user.role || 'event_planner'}`}>
                                    {user.role || 'event_planner'}
                                </span>
                            </span>
                            <span>{user.joined}</span>
                            <span>
                                <span className={`user-status ${user.status === 'inactive' ? 'status-inactive' : 'status-active'}`}>
                                    {user.status === 'inactive' ? 'Inactive' : 'Active'}
                                </span>
                            </span>
                            <span className="actions">
                                <button 
                                    className="btn-icon view-btn" 
                                    title="View Details"
                                    onClick={() => viewUserDetails(user)}
                                >
                                    <i className="bi bi-eye"></i>
                                </button>
                                
                                <button 
                                    className={`btn-icon ${user.status === 'active' ? 'block-btn' : 'unblock-btn'}`} 
                                    title={user.status === 'active' ? 'Block User' : 'Unblock User'}
                                    onClick={() => updateUserStatus(
                                        user.id, 
                                        user.status === 'active' ? 'inactive' : 'active'
                                    )}
                                >
                                    <i className={user.status === 'active' ? 'bi bi-person-x' : 'bi bi-person-check'}></i>
                                </button>
                            </span>
                        </div>
                    ))}
                    {filteredUsers.length === 0 && (
                        <div key="no-users" className="no-users-message">
                            <p>{searchQuery ? 'No users found matching your search' : 'No users found'}</p>
                            {searchQuery && (
                                <button onClick={clearSearch} className="btn btn-outline">
                                    Clear Search
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* User Details Modal */}
            {showUserModal && selectedUser && (
                <div className="modal-overview-new" onClick={() => setShowUserModal(false)}>
                    <div className="modal-content-new" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-new">
                            <div className="user-avatar-section">
                                <div className="user-avatar-large">
                                    <i className="bi bi-person-circle"></i>
                                </div>
                                <div className="user-title">
                                    <h2>{selectedUser.name}</h2>
                                    <p>{selectedUser.email}</p>
                                </div>
                            </div>
                            <button 
                                className="close-btn-new"
                                onClick={() => setShowUserModal(false)}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="modal-body-new">
                            <div className="user-details-grid">
                                <div className="detail-card">
                                    <div className="detail-icon">
                                        <i className="bi bi-person-badge"></i>
                                    </div>
                                    <div className="detail-content">
                                        <label>Role</label>
                                        <p>{selectedUser.role || 'Event Planner'}</p>
                                    </div>
                                </div>

                                <div className="detail-card">
                                    <div className="detail-icon">
                                        <i className="bi bi-calendar-check"></i>
                                    </div>
                                    <div className="detail-content">
                                        <label>Joined Date</label>
                                        <p>{selectedUser.joined}</p>
                                    </div>
                                </div>

                                <div className="detail-card">
                                    <div className="detail-icon">
                                        <i className="bi bi-activity"></i>
                                    </div>
                                    <div className="detail-content">
                                        <label>Status</label>
                                        <p className={`status-indicator ${selectedUser.status === 'active' ? 'active' : 'inactive'}`}>
                                            {selectedUser.status === 'active' ? 'Active' : 'Inactive'}
                                        </p>
                                    </div>
                                </div>

                                <div className="detail-card">
                                    <div className="detail-icon">
                                        <i className="bi bi-box-seam"></i>
                                    </div>
                                    <div className="detail-content">
                                        <label>Total Events</label>
                                        <p className="events-count">
                                            {userStats ? userStats.total_events : 'Loading...'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button 
                                    className={`action-btn ${selectedUser.status === 'active' ? 'warning' : 'success'}`}
                                    onClick={() => {
                                        updateUserStatus(selectedUser.id, selectedUser.status === 'active' ? 'inactive' : 'active');
                                        setShowUserModal(false);
                                    }}
                                >
                                    <i className={`bi ${selectedUser.status === 'active' ? 'bi-person-x' : 'bi-person-check'}`}></i>
                                    {selectedUser.status === 'active' ? 'Block User' : 'Activate User'}
                                </button>
                                
                                <button 
                                    className="action-btn secondary"
                                    onClick={() => setShowUserModal(false)}
                                >
                                    <i className="bi bi-x-circle"></i>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};



export default AdminDashboard;