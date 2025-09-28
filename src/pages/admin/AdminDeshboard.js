import React, { useState, useEffect, useMemo } from "react";
import "../../App.css";
import "../../index.css";
import { Footer } from "../components";

function AdminDashboard() {
    const [activeTab, setActiveTab] = useState("dashboard");
    
    // Sample data for the dashboard stats
    const dashboardStats = useMemo(() => [
        { id: 1, title: "Total Users", value: "127", icon: "bi bi-people" },
        { id: 2, title: "Active Events", value: "18", icon: "bi bi-calendar-event" },
        { id: 3, title: "Response Rate", value: "72%", icon: "bi bi-graph-up" },
        { id: 4, title: "Monthly Revenue", value: "R8,500", icon: "bi bi-currency-dollar" }
    ], []);

    const quickActions = useMemo(() => [
        { id: 1, title: "Generate Reports", icon: "bi bi-file-earmark-bar-graph" },
        { id: 2, title: "Run System Backup", icon: "bi bi-cloud-arrow-up" }
    ], []);

    // Sample recent activity data
    const recentActivities = useMemo(() => [
        { id: 1, action: "New User Registered", user: "Sarah Johnson", time: "2 minutes ago", icon: "bi bi-person-plus" },
        { id: 2, action: "RSVP Analysis Completed", user: "System Automation", time: "15 minutes ago", icon: "bi bi-graph-up" },
        { id: 3, action: "User Permission Updated", user: "Admin: Michael", time: "1 hour ago", icon: "bi bi-shield-check" },
        { id: 4, action: "Export Request Processed", user: "Event Planner: John", time: "2 hours ago", icon: "bi bi-download" },
        { id: 5, action: "Weekly Report Generated", user: "System Automation", time: "3 hours ago", icon: "bi bi-file-text" }
    ], []);

    // Sample invitation analytics data for admin view
    const invitationAnalytics = useMemo(() => [
        { id: 1, eventName: "Annual Conference", sent: 450, opened: 380, responded: 320, responseRate: "84%", status: "completed" },
        { id: 2, eventName: "Product Launch", sent: 300, opened: 270, responded: 210, responseRate: "78%", status: "active" },
        { id: 3, eventName: "Team Retreat", sent: 85, opened: 65, responded: 45, responseRate: "69%", status: "draft" },
        { id: 4, eventName: "Client Workshop", sent: 120, opened: 95, responded: 70, responseRate: "74%", status: "completed" },
        { id: 5, eventName: "Shareholder Meeting", sent: 200, opened: 180, responded: 150, responseRate: "83%", status: "scheduled" }
    ], []);

    // Sample pricing plans data
    const pricingPlans = useMemo(() => [
        { id: 1, name: "Basic", price: "R199", interval: "monthly", activeSubscriptions: 45, status: "active", features: ["100 invitations/month", "Basic templates", "Email support"] },
        { id: 2, name: "Professional", price: "R499", interval: "monthly", activeSubscriptions: 28, status: "active", features: ["500 invitations/month", "Premium templates", "Priority support", "Custom branding"] },
        { id: 3, name: "Enterprise", price: "R999", interval: "monthly", activeSubscriptions: 12, status: "active", features: ["Unlimited invitations", "All templates", "24/7 support", "Advanced analytics", "API access"] },
        { id: 4, name: "Starter", price: "R99", interval: "monthly", activeSubscriptions: 8, status: "inactive", features: ["50 invitations/month", "Basic templates", "Community support"] }
    ], []);

    // Sample revenue data
    const revenueData = useMemo(() => [
        { month: "Jan", revenue: 7500 },
        { month: "Feb", revenue: 8200 },
        { month: "Mar", revenue: 7800 },
        { month: "Apr", revenue: 8500 },
        { month: "May", revenue: 9200 },
        { month: "Jun", revenue: 8800 }
    ], []);

    // Sample user data
    const usersData = useMemo(() => [
        { id: 1, name: "Sarah Johnson", email: "sarah@example.com", role: "Event Planner", status: "active", plan: "Professional", joined: "2023-03-15", events: 12 },
        { id: 2, name: "Michael Chen", email: "michael@example.com", role: "Admin", status: "active", plan: "Enterprise", joined: "2022-11-08", events: 8 },
        { id: 3, name: "John Williams", email: "john@example.com", role: "Event Planner", status: "active", plan: "Basic", joined: "2023-05-22", events: 5 },
        { id: 4, name: "Emily Davis", email: "emily@example.com", role: "Event Planner", status: "inactive", plan: "Professional", joined: "2023-01-30", events: 9 },
        { id: 5, name: "David Brown", email: "david@example.com", role: "Event Planner", status: "active", plan: "Enterprise", joined: "2023-02-14", events: 15 },
        { id: 6, name: "Lisa Wilson", email: "lisa@example.com", role: "Event Planner", status: "pending", plan: "Starter", joined: "2023-06-10", events: 2 }
    ], []);

    // Sample user roles data
    const userRoles = useMemo(() => [
        { role: "Event Planner", count: 115, permissions: ["Create events", "Send invitations", "Manage guest lists"] },
        { role: "Admin", count: 3, permissions: ["Full system access", "User management", "Billing management"] },
        { role: "Viewer", count: 9, permissions: ["View events", "Read-only access"] }
    ], []);

    // Render different content based on active tab
    const renderContent = () => {
        switch(activeTab) {
            case "invitations":
                return <InvitationsTabContent analytics={invitationAnalytics} />;
            case "pricing":
                return <PricingTabContent plans={pricingPlans} revenueData={revenueData} />;
            case "users":
                return <UsersTabContent users={usersData} roles={userRoles} />;
            case "dashboard":
            default:
                return <>
                    {/* Stats Grid */}
                    <section className="admin-dashboard-stats">
                        <div className="admin-dashboard-stats-grid">
                            {dashboardStats.map(stat => (
                                <div key={stat.id} className="admin-dashboard-stat-card">
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
const PricingTabContent = ({ plans, revenueData }) => (
    <div className="admin-tab-content">
        <div className="admin-content-header">
            <h2>Pricing Plan Management</h2>
            <div className="header-actions">
                <button className="btn btn-outline">
                    <i className="bi bi-download"></i> Export Revenue Data
                </button>
                <button className="btn btn-primary">
                    <i className="bi bi-plus-circle"></i> Add New Plan
                </button>
            </div>
        </div>

        <div className="revenue-overview">
            <div className="revenue-card">
                <div className="revenue-icon">
                    <i className="bi bi-currency-dollar"></i>
                </div>
                <div className="revenue-content">
                    <h3>Monthly Recurring Revenue</h3>
                    <p className="revenue-amount">R8,500</p>
                    <span className="revenue-trend positive">+15% from last month</span>
                </div>
            </div>
            
            <div className="revenue-card">
                <div className="revenue-icon">
                    <i className="bi bi-people"></i>
                </div>
                <div className="revenue-content">
                    <h3>Active Subscriptions</h3>
                    <p className="revenue-amount">93</p>
                    <span className="revenue-trend positive">+8% from last month</span>
                </div>
            </div>
            
            <div className="revenue-card">
                <div className="revenue-icon">
                    <i className="bi bi-graph-down"></i>
                </div>
                <div className="revenue-content">
                    <h3>Churn Rate</h3>
                    <p className="revenue-amount">4.2%</p>
                    <span className="revenue-trend negative">+0.5% from last month</span>
                </div>
            </div>
        </div>

        <div className="pricing-plans-grid">
            {plans.map(plan => (
                <div key={plan.id} className={`pricing-plan-card ${plan.status === 'inactive' ? 'inactive' : ''}`}>
                    <div className="plan-header">
                        <h3>{plan.name}</h3>
                        <span className={`plan-status ${plan.status}`}>{plan.status}</span>
                    </div>
                    
                    <div className="plan-price">
                        <span className="price-amount">{plan.price}</span>
                        <span className="price-interval">/{plan.interval}</span>
                    </div>
                    
                    <div className="plan-subscriptions">
                        <i className="bi bi-people"></i>
                        <span>{plan.activeSubscriptions} active subscriptions</span>
                    </div>
                    
                    <div className="plan-features">
                        <h4>Features:</h4>
                        <ul>
                            {plan.features.map((feature, index) => (
                                <li key={index}>{feature}</li>
                            ))}
                        </ul>
                    </div>
                    
                    <div className="plan-actions">
                        <button className="btn btn-outline btn-sm">
                            <i className="bi bi-pencil"></i> Edit
                        </button>
                        <button className={`btn btn-sm ${plan.status === 'active' ? 'btn-warning' : 'btn-success'}`}>
                            <i className={`bi ${plan.status === 'active' ? 'bi-x-circle' : 'bi-check-circle'}`}></i>
                            {plan.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                    </div>
                </div>
            ))}
        </div>

        <div className="revenue-chart-section">
            <h3>Revenue Trends (Last 6 Months)</h3>
            <div className="revenue-chart">
                {revenueData.map((data, index) => (
                    <div key={data.month} className="chart-bar-container">
                        <div className="chart-bar" style={{ height: `${(data.revenue / 10000) * 100}%` }}>
                            <span className="chart-value">R{data.revenue}</span>
                        </div>
                        <span className="chart-label">{data.month}</span>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

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

  // Fetch users and roles from API
  useEffect(() => {
    // Define all API functions inside useEffect to avoid dependency issues
    const fetchUserRoles = async (userId) => {
      try {
        const formData = new FormData();
        formData.append('function', 'getUserRoles');
        formData.append('user_id', userId);
        
        const response = await fetch('http://localhost/eventa/src/pages/php/query.php', {
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
        
        const response = await fetch('http://localhost/eventa/src/pages/php/query.php', {
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
        
        const response = await fetch('http://localhost/eventa/src/pages/php/query.php', {
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

  const openRoleModal = (user) => {
    setSelectedUser(user);
    setShowRoleModal(true);
  };

  const refreshUsers = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('function', 'getAllUsers');
      
      const response = await fetch('http://localhost/eventa/src/pages/php/query.php', {
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
              
              const response = await fetch('http://localhost/eventa/src/pages/php/query.php', {
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
      
      const response = await fetch('http://localhost/eventa/src/pages/php/query.php', {
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

  const updateUserStatus = async (userId, newStatus) => {
    try {
      const formData = new FormData();
      formData.append('function', 'updateUserStatus');
      formData.append('user_id', userId);
      formData.append('status', newStatus);
      
      const response = await fetch('http://localhost/eventa/src/pages/php/query.php', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (data.success) {
        // Refresh the users list after successful update
        refreshUsers();
      } else {
        throw new Error(data.message || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating user status: ' + error.message);
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
          <button className="btn btn-primary">
            <i className="bi bi-person-plus"></i> Add User
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
                  <span className={`user-status ${user.status}`}>
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
                  <button 
                    className="btn-icon role-btn" 
                    title="Assign Role"
                    onClick={() => openRoleModal(user)}
                  >
                    <i className="bi bi-person-gear"></i>
                  </button>
                  <button 
                    className={user.status === 'active' ? 'btn-icon block-btn' : 'btn-icon unblock-btn'} 
                    title={user.status === 'active' ? 'Deactivate User' : 'Activate User'}
                    onClick={() => updateUserStatus(
                      user.id, 
                      user.status === 'active' ? 'inactive' : 'active'
                    )}
                  >
                    <i className={user.status === 'active' ? 'bi bi-x-circle' : 'bi bi-check-circle'}></i>
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
              <button className="btn btn-outline btn-sm">
                <i className="bi bi-pencil"></i> Edit Permissions
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;