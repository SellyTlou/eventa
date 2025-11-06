import React, { useState, useEffect, useRef } from "react";
import "./main.css";
import "../../alert.css";
import { useNavigate } from "react-router-dom";
import { logOut } from "../components";
import RSVPBinaryTree from "../utils/RSVPTree";

const RSVPResponses = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [responseFilter, setResponseFilter] = useState("all");
    const [filteredResponses, setFilteredResponses] = useState([]);
    const [eventData, setEventData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [eventStatus, setEventStatus] = useState("");
    const [bst, setBST] = useState(null);
    const [selectedGuests, setSelectedGuests] = useState(new Set());
    const [bulkActionOpen, setBulkActionOpen] = useState(false);
    const [messageModalOpen, setMessageModalOpen] = useState(false);
    const [messageContent, setMessageContent] = useState("");
    const [messageType, setMessageType] = useState("bulk");
    const [selectedGuestForMessage, setSelectedGuestForMessage] = useState(null);

    const [alert, setAlert] = useState({ show: false, message: "", type: "" });

    const printAlert = (message, type) => {
        if (type === void 0) { type = "info"; }
        setAlert({ show: true, message: message, type: type });
        setTimeout(function () {
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
    var showConfirm = function (title, message, onConfirm, onCancel) {
        setConfirmModal({
            show: true,
            title: title,
            message: message,
            onConfirm: onConfirm,
            onCancel: onCancel || function () { setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null }); }
        });
    };

    var handleConfirm = function () {
        if (confirmModal.onConfirm) {
            confirmModal.onConfirm();
        }
        setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
    };

    var handleCancel = function () {
        if (confirmModal.onCancel) {
            confirmModal.onCancel();
        }
        setConfirmModal({ show: false, title: "", message: "", onConfirm: null, onCancel: null });
    };

    const dropdownRef = useRef(null);
    const bulkActionRef = useRef(null);
    const navigate = useNavigate();

    useEffect(function () {
        var storedUser = localStorage.getItem("user");
        if (!storedUser) {
            printAlert("Session expired. Please log in again.", "error");
            logOut();
            navigate("/");
            return;
        }
        setUser(JSON.parse(storedUser));

        var handleClickOutside = function (event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
            if (bulkActionRef.current && !bulkActionRef.current.contains(event.target)) {
                setBulkActionOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return function () { return document.removeEventListener("mousedown", handleClickOutside); };
    }, []);

    useEffect(function () {
        var eventId = localStorage.getItem("selectedEventId");
        if (!eventId) return navigate("/eventsDashboard");
        fetchRSVPResponses(eventId);
        fetchEventStatusByID(eventId);
    }, []);

    var fetchRSVPResponses = async function (eventId) {
        setLoading(true);
        try {
            var API_URL = process.env.REACT_APP_API_URL;
            var formData = new FormData();
            formData.append("function", "getRSVPResponses");
            formData.append("event_id", eventId);

            var response = await fetch(API_URL + "/query.php", { method: "POST", body: formData });
            var data = await response.json();

            if (data.success && data.responses) {
                var tree = new RSVPBinaryTree();
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
    useEffect(function () {
        if (!bst) return;
        var results = bst.searchPartial(searchTerm);
        results = bst.filterByAttending(responseFilter).filter(function (r) { return results.includes(r); });
        setFilteredResponses(results);
        setSelectedGuests(new Set());
    }, [searchTerm, responseFilter, bst]);

    var handleSort = function (order) {
        if (!bst) return;
        var sorted = bst.toArray(order).filter(function (r) { return bst.filterByAttending(responseFilter).includes(r); });
        setFilteredResponses(sorted);
    };

    var toggleGuestSelection = function (guestId) {
        var newSelected = new Set(selectedGuests);
        if (newSelected.has(guestId)) {
            newSelected.delete(guestId);
        } else {
            newSelected.add(guestId);
        }
        setSelectedGuests(newSelected);
    };

    var selectAllGuests = function () {
        if (selectedGuests.size === filteredResponses.length) {
            setSelectedGuests(new Set());
        } else {
            setSelectedGuests(new Set(filteredResponses.map(function (guest) { return guest.guest_id; })));
        }
    };

    var handleBulkAction = function (action) {
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
                var guestCount = selectedGuests.size;
                showConfirm(
                    "Remove Guests",
                    "Are you sure you want to remove " + guestCount + " guest(s)? They will receive a notification email about this change.",
                    function () {
                        removeSelectedGuests();
                    }
                );
                break;
            default:
                break;
        }
        setBulkActionOpen(false);
    };


    var removeSelectedGuests = async function () {
        try {
            var API_URL = process.env.REACT_APP_API_URL;
            var formData = new FormData();
            formData.append("function", "removeGuests");
            formData.append("guest_ids", Array.from(selectedGuests).join(","));

            console.log("Removing guests with IDs:", Array.from(selectedGuests));

            var response = await fetch(API_URL + "/query.php", { method: "POST", body: formData });
            var data = await response.json();

            console.log("Remove guests response:", data);

            if (data.success) {
                printAlert("Successfully removed " + data.deleted_count + " guest(s)", "success");

                // Refresh the data to update the table
                var eventId = localStorage.getItem("selectedEventId");
                fetchRSVPResponses(eventId);

                // Clear selection
                setSelectedGuests(new Set());
            } else {
                printAlert("Failed to remove guests: " + data.message, "error");
            }
        } catch (error) {
            console.error(error);
            printAlert("Error removing guests", "error");
        }
    };

    var sendMessage = async function () {
        if (!messageContent.trim()) {
            printAlert("Please enter a message", "warning");
            return;
        }

        try {
            var API_URL = process.env.REACT_APP_API_URL;
            var eventId = localStorage.getItem("selectedEventId");

            var formData = new FormData();
            formData.append("function", "sendGuestMessage");
            formData.append("message", messageContent);
            formData.append("API_URL", API_URL); 
            formData.append("event_id", eventId);

            // Handle guest_ids properly for both bulk and individual
            var guestIds;
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

            var response = await fetch(API_URL + "/send_message_to_guest.php", { method: "POST", body: formData });
            var data = await response.json();

            console.log("messages response: ", data);

            if (data.success) {
                var recipientCount = messageType === "bulk" ? selectedGuests.size : 1;
                printAlert("Message sent to " + recipientCount + " guest(s)", "success");
                setMessageModalOpen(false);
                setMessageContent("");
                setSelectedGuestForMessage(null);
            } else {
                printAlert("Failed to send message: " + data.message, "error");
            }
        } catch (error) {
            console.error(error);
            printAlert("Error sending message", "error");
        }
    };
    
    var openIndividualMessage = function (guest) {
        setSelectedGuestForMessage(guest);
        setMessageType("individual");
        setMessageContent("");
        setMessageModalOpen(true);
    };

    var toggleDropdown = function () { return setDropdownOpen(function (prev) { return !prev; }); };
    var goToHome = function () { return navigate("/eventsDashboard"); };
    var goToEventManagement = function () { return navigate("/eventManagement"); };
    var goToInvitations = function () { return navigate("/invitationPage"); };
    var goToManage = function () { return navigate("/manage_my_event"); };
    var goToProfile = function () { return navigate("/Profile"); };
    var goToGuest = function () { return navigate("/guest_insights"); };
    var goToAttendanceStats = function () { return navigate("/attendance_stats"); };

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
            <div className="dashboard-header">
                <h1>Evenda</h1>
                <div className="header-tabs">
                    <button className={`status-btn status-${eventStatus.toLowerCase()}`}>{eventStatus}</button>
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
                        <li className="active"  onClick={goToEventManagement}><i className="bi bi-list-check"></i>RSVP Responses</li>
                    </ul>
                </div>
                <div className="sidebar-section">
                    <h4>Event Analytics</h4>
                    <ul>
                        <li onClick={goToAttendanceStats}><i className="bi bi-graph-up"></i>Attendance Stats</li>
                        <li onClick={goToGuest}><i className="bi bi-people"></i>Guest Insights</li>
                    </ul>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="dashboard-content">
                <div className="content-header">
                    <div className="header-title">
                        <h2>RSVP Responses</h2>
                        {eventData && <p className="event-subtitle">for "{eventData.event_name}"</p>}
                    </div>
                    <div className="header-actions">
                        <div className="filter-dropdown">
                            <select value={responseFilter} onChange={function (e) { return setResponseFilter(e.target.value); }} className="filter-select">
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
                                onChange={function (e) { return setSearchTerm(e.target.value); }}
                                className="search-input"
                            />
                        </div>
                        <button className="btn btn-sm btn-outline" onClick={function () { return handleSort("asc"); }}>
                            <i className="bi bi-sort-alpha-down"></i> A-Z
                        </button>
                        <button className="btn btn-sm btn-outline" onClick={function () { return handleSort("desc"); }}>
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
                                onClick={function () { return handleBulkAction("message"); }}
                            >
                                <i className="bi bi-envelope"></i> Send Message
                            </button>
                            <button
                                className="btn btn-danger btn-sm"
                                onClick={function () { return handleBulkAction("remove"); }}
                            >
                                <i className="bi bi-trash"></i> Remove
                            </button>
                            <button
                                className="btn btn-outline btn-sm"
                                onClick={function () { return setSelectedGuests(new Set()); }}
                            >
                                <i className="bi bi-x"></i> Clear
                            </button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="loading-container">
                        <div className="spinner-border text-info" role="status">
                            <span className="visually-hidden">Loading...</span>
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
                                    {/* <th width="120">Actions</th> */}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredResponses.length > 0 ? filteredResponses.map(function (r) {
                                    return (
                                        <tr key={r.guest_id} className={selectedGuests.has(r.guest_id) ? "selected" : ""}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedGuests.has(r.guest_id)}
                                                    onChange={function () { return toggleGuestSelection(r.guest_id); }}
                                                />
                                            </td>
                                            <td className="guest-name">{r.name}</td>
                                            <td className="guest-email">{r.email}</td>
                                            <td>
                                                <span className={"attending-badge " + (r.attending ? r.attending.toLowerCase() : "")}>
                                                    {r.attending}
                                                </span>
                                            </td>
                                            <td className="guest-count">{r.guest_count}</td>
                                            <td>{new Date(r.created_at).toLocaleDateString()}</td>
                                            {/* <td>
                                                <div className="action-buttons">
                                                    <button
                                                        className="btn-icon btn-message"
                                                        onClick={function () { return openIndividualMessage(r); }}
                                                        title="Send message"
                                                    >
                                                        <i className="bi bi-envelope"></i>
                                                    </button>
                                                </div>
                                            </td> */}
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
                                    ? "Send Message to " + selectedGuests.size + " Guests"
                                    : "Message " + (selectedGuestForMessage ? selectedGuestForMessage.name : "")
                                }
                            </h3>
                            <button
                                className="btn-close"
                                onClick={function () { return setMessageModalOpen(false); }}
                            >
                                <i className="bi bi-x"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <textarea
                                value={messageContent}
                                onChange={function (e) { return setMessageContent(e.target.value); }}
                                placeholder="Type your message here..."
                                rows="6"
                                className="message-textarea"
                            />
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-outline"
                                onClick={function () { return setMessageModalOpen(false); }}
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