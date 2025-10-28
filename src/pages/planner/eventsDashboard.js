import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PriorityQueue from "js-priority-queue";
import "./main.css";
import "../../App.css";
import "../../alert.css";
import { LoginNav, logOut } from "../components";

const EventsDashboard = () => {
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({
        dateRange: "all",
        sortBy: "latest",
        status: "all",
        searchQuery: ""
    });
    const [rsvpStats, setRsvpStats] = useState({});
    const [deletingEventId, setDeletingEventId] = useState(null);
    const [activeTab, setActiveTab] = useState("all");
    const [soonestEvent, setSoonestEvent] = useState(null);
    const [showMenuId, setShowMenuId] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [editedEvent, setEditedEvent] = useState({});
    const [alert, setAlert] = useState({ show: false, message: "", type: "" });

    const itemsPerPage = 6;
    const navigate = useNavigate();

    const printAlert = (message, type = "info") => {
        setAlert({ show: true, message, type });
        setTimeout(() => {
            setAlert({ show: false, message: "", type: "" });
        }, 5000);
    };

    const isEventCancelled = (event) => {
        return event.status === "cancelled" || event.status === "canceled";
    };

    const isEventPublished = (event) => {
        if (isEventCancelled(event)) {
            return false;
        }
        return event.is_published === true || event.published === 1 || event.published === '1' ||
            event.status === 'published' || event.status === true || event.status === 1 || event.status === '1';
    };

    const getMinDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
            setLoading(false);
            logOut();
            return;
        }

        const user = JSON.parse(storedUser);

        const fetchEvents = async () => {
            try {
                setLoading(true);
                const API_URL = process.env.REACT_APP_API_URL;
                const formData = new FormData();
                formData.append("function", "getUserEvents");
                formData.append("userID", user.user_id);

                const response = await fetch(`${API_URL}/query.php`, {
                    method: "POST",
                    body: formData
                });

                const data = await response.json();

                if (data.success && Array.isArray(data.events)) {
                    const uniqueEvents = [];
                    data.events.forEach((event) => {
                        if (!uniqueEvents.some((e) => e.event_id === event.event_id)) {
                            uniqueEvents.push(event);
                        }
                    });

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const upcomingEvents = uniqueEvents.filter(event => {
                        const eventDate = new Date(event.event_start_date || event.created_at);
                        eventDate.setHours(0, 0, 0, 0);
                        return eventDate >= today && !isEventCancelled(event);
                    });

                    const pastEvents = uniqueEvents.filter(event => {
                        const eventDate = new Date(event.event_start_date || event.created_at);
                        eventDate.setHours(0, 0, 0, 0);
                        return eventDate < today && !isEventCancelled(event);
                    });

                    const canceledEvents = uniqueEvents.filter(event => isEventCancelled(event));

                    const upcomingEventHeap = new PriorityQueue({
                        comparator: (a, b) => {
                            const dateA = new Date(a.event_start_date || a.created_at);
                            const dateB = new Date(b.event_start_date || b.created_at);
                            return dateA - dateB;
                        }
                    });

                    upcomingEvents.forEach(event => upcomingEventHeap.queue(event));

                    const sortedUpcomingEvents = [];
                    while (upcomingEventHeap.length > 0) {
                        sortedUpcomingEvents.push(upcomingEventHeap.dequeue());
                    }

                    const sortedPastEvents = pastEvents.sort((a, b) => {
                        const dateA = new Date(a.event_start_date || a.created_at);
                        const dateB = new Date(b.event_start_date || b.created_at);
                        return dateB - dateA;
                    });

                    const finalSortedEvents = [...sortedUpcomingEvents, ...sortedPastEvents, ...canceledEvents];
                    const soonestUpcomingEvent = sortedUpcomingEvents[0] || null;
                    setSoonestEvent(soonestUpcomingEvent);

                    setEvents(finalSortedEvents);
                    setFilteredEvents(finalSortedEvents);
                    fetchRSVPStatsForEvents(finalSortedEvents);
                }
            } catch (error) {
                console.error("Failed to fetch events:", error);
                printAlert("Failed to load events", "error");
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, []);

    const fetchRSVPStatsForEvents = async (eventsArray) => {
        const stats = {};
        await Promise.all(eventsArray.map(async (event) => {
            try {
                const API_URL = process.env.REACT_APP_API_URL;
                const formData = new FormData();
                formData.append("function", "getRSVPResponses");
                formData.append("event_id", event.event_id);

                const response = await fetch(`${API_URL}/query.php`, {
                    method: "POST",
                    body: formData
                });

                const data = await response.json();

                if (data.success && Array.isArray(data.responses)) {
                    const uniqueEmails = new Set();
                    const uniqueResponses = data.responses.filter(r => {
                        if (uniqueEmails.has(r.email)) return false;
                        uniqueEmails.add(r.email);
                        return true;
                    });

                    stats[event.event_id] = {
                        yes: uniqueResponses.filter(r => r.attending.toLowerCase() === "yes").length || 0,
                        no: uniqueResponses.filter(r => r.attending.toLowerCase() === "no").length || 0,
                        maybe: uniqueResponses.filter(r => r.attending.toLowerCase() === "maybe").length || 0
                    };
                } else {
                    stats[event.event_id] = { yes: 0, no: 0, maybe: 0 };
                }
            } catch (err) {
                stats[event.event_id] = { yes: 0, no: 0, maybe: 0 };
            }
        }));
        setRsvpStats(stats);
    };

    const deleteEvent = async (eventId, eventName) => {
        if (!window.confirm(`Are you sure you want to delete "${eventName}"? This action cannot be undone.`)) return;
        setDeletingEventId(eventId);

        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "deleteEvent");
            formData.append("event_id", eventId);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                const updatedEvents = events.filter(event => event.event_id !== eventId);
                setEvents(updatedEvents);
                setFilteredEvents(updatedEvents);
                setSoonestEvent(updatedEvents.filter(e => !isEventCancelled(e) && new Date(e.event_start_date || e.created_at) >= new Date().setHours(0, 0, 0, 0))[0] || null);
                printAlert("Event deleted successfully!", "success");
            } else {
                printAlert(`Failed to delete event: ${data.message}`, "error");
            }
        } catch (error) {
            printAlert("An error occurred while deleting", "error");
        } finally {
            setDeletingEventId(null);
            setShowMenuId(null);
        }
    };

    const cancelEvent = async (eventId, eventName) => {
        if (!window.confirm(`Are you sure you want to cancel "${eventName}"?`)) return;

        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "cancelEvent");
            formData.append("event_id", eventId);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                printAlert("Event canceled successfully!", "success");
                const updatedEvents = events.map(event =>
                    event.event_id === eventId ? { ...event, status: "cancelled" } : event
                );
                setEvents(updatedEvents);
                setFilteredEvents(updatedEvents);
                setSoonestEvent(updatedEvents.filter(e => !isEventCancelled(e) && new Date(e.event_start_date || e.created_at) >= new Date().setHours(0, 0, 0, 0))[0] || null);
            } else {
                printAlert(`Failed to cancel event: ${data.message}`, "error");
            }
        } catch (error) {
            printAlert("An error occurred while canceling", "error");
        } finally {
            setShowMenuId(null);
        }
    };

    const reactivateEvent = async (eventId, eventName) => {
        if (!window.confirm(`Are you sure you want to reactivate "${eventName}"?`)) return;

        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "reactivateEvent");
            formData.append("event_id", eventId);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                printAlert("Event reactivated successfully!", "success");
                const updatedEvents = events.map(event =>
                    event.event_id === eventId ? { ...event, status: event.is_published ? "published" : "draft" } : event
                );
                setEvents(updatedEvents);
                setFilteredEvents(updatedEvents);
                setSoonestEvent(updatedEvents.filter(e => !isEventCancelled(e) && new Date(e.event_start_date || e.created_at) >= new Date().setHours(0, 0, 0, 0))[0] || null);
            } else {
                printAlert(`Failed to reactivate event: ${data.message}`, "error");
            }
        } catch (error) {
            printAlert("An error occurred while reactivating", "error");
        } finally {
            setShowMenuId(null);
        }
    };

    const handleEdit = (event) => {
        setSelectedEvent(event);
        setEditedEvent({
            ...event,
            event_start_date: event.event_start_date ? new Date(event.event_start_date).toISOString().split('T')[0] : "",
            event_end_date: event.event_end_date ? new Date(event.event_end_date).toISOString().split('T')[0] : ""
        });
        setShowEditModal(true);
        setShowMenuId(null);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDate = new Date(editedEvent.event_start_date);
        const endDate = editedEvent.event_end_date ? new Date(editedEvent.event_end_date) : null;

        if (startDate < today) {
            printAlert("Event start date cannot be in the past", "error");
            return;
        }
        if (endDate && endDate < today) {
            printAlert("Event end date cannot be in the past", "error");
            return;
        }
        if (endDate && endDate < startDate) {
            printAlert("Event end date cannot be before start date", "error");
            return;
        }

        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "updateEvent");
            formData.append("event_id", selectedEvent.event_id);
            formData.append("event_name", editedEvent.event_name);
            formData.append("event_location", editedEvent.event_location || "");
            formData.append("event_start_date", editedEvent.event_start_date);
            formData.append("event_start_time", editedEvent.event_start_time || "");
            formData.append("event_end_date", editedEvent.event_end_date || "");
            formData.append("event_end_time", editedEvent.event_end_time || "");

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                printAlert("Event updated successfully!", "success");
                const updatedEvents = events.map(event =>
                    event.event_id === selectedEvent.event_id ? { ...event, ...editedEvent } : event
                );
                setEvents(updatedEvents);
                setFilteredEvents(updatedEvents);
                setSoonestEvent(updatedEvents.filter(e => !isEventCancelled(e) && new Date(e.event_start_date || e.created_at) >= new Date().setHours(0, 0, 0, 0))[0] || null);
                setShowEditModal(false);
            } else {
                printAlert(`Failed to update event: ${data.message}`, "error");
            }
        } catch (error) {
            printAlert(`An error occurred while updating: ${error.message}`, "error");
        }
    };

    const publishedEventsCount = events.filter(event => isEventPublished(event) && !isEventCancelled(event)).length;
    const unpublishedEventsCount = events.filter(event => !isEventPublished(event) && !isEventCancelled(event)).length;
    const cancelledEventsCount = events.filter(event => isEventCancelled(event)).length;

    useEffect(() => {
        let result = [...events];

        if (filters.searchQuery.trim() !== "") {
            const query = filters.searchQuery.toLowerCase();
            result = result.filter(event => event.event_name.toLowerCase().includes(query));
        }

        if (activeTab !== "all") {
            result = result.filter(event => {
                const published = isEventPublished(event);
                const cancelled = isEventCancelled(event);
                switch (activeTab) {
                    case "published":
                        return published && !cancelled;
                    case "unpublished":
                        return !published && !cancelled;
                    case "cancelled":
                        return cancelled;
                    default:
                        return true;
                }
            });
        }

        if (filters.dateRange !== "all") {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            result = result.filter(event => {
                const eventDate = new Date(event.event_start_date || event.created_at);
                eventDate.setHours(0, 0, 0, 0);
                switch (filters.dateRange) {
                    case "today":
                        return eventDate.toDateString() === today.toDateString();
                    case "week":
                        const oneWeekAgo = new Date();
                        oneWeekAgo.setDate(today.getDate() - 7);
                        return eventDate >= oneWeekAgo;
                    case "month":
                        const oneMonthAgo = new Date();
                        oneMonthAgo.setMonth(today.getMonth() - 1);
                        return eventDate >= oneMonthAgo;
                    case "upcoming":
                        return eventDate >= today;
                    case "past":
                        return eventDate < today;
                    default:
                        return true;
                }
            });
        }

        result.sort((a, b) => {
            const dateA = new Date(a.event_start_date || a.created_at);
            const dateB = new Date(b.event_start_date || b.created_at);
            return filters.sortBy === "latest" ? dateB - dateA : dateA - dateB;
        });

        setFilteredEvents(result);
        setCurrentPage(1);
    }, [filters, events, activeTab]);

    const displayedEvents = filteredEvents.slice(0, currentPage * itemsPerPage);
    const canLoadMore = filteredEvents.length > displayedEvents.length;

    const loadMoreEvents = () => setCurrentPage(prev => prev + 1);
    const handleFilterChange = (filterType, value) => setFilters(prev => ({ ...prev, [filterType]: value }));
    const handleEventClick = (eventId) => {
        localStorage.setItem("selectedEventId", eventId);
        navigate("/eventManagement");
    };
    const createEvent = () => navigate("/activeEventDetails");

    const formatDateTime = (date, time) => {
        if (!date) return 'TBD';
        const dateObj = new Date(date);
        if (time) {
            const [hours, minutes] = time.split(':').map(Number);
            dateObj.setHours(hours, minutes);
        }
        return dateObj.toLocaleString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <>
                <LoginNav />
                <div className="loading-container">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <div className="loading-text">Loading your events...</div>
                </div>
            </>
        );
    }

    return (
        <>
            <LoginNav />
            {alert.show && (
                <div className={`custom-alert ${alert.type}`}>
                    <div className="alert-content">
                        <span className="alert-message">{alert.message}</span>
                        <button
                            className="alert-close"
                            onClick={() => setAlert({ show: false, message: "", type: "" })}
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
            <section className="eventsDashboard">
                <div className="container">
                    <div className="dashboard-header">
                        <div className="header-content">
                            <h1 className="dashboard-title">Events Dashboard</h1>
                            <p className="dashboard-subtitle">Manage and track your events with ease</p>
                        </div>
                        <button className="create-event-btn-main" onClick={createEvent}>
                            <i className="bi bi-plus-lg"></i> New Event
                        </button>
                    </div>

                    {soonestEvent && !isEventCancelled(soonestEvent) && (
                        <div className="next-event-card">
                            <div className="next-event-icon">
                                <i className="bi bi-clock"></i>
                            </div>
                            <div className="next-event-content">
                                <h3>Next Event</h3>
                                <div className="next-event-name">{soonestEvent.event_name}</div>
                                <div className="next-event-date">
                                    {formatDateTime(soonestEvent.event_start_date, soonestEvent.event_start_time)}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="dashboard-controls">
                        <div className="events-tabs">
                            <button className={`tab-btn ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")}>
                                <i className="bi bi-grid-3x3-gap"></i> All ({events.length})
                            </button>
                            <button className={`tab-btn ${activeTab === "published" ? "active" : ""}`} onClick={() => setActiveTab("published")}>
                                <i className="bi bi-check-circle"></i> Published ({publishedEventsCount})
                            </button>
                            <button className={`tab-btn ${activeTab === "unpublished" ? "active" : ""}`} onClick={() => setActiveTab("unpublished")}>
                                <i className="bi bi-pencil-square"></i> Draft ({unpublishedEventsCount})
                            </button>
                            <button className={`tab-btn ${activeTab === "cancelled" ? "active" : ""}`} onClick={() => setActiveTab("cancelled")}>
                                <i className="bi bi-slash-circle"></i> Cancelled ({cancelledEventsCount})
                            </button>
                        </div>

                        <div className="filters-section compact">
                            <div className="filter-group search-group">
                                <div className="search-input-wrapper">
                                    <i className="bi bi-search"></i>
                                    <input
                                        type="text"
                                        placeholder="Search events by name..."
                                        value={filters.searchQuery}
                                        onChange={(e) => handleFilterChange("searchQuery", e.target.value)}
                                        className="search-input"
                                    />
                                </div>
                            </div>
                            <div className="filter-group">
                                <select
                                    value={filters.dateRange}
                                    onChange={(e) => handleFilterChange("dateRange", e.target.value)}
                                    className="filter-select"
                                >
                                    <option value="all">All Dates</option>
                                    <option value="today">Today</option>
                                    <option value="week">This Week</option>
                                    <option value="month">This Month</option>
                                    <option value="upcoming">Upcoming</option>
                                    <option value="past">Past</option>
                                </select>
                            </div>
                            <div className="filter-group">
                                <select
                                    value={filters.sortBy}
                                    onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                                    className="filter-select"
                                >
                                    <option value="latest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="stats-overview">
                        <div className="stat-card">
                            <div className="stat-icon"><i className="bi bi-people"></i></div>
                            <div className="stat-value">{Object.values(rsvpStats).reduce((sum, s) => sum + s.yes, 0)}</div>
                            <div className="stat-label">Total Attending</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon"><i className="bi bi-calendar-event"></i></div>
                            <div className="stat-value">{events.length}</div>
                            <div className="stat-label">Total Events</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon"><i className="bi bi-filter"></i></div>
                            <div className="stat-value">{filteredEvents.length}</div>
                            <div className="stat-label">Filtered Results</div>
                        </div>
                    </div>

                    <div className="events-grid">
                        {displayedEvents.length > 0 ? (
                            displayedEvents.map((event) => {
                                const published = isEventPublished(event);
                                const cancelled = isEventCancelled(event);
                                const eventDate = new Date(event.event_start_date || event.created_at);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                eventDate.setHours(0, 0, 0, 0);
                                const isUpcoming = eventDate >= today;

                                return (
                                    <div className="event-card-wrapper" key={event.event_id}>
                                        {!cancelled && (
                                            <div className={`event-status-badge ${published ? 'published' : 'draft'}`}>
                                                <i className={`bi ${published ? "bi-check-circle-fill" : "bi-pencil-square"}`}></i>
                                                <span>{published ? "Published" : "Draft"}</span>
                                            </div>
                                        )}
                                        {cancelled && (
                                            <div className="event-status-badge cancelled">
                                                <i className="bi bi-x-circle-fill"></i>
                                                <span>Cancelled</span>
                                            </div>
                                        )}
                                        <div className={`event-date-badge ${isUpcoming ? 'upcoming' : 'past'}`}>
                                            <i className={`bi ${isUpcoming ? "bi-arrow-up-right" : "bi-arrow-down-left"}`}></i>
                                            <span>{isUpcoming ? "Upcoming" : "Past"}</span>
                                        </div>
                                        <button
                                            className="event-menu-toggle"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowMenuId(showMenuId === event.event_id ? null : event.event_id);
                                            }}
                                            title="Event options"
                                        >
                                            <i className="bi bi-three-dots-vertical"></i>
                                        </button>
                                        {showMenuId === event.event_id && (
                                            <div className="context-menu">
                                                <button className="menu-item" onClick={() => handleEdit(event)}>
                                                    <i className="bi bi-pencil"></i> Edit Event
                                                </button>
                                                {cancelled ? (
                                                    <button className="menu-item success" onClick={() => reactivateEvent(event.event_id, event.event_name)}>
                                                        <i className="bi bi-arrow-clockwise"></i> Reactivate Event
                                                    </button>
                                                ) : (
                                                    <button className="menu-item danger" onClick={() => cancelEvent(event.event_id, event.event_name)}>
                                                        <i className="bi bi-slash-circle"></i> Cancel Event
                                                    </button>
                                                )}
                                                <div className="menu-divider"></div>
                                                <button
                                                    className="menu-item delete"
                                                    onClick={() => deleteEvent(event.event_id, event.event_name)}
                                                    disabled={deletingEventId === event.event_id}
                                                >
                                                    {deletingEventId === event.event_id ? (
                                                        <>
                                                            <div className="spinner-border spinner-border-sm me-2" role="status">
                                                                <span className="visually-hidden">Deleting...</span>
                                                            </div>
                                                            Deleting...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="bi bi-trash"></i> Delete
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                        <div className="event-card" onClick={() => handleEventClick(event.event_id)}>
                                            <div className="event-media">
                                                <img
                                                    src={event.event_image || "/api/placeholder/400/250"}
                                                    alt={event.event_name}
                                                    onError={(e) => {
                                                        e.target.src = "/api/placeholder/400/250";
                                                    }}
                                                    className={cancelled ? "cancelled-image" : ""}
                                                />
                                                <div className="event-overlay">
                                                    <i className="bi bi-calendar3-event"></i>
                                                </div>
                                            </div>
                                            <div className="event-body">
                                                <h3 className="event-title">{event.event_name}</h3>
                                                <div className="event-datetime">
                                                    <div className="date-group">
                                                        <i className="bi bi-calendar"></i>
                                                        <span>{formatDateTime(event.event_start_date, event.event_start_time)}</span>
                                                    </div>
                                                    {event.event_end_date && (
                                                        <div className="date-group">
                                                            <i className="bi bi-calendar-check"></i>
                                                            <span>{formatDateTime(event.event_end_date, event.event_end_time)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="rsvp-metrics">
                                                    <div className="metric yes">
                                                        <div className="metric-number">{rsvpStats[event.event_id]?.yes ?? 0}</div>
                                                        <div className="metric-label">Yes</div>
                                                    </div>
                                                    <div className="metric maybe">
                                                        <div className="metric-number">{rsvpStats[event.event_id]?.maybe ?? 0}</div>
                                                        <div className="metric-label">Maybe</div>
                                                    </div>
                                                    <div className="metric no">
                                                        <div className="metric-number">{rsvpStats[event.event_id]?.no ?? 0}</div>
                                                        <div className="metric-label">No</div>
                                                    </div>
                                                </div>
                                                <div className="event-footer">
                                                    <button className={`action-btn ${published && !cancelled ? 'primary' : 'secondary'} ${cancelled ? 'disabled' : ''}`}>
                                                        {cancelled ? (
                                                            <>
                                                                <i className="bi bi-eye"></i> View Details
                                                            </>
                                                        ) : published ? (
                                                            <>
                                                                <i className="bi bi-gear"></i> Manage
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="bi bi-arrow-right"></i> Complete Setup
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon">
                                    <i className="bi bi-calendar-x"></i>
                                </div>
                                <h3>No Events Found</h3>
                                <p>Create your first event or adjust your filters to view existing events.</p>
                                <button className="cta-button" onClick={createEvent}>
                                    <i className="bi bi-plus-circle"></i> Create Event
                                </button>
                            </div>
                        )}
                    </div>

                    {canLoadMore && (
                        <div className="load-more-section">
                            <button className="load-more-btn" onClick={loadMoreEvents}>
                                Load More ({filteredEvents.length - displayedEvents.length} remaining)
                                <i className="bi bi-arrow-down"></i>
                            </button>
                        </div>
                    )}
                </div>

                {showEditModal && (
                    <div className="modal-backdrop">
                        <div className="modal-container">
                            <div className="modal-header">
                                <h2><i className="bi bi-pencil-square"></i> Edit Event</h2>
                                <button className="modal-close" onClick={() => setShowEditModal(false)}>
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            </div>
                            <form onSubmit={handleSaveEdit} className="modal-form">
                                <div className="form-group">
                                    <label>Event Name *</label>
                                    <input
                                        type="text"
                                        value={editedEvent.event_name || ""}
                                        onChange={(e) => setEditedEvent({ ...editedEvent, event_name: e.target.value })}
                                        required
                                        placeholder="Enter event name"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Event Venue *</label>
                                    <input
                                        type="text"
                                        value={editedEvent.event_location || ""}
                                        onChange={(e) => setEditedEvent({ ...editedEvent, event_location: e.target.value })}
                                        required
                                        placeholder="Enter event venue"
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Start Date *</label>
                                        <input
                                            type="date"
                                            value={editedEvent.event_start_date || ""}
                                            onChange={(e) => setEditedEvent({ ...editedEvent, event_start_date: e.target.value })}
                                            required
                                            min={getMinDate()}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Start Time</label>
                                        <input
                                            type="time"
                                            value={editedEvent.event_start_time || ""}
                                            onChange={(e) => setEditedEvent({ ...editedEvent, event_start_time: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>End Date</label>
                                        <input
                                            type="date"
                                            value={editedEvent.event_end_date || ""}
                                            onChange={(e) => setEditedEvent({ ...editedEvent, event_end_date: e.target.value })}
                                            min={editedEvent.event_start_date || getMinDate()}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>End Time</label>
                                        <input
                                            type="time"
                                            value={editedEvent.event_end_time || ""}
                                            onChange={(e) => setEditedEvent({ ...editedEvent, event_end_time: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        <i className="bi bi-check-lg"></i> Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </section>
        </>
    );
};

export default EventsDashboard;