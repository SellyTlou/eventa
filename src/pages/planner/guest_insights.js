import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { logOut } from "../components";
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import './guest_insights.css';
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
    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, guest: null });

    // Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [modalGuest, setModalGuest] = useState(null);
    const [replyText, setReplyText] = useState("");

    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    // Queue (array)
    const [messageQueue, setMessageQueue] = useState([]);

    const printAlert = (message, type = "info") => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert({ show: false, message: "", type: "" }), 4000);
    };

    const toggleDropdown = () => setDropdownOpen(prev => !prev);

    // --- USER & CLICK OUTSIDE ---
    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) return logOut();
        setUser(JSON.parse(storedUser));

        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- FETCH EVENT & GUESTS ---
    useEffect(() => {
        const eventId = localStorage.getItem("selectedEventId");
        if (!eventId) {
            printAlert("No event selected", "warning");
            navigate("/eventsDashboard");
            return;
        }
        fetchEventData(eventId);
        fetchGuestInsights(eventId);
    }, [navigate]);

    const fetchEventData = async (eventId) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "getEventById");
            formData.append("event_id", eventId);
            const res = await fetch(`${API_URL}/query.php`, { method: "POST", body: formData });
            const data = await res.json();
            if (data.success) setEventData(data.event);
        } catch (err) { console.error(err); }
    };

    const fetchGuestInsights = async (eventId) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            if (!API_URL) {
                printAlert("REACT_APP_API_URL not set in .env", "error");
                return;
            }

            const formData = new FormData();
            formData.append("function", "getGuestInsights");
            formData.append("event_id", eventId);

            const res = await fetch(`${API_URL}/query.php`, { method: "POST", body: formData });

            if (!res.ok) {
                const text = await res.text();
                console.error("HTTP Error:", res.status, text);
                printAlert(`Server error: ${res.status}`, "error");
                return;
            }

            const data = await res.json();

            if (data.success && data.guests) {
                const guestsWithMsg = data.guests.filter(g => g.guest_message);
                const guestsWithoutMsg = data.guests.filter(g => !g.guest_message);

                const unreplied = guestsWithMsg
                    .filter(g => !g.reply)
                    .sort((a, b) => new Date(a.message_created_at) - new Date(b.message_created_at));

                const replied = guestsWithMsg
                    .filter(g => g.reply)
                    .sort((a, b) => new Date(b.replied_at) - new Date(a.replied_at));

                const finalOrder = [...unreplied, ...replied, ...guestsWithoutMsg];

                setMessageQueue(finalOrder);
                setGuests(finalOrder);
            } else {
                printAlert(data.message || "No data returned", "error");
            }
        } catch (err) {
            console.error("Fetch error:", err);
            printAlert("Network error: Check console", "error");
        } finally {
            setLoading(false);
        }
    };

    // --- SEND REPLY ---
    const sendReply = async () => {
        if (!replyText.trim()) return;
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "replyToGuestMessage");
            formData.append("msg_id", modalGuest.msg_id);
            formData.append("reply", replyText);

            const res = await fetch(`${API_URL}/query.php`, { method: "POST", body: formData });
            const result = await res.json();

            if (result.success) {
                const now = new Date().toISOString();
                const updatedGuest = { ...modalGuest, reply: replyText, replied_at: now };

                const updatedQueue = messageQueue.filter(g => g.msg_id !== modalGuest.msg_id);
                updatedQueue.push(updatedGuest);

                setMessageQueue(updatedQueue);
                setGuests(updatedQueue);

                setModalOpen(false);
                setReplyText("");
                printAlert("Reply sent! Moved to end.", "success");
            } else {
                printAlert(result.message || "Failed to send", "error");
            }
        } catch (err) {
            printAlert("Failed to send reply", "error");
        }
    };

    // --- DELETE GUEST ---
    const deleteGuest = async (guestId) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "deleteGuest");
            formData.append("guest_id", guestId);

            const res = await fetch(`${API_URL}/query.php`, { method: "POST", body: formData });
            const result = await res.json();

            if (result.success) {
                printAlert("Guest deleted", "success");
                return true;
            } else {
                printAlert(result.message || "Failed to delete", "error");
                return false;
            }
        } catch (err) {
            printAlert("Network error", "error");
            return false;
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm.guest) return;

        const success = await deleteGuest(deleteConfirm.guest.guest_id);
        if (success) {
            const updatedQueue = messageQueue.filter(g => g.guest_id !== deleteConfirm.guest.guest_id);
            setMessageQueue(updatedQueue);
            setGuests(updatedQueue);
        }

        setDeleteConfirm({ show: false, guest: null });
    };

    // --- BULK DELETE ---
    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedGuests.length} guest(s)?`)) return;

        const formData = new FormData();
        formData.append("function", "removeGuests");
        formData.append("guest_ids", selectedGuests.join(","));

        try {
            const res = await fetch(`${process.env.REACT_APP_API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });
            const result = await res.json();

            if (result.success) {
                printAlert(`Deleted ${result.deleted_count} guest(s)`, "success");
                const updated = messageQueue.filter(g => !selectedGuests.includes(g.guest_id));
                setMessageQueue(updated);
                setGuests(updated);
                setSelectedGuests([]);
            } else {
                printAlert(result.message || "Bulk delete failed", "error");
            }
        } catch (err) {
            printAlert("Network error", "error");
        }
    };

    // --- MODAL ---
    const openModal = (guest) => {
        setModalGuest(guest);
        setReplyText(guest.reply || "");
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setModalGuest(null);
        setReplyText("");
    };

    // --- FILTER & STATS ---
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

    // --- SELECTION ---
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

    // --- NAVIGATION ---
    const goToHome = () => navigate("/eventsDashboard");
    const goToManage = () => navigate("/manage_my_event");
    const goToInvitations = () => navigate("/invitationPage");
    const goToRSVPResponses = () => navigate("/eventManagement");
    const goToAttendanceStats = () => navigate("/attendance_stats");
    const goToProfile = () => navigate("/Profile");

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
            {/* ALERT */}
            {alert.show && (
                <div className={`custom-alert ${alert.type}`}>
                    <i className={`fas ${alert.type === "error" ? "fa-times-circle" : alert.type === "success" ? "fa-check-circle" : "fa-info-circle"}`}></i>
                    <span>{alert.message}</span>
                </div>
            )}

            {/* HEADER */}
            <div className="dashboard-header">
                <h1>Evenda</h1>
                <div className="header-tabs">
                    <button className="upgrade-btn">Upgrade</button>
                    <button className="status-btn status-success">Published</button>
                    <div ref={dropdownRef} className={`profile-container ${dropdownOpen ? "open" : ""}`} onClick={toggleDropdown}>
                        <i className="bi bi-person-circle"></i>
                        <span>{user?.name || "Guest"}</span>
                        <i className="bi bi-chevron-bar-down"></i>
                        {dropdownOpen && (
                            <div className="dropdown-menu show">
                                <button className="dropdown-item" onClick={goToProfile}><i className="bi bi-person"></i>Profile</button>
                                <button className="dropdown-item"><i className="bi bi-gear"></i>Settings</button>
                                <button className="dropdown-item" onClick={logOut}><i className="bi bi-box-arrow-right"></i>Logout</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* SIDEBAR */}
            <div className="dashboard-sidebar">
                <div className="sidebar-header"><h3>Event Management</h3></div>
                <div className="sidebar-section">
                    <h4>Event Planning</h4>
                    <ul>
                        <li onClick={goToHome}><i className="bi bi-house"></i>Dashboard</li>
                        <li onClick={goToManage}><i className="bi bi-megaphone"></i>Publish Event</li>
                        <li onClick={goToInvitations}><i className="bi bi-send"></i>Send Invitations</li>
                        <li onClick={goToRSVPResponses}><i className="bi bi-list-check"></i>RSVP Responses</li>
                    </ul>
                </div>
                <div className="sidebar-section">
                    <h4>Event Analytics</h4>
                    <ul>
                        <li onClick={goToAttendanceStats}><i className="bi bi-graph-up"></i>Attendance Stats</li>
                        <li className="active"><i className="bi bi-people"></i>Guest Insights</li>
                        <li><i className="bi bi-calendar-check"></i>Event Performance</li>
                    </ul>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="guest-insights-content">
                <div className="content-header">
                    <h1>Guest Insights</h1>
                    <p>View guest questions, respond, and manage engagement</p>
                </div>

                {/* SUMMARY CARDS */}
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

                {/* FILTERS + BULK DELETE */}
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

                {/* BULK DELETE BUTTON */}
                {selectedGuests.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                        <button onClick={handleBulkDelete} className="bulk-delete-btn">
                            <i className="bi bi-trash"></i> Delete Selected ({selectedGuests.length})
                        </button>
                    </div>
                )}

                {/* TABLE */}
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
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#718096' }}>
                                        No guests found
                                    </td>
                                </tr>
                            ) : (
                                filteredGuests.map(g => {
                                    const truncated = g.guest_message
                                        ? g.guest_message.length > 50
                                            ? g.guest_message.substring(0, 50) + "..."
                                            : g.guest_message
                                        : "-";

                                    return (
                                        <tr key={`${g.guest_id}-${g.event_id}`}>
                                            <td><input type="checkbox" checked={selectedGuests.includes(g.guest_id)} onChange={() => toggleSelect(g.guest_id)} /></td>
                                            <td>{g.name}</td>
                                            <td><a href={`mailto:${g.email}`} className="email-link">{g.email}</a></td>
                                            <td>
                                                <span className={`status-badge ${g.attending.toLowerCase()}`}>
                                                    {g.attending}
                                                </span>
                                            </td>
                                            <td>{g.guest_count}</td>
                                            <td className="message-cell">
                                                {g.guest_message ? (
                                                    <span
                                                        className="truncated-message"
                                                        onClick={() => openModal(g)}
                                                        style={{ cursor: 'pointer', color: '#667eea' }}
                                                        title="Click to view full message"
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
                                                        title={g.reply ? "View Reply" : "Reply"}
                                                    >
                                                        {g.reply ? "View" : "Reply"}
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

            {/* DELETE CONFIRM MODAL */}
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

            {/* REPLY MODAL */}
            {modalOpen && modalGuest && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Guest Message</h3>
                            <button className="modal-close" onClick={closeModal}>×</button>
                        </div>
                        <div className="modal-body">
                            <p><strong>From:</strong> {modalGuest.name} ({modalGuest.email})</p>
                            <div className="message-box">
                                <p><strong>Question:</strong></p>
                                <p style={{ whiteSpace: 'pre-wrap', margin: '0.5rem 0' }}>{modalGuest.guest_message}</p>
                            </div>
                            {modalGuest.reply && (
                                <div className="reply-box">
                                    <p><strong>Your Reply:</strong></p>
                                    <p style={{
                                        whiteSpace: 'pre-wrap',
                                        margin: '0.5rem 0',
                                        background: '#f8f9fa',
                                        padding: '0.75rem',
                                        borderRadius: '0.375rem'
                                    }}>
                                        {modalGuest.reply}
                                    </p>
                                </div>
                            )}
                            {!modalGuest.reply && (
                                <div className="reply-input">
                                    <textarea
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        placeholder="Type your reply here..."
                                        rows="4"
                                    />
                                    <div className="modal-actions">
                                        <button onClick={sendReply} className="send-reply">Send Reply</button>
                                        <button onClick={closeModal} className="cancel-reply">Cancel</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GuestInsights;