// GuestInsights.js (UPDATED VERSION)
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { logOut, DashboardHeader, DashboardSidebar, DashboardTicketSidebar } from "../components";
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import './guest_insights.css';
import './main.css';    
import '../../alert.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const GuestInsights = () => {
    const [guests, setGuests] = useState([]);
    const [eventData, setEventData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState({ show: false, message: "", type: "" });
    const [user, setUser] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [selectedGuests, setSelectedGuests] = useState([]);
    const [eventStatus, setEventStatus] = useState("Unknown");
    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, guest: null });
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isTicketEvent, setIsTicketEvent] = useState(false);
    const [userPackage, setUserPackage] = useState(null); // Add package state
    
    // Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [modalGuest, setModalGuest] = useState(null);
    const [replyText, setReplyText] = useState("");

    const messagesEndRef = useRef(null);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const [messageQueue, setMessageQueue] = useState([]);

    const printAlert = (message, type = "info") => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert({ show: false, message: "", type: "" }), 4000);
    };

    const toggleDropdown = () => setDropdownOpen(prev => !prev);

    // Fetch user package - same method as TicketEventManage
    const fetchUserPackage = async () => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const userData = JSON.parse(localStorage.getItem("user"));
            
            // Get account type from user data
            const accountType = userData.account_type || userData.accountType || 'personal';
            
            const formData = new FormData();
            formData.append("function", "getUserPackage");
            formData.append("user_id", userData.user_id);
            formData.append("account_type", accountType); 

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData
            });
            const data = await response.json();
            
            console.log("User package response:", data);

            if (data.success && data.userPackage) {
                setUserPackage(data.userPackage);
            } else {
                console.log("No package found:", data.message);
                setUserPackage({ package_type: "basic" });
            }
        } catch (error) {
            console.error("Error fetching user package:", error);
            setUserPackage({ package_type: "basic" });
        }
    };

    // Get package display name - same method as TicketEventManage
    const getPackageDisplayName = () => {
        if (!userPackage) return "No Package";

        if (userPackage.package_name) {
            return userPackage.package_name;
        }

        const packageType = userPackage.package_type;
        if (!packageType) return "Basic";

        return packageType.charAt(0).toUpperCase() + packageType.slice(1);
    };

    // Get package color - same method as TicketEventManage
    const getPackageColor = () => {
        const packageType = userPackage?.package_type?.toLowerCase();

        switch (packageType) {
            case "basic":
            case "free":
                return "#6c757d";
            case "premium":
                return "#007bff";
            case "advanced":
            case "enterprise":
                return "#28a745";
            case "professional":
                return "#6610f2";
            default:
                return "#6c757d";
        }
    };

    // Fetch event status - updated to handle both ticket and regular events
    const fetchEventStatusByID = async (eventId, isTicketEvent) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            
            // Use different functions based on event type - same as TicketEventManage
            if (isTicketEvent) {
                formData.append("function", "getTicketEventStatusByID");
            } else {
                formData.append("function", "getEventStatusByID");
            }
            
            formData.append("event_id", eventId);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });
            if (!response.ok) throw new Error("Network response was not ok");
            const data = await response.json();
            console.log("Event Status data:", data);
            
            if (data.success && data.status) {
                if (isTicketEvent) {
                    const statusValue = data.status.status;
                    if (statusValue === 'published') {
                        setEventStatus("Published");
                    } else if (statusValue === 'pending') {
                        setEventStatus("Pending");
                    } else if (statusValue === 'cancelled') {
                        setEventStatus("Cancelled");
                    } else if (statusValue === 'completed') {
                        setEventStatus("Completed");
                    } else {
                        setEventStatus("Unknown");
                    }
                } else {
                    setEventStatus(data.status.published == 1 ? "Published" : "Unpublished");
                }
            } else {
                setEventStatus("Unknown");
            }
        } catch (err) {
            console.error("Failed to fetch event status:", err);
            setEventStatus("Unknown");
        }
    };

    // Fetch event data - updated to properly detect ticket events
    const fetchEventData = async (eventId) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "getEventById");
            formData.append("event_id", eventId);
            const res = await fetch(`${API_URL}/query.php`, { method: "POST", body: formData });
            const data = await res.json();
            if (data.success) {
                // Check the correct data structure - it might be data.events[0] or data.event
                const event = data.events?.[0] || data.event;
                if (event) {
                    // Check for ticket event - same logic as TicketEventManage
                    const hasTickets = event.has_tickets === 1 || event.has_tickets === true || event.has_tickets === "1";
                    setIsTicketEvent(hasTickets);
                    setEventData(event);
                    
                    // Also fetch event status with the correct type
                    await fetchEventStatusByID(eventId, hasTickets);
                }
            } 
        } catch (err) { 
            console.error("Error fetching event data:", err); 
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
        setUser(JSON.parse(storedUser));
        
        // Fetch user package - same as TicketEventManage
        fetchUserPackage();

        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const eventId = localStorage.getItem("selectedEventId");
        if (!eventId) {
            printAlert("No event selected", "warning");
            const storedUser = localStorage.getItem('user');
            const user = storedUser ? JSON.parse(storedUser) : null;
            const dashPath = user?.account_type === 'business' ? '/businessdashboard' : '/eventsDashboard';
            navigate(dashPath);
            return;
        }
        fetchEventData(eventId);
        fetchGuestInsights(eventId);
    }, [navigate]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchGuestInsights = async (eventId) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "getGuestInsights");
            formData.append("event_id", eventId);

            const res = await fetch(`${API_URL}/query.php`, { method: "POST", body: formData });
            if (!res.ok) return printAlert(`Server error: ${res.status}`, "error");

            const data = await res.json();

            if (data.success && data.guests) {
                const processed = data.guests.map(g => {
                    const thread = [];

                    // Guest messages
                    if (g.guest_message) {
                        g.guest_message.split('\n\n').forEach(m => {
                            if (m.includes('[Guest]:')) {
                                const text = m.replace(/^\[Guest\]: (.+) \| .+$/, '$1');
                                const time = m.replace(/^.+ \| (.+)$/, '$1');
                                thread.push({ text, time, sender: 'guest' });
                            }
                        });
                    }

                    // Organizer replies
                    if (g.reply) {
                        g.reply.split('\n\n').forEach(m => {
                            if (m.includes('[Organizer]:')) {
                                const text = m.replace(/^\[Organizer\]: (.+) \| .+$/, '$1');
                                const time = m.replace(/^.+ \| (.+)$/, '$1');
                                thread.push({ text, time, sender: 'organizer' });
                            }
                        });
                    }

                    // Sort chronologically
                    thread.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

                    // Last sender
                    const lastMessage = thread.length ? thread[thread.length - 1] : null;
                    const lastSender = lastMessage?.sender ?? null;

                    // Unread = guest sent last message
                    const has_unread = lastSender === 'guest';

                    return { ...g, thread, has_unread, lastSender };
                });

                const unreplied = processed.filter(g => g.has_unread);
                const replied = processed.filter(g => g.lastSender === 'organizer' && g.guest_message);
                const noMsg = processed.filter(g => !g.guest_message);

                const finalOrder = [...unreplied, ...replied, ...noMsg];
                setMessageQueue(finalOrder);
                setGuests(finalOrder);
            }
        } catch (err) {
            printAlert("Network error", "error");
        } finally {
            setLoading(false);
        }
    };

    const sendReply = async () => {
        if (!replyText.trim() || !modalGuest?.msg_id) return;

        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "organizerReplyToGuest");
            formData.append("msg_id", modalGuest.msg_id);
            formData.append("reply", replyText.trim());

            const res = await fetch(`${API_URL}/query.php`, { method: "POST", body: formData });
            const result = await res.json();

            if (result.success) {
                const now = new Date();
                const newMsg = {
                    text: replyText.trim(),
                    time: now.toISOString(),
                    sender: 'organizer'
                };

                const updatedGuest = {
                    ...modalGuest,
                    thread: [...modalGuest.thread, newMsg],
                    reply: `[Organizer]: ${replyText.trim()} | ${now.toISOString()}`,
                    replied_at: now.toISOString(),
                    has_unread: false,
                    lastSender: 'organizer'
                };

                const updated = guests.map(g => g.msg_id === modalGuest.msg_id ? updatedGuest : g);
                setGuests(updated);
                setMessageQueue(updated);
                setModalGuest(updatedGuest);
                setReplyText("");
                printAlert("Reply sent!", "success");

                // Scroll to the new message
                setTimeout(scrollToBottom, 100);
            } else {
                printAlert(result.message || "Failed", "error");
            }
        } catch (err) {
            printAlert("Network error", "error");
        }
    };

    const deleteGuest = async (guestId) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "deleteGuest");
            formData.append("guest_id", guestId);
            const res = await fetch(`${API_URL}/query.php`, { method: "POST", body: formData });
            const result = await res.json();
            return result.success;
        } catch (err) {
            printAlert("Network error", "error");
            return false;
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm.guest) return;
        const success = await deleteGuest(deleteConfirm.guest.guest_id);
        if (success) {
            const updated = messageQueue.filter(g => g.guest_id !== deleteConfirm.guest.guest_id);
            setMessageQueue(updated);
            setGuests(updated);
            printAlert("Guest deleted successfully", "success");
        } else {
            printAlert("Failed to delete guest", "error");
        }
        setDeleteConfirm({ show: false, guest: null });
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedGuests.length} guest(s)?`)) return;
        const formData = new FormData();
        formData.append("function", "removeGuests");
        formData.append("guest_ids", selectedGuests.join(","));

        try {
            const res = await fetch(`${process.env.REACT_APP_API_URL}/query.php`, { method: "POST", body: formData });
            const result = await res.json();
            if (result.success) {
                printAlert(`Deleted ${result.deleted_count} guests`, "success");
                const updated = messageQueue.filter(g => !selectedGuests.includes(g.guest_id));
                setMessageQueue(updated);
                setGuests(updated);
                setSelectedGuests([]);
            } else {
                printAlert(result.message || "Failed", "error");
            }
        } catch (err) {
            printAlert("Network error", "error");
        }
    };

    const openModal = (guest) => {
        setModalGuest(guest);
        setReplyText("");
        setModalOpen(true);

        // Mark as read (remove badge)
        if (guest.has_unread) {
            const updated = messageQueue.map(g =>
                g.guest_id === guest.guest_id ? { ...g, has_unread: false } : g
            );
            setMessageQueue(updated);
            setGuests(updated);
        }

        // Scroll after render
        setTimeout(scrollToBottom, 100);
    };

    const closeModal = () => {
        setModalOpen(false);
        setModalGuest(null);
        setReplyText("");
    };

    const filteredGuests = messageQueue.filter(g => {
        const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === "all" || g.attending.toLowerCase() === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const stats = {
        total: filteredGuests.length,
        yes: filteredGuests.filter(g => g.attending.toLowerCase() === 'yes').length,
        no: filteredGuests.filter(g => g.attending.toLowerCase() === 'no').length,
        maybe: filteredGuests.filter(g => g.attending.toLowerCase() === 'maybe').length,
        questions: filteredGuests.filter(g => g.guest_message).length
    };

    const pieData = {
        labels: ['Yes', 'No', 'Maybe'],
        datasets: [{
            data: [stats.yes, stats.no, stats.maybe],
            backgroundColor: ['#48bb78', '#f56565', '#ed8936'],
            borderWidth: 1,
            borderColor: '#fff'
        }]
    };
    const pieOptions = { responsive: true, plugins: { legend: { position: 'bottom' } } };

    const toggleSelect = (guestId) => {
        setSelectedGuests(prev =>
            prev.includes(guestId) ? prev.filter(x => x !== guestId) : [...prev, guestId]
        );
    };
    
    const selectAll = () => {
        if (selectedGuests.length === filteredGuests.length) {
            setSelectedGuests([]);
        } else {
            setSelectedGuests(filteredGuests.map(g => g.guest_id));
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
                <p>Loading guest insights...</p>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            {alert.show && (
                <div className={`custom-alert ${alert.type}`}>
                    <i className={`fas ${alert.type === "error" ? "fa-times-circle" : alert.type === "success" ? "fa-check-circle" : "fa-info-circle"}`}></i>
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
                        {isTicketEvent ? (
                            <DashboardTicketSidebar
                                isMobileOpen={sidebarOpen}
                                onClose={closeSidebar}
                            />
                        ) : (
                            <DashboardSidebar
                                isMobileOpen={sidebarOpen}
                                onClose={closeSidebar}
                            />
                        )}
            {/* MAIN CONTENT - Added event-type class and package badge */}
            <div className={`guest-insights-content ${isTicketEvent ? 'ticket-event' : 'rsvp-event'}`}>
                <div className="content-header">
                    <h1>Guest Insights</h1>
                    <p>View guest questions, respond, and manage engagement</p>
                    {/* Package badge - same as TicketEventManage */}
                    {userPackage && (
                        <span
                            className="package-badge"
                            style={{ backgroundColor: getPackageColor(), marginLeft: '1rem' }}
                        >
                            <i className="bi bi-shield-check"></i> {getPackageDisplayName()} Package
                        </span>
                    )}
                </div>

                <div className="insights-summary">
                    <div className="summary-card">
                        <i className="bi bi-people"></i>
                        <h3>{stats.total}</h3>
                        <p>Total RSVPs</p>
                    </div>
                    <div className="summary-card">
                        <i className="bi bi-chat-dots"></i>
                        <h3>{stats.questions}</h3>
                        <p>Guest Questions</p>
                    </div>
                    <div className="summary-card chart">
                        <Pie data={pieData} options={pieOptions} />
                        <p>Response Breakdown</p>
                    </div>
                </div>

                <div className="filters-bar">
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
                        <option value="all">All Responses</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                        <option value="maybe">Maybe</option>
                    </select>
                    <button className="bulk-action-btn" disabled={!selectedGuests.length}>
                        Actions ({selectedGuests.length})
                    </button>
                </div>

                {selectedGuests.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                        <button onClick={handleBulkDelete} className="bulk-delete-btn">
                            <i className="bi bi-trash"></i> Delete Selected ({selectedGuests.length})
                        </button>
                    </div>
                )}

                <div className="guest-table-container">
                    <table className="guest-table">
                        <thead>
                            <tr>
                                <th><input type="checkbox" onChange={selectAll} checked={selectedGuests.length === filteredGuests.length && filteredGuests.length > 0} /></th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Guests</th>
                                <th>Guest Message</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredGuests.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#718096' }}>
                                        No guests found
                                    </td>
                                </tr>
                            ) : (
                                filteredGuests.map(g => {
                                    const latestText = g.thread?.[0]?.text ?? '';
                                    const truncated = latestText.length > 50 ? latestText.substring(0, 50) + "..." : latestText;

                                    return (
                                        <tr key={`${g.guest_id}-${g.event_id}`}>
                                            <td><input type="checkbox" checked={selectedGuests.includes(g.guest_id)} onChange={() => toggleSelect(g.guest_id)} /></td>
                                            <td>
                                                {g.name}
                                                {g.has_unread && <span className="unread-badge">1</span>}
                                            </td>
                                            <td><a href={`mailto:${g.email}`} className="email-link">{g.email}</a></td>
                                            <td>
                                                <span className={`status-badge ${g.attending.toLowerCase()}`}>
                                                    {g.attending}
                                                </span>
                                            </td>
                                            <td>{g.guest_count}</td>
                                            <td className="message-cell">
                                                {g.thread?.length ? (
                                                    <span
                                                        className="truncated-message"
                                                        onClick={() => openModal(g)}
                                                        style={{ cursor: 'pointer', color: '#667eea' }}
                                                        title="Click to view full chat"
                                                    >
                                                        {truncated}
                                                    </span>
                                                ) : "-"}
                                            </td>
                                            <td className="action-cell">
                                                {g.guest_message && (
                                                    <button
                                                        className="action-btn"
                                                        onClick={() => openModal(g)}
                                                        title={g.lastSender === 'guest' ? "Reply" : "View Chat"}
                                                    >
                                                        {g.lastSender === 'guest' ? "Reply" : "View"}
                                                    </button>
                                                )}
                                                <button
                                                    className="delete-btn"
                                                    onClick={() => setDeleteConfirm({ show: true, guest: g })}
                                                    title="Delete guest"
                                                >
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* DELETE CONFIRM */}
            {deleteConfirm.show && (
                <div className="modal-overlay" onClick={() => setDeleteConfirm({ show: false, guest: null })}>
                    <div className="modal-content confirm-delete" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Delete Guest?</h3>
                            <button className="modal-close" onClick={() => setDeleteConfirm({ show: false, guest: null })}>×</button>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to delete <strong>{deleteConfirm.guest?.name}</strong>?</p>
                            <p className="text-sm text-gray-600">This will remove their RSVP and message.</p>
                            <div className="modal-actions">
                                <button onClick={handleDelete} className="delete-confirm-btn">Delete</button>
                                <button onClick={() => setDeleteConfirm({ show: false, guest: null })} className="cancel-reply">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CHAT MODAL – AUTO-SCROLL + REPLY ONLY WHEN GUEST LAST */}
            {modalOpen && modalGuest && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content chat-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Chat with {modalGuest.name}</h3>
                            <button className="modal-close" onClick={closeModal}>×</button>
                        </div>

                        <div className="chat-messages">
                            {modalGuest.thread?.map((msg, i, arr) => {
                                const prevSender = i > 0 ? arr[i - 1].sender : null;
                                const isSame = prevSender === msg.sender;
                                return (
                                    <div
                                        key={i}
                                        className={`message-bubble ${msg.sender === 'guest' ? 'guest' : 'organizer'}`}
                                        style={{ marginTop: isSame ? '2px' : '12px' }}
                                    >
                                        <div className="message-text">{msg.text}</div>
                                        <div className="message-time">
                                            {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Invisible anchor for scrolling */}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* REPLY INPUT – ONLY WHEN GUEST SENT LAST */}
                        {modalGuest.lastSender === 'guest' && (
                            <div className="reply-input-area">
                                <textarea
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    placeholder="Type your reply..."
                                    rows={3}
                                />
                                <button
                                    onClick={sendReply}
                                    className="send-reply-btn"
                                    disabled={!replyText.trim()}
                                >
                                    Send
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GuestInsights;