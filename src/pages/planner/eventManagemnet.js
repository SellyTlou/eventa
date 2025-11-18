import React, { useState, useEffect, useRef } from "react";
import "./main.css";
import "../../alert.css";
import { useNavigate } from "react-router-dom";
import { logOut, DashboardHeader, DashboardSidebar } from "../components";
import RSVPBinaryTree from "../utils/RSVPTree";

const RSVPResponses = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [responseFilter, setResponseFilter] = useState("all");
    const [filteredResponses, setFilteredResponses] = useState([]);
    const [eventData, setEventData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [eventStatus, setEventStatus] = useState("");
    const [bst, setBST] = useState(null);
    const [selectedGuests, setSelectedGuests] = useState(new Set());
    const [bulkActionOpen, setBulkActionOpen] = useState(false);
    const [messageModalOpen, setMessageModalOpen] = useState(false);
    const [messageContent, setMessageContent] = useState("");
    const [messageType, setMessageType] = useState("bulk");
    const [selectedGuestForMessage, setSelectedGuestForMessage] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [alert, setAlert] = useState({ show: false, message: "", type: "" });

    const printAlert = (message, type = "info") => {
        setAlert({ show: true, message: message, type: type });
        setTimeout(() => {
            setAlert({ show: false, message: "", type: "" });
        }, 5000);
    };

    const [confirmModal, setConfirmModal] = useState({
        show: false,
        title: "",
        message: "",
        onConfirm: null,
        onCancel: null
    });

    // Custom confirmation helper
    const showConfirm = (title, message, onConfirm, onCancel) => {
        setConfirmModal({
            show: true,
            title: title,
            message: message,
            onConfirm: onConfirm,
            onCancel: onCancel || (() => setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null }))
        });
    };

    const handleConfirm = () => {
        if (confirmModal.onConfirm) {
            confirmModal.onConfirm();
        }
        setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
    };

    const handleCancel = () => {
        if (confirmModal.onCancel) {
            confirmModal.onCancel();
        }
        setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
    };

    const bulkActionRef = useRef(null);
    const navigate = useNavigate();

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
            if (bulkActionRef.current && !bulkActionRef.current.contains(event.target)) {
                setBulkActionOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const eventId = localStorage.getItem("selectedEventId");
        if (!eventId) return navigate("/eventsDashboard");
        fetchRSVPResponses(eventId);
        fetchEventStatusByID(eventId);
    }, []);

    const fetchRSVPResponses = async (eventId) => {
        setLoading(true);
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "getRSVPResponses");
            formData.append("event_id", eventId);

            const response = await fetch(`${API_URL}/query.php`, { method: "POST", body: formData });
            const data = await response.json();

            if (data.success && data.responses) {
                const tree = new RSVPBinaryTree();
                tree.bulkInsert(data.responses);
                console.log('RSVPTree built — in-order traversal:', tree.toArray());
                setBST(tree);
                setFilteredResponses(tree.toArray());
                setEventData(data.event || null);
            } else {
                setFilteredResponses([]);
                setEventData(null);
            }
        } catch (err) {
            console.error(err);
            setFilteredResponses([]);
            setEventData(null);
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

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });
            if (!response.ok) throw new Error("Network response was not ok");
            const data = await response.json();
            console.log("Event Status data:", data);
            if (data.success && data.status) {
                setEventStatus(data.status.published == 1 ? "Published" : "Unpublished");
            } else {
                setEventStatus("Unknown");
            }
        } catch (err) {
            console.error("Failed to fetch event status:", err);
            return "unknown";
        }
    }

    useEffect(() => {
        if (!bst) return;
        let results = bst.searchPartial(searchTerm);
        results = bst.filterByAttending(responseFilter).filter(r => results.includes(r));
        setFilteredResponses(results);
        setSelectedGuests(new Set());
    }, [searchTerm, responseFilter, bst]);

    const handleSort = (order) => {
        if (!bst) return;
        const sorted = bst.toArray(order).filter(r => bst.filterByAttending(responseFilter).includes(r));
        setFilteredResponses(sorted);
    };

    const toggleGuestSelection = (guestId) => {
        const newSelected = new Set(selectedGuests);
        if (newSelected.has(guestId)) {
            newSelected.delete(guestId);
        } else {
            newSelected.add(guestId);
        }
        setSelectedGuests(newSelected);
    };

    const selectAllGuests = () => {
        if (selectedGuests.size === filteredResponses.length) {
            setSelectedGuests(new Set());
        } else {
            setSelectedGuests(new Set(filteredResponses.map(guest => guest.guest_id)));
        }
    };

    const handleBulkAction = (action) => {
        if (selectedGuests.size === 0) {
            printAlert("Please select at least one guest", "warning");
            return;
        }

        switch (action) {
            case "message":
                setMessageType("bulk");
                setMessageContent("");
                setMessageModalOpen(true);
                break;
            case "remove":
                const guestCount = selectedGuests.size;
                showConfirm(
                    "Remove Guests",
                    `Are you sure you want to remove ${guestCount} guest(s)? They will receive a notification email about this change.`,
                    () => {
                        removeSelectedGuests();
                    }
                );
                break;
            default:
                break;
        }
        setBulkActionOpen(false);
    };

    const removeSelectedGuests = async () => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "removeGuests");
            formData.append("guest_ids", Array.from(selectedGuests).join(","));

            console.log("Removing guests with IDs:", Array.from(selectedGuests));

            const response = await fetch(`${API_URL}/query.php`, { method: "POST", body: formData });
            const data = await response.json();

            console.log("Remove guests response:", data);

            if (data.success) {
                printAlert(`Successfully removed ${data.deleted_count} guest(s)`, "success");

                // Refresh the data to update the table
                const eventId = localStorage.getItem("selectedEventId");
                fetchRSVPResponses(eventId);

                // Clear selection
                setSelectedGuests(new Set());
            } else {
                printAlert(`Failed to remove guests: ${data.message}`, "error");
            }
        } catch (error) {
            console.error(error);
            printAlert("Error removing guests", "error");
        }
    };

    const sendMessage = async () => {
        if (!messageContent.trim()) {
            printAlert("Please enter a message", "warning");
            return;
        }

        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const eventId = localStorage.getItem("selectedEventId");

            const formData = new FormData();
            formData.append("function", "sendGuestMessage");
            formData.append("message", messageContent);
            formData.append("API_URL", API_URL);
            formData.append("event_id", eventId);

            // Handle guest_ids properly for both bulk and individual
            let guestIds;
            if (messageType === "bulk") {
                guestIds = Array.from(selectedGuests).join(",");
            } else {
                // For individual message, ensure it's a string
                guestIds = selectedGuestForMessage.guest_id.toString();
            }

            formData.append("guest_ids", guestIds);

            console.log("Sending message with guest IDs:", guestIds);
            console.log("Message type:", messageType);
            console.log("Event ID:", eventId);

            const response = await fetch(`${API_URL}/send_message_to_guest.php`, { method: "POST", body: formData });
            const data = await response.json();

            console.log("messages response: ", data);

            if (data.success) {
                const recipientCount = messageType === "bulk" ? selectedGuests.size : 1;
                printAlert(`Message sent to ${recipientCount} guest(s)`, "success");
                setMessageModalOpen(false);
                setMessageContent("");
                setSelectedGuestForMessage(null);
            } else {
                printAlert(`Failed to send message: ${data.message}`, "error");
            }
        } catch (error) {
            console.error(error);
            printAlert("Error sending message", "error");
        }
    };

    const openIndividualMessage = (guest) => {
        setSelectedGuestForMessage(guest);
        setMessageType("individual");
        setMessageContent("");
        setMessageModalOpen(true);
    };

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const closeSidebar = () => {
        setSidebarOpen(false);
    };

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

            {/* Custom Confirmation Modal */}
            {confirmModal.show && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{confirmModal.title}</h3>
                            <button
                                className="btn-close"
                                onClick={handleCancel}
                            >
                                <i className="bi bi-x"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>{confirmModal.message}</p>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-outline"
                                onClick={handleCancel}
                            >
                                <i className="bi bi-x-circle"></i> Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleConfirm}
                            >
                                <i className="bi bi-check-circle"></i> Confirm
                            </button>
                        </div>
                    </div>
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
            <div className="dashboard-content">
                <div className="content-header">
                    <div className="header-title">
                        <h2>RSVP Responses</h2>
                        {eventData && <p className="event-subtitle">for "{eventData.event_name}"</p>}
                    </div>
                    <div className="header-actions">
                        <div className="filter-dropdown">
                            <select value={responseFilter} onChange={(e) => setResponseFilter(e.target.value)} className="filter-select">
                                <option value="all">All Responses</option>
                                <option value="yes">Attending</option>
                                <option value="no">Not Attending</option>
                                <option value="maybe">Maybe</option>
                            </select>
                        </div>
                        <div className="search-box with">
                            <i className="bi bi-search"></i>
                            <input
                                type="text"
                                placeholder="Search guests..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                        <button className="btn btn-sm btn-outline" onClick={() => handleSort("asc")}>
                            <i className="bi bi-sort-alpha-down"></i> A-Z
                        </button>
                        <button className="btn btn-sm btn-outline" onClick={() => handleSort("desc")}>
                            <i className="bi bi-sort-alpha-up"></i> Z-A
                        </button>
                    </div>
                </div>

                {/* Bulk Actions Bar */}
                {selectedGuests.size > 0 && (
                    <div className="bulk-actions-bar">
                        <div className="bulk-info">
                            <strong>{selectedGuests.size}</strong> guest(s) selected
                        </div>
                        <div ref={bulkActionRef} className="bulk-actions">
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleBulkAction("message")}
                            >
                                <i className="bi bi-envelope"></i> Send Message
                            </button>
                            <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleBulkAction("remove")}
                            >
                                <i className="bi bi-trash"></i> Remove
                            </button>
                            <button
                                className="btn btn-outline btn-sm"
                                onClick={() => setSelectedGuests(new Set())}
                            >
                                <i className="bi bi-x"></i> Clear
                            </button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="loading-container">
                        <div className="loading-overlay">
                            <div className="loading-spinner"></div>
                            <div className="loading-text">Loading...</div>
                        </div>
                    </div>
                ) : (
                    <div className="invitations-table-container">
                        <table className="invitations-table">
                            <thead>
                                <tr>
                                    <th width="50">
                                        <input
                                            type="checkbox"
                                            checked={selectedGuests.size === filteredResponses.length && filteredResponses.length > 0}
                                            onChange={selectAllGuests}
                                        />
                                    </th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Attending</th>
                                    <th>Guests</th>
                                    <th>date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredResponses.length > 0 ? filteredResponses.map((r) => {
                                    return (
                                        <tr key={r.guest_id} className={selectedGuests.has(r.guest_id) ? "selected" : ""}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedGuests.has(r.guest_id)}
                                                    onChange={() => toggleGuestSelection(r.guest_id)}
                                                />
                                            </td>
                                            <td className="guest-name">{r.name}</td>
                                            <td className="guest-email">{r.email}</td>
                                            <td>
                                                <span className={`attending-badge ${r.attending ? r.attending.toLowerCase() : ""}`}>
                                                    {r.attending}
                                                </span>
                                            </td>
                                            <td className="guest-count">{r.guest_count}</td>
                                            <td>{new Date(r.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="7" className="no-results">
                                            <i className="bi bi-inbox"></i>
                                            No RSVP responses found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Message Modal */}
            {messageModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>
                                {messageType === "bulk"
                                    ? `Send Message to ${selectedGuests.size} Guests`
                                    : `Message ${selectedGuestForMessage ? selectedGuestForMessage.name : ""}`
                                }
                            </h3>
                            <button
                                className="btn-close"
                                onClick={() => setMessageModalOpen(false)}
                            >
                                <i className="bi bi-x"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <textarea
                                value={messageContent}
                                onChange={(e) => setMessageContent(e.target.value)}
                                placeholder="Type your message here..."
                                rows="6"
                                className="message-textarea"
                            />
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-outline"
                                onClick={() => setMessageModalOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={sendMessage}
                            >
                                <i className="bi bi-send"></i> Send Message
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RSVPResponses;