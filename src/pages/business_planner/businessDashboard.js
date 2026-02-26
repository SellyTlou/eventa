import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PriorityQueue from "js-priority-queue";
import "../planner/main.css";
import "../../responce.css";
import "../../alert.css";
import { LoginNav } from "../components";
import { 
    getEffectivePackageValue, 
    getEffectivePackageName,
    isCustomPackage,
    formatFeatures,
    canCreateEvent,
    canHostGuests 
} from "../utils/customPackageUtils";

const BusinessDashboard = () => {
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({
        dateRange: "all",
        eventType: "all",
        ticketType: "all",
        searchQuery: ""
    });
    const [rsvpStats, setRsvpStats] = useState({});
    const [deletingEventId, setDeletingEventId] = useState(null);
    const [soonestEvent, setSoonestEvent] = useState(null);
    const [showMenuId, setShowMenuId] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [editedEvent, setEditedEvent] = useState({});
    const [alert, setAlert] = useState({ show: false, message: "", type: "" });

    // Cancel modal states
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelEventId, setCancelEventId] = useState(null);
    const [cancelEventName, setCancelEventName] = useState("");
    const [cancelMessage, setCancelMessage] = useState("");
    const [affectedGuests, setAffectedGuests] = useState([]);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [showMessageStep, setShowMessageStep] = useState(false);

    // Delete modal states
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteEventId, setDeleteEventId] = useState(null);
    const [deleteEventName, setDeleteEventName] = useState("");
    const [deleteMessage, setDeleteMessage] = useState("");
    const [affectedDeleteGuests, setAffectedDeleteGuests] = useState([]);
    const [sendingDeleteMessage, setSendingDeleteMessage] = useState(false);
    const [showDeleteMessageStep, setShowDeleteMessageStep] = useState(false);

    // Reserve modal state
    const [showReserveModal, setShowReserveModal] = useState(false);
    const [reserveEvent, setReserveEvent] = useState(null);
    const [reserveStats, setReserveStats] = useState({ yes: 0, no: 0, maybe: 0 });

    // For showing features dropdown
    const [showFeatures, setShowFeatures] = useState(false);

    const [user, setUserData] = useState(null);
    const [userBusinessPackage, setUserBusinessPackage] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const itemsPerPage = 6;
    const navigate = useNavigate();

    const printAlert = (message, type = "info") => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert({ show: false, message: "", type: "" }), 5000);
    };

    // Helper function to validate base64 images
    const getValidImageSrc = (imageData) => {
        if (!imageData) {
            return "/images/default-event.jpg";
        }
        
        let imageSrc = typeof imageData === 'string' ? imageData : String(imageData);
        
        if (imageSrc.startsWith('http://') || imageSrc.startsWith('https://') || imageSrc.startsWith('/')) {
            return imageSrc;
        }

        if (imageSrc.startsWith('data:image')) {
            if (imageSrc.length > 100) {
                return imageSrc;
            } else {
                console.warn('Truncated base64 image detected, length:', imageSrc.length);
                return "/images/default-event.jpg";
            }
        }
        
        if (imageSrc.length > 50 && !imageSrc.includes(' ') && !imageSrc.includes('/')) {
            return `data:image/png;base64,${imageSrc}`;
        }
        
        return "/images/default-event.jpg";
    };

    // Reserve modal functions
    const showReserveStats = async (event, rsvpStats) => {
        setReserveEvent(event);
        
        if (event.has_tickets) {
            try {
                const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
                const formData = new FormData();
                formData.append("function", "getTicketSalesStats");
                formData.append("event_id", event.event_id);
                
                const res = await fetch(`${API_URL}/query.php`, {
                    method: "POST",
                    body: formData,
                });
                
                const ticketData = await res.json();
                if (ticketData.success) {
                    setReserveStats({
                        ticketStats: ticketData.ticket_stats,
                        rsvpStats: rsvpStats,
                        hasBoth: true
                    });
                } else {
                    setReserveStats({
                        ticketStats: [],
                        rsvpStats: rsvpStats,
                        hasBoth: false
                    });
                }
            } catch (error) {
                console.error("Error fetching ticket stats:", error);
                setReserveStats({
                    ticketStats: [],
                    rsvpStats: rsvpStats,
                    hasBoth: false
                });
            }
        } else {
            setReserveStats({
                ticketStats: [],
                rsvpStats: rsvpStats,
                hasBoth: false
            });
        }
        
        setShowReserveModal(true);
    };

    const closeReserveModal = () => {
        setShowReserveModal(false);
        setReserveEvent(null);
        setReserveStats({ ticketStats: [], rsvpStats: { yes: 0, no: 0, maybe: 0 }, hasBoth: false });
    };

    // Navbar functions
    const createEventClicked = () => {
        navigate("/activeEventDetails");
    };

    const goToProfile = () => {
        navigate("/profile");
    };

    const logOut = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/");
    };

    const toggleDropdown = () => {
        setDropdownOpen(prev => !prev);
    };

    // Fetch user's business package
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

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            if (data.success && data.userBusinessPackage) {
                setUserBusinessPackage(data.userBusinessPackage);
            } else {
                console.log("No business package found for user:", data.message);
                setUserBusinessPackage(null);
            }
        } catch (error) {
            console.error("Error fetching business package:", error);
            setUserBusinessPackage(null);
        }
    };

    // Navbar click outside handler
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const isEventCancelled = (event) => {
        return event.status === "cancelled" || event.status === "canceled";
    };

    const isEventPublished = (event) => {
        if (isEventCancelled(event)) return false;
        return (
            event.is_published === true ||
            event.published === 1 ||
            event.published === "1" ||
            event.status === "published" ||
            event.status === true ||
            event.status === 1 ||
            event.status === "1"
        );
    };

    const getMinDate = () => {
        const today = new Date();
        return today.toISOString().split("T")[0];
    };

    // Sort events with minHeap logic: upcoming events first, then past events
    const sortEventsWithMinHeap = (eventsArray) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcomingEvents = [];
        const pastEvents = [];
        const cancelledEvents = [];

        eventsArray.forEach((event) => {
            if (isEventCancelled(event)) {
                cancelledEvents.push(event);
                return;
            }

            const evDate = new Date(event.event_start_date || event.created_at);
            evDate.setHours(0, 0, 0, 0);

            if (evDate >= today) {
                upcomingEvents.push(event);
            } else {
                pastEvents.push(event);
            }
        });

        // Sort upcoming events by date (minHeap - earliest first)
        const upcomingHeap = new PriorityQueue({
            comparator: (a, b) => {
                const dA = new Date(a.event_start_date || a.created_at);
                const dB = new Date(b.event_start_date || b.created_at);
                return dA - dB;
            }
        });

        upcomingEvents.forEach((e) => upcomingHeap.queue(e));
        const sortedUpcoming = [];
        while (upcomingHeap.length > 0) sortedUpcoming.push(upcomingHeap.dequeue());

        // Sort past events by date (most recent first)
        const sortedPast = pastEvents.sort((a, b) => {
            const dA = new Date(a.event_start_date || a.created_at);
            const dB = new Date(b.event_start_date || b.created_at);
            return dB - dA;
        });

        return [...sortedUpcoming, ...sortedPast, ...cancelledEvents];
    };

    useEffect(() => {
        const storedUser = localStorage.getItem("user");

        if (!storedUser) {
            setLoading(false);
            printAlert("Session expired. Please log in again.", "error");
            logOut();
            navigate("/");
            return;
        }

        try {
            const userdata = JSON.parse(storedUser);
            setUserData(userdata);

            // Check if user is actually a business user
            if (userdata.account_type !== 'business') {
                printAlert("This dashboard is for business accounts only.", "error");
                navigate("/eventsDashboard");
                return;
            }

            if (userdata && userdata.user_id) {
                fetchEvents(userdata.user_id);
                fetchUserBusinessPackage(userdata.user_id);
            } else {
                console.error("Invalid user data:", userdata);
                printAlert("Invalid user data. Please log in again.", "error");
                logOut();
                navigate("/");
            }
        } catch (error) {
            console.error("Error parsing user data:", error);
            printAlert("Error loading user data. Please log in again.", "error");
            logOut();
            navigate("/");
        }
    }, [navigate]);

    const fetchEvents = async (userId) => {
        try {
            setLoading(true);
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "getUserEvents");
            formData.append("userID", userId);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && Array.isArray(data.events)) {
                const uniqueEvents = [];
                data.events.forEach((event) => {
                    if (!uniqueEvents.some((e) => e.event_id === event.event_id)) {
                        uniqueEvents.push(event);
                    }
                });

                // Apply minHeap sorting
                const sortedEvents = sortEventsWithMinHeap(uniqueEvents);

                // Find the soonest upcoming event
                const soonest = sortedEvents.find(event => {
                    if (isEventCancelled(event)) return false;
                    const evDate = new Date(event.event_start_date || event.created_at);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    evDate.setHours(0, 0, 0, 0);
                    return evDate >= today;
                }) || null;

                setSoonestEvent(soonest);
                setEvents(sortedEvents);
                setFilteredEvents(sortedEvents);
                fetchRSVPStatsForEvents(sortedEvents);
            } else {
                printAlert("Failed to load events: " + (data.message || "Unknown error"), "error");
            }
        } catch (error) {
            console.error("Failed to fetch events:", error);
            printAlert("Failed to load events. Please check your connection.", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchRSVPStatsForEvents = async (eventsArray) => {
        const stats = {};
        await Promise.all(
            eventsArray.map(async (event) => {
                try {
                    const API_URL = process.env.REACT_APP_API_URL;
                    const formData = new FormData();
                    formData.append("function", "getRSVPResponses");
                    formData.append("event_id", event.event_id);

                    const response = await fetch(`${API_URL}/query.php`, {
                        method: "POST",
                        body: formData
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.json();

                    if (data.success && Array.isArray(data.responses)) {
                        const uniqueEmails = new Set();
                        const uniq = data.responses.filter((r) => {
                            if (uniqueEmails.has(r.email)) return false;
                            uniqueEmails.add(r.email);
                            return true;
                        });

                        stats[event.event_id] = {
                            yes: uniq.filter((r) => r.attending.toLowerCase() === "yes").length || 0,
                            no: uniq.filter((r) => r.attending.toLowerCase() === "no").length || 0,
                            maybe: uniq.filter((r) => r.attending.toLowerCase() === "maybe").length || 0,
                            guests: uniq.filter((r) =>
                                ["yes", "maybe"].includes(r.attending.toLowerCase())
                            )
                        };
                    } else {
                        stats[event.event_id] = { yes: 0, no: 0, maybe: 0, guests: [] };
                    }
                } catch (err) {
                    console.error(`Error fetching RSVP stats for event ${event.event_id}:`, err);
                    stats[event.event_id] = { yes: 0, no: 0, maybe: 0, guests: [] };
                }
            })
        );
        setRsvpStats(stats);
    };

    // Filter and sort logic
    useEffect(() => {
        let result = [...events];

        // Search filter
        if (filters.searchQuery.trim() !== "") {
            const q = filters.searchQuery.toLowerCase();
            result = result.filter((e) => e.event_name.toLowerCase().includes(q));
        }

        // Ticket type filter
        if (filters.ticketType !== "all") {
            result = result.filter((e) => {
                switch (filters.ticketType) {
                    case "ticket-events":
                        return e.has_tickets === 1 || e.has_tickets === true || e.has_tickets === "1";
                    case "rsvp-events":
                        return !e.has_tickets || e.has_tickets === 0 || e.has_tickets === false || e.has_tickets === "0";
                    default:
                        return true;
                }
            });
        }

        // Date range filter
        if (filters.dateRange !== "all") {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            result = result.filter((e) => {
                const evDate = new Date(e.event_start_date || e.created_at);
                evDate.setHours(0, 0, 0, 0);
                switch (filters.dateRange) {
                    case "today":
                        return evDate.toDateString() === today.toDateString();
                    case "week": {
                        const weekAgo = new Date();
                        weekAgo.setDate(today.getDate() - 7);
                        return evDate >= weekAgo;
                    }
                    case "month": {
                        const monthAgo = new Date();
                        monthAgo.setMonth(today.getMonth() - 1);
                        return evDate >= monthAgo;
                    }
                    case "upcoming":
                        return evDate >= today;
                    case "past":
                        return evDate < today;
                    default:
                        return true;
                }
            });
        }

        // Apply minHeap sorting to filtered results
        const sortedFiltered = sortEventsWithMinHeap(result);
        setFilteredEvents(sortedFiltered);
        setCurrentPage(1);
    }, [filters, events]);

    /* -------------------------------------------------------------
       CANCEL EVENT PROCESS
    ------------------------------------------------------------- */
    const initiateCancel = (eventId, eventName) => {
        const ev = events.find((e) => e.event_id === eventId);
        if (!ev) return;

        const stats = rsvpStats[eventId] || { guests: [] };
        const yesMaybeGuests = stats.guests || [];

        setCancelEventId(eventId);
        setCancelEventName(eventName);
        setAffectedGuests(yesMaybeGuests);
        setCancelMessage(
            `Dear guest,\n\nWe regret to inform you that "${eventName}" has been cancelled.\n\nWe apologize for any inconvenience.\n\nBest regards,\nThe Event Team`
        );
        setShowMessageStep(false);
        setSendingMessage(false);
        setShowCancelModal(true);
    };

    const handleCancelConfirmation = () => {
        if (affectedGuests.length > 0) {
            setShowMessageStep(true);
        } else {
            performCancel();
        }
    };

    const performCancelWithMessage = async () => {
        if (!cancelMessage.trim()) {
            printAlert("Please enter a message", "warning");
            return;
        }

        setSendingMessage(true);

        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "sendGuestMessage");
            formData.append("message", cancelMessage);
            formData.append("API_URL", API_URL);
            formData.append("event_id", cancelEventId);

            const guestIds = affectedGuests.map(g => g.guest_id).join(",");
            formData.append("guest_ids", guestIds);
            formData.append("user_id", user?.user_id || '');

            const response = await fetch(`${API_URL}/send_message_to_guest.php`, {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                const recipientCount = affectedGuests.length;
                printAlert("Cancellation message sent to " + recipientCount + " guest(s)", "success");
                await performCancel();
            } else {
                printAlert("Failed to send cancellation message: " + data.message, "error");
                setSendingMessage(false);
            }
        } catch (error) {
            console.error("Error sending cancellation message:", error);
            printAlert("Error sending cancellation message", "error");
            setSendingMessage(false);
        }
    };

    const performCancel = async () => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "cancelEvent");
            formData.append("event_id", cancelEventId);
            formData.append("user_id", user.user_id);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                printAlert("Event cancelled successfully!", "success");
                const updated = events.map((e) =>
                    e.event_id === cancelEventId ? { ...e, status: "cancelled" } : e
                );
                setEvents(updated);
                setFilteredEvents(updated);
                setSoonestEvent(
                    updated.filter(
                        (e) =>
                            !isEventCancelled(e) &&
                            new Date(e.event_start_date || e.created_at) >= new Date().setHours(0, 0, 0, 0)
                    )[0] || null
                );
            } else {
                printAlert(`Failed to cancel: ${data.message}`, "error");
            }
        } catch (error) {
            console.error("Error cancelling event:", error);
            printAlert("Error cancelling event.", "error");
        } finally {
            resetCancelModal();
        }
    };

    const resetCancelModal = () => {
        setShowCancelModal(false);
        setCancelEventId(null);
        setCancelEventName("");
        setCancelMessage("");
        setAffectedGuests([]);
        setSendingMessage(false);
        setShowMessageStep(false);
        setShowMenuId(null);
    };

    /* -------------------------------------------------------------
       DELETE EVENT
    ------------------------------------------------------------- */
    const initiateDelete = (eventId, eventName) => {
        const ev = events.find((e) => e.event_id === eventId);
        if (!ev) return;

        const stats = rsvpStats[eventId] || { guests: [] };
        const yesMaybeGuests = stats.guests || [];

        setDeleteEventId(eventId);
        setDeleteEventName(eventName);
        setAffectedDeleteGuests(yesMaybeGuests);
        setDeleteMessage(
            `Dear guest,\n\nWe regret to inform you that "${eventName}" has been permanently deleted.\n\nWe apologize for any inconvenience.\n\nBest regards,\nThe Event Team`
        );
        setShowDeleteMessageStep(false);
        setSendingDeleteMessage(false);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirmation = () => {
        if (affectedDeleteGuests.length > 0) {
            setShowDeleteMessageStep(true);
        } else {
            performDelete();
        }
    };

    const performDeleteWithMessage = async () => {
        if (!deleteMessage.trim()) {
            printAlert("Please enter a message", "warning");
            return;
        }

        setSendingDeleteMessage(true);

        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "sendGuestMessage");
            formData.append("message", deleteMessage);
            formData.append("API_URL", API_URL);
            formData.append("event_id", deleteEventId);

            const guestIds = affectedDeleteGuests.map(g => g.guest_id).join(",");
            formData.append("guest_ids", guestIds);
            formData.append("user_id", user?.user_id || '');

            const response = await fetch(`${API_URL}/send_message_to_guest.php`, {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                const cnt = affectedDeleteGuests.length;
                printAlert(`Deletion message sent to ${cnt} guest(s)`, "success");
                await performDelete();
            } else {
                printAlert("Failed to send deletion message: " + data.message, "error");
                setSendingDeleteMessage(false);
            }
        } catch (err) {
            console.error("Error sending deletion message:", err);
            printAlert("Error sending deletion message", "error");
            setSendingDeleteMessage(false);
        }
    };

    const performDelete = async () => {
        setDeletingEventId(deleteEventId);
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "deleteEvent");
            formData.append("event_id", deleteEventId);
            formData.append("user_id", user.user_id);

            const resp = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData
            });

            if (!resp.ok) {
                throw new Error(`HTTP error! status: ${resp.status}`);
            }

            const data = await resp.json();

            if (data.success) {
                printAlert("Event deleted successfully!", "success");
                const updated = events.filter((e) => e.event_id !== deleteEventId);
                setEvents(updated);
                setFilteredEvents(updated);
                setSoonestEvent(
                    updated.filter(
                        (e) =>
                            !isEventCancelled(e) &&
                            new Date(e.event_start_date || e.created_at) >= new Date().setHours(0, 0, 0, 0)
                    )[0] || null
                );
            } else {
                printAlert(`Failed to delete: ${data.message}`, "error");
            }
        } catch (error) {
            console.error("Error deleting event:", error);
            printAlert("Error deleting event.", "error");
        } finally {
            setDeletingEventId(null);
            resetDeleteModal();
        }
    };

    const resetDeleteModal = () => {
        setShowDeleteModal(false);
        setDeleteEventId(null);
        setDeleteEventName("");
        setDeleteMessage("");
        setAffectedDeleteGuests([]);
        setSendingDeleteMessage(false);
        setShowDeleteMessageStep(false);
        setShowMenuId(null);
    };

    /* -------------------------------------------------------------
       OTHER ACTIONS
    ------------------------------------------------------------- */
    const reactivateEvent = async (eventId, eventName) => {
        if (!window.confirm(`Are you sure you want to reactivate "${eventName}"?`)) return;

        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "reactivateEvent");
            formData.append("event_id", eventId);
            formData.append("user_id", user.user_id);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                printAlert("Event reactivated!", "success");
                const updated = events.map((e) =>
                    e.event_id === eventId
                        ? { ...e, status: e.is_published ? "published" : "draft" }
                        : e
                );
                setEvents(updated);
                setFilteredEvents(updated);
                setSoonestEvent(
                    updated.filter(
                        (e) =>
                            !isEventCancelled(e) &&
                            new Date(e.event_start_date || e.created_at) >= new Date().setHours(0, 0, 0, 0)
                    )[0] || null
                );
            } else {
                printAlert(`Failed: ${data.message}`, "error");
            }
        } catch (error) {
            console.error("Error reactivating event:", error);
            printAlert("Error reactivating event.", "error");
        } finally {
            setShowMenuId(null);
        }
    };

    const handleEdit = (event) => {
        setSelectedEvent(event);
        setEditedEvent({
            ...event,
            event_start_date: event.event_start_date
                ? new Date(event.event_start_date).toISOString().split("T")[0]
                : "",
            event_end_date: event.event_end_date
                ? new Date(event.event_end_date).toISOString().split("T")[0]
                : ""
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

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                printAlert("Event updated successfully!", "success");
                const updated = events.map((e) =>
                    e.event_id === selectedEvent.event_id ? { ...e, ...editedEvent } : e
                );
                setEvents(updated);
                setFilteredEvents(updated);
                setSoonestEvent(
                    updated.filter(
                        (e) =>
                            !isEventCancelled(e) &&
                            new Date(e.event_start_date || e.created_at) >= new Date().setHours(0, 0, 0, 0)
                    )[0] || null
                );
                setShowEditModal(false);
            } else {
                printAlert(`Failed: ${data.message}`, "error");
            }
        } catch (error) {
            console.error("Error updating event:", error);
            printAlert(`Error updating: ${error.message}`, "error");
        }
    };

    const handleEventClick = (eventId) => {
        const event = events.find((e) => e.event_id === eventId);
        if (isEventCancelled(event)) {
            printAlert("Event is cancelled. Reactivate it to manage it.", "warning");
            return;
        }
        localStorage.setItem("selectedEventId", eventId);
        navigate("/eventManagement");
    };

    // Business-specific navigation
    const goToBusinessPackageManagement = () => {
        const eventId = localStorage.getItem("selectedEventId");
        if (!eventId) {
            printAlert("Please select an event first", "warning");
            return;
        }
        navigate("/manage_my_event_business");
    };

    const goToBusinessUpgrade = () => {
        navigate("/upgrade_business_package");
    };

    const displayedEvents = filteredEvents.slice(0, currentPage * itemsPerPage);
    const canLoadMore = filteredEvents.length > displayedEvents.length;

    const loadMoreEvents = () => setCurrentPage((p) => p + 1);
    const handleFilterChange = (type, value) =>
        setFilters((prev) => ({ ...prev, [type]: value }));
    const createEvent = () => navigate("/activeEventDetails");

    const formatDateTime = (date, time) => {
        if (!date) return "TBD";
        const d = new Date(date);
        if (time) {
            const [h, m] = time.split(":").map(Number);
            d.setHours(h, m);
        }
        return d.toLocaleString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    // Business Package Status Card - UPDATED to use utility functions
    const renderBusinessPackageStatus = () => {
        if (!userBusinessPackage) {
            return (
                <div className="business-package-status no-package">
                    <div className="status-icon">
                        <i className="bi bi-exclamation-triangle"></i>
                    </div>
                    <div className="status-content">
                        <h4>No Business Package</h4>
                        <p>You don't have an active business package. Upgrade to publish events.</p>
                        <button className="btn-upgrade-small" onClick={goToBusinessUpgrade}>
                            Get Business Package
                        </button>
                    </div>
                </div>
            );
        }

        const isCustom = isCustomPackage(userBusinessPackage);
        const packageName = getEffectivePackageName(userBusinessPackage);
        const eventsUsed = userBusinessPackage.event_used || 0;
        const eventLimit = getEffectivePackageValue(userBusinessPackage, 'events', 0);
        const guestLimit = getEffectivePackageValue(userBusinessPackage, 'guests', 0);
        const packagePrice = getEffectivePackageValue(userBusinessPackage, 'price', 0);
        
        const eventsRemaining = eventLimit === 0 ? 'Unlimited' : eventLimit - eventsUsed;
        const percentUsed = eventLimit > 0 ? (eventsUsed / eventLimit) * 100 : 0;

        return (
            <div className={`business-package-status active ${isCustom ? 'custom-package' : ''}`}>
                <div className="status-icon">
                    {isCustom ? (
                        <i className="bi bi-star-fill"></i>
                    ) : (
                        <i className="bi bi-briefcase"></i>
                    )}
                </div>
                <div className="status-content">
                    <div className="package-header">
                        <h4>
                            {packageName}
                            {isCustom && (
                                <span className="custom-badge">
                                    <i className="bi bi-star"></i> Custom Plan
                                </span>
                            )}
                        </h4>
                        {userBusinessPackage.approved_request_id && (
                            <span className="request-id-badge" title="Approved Custom Request">
                                <i className="bi bi-check-circle"></i>
                            </span>
                        )}
                    </div>
                    
                    <div className="package-details">
                        <div className="detail-row">
                            <span className="detail-label">
                                <i className="bi bi-people"></i> Guest Limit:
                            </span>
                            <span className="detail-value">
                                {guestLimit === 0 ? 'Unlimited' : guestLimit.toLocaleString()}
                            </span>
                        </div>
                        
                        <div className="detail-row">
                            <span className="detail-label">
                                <i className="bi bi-calendar-event"></i> Event Limit:
                            </span>
                            <span className="detail-value">
                                {eventLimit === 0 ? 'Unlimited' : eventLimit}
                            </span>
                        </div>
                    </div>

                    <div className="usage-info">
                        <div className="usage-bar">
                            <div 
                                className="usage-progress" 
                                style={{ width: `${Math.min(percentUsed, 100)}%` }}
                            ></div>
                        </div>
                        <div className="usage-text">
                            <span>{eventsUsed} of {eventLimit === 0 ? '∞' : eventLimit} events used</span>
                            <span className="remaining">
                                {eventsRemaining === 'Unlimited' ? 'Unlimited left' : `${eventsRemaining} remaining`}
                            </span>
                        </div>
                    </div>

                    {/* Custom Features Dropdown */}
                    {isCustom && (
                        <div className="package-features-mini">
                            <span className="features-toggle" onClick={() => setShowFeatures(!showFeatures)}>
                                <i className={`bi ${showFeatures ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                                {showFeatures ? 'Hide Custom Features' : 'View Custom Features'}
                            </span>
                            {showFeatures && (
                                <div className="features-dropdown">
                                    {getEffectivePackageValue(userBusinessPackage, 'features', []).map((feature, index) => (
                                        <div key={index} className="feature-item">
                                            <i className="bi bi-star-fill"></i>
                                            {feature}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {packagePrice > 0 && (
                        <div className="package-price">
                            <span className="price-label">Monthly Price:</span>
                            <span className="price-value">R{packagePrice.toFixed(2)}</span>
                        </div>
                    )}

                    <div className="package-footer">
                        {userBusinessPackage.expiry_date && (
                            <p className="expiry-date">
                                <i className="bi bi-calendar"></i>
                                Expires: {new Date(userBusinessPackage.expiry_date).toLocaleDateString()}
                            </p>
                        )}
                        <button className="btn-manage-package" onClick={goToBusinessUpgrade}>
                            {isCustom ? 'View Custom Plan' : 'Manage Package'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <>
                {loading && (
                    <div className="loading-container">
                        <div className="loading-overlay">
                            <div className="loading-spinner"></div>
                            <div className="loading-text">Loading business dashboard...</div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    return (
        <>
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

            <section className="eventsDashboard">
                <LoginNav />
                <div className="container">
                    {/* HEADER */}
                    <div className="dashboard-header">
                        <div className="header-content">
                            <h1 className="dashboard-title">Business Event Dashboard</h1>
                            <p className="dashboard-subtitle">Manage your business events and packages</p>
                        </div>
                        <button 
                            className="btn btn-outline me-2"
                            onClick={() => navigate('/my-requests')}>
                            <i className="bi bi-file-text"></i>
                            My Requests
                        </button>
                        <button className="btn btn-primary me-2" onClick={() => navigate('/custom-plan-request')}>
                            <i className="bi bi-file-text"></i>
                            Request Custom Plan
                        </button>
                        <button className="create-event-btn-main" onClick={createEvent}>
                            <i className="bi bi-plus-lg"></i> New Event
                        </button>
                    </div>

                    {/* BUSINESS PACKAGE STATUS - UPDATED */}
                    {renderBusinessPackageStatus()}

                    {/* NEXT EVENT CARD */}
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

                    {/* COMBINED FILTERS SECTION WITH LEGEND */}
                    <div className="dashboard-controls">
                        <div className="combined-filters">
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

                            {/* EVENT TYPE LEGEND */}
                            <div className="filter-group legend-group">
                                <div className="event-legend">
                                    <div className="legend-title">Event Types:</div>
                                    <div className="legend-items">
                                        <div className="legend-item rsvp-legend">
                                            <span className="legend-color rsvp-color"></span>
                                            <span className="legend-text">RSVP</span>
                                        </div>
                                        <div className="legend-item ticket-legend">
                                            <span className="legend-color ticket-color"></span>
                                            <span className="legend-text">Ticket</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="filter-group">
                                <select
                                    value={filters.ticketType}
                                    onChange={(e) => handleFilterChange("ticketType", e.target.value)}
                                    className="filter-select"
                                >
                                    <option value="all">All Event Types</option>
                                    <option value="ticket-events">Ticket Events</option>
                                    <option value="rsvp-events">RSVP Events</option>
                                </select>
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
                        </div>
                    </div>

                    {/* EVENTS GRID */}
                    <div className="events-grid">
                        {displayedEvents.length > 0 ? (
                            displayedEvents.map((event) => {
                                const published = isEventPublished(event);
                                const cancelled = isEventCancelled(event);
                                const evDate = new Date(event.event_start_date || event.created_at);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                evDate.setHours(0, 0, 0, 0);
                                const isUpcoming = evDate >= today;
                                const stats = rsvpStats[event.event_id] || { yes: 0, no: 0, maybe: 0 };

                                return (
                                    <div className="event-card-wrapper" key={event.event_id}>
                                        {/* Status badges */}
                                        {!cancelled && (
                                            <div className={`event-status-badge ${published ? "published" : "draft"}`}>
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
                                        <div className={`event-date-badge ${isUpcoming ? "upcoming" : "past"}`}>
                                            <i className={`bi ${isUpcoming ? "bi-arrow-up-right" : "bi-arrow-down-left"}`}></i>
                                            <span>{isUpcoming ? "Upcoming" : "Past"}</span>
                                        </div>

                                        {/* Menu */}
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
                                                    <button
                                                        className="menu-item success"
                                                        onClick={() => reactivateEvent(event.event_id, event.event_name)}
                                                    >
                                                        <i className="bi bi-arrow-clockwise"></i> Reactivate
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            className="menu-item warning"
                                                            onClick={() => initiateCancel(event.event_id, event.event_name)}
                                                        >
                                                            <i className="bi bi-slash-circle"></i> Cancel Event
                                                        </button>
                                                        <div className="menu-divider"></div>
                                                        <button
                                                            className="menu-item delete"
                                                            onClick={() => initiateDelete(event.event_id, event.event_name)}
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
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        {/* UPDATED CARD DESIGN */}
                                        <div
                                            className={`event-card modern-design ${event.has_tickets ? 'ticket-event-card' : 'rsvp-event-card'}`}
                                            onClick={() => handleEventClick(event.event_id)}
                                            style={{
                                                cursor: cancelled ? "not-allowed" : "pointer",
                                                opacity: cancelled ? 0.7 : 1
                                            }}
                                        >
                                            {/* Event Image - Top Half */}
                                            <div className="event-image-section">
                                                <img
                                                    src={getValidImageSrc(event.event_image)}
                                                    alt={event.event_name}
                                                    onError={(e) => {
                                                        console.warn('Invalid event image, using fallback for event:', event.event_id);
                                                        e.target.src = "/images/default-event.jpg";
                                                    }}
                                                    className="event-main-image"
                                                />
                                            </div>

                                            {/* Event Details - Middle Section */}
                                            <div className="event-details-section">
                                                <h3 className="event-title">{event.event_name}</h3>

                                                <div className="event-details-horizontal">
                                                    {/* Date */}
                                                    <div className="detail-horizontal">
                                                        <div className="detail-icon">
                                                            <i className="bi bi-calendar3"></i>
                                                        </div>
                                                        <div className="detail-content">
                                                            <div className="detail-label">DATE</div>
                                                            <div className="detail-value">
                                                                {event.event_start_date ? new Date(event.event_start_date).toLocaleDateString('en-US', {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    year: 'numeric'
                                                                }) : 'TBD'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Time */}
                                                    <div className="detail-horizontal">
                                                        <div className="detail-icon">
                                                            <i className="bi bi-clock"></i>
                                                        </div>
                                                        <div className="detail-content">
                                                            <div className="detail-label">TIME</div>
                                                            <div className="detail-value">
                                                                {event.event_start_time && event.event_end_time 
                                                                    ? `${event.event_start_time} - ${event.event_end_time}`
                                                                    : event.event_start_time || 'TBD'
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                  
                                                {/* Location */}
                                                <div className="detail-horizontal">
                                                    <div className="detail-content">
                                                        <div className="detail-value">
                                                            {event.event_location || 'Location TBD'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Buttons - Bottom Section */}
                                            <div className="event-actions-section">
                                                <button
                                                    className={`action-btn ${cancelled ? "disabled" : published ? "view-event-btn" : "complete-setup-btn"}`}
                                                >
                                                    {cancelled ? (
                                                        <>
                                                            <i className="bi bi-eye"></i> View Details
                                                        </>
                                                    ) : published ? (
                                                        <>
                                                            <i className="bi bi-eye"></i> VIEW EVENT
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="bi bi-arrow-right"></i> COMPLETE SETUP
                                                        </>
                                                    )}
                                                </button>
                                                
                                                <button
                                                    className="action-btn reserve-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        showReserveStats(event, stats);
                                                    }}
                                                    disabled={cancelled}
                                                >
                                                    <i className="bi bi-people"></i> {event.has_tickets ? 'TICKET SALES' : 'RESERVE'}
                                                </button>
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
                                <p>Create your first business event or adjust your filters to view existing events.</p>
                                <button className="cta-button" onClick={createEvent}>
                                    <i className="bi bi-plus-circle"></i> Create Event
                                </button>
                            </div>
                        )}
                    </div>

                    {/* LOAD MORE */}
                    {canLoadMore && (
                        <div className="load-more-section">
                            <button className="load-more-btn" onClick={loadMoreEvents}>
                                Load More ({filteredEvents.length - displayedEvents.length} remaining)
                                <i className="bi bi-arrow-down"></i>
                            </button>
                        </div>
                    )}
                </div>

                {/* RESERVE MODAL */}
                {showReserveModal && reserveEvent && (
                    <div className="modal-backdrop">
                        <div className="modal-container">
                            <div className="modal-header">
                                <h2><i className="bi bi-people"></i> {reserveEvent.has_tickets ? 'Ticket Sales Stats' : 'Reserve Stats'}</h2>
                                <button className="modal-close" onClick={closeReserveModal}>
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            </div>

                            <div className="modal-body">
                                <div className="reserve-modal-content">
                                    <h3 className="reserve-event-title">{reserveEvent.event_name}</h3>
                                    
                                    {reserveEvent.has_tickets ? (
                                        // Ticket Sales Stats
                                        <div className="reserve-stats-grid">
                                            {Array.isArray(reserveStats.ticketStats) && reserveStats.ticketStats.length > 0 ? reserveStats.ticketStats.map((stat, index) => (
                                                <div className="reserve-stat-card ticket-stat" key={index}>
                                                    <div className="stat-icon">
                                                        <i className="bi bi-ticket-perforated"></i>
                                                    </div>
                                                    <div className="stat-content">
                                                        <div className="stat-number">{stat.tickets_sold || 0}</div>
                                                        <div className="stat-label">{stat.ticket_type_label || 'Unknown'}</div>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="no-stats">No tickets sold yet</div>
                                            )}
                                            
                                            <div className="reserve-stat-card total">
                                                <div className="stat-icon">
                                                    <i className="bi bi-graph-up"></i>
                                                </div>
                                                <div className="stat-content">
                                                    <div className="stat-number">
                                                        {Array.isArray(reserveStats.ticketStats) ? reserveStats.ticketStats.reduce((sum, stat) => sum + (parseInt(stat.tickets_sold) || 0), 0) : 0}
                                                    </div>
                                                    <div className="stat-label">Total Tickets Sold</div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        // RSVP Stats
                                        <div className="reserve-stats-grid">
                                            <div className="reserve-stat-card confirmed">
                                                <div className="stat-icon">
                                                    <i className="bi bi-check-circle"></i>
                                                </div>
                                                <div className="stat-content">
                                                    <div className="stat-number">{reserveStats.rsvpStats?.yes || 0}</div>
                                                    <div className="stat-label">Confirmed</div>
                                                </div>
                                            </div>
                                            
                                            <div className="reserve-stat-card pending">
                                                <div className="stat-icon">
                                                    <i className="bi bi-clock"></i>
                                                </div>
                                                <div className="stat-content">
                                                    <div className="stat-number">{reserveStats.rsvpStats?.maybe || 0}</div>
                                                    <div className="stat-label">Maybe</div>
                                                </div>
                                            </div>
                                            
                                            <div className="reserve-stat-card declined">
                                                <div className="stat-icon">
                                                    <i className="bi bi-x-circle"></i>
                                                </div>
                                                <div className="stat-content">
                                                    <div className="stat-number">{reserveStats.rsvpStats?.no || 0}</div>
                                                    <div className="stat-label">Declined</div>
                                                </div>
                                            </div>
                                            
                                            <div className="reserve-stat-card total">
                                                <div className="stat-icon">
                                                    <i className="bi bi-people"></i>
                                                </div>
                                                <div className="stat-content">
                                                    <div className="stat-number">{(reserveStats.yes || 0) + (reserveStats.maybe || 0) + (reserveStats.no || 0)}</div>
                                                    <div className="stat-label">Total Responses</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-primary" onClick={closeReserveModal}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* EDIT MODAL */}
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

                {/* CANCEL MODAL */}
                {showCancelModal && (
                    <div className="modal-backdrop">
                        <div className="modal-container">
                            <div className="modal-header">
                                <h2><i className="bi bi-exclamation-triangle"></i> Cancel Event</h2>
                                <button className="modal-close" onClick={resetCancelModal}>
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            </div>

                            {!showMessageStep ? (
                                <div className="modal-body">
                                    <div className="confirmation-warning">
                                        <i className="bi bi-exclamation-circle"></i>
                                        <h3>Are you sure you want to cancel this event?</h3>
                                        <p>
                                            You are about to cancel: <strong>"{cancelEventName}"</strong>
                                        </p>

                                        <div className="rsvp-stats-summary">
                                            <h4>Current RSVP Responses:</h4>
                                            <div className="rsvp-stats">
                                                <div className="rsvp-stat yes">
                                                    <span className="stat-label">Yes:</span>
                                                    <span className="stat-value">{rsvpStats[cancelEventId]?.yes || 0}</span>
                                                </div>
                                                <div className="rsvp-stat maybe">
                                                    <span className="stat-label">Maybe:</span>
                                                    <span className="stat-value">{rsvpStats[cancelEventId]?.maybe || 0}</span>
                                                </div>
                                                <div className="rsvp-stat no">
                                                    <span className="stat-label">No:</span>
                                                    <span className="stat-value">{rsvpStats[cancelEventId]?.no || 0}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="warning-text">
                                            {affectedGuests.length > 0
                                                ? `${affectedGuests.length} guest(s) who RSVP'd Yes or Maybe will be notified.`
                                                : "No guests to notify."}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="modal-body">
                                    <div className="message-section">
                                        <h3>Send Cancellation Message</h3>
                                        <p>
                                            <strong>{affectedGuests.length}</strong> guest(s) who RSVP'd <strong>Yes</strong> or <strong>Maybe</strong> will receive this message:
                                        </p>
                                        <div className="form-group">
                                            <textarea
                                                value={cancelMessage}
                                                onChange={(e) => setCancelMessage(e.target.value)}
                                                rows={6}
                                                placeholder="Enter your cancellation message..."
                                                className="message-textarea"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="modal-actions">
                                {!showMessageStep ? (
                                    <>
                                        <button type="button" className="btn-secondary" onClick={resetCancelModal}>
                                            No, Keep Event
                                        </button>
                                        <button type="button" className="btn-warning" onClick={handleCancelConfirmation}>
                                            Yes, Cancel Event
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button type="button" className="btn-secondary" onClick={() => setShowMessageStep(false)}>
                                            Back
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-warning"
                                            onClick={performCancelWithMessage}
                                            disabled={sendingMessage}
                                        >
                                            {sendingMessage ? (
                                                <>
                                                    <div className="spinner-border spinner-border-sm me-2" role="status">
                                                        <span className="visually-hidden">Sending...</span>
                                                    </div>
                                                    Sending & Cancelling...
                                                </>
                                            ) : (
                                                "Send Message & Cancel Event"
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* DELETE MODAL */}
                {showDeleteModal && (
                    <div className="modal-backdrop">
                        <div className="modal-container">
                            <div className="modal-header">
                                <h2><i className="bi bi-trash"></i> Delete Event</h2>
                                <button className="modal-close" onClick={resetDeleteModal}>
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            </div>

                            {!showDeleteMessageStep ? (
                                <div className="modal-body">
                                    <div className="confirmation-warning">
                                        <i className="bi bi-exclamation-circle"></i>
                                        <h3>Are you sure you want to delete this event?</h3>
                                        <p>
                                            You are about to <strong>permanently delete</strong>: <strong>"{deleteEventName}"</strong>
                                        </p>

                                        <div className="rsvp-stats-summary">
                                            <h4>Current RSVP Responses:</h4>
                                            <div className="rsvp-stats">
                                                <div className="rsvp-stat yes">
                                                    <span className="stat-label">Yes:</span>
                                                    <span className="stat-value">{rsvpStats[deleteEventId]?.yes || 0}</span>
                                                </div>
                                                <div className="rsvp-stat maybe">
                                                    <span className="stat-label">Maybe:</span>
                                                    <span className="stat-value">{rsvpStats[deleteEventId]?.maybe || 0}</span>
                                                </div>
                                                <div className="rsvp-stat no">
                                                    <span className="stat-label">No:</span>
                                                    <span className="stat-value">{rsvpStats[deleteEventId]?.no || 0}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="warning-text">
                                            {affectedDeleteGuests.length > 0
                                                ? `${affectedDeleteGuests.length} guest(s) who RSVP'd Yes or Maybe will be notified.`
                                                : "No guests to notify."}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="modal-body">
                                    <div className="message-section">
                                        <h3>Send Deletion Message</h3>
                                        <p>
                                            <strong>{affectedDeleteGuests.length}</strong> guest(s) who RSVP'd <strong>Yes</strong> or <strong>Maybe</strong> will receive this message:
                                        </p>
                                        <div className="form-group">
                                            <textarea
                                                value={deleteMessage}
                                                onChange={(e) => setDeleteMessage(e.target.value)}
                                                rows={6}
                                                placeholder="Enter your deletion message..."
                                                className="message-textarea"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="modal-actions">
                                {!showDeleteMessageStep ? (
                                    <>
                                        <button type="button" className="btn-secondary" onClick={resetDeleteModal}>
                                            No, Keep Event
                                        </button>
                                        <button type="button" className="btn-danger" onClick={handleDeleteConfirmation}>
                                            Yes, Delete Event
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button type="button" className="btn-secondary" onClick={() => setShowDeleteMessageStep(false)}>
                                            Back
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-danger"
                                            onClick={performDeleteWithMessage}
                                            disabled={sendingDeleteMessage}
                                        >
                                            {sendingDeleteMessage ? (
                                                <>
                                                    <div className="spinner-border spinner-border-sm me-2" role="status">
                                                        <span className="visually-hidden">Sending...</span>
                                                    </div>
                                                    Sending & Deleting...
                                                </>
                                            ) : (
                                                "Send Message & Delete Event"
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </>
    );
};

export default BusinessDashboard;