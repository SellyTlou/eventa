import React, { useState, useEffect, useMemo } from "react";
import "../../App.css";
import "../../index.css";
import { Footer } from "../components";

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
    const [adminUserId, setAdminUserId] = useState("ADMIN-003"); // This should come from your auth system

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';

    useEffect(() => {
        window.fetchDashboardData = fetchDashboardData;
        window.fetchUsersData = fetchUsersData;
        
        return () => {
            window.fetchDashboardData = null;
            window.fetchUsersData = null;
        };
    }, []);

    // Fetch data based on active tab
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                switch(activeTab) {
                    case "dashboard":
                        await fetchDashboardData();
                        await fetchSystemActivities();
                        break;
                    case "invitations":
                        await fetchInvitationAnalytics();
                        break;
                    case "pricing":
                        await fetchPricingPlans();
                        await fetchRevenueData();
                        break;
                    case "users":
                        await fetchUsersData();
                        break;
                    default:
                        break;
                }
            } catch (error) {
                console.error('Error fetching data:', error);
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
            formData.append('admin_user_id', adminUserId); // Add admin authentication
            
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
            formData.append('admin_user_id', adminUserId); // Add admin authentication
            
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

    const fetchInvitationAnalytics = async () => {
        try {
            const formData = new FormData();
            formData.append('function', 'getInvitationAnalytics');
            formData.append('admin_user_id', adminUserId); // Add admin authentication
            
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
            formData.append('admin_user_id', adminUserId); // Add admin authentication
            
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
            formData.append('admin_user_id', adminUserId); // Add admin authentication
            
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
            formData.append('admin_user_id', adminUserId); // Add admin authentication
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setUsersData(data.users);
                } else if (data.message && data.message.includes("Unauthorized")) {
                    console.error("Admin access denied:", data.message);
                    alert("Admin access denied. Please log in as administrator.");
                }
            }
        } catch (error) {
            console.error('Error fetching users data:', error);
        }
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
        { id: 1, title: "Generate Reports", icon: "bi bi-file-earmark-bar-graph" },
        { id: 2, title: "Run System Backup", icon: "bi bi-cloud-arrow-up" }
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
                return <InvitationsTabContent analytics={invitationAnalytics} />;
            case "pricing":
                return <PricingTabContent plans={pricingPlans} revenueData={revenueData} adminUserId={adminUserId} />;
            case "users":
                return <UsersTabContent users={usersData} adminUserId={adminUserId} />;
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
                                <button className="admin-dashboard-view-all">View Logs</button>
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
                                    <div className="no-activities">No recent activities</div>
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
                                    <button key={action.id} className="admin-dashboard-action-btn">
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
                        </header>

                        {renderContent()}
                    </main>
                </div>
            </div>

            <Footer />
        </>
    );
}

// Invitations Tab Content - Admin Focused
const InvitationsTabContent = ({ analytics }) => {
    const [invitationStats, setInvitationStats] = useState({
        total_invitations: 0,
        open_rate: 0,
        response_rate: 0
    });
    const [loading, setLoading] = useState(false);
    const [sortField, setSortField] = useState('eventName');
    const [sortDirection, setSortDirection] = useState('asc');

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';

    useEffect(() => {
        fetchInvitationStats();
    }, []);

    const fetchInvitationStats = async () => {
        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('function', 'getInvitationStats');
            formData.append('admin_user_id', "ADMIN-003"); // Use your admin ID
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setInvitationStats(data.stats);
                }
            }
        } catch (error) {
            console.error('Error fetching invitation stats:', error);
        } finally {
            setLoading(false);
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

    const sortedAnalytics = useMemo(() => {
        if (!analytics || !Array.isArray(analytics)) return [];
        
        return [...analytics].sort((a, b) => {
            let aValue = a[sortField];
            let bValue = b[sortField];
            
            // Handle numeric values (remove % and parse)
            if (sortField === 'responseRate') {
                aValue = parseFloat(aValue) || 0;
                bValue = parseFloat(bValue) || 0;
            }
            
            // Handle numeric values for counts
            if (['sent', 'opened', 'responded'].includes(sortField)) {
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

    const getSortIcon = (field) => {
        if (sortField !== field) return '';
        return sortDirection === 'asc' ? '' : '';
    };

    return (
        <div className="admin-tab-content">
            <div className="admin-content-header">
                <h2>Invitation Performance Analytics</h2>
                <div className="header-actions">
                    <button className="btn btn-outline" onClick={fetchInvitationStats} disabled={loading}>
                        <i className="bi bi-arrow-clockwise"></i> Refresh
                    </button>
                </div>
            </div>

            {loading && <div className="loading">Loading...</div>}

            <div className="analytics-overview">
                <div className="analytics-card">
                    <div className="analytics-icon">
                        <i className="bi bi-envelope"></i>
                    </div>
                    <div className="analytics-content">
                        <h3>Total Invitations Sent</h3>
                        <p className="analytics-number">{invitationStats.total_invitations.toLocaleString()}</p>
                        <span className="analytics-trend positive">Live data</span>
                    </div>
                </div>
                
                <div className="analytics-card">
                    <div className="analytics-icon">
                        <i className="bi bi-eye"></i>
                    </div>
                    <div className="analytics-content">
                        <h3>Average Open Rate</h3>
                        <p className="analytics-number">{invitationStats.open_rate}%</p>
                        <span className="analytics-trend positive">Based on responses</span>
                    </div>
                </div>
                
                <div className="analytics-card">
                    <div className="analytics-icon">
                        <i className="bi bi-check-circle"></i>
                    </div>
                    <div className="analytics-content">
                        <h3>Average Response Rate</h3>
                        <p className="analytics-number">{invitationStats.response_rate}%</p>
                        <span className="analytics-trend neutral">All events</span>
                    </div>
                </div>
            </div>

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
                
                {sortedAnalytics.map(item => (
                    <div key={item.id} className="table-row">
                        <span className="event-name">{item.eventName}</span>
                        <span>{item.sent}</span>
                        <span>{item.opened}</span>
                        <span>{item.responded}</span>
                        <span>
                            <span className={`response-rate ${parseInt(item.responseRate) > 75 ? 'high' : parseInt(item.responseRate) > 60 ? 'medium' : 'low'}`}>
                                {item.responseRate}
                            </span>
                        </span>
                        <span>
                            <span className={`status-badge ${item.status}`}>
                                {item.status}
                            </span>
                        </span>
                        <span>
                            <button className="btn-icon" title="View Details">
                                <i className="bi bi-eye"></i>
                            </button>
                        </span>
                    </div>
                ))}
                {(!analytics || analytics.length === 0) && (
                    <div className="no-data">
                        <p>No invitation data available</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Pricing Tab Content - Admin Focused
const PricingTabContent = ({ plans, adminUserId }) => {
    const [editingPlan, setEditingPlan] = useState(null);
    const [editForm, setEditForm] = useState({
        package_type: '',
        max_guests: '',
        max_events: '',
        price: ''
    });
    const [allPlans, setAllPlans] = useState(plans);

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';

    // Start editing a plan
    const startEditing = (plan) => {
        setEditingPlan(plan.package_id);
        setEditForm({
            package_type: plan.package_type || '',
            max_guests: plan.max_guests || '',
            max_events: plan.max_events || '',
            price: plan.price || ''
        });
    };

    // Cancel editing
    const cancelEditing = () => {
        setEditingPlan(null);
        setEditForm({
            package_type: '',
            max_guests: '',
            max_events: '',
            price: ''
        });
    };

    // Handle form field changes
    const handleEditChange = (field, value) => {
        setEditForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Save package changes
    const savePackage = async (packageId) => {
        try {
            const formData = new FormData();
            formData.append('function', 'updatePackage');
            formData.append('package_id', packageId);
            formData.append('package_type', editForm.package_type);
            formData.append('max_guests', editForm.max_guests);
            formData.append('max_events', editForm.max_events);
            formData.append('price', editForm.price);
            formData.append('admin_user_id', adminUserId); // Add admin authentication
            
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
                alert('Package updated successfully!');
            } else {
                if (data.message && data.message.includes("Unauthorized")) {
                    alert('Access denied: Admin privileges required');
                } else {
                    alert('Error updating package: ' + data.message);
                }
            }
        } catch (error) {
            console.error('Error updating package:', error);
            alert('Error updating package');
        }
    };

    // Format plan name for display
    const formatPlanName = (packageType) => {
        if (!packageType) return 'Unknown';
        return packageType.charAt(0).toUpperCase() + packageType.slice(1);
    };

    // Get active subscriptions count
    const getActiveSubscriptions = (packageType) => {
        const subscriptionCounts = {
            'basic': 45,
            'premium': 28,
            'enterprise': 12
        };
        return subscriptionCounts[packageType] || 0;
    };

    return (
        <div className="admin-tab-content">
            <div className="admin-content-header">
                <h2>Pricing Plan Management</h2>
                <div className="header-actions">
                    <button className="btn btn-outline">
                        <i className="bi bi-arrow-clockwise"></i> Refresh
                    </button>
                </div>
            </div>

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
                            <h4>Features:</h4>
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
        </div>
    );
};

// Users Tab Content - Simplified without permissions
const UsersTabContent = ({ users: initialUsers, adminUserId }) => {
  const [users, setUsers] = useState(initialUsers || []);
  const [filteredUsers, setFilteredUsers] = useState(initialUsers || []);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';

  // Fetch users from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const formData = new FormData();
        formData.append('function', 'getAllUsers');
        formData.append('admin_user_id', adminUserId); // Add admin authentication
        
        const response = await fetch(`${API_BASE_URL}/query.php`, {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
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
        } else {
          if (data.message && data.message.includes("Unauthorized")) {
            throw new Error("Admin access denied. Please log in as administrator.");
          } else {
            throw new Error(data.message || 'Failed to fetch users');
          }
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        setError(error.message);
        setUsers([]);
        setFilteredUsers([]);
      } finally {
        setLoading(false);
      }
    };

    if (!initialUsers || initialUsers.length === 0) {
      fetchUsers();
    }
  }, [initialUsers, adminUserId]);

  // Filter and sort users based on search query, filters, and sorting
  useEffect(() => {
    const filterAndSortUsers = () => {
      if (!users || !Array.isArray(users)) {
        setFilteredUsers([]);
        return;
      }
      
      let result = [...users];
      
      // Filter by search query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        result = result.filter(user => 
          user.name.toLowerCase().includes(query) || 
          user.email.toLowerCase().includes(query) ||
          (user.role && user.role.toLowerCase().includes(query))
        );
      }
      
      // Filter by status
      if (selectedStatus !== 'all') {
        result = result.filter(user => user.status === selectedStatus);
      }
      
      // Sort users
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
  };

  const refreshUsers = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('function', 'getAllUsers');
      formData.append('admin_user_id', adminUserId); // Add admin authentication
      
      const response = await fetch(`${API_BASE_URL}/query.php`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
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
        }
      }
    } catch (error) {
      console.error('Error refreshing users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId, newStatus) => {
    console.log('Updating user status:', { userId, newStatus, adminUserId });

    try {
        const formData = new FormData();
        formData.append('function', 'updateUserStatus');
        formData.append('user_id', userId);
        formData.append('status', newStatus);
        formData.append('admin_user_id', adminUserId); // Add admin authentication
        
        const response = await fetch(`${API_BASE_URL}/query.php`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        console.log('Server response:', data);
        
        if (data.success) {
            console.log('Status updated successfully');
            
            // Force immediate UI update - this is crucial
            setUsers(prevUsers => 
                prevUsers.map(user => 
                    user.id === userId 
                        ? { ...user, status: newStatus }
                        : user
                )
            );
            
            // Also refresh from server to ensure consistency
            await refreshUsers();
            
            // Refresh dashboard stats
            if (window.fetchDashboardData) {
                await window.fetchDashboardData();
            }
            
            alert(`User ${newStatus === 'active' ? 'activated' : 'blocked'} successfully!`);
        } else {
            if (data.message && data.message.includes("Unauthorized")) {
                throw new Error("Admin access denied. Please log in as administrator.");
            } else {
                throw new Error(data.message || 'Failed to update user status');
            }
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Error: ' + error.message);
    }
};

  // Calculate user statistics
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
          <button onClick={refreshUsers} className="btn btn-primary">
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
          <button className="btn btn-outline" onClick={refreshUsers}>
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
          
          {filteredUsers.length > 0 ? (
            filteredUsers.map(user => (
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
            ))
          ) : (
            <div className="no-users-message">
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
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>User Details</h2>
              <button 
                className="close-btn"
                onClick={() => setShowUserModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="user-detail">
                <strong>Name:</strong> {selectedUser.name}
              </div>
              <div className="user-detail">
                <strong>Email:</strong> {selectedUser.email}
              </div>
              <div className="user-detail">
                <strong>Role:</strong> {selectedUser.role || 'event_planner'}
              </div>
              <div className="user-detail">
                <strong>Status:</strong> 
                <span className={`user-status ${selectedUser.status === 'inactive' ? 'status-inactive' : 'status-active'}`}>
                  {selectedUser.status === 'inactive' ? 'Inactive' : 'Active'}
                </span>
              </div>
              <div className="user-detail">
                <strong>Joined:</strong> {selectedUser.joined}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;