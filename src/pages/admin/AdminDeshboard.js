import React, { useState, useEffect, useMemo, useRef } from "react";
import "./adminDesign.css";
import "../../App.css";
import "../../index.css";
import "../../alert.css"
import activityQueue from "../activityQueue";
import AdminTicket from "../AdminTicket";
import CustomPlanRequestsTab from './CustomPlanRequestsTab';

// ==================== PRODUCTION-READY TREE SET ====================
class ActivityTreeSet {
    constructor() {
        this.activities = []; // Sorted array (newest first)
        this.indexes = {
            byTimestamp: new Map(),
            byAction: new Map(),
            byUserId: new Map(),
            byText: new Map()
        };
    }

    // Add activity with proper sorting - IMMUTABLE
    addActivity(activity) {
        const newTreeSet = new ActivityTreeSet();

        // Copy existing data
        newTreeSet.activities = [...this.activities];
        newTreeSet.indexes.byTimestamp = new Map(this.indexes.byTimestamp);
        newTreeSet.indexes.byAction = new Map(this.indexes.byAction);
        newTreeSet.indexes.byUserId = new Map(this.indexes.byUserId);
        newTreeSet.indexes.byText = new Map(this.indexes.byText);

        // Insert in correct position (newest first)
        const insertIndex = this.findInsertIndex(activity.created_at);
        newTreeSet.activities.splice(insertIndex, 0, activity);

        // Update indexes
        this.updateIndexesForActivity(newTreeSet, activity);

        return newTreeSet;
    }

    // Add multiple activities - PROPERLY SORTED
    addActivities(activities) {
        let newTreeSet = new ActivityTreeSet();

        // Sort activities by timestamp descending before adding
        const sortedActivities = [...activities].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        sortedActivities.forEach(activity => {
            newTreeSet = newTreeSet.addActivity(activity);
        });

        return newTreeSet;
    }

    // RELIABLE binary search for insertion
    findInsertIndex(timestamp) {
        if (this.activities.length === 0) return 0;

        const newTime = new Date(timestamp).getTime();
        let low = 0;
        let high = this.activities.length;

        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            const midTime = new Date(this.activities[mid].created_at).getTime();

            if (newTime > midTime) {
                high = mid;
            } else {
                low = mid + 1;
            }
        }

        return low;
    }

    // SAFE index updating
    updateIndexesForActivity(treeSet, activity) {
        const timestamp = new Date(activity.created_at).getTime();

        // Index by timestamp
        if (!treeSet.indexes.byTimestamp.has(timestamp)) {
            treeSet.indexes.byTimestamp.set(timestamp, []);
        }
        treeSet.indexes.byTimestamp.get(timestamp).push(activity);

        // Index by action
        const action = activity.action;
        if (!treeSet.indexes.byAction.has(action)) {
            treeSet.indexes.byAction.set(action, []);
        }
        treeSet.indexes.byAction.get(action).push(activity);

        // Index by user
        const userId = activity.user_id;
        if (userId) {
            if (!treeSet.indexes.byUserId.has(userId)) {
                treeSet.indexes.byUserId.set(userId, []);
            }
            treeSet.indexes.byUserId.get(userId).push(activity);
        }

        // Index by text content
        this.indexTextContent(treeSet, activity);
    }

    // ROBUST text indexing
    indexTextContent(treeSet, activity) {
        const text = `${activity.action} ${activity.description} ${activity.user_name || ''}`.toLowerCase();
        const words = new Set(text.split(/\s+/).filter(word => word.length > 2));

        words.forEach(word => {
            if (!treeSet.indexes.byText.has(word)) {
                treeSet.indexes.byText.set(word, []);
            }
            treeSet.indexes.byText.get(word).push(activity);
        });
    }

    // FAST and RELIABLE search
    searchByText(searchTerm) {
        const terms = searchTerm.toLowerCase().split(/\s+/).filter(term => term.length > 2);

        if (terms.length === 0) return this.activities;

        // Find intersection of all search terms
        let results = null;

        terms.forEach(term => {
            const termResults = this.indexes.byText.get(term) || [];
            if (results === null) {
                results = new Set(termResults);
            } else {
                results = new Set([...results].filter(x => termResults.includes(x)));
            }
        });

        return results ? Array.from(results) : [];
    }

    getActivitiesByAction(action) {
        return this.indexes.byAction.get(action) || [];
    }

    getActivitiesByUser(userId) {
        return this.indexes.byUserId.get(userId) || [];
    }

    getRecentActivities(limit = 50) {
        return this.activities.slice(0, limit);
    }

    getActivityCount() {
        return this.activities.length;
    }
}

// ==================== FIXED LINKED LIST ====================
    class ListNode {
    constructor(data) {
        this.data = data;
        this.next = null;
        this.prev = null;
    }
}

class UsersLinkedList {
    constructor() {
        this.head = null;
        this.tail = null;
        this.size = 0;
        this.lookup = new Map();
        this.nameIndex = new Map();
    }

    // Add user to the end - FIXED
    append(user) {
        const newNode = new ListNode(user);

        if (!this.head) {
            this.head = newNode;
            this.tail = newNode;
        } else {
            newNode.prev = this.tail;
            this.tail.next = newNode;
            this.tail = newNode;
        }

        this.lookup.set(user.id, newNode);

        // FIXED: Add to name index for faster searching
        const nameKey = user.name.toLowerCase();
        if (!this.nameIndex.has(nameKey)) {
            this.nameIndex.set(nameKey, []);
        }
        this.nameIndex.get(nameKey).push(newNode);

        this.size++;
        return this;
    }

    // Add multiple users - FIXED
    appendAll(users) {
        users.forEach(user => this.append(user));
        return this;
    }

    // Find user by ID (O(1) with hash map)
    findById(userId) {
        const node = this.lookup.get(userId);
        return node ? node.data : null;
    }

    // Find users by name (O(1) with index)
    findByName(name) {
        const searchTerm = name.toLowerCase().trim();
        const results = [];

        // Use the name index for fast lookup
        for (let [nameKey, nodes] of this.nameIndex) {
            if (nameKey.includes(searchTerm)) {
                nodes.forEach(node => results.push(node.data));
            }
        }

        return results;
    }


    toArray() {
        const array = [];
        let current = this.head;

        while (current) {
            array.push(current.data);
            current = current.next;
        }

        return array;
    }

    // Update user data 
    updateUser(userId, newData) {
        const node = this.lookup.get(userId);
        if (node) {
            //Update name index if name changed
            const oldName = node.data.name.toLowerCase();
            const newName = newData.name ? newData.name.toLowerCase() : oldName;

            if (oldName !== newName) {
                // Remove from old name index
                const oldNameNodes = this.nameIndex.get(oldName);
                if (oldNameNodes) {
                    const filtered = oldNameNodes.filter(n => n !== node);
                    if (filtered.length > 0) {
                        this.nameIndex.set(oldName, filtered);
                    } else {
                        this.nameIndex.delete(oldName);
                    }
                }

                // Add to new name index
                if (!this.nameIndex.has(newName)) {
                    this.nameIndex.set(newName, []);
                }
                this.nameIndex.get(newName).push(node);
            }

            // Update the node data
            node.data = { ...node.data, ...newData };
            return true;
        }
        return false;
    }

    // Remove user - FIXED
    removeUser(userId) {
        const node = this.lookup.get(userId);
        if (!node) return false;

        //  Remove from name index
        const nameKey = node.data.name.toLowerCase();
        const nameNodes = this.nameIndex.get(nameKey);
        if (nameNodes) {
            const filtered = nameNodes.filter(n => n !== node);
            if (filtered.length > 0) {
                this.nameIndex.set(nameKey, filtered);
            } else {
                this.nameIndex.delete(nameKey);
            }
        }

        // Remove from lookup
        this.lookup.delete(userId);

        // Update linked list connections
        if (node.prev) {
            node.prev.next = node.next;
        } else {
            this.head = node.next;
        }

        if (node.next) {
            node.next.prev = node.prev;
        } else {
            this.tail = node.prev;
        }

        this.size--;
        return true;
    }

    // Get size - FIXED
    getSize() {
        return this.size;
    }

    // Clear list - FIXED
    clear() {
        this.head = null;
        this.tail = null;
        this.lookup.clear();
        this.nameIndex.clear();
        this.size = 0;
    }
}

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
    const [alert, setAlert] = useState({ show: false, message: '', type: '' });
    const [invitationAnalytics, setInvitationAnalytics] = useState([]);
    const [pricingPlans, setPricingPlans] = useState([]);
    const [usersData, setUsersData] = useState([]);
    const [revenueData, setRevenueData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [adminUserId, setAdminUserId] = useState(null);
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
    const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [newAdminData, setNewAdminData] = useState({
        name: '',
        lastname: '',
        email: '',
        password: ''
    });

    // ==================== NEW STATES FOR CUSTOM PLAN REQUESTS ====================
    const [customPlanRequests, setCustomPlanRequests] = useState([]);
    const [requestsLoading, setRequestsLoading] = useState(false);
    const [requestStatusFilter, setRequestStatusFilter] = useState('pending');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestStatus, setRequestStatus] = useState('pending');
    const [adminNotes, setAdminNotes] = useState('');

    // ==================== PRODUCTION TREE SET INTEGRATION ====================
    const [activityTreeSet, setActivityTreeSet] = useState(new ActivityTreeSet());
    const [filteredActivities, setFilteredActivities] = useState([]);

    // Linked List for users - FIXED
    const [usersList, setUsersList] = useState(new UsersLinkedList());

    const printAlert = (message, type = 'info') => {
        setAlert({ show: true, message, type });

        setTimeout(() => {
            setAlert({ show: false, message: '', type: '' });
        }, 5000);
    };

    const [isInitialized, setIsInitialized] = useState(false);

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';
    const profileTriggerRef = useRef(null);
    const profileDropdownRef = useRef(null);

    // ==================== PRODUCTION-READY REAL-TIME UPDATES ====================
    // PROPER real-time activity addition
    const addActivityToTreeSet = (activity) => {
        setActivityTreeSet(prevTreeSet => {
            const newTreeSet = prevTreeSet.addActivity(activity);
            console.log(`✅ Activity added at position 0: ${activity.action}`);
            return newTreeSet;
        });
    };

    // ENHANCED logActivity with reliable real-time updates
    const logActivity = (action, description, userId = null) => {
        const activityData = {
            userId: userId || adminUserId,
            action: action,
            description: description
        };

        // Add to backend queue
        activityQueue.enqueue(activityData);

        // Create temporary activity for real-time display
        const tempActivity = {
            id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            action: action,
            description: description,
            user_name: adminProfile ? `${adminProfile.name} ${adminProfile.lastname}` : 'Admin',
            user_id: adminUserId,
            created_at: new Date().toISOString()
        };

        // Add to TreeSet immediately
        addActivityToTreeSet(tempActivity);

        console.log(`📝 Activity logged in real-time: ${action}`);
    };

    // FAST and RELIABLE search handlers
    const handleLogsSearch = (searchTerm) => {
        setLogsSearch(searchTerm);

        if (!searchTerm.trim()) {
            setFilteredActivities(activityTreeSet.activities);
        } else {
            const startTime = performance.now();
            const results = activityTreeSet.searchByText(searchTerm);
            const endTime = performance.now();

            console.log(`🔍 TreeSet search: ${(endTime - startTime).toFixed(2)}ms`);
            setFilteredActivities(results);
        }
    };

    // Fast filter by action type
    const handleLogsFilter = (actionType) => {
        setLogsFilter(actionType);

        if (actionType === 'all') {
            setFilteredActivities(activityTreeSet.activities);
        } else {
            const filtered = activityTreeSet.getActivitiesByAction(actionType);
            setFilteredActivities(filtered);
        }
    };

    // ==================== CUSTOM PLAN REQUESTS FUNCTIONS ====================
    const fetchCustomPlanRequests = async (status = 'pending') => {
        if (!adminUserId) return;
        
        setRequestsLoading(true);
        try {
            const formData = new FormData();
            formData.append('function', 'getCustomPlanRequests');
            formData.append('admin_user_id', adminUserId);
            formData.append('status', status);
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            if (data.success) {
                setCustomPlanRequests(data.requests);
            } else {
                console.error('Error fetching custom plan requests:', data.message);
            }
        } catch (error) {
            console.error('Error fetching custom plan requests:', error);
        } finally {
            setRequestsLoading(false);
        }
    };

    const updateRequestStatus = async () => {
        if (!selectedRequest) return;
        
        try {
            const formData = new FormData();
            formData.append('function', 'updateCustomPlanRequest');
            formData.append('admin_user_id', adminUserId);
            formData.append('request_id', selectedRequest.request_id);
            formData.append('status', requestStatus);
            formData.append('admin_notes', adminNotes);
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            if (data.success) {
                printAlert('Request updated successfully', 'success');
                setShowRequestModal(false);
                fetchCustomPlanRequests(requestStatusFilter);
                logActivity('Custom Plan Updated', 
                    `Updated custom plan request ${selectedRequest.request_id} to status: ${requestStatus}`
                );
            } else {
                printAlert('Error updating request: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error updating request:', error);
            printAlert('Error updating request', 'error');
        }
    };

    const createAdmin = async () => {
        try {
            const formData = new FormData();
            formData.append('function', 'createAdmin');
            formData.append('requesting_user_id', adminUserId);
            formData.append('admin_user_id', adminUserId);
            formData.append('name', newAdminData.name);
            formData.append('lastname', newAdminData.lastname);
            formData.append('email', newAdminData.email);
            formData.append('password', newAdminData.password);

            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                printAlert('Admin user created successfully!', 'success');
                setShowCreateAdminModal(false);
                setNewAdminData({
                    name: '',
                    lastname: '',
                    email: '',
                    password: ''
                });
                fetchUsersData();
            } else {
                printAlert('Error creating admin: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error creating admin:', error);
            printAlert('Error creating admin user', 'error');
        }
    };

    const triggerRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    const fetchInvitationStats = async () => {
        if (!adminUserId) {
            console.log('Skipping fetchInvitationStats: adminUserId not set');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('function', 'getInvitationStats');
            formData.append('admin_user_id', adminUserId);

            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    return data.stats;
                }
            }
        } catch (error) {
            console.error('Error fetching invitation stats:', error);
        }
        return null;
    };

    useEffect(() => {
        console.log('Refresh triggered:', refreshTrigger);

        switch (activeTab) {
            case "dashboard":
                fetchDashboardData();
                fetchSystemActivities();
                break;
            case "invitations":
                fetchInvitationAnalytics();
                break;
            case "pricing":
                fetchPricingPlans();
                fetchRevenueData();
                break;
            case "users":
                fetchUsersData();
                break;
            case "custom-plans":
                fetchCustomPlanRequests(requestStatusFilter);
                break;
            default:
                break;
        }
    }, [refreshTrigger, activeTab, requestStatusFilter]);

    // Reset forms when modals open
    useEffect(() => {
        if (showReportModal) {
            setReportForm({
                report_type: 'users',
                date_range: 'all',
                format: 'csv'
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

    // Initialize admin identity from localStorage
    useEffect(() => {
        try {
            const userJson = localStorage.getItem('user');
            if (userJson) {
                const userObj = JSON.parse(userJson);
                if (userObj && userObj.user_id) {
                    setAdminUserId(userObj.user_id);
                    setAdminProfile({
                        name: userObj.name,
                        lastname: userObj.lastname,
                        email: userObj.email,
                        role: userObj.role,
                    });

                    const savedImage = localStorage.getItem('adminProfileImage');
                    if (savedImage) setProfileImage(savedImage);

                    console.log('Admin initialized with user ID:', userObj.user_id);
                }
            }
            setIsInitialized(true);
        } catch (err) {
            console.error('Error initializing admin from storage:', err);
            setIsInitialized(true);
        }
    }, []);

    // Only fetch data when we have both adminUserId AND isInitialized
    useEffect(() => {
        if (!adminUserId || !isInitialized) {
            console.log('Skipping data fetch - waiting for initialization. adminUserId:', adminUserId, 'isInitialized:', isInitialized);
            return;
        }

        console.log('Starting data fetch with adminUserId:', adminUserId);

        window.fetchDashboardData = fetchDashboardData;
        window.fetchUsersData = fetchUsersData;

        // Fetch profile and initial data
        fetchAdminProfile();
        fetchDashboardData();
        fetchUsersData();
        fetchPricingPlans();
        fetchInvitationAnalytics();
        fetchRevenueData();
        fetchCustomPlanRequests('pending');

        // Log admin dashboard access
        logActivity('Admin Dashboard Accessed', 'Administrator accessed the system dashboard');

        return () => {
            window.fetchDashboardData = null;
            window.fetchUsersData = null;
        };
    }, [adminUserId, isInitialized]);

    // Fetch admin profile
    const fetchAdminProfile = async () => {
        if (!adminUserId) {
            console.log('Skipping fetchAdminProfile: adminUserId not set');
            return;
        }

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
            if (!adminUserId || !isInitialized) {
                console.log('Skipping tab data fetch - not initialized');
                return;
            }

            setLoading(true);
            try {
                switch (activeTab) {
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
                    case "profile":
                        await fetchAdminProfile();
                        break;
                    case "custom-plans":
                        await fetchCustomPlanRequests(requestStatusFilter);
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
    }, [activeTab, adminUserId, isInitialized, requestStatusFilter]);

    // MODIFIED: fetchDashboardData without queue
    const fetchDashboardData = async () => {
        if (!adminUserId) {
            console.log('Skipping fetchDashboardData: adminUserId not set');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('function', 'getDashboardStats');
            formData.append('admin_user_id', adminUserId);

            // Direct fetch instead of queued fetch
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                setDashboardData(data.stats);
            }
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        }
    };

    // MODIFIED: fetchSystemActivities with TreeSet integration
    const fetchSystemActivities = async () => {
        if (!adminUserId) {
            console.log('Skipping fetchSystemActivities: adminUserId not set');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('function', 'getSystemActivity');
            formData.append('limit', 5);
            formData.append('admin_user_id', adminUserId);

            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                setSystemActivities(data.activities);
            } else {
                console.error('API Error:', data.message);
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

    // Generate report function (QUEUE REMOVED)
    const generateReport = async () => {
        if (!adminUserId) {
            printAlert('Admin user ID not available', 'error');
            return;
        }

        try {
            setGenerating(true);
            setActionMessage('Generating report...');

            const formData = new FormData();
            formData.append('function', 'generateReport');
            formData.append('admin_user_id', adminUserId);
            formData.append('report_type', reportForm.report_type);
            formData.append('date_range', reportForm.date_range);
            formData.append('format', reportForm.format);

            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                // CSV download logic
                let csvContent = "";
                let filename = `${reportForm.report_type}_report_${new Date().getTime()}.csv`;

                switch (reportForm.report_type) {
                    case 'users':
                        csvContent = generateUsersCSV();
                        break;
                    case 'events':
                        csvContent = generateEventsCSV();
                        break;
                    case 'revenue':
                        csvContent = generateRevenueCSV();
                        break;
                    case 'system':
                        csvContent = generateSystemCSV();
                        break;
                    default:
                        csvContent = "Report Type,Status\nUnknown,Not Available";
                }

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                setShowReportModal(false);
                setActionMessage('');

            } else {
                throw new Error(data.message || 'Failed to generate report');
            }

        } catch (error) {
            console.error('Report generation error:', error);
            setActionMessage('Error: ' + error.message);
        } finally {
            setGenerating(false);
        }
    };

    // CSV Generator Functions
    const generateUsersCSV = () => {
        let csv = "User ID,Full Name,Email,Role,Status,Created Date,Total Events\n";

        if (usersData && usersData.length > 0) {
            usersData.forEach(user => {
                const safeName = (user.name || '').replace(/"/g, '""');
                const safeEmail = (user.email || '').replace(/"/g, '""');

                csv += `"${user.user_id || ''}","${safeName}","${safeEmail}","${user.role || 'event_planner'}","${user.status || 'active'}","${user.created_at || ''}","${user.total_events || 0}"\n`;
            });
        } else {
            csv += "No user data available\n";
        }
        return csv;
    };

    const generateEventsCSV = () => {
        let csv = "Event Name,Organizer,Start Date,End Date,Location,Status,RSVP Count\n";

        if (invitationAnalytics && invitationAnalytics.length > 0) {
            invitationAnalytics.forEach(event => {
                const safeName = (event.eventName || '').replace(/"/g, '""');
                csv += `"${safeName}","${event.organizer || 'N/A'}","${event.startDate || 'N/A'}","${event.endDate || 'N/A'}","${event.location || 'N/A'}","${event.status || 'draft'}","${event.responded || 0}"\n`;
            });
        } else {
            csv += "No event data available in current view\n";
            csv += "Try switching to Events tab first to load event data\n";
        }
        return csv;
    };

    const generateRevenueCSV = () => {
        let csv = "Package Type,Price,Max Events,Max Guests,Active Subscriptions\n";

        if (pricingPlans && pricingPlans.length > 0) {
            pricingPlans.forEach(plan => {
                const packageType = plan.package_type || 'Unknown';
                csv += `"${packageType}","R ${plan.price || 0}","${plan.max_events || 0}","${plan.max_guests || 0}","${plan.active_subscriptions || 0}"\n`;
            });

            csv += "\nSummary\n";
            csv += `Total Packages,${pricingPlans.length}\n`;
            csv += `Total Revenue Estimate,R ${pricingPlans.reduce((sum, plan) => sum + (parseFloat(plan.price) || 0), 0)}\n`;
        } else {
            csv += "No pricing data available\n";
        }
        return csv;
    };

    const generateSystemCSV = () => {
        return `System Report
    Generated: ${new Date().toLocaleString()}

    Dashboard Statistics:
    Total Users,${dashboardData.total_users || 0}
    Active Users,${dashboardData.active_users || 0}
    Inactive Users,${dashboardData.inactive_users || 0}
    Active Events,${dashboardData.active_events || 0}
    Response Rate,${dashboardData.response_rate || 0}%

    Recent Activity Count,${systemActivities.length || 0}
    Pricing Plans Count,${pricingPlans.length || 0}
    Invitation Analytics Count,${invitationAnalytics.length || 0}

    Report Criteria:
    Report Type,${reportForm.report_type}
    Date Range,${reportForm.date_range}
    Format,CSV
    Generated By,${adminProfile ? `${adminProfile.name} ${adminProfile.lastname}` : 'Admin'}`;
    };

    // Run backup function (QUEUE REMOVED)
    const runBackup = async () => {
        if (!adminUserId) {
            printAlert('Admin user ID not available', 'error');
            return;
        }

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
        if (!adminUserId) {
            console.log('Skipping fetchInvitationAnalytics: adminUserId not set');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('function', 'getInvitationAnalytics');
            formData.append('admin_user_id', adminUserId);

            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                setInvitationAnalytics(data.analytics);
            }
        } catch (error) {
            console.error('Error fetching invitation analytics:', error);
        }
    };

    const fetchPricingPlans = async () => {
        if (!adminUserId) {
            console.log('Skipping fetchPricingPlans: adminUserId not set');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('function', 'getAllPackages');
            formData.append('admin_user_id', adminUserId);

            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                const normalized = (data.packages || []).map(p => ({
                    package_id: p.package_id || p.id || p.packageId,
                    package_type: p.package_type || p.type || p.packageType || '',
                    max_guests: p.max_guests || p.maxGuests || p.guests || 0,
                    max_events: p.max_events || p.maxEvents || p.events || 0,
                    price: p.price || p.cost || p.amount || 0,
                    features: p.features || p.package_features || p.features_list || '',
                }));
                setPricingPlans(normalized);
            }
        } catch (error) {
            console.error('Error fetching pricing plans:', error);
        }
    };

    const fetchRevenueData = async () => {
        if (!adminUserId) {
            console.log('Skipping fetchRevenueData: adminUserId not set');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('function', 'getRevenueData');
            formData.append('admin_user_id', adminUserId);

            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                setRevenueData(data.revenueData);
            }
        } catch (error) {
            console.error('Error fetching revenue data:', error);
        }
    };

    const fetchUsersData = async () => {
        if (!adminUserId) {
            console.log('Skipping fetchUsersData: adminUserId not set');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('function', 'getAllUsers');
            formData.append('admin_user_id', adminUserId);

            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                // Update both array state and linked list
                setUsersData(data.users);

                const newUsersList = new UsersLinkedList();
                data.users.forEach(user => {
                    newUsersList.append({
                        id: user.user_id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        status: user.status,
                        joined: user.created_at
                    });
                });
                setUsersList(newUsersList);
            }
        } catch (error) {
            console.error('Error fetching users data:', error);
        }
    };

    // ==================== PRODUCTION-READY ACTIVITY FETCHING ====================
    const fetchAllSystemActivities = async () => {
        if (!adminUserId) {
            printAlert('Admin user ID not available', 'error');
            return;
        }

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
                    // PROPER TreeSet initialization
                    const newTreeSet = new ActivityTreeSet().addActivities(data.activities);
                    setActivityTreeSet(newTreeSet);
                    setAllActivities(newTreeSet.activities);
                    setFilteredActivities(newTreeSet.activities);

                    console.log(`✅ TreeSet loaded with ${data.activities.length} activities`);
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

    // Helper function to format dates
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Profile dropdown component
    const ProfileDropdown = () => {
        if (!adminProfile) return null;

        const handleLogout = async () => {
            try {
                logActivity('Admin Logout', 'Administrator signed out of the system');

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
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminUser');
                localStorage.removeItem('adminData');
                sessionStorage.clear();

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
                    <button
                        className="dropdown-item"
                        onClick={() => {
                            setShowProfileDropdown(false);
                            setShowCreateAdminModal(true);
                        }}
                    >
                        <i className="bi bi-person-plus"></i>
                        Create New Admin
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

    // Show loading while initializing
    if (!isInitialized) {
        return (
            <div className="admin-dashboard-page">
                <div className="admin-dashboard-container">
                    <div className="loading">Initializing Admin Dashboard...</div>
                </div>
            </div>
        );
    }

    // Render different content based on active tab
    const renderContent = () => {
        if (loading) {
            return <div className="loading">Loading...</div>;
        }

        switch (activeTab) {
            case "event-management":
                return <EventManagementTabContent adminUserId={adminUserId} logActivity={logActivity} triggerRefresh={triggerRefresh} setDashboardData={setDashboardData} fetchDashboardData={fetchDashboardData} fetchInvitationAnalytics={fetchInvitationAnalytics} printAlert={printAlert} />;
            case "invitations":
                return <InvitationsTabContent analytics={invitationAnalytics} logActivity={logActivity} adminUserId={adminUserId} fetchInvitationStats={fetchInvitationStats} printAlert={printAlert} />;
            case "pricing":
                return <PricingTabContent plans={pricingPlans} revenueData={revenueData} adminUserId={adminUserId} logActivity={logActivity} printAlert={printAlert} />;
            case "users":
                return <UsersTabContent users={usersData} adminUserId={adminUserId} logActivity={logActivity} printAlert={printAlert} />;
            case "profile":
                return <ProfileTabContent
                    adminProfile={adminProfile}
                    adminUserId={adminUserId}
                    profileImage={profileImage}
                    onImageUpload={handleImageUpload}
                    onProfileUpdate={fetchAdminProfile}
                    logActivity={logActivity}
                    printAlert={printAlert}
                />;
            case "tickets":
                return <AdminTicket printAlert={printAlert} />;
            case "custom-plans":
                return (
                    <CustomPlanRequestsTab
                        requests={customPlanRequests}
                        loading={requestsLoading}
                        statusFilter={requestStatusFilter}
                        onStatusFilterChange={(status) => {
                            setRequestStatusFilter(status);
                            fetchCustomPlanRequests(status);
                        }}
                        onViewDetails={(request) => {
                            setSelectedRequest(request);
                            setRequestStatus(request.status);
                            setAdminNotes(request.admin_notes || '');
                            setShowRequestModal(true);
                        }}
                        onRefresh={() => fetchCustomPlanRequests(requestStatusFilter)}
                        formatDate={formatDate}
                    />
                );
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
                {/* Add Alert Component */}
                {alert.show && (
                    <div className={`custom-alert ${alert.type}`}>
                        <i className={`fas ${alert.type === "error" ? "fa-times-circle" :
                            alert.type === "success" ? "fa-check-circle" :
                                alert.type === "warning" ? "fa-exclamation-triangle" :
                                    "fa-info-circle"
                            }`}></i>
                        <span>{alert.message}</span>
                    </div>
                )}
                <div className="admin-dashboard-container">
                    {/* Sidebar Navigation */}
                    <aside className="admin-dashboard-sidebar">
                        <div className="admin-dashboard-logo">
                            <div className="logo-container">
                                <i className="bi bi-building-gear"></i>
                                <div className="logo-content">
                                    <h3>Evendi</h3>
                                    <span>Control Center</span>
                                </div>
                            </div>
                        </div>

                        <nav className="admin-dashboard-nav">
                            <ul>
                                <li
                                    className={`admin-dashboard-nav-item ${activeTab === "dashboard" ? "active" : ""}`}
                                    onClick={() => setActiveTab("dashboard")}
                                >
                                    <div className="nav-item-content">
                                        <i className="bi bi-grid-1x2"></i>
                                        <span>Dashboard Overview</span>
                                    </div>
                                    <div className="nav-indicator"></div>
                                </li>

                                <li className="nav-divider">
                                    <span>Content Management</span>
                                </li>

                                <li
                                    className={`admin-dashboard-nav-item ${activeTab === "event-management" ? "active" : ""}`}
                                    onClick={() => setActiveTab("event-management")}
                                >
                                    <div className="nav-item-content">
                                        <i className="bi bi-calendar-week"></i>
                                        <span>Event Management</span>
                                    </div>
                                </li>

                                <li
                                    className={`admin-dashboard-nav-item ${activeTab === "users" ? "active" : ""}`}
                                    onClick={() => setActiveTab("users")}
                                >
                                    <div className="nav-item-content">
                                        <i className="bi bi-person-gear"></i>
                                        <span>User Administration</span>
                                    </div>
                                </li>

                                <li
                                    className={`admin-dashboard-nav-item ${activeTab === "invitations" ? "active" : ""}`}
                                    onClick={() => setActiveTab("invitations")}
                                >
                                    <div className="nav-item-content">
                                        <i className="bi bi-send-check"></i>
                                        <span>Invitation Analytics</span>
                                    </div>
                                </li>

                                <li
                                    className={`admin-dashboard-nav-item ${activeTab === "pricing" ? "active" : ""}`}
                                    onClick={() => setActiveTab("pricing")}
                                >
                                    <div className="nav-item-content">
                                        <i className="bi bi-graph-up"></i>
                                        <span>Revenue & Pricing</span>
                                    </div>
                                </li>

                                <li
                                    className={`admin-dashboard-nav-item ${activeTab === "tickets" ? "active" : ""}`}
                                    onClick={() => setActiveTab("tickets")}
                                >
                                    <div className="nav-item-content">
                                        <i className="bi bi-headset"></i>
                                        <span>Support Tickets</span>
                                    </div>
                                </li>

                                {/* NEW: Custom Plan Requests Tab */}
                                <li
                                    className={`admin-dashboard-nav-item ${activeTab === "custom-plans" ? "active" : ""}`}
                                    onClick={() => {
                                        setActiveTab("custom-plans");
                                        fetchCustomPlanRequests('pending');
                                    }}
                                >
                                    <div className="nav-item-content">
                                        <i className="bi bi-file-text"></i>
                                        <span>Custom Plan Requests</span>
                                        {customPlanRequests.filter(r => r.status === 'pending').length > 0 && (
                                            <span className="badge bg-danger ms-2">
                                                {customPlanRequests.filter(r => r.status === 'pending').length}
                                            </span>
                                        )}
                                    </div>
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
                                {activeTab === "tickets" && "Support Tickets"}
                                {activeTab === "custom-plans" && "Custom Plan Requests"}
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
                                            onChange={(e) => setReportForm(prev => ({ ...prev, report_type: e.target.value }))}
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
                                            onChange={(e) => setReportForm(prev => ({ ...prev, date_range: e.target.value }))}
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
                                            onChange={(e) => setReportForm(prev => ({ ...prev, format: e.target.value }))}
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
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* System Logs Modal - PRODUCTION READY */}
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
                                    <small className="treeSet-indicator">
                                        <i className="bi bi-lightning-charge"></i>
                                    </small>
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
                                        onChange={(e) => handleLogsSearch(e.target.value)}
                                        className="search-input"
                                    />
                                </div>
                                <div className="filter-controls">
                                    <select
                                        value={logsFilter}
                                        onChange={(e) => handleLogsFilter(e.target.value)}
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

                                    {/* TreeSet Performance Info */}
                                    <div className="treeset-info">
                                        <small>
                                            <i className="bi bi-lightning-charge"></i>
                                            Showing {filteredActivities.length} of {activityTreeSet.getActivityCount()} activities
                                            (TreeSet optimized • Real-time updates • Production ready)
                                        </small>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Admin Modal */}
            {showCreateAdminModal && (
                <div className="modal-overview-new" onClick={() => setShowCreateAdminModal(false)}>
                    <div className="modal-content-new" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-new">
                            <h2>Create New Admin User</h2>
                            <button
                                className="close-btn-new"
                                onClick={() => setShowCreateAdminModal(false)}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="modal-body-new">
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                createAdmin();
                            }}>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label>First Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={newAdminData.name}
                                        onChange={(e) => setNewAdminData({ ...newAdminData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label>Last Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={newAdminData.lastname}
                                        onChange={(e) => setNewAdminData({ ...newAdminData, lastname: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        value={newAdminData.email}
                                        onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label>Password</label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        value={newAdminData.password}
                                        onChange={(e) => setNewAdminData({ ...newAdminData, password: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group" style={{ marginTop: '20px' }}>
                                    <button type="submit" className="btn btn-primary">
                                        Create Admin User
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Plan Request Details Modal */}
            {showRequestModal && selectedRequest && (
                <div className="modal-overlay-new" onClick={() => setShowRequestModal(false)}>
                    <div className="modal-content-new request-details-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-new">
                            <div className="modal-title-section">
                                <div className="modal-icon-large">
                                    <i className="bi bi-file-text"></i>
                                </div>
                                <div className="modal-title">
                                    <h2>Custom Plan Request Details</h2>
                                    <p>Request ID: {selectedRequest.request_id}</p>
                                </div>
                            </div>
                            <button
                                className="close-btn-new"
                                onClick={() => setShowRequestModal(false)}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="modal-body-new">
                            <div className="request-details-grid">
                                {/* Business Information Section */}
                                <div className="details-section">
                                    <h3 className="section-title">
                                        <i className="bi bi-building"></i> Business Information
                                    </h3>
                                    <div className="details-row">
                                        <div className="detail-item">
                                            <label>Business Name:</label>
                                            <span>{selectedRequest.business_name}</span>
                                        </div>
                                        <div className="detail-item">
                                            <label>Contact Person:</label>
                                            <span>{selectedRequest.contact_name}</span>
                                        </div>
                                        <div className="detail-item">
                                            <label>Email:</label>
                                            <span>{selectedRequest.email}</span>
                                        </div>
                                        <div className="detail-item">
                                            <label>Phone:</label>
                                            <span>{selectedRequest.phone}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Event Details Section */}
                                <div className="details-section">
                                    <h3 className="section-title">
                                        <i className="bi bi-calendar-event"></i> Event Details
                                    </h3>
                                    <div className="details-row">
                                        <div className="detail-item">
                                            <label>Event Type:</label>
                                            <span>{selectedRequest.event_type}</span>
                                        </div>
                                        <div className="detail-item">
                                            <label>Event Name:</label>
                                            <span>{selectedRequest.event_name}</span>
                                        </div>
                                        <div className="detail-item full-width">
                                            <label>Event Description:</label>
                                            <p className="event-description">{selectedRequest.event_description || 'No description provided'}</p>
                                        </div>
                                        <div className="detail-item">
                                            <label>Expected Attendees:</label>
                                            <span className="attendees-number">{selectedRequest.expected_attendees}</span>
                                        </div>
                                        <div className="detail-item">
                                            <label>Event Date:</label>
                                            <span>{selectedRequest.event_date ? new Date(selectedRequest.event_date).toLocaleDateString() : 'Not specified'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Special Requirements */}
                                {(selectedRequest.special_requirements || selectedRequest.additional_notes) && (
                                    <div className="details-section">
                                        <h3 className="section-title">
                                            <i className="bi bi-pencil"></i> Additional Information
                                        </h3>
                                        <div className="details-row">
                                            {selectedRequest.special_requirements && (
                                                <div className="detail-item full-width">
                                                    <label>Special Requirements:</label>
                                                    <p>{selectedRequest.special_requirements}</p>
                                                </div>
                                            )}
                                            {selectedRequest.additional_notes && (
                                                <div className="detail-item full-width">
                                                    <label>Additional Notes:</label>
                                                    <p>{selectedRequest.additional_notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Status Update Section */}
                                <div className="details-section">
                                    <h3 className="section-title">
                                        <i className="bi bi-gear"></i> Update Status
                                    </h3>
                                    <div className="status-update-form">
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Request Status</label>
                                                <select
                                                    className="form-select"
                                                    value={requestStatus}
                                                    onChange={(e) => setRequestStatus(e.target.value)}
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="reviewed">Reviewed</option>
                                                    <option value="approved">Approved</option>
                                                    <option value="rejected">Rejected</option>
                                                    <option value="completed">Completed</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <div className="form-row">
                                            <div className="form-group full-width">
                                                <label>Admin Notes</label>
                                                <textarea
                                                    className="form-textarea"
                                                    rows="4"
                                                    value={adminNotes}
                                                    onChange={(e) => setAdminNotes(e.target.value)}
                                                    placeholder="Add notes about this request..."
                                                />
                                            </div>
                                        </div>

                                        <div className="request-metadata">
                                            <small>
                                                <strong>Submitted:</strong> {formatDate(selectedRequest.created_at)}
                                            </small>
                                            {selectedRequest.reviewed_at && (
                                                <small>
                                                    <strong>Last Updated:</strong> {formatDate(selectedRequest.reviewed_at)}
                                                </small>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-actions-new">
                                <button
                                    className="action-btn-new primary"
                                    onClick={updateRequestStatus}
                                >
                                    <i className="bi bi-check-circle"></i>
                                    Update Request
                                </button>
                                <button
                                    className="action-btn-new secondary"
                                    onClick={() => setShowRequestModal(false)}
                                >
                                    <i className="bi bi-x-circle"></i>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Profile Tab Component with Logging
const ProfileTabContent = ({ adminProfile, adminUserId, profileImage, onImageUpload, onProfileUpdate, logActivity, printAlert }) => {
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        lastname: '',
        email: '',
        username: '',
        title: 'Administrator',
        language: 'English',
        password: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

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

    const handleLogout = async () => {
        try {
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
            // Clear all local storage
            localStorage.removeItem('user');
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            localStorage.removeItem('adminData');
            sessionStorage.clear();

            // Redirect to login page
            window.location.href = '/';
        }
    };

    const handlePasswordChange = async () => {
        // Validate that all fields are filled
        if (!formData.password || !formData.newPassword || !formData.confirmPassword) {
            setMessage('All password fields are required');
            setMessageType('error');
            return;
        }

        // Validate passwords match
        if (formData.newPassword !== formData.confirmPassword) {
            setMessage('New passwords do not match');
            setMessageType('error');
            return;
        }

        // Validate password strength
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
        if (!passwordRegex.test(formData.newPassword)) {
            setMessage('Password must be at least 6 characters long and contain uppercase, lowercase, number and special character');
            setMessageType('error');
            return;
        }

        // Prevent changing to the same password
        if (formData.password === formData.newPassword) {
            setMessage('New password cannot be the same as current password');
            setMessageType('error');
            return;
        }

        try {
            setLoading(true);
            setMessage(''); // Clear previous messages

            const formDataToSend = new FormData();
            formDataToSend.append('function', 'changeAdminPassword');
            formDataToSend.append('admin_user_id', adminUserId);
            formDataToSend.append('current_password', formData.password);
            formDataToSend.append('new_password', formData.newPassword);

            console.log('Sending password change request for admin:', adminUserId);

            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formDataToSend
            });

            // Get raw response text first
            const responseText = await response.text();
            console.log('Raw password change response:', responseText);

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                throw new Error('Invalid response from server. Please try again.');
            }

            console.log('Parsed password change response:', data);

            if (data.success) {
                setMessage('Password changed successfully! You will be redirected to login.');
                setMessageType('success');

                // Log the activity locally
                logActivity('Password Changed', 'Administrator successfully changed their password');

                // Clear password fields
                setFormData(prev => ({
                    ...prev,
                    password: '',
                    newPassword: '',
                    confirmPassword: ''
                }));

                // Reset password visibility
                setShowPasswords({
                    current: false,
                    new: false,
                    confirm: false
                });

                // Close modal after delay and redirect to login
                setTimeout(() => {
                    setChangingPassword(false);
                    setMessage('');
                    setMessageType('');

                    // Optional: Force logout and redirect to login page
                    const confirmLogout = window.confirm('Password changed successfully! For security, you need to login again. Click OK to continue.');
                    if (confirmLogout) {
                        handleLogout();
                    }
                }, 3000);

            } else {
                // Handle specific error messages
                let errorMessage = data.message || 'Failed to change password';

                // Provide more user-friendly error messages
                if (errorMessage.includes('Current password is incorrect')) {
                    errorMessage = 'The current password you entered is incorrect. Please try again.';
                } else if (errorMessage.includes('at least 6 characters')) {
                    errorMessage = 'New password must be at least 6 characters long.';
                } else if (errorMessage.includes('Database error')) {
                    errorMessage = 'A database error occurred. Please contact system administrator.';
                } else if (errorMessage.includes('Unauthorized')) {
                    errorMessage = 'You are not authorized to perform this action.';
                }

                setMessage(errorMessage);
                setMessageType('error');

                // Log the failed attempt
                logActivity('Password Change Failed', `Failed to change password: ${data.message}`);
            }
        } catch (error) {
            console.error('Error changing password:', error);

            let errorMessage = 'Network error: Unable to connect to server. ';
            if (error.message.includes('Invalid response')) {
                errorMessage += 'Please check if the server is running.';
            } else {
                errorMessage += 'Please try again later.';
            }

            setMessage(errorMessage);
            setMessageType('error');

            logActivity('Password Change Error', `Password change error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({
            ...prev,
            [field]: !prev[field]
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
                <div className={`custom-alert ${messageType}`}>
                    <i className={`fas ${messageType === "error" ? "fa-times-circle" :
                        messageType === "success" ? "fa-check-circle" :
                            messageType === "warning" ? "fa-exclamation-triangle" :
                                "fa-info-circle"
                        }`}></i>
                    <span>{message}</span>
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
                                <div className="password-field-with-button">
                                    <input
                                        type="password"
                                        value="••••••••"
                                        disabled
                                        className="disabled"
                                    />
                                    {editMode && (
                                        <button
                                            type="button"
                                            className="btn-change-password"
                                            onClick={() => setChangingPassword(true)}
                                        >
                                            <i className="bi bi-key"></i> Change
                                        </button>
                                    )}
                                </div>

                                {changingPassword && (
                                    <div className="modal-overlay-new" onClick={() => setChangingPassword(false)}>
                                        <div className="modal-content-new" onClick={(e) => e.stopPropagation()}>
                                            <div className="modal-header-new">
                                                <div className="modal-title-section">
                                                    <div className="modal-icon-large">
                                                        <i className="bi bi-key"></i>
                                                    </div>
                                                    <div className="modal-title">
                                                        <h2>Change Password</h2>
                                                        <p>Update your administrator password</p>
                                                    </div>
                                                </div>
                                                <button
                                                    className="close-btn-new"
                                                    onClick={() => setChangingPassword(false)}
                                                    disabled={loading}
                                                >
                                                    <i className="bi bi-x-lg"></i>
                                                </button>
                                            </div>

                                            <div className="modal-body-new">
                                                <div className="form-group-new">
                                                    <label>Current Password *</label>
                                                    <div className="password-input-new">
                                                        <input
                                                            type={showPasswords.current ? "text" : "password"}
                                                            value={formData.password}
                                                            onChange={(e) => handleInputChange('password', e.target.value)}
                                                            placeholder="Enter your current password"
                                                            className="form-control-new"
                                                        />
                                                        <button
                                                            type="button"
                                                            className="password-toggle-new"
                                                            onClick={() => setShowPasswords(prev => ({
                                                                ...prev,
                                                                current: !prev.current
                                                            }))}
                                                        >
                                                            <i className={`bi bi-eye${showPasswords.current ? '-slash' : ''}`}></i>
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="form-group-new">
                                                    <label>New Password *</label>
                                                    <div className="password-input-new">
                                                        <input
                                                            type={showPasswords.new ? "text" : "password"}
                                                            value={formData.newPassword}
                                                            onChange={(e) => handleInputChange('newPassword', e.target.value)}
                                                            placeholder="Enter new password"
                                                            className="form-control-new"
                                                        />
                                                        <button
                                                            type="button"
                                                            className="password-toggle-new"
                                                            onClick={() => setShowPasswords(prev => ({
                                                                ...prev,
                                                                new: !prev.new
                                                            }))}
                                                        >
                                                            <i className={`bi bi-eye${showPasswords.new ? '-slash' : ''}`}></i>
                                                        </button>
                                                    </div>
                                                    <small className="password-requirements">
                                                        Password must be at least 6 characters with uppercase, lowercase, number and special character
                                                    </small>
                                                </div>

                                                <div className="form-group-new">
                                                    <label>Confirm New Password *</label>
                                                    <div className="password-input-new">
                                                        <input
                                                            type={showPasswords.confirm ? "text" : "password"}
                                                            value={formData.confirmPassword}
                                                            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                                            placeholder="Confirm new password"
                                                            className="form-control-new"
                                                        />
                                                        <button
                                                            type="button"
                                                            className="password-toggle-new"
                                                            onClick={() => setShowPasswords(prev => ({
                                                                ...prev,
                                                                confirm: !prev.confirm
                                                            }))}
                                                        >
                                                            <i className={`bi bi-eye${showPasswords.confirm ? '-slash' : ''}`}></i>
                                                        </button>
                                                    </div>
                                                </div>

                                                {message && (
                                                    <div className={`custom-alert ${messageType}`}>
                                                        <i className={`fas ${messageType === "error" ? "fa-times-circle" :
                                                            messageType === "success" ? "fa-check-circle" :
                                                                messageType === "warning" ? "fa-exclamation-triangle" :
                                                                    "fa-info-circle"
                                                            }`}></i>
                                                        <span>{message}</span>
                                                    </div>
                                                )}

                                                <div className="modal-actions-new">
                                                    <button
                                                        className="action-btn-new primary"
                                                        onClick={handlePasswordChange}
                                                        disabled={loading || !formData.password || !formData.newPassword || !formData.confirmPassword}
                                                    >
                                                        {loading ? (
                                                            <>
                                                                <div className="spinner-small"></div>
                                                                Updating...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="bi bi-check-circle"></i>
                                                                Update Password
                                                            </>
                                                        )}
                                                    </button>
                                                    <button
                                                        className="action-btn-new secondary"
                                                        onClick={() => setChangingPassword(false)}
                                                        disabled={loading}
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
const InvitationsTabContent = ({ analytics, logActivity, adminUserId, printAlert }) => {
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

            // Create CSV directly from current data (client-side only)
            let csvContent = "Event Name,Organizer,Invitations Sent,Opened,Responses,Response Rate,Status\n";

            if (analytics && analytics.length > 0) {
                analytics.forEach(item => {
                    const safeEventName = (item.eventName || '').replace(/"/g, '""');
                    const safeOrganizer = (item.organizer || 'N/A').replace(/"/g, '""');

                    csvContent += `"${safeEventName}","${safeOrganizer}","${item.sent || 0}","${item.opened || 0}","${item.responded || 0}","${item.responseRate || '0%'}","${item.status || 'draft'}"\n`;
                });
            } else {
                csvContent += "No invitation data available for export\n";
            }

            // Create and download CSV
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `invitation_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setShowExportModal(false);
            logActivity('Invitation Data Exported', 'Exported invitation analytics to CSV');
            printAlert('Export downloaded successfully!', 'success');

        } catch (error) {
            console.error('Error exporting data:', error);
            printAlert('Export failed: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const viewEventDetails = (event) => {
        setSelectedEvent(event);
        setShowEventModal(true);
    };

    const refreshData = async () => {
        setLoading(true);
        await Promise.all([
            fetchInvitationStats(),
            fetchInvitationAnalytics()
        ]);
        setLoading(false);
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
                                    onChange={(e) => setExportFilters(prev => ({ ...prev, status: e.target.value }))}
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
                                    onChange={(e) => setExportFilters(prev => ({ ...prev, user_id: e.target.value }))}
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

const PricingTabContent = ({ plans, adminUserId, logActivity, printAlert }) => {
    const [activeSection, setActiveSection] = useState('plans');
    const [packageCategory, setPackageCategory] = useState('personal'); // 'personal' or 'business'
    const [editingPlan, setEditingPlan] = useState(null);
    const [editForm, setEditForm] = useState({
        package_type: '',
        name: '',
        max_guests: '',
        max_events: '',
        price: '',
        features: ''
    });
    const [allPlans, setAllPlans] = useState(plans);
    const [businessPlans, setBusinessPlans] = useState([]);
    const [showEditModal, setShowEditModal] = useState(false);

    // Keep local plans in sync when parent prop `plans` changes
    useEffect(() => {
        setAllPlans(Array.isArray(plans) ? plans : []);
    }, [plans]);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [revenueData, setRevenueData] = useState(null);
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
    const [userTypeFilter, setUserTypeFilter] = useState('all'); // 'all', 'personal', 'business'
    const [sortBy, setSortBy] = useState('payment_date');
    const [sortOrder, setSortOrder] = useState('desc');
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // New states for real data
    const [activeSubscriptions, setActiveSubscriptions] = useState({});
    const [packageUsageStats, setPackageUsageStats] = useState([]);

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';

    useEffect(() => {
        fetchBusinessPlans();
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

    useEffect(() => {
    console.log('🔄 Business plans state updated:', businessPlans);
    console.log('📊 Business plans count:', businessPlans.length);
    
    if (businessPlans.length > 0) {
        console.log('📋 First business plan:', businessPlans[0]);
        console.log('🔍 First plan features:', businessPlans[0].features);
        console.log('🔍 First plan features type:', typeof businessPlans[0].features);
    }
}, [businessPlans]);

useEffect(() => {
    // Also log when packageCategory changes
    console.log('📦 Package category changed to:', packageCategory);
    console.log('🏢 Business plans available:', businessPlans.length);
    console.log('👤 Personal plans available:', allPlans.length);
}, [packageCategory, businessPlans, allPlans]);

    const fetchBusinessPlans = async () => {
    try {
        console.log('Fetching business plans...');
        
        // FIX: Use 'function' parameter instead of 'action'
        const response = await fetch(`${API_BASE_URL}/query.php`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: new URLSearchParams({ 
                function: 'getBusinessPackages'  // Change from 'action' to 'function'
            })
        });
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Business plans response:', data);
        
        if (data.success) {
            setBusinessPlans(data.packages);
            console.log('Business plans set:', data.packages);
        } else {
            console.error('Failed to fetch business plans:', data.message);
        }
    } catch (error) {
        console.error('Error fetching business plans:', error);
    }
};

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
                    setRevenueData(data.analytics);
                }
            }
        } catch (error) {
            console.error('Revenue analytics endpoint not available:', error);
            setRevenueData({
                total_revenue: 0,
                current_month_revenue: 0,
                payment_status_counts: []
            });
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

    // Calculate personal revenue
    const getPersonalRevenue = () => {
        if (!paymentHistory || !Array.isArray(paymentHistory)) return 0;
        return paymentHistory
            .filter(p => p.account_type === 'personal' && p.payment_status === 'completed')
            .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    };

    // Calculate business revenue
    const getBusinessRevenue = () => {
        if (!paymentHistory || !Array.isArray(paymentHistory)) return 0;
        return paymentHistory
            .filter(p => p.account_type === 'business' && p.payment_status === 'completed')
            .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    };

    // Calculate filtered revenue (based on current filters)
    const getFilteredRevenue = () => {
        return filteredPayments
            .filter(p => p.payment_status === 'completed')
            .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    };

    const filteredPayments = useMemo(() => {
        if (!paymentHistory || !Array.isArray(paymentHistory)) return [];

        let filtered = [...paymentHistory];

        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(payment =>
                (payment.user_name && payment.user_name.toLowerCase().includes(query)) ||
                (payment.user_email && payment.user_email.toLowerCase().includes(query)) ||
                (payment.payment_id && payment.payment_id.toLowerCase().includes(query)) ||
                (payment.package_type && payment.package_type.toLowerCase().includes(query))
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(payment => payment.payment_status === statusFilter);
        }

        if (packageFilter !== 'all') {
            filtered = filtered.filter(payment => payment.package_type === packageFilter);
        }

        if (userTypeFilter !== 'all') {
            filtered = filtered.filter(payment => payment.account_type === userTypeFilter);
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
    }, [paymentHistory, searchQuery, statusFilter, packageFilter, dateFilter, userTypeFilter, sortBy, sortOrder]);

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
        logActivity('Payment Details Viewed', `Viewed payment details for transaction: ${payment.payment_id}`);
    };

   // Helper function to parse features safely - UPDATED VERSION
const parseFeatures = (features) => {
    console.log('parseFeatures input:', features, 'Type:', typeof features);
    
    if (!features) return [];
    
    // If it's already an array, return it
    if (Array.isArray(features)) {
        console.log('Features is already an array');
        return features.filter(f => f && typeof f === 'string');
    }
    
    // If it's a string, try to parse as JSON first
    if (typeof features === 'string') {
        try {
            // Try parsing as JSON (for business packages from PHP)
            const parsed = JSON.parse(features);
            console.log('Successfully parsed as JSON:', parsed);
            if (Array.isArray(parsed)) {
                return parsed.filter(f => f && typeof f === 'string');
            }
        } catch (e) {
            console.log('Not JSON, treating as comma-separated string');
            // If not valid JSON, treat as comma-separated string
            return features.split(',').map(f => f.trim()).filter(f => f.length > 0);
        }
    }
    
    console.log('Returning empty array');
    return [];
};

    const startEditing = (plan) => {
        setEditingPlan(plan.package_id || plan.id);
        const rawFeatures = plan.features || ''; // ← safety
        const parsedFeatures = parseFeatures(rawFeatures);

        setEditForm({
            package_type: plan.package_type || '',
            name: plan.name || plan.package_type || '',
            max_guests: plan.max_guests || '',
            max_events: plan.max_events || '',
            price: plan.price || '',
            features: parsedFeatures.join(', ')
        });
        setShowEditModal(true);

        console.group('Edit Modal Opened');
        console.log('Plan ID:', plan.package_id || plan.id);
        console.log('Plan Name:', formatPlanName(plan.package_type || plan.name));
        console.log('Raw Features (DB):', plan.features);
        console.log('Parsed Features:', parsedFeatures);
        console.log('Features String:', parsedFeatures.join(', '));
        console.groupEnd();
    };

    const cancelEditing = () => {
        setEditingPlan(null);
        setEditForm({
            package_type: '',
            max_guests: '',
            max_events: '',
            price: '',
            features: ''
        });
        setShowEditModal(false);
    };

    const handleEditChange = (field, value) => {
        setEditForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const savePackage = async () => {
        if (!editingPlan) return;

        try {
            const formData = new FormData();
            const isBusinessPackage = packageCategory === 'business';

            if (isBusinessPackage) {
                formData.append('function', 'updateBusinessPackage');
                formData.append('id', editingPlan);
                formData.append('package_type', editForm.package_type);
                formData.append('name', editForm.name || editForm.package_type);
                formData.append('price', editForm.price);
                formData.append('max_guests', editForm.max_guests);
                formData.append('max_events', editForm.max_events);
                formData.append('features', editForm.features);
            } else {
                formData.append('function', 'updatePackage');
                formData.append('package_id', editingPlan);
                formData.append('package_type', editForm.package_type);
                formData.append('max_guests', editForm.max_guests);
                formData.append('max_events', editForm.max_events);
                formData.append('price', editForm.price);
                formData.append('features', editForm.features);
                formData.append('admin_user_id', adminUserId);
            }

            // Detailed logging for debugging
            console.group('📦 Package Update Debug Info');
            console.log('⏱️ Timestamp:', new Date().toISOString());
            console.log('🆔 Package ID:', editingPlan);
            console.log('📝 Package Type:', editForm.package_type);
            console.log('👥 Max Guests:', editForm.max_guests);
            console.log('📅 Max Events:', editForm.max_events);
            console.log('💰 Price:', editForm.price);
            console.log('✨ Features:', editForm.features);
            console.log('🏢 Is Business Package:', isBusinessPackage);
            console.log('🌐 API URL:', API_BASE_URL);
            console.groupEnd();

            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });

            console.log('📡 Network Response Status:', response.status, response.statusText);

            const data = await response.json();
            console.log('✅ Server Response:', JSON.stringify(data, null, 2));

            if (data.success) {
                if (isBusinessPackage) {
                    setBusinessPlans(prevPlans =>
                        prevPlans.map(plan =>
                            plan.id === editingPlan
                                ? { 
                                    ...plan, 
                                    package_type: editForm.package_type,
                                    name: editForm.name || editForm.package_type, 
                                    price: editForm.price, 
                                    max_guests: editForm.max_guests,
                                    max_events: editForm.max_events,
                                    features: editForm.features 
                                }
                                : plan
                        )
                    );
                } else {
                    setAllPlans(prevPlans =>
                        prevPlans.map(plan =>
                            plan.package_id === editingPlan
                                ? { ...plan, ...editForm }
                                : plan
                        )
                    );
                }
                setEditingPlan(null);
                setShowEditModal(false);
                fetchActiveSubscriptions();
                fetchPackageUsageStats();
                logActivity('Package Updated',
                    `Updated ${editForm.package_type} package: ${editForm.max_events || 'N/A'} events, ${editForm.max_guests || 'N/A'} guests, R${editForm.price}`
                );
                printAlert('Package updated successfully!', 'success');
            } else {
                console.error('❌ Server error response:', data.message);
                if (data.message && data.message.includes("Unauthorized")) {
                    printAlert('Access denied: Admin privileges required', 'error');
                } else {
                    printAlert('Error updating package: ' + data.message, 'error');
                }
                logActivity('Package Update Failed', `Failed to update package: ${data.message}`);
            }
        } catch (error) {
            console.error('❌ Error updating package:', error);
            console.error('🔍 Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            printAlert('Error updating package', 'error');
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
                printAlert('Manual payment added successfully!', 'success');
                setShowManualPayment(false);
                setManualPaymentForm({
                    user_id: '',
                    package_id: '',
                    amount: '',
                    payment_method: 'manual',
                    billing_cycle: 'monthly'
                });
                fetchPaymentHistory();
                fetchRevenueAnalytics();
                fetchActiveSubscriptions();
                fetchPackageUsageStats();
            } else {
                printAlert('Error adding payment: ' + data.message, 'error');
                logActivity('Manual Payment Failed', `Failed to add manual payment: ${data.message}`);
            }
        } catch (error) {
            console.error('Error adding manual payment:', error);
            printAlert('Error adding manual payment', 'error');
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
                printAlert('Payment status updated successfully!', 'success');
                fetchPaymentHistory();
                fetchRevenueAnalytics();
            } else {
                printAlert('Error updating status: ' + data.message, 'error');
                logActivity('Payment Status Update Failed', `Failed to update payment status: ${data.message}`);
            }
        } catch (error) {
            console.error('Error updating payment status:', error);
            printAlert('Error updating payment status', 'error');
            logActivity('Payment Status Update Error', `Payment status update error: ${error.message}`);
        }
    };

    const formatPlanName = (packageType) => {
        if (!packageType) return 'Enterprise';
        return packageType.charAt(0).toUpperCase() + packageType.slice(1);
    };

    const getActiveSubscriptions = (packageType) => {
        // Ensure count is displayed as a normal integer (no leading zeros)
        const val = activeSubscriptions[packageType] || 0;
        return typeof val === 'string' ? parseInt(val, 10) : val;
    };

    const getPaidSubscriptions = () => {
        // Calculate total paid subscriptions (excluding FREE tier)
        const paidTypes = ['basic', 'premium', 'enterprise'];
        return paidTypes.reduce((total, type) => {
            const val = activeSubscriptions[type] || 0;
            const count = typeof val === 'string' ? parseInt(val, 10) : val;
            return total + count;
        }, 0);
    };

    const getTotalActiveUsers = () => {
        // Calculate total active users (including FREE tier)
        return Object.values(activeSubscriptions).reduce((total, val) => {
            const count = typeof val === 'string' ? parseInt(val, 10) : val;
            return total + count;
        }, 0);
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
                    <div className="stats-cards">
                        <div className="stat-card">
                            <div className="stat-icon">
                                <i className="bi bi-people"></i>
                            </div>
                            <div className="stat-content">
                                <label>Total Active Users</label>
                                <p className="stat-number">{getTotalActiveUsers()}</p>
                                <small>All active subscriptions</small>
                            </div>
                        </div>
                    </div>
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
                <>
                    <div className="package-category-selector">
                        <div className="selector-buttons">
                            <button
                                className={`category-btn ${packageCategory === 'personal' ? 'active' : ''}`}
                                onClick={() => {
                                    console.log('Switching to personal packages');
                                    setPackageCategory('personal');
                                }}
                            >
                                <i className="bi bi-person"></i> Personal Packages
                            </button>
                            <button
                                className={`category-btn ${packageCategory === 'business' ? 'active' : ''}`}
                                onClick={() => {
                                    console.log('Switching to business packages');
                                    setPackageCategory('business');
                                }}
                            >
                                <i className="bi bi-building"></i> Business Packages
                            </button>
                        </div>
                    </div>
                    <div className="pricing-plans-grid">
    {console.log('DEBUG - Current state:', {
        packageCategory,
        allPlansCount: allPlans.length,
        businessPlansCount: businessPlans.length,
        businessPlansData: businessPlans
    })}

    {/* Show empty message for business plans */}
    {packageCategory === 'business' && businessPlans.length === 0 && (
        <div className="empty-state">
            <i className="bi bi-building"></i>
            <h3>No Business Packages Found</h3>
            <p>Check browser console for debugging information</p>
            <button 
                className="btn btn-primary" 
                onClick={fetchBusinessPlans}
                style={{ marginTop: '10px' }}
            >
                Retry Loading Business Plans
            </button>
        </div>
    )}

    {/* Render plans based on category */}
    {(packageCategory === 'personal' ? allPlans : businessPlans).map(plan => {
        console.log('Rendering plan:', plan);
        
        // For debugging: Log the features
        console.log('Plan features raw:', plan.features);
        console.log('Parsed features:', parseFeatures(plan.features));
        
        return (
            <div key={plan.package_id || plan.id} className="pricing-plan-card">
                <div className="plan-header">
                    <h3>
                        {/* Handle both naming conventions */}
                        {formatPlanName(plan.package_type || plan.name)}
                    </h3>
                    <span className="plan-status active">Active</span>
                </div>

                <div className="plan-price">
                    <span className="price-amount">R{plan.price || '0.00'}</span>
                    <span className="price-interval"></span>
                </div>

                <div className="plan-subscriptions">
                    <i className="bi bi-people"></i>
                    <span>
                        {/* Use plan.name for business, plan.package_type for personal */}
                        {getActiveSubscriptions(plan.package_type || plan.name)} active subscriptions
                    </span>
                </div>

                <div className="plan-features">
                    <h4>Features:</h4>
                    <ul>
                        <li>
                            <strong>Max Guests:</strong> {plan.max_guests || 'Unlimited'}
                        </li>
                        <li>
                            <strong>Max Events:</strong> {plan.max_events || 'Unlimited'}
                        </li>
                        {parseFeatures(plan.features).map((feature, index) => (
                            <li key={index}>{feature}</li>
                        ))}
                    </ul>
                </div>

                <div className="plan-actions">
                    <button
                        className="btn btn-outline btn-sm"
                        onClick={() => startEditing(plan)}
                    >
                        <i className="bi bi-pencil"></i> Edit
                    </button>
                </div>
            </div>
        );
    })}
</div>
                </>
            ) : (
                <div className="payment-history-section">
                    {/* User Type Filter Buttons */}
                    <div className="user-type-filter-buttons" style={{
                        display: 'flex',
                        gap: '10px',
                        marginBottom: '20px',
                        padding: '15px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px'
                    }}>
                        <button
                            className={`filter-btn ${userTypeFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setUserTypeFilter('all')}
                            style={{
                                padding: '10px 20px',
                                border: 'none',
                                borderRadius: '6px',
                                backgroundColor: userTypeFilter === 'all' ? '#667eea' : '#e0e0e0',
                                color: userTypeFilter === 'all' ? 'white' : '#333',
                                cursor: 'pointer',
                                fontWeight: userTypeFilter === 'all' ? 'bold' : 'normal',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <i className="bi bi-globe"></i> All Users
                        </button>
                        <button
                            className={`filter-btn ${userTypeFilter === 'personal' ? 'active' : ''}`}
                            onClick={() => setUserTypeFilter('personal')}
                            style={{
                                padding: '10px 20px',
                                border: 'none',
                                borderRadius: '6px',
                                backgroundColor: userTypeFilter === 'personal' ? '#667eea' : '#e0e0e0',
                                color: userTypeFilter === 'personal' ? 'white' : '#333',
                                cursor: 'pointer',
                                fontWeight: userTypeFilter === 'personal' ? 'bold' : 'normal',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <i className="bi bi-person"></i> Personal
                        </button>
                        <button
                            className={`filter-btn ${userTypeFilter === 'business' ? 'active' : ''}`}
                            onClick={() => setUserTypeFilter('business')}
                            style={{
                                padding: '10px 20px',
                                border: 'none',
                                borderRadius: '6px',
                                backgroundColor: userTypeFilter === 'business' ? '#667eea' : '#e0e0e0',
                                color: userTypeFilter === 'business' ? 'white' : '#333',
                                cursor: 'pointer',
                                fontWeight: userTypeFilter === 'business' ? 'bold' : 'normal',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <i className="bi bi-building"></i> Business
                        </button>
                    </div>

                    <div className="revenue-stats-grid">
                        <div className="revenue-card total">
                            <div className="revenue-icon">
                                <i className="bi bi-currency-dollar"></i>
                            </div>
                            <div className="revenue-content">
                                <h3>Total Revenue</h3>
                                <p className="revenue-amount">
                                    {userTypeFilter === 'all' 
                                        ? (revenueData ? formatCurrency(revenueData.total_revenue) : 'Loading...')
                                        : formatCurrency(getFilteredRevenue())
                                    }
                                </p>
                                <span className="revenue-trend">{userTypeFilter === 'all' ? 'All time' : `${userTypeFilter} users`}</span>
                            </div>
                        </div>

                        <div className="revenue-card monthly">
                            <div className="revenue-icon">
                                <i className="bi bi-person"></i>
                            </div>
                            <div className="revenue-content">
                                <h3>Personal Subscriptions</h3>
                                <p className="revenue-amount">
                                    {paymentHistory.filter(p => p.account_type === 'personal' && p.payment_status === 'completed').length}
                                </p>
                                <span className="revenue-trend">Active personal users</span>
                            </div>
                        </div>

                        <div className="revenue-card pending">
                            <div className="revenue-icon">
                                <i className="bi bi-building"></i>
                            </div>
                            <div className="revenue-content">
                                <h3>Business Subscriptions</h3>
                                <p className="revenue-amount">
                                    {paymentHistory.filter(p => p.account_type === 'business' && p.payment_status === 'completed').length}
                                </p>
                                <span className="revenue-trend">Active business users</span>
                            </div>
                        </div>
                    </div>

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
                                </select>

                                <select
                                    value={packageFilter}
                                    onChange={(e) => setPackageFilter(e.target.value)}
                                >
                                    <option value="all">All Packages</option>
                                    <optgroup label="Personal Packages">
                                        {allPlans.map(plan => (
                                            <option key={plan.package_id} value={plan.package_type}>
                                                {formatPlanName(plan.package_type)}
                                            </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Business Packages">
                                        {businessPlans.map(plan => (
                                            <option key={plan.id} value={plan.name}>
                                                {plan.name.replace(' Business', '').replace(' business', '')}
                                            </option>
                                        ))}
                                    </optgroup>
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
                                    <span className="sortable" onClick={() => handleSort('account_type')}>
                                        User Type {sortBy === 'account_type' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </span>
                                    <span className="sortable" onClick={() => handleSort('package_type')}>
                                        Package {sortBy === 'package_type' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </span>
                                    <span>Amount</span>
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
                                            <span className={`user-type-badge ${payment.account_type}`} style={{
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                backgroundColor: payment.account_type === 'business' ? '#e7f3ff' : '#f0e7ff',
                                                color: payment.account_type === 'business' ? '#0066cc' : '#7c3aed'
                                            }}>
                                                {payment.account_type === 'business' ? '🏢 Business' : '👤 Personal'}
                                            </span>
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

            {/* Edit Package Modal - FULLY WORKING WITH TAGS */}
            {showEditModal && (
                <div className="modal-overlay" onClick={cancelEditing}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit Package</h2>
                            <button className="close-btn" onClick={cancelEditing}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Package Name *</label>
                                    <input 
                                        type="text" 
                                        value={editForm.name || editForm.package_type} 
                                        onChange={(e) => handleEditChange('name', e.target.value)} 
                                        placeholder="Enter package name" 
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Package Type *</label>
                                    <select value={editForm.package_type} onChange={(e) => handleEditChange('package_type', e.target.value)}>
                                        {packageCategory === 'personal' ? (
                                            <>
                                                <option value="free">Free</option>
                                                <option value="basic">Basic</option>
                                                <option value="premium">Premium</option>
                                                <option value="enterprise">Enterprise</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="starter">Starter</option>
                                                <option value="intermediate">Intermediate</option>
                                                <option value="advance">Advance</option>
                                                <option value="advance_plus">Advance Plus</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Max Guests *</label>
                                    <input type="number" value={editForm.max_guests} onChange={(e) => handleEditChange('max_guests', e.target.value)} placeholder="Enter max guests" />
                                </div>
                                <div className="form-group">
                                    <label>Max Events</label>
                                    <input type="number" value={editForm.max_events} onChange={(e) => handleEditChange('max_events', e.target.value)} placeholder="Enter max events (optional)" />
                                </div>
                                <div className="form-group">
                                    <label>Price (R) *</label>
                                    <input type="number" step="0.01" value={editForm.price} onChange={(e) => handleEditChange('price', e.target.value)} placeholder="0.00" />
                                </div>

                                <div className="form-group full-width">
                                    <label>Features *</label>
                                    <div className="features-tags-input">
                                        <div className="tags-list">
                                            {parseFeatures(editForm.features).map((feature, index) => (
                                                <span key={index} className="feature-tag">
                                                    {feature}
                                                    <button
                                                        type="button"
                                                        className="remove-tag"
                                                        onClick={() => {
                                                            const updated = parseFeatures(editForm.features)
                                                                .filter((_, i) => i !== index)
                                                                .join(', ');
                                                            handleEditChange('features', updated);
                                                        }}
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder={parseFeatures(editForm.features).length === 0 ? "Type a feature and press Enter" : ""}
                                            className="tag-input"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ',') {
                                                    e.preventDefault();
                                                    const val = e.target.value.trim();
                                                    if (val) {
                                                        const current = parseFeatures(editForm.features);
                                                        const newFeatures = val.includes(',') ? val.split(',').map(f => f.trim()).filter(f => f) : [val];
                                                        const unique = [...new Set([...current, ...newFeatures])];
                                                        handleEditChange('features', unique.join(', '));
                                                        e.target.value = '';
                                                    }
                                                } else if (e.key === 'Backspace' && e.target.value === '' && parseFeatures(editForm.features).length > 0) {
                                                    const updated = parseFeatures(editForm.features);
                                                    updated.pop();
                                                    handleEditChange('features', updated.join(', '));
                                                }
                                            }}
                                            onBlur={(e) => {
                                                const val = e.target.value.trim();
                                                if (val) {
                                                    const current = parseFeatures(editForm.features);
                                                    const unique = [...new Set([...current, val])];
                                                    handleEditChange('features', unique.join(', '));
                                                    e.target.value = '';
                                                }
                                            }}
                                        />
                                    </div>
                                    <small className="form-help">
                                        Press Enter or comma to add. Click × or Backspace to remove.
                                    </small>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button
                                    className="btn btn-primary"
                                    onClick={savePackage}
                                    disabled={
                                        !editForm.package_type || 
                                        !editForm.price || 
                                        !editForm.features.trim() ||
                                        !editForm.max_guests
                                    }
                                >
                                    Save Changes
                                </button>
                                <button className="btn btn-outline" onClick={cancelEditing}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Payment Modal */}
            {showManualPayment && (
                <div className="modal-overlay" onClick={() => setShowManualPayment(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add Manual Payment</h2>
                            <button className="close-btn" onClick={() => setShowManualPayment(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>User *</label>
                                    <select value={manualPaymentForm.user_id} onChange={(e) => setManualPaymentForm(prev => ({ ...prev, user_id: e.target.value }))}>
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
                                    <select value={manualPaymentForm.package_id} onChange={(e) => setManualPaymentForm(prev => ({ ...prev, package_id: e.target.value }))}>
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
                                    <input type="number" step="0.01" value={manualPaymentForm.amount} onChange={(e) => setManualPaymentForm(prev => ({ ...prev, amount: e.target.value }))} placeholder="0.00" />
                                </div>
                                <div className="form-group">
                                    <label>Billing Cycle</label>
                                    <select value={manualPaymentForm.billing_cycle} onChange={(e) => setManualPaymentForm(prev => ({ ...prev, billing_cycle: e.target.value }))}>
                                        <option value="monthly">Monthly</option>
                                        <option value="yearly">Yearly</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button className="btn btn-primary" onClick={handleManualPayment} disabled={!manualPaymentForm.user_id || !manualPaymentForm.package_id || !manualPaymentForm.amount}>
                                    Add Payment
                                </button>
                                <button className="btn btn-outline" onClick={() => setShowManualPayment(false)}>
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
                                    <p>Payment ID: {selectedPayment.payment_id}</p>
                                </div>
                            </div>
                            <button className="close-btn-new" onClick={() => setShowPaymentModal(false)}>
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
                            </div>

                            <div className="payment-actions-new">
                                {selectedPayment.payment_status === 'pending' && (
                                    <button className="action-btn-new success" onClick={() => {
                                        updatePaymentStatus(selectedPayment.payment_id, 'completed');
                                        setShowPaymentModal(false);
                                    }}>
                                        <i className="bi bi-check-circle"></i>
                                        Mark as Completed
                                    </button>
                                )}
                                <button className="action-btn-new secondary" onClick={() => setShowPaymentModal(false)}>
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

// Users Tab Content with Logging - FIXED LINKED LIST IMPLEMENTATION
const UsersTabContent = ({ users: initialUsers, adminUserId, logActivity, printAlert }) => {
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

    // Linked List for users - FIXED IMPLEMENTATION
    const [usersList, setUsersList] = useState(new UsersLinkedList());

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';

    // Always fetch fresh data when component mounts
    useEffect(() => {
        fetchUsersData();
    }, []);

    // Initialize with linked list when users data changes - FIXED
    useEffect(() => {
        if (initialUsers && initialUsers.length > 0) {
            const newList = new UsersLinkedList();
            newList.appendAll(initialUsers.map(user => ({
                id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role || 'event_planner',
                status: user.status || 'active',
                joined: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'
            })));
            setUsersList(newList);
            setFilteredUsers(newList.toArray()); // Initialize with all users
            setUsers(initialUsers);
        }
    }, [initialUsers]);

    useEffect(() => {
        if (selectedUser && showUserModal) {
            fetchUserStats(selectedUser.id);
        }
    }, [selectedUser, showUserModal]);

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

                // Initialize linked list with fetched data
                const newList = new UsersLinkedList();
                newList.appendAll(formattedUsers);
                setUsersList(newList);
                setFilteredUsers(newList.toArray()); // Show all users initially
                setUsers(formattedUsers);

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

    // FIXED: Only use linked list for search - NO MORE useEffect OVERRIDE!
    const handleSearch = (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (!query.trim()) {
            // Show all users when search is empty
            applyFiltersAndSort(usersList.toArray());
        } else {
            // USE LINKED LIST SEARCH - This is where the performance boost happens!
            const searchResults = usersList.findByName(query);
            applyFiltersAndSort(searchResults);
        }
    };

    // Helper function to apply status filter and sorting
    const applyFiltersAndSort = (userArray) => {
        let result = [...userArray];

        // Apply status filter
        if (selectedStatus !== 'all') {
            result = result.filter(user => user.status === selectedStatus);
        }

        // Apply sorting
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

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }

        // Re-apply sorting to current filtered results
        applyFiltersAndSort(filteredUsers);
    };

    const clearSearch = () => {
        setSearchQuery('');
        applyFiltersAndSort(usersList.toArray());
    };

    const viewUserDetails = (user) => {
        setSelectedUser(user);
        setShowUserModal(true);
        setUserStats(null);
        logActivity('User Details Viewed', `Viewed details for user: ${user.name} (${user.email})`);
    };

    // Update user status with linked list - FIXED
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
                // Update local linked list immediately for better UX
                const updated = usersList.updateUser(userId, { status: newStatus });
                if (updated) {
                    setUsersList(usersList); // Trigger re-render

                    // Update the filtered view
                    if (searchQuery.trim()) {
                        // If searching, update search results
                        const searchResults = usersList.findByName(searchQuery);
                        applyFiltersAndSort(searchResults);
                    } else {
                        // If not searching, update full list
                        applyFiltersAndSort(usersList.toArray());
                    }
                }

                logActivity('User Status Updated', `User ${userId} status changed to ${newStatus}`);
                printAlert(`User ${newStatus === 'active' ? 'activated' : 'blocked'} successfully!`, 'success');
            } else {
                throw new Error(data.message || 'Failed to update user status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            printAlert('Error: ' + error.message, 'error');
            logActivity('User Status Update Failed', `Failed to update user status: ${error.message}`);
        }
    };

    const handleStatusFilterChange = (status) => {
        setSelectedStatus(status);

        if (searchQuery.trim()) {
            // If searching, filter the search results
            const searchResults = usersList.findByName(searchQuery);
            let filtered = searchResults;
            if (status !== 'all') {
                filtered = searchResults.filter(user => user.status === status);
            }
            applyFiltersAndSort(filtered);
        } else {
            // If not searching, filter the full list
            let filtered = usersList.toArray();
            if (status !== 'all') {
                filtered = filtered.filter(user => user.status === status);
            }
            applyFiltersAndSort(filtered);
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
                            placeholder="Search users by name..."
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
                            onChange={(e) => handleStatusFilterChange(e.target.value)}
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

// Event Management Tab Content with Logging - UPDATED WITH STYLE FIXES
const EventManagementTabContent = ({
    adminUserId,
    logActivity,
    triggerRefresh,
    setDashboardData,
    fetchDashboardData,
    fetchInvitationAnalytics,
    printAlert
}) => {
    const [activeSection, setActiveSection] = useState('reported');
    const [reportedEvents, setReportedEvents] = useState([]);
    const [allEvents, setAllEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showUnpublishedModal, setShowUnpublishedModal] = useState(false);
    const [deleteForm, setDeleteForm] = useState({
        reason: '',
        custom_reason: '',
        block_user: false,
        violation_severity: 'medium'
    });

    // ADD SEARCH AND FILTER STATES
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';

    const violationReasons = [
        { value: 'inappropriate_content', label: 'Inappropriate Content/Images', points: 3 },
        { value: 'spam', label: 'Spam/Fake Event', points: 2 },
        { value: 'copyright', label: 'Copyright Infringement', points: 4 },
        { value: 'harassment', label: 'Harassment/Hate Speech', points: 5 },
        { value: 'illegal', label: 'Illegal Activities', points: 5 },
        { value: 'other', label: 'Other Violation', points: 1 }
    ];

    useEffect(() => {
        if (activeSection === 'reported') {
            fetchReportedEventsLocal();
        } else {
            fetchAllEventsLocal();
        }
    }, [activeSection]);

    // ADD FILTERED EVENTS COMPUTATION
    const filteredEvents = useMemo(() => {
        const events = activeSection === 'reported' ? reportedEvents : allEvents;
        
        if (!events || !Array.isArray(events)) return [];

        let filtered = [...events];

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(event => 
                event.event_name?.toLowerCase().includes(query) ||
                event.user_name?.toLowerCase().includes(query) ||
                event.event_owner_name?.toLowerCase().includes(query)
            );
        }

        // Apply status filter for all events tab
        if (activeSection === 'all' && statusFilter !== 'all') {
            filtered = filtered.filter(event => {
                if (statusFilter === 'published') {
                    return event.published === 1 || event.published === true || event.status === 'published';
                } else if (statusFilter === 'draft') {
                    return event.published === 0 || event.published === false || event.status === 'draft';
                }
                return true;
            });
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue, bValue;

            if (sortBy === 'event_name') {
                aValue = a.event_name || '';
                bValue = b.event_name || '';
                return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            } else if (sortBy === 'created_at') {
                aValue = new Date(a.created_at || a.event_created_at || 0);
                bValue = new Date(b.created_at || b.event_created_at || 0);
                return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
            } else if (sortBy === 'user_name') {
                aValue = a.user_name || a.event_owner_name || '';
                bValue = b.user_name || b.event_owner_name || '';
                return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }
            return 0;
        });

        return filtered;
    }, [allEvents, reportedEvents, activeSection, searchQuery, statusFilter, sortBy, sortOrder]);

    // Local function to fetch reported events
    const fetchReportedEventsLocal = async () => {
        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('function', 'getReportedEvents');
            formData.append('admin_user_id', adminUserId);

            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                setReportedEvents(data.reportedEvents);
            }
        } catch (error) {
            console.error('Error fetching reported events:', error);
        } finally {
            setLoading(false);
        }
    };

    // Local function to fetch all events
    const fetchAllEventsLocal = async () => {
        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('function', 'getAllEvents');
            formData.append('admin_user_id', adminUserId);

            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });

            const text = await response.text();
            console.log('Raw response:', text);

            let data;
            try {
                data = JSON.parse(text);
            } catch (parseError) {
                console.error('Failed to parse JSON. Raw response:', text);
                if (text.includes('<br />') || text.includes('<b>')) {
                    throw new Error('Server returned HTML error page instead of JSON');
                } else {
                    throw new Error('Invalid JSON response from server');
                }
            }

            if (data.success) {
                setAllEvents(data.events);
            } else {
                console.error('API Error:', data.message);
                setAllEvents([]);
            }
        } catch (error) {
            console.error('Error fetching all events:', error);
            setAllEvents([]);
        } finally {
            setLoading(false);
        }
    };

    // FIXED: Proper event status checking
    const isEventPublished = (event) => {
        // Check multiple possible published field names and values
        const published = event.published;
        const status = event.status;
        
        // Handle different data types: boolean, number, string
        if (published !== undefined && published !== null) {
            if (typeof published === 'boolean') return published;
            if (typeof published === 'number') return published === 1;
            if (typeof published === 'string') {
                return published === '1' || published === 'true' || published === 'published';
            }
        }
        
        // Check status field as fallback
        if (status) {
            return status === 'published' || status === 'active';
        }
        
        return false;
    };

    // FIXED: viewEventPreview function
    const viewEventPreview = (event) => {
        console.log('Event preview clicked:', {
            event_name: event.event_name,
            published: event.published,
            status: event.status,
            isPublished: isEventPublished(event)
        });

        // Use the fixed published check
        if (!isEventPublished(event)) {
            setSelectedEvent(event);
            setShowUnpublishedModal(true);
            return;
        }

        // Open event in new tab for preview
        window.open(`/rsvpForm?event_id=${event.event_id}`, '_blank');
        logActivity('Event Previewed', `Previewed published event: ${event.event_name}`);
    };

    const handleDeleteEvent = async () => {
        if (!selectedEvent) return;

        try {
            const formData = new FormData();
            formData.append('function', 'adminDeleteEvent');
            formData.append('admin_user_id', adminUserId);
            formData.append('event_id', selectedEvent.event_id);
            formData.append('reason', deleteForm.reason);
            formData.append('custom_reason', deleteForm.custom_reason);
            formData.append('block_user', deleteForm.block_user ? '1' : '0');
            formData.append('violation_severity', deleteForm.violation_severity);

            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });

            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (parseError) {
                console.error('Delete response parse error:', text);
                throw new Error('Invalid response from server');
            }

            if (data.success) {
                printAlert('Event deleted successfully' + (deleteForm.block_user ? ' and user blocked' : ''), 'success');
                setShowDeleteModal(false);
                setSelectedEvent(null);
                setDeleteForm({
                    reason: '',
                    custom_reason: '',
                    block_user: false,
                    violation_severity: 'medium'
                });

                if (triggerRefresh) {
                    triggerRefresh();
                }

                if (fetchDashboardData) {
                    await fetchDashboardData();
                }
                if (fetchInvitationAnalytics) {
                    await fetchInvitationAnalytics();
                }

                if (activeSection === 'reported') {
                    await fetchReportedEventsLocal();
                } else {
                    await fetchAllEventsLocal();
                }

                logActivity('Event Deleted', `Deleted event ${selectedEvent.event_name} for reason: ${deleteForm.reason}`);
            } else {
                throw new Error(data.message || 'Failed to delete event');
            }
        } catch (error) {
            console.error('Error deleting event:', error);
            printAlert('Error deleting event: ' + error.message, 'error');
        }
    };

    const openDeleteModal = (event) => {
        setSelectedEvent(event);
        setShowDeleteModal(true);
    };

    const dismissReport = async (reportId) => {
        try {
            const formData = new FormData();
            formData.append('function', 'dismissEventReport');
            formData.append('admin_user_id', adminUserId);
            formData.append('report_id', reportId);

            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                fetchReportedEventsLocal();
                logActivity('Report Dismissed', 'Dismissed an event report as invalid');
                printAlert('Report dismissed successfully', 'success');
            } else {
                printAlert('Error dismissing report: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error dismissing report:', error);
            printAlert('Error dismissing report', 'error');
        }
    };

    const getViolationLabel = (type) => {
        const violation = violationReasons.find(v => v.value === type);
        return violation ? violation.label : type;
    };

    // ADD: Clear search function
    const clearSearch = () => {
        setSearchQuery('');
    };

    // ADD: Handle sort function
    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('desc');
        }
    };

    const getSortIcon = (column) => {
        if (sortBy !== column) return '';
        return sortOrder === 'asc' ? '↑' : '↓';
    };

    return (
        <div className="admin-tab-content">
            <div className="admin-content-header">
                <h2>Event Management</h2>
                <div className="header-actions">
                    <div className="tab-buttons">
                        <button
                            className={`tab-button ${activeSection === 'reported' ? 'active' : ''}`}
                            onClick={() => setActiveSection('reported')}
                        >
                            Reported Events
                            {reportedEvents.length > 0 && (
                                <span className="badge">{reportedEvents.length}</span>
                            )}
                        </button>
                        <button
                            className={`tab-button ${activeSection === 'all' ? 'active' : ''}`}
                            onClick={() => setActiveSection('all')}
                        >
                            All Events
                        </button>
                    </div>
                    <button
                        className="btn btn-outline"
                        onClick={activeSection === 'reported' ? fetchReportedEventsLocal : fetchAllEventsLocal}
                        disabled={loading}
                    >
                        <i className="bi bi-arrow-clockwise"></i> Refresh
                    </button>
                </div>
            </div>

            {/* ADD SEARCH AND FILTER CONTROLS - UPDATED WITH SMALLER SEARCH BAR */}
            <div className="table-controls event-management-controls">
                <div className="search-box-compact">
                    <i className="bi bi-search"></i>
                    <input
                        type="text"
                        placeholder={`Search ${activeSection === 'reported' ? 'reported' : 'all'} events...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="compact-search-input"
                    />
                    {searchQuery && (
                        <button className="clear-search" onClick={clearSearch}>
                            <i className="bi bi-x"></i>
                        </button>
                    )}
                </div>
                
                {activeSection === 'all' && (
                    <div className="filter-controls">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Statuses</option>
                            <option value="published">Published</option>
                            <option value="draft">Draft</option>
                        </select>
                        
                        <button
                            className={`sort-btn ${sortBy === 'event_name' ? 'active' : ''}`}
                            onClick={() => handleSort('event_name')}
                        >
                            Name {getSortIcon('event_name')}
                        </button>
                        
                        <button
                            className={`sort-btn ${sortBy === 'created_at' ? 'active' : ''}`}
                            onClick={() => handleSort('created_at')}
                        >
                            Date {getSortIcon('created_at')}
                        </button>
                        
                        <button
                            className={`sort-btn ${sortBy === 'user_name' ? 'active' : ''}`}
                            onClick={() => handleSort('user_name')}
                        >
                            Owner {getSortIcon('user_name')}
                        </button>
                    </div>
                )}
            </div>

            {loading && <div className="loading">Loading events...</div>}

            {activeSection === 'reported' && (
                <div className="reported-events-section">
                    <div className="section-header">
                        <h3>Pending Event Reports</h3>
                        <p>Review and take action on reported events</p>
                        {searchQuery && (
                            <div className="search-results-info">
                                Showing {filteredEvents.length} of {reportedEvents.length} reported events
                            </div>
                        )}
                    </div>

                    {filteredEvents.length === 0 ? (
                        <div className="no-data">
                            <i className="bi bi-check-circle"></i>
                            <p>
                                {searchQuery 
                                    ? 'No reported events found matching your search' 
                                    : 'No pending event reports'
                                }
                            </p>
                            {searchQuery && (
                                <button onClick={clearSearch} className="btn btn-outline">
                                    Clear Search
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="reported-events-grid">
                            {filteredEvents.map(report => (
                                <div key={report.id} className="reported-event-card">
                                    <div className="event-header">
                                        <h4>{report.event_name}</h4>
                                        <div className="event-meta">
                                            {/* UPDATED STATUS BADGES WITH COLORS */}
                                            <span className={`status-badge ${isEventPublished(report) ? 'status-published' : 'status-draft'}`}>
                                                {isEventPublished(report) ? 'Published' : 'Draft'}
                                            </span>
                                            <span className="report-date">
                                                Reported: {new Date(report.reported_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="event-details">
                                        <div className="detail-row">
                                            <label>Event Owner:</label>
                                            <span>{report.event_owner_name}</span>
                                        </div>
                                        <div className="detail-row">
                                            <label>Reported By:</label>
                                            <span>{report.reporter_name || 'Anonymous'} {report.reporter_email && `(${report.reporter_email})`}</span>
                                        </div>
                                        <div className="detail-row">
                                            <label>Violation Type:</label>
                                            <span className={`violation-type ${report.violation_type}`}>
                                                {getViolationLabel(report.violation_type)}
                                            </span>
                                        </div>
                                        <div className="detail-row">
                                            <label>Description:</label>
                                            <span>{report.description || 'No additional details provided'}</span>
                                        </div>
                                        <div className="detail-row">
                                            <label>Event Created:</label>
                                            <span>{new Date(report.event_created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    {report.event_image && (
                                        <div className="event-preview">
                                            <label>Event Image:</label>
                                            <img src={report.event_image} alt="Event preview" className="event-image-preview" />
                                        </div>
                                    )}

                                    <div className="action-buttons">
                                        <button
                                            className="btn btn-danger"
                                            onClick={() => openDeleteModal(report)}
                                        >
                                            <i className="bi bi-trash"></i> Review & Delete
                                        </button>
                                        <button
                                            className="btn btn-outline"
                                            onClick={() => dismissReport(report.id)}
                                        >
                                            <i className="bi bi-x-circle"></i> Dismiss Report
                                        </button>
                                        <button
                                            className={`btn btn-secondary`}
                                            onClick={() => viewEventPreview(report)}
                                            title={isEventPublished(report) ? "View Event" : "Event not published - cannot preview"}
                                        >
                                            <i className="bi bi-eye"></i> View Event
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeSection === 'all' && (
                <div className="all-events-section">
                    <div className="section-header">
                        <h3>All Events</h3>
                        {searchQuery && (
                            <div className="search-results-info">
                                Showing {filteredEvents.length} of {allEvents.length} events
                                {statusFilter !== 'all' && ` (${statusFilter} only)`}
                            </div>
                        )}
                    </div>

                    <div className="events-table">
                        <div className="table-header">
                            <span className="sortable" onClick={() => handleSort('event_name')}>
                                Event Name {getSortIcon('event_name')}
                            </span>
                            <span className="sortable" onClick={() => handleSort('user_name')}>
                                Owner {getSortIcon('user_name')}
                            </span>
                            <span className="sortable" onClick={() => handleSort('created_at')}>
                                Created {getSortIcon('created_at')}
                            </span>
                            <span>Status</span>
                            <span>Reports</span>
                            <span>Actions</span>
                        </div>

                        <div className="table-body">
                            {filteredEvents.map(event => (
                                <div key={event.event_id} className="table-row">
                                    <span className="event-name">{event.event_name}</span>
                                    <span>{event.user_name}</span>
                                    <span>{new Date(event.created_at).toLocaleDateString()}</span>
                                    {/* UPDATED STATUS BADGES WITH COLORS */}
                                    <span>
                                        <span className={`status-badge ${isEventPublished(event) ? 'status-published' : 'status-draft'}`}>
                                            {isEventPublished(event) ? 'Published' : 'Draft'}
                                        </span>
                                    </span>
                                    <span>
                                        {event.report_count > 0 ? (
                                            <span className="report-count warning">{event.report_count} reports</span>
                                        ) : (
                                            <span className="report-count">No reports</span>
                                        )}
                                    </span>
                                    <span className="actions">
                                        <button
                                            className={`btn-icon view-btn`}
                                            onClick={() => viewEventPreview(event)}
                                            title={isEventPublished(event) ? "View Event" : "Event not published - cannot preview"}
                                        >
                                            <i className="bi bi-eye"></i>
                                        </button>
                                        <button
                                            className="btn-icon delete-btn"
                                            onClick={() => openDeleteModal(event)}
                                            title="Delete Event"
                                        >
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </span>
                                </div>
                            ))}
                        </div>

                        {filteredEvents.length === 0 && (
                            <div className="no-data">
                                <i className="bi bi-calendar-x"></i>
                                <p>
                                    {searchQuery || statusFilter !== 'all' 
                                        ? 'No events found matching your criteria' 
                                        : 'No events found'
                                    }
                                </p>
                                {(searchQuery || statusFilter !== 'all') && (
                                    <button 
                                        onClick={() => {
                                            setSearchQuery('');
                                            setStatusFilter('all');
                                        }} 
                                        className="btn btn-outline"
                                    >
                                        Clear Filters
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Delete Event Modal */}
            {showDeleteModal && selectedEvent && (
                <div className="modal-overlay-new" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal-content-new" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-new">
                            <div className="modal-title-section">
                                <div className="modal-icon-large warning">
                                    <i className="bi bi-exclamation-triangle"></i>
                                </div>
                                <div className="modal-title">
                                    <h2>Delete Event</h2>
                                    <p>Review and confirm event deletion</p>
                                </div>
                            </div>
                            <button
                                className="close-btn-new"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="modal-body-new">
                            <div className="delete-warning">
                                <div className="warning-header">
                                    <i className="bi bi-exclamation-circle"></i>
                                    <h4>You are about to delete an event</h4>
                                </div>
                                <p><strong>Event:</strong> {selectedEvent.event_name}</p>
                                <p><strong>Owner:</strong> {selectedEvent.event_owner_name || selectedEvent.user_name}</p>
                                {selectedEvent.violation_type && (
                                    <p><strong>Reported For:</strong> {getViolationLabel(selectedEvent.violation_type)}</p>
                                )}
                            </div>

                            <div className="form-group-new">
                                <label>Deletion Reason *</label>
                                <select
                                    className="form-select-new"
                                    value={deleteForm.reason}
                                    onChange={(e) => setDeleteForm(prev => ({ ...prev, reason: e.target.value }))}
                                    required
                                >
                                    <option value="">Select a reason</option>
                                    {violationReasons.map(reason => (
                                        <option key={reason.value} value={reason.value}>
                                            {reason.label} ({reason.points} points)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {deleteForm.reason === 'other' && (
                                <div className="form-group-new">
                                    <label>Custom Reason *</label>
                                    <textarea
                                        className="form-textarea-new"
                                        value={deleteForm.custom_reason}
                                        onChange={(e) => setDeleteForm(prev => ({ ...prev, custom_reason: e.target.value }))}
                                        placeholder="Please specify the reason for deletion..."
                                        required
                                    />
                                </div>
                            )}

                            <div className="form-group-new">
                                <label>Violation Severity</label>
                                <select
                                    className="form-select-new"
                                    value={deleteForm.violation_severity}
                                    onChange={(e) => setDeleteForm(prev => ({ ...prev, violation_severity: e.target.value }))}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical</option>
                                </select>
                            </div>

                            <div className="form-check-new">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={deleteForm.block_user}
                                        onChange={(e) => setDeleteForm(prev => ({ ...prev, block_user: e.target.checked }))}
                                    />
                                    <span className="checkmark"></span>
                                    Also block event owner from creating new events
                                </label>
                                <small className="checkbox-help">
                                    User will be prevented from creating new events and may lose access to certain features
                                </small>
                            </div>

                            <div className="modal-actions-new">
                                <button
                                    className="action-btn-new danger"
                                    onClick={handleDeleteEvent}
                                    disabled={!deleteForm.reason || (deleteForm.reason === 'other' && !deleteForm.custom_reason)}
                                >
                                    <i className="bi bi-trash"></i>
                                    Delete Event{deleteForm.block_user ? ' & Block User' : ''}
                                </button>
                                <button
                                    className="action-btn-new secondary"
                                    onClick={() => setShowDeleteModal(false)}
                                >
                                    <i className="bi bi-x-circle"></i>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Unpublished Event Modal */}
            {showUnpublishedModal && selectedEvent && (
                <div className="modal-overlay-new" onClick={() => setShowUnpublishedModal(false)}>
                    <div className="modal-content-new" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-new">
                            <div className="modal-title-section">
                                <div className="modal-icon-large warning">
                                    <i className="bi bi-eye-slash"></i>
                                </div>
                                <div className="modal-title">
                                    <h2>Event Not Published</h2>
                                    <p>This event is not available for viewing</p>
                                </div>
                            </div>
                            <button
                                className="close-btn-new"
                                onClick={() => setShowUnpublishedModal(false)}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="modal-body-new">
                            <div className="unpublished-warning">
                                <div className="warning-icon">
                                    <i className="bi bi-info-circle"></i>
                                </div>
                                <div className="warning-content">
                                    <h4>Event Preview Unavailable</h4>
                                    <p>The event "<strong>{selectedEvent.event_name}</strong>" is currently in <span className="status-draft">draft</span> status and has not been published yet.</p>
                                    <p>You can only preview events that have been published by the event organizer.</p>
                                </div>
                            </div>

                            <div className="modal-actions-new">
                                <button
                                    className="action-btn-new primary"
                                    onClick={() => setShowUnpublishedModal(false)}
                                >
                                    <i className="bi bi-check-circle"></i>
                                    Understood
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