
import React, { useState, useEffect } from 'react';
import './attendance_stats.css';

const AttendanceStats = () => {
    const [stats, setStats] = useState({
        overall: {},
        events: [],
        monthlyTrend: [],
        allEvents: []
    });
    const [filters, setFilters] = useState({
        startDate: new Date().toISOString().split('T')[0].slice(0, 8) + '01',
        endDate: new Date().toISOString().split('T')[0],
        eventId: ''
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchStats();
        fetchAllEvents();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams(filters);
            const response = await fetch(`/api/attendance/stats?${params}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch statistics');
            }
            
            const data = await response.json();
            setStats(data);
        } catch (err) {
            setError('Failed to fetch statistics');
            console.error('Error fetching stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllEvents = async () => {
        try {
            const response = await fetch('/api/events');
            
            if (!response.ok) {
                throw new Error('Failed to fetch events');
            }
            
            const data = await response.json();
            setStats(prev => ({ ...prev, allEvents: data }));
        } catch (err) {
            console.error('Error fetching events:', err);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleApplyFilters = () => {
        fetchStats();
    };

    const getAttendanceClass = (rate) => {
        if (rate >= 70) return 'attendance-high';
        if (rate >= 40) return 'attendance-medium';
        return 'attendance-low';
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading statistics...</p>
            </div>
        );
    }

    return (
        <div className="attendance-stats">
            <div className="stats-header">
                <h1>Attendance Statistics</h1>
            </div>

            {/* Filters */}
            <div className="stats-card filters-card">
                <div className="filters-grid">
                    <div className="filter-group">
                        <label htmlFor="startDate">Start Date</label>
                        <input
                            type="date"
                            id="startDate"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            className="form-control"
                        />
                    </div>
                    <div className="filter-group">
                        <label htmlFor="endDate">End Date</label>
                        <input
                            type="date"
                            id="endDate"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            className="form-control"
                        />
                    </div>
                    <div className="filter-group">
                        <label htmlFor="eventId">Event</label>
                        <select
                            id="eventId"
                            value={filters.eventId}
                            onChange={(e) => handleFilterChange('eventId', e.target.value)}
                            className="form-control"
                        >
                            <option value="">All Events</option>
                            {stats.allEvents.map(event => (
                                <option key={event.event_id} value={event.event_id}>
                                    {event.event_name} - {event.event_start_date}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <button 
                            onClick={handleApplyFilters}
                            className="btn btn-primary filter-btn"
                        >
                            <i className="fas fa-filter"></i> Apply Filters
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger">{error}</div>
            )}

            {/* Overall Statistics */}
            <div className="stats-grid">
                <div className="stats-card">
                    <div className="stat-item text-center">
                        <div className="stat-number text-primary">
                            {stats.overall.total_events || 0}
                        </div>
                        <div className="stat-label">Total Events</div>
                    </div>
                </div>
                <div className="stats-card">
                    <div className="stat-item text-center">
                        <div className="stat-number text-info">
                            {stats.overall.total_rsvps || 0}
                        </div>
                        <div className="stat-label">Total RSVPs</div>
                    </div>
                </div>
                <div className="stats-card">
                    <div className="stat-item text-center">
                        <div className="stat-number text-success">
                            {stats.overall.total_capacity || 0}
                        </div>
                        <div className="stat-label">Total Capacity</div>
                    </div>
                </div>
                <div className="stats-card">
                    <div className="stat-item text-center">
                        <div className={`stat-number ${getAttendanceClass(stats.overall.overall_attendance_rate || 0)}`}>
                            {stats.overall.overall_attendance_rate || 0}%
                        </div>
                        <div className="stat-label">Attendance Rate</div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="charts-grid">
                <div className="stats-card">
                    <div className="card-header">
                        <h5>Monthly Attendance Trend</h5>
                    </div>
                    <div className="chart-container">
                        <MonthlyTrendChart data={stats.monthlyTrend} />
                    </div>
                </div>
                <div className="stats-card">
                    <div className="card-header">
                        <h5>Capacity Utilization</h5>
                    </div>
                    <div className="chart-container">
                        <UtilizationChart data={stats.events.slice(0, 5)} />
                    </div>
                </div>
            </div>

            {/* Event-wise Statistics */}
            <div className="stats-card">
                <div className="card-header">
                    <h5>Event-wise Attendance Details</h5>
                </div>
                <div className="table-container">
                    <EventsTable data={stats.events} getAttendanceClass={getAttendanceClass} />
                </div>
            </div>
        </div>
    );
};

// Chart Components
const MonthlyTrendChart = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="no-data">No data available</div>;
    }

    const maxAttendance = Math.max(...data.map(m => m.total_attendance || 0));
    const maxRSVPs = Math.max(...data.map(m => m.total_rsvps || 0));
    const maxValue = Math.max(maxAttendance, maxRSVPs);

    return (
        <div className="simple-chart">
            <div className="chart-bars">
                {data.map((month, index) => (
                    <div key={index} className="chart-bar-container">
                        <div className="chart-bar-label">{month.month}</div>
                        <div className="chart-bar-wrapper">
                            <div 
                                className="chart-bar attendance-bar"
                                style={{ 
                                    height: `${maxValue > 0 ? ((month.total_attendance || 0) / maxValue) * 100 : 0}%` 
                                }}
                                title={`Attendance: ${month.total_attendance || 0}`}
                            ></div>
                            <div 
                                className="chart-bar rsvp-bar"
                                style={{ 
                                    height: `${maxValue > 0 ? ((month.total_rsvps || 0) / maxValue) * 100 : 0}%` 
                                }}
                                title={`RSVPs: ${month.total_rsvps || 0}`}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="chart-legend">
                <div className="legend-item">
                    <div className="legend-color attendance-color"></div>
                    <span>Attendance</span>
                </div>
                <div className="legend-item">
                    <div className="legend-color rsvp-color"></div>
                    <span>RSVPs</span>
                </div>
            </div>
        </div>
    );
};

const UtilizationChart = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="no-data">No data available</div>;
    }

    return (
        <div className="simple-chart">
            <div className="chart-bars horizontal">
                {data.map((event, index) => (
                    <div key={index} className="chart-bar-container horizontal">
                        <div className="chart-bar-label" title={event.event_name}>
                            {event.event_name.length > 20 
                                ? event.event_name.substring(0, 20) + '...' 
                                : event.event_name
                            }
                        </div>
                        <div className="chart-bar-wrapper horizontal">
                            <div 
                                className="chart-bar utilization-bar"
                                style={{ width: `${Math.min(event.capacity_utilization || 0, 100)}%` }}
                            >
                                <span className="bar-label">{event.capacity_utilization || 0}%</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Events Table Component
const EventsTable = ({ data, getAttendanceClass }) => {
    if (!data || data.length === 0) {
        return <div className="no-data">No events found for the selected filters</div>;
    }

    return (
        <table className="stats-table">
            <thead>
                <tr>
                    <th>Event Name</th>
                    <th>Date</th>
                    <th>Location</th>
                    <th>Capacity</th>
                    <th>RSVPs</th>
                    <th>Attended</th>
                    <th>Utilization</th>
                    <th>Rate</th>
                </tr>
            </thead>
            <tbody>
                {data.map(event => (
                    <tr key={event.event_id}>
                        <td>{event.event_name}</td>
                        <td>{event.event_start_date}</td>
                        <td>{event.event_location}</td>
                        <td>{event.guest_limit}</td>
                        <td>{event.rsvp_count}</td>
                        <td>{event.attendance_count}</td>
                        <td>
                            <span className={getAttendanceClass(event.capacity_utilization || 0)}>
                                {event.capacity_utilization || 0}%
                            </span>
                        </td>
                        <td>
                            <span className={getAttendanceClass(event.attendance_rate || 0)}>
                                {event.attendance_rate || 0}%
                            </span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default AttendanceStats;