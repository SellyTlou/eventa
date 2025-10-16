import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./main.css";
import "../../App.css";
import { LoginNav,logOut } from "../components";

const EventsDashboard = () => {
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1); 
    const [filters, setFilters] = useState({
        dateRange: "all",
        sortBy: "latest",
        status: "all"
    });
    const [rsvpStats, setRsvpStats] = useState({});
    const [deletingEventId, setDeletingEventId] = useState(null);
    const [activeTab, setActiveTab] = useState("all");
    
    const itemsPerPage = 6; 
    
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
            setLoading(false);
            logOut();
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
                        const alreadyExists = uniqueEvents.some((e) => e.event_id === event.event_id);
                        if (!alreadyExists) uniqueEvents.push(event);
                    });

                    setEvents(uniqueEvents);
                    setFilteredEvents(uniqueEvents);
                    fetchRSVPStatsForEvents(uniqueEvents);
                }
            } catch (error) {
                console.error("Failed to fetch events:", error);
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
                console.error("Failed to fetch RSVP stats for event:", event.event_id, err);
                stats[event.event_id] = { yes: 0, no: 0, maybe: 0 };
            }
        }));

        setRsvpStats(stats);
    };

    const deleteEvent = async (eventId, eventName) => {
        if (!window.confirm(`Are you sure you want to delete "${eventName}"? This action cannot be undone.`)) {
            return;
        }

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
                alert("Event deleted successfully!");
            } else {
                alert("Failed to delete event. Please try again.");
            }
        } catch (error) {
            console.error("Failed to delete event:", error);
            alert("An error occurred while deleting the event.");
        } finally {
            setDeletingEventId(null);
        }
    };

    const isEventPublished = (event) => {
        return event.is_published === true || event.published === 1 || event.published === '1' ||
            event.status === 'published' || event.status === true || event.status === 1 || event.status === '1';
    };

    useEffect(() => {
        let result = [...events];

        if (activeTab !== "all") {
            result = result.filter(event => {
                const published = isEventPublished(event);
                return activeTab === "published" ? published : !published;
            });
        }

        // Filter by date range
        if (filters.dateRange !== "all") {
            const today = new Date();
            result = result.filter(event => {
                const eventDate = new Date(event.event_date || event.created_at);

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

        // Sort events
        result.sort((a, b) => {
            const dateA = new Date(a.event_date || a.created_at);
            const dateB = new Date(b.event_date || b.created_at);

            return filters.sortBy === "latest"
                ? dateB - dateA
                : dateA - dateB;
        });

        setFilteredEvents(result);
        setCurrentPage(1);
    }, [filters, events, activeTab]);

    const publishedEventsCount = events.filter(event => isEventPublished(event)).length;
    const unpublishedEventsCount = events.filter(event => !isEventPublished(event)).length;

    const displayedEvents = filteredEvents.slice(0, currentPage * itemsPerPage);
    const canLoadMore = filteredEvents.length > displayedEvents.length;

    const loadMoreEvents = () => {
        setCurrentPage(prevPage => prevPage + 1);
    };

    const handleFilterChange = (filterType, value) => setFilters(prev => ({ ...prev, [filterType]: value }));
    const handleEventClick = (eventId) => {
        localStorage.setItem("selectedEventId", eventId);
        navigate("/eventManagement");
    };
    const createEvent = () => navigate("/activeEventDetails");

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
            <section className="eventsDashboard">
                <div className="container">
                    <div className="dashboard-header">
                        <div className="header-content">
                            <h1 className="dashboard-title">My Events Dashboard</h1>
                            <p className="dashboard-subtitle">Manage and track your events</p>
                        </div>
                        <button className="create-event-btn-main" onClick={createEvent}>
                            <i className="bi bi-plus-circle"></i>
                            Create New Event
                        </button>
                    </div>

                    {/* Status Tabs */}
                    <div className="events-tabs">
                        <button
                            className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
                            onClick={() => setActiveTab("all")}
                        >
                            All Events <span className="tab-count">{events.length}</span>
                        </button>
                        <button
                            className={`tab-btn ${activeTab === "published" ? "active" : ""}`}
                            onClick={() => setActiveTab("published")}
                        >
                            Published <span className="tab-count">{publishedEventsCount}</span>
                        </button>
                        <button
                            className={`tab-btn ${activeTab === "unpublished" ? "active" : ""}`}
                            onClick={() => setActiveTab("unpublished")}
                        >
                            Unpublished <span className="tab-count">{unpublishedEventsCount}</span>
                        </button>
                    </div>

                    <div className="dashboard-filters">
                        <div className="filter-group">
                            <label>Date Range:</label>
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
                                <option value="past">Past Events</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Sort By:</label>
                            <select
                                value={filters.sortBy}
                                onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                                className="filter-select"
                            >
                                <option value="latest">Latest First</option>
                                <option value="oldest">Oldest First</option>
                            </select>
                        </div>

                        <div className="filter-results">
                            Showing {displayedEvents.length} of {filteredEvents.length} events
                        </div>
                    </div>

                    <div className="events-grid">
                        {displayedEvents.length > 0 ? (
                            displayedEvents.map((event) => {
                                const published = isEventPublished(event);
                                return (
                                    <div
                                        className="event-card-container"
                                        key={event.event_id}
                                    >
                                        {/* Status Badge */}
                                        <div className={`event-status-badge ${published ? 'published' : 'unpublished'}`}>
                                            {published ? (
                                                <><i className="bi bi-check-circle"></i> Published</>
                                            ) : (
                                                <><i className="bi bi-clock"></i> Unpublished</>
                                            )}
                                        </div>

                                        {/* Delete button */}
                                        <button
                                            className="delete-event-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteEvent(event.event_id, event.event_name);
                                            }}
                                            disabled={deletingEventId === event.event_id}
                                            title="Delete event"
                                        >
                                            {deletingEventId === event.event_id ? (
                                                <div className="spinner-border spinner-border-sm" role="status">
                                                    <span className="visually-hidden">Deleting...</span>
                                                </div>
                                            ) : (
                                                <i className="bi bi-trash"></i>
                                            )}
                                        </button>

                                        <div className="event-card" onClick={() => handleEventClick(event.event_id)}>
                                            <div className="event-image">
                                                <img
                                                    src={event.event_image || "#"}
                                                    alt={event.event_name}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                />
                                                <div className="event-image-placeholder">
                                                    <i className="bi bi-calendar-event"></i>
                                                    <span>{event.event_name}</span>
                                                </div>
                                            </div>

                                            <div className="event-content">
                                                <h3 className="event-title">{event.event_name}</h3>

                                                <div className="event-date">
                                                    <i className="bi bi-calendar"></i>
                                                    {event.event_start_date && event.event_end_date
                                                        ? `${new Date(event.event_start_date).toLocaleDateString()} - ${new Date(event.event_end_date).toLocaleDateString()}`
                                                        : 'Date not set'}
                                                </div>

                                                <div className="rsvp-stats">
                                                    <div className="stat-item attending">
                                                        <div className="stat-value">{rsvpStats[event.event_id]?.yes ?? 0}</div>
                                                        <div className="stat-label">Attending</div>
                                                    </div>
                                                    <div className="stat-item maybe">
                                                        <div className="stat-value">{rsvpStats[event.event_id]?.maybe ?? 0}</div>
                                                        <div className="stat-label">Maybe</div>
                                                    </div>
                                                    <div className="stat-item not-attending">
                                                        <div className="stat-value">{rsvpStats[event.event_id]?.no ?? 0}</div>
                                                        <div className="stat-label">Can't Attend</div>
                                                    </div>
                                                </div>

                                                <div className="event-actions">
                                                    <button
                                                        className={`manage-btn ${published ? 'published' : 'unpublished'}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEventClick(event.event_id);
                                                        }}
                                                    >
                                                        {published ? 'Manage Event' : 'Complete Setup'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="no-events-message">
                                <div className="no-events-icon">
                                    <i className="bi bi-calendar-x"></i>
                                </div>
                                <h3>No events found</h3>
                                <p>You haven't created any events yet or no events match your filters.</p>
                                <button className="create-event-btn" onClick={createEvent}>
                                    <i className="bi bi-plus-circle"></i>
                                    Create Your First Event
                                </button>
                            </div>
                        )}
                    </div>

                    {canLoadMore && (
                        <div className="pagination-container">
                            <button className="load-more-btn" onClick={loadMoreEvents}>
                                Load More Events ({filteredEvents.length - displayedEvents.length} remaining)
                                <i className="bi bi-arrow-down"></i>
                            </button>
                        </div>
                    )}
                </div>
            </section>
        </>
    );
};

export default EventsDashboard;