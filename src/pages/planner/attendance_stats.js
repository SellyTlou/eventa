import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { logOut, DashboardHeader, DashboardSidebar, DashboardTicketSidebar } from "../components";
import { Pie, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    Title
} from 'chart.js';
import './attendance_stats.css';
import './main.css';
import { 
    getEffectivePackageValue, 
    getEffectivePackageName,
    isCustomPackage,
    getAllFeatures 
} from "../utils/customPackageUtils";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const AttendanceStats = () => {
    const [eventData, setEventData] = useState(null);
    const [rsvpData, setRsvpData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState({ show: false, message: "", type: "" });
    const [user, setUser] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [eventStatus, setEventStatus] = useState("");
    const [globalStats, setGlobalStats] = useState({
        overall: { total_events: 0, total_rsvps: 0, total_capacity: 0, overall_attendance_rate: 0 },
        events: [],
        monthlyTrend: []
    });

    // Package states - separate for personal and business
    const [userPackage, setUserPackage] = useState(null); // For personal packages
    const [userBusinessPackage, setUserBusinessPackage] = useState(null); // For business packages
    const [packageInfo, setPackageInfo] = useState(null);
    const [loadingPackage, setLoadingPackage] = useState(true);
    const [isTicketEvent, setIsTicketEvent] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    // Get active package based on account type
    const getActivePackage = () => {
        if (user?.account_type === 'business') {
            return userBusinessPackage;
        }
        return userPackage;
    };

    const activePackage = getActivePackage();

    // Package-based feature checks - using active package
    const isBasicOrFree = () => {
        if (!activePackage) return true; // No package = basic access
        
        const packageType = activePackage?.package_type?.toLowerCase() || 
                           activePackage?.name?.toLowerCase() || 
                           'basic';
        
        // Business packages have different names, so check accordingly
        if (user?.account_type === 'business') {
            // For business, all packages except starter might have full analytics
            // Adjust this based on your business package tiers
            return packageType === 'starter' || packageType === 'starter plan';
        }
        
        // Personal packages: basic and free are restricted
        return packageType === 'basic' || packageType === 'free';
    };

    const canViewAttendance = !isBasicOrFree(); // Only lock for Basic/Free/Starter
    const canViewAdvancedStats = !isBasicOrFree(); // Same logic for advanced stats
    const canViewHistoricalData = !isBasicOrFree(); // Same logic for historical data

    const printAlert = (message, type = "info") => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert({ show: false, message: "", type: "" }), 5000);
    };

    const toggleDropdown = () => setDropdownOpen(prev => !prev);

    const getPackageColor = () => {
        if (!activePackage) return "#6c757d";
        
        const packageType = activePackage?.package_type?.toLowerCase() || 
                           activePackage?.name?.toLowerCase() || 
                           'basic';

        switch (packageType) {
            case "basic":
            case "free":
            case "starter":
            case "starter plan":
                return "#6c757d"; // Gray
            case "premium":
            case "intermediate":
            case "intermediate plan":
                return "#007bff"; // Blue
            case "advanced":
            case "enterprise":
            case "advance":
            case "advance plan":
                return "#28a745"; // Green
            case "professional":
                return "#6610f2"; // Purple
            default:
                return "#6c757d";
        }
    };

    const getPackageFeatures = (packageType) => {
        const type = packageType?.toLowerCase() || 'basic';
        
        switch (type) {
            case "free":
                return ["Basic event management", "Limited RSVP tracking", "Basic analytics"];
            case "basic":
                return ["Basic event management", "RSVP tracking", "Email notifications", "Basic analytics"];
            case "starter":
            case "starter plan":
                return ["Basic business features", "RSVP tracking", "Standard support"];
            case "intermediate":
            case "intermediate plan":
                return ["Advanced analytics", "Guest insights", "Priority support"];
            case "premium":
                return ["Advanced analytics", "Guest insights", "Historical data", "Custom branding", "Priority support"];
            case "advance":
            case "advance plan":
            case "professional":
                return ["All Premium features", "Advanced reporting", "Team collaboration", "API access"];
            case "enterprise":
            case "advanced":
                return ["All Professional features", "Custom solutions", "Dedicated support", "White labeling"];
            default:
                return ["Basic event management", "RSVP tracking"];
        }
    };

    // Fetch personal package
    const fetchUserPackage = async (userId) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "getUserPackage");
            formData.append("user_id", userId);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData
            });
            const data = await response.json();

            console.log("Personal Package API response:", data);

            if (data.success && data.userPackage) {
                setUserPackage(data.userPackage);
                return data.userPackage;
            }
            return null;
        } catch (error) {
            console.error("Error fetching user package:", error);
            return null;
        }
    };

    // Fetch business package
    const fetchUserBusinessPackage = async (userId) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "getUserBusinessPackage");
            formData.append("user_id", userId);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData
            });
            const data = await response.json();

            console.log("Business Package API response:", data);

            if (data.success && data.userBusinessPackage) {
                setUserBusinessPackage(data.userBusinessPackage);
                return data.userBusinessPackage;
            }
            return null;
        } catch (error) {
            console.error("Error fetching business package:", error);
            return null;
        }
    };

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
            printAlert("Session expired. Please log in again.", "error");
            logOut();
            navigate("/");
            return;
        }
        const userData = JSON.parse(storedUser);
        setUser(userData);

        // Fetch appropriate package based on account type
        const loadPackage = async () => {
            setLoadingPackage(true);
            let pkg = null;
            
            if (userData.account_type === 'business') {
                pkg = await fetchUserBusinessPackage(userData.user_id);
            } else {
                pkg = await fetchUserPackage(userData.user_id);
            }

            // Create package info object
            const packageType = pkg?.package_type || pkg?.name || 'basic';
            const packageInfo = {
                name: pkg?.name || 
                      (pkg?.package_type ? 
                          pkg.package_type.charAt(0).toUpperCase() + pkg.package_type.slice(1) : 
                          "Basic"),
                type: packageType,
                color: getPackageColor(),
                features: getPackageFeatures(packageType),
                isCustom: pkg?.is_custom || false
            };
            setPackageInfo(packageInfo);
            
            if (!pkg) {
                printAlert("You don't have an active package", "warning");
            }
            
            setLoadingPackage(false);
        };

        loadPackage();

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const eventId = localStorage.getItem("selectedEventId");
        if (!eventId) {
            printAlert("No event selected. Redirecting to events dashboard.", "warning");
            navigate("/eventsDashboard");
            return;
        }
        
        // Don't fetch stats until package loading is complete
        if (loadingPackage) return;
        
        if (!canViewAttendance) {
            // Basic/Free users: skip fetching large stats data
            setLoading(false);
            return;
        }

        fetchEventData(eventId);
        fetchRSVPData(eventId);
        fetchEventStatusByID(eventId);
        if (canViewHistoricalData) {
            fetchAttendanceStats();
        }
    }, [navigate, canViewHistoricalData, canViewAttendance, loadingPackage, user?.account_type]);

    const fetchEventData = async (eventId) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "getEventById");
            formData.append("event_id", eventId);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData
            });
            const data = await response.json();

            if (data.success && data.events) {
                // Fixed: Check if data.events is an array or single object
                const event = Array.isArray(data.events) ? data.events[0] : data.events;
                if (event) {
                    const hasTickets = event.has_tickets === 1 || event.has_tickets === true || event.has_tickets === "1";
                    setIsTicketEvent(hasTickets);
                    setEventData(event);
                }
            } else {
                printAlert("Failed to load event data", "error");
            }
        } catch (error) {
            console.error("Error fetching event data:", error);
            printAlert("Error loading event data", "error");
        }
    };

    const fetchRSVPData = async (eventId) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "getRSVPResponses");
            formData.append("event_id", eventId);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData
            });
            const data = await response.json();

            console.log("RSVP API Response:", data);

            if (data.success && data.responses) {
                setRsvpData(data.responses);
                if (data.event) {
                    setEventData(prev => ({ ...prev, ...data.event }));
                }
            } else {
                printAlert("No RSVP data available", "warning");
                setRsvpData([]);
            }
        } catch (error) {
            console.error("Error fetching RSVP data:", error);
            printAlert("Error loading RSVP data", "error");
            setRsvpData([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchEventStatusByID = async (eventId) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "getEventStatusByID");
            formData.append("event_id", eventId);

            const response = await fetch(`${API_URL}/query.php`, { method: "POST", body: formData });
            const data = await response.json();
            if (data.success && data.status) {
                setEventStatus(data.status.published == 1 ? "Published" : "Unpublished");
            } else {
                setEventStatus("Unknown");
            }
        } catch {
            setEventStatus("Unknown");
        }
    };

    const fetchAttendanceStats = async () => {
        if (!canViewHistoricalData) return;

        try {
            const mockStats = {
                overall: {
                    total_events: 12,
                    total_rsvps: 345,
                    total_capacity: 500,
                    overall_attendance_rate: 69
                },
                events: [
                    { event_id: '1', event_name: 'Tech Conference 2024', event_start_date: '2024-01-15', event_location: 'Convention Center', guest_limit: 100, rsvp_count: 85, attendance_count: 78, capacity_utilization: 78, attendance_rate: 91.8 },
                    { event_id: '2', event_name: 'Music Festival', event_start_date: '2024-01-20', event_location: 'Central Park', guest_limit: 500, rsvp_count: 450, attendance_count: 380, capacity_utilization: 76, attendance_rate: 84.4 }
                ],
                monthlyTrend: [
                    { month: '2024-01', total_attendance: 458, total_rsvps: 535 },
                    { month: '2023-12', total_attendance: 320, total_rsvps: 400 },
                    { month: '2023-11', total_attendance: 280, total_rsvps: 350 },
                    { month: '2023-10', total_attendance: 195, total_rsvps: 250 },
                    { month: '2023-09', total_attendance: 150, total_rsvps: 200 }
                ]
            };
            setGlobalStats(mockStats);
        } catch (error) {
            console.error("Error fetching attendance stats:", error);
        }
    };

    // === COMPUTE STATS FROM REAL RSVP DATA ===
    const computeStats = () => {
        if (!rsvpData.length) return {
            attending: 0, notAttending: 0, maybe: 0, totalGuests: 0,
            totalResponses: 0, responseRate: 0, responseTimeline: [],
            weeklyTimeline: [], monthlyTimeline: [], guestDistribution: [],
            capacityUsage: 0, averageGuests: 0
        };

        // Process RSVP responses
        const attending = rsvpData.filter(r => r.attending === 'Yes' || r.attending === 'yes').length;
        const notAttending = rsvpData.filter(r => r.attending === 'No' || r.attending === 'no').length;
        const maybe = rsvpData.filter(r => r.attending === 'Maybe' || r.attending === 'maybe').length;

        const totalGuests = rsvpData.reduce((sum, r) => {
            const guestCount = parseInt(r.guest_count || 0, 10);
            return sum + (guestCount > 0 ? guestCount : 1);
        }, 0);

        const totalResponses = rsvpData.length;

        // Calculate response rate based on event capacity or fixed number
        const invitationsSent = eventData?.guest_limit || 150;
        const responseRate = Math.round((totalResponses / invitationsSent) * 100);

        // Calculate capacity usage and average guests
        const capacityUsage = Math.round((attending / (eventData?.guest_limit || 100)) * 100);
        const averageGuests = totalResponses > 0 ? (totalGuests / totalResponses).toFixed(1) : 0;

        // DAILY Timeline (last 30 days) - Available for all packages that can view attendance
        const last30Days = Array.from({ length: 30 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (29 - i));
            return date.toISOString().split('T')[0];
        });

        const dailyTimelineMap = {};
        last30Days.forEach(date => dailyTimelineMap[date] = 0);

        rsvpData.forEach(r => {
            if (r.created_at) {
                const responseDate = new Date(r.created_at).toISOString().split('T')[0];
                if (dailyTimelineMap[responseDate] !== undefined) {
                    dailyTimelineMap[responseDate]++;
                }
            }
        });

        const responseTimeline = Object.entries(dailyTimelineMap)
            .map(([date, count]) => ({ date, count }));

        // WEEKLY Timeline (last 12 weeks) - Only for non-basic packages
        const weeklyTimelineMap = {};
        if (canViewAdvancedStats) {
            const last12Weeks = Array.from({ length: 12 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (7 * (11 - i)));
                const year = date.getFullYear();
                const week = getWeekNumber(date);
                return `${year}-W${week.toString().padStart(2, '0')}`;
            });

            last12Weeks.forEach(week => weeklyTimelineMap[week] = 0);

            rsvpData.forEach(r => {
                if (r.created_at) {
                    const responseDate = new Date(r.created_at);
                    const year = responseDate.getFullYear();
                    const week = getWeekNumber(responseDate);
                    const weekKey = `${year}-W${week.toString().padStart(2, '0')}`;

                    if (weeklyTimelineMap[weekKey] !== undefined) {
                        weeklyTimelineMap[weekKey]++;
                    }
                }
            });
        }

        const weeklyTimeline = Object.entries(weeklyTimelineMap)
            .map(([week, count]) => ({ week, count }));

        // MONTHLY Timeline (last 6 months) - Only for non-basic packages
        const monthlyTimelineMap = {};
        if (canViewAdvancedStats) {
            const last6Months = Array.from({ length: 6 }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - (5 - i));
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                return `${year}-${month}`;
            });

            last6Months.forEach(month => monthlyTimelineMap[month] = 0);

            rsvpData.forEach(r => {
                if (r.created_at) {
                    const responseDate = new Date(r.created_at);
                    const year = responseDate.getFullYear();
                    const month = (responseDate.getMonth() + 1).toString().padStart(2, '0');
                    const monthKey = `${year}-${month}`;

                    if (monthlyTimelineMap[monthKey] !== undefined) {
                        monthlyTimelineMap[monthKey]++;
                    }
                }
            });
        }

        const monthlyTimeline = Object.entries(monthlyTimelineMap)
            .map(([month, count]) => ({ month, count }));

        // Guest distribution - only for attending guests
        const distributionMap = { 1: 0, 2: 0, 3: 0, '4+': 0 };

        rsvpData.forEach(r => {
            if (r.attending === 'Yes' || r.attending === 'yes') {
                const guestCount = parseInt(r.guest_count || 1, 10);
                if (guestCount === 1) {
                    distributionMap[1]++;
                } else if (guestCount === 2) {
                    distributionMap[2]++;
                } else if (guestCount === 3) {
                    distributionMap[3]++;
                } else {
                    distributionMap['4+']++;
                }
            }
        });

        const guestDistribution = Object.entries(distributionMap)
            .map(([count, freq]) => ({ count, freq }))
            .filter(d => d.freq > 0);

        return {
            attending,
            notAttending,
            maybe,
            totalGuests,
            totalResponses,
            responseRate,
            capacityUsage,
            averageGuests,
            responseTimeline,
            weeklyTimeline,
            monthlyTimeline,
            guestDistribution
        };
    };

    // Helper function to get week number
    const getWeekNumber = (date) => {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    };

    const stats = computeStats();

    // === PACKAGE-BASED STATS CARDS ===
    const getAdditionalStats = () => {
        if (isBasicOrFree()) {
            // BASIC/FREE/STARTER PACKAGE - Limited stats with upgrade prompts
            return [
                {
                    title: "Response Rate",
                    value: `${stats.responseRate}%`,
                    description: "Based on invitations sent",
                    type: "locked",
                    icon: "bi bi-percent",
                    locked: true
                },
                {
                    title: "Total Guests",
                    value: stats.totalGuests,
                    description: "Including additional guests",
                    type: "locked",
                    icon: "bi bi-people",
                    locked: true
                },
                {
                    title: "Upgrade Required",
                    value: "🔒",
                    description: "Upgrade for full analytics",
                    type: "upgrade",
                    icon: "bi bi-star-fill",
                    locked: true
                }
            ];
        }

        // PREMIUM/INTERMEDIATE/ADVANCE PACKAGE - Full stats
        return [
            {
                title: "Response Rate",
                value: `${stats.responseRate}%`,
                description: "Based on invitations sent",
                type: "unlocked",
                icon: "bi bi-percent",
                locked: false
            },
            {
                title: "Total Guests",
                value: stats.totalGuests,
                description: "Including additional guests",
                type: "unlocked",
                icon: "bi bi-people",
                locked: false
            },
            {
                title: "Capacity Usage",
                value: `${stats.capacityUsage}%`,
                description: "Current vs maximum capacity",
                type: "unlocked",
                icon: "bi bi-bar-chart",
                locked: false
            },
            {
                title: "Average Guests",
                value: stats.averageGuests,
                description: "Guests per RSVP",
                type: "unlocked",
                icon: "bi bi-calculator",
                locked: false
            }
        ];
    };

    const additionalStats = getAdditionalStats();

    // === CHART DATA ===
    const pieData = {
        labels: ['Attending', 'Not Attending', 'Maybe'],
        datasets: [{
            data: [stats.attending, stats.notAttending, stats.maybe],
            backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
            borderWidth: 1,
            borderColor: '#fff'
        }],
    };

    const barGuestData = {
        labels: stats.guestDistribution.map(d => `${d.count} Guest${d.count !== '1' ? 's' : ''}`),
        datasets: [{
            label: 'Number of RSVPs',
            data: stats.guestDistribution.map(d => d.freq),
            backgroundColor: '#3b82f6',
            borderRadius: 4
        }],
    };

    const barTimelineData = {
        labels: stats.responseTimeline.map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }),
        datasets: [{
            label: 'Daily Responses',
            data: stats.responseTimeline.map(d => d.count),
            backgroundColor: '#8b5cf6',
            borderRadius: 4
        }],
    };

    // Weekly Timeline (Last 12 weeks) - Only for non-basic packages
    const weeklyTimelineData = {
        labels: stats.weeklyTimeline.map(w => {
            const [year, week] = w.week.split('-W');
            return `Week ${week}, ${year}`;
        }),
        datasets: [{
            label: 'Weekly Responses',
            data: stats.weeklyTimeline.map(w => w.count),
            backgroundColor: '#ec4899',
            borderRadius: 4
        }],
    };

    // Monthly Timeline (Last 6 months) - Only for non-basic packages
    const monthlyTimelineData = {
        labels: stats.monthlyTimeline.map(m => {
            const [year, month] = m.month.split('-');
            return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }),
        datasets: [{
            label: 'Monthly Responses',
            data: stats.monthlyTimeline.map(m => m.count),
            backgroundColor: '#f59e0b',
            borderRadius: 4
        }],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true } },
            tooltip: { mode: 'index', intersect: false, backgroundColor: 'rgba(0,0,0,0.8)' }
        },
        scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.1)' } },
            x: { grid: { display: false } }
        }
    };

    const pieOptions = {
        ...chartOptions,
        plugins: {
            ...chartOptions.plugins,
            tooltip: {
                callbacks: {
                    label: context => {
                        const label = context.label || '';
                        const value = context.raw;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = total ? Math.round((value / total) * 100) : 0;
                        return `${label}: ${value} (${percentage}%)`;
                    }
                }
            }
        }
    };

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const closeSidebar = () => {
        setSidebarOpen(false);
    };

    // Show package loading state
    if (loadingPackage) {
        return (
            <div className="loading-container">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p>Loading package information...</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p>Loading attendance statistics...</p>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            {/* Custom alert box */}
            {alert.show && (
                <div className={`custom-alert ${alert.type}`}>
                    <i
                        className={`fas ${alert.type === "error"
                            ? "fa-times-circle"
                            : alert.type === "success"
                                ? "fa-check-circle"
                                : alert.type === "warning"
                                    ? "fa-exclamation-triangle"
                                    : "fa-info-circle"
                            }`}
                    ></i>
                    <span>{alert.message}</span>
                </div>
            )}

            {/* HEADER */}
            <DashboardHeader
                user={user}
                eventStatus={eventStatus}
                onToggleSidebar={toggleSidebar}
                userPackage={activePackage}
            />

            {/* CONDITIONAL SIDEBAR */}
            {isTicketEvent ? (
                <DashboardTicketSidebar
                    isOpen={sidebarOpen}
                    onClose={closeSidebar}
                />
            ) : (
                <DashboardSidebar
                    isOpen={sidebarOpen}
                    onClose={closeSidebar}
                />
            )}

            {/* MAIN CONTENT */}
            <div className={`attendance-content ${isTicketEvent ? 'ticket-event' : 'rsvp-event'}`}>
                <div className="content-header">
                    <h1>Attendance Statistics</h1>
                    <p>Comprehensive overview of your event attendance and RSVP data</p>
                    {isBasicOrFree() && (
                        <div className="package-notice">
                            <i className="bi bi-info-circle"></i>
                            <span>Upgrade to <strong>Premium</strong> or higher for full analytics</span>
                            <button 
                                className="btn-upgrade-notice"
                                onClick={() => navigate('/upgrade_package')}
                            >
                                Upgrade Now
                            </button>
                        </div>
                    )}
                </div>

                {/* Stats Cards */}
                <div className="stats-overview">
                    <div className="stat-card primary">
                        {isBasicOrFree() && (
                            <button className="feature-key-icon" title="Upgrade to Premium+ for access" onClick={() => navigate('/upgrade_package')}>
                                <i className="bi bi-lock-fill" />
                            </button>
                        )}
                        <div className="stat-icon"><i className="bi bi-people-fill"></i></div>
                        <div className="stat-content"><h3>{canViewAttendance ? stats.totalResponses : '—'}</h3><p>Total RSVPs</p></div>
                    </div>
                    <div className="stat-card success">
                        {isBasicOrFree() && (
                            <button className="feature-key-icon" title="Upgrade to Premium+ for access" onClick={() => navigate('/upgrade_package')}>
                                <i className="bi bi-lock-fill" />
                            </button>
                        )}
                        <div className="stat-icon"><i className="bi bi-check-circle-fill"></i></div>
                        <div className="stat-content"><h3>{canViewAttendance ? stats.attending : '—'}</h3><p>Confirmed Attendance</p></div>
                    </div>
                    <div className="stat-card warning">
                        {isBasicOrFree() && (
                            <button className="feature-key-icon" title="Upgrade to Premium+ for access" onClick={() => navigate('/upgrade_package')}>
                                <i className="bi bi-lock-fill" />
                            </button>
                        )}
                        <div className="stat-icon"><i className="bi bi-question-circle-fill"></i></div>
                        <div className="stat-content"><h3>{canViewAttendance ? stats.maybe : '—'}</h3><p>Maybe Attending</p></div>
                    </div>
                    <div className="stat-card danger">
                        {isBasicOrFree() && (
                            <button className="feature-key-icon" title="Upgrade to Premium+ for access" onClick={() => navigate('/upgrade_package')}>
                                <i className="bi bi-lock-fill" />
                            </button>
                        )}
                        <div className="stat-icon"><i className="bi bi-x-circle-fill"></i></div>
                        <div className="stat-content"><h3>{canViewAttendance ? stats.notAttending : '—'}</h3><p>Not Attending</p></div>
                    </div>
                    <div className="stat-card info">
                        {isBasicOrFree() && (
                            <button className="feature-key-icon" title="Upgrade to Premium+ for access" onClick={() => navigate('/upgrade_package')}>
                                <i className="bi bi-lock-fill" />
                            </button>
                        )}
                        <div className="stat-icon"><i className="bi bi-graph-up-arrow"></i></div>
                        <div className="stat-content"><h3>{canViewAttendance ? `${stats.responseRate}%` : '—'}</h3><p>Response Rate</p></div>
                    </div>
                </div>

                {/* Charts */}
                <div className="charts-grid">
                    <div className="chart-card">
                        {isBasicOrFree() && (
                            <button className="feature-key-icon chart" title="Upgrade to Premium+ for access" onClick={() => navigate('/upgrade_package')}>
                                <i className="bi bi-lock-fill" />
                            </button>
                        )}
                        <div className="chart-header">
                            <h3>Response Breakdown</h3>
                            <span className="chart-subtitle">Distribution of RSVP responses</span>
                            {isBasicOrFree() && <span className="chart-lock-badge">🔒 Basic</span>}
                        </div>
                        <div className="chart-wrapper">
                            {canViewAttendance ? (
                                <Pie data={pieData} options={pieOptions} />
                            ) : (
                                <div className="chart-placeholder">
                                    <i className="bi bi-pie-chart-fill"></i>
                                    <p>Upgrade to view chart</p>
                                </div>
                            )}
                            {isBasicOrFree() && (
                                <div className="overlay-locked" title="Upgrade to Premium+ for access" onClick={() => navigate('/upgrade_package')}>
                                    <i className="bi bi-lock-fill" style={{ fontSize: 28, color: '#2b6cb0' }} />
                                    <span className="upgrade-text">Upgrade to unlock</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="chart-card">
                        {isBasicOrFree() && (
                            <button className="feature-key-icon chart" title="Upgrade to Premium+ for access" onClick={() => navigate('/upgrade_package')}>
                                <i className="bi bi-lock-fill" />
                            </button>
                        )}
                        <div className="chart-header">
                            <h3>Guests per RSVP</h3>
                            <span className="chart-subtitle">Number of guests per confirmed RSVP</span>
                            {isBasicOrFree() && <span className="chart-lock-badge">🔒 Basic</span>}
                        </div>
                        <div className="chart-wrapper">
                            {canViewAttendance ? (
                                <Bar data={barGuestData} options={chartOptions} />
                            ) : (
                                <div className="chart-placeholder">
                                    <i className="bi bi-bar-chart-fill"></i>
                                    <p>Upgrade to view chart</p>
                                </div>
                            )}
                            {isBasicOrFree() && (
                                <div className="overlay-locked" title="Upgrade to Premium+ for access" onClick={() => navigate('/upgrade_package')}>
                                    <i className="bi bi-lock-fill" style={{ fontSize: 28, color: '#2b6cb0' }} />
                                    <span className="upgrade-text">Upgrade to unlock</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="chart-card full-width">
                        {isBasicOrFree() && (
                            <button className="feature-key-icon chart" title="Upgrade to Premium+ for access" onClick={() => navigate('/upgrade_package')}>
                                <i className="bi bi-lock-fill" />
                            </button>
                        )}
                        <div className="chart-header">
                            <h3>Daily Response Timeline</h3>
                            <span className="chart-subtitle">RSVP responses over the last 30 days</span>
                            {isBasicOrFree() && <span className="chart-lock-badge">🔒 Basic</span>}
                        </div>
                        <div className="chart-wrapper">
                            {canViewAttendance ? (
                                <Bar data={barTimelineData} options={chartOptions} />
                            ) : (
                                <div className="chart-placeholder">
                                    <i className="bi bi-graph-up"></i>
                                    <p>Upgrade to view timeline</p>
                                </div>
                            )}
                            {isBasicOrFree() && (
                                <div className="overlay-locked" title="Upgrade to Premium+ for access" onClick={() => navigate('/upgrade_package')}>
                                    <i className="bi bi-lock-fill" style={{ fontSize: 28, color: '#2b6cb0' }} />
                                    <span className="upgrade-text">Upgrade to unlock</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Advanced Charts - Only for non-basic packages */}
                    {canViewAdvancedStats && stats.weeklyTimeline.length > 0 && (
                        <div className="chart-card full-width">
                            <div className="chart-header">
                                <h3>Weekly Response Trend</h3>
                                <span className="chart-subtitle">RSVP responses over the last 12 weeks</span>
                                <span className="premium-badge">Premium+</span>
                            </div>
                            <div className="chart-wrapper">
                                <Bar data={weeklyTimelineData} options={chartOptions} />
                            </div>
                        </div>
                    )}

                    {canViewAdvancedStats && stats.monthlyTimeline.length > 0 && (
                        <div className="chart-card full-width">
                            <div className="chart-header">
                                <h3>Monthly Response Trend</h3>
                                <span className="chart-subtitle">RSVP responses over the last 6 months</span>
                                <span className="premium-badge">Premium+</span>
                            </div>
                            <div className="chart-wrapper">
                                <Bar data={monthlyTimelineData} options={chartOptions} />
                            </div>
                        </div>
                    )}
                </div>

                {/* ADDITIONAL STATS */}
                <div className="additional-stats">
                    {additionalStats.map((stat, index) => (
                        <div
                            key={index}
                            className={`stats-card ${stat.type === 'upgrade' ? 'upgrade-card' : ''} ${stat.locked ? 'locked' : ''}`}
                        >
                            {stat.locked && (
                                <button className="feature-key-icon small" title="Upgrade to Premium+ for access" onClick={() => navigate('/upgrade_package')}>
                                    <i className="bi bi-lock-fill" />
                                </button>
                            )}
                            <div className="stats-card-header">
                                <i className={stat.icon}></i>
                                <h4>{stat.title}</h4>
                                {stat.locked && <i className="bi bi-lock-fill lock-icon"></i>}
                            </div>

                            {stat.type === 'upgrade' ? (
                                <div className="upgrade-content">
                                    <p>{stat.description}</p>
                                    <button
                                        className="btn-upgrade-sm"
                                        onClick={() => navigate("/upgrade_package")}
                                    >
                                        Upgrade Now
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className={`big-number ${stat.locked ? 'locked' : ''}`}>
                                        {stat.locked ? '🔒' : stat.value}
                                    </div>
                                    <p>{stat.description}</p>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AttendanceStats;