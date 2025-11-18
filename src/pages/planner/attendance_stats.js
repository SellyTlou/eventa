import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { logOut, DashboardHeader, DashboardSidebar } from "../components";
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

    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const printAlert = (message, type = "info") => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert({ show: false, message: "", type: "" }), 5000);
    };

    const toggleDropdown = () => setDropdownOpen(prev => !prev);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
            printAlert("Session expired. Please log in again.", "error");
            logOut();
            navigate("/");
            return;
        }
        setUser(JSON.parse(storedUser));

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
        fetchEventData(eventId);
        fetchRSVPData(eventId);
        fetchEventStatusByID(eventId);
        fetchAttendanceStats();
    }, [navigate]);

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
                setEventData(data.events);
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

            console.log("RSVP API Response:", data); // Debug log

            if (data.success && data.responses) {
                // Use the actual responses from API
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
        try {
            // You can keep mock data for global stats or implement real API later
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
            weeklyTimeline: [], monthlyTimeline: [], guestDistribution: []
        };

        // Process RSVP responses
        const attending = rsvpData.filter(r => r.attending === 'Yes').length;
        const notAttending = rsvpData.filter(r => r.attending === 'No').length;
        const maybe = rsvpData.filter(r => r.attending === 'Maybe').length;

        const totalGuests = rsvpData.reduce((sum, r) => {
            const guestCount = parseInt(r.guest_count || 0, 10);
            return sum + (guestCount > 0 ? guestCount : 1); // Assume at least 1 guest per RSVP
        }, 0);

        const totalResponses = rsvpData.length;

        // Calculate response rate based on event capacity or fixed number
        const invitationsSent = eventData?.guest_limit || 150;
        const responseRate = Math.round((totalResponses / invitationsSent) * 100);

        // DAILY Timeline (last 30 days)
        const last30Days = Array.from({ length: 30 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (29 - i)); // Last 30 days including today
            return date.toISOString().split('T')[0]; // YYYY-MM-DD format
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

        // WEEKLY Timeline (last 12 weeks)
        const weeklyTimelineMap = {};
        const last12Weeks = Array.from({ length: 12 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (7 * (11 - i))); // Last 12 weeks
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

        const weeklyTimeline = Object.entries(weeklyTimelineMap)
            .map(([week, count]) => ({ week, count }));

        // MONTHLY Timeline (last 6 months)
        const monthlyTimelineMap = {};
        const last6Months = Array.from({ length: 6 }, (_, i) => {
            const date = new Date();
            date.setMonth(date.getMonth() - (5 - i)); // Last 6 months
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

        const monthlyTimeline = Object.entries(monthlyTimelineMap)
            .map(([month, count]) => ({ month, count }));

        // Guest distribution - only for attending guests
        const distributionMap = { 1: 0, 2: 0, 3: 0, '4+': 0 };

        rsvpData.forEach(r => {
            if (r.attending === 'Yes') {
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

    // Weekly Timeline (Last 12 weeks)
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

    // Monthly Timeline (Last 6 months)
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

    // // Historical trend (you can keep your existing mock data or replace with real data)
    // const monthlyTrendData = {
    //     labels: globalStats.monthlyTrend.map(m => {
    //         const [year, month] = m.month.split('-');
    //         return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    //     }),
    //     datasets: [
    //         {
    //             label: 'Attendance',
    //             data: globalStats.monthlyTrend.map(m => m.total_attendance),
    //             backgroundColor: '#10b981',
    //             borderRadius: 4
    //         },
    //         {
    //             label: 'RSVPs',
    //             data: globalStats.monthlyTrend.map(m => m.total_rsvps),
    //             backgroundColor: '#3b82f6',
    //             borderRadius: 4
    //         }
    //     ],
    // };

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
                        />
            
                        {/* SIDEBAR */}
                        <DashboardSidebar
                            isMobileOpen={sidebarOpen}
                            onClose={closeSidebar}
                        />

            {/* MAIN CONTENT */}
            <div className="attendance-content">
                <div className="content-header">
                    <h1>Attendance Statistics</h1>
                    <p>Comprehensive overview of your event attendance and RSVP data</p>
                </div>

                {/* Stats Cards */}
                <div className="stats-overview">
                    <div className="stat-card primary">
                        <div className="stat-icon"><i className="bi bi-people-fill"></i></div>
                        <div className="stat-content"><h3>{stats.totalResponses}</h3><p>Total RSVPs</p></div>
                    </div>
                    <div className="stat-card success">
                        <div className="stat-icon"><i className="bi bi-check-circle-fill"></i></div>
                        <div className="stat-content"><h3>{stats.attending}</h3><p>Confirmed Attendance</p></div>
                    </div>
                    <div className="stat-card warning">
                        <div className="stat-icon"><i className="bi bi-question-circle-fill"></i></div>
                        <div className="stat-content"><h3>{stats.maybe}</h3><p>Maybe Attending</p></div>
                    </div>
                    <div className="stat-card danger">
                        <div className="stat-icon"><i className="bi bi-x-circle-fill"></i></div>
                        <div className="stat-content"><h3>{stats.notAttending}</h3><p>Not Attending</p></div>
                    </div>
                    <div className="stat-card info">
                        <div className="stat-icon"><i className="bi bi-graph-up-arrow"></i></div>
                        <div className="stat-content"><h3>{stats.responseRate}%</h3><p>Response Rate</p></div>
                    </div>
                </div>

                {/* Charts */}
                {/* Charts */}
                <div className="charts-grid">
                    <div className="chart-card">
                        <div className="chart-header">
                            <h3>Response Breakdown</h3>
                            <span className="chart-subtitle">Distribution of RSVP responses</span>
                        </div>
                        <div className="chart-wrapper">
                            <Pie data={pieData} options={pieOptions} />
                        </div>
                    </div>

                    <div className="chart-card">
                        <div className="chart-header">
                            <h3>Guests per RSVP</h3>
                            <span className="chart-subtitle">Number of guests per confirmed RSVP</span>
                        </div>
                        <div className="chart-wrapper">
                            <Bar data={barGuestData} options={chartOptions} />
                        </div>
                    </div>

                    <div className="chart-card full-width">
                        <div className="chart-header">
                            <h3>Daily Response Timeline</h3>
                            <span className="chart-subtitle">RSVP responses over the last 30 days</span>
                        </div>
                        <div className="chart-wrapper">
                            <Bar data={barTimelineData} options={chartOptions} />
                        </div>
                    </div>

                    <div className="chart-card full-width">
                        <div className="chart-header">
                            <h3>Weekly Response Trend</h3>
                            <span className="chart-subtitle">RSVP responses over the last 12 weeks</span>
                        </div>
                        <div className="chart-wrapper">
                            <Bar data={weeklyTimelineData} options={chartOptions} />
                        </div>
                    </div>

                    <div className="chart-card full-width">
                        <div className="chart-header">
                            <h3>Monthly Response Trend</h3>
                            <span className="chart-subtitle">RSVP responses over the last 6 months</span>
                        </div>
                        <div className="chart-wrapper">
                            <Bar data={monthlyTimelineData} options={chartOptions} />
                        </div>
                    </div>

                    {/* <div className="chart-card full-width">
                        <div className="chart-header">
                            <h3>Historical Performance</h3>
                            <span className="chart-subtitle">Attendance vs RSVPs across all events</span>
                        </div>
                        <div className="chart-wrapper">
                            <Bar data={monthlyTrendData} options={chartOptions} />
                        </div>
                    </div> */}
                </div>

                {/* Additional Stats */}
                <div className="additional-stats">
                    <div className="stats-card">
                        <h4>Response Rate</h4>
                        <div className="progress-stat">
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${stats.responseRate}%` }}></div>
                            </div>
                            <span>{stats.responseRate}%</span>
                        </div>
                        <p>Based on {eventData?.guest_limit || 150} invitations sent</p>
                    </div>
                    <div className="stats-card">
                        <h4>Total Guests</h4>
                        <div className="big-number">{stats.totalGuests}</div>
                        <p>Including additional guests</p>
                    </div>
                    <div className="stats-card">
                        <h4>Event Capacity</h4>
                        <div className="capacity-info">
                            <span className="current">{stats.attending}</span>
                            <span className="separator">/</span>
                            <span className="total">{eventData?.guest_limit || 100}</span>
                        </div>
                        <p>Current attendance vs capacity</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceStats;