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

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';

      useEffect(() => {
        window.fetchDashboardData = fetchDashboardData;
        window.fetchUsersData = fetchUsersData;
        
        return () => {
            // Cleanup when component unmounts
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
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setDashboardData(data.stats);
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
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setSystemActivities(data.activities);
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
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setInvitationAnalytics(data.analytics);
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
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setPricingPlans(data.packages);
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
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setRevenueData(data.revenueData);
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
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setUsersData(data.users);
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
                return <PricingTabContent plans={pricingPlans} revenueData={revenueData} />;
            case "users":
                return <UsersTabContent users={usersData} />;
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
const InvitationsTabContent = ({ analytics }) => (
    <div className="admin-tab-content">
        <div className="admin-content-header">
            <h2>Invitation Performance Analytics</h2>
            <div className="header-actions">
                <button className="btn btn-outline">
                    <i className="bi bi-download"></i> Export Data
                </button>
                <button className="btn btn-primary">
                    <i className="bi bi-graph-up"></i> Generate Report
                </button>
            </div>
        </div>

        <div className="analytics-overview">
            <div className="analytics-card">
                <div className="analytics-icon">
                    <i className="bi bi-envelope"></i>
                </div>
                <div className="analytics-content">
                    <h3>Total Invitations Sent</h3>
                    <p className="analytics-number">1,155</p>
                    <span className="analytics-trend positive">+12% from last week</span>
                </div>
            </div>
            
            <div className="analytics-card">
                <div className="analytics-icon">
                    <i className="bi bi-eye"></i>
                </div>
                <div className="analytics-content">
                    <h3>Average Open Rate</h3>
                    <p className="analytics-number">78%</p>
                    <span className="analytics-trend positive">+3% from last week</span>
                </div>
            </div>
            
            <div className="analytics-card">
                <div className="analytics-icon">
                    <i className="bi bi-check-circle"></i>
                </div>
                <div className="analytics-content">
                    <h3>Average Response Rate</h3>
                    <p className="analytics-number">72%</p>
                    <span className="analytics-trend neutral">±0% from last week</span>
                </div>
            </div>
        </div>

        <div className="analytics-table">
            <div className="table-header">
                <span>Event Name</span>
                <span>Sent</span>
                <span>Opened</span>
                <span>Responses</span>
                <span>Response Rate</span>
                <span>Status</span>
                <span>Actions</span>
            </div>
            
            {analytics.map(item => (
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
                        <button className="btn-icon" title="Download Data">
                            <i className="bi bi-download"></i>
                        </button>
                        <button className="btn-icon" title="Generate Report">
                            <i className="bi bi-graph-up"></i>
                        </button>
                    </span>
                </div>
            ))}
        </div>

        <div className="time-filter">
            <span>Show data for: </span>
            <select defaultValue="7days">
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
            </select>
        </div>
    </div>
);

// Pricing Tab Content - Admin Focused
const PricingTabContent = ({ plans }) => {
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
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            if (data.success) {
                // Update local state
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
                alert('Error updating package: ' + data.message);
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

    // Get active subscriptions count (you'll need to implement this)
    const getActiveSubscriptions = (packageType) => {
        // This should come from your database
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

// Users Tab Content - Admin Focused with Roles and Permissions
const UsersTabContent = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [allRoles, setAllRoles] = useState([]);
  const [userRoles, setUserRoles] = useState({});
  const [currentUserPermissions, setCurrentUserPermissions] = useState({});

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';

 // Get current user ID - Use the admin user ID you just created
const getCurrentUserId = () => {
    return 'ADMIN-001'; // Use the user_id from your SQL insert
};

  // Check if current user has permission
  const checkPermission = async (permissionName) => {
    try {
      const formData = new FormData();
      formData.append('function', 'checkUserPermission');
      formData.append('user_id', getCurrentUserId());
      formData.append('permission', permissionName);
      
      const response = await fetch(`${API_BASE_URL}/query.php`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.success && data.hasPermission;
      }
      return false;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  };

  // Load current user permissions on component mount
  useEffect(() => {
    const loadCurrentUserPermissions = async () => {
      const permissions = [
        'manage_users',
        'manage_roles', 
        'manage_permissions',
        'view_dashboard'
      ];
      
      const permissionResults = {};
      for (const permission of permissions) {
        permissionResults[permission] = await checkPermission(permission);
      }
      setCurrentUserPermissions(permissionResults);
    };

    loadCurrentUserPermissions();
  }, []);

  // Fetch users and roles from API
  useEffect(() => {
    // Define all API functions inside useEffect to avoid dependency issues
    const fetchUserRoles = async (userId) => {
      try {
        const formData = new FormData();
        formData.append('function', 'getUserRoles');
        formData.append('user_id', userId);
        
        const response = await fetch(`${API_BASE_URL}/query.php`, {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setUserRoles(prev => ({
              ...prev,
              [userId]: data.roles
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching user roles:', error);
      }
    };

    const fetchAllRoles = async () => {
      try {
        const formData = new FormData();
        formData.append('function', 'getAllRoles');
        
        const response = await fetch(`${API_BASE_URL}/query.php`, {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setAllRoles(data.roles);
          }
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
      }
    };

    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const formData = new FormData();
        formData.append('function', 'getAllUsers');
        
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
            role: user.role || 'user',
            status: user.status || 'active',
            joined: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'
          }));
          
          setUsers(formattedUsers);
          setFilteredUsers(formattedUsers);
          
          // Fetch roles for each user
          formattedUsers.forEach(user => {
            fetchUserRoles(user.id);
          });
        } else {
          throw new Error(data.message || 'Failed to fetch users');
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

    fetchUsers();
    fetchAllRoles();
  }, []);

  // Filter and sort users based on search query, filters, and sorting
  useEffect(() => {
    const filterAndSortUsers = () => {
      if (!users || !Array.isArray(users)) {
        setFilteredUsers([]);
        return;
      }
      
      let result = [...users];
      
      // Filter by search query - search in name, email, and role
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        result = result.filter(user => 
          user.name.toLowerCase().includes(query) || 
          user.email.toLowerCase().includes(query) ||
          (userRoles[user.id] && userRoles[user.id].some(role => 
            role.name.toLowerCase().includes(query)
          ))
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
          const roleA = userRoles[a.id]?.[0]?.name || '';
          const roleB = userRoles[b.id]?.[0]?.name || '';
          return sortOrder === 'asc' 
            ? roleA.localeCompare(roleB) 
            : roleB.localeCompare(roleA);
        } else if (sortBy === 'status') {
          return sortOrder === 'asc' 
            ? a.status.localeCompare(b.status) 
            : b.status.localeCompare(a.status);
        } else if (sortBy === 'joined') {
          // For date sorting, convert back to date objects for comparison
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
  }, [users, selectedStatus, sortBy, sortOrder, searchQuery, userRoles]);

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

  const openRoleModal = async (user) => {
    // Check if admin has permission to manage roles
    const canManageRoles = await checkPermission('manage_roles');
    if (!canManageRoles) {
      alert('You do not have permission to manage roles.');
      return;
    }
    
    setSelectedUser(user);
    setShowRoleModal(true);
  };

  const refreshUsers = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('function', 'getAllUsers');
      
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
            role: user.role || 'user',
            status: user.status || 'active',
            joined: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'
          }));
          
          setUsers(formattedUsers);
          setFilteredUsers(formattedUsers);
          
          // Refresh roles for all users
          const refreshUserRoles = async (userId) => {
            try {
              const formData = new FormData();
              formData.append('function', 'getUserRoles');
              formData.append('user_id', userId);
              
              const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
              });
              
              if (response.ok) {
                const data = await response.json();
                if (data.success) {
                  setUserRoles(prev => ({
                    ...prev,
                    [userId]: data.roles
                  }));
                }
              }
            } catch (error) {
              console.error('Error refreshing user roles:', error);
            }
          };
          
          formattedUsers.forEach(user => {
            refreshUserRoles(user.id);
          });
        }
      }
    } catch (error) {
      console.error('Error refreshing users:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignRoleToUser = async (userId, roleId) => {
    try {
      const formData = new FormData();
      formData.append('function', 'assignUserRole');
      formData.append('user_id', userId);
      formData.append('role_id', roleId);
      
      const response = await fetch(`${API_BASE_URL}/query.php`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (data.success) {
        // Refresh the users list after successful update
        refreshUsers();
        // Show success message
        alert('Role assigned successfully!');
        setShowRoleModal(false);
      } else {
        throw new Error(data.message || 'Failed to assign role');
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      alert('Error assigning role: ' + error.message);
    }
  };


///// 
const updateUserStatus = async (userId, newStatus) => {
    // Check if admin has permission to manage users
    const canManageUsers = await checkPermission('manage_users');
    if (!canManageUsers) {
        alert('You do not have permission to manage users.');
        return;
    }

    console.log('🔄 Updating user status:', { userId, newStatus });

    try {
        const formData = new FormData();
        formData.append('function', 'updateUserStatus');
        formData.append('user_id', userId);
        formData.append('status', newStatus);
        
        console.log('Sending request to PHP...');
        
        const response = await fetch(`${API_BASE_URL}/query.php`, {
            method: 'POST',
            body: formData
        });
        
        console.log('Response status:', response.status);
        
        const responseText = await response.text();
        console.log('Raw response:', responseText);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        let data;
        try {
            data = JSON.parse(responseText);
            console.log('Parsed JSON data:', data);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            throw new Error('Invalid response from server');
        }
        
        if (data.success) {
            console.log('✅ Status updated successfully, refreshing users...');
            
            // Refresh the users list to get updated status
            await refreshUsers();
            
            // Also refresh dashboard stats
            if (window.fetchDashboardData) {
                window.fetchDashboardData();
            }
            
            alert(`User ${newStatus === 'active' ? 'activated' : 'blocked'} successfully!`);
        } else {
            // Show specific error message from backend
            throw new Error(data.message || 'Failed to update user status');
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
                  <span className={`user-role ${userRoles[user.id]?.[0]?.name || 'user'}`}>
                    {userRoles[user.id]?.[0]?.name || 'user'}
                  </span>
                </span>
                <span>{user.joined}</span>
<span>
    <span className={`user-status ${user.status} ${user.status === 'inactive' ? 'status-inactive' : 'status-active'}`}>
        {user.status}
    </span>
</span>
                <span className="actions">
    <button 
        className="btn-icon" 
        title="View Details"
        onClick={() => viewUserDetails(user)}
    >
        <i className="bi bi-eye"></i>
    </button>
    
    {currentUserPermissions.manage_roles && (
        <button 
            className="btn-icon role-btn" 
            title="Assign Role"
            onClick={() => openRoleModal(user)}
        >
            <i className="bi bi-person-gear"></i>
        </button>
    )}
    
    {currentUserPermissions.manage_users && (
        <button 
            className={`btn-icon ${user.status === 'active' ? 'block-btn' : 'unblock-btn'}`} 
            title={user.status === 'active' ? 'Deactivate User' : 'Activate User'}
            onClick={() => updateUserStatus(
                user.id, 
                user.status === 'active' ? 'inactive' : 'active'
            )}
        >
            <i className={user.status === 'active' ? 'bi bi-x-circle' : 'bi bi-check-circle'}></i>
        </button>
    )}
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
                <strong>Role:</strong> {userRoles[selectedUser.id]?.[0]?.name || 'user'}
              </div>
              <div className="user-detail">
                <strong>Status:</strong> 
                <span className={`user-status ${selectedUser.status}`}>
                  {selectedUser.status}
                </span>
              </div>
              <div className="user-detail">
                <strong>Joined:</strong> {selectedUser.joined}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Assignment Modal */}
      {showRoleModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign Role to {selectedUser.name}</h2>
              <button 
                className="close-btn"
                onClick={() => setShowRoleModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="role-selection">
                <h3>Current Role: {userRoles[selectedUser.id]?.[0]?.name || 'None'}</h3>
                <div className="role-options">
                  {allRoles.map(role => (
                    <div key={role.role_id} className="role-option">
                      <input
                        type="radio"
                        id={`role-${role.role_id}`}
                        name="userRole"
                        value={role.role_id}
                        checked={userRoles[selectedUser.id]?.[0]?.role_id === role.role_id}
                        onChange={() => assignRoleToUser(selectedUser.id, role.role_id)}
                      />
                      <label htmlFor={`role-${role.role_id}`}>
                        <strong>{role.name}</strong>
                        <p>{role.description}</p>
                        <div className="permissions-list">
                          <span>Permissions: </span>
                          {role.permissions && role.permissions.map((permission, index) => (
                            <span key={index} className="permission-tag">{permission}</span>
                          ))}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="user-roles-section">
        <h3>User Roles & Permissions</h3>
        <div className="roles-grid">
          {allRoles.map(role => (
            <div key={role.role_id} className="role-card">
              <h4>{role.name}</h4>
              <div className="role-permissions">
                <h5>Permissions:</h5>
                <div className="permissions-grid">
                  {role.permissions && role.permissions.map((permission, index) => (
                    <span key={index} className="permission-tag">{permission}</span>
                  ))}
                </div>
              </div>
              {currentUserPermissions.manage_permissions && (
                <button className="btn btn-outline btn-sm">
                  <i className="bi bi-pencil"></i> Edit Permissions
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;