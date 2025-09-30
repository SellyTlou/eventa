import React, { useState, useEffect, useRef } from "react";
import "./main.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import { logOut } from "../components";    


const RSVPResponses = () => {
    const [activeTab, setActiveTab] = useState("overview");
    const [selectedRows, setSelectedRows] = useState([]);
    const [responseFilter, setResponseFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [rsvpResponses, setRsvpResponses] = useState([]);
    const [eventData, setEventData] = useState(null);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef(null);
    const [user, setUser] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [event_id, setEventId] = useState("");
    const [eventStatus, setEventStatus] = useState("");

    useEffect(() => {
        const id = searchParams.get("event_id");
        if (id) {
            setEventId(id);
            fetchRSVPResponses(id);
            fetchEventStatusByID(id);
        }
    }, [searchParams]);


    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            console.log(storedUser);
            setUser(JSON.parse(storedUser));
        }

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

    const fetchRSVPResponses = async (eventId) => {
        setLoading(true);
        const API_URL = process.env.REACT_APP_API_URL;
        try {
            const formData = new FormData();
            formData.append("function", "getRSVPResponses");
            formData.append("event_id", eventId);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json(); 

            console.log("Server data:", data); 

            if (data.success && data.responses) {
                // Remove duplicates
                const uniqueEmails = new Set();
                const uniqueResponses = data.responses.filter(r => {
                    if (uniqueEmails.has(r.email)) return false;
                    uniqueEmails.add(r.email);
                    return true;
                });

                setRsvpResponses(uniqueResponses);
                setEventData(data.event || null);
            } else {
                setRsvpResponses([]);
                setEventData(data.event || null);
            }
        } catch (err) {
            console.error("Failed to fetch RSVP responses:", err);
            setRsvpResponses([]);
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
                
                if (data.status.published === "0") {
                    setEventStatus("Unpublished");
                } else if (data.status.published === "1") {
                    setEventStatus("Published");
                } else {
                    setEventStatus("Unknown");
                }


            } else {
                return "unknown";
            }
        } catch (err) {
            console.error("Failed to fetch event status:", err);
            return "unknown";
        }
    }
    const toggleRowSelection = (id) => {
        if (selectedRows.includes(id)) {
            setSelectedRows(selectedRows.filter(rowId => rowId !== id));
        } else {
            setSelectedRows([...selectedRows, id]);
        }
    };
    const toggleDropdown = () => {
        setDropdownOpen(prev => !prev);
    };

    const toggleAllSelection = () => {
        if (selectedRows.length === rsvpResponses.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(rsvpResponses.map(r => r.guest_id));
        }
    };

    const goToHome = () => {
        navigate("/eventsDashboard");
    };
    const goToEventManagement = () => {
        navigate(`/eventManagement?event_id=${event_id}`);
    };
    const goToInvitations = () => {
        navigate(`/invitationPage?event_id=${event_id}`);
    };
    const goToManage = () => {
        navigate(`/manage_my_event?event_id=${event_id}`);
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>Evenda</h1>
                <div className="header-tabs">
                    
                    <button
                        className={`status-btn ${eventStatus === "Published" ? "status-success" : "status-failed"
                            }`}
                    >
                        {eventStatus}
                    </button>

                    
                    <div
                        ref={dropdownRef}
                        className={`profile-container ${dropdownOpen ? "open" : ""}`}
                        onClick={toggleDropdown}
                    >
                        <i className="bi bi-person-circle"></i>
                        <span>{user ? user.name : "Guest"}</span>
                        <i className="bi bi-chevron-bar-down"></i>

                        {dropdownOpen && (
                            <div className="dropdown-menu show">
                                <button className="dropdown-item">
                                    <i className="bi bi-person"></i>Profile
                                </button>
                                <button className="dropdown-item">
                                    <i className="bi bi-gear"></i>Settings
                                </button>
                                <button className="dropdown-item" onClick={logOut}>
                                    <i className="bi bi-box-arrow-right"></i>Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="dashboard-sidebar">
                <h3>DASHBOARD</h3>
                <ul>
                    <li onClick={goToHome}>Home</li>
                    <li onClick={goToEventManagement} className="active">overview</li>
                    <li onClick={goToManage}>Publish</li>
                    <li onClick={goToInvitations}>Invitations</li>
                    <li>Preview</li>
                </ul>
            </div>

            <div className="dashboard-content">
                <div className="content-header">
                    <h5>RSVP {eventData && `for "${eventData.event_name}"`}</h5>
                    <div className="header-actions">
                        <span>Actions ({selectedRows.length})</span>
                        <button className="export-btn">Export</button>
                        <div className="filter-dropdown">
                            <select
                                value={responseFilter}
                                onChange={(e) => setResponseFilter(e.target.value)}
                                className="filter-select"
                            >
                                <option value="all">All Responses</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                                <option value="maybe">Maybe</option>
                            </select>
                        </div>
                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="loading-container">
                        <div className="spinner-border text-info" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <div className="loading-text">Loading RSVP responses...</div>
                    </div>
                ) : (
                    <div className="invitations-table-container">
                        <table className="invitations-table">
                            <thead>
                                <tr>
                                    <th>
                                        <input
                                            type="checkbox"
                                            checked={
                                                selectedRows.length === rsvpResponses.length &&
                                                rsvpResponses.length > 0
                                            }
                                            onChange={toggleAllSelection}
                                            disabled={rsvpResponses.length === 0}
                                        />
                                    </th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Attending</th>
                                    <th>Guests</th>
                                    <th>Message</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rsvpResponses.length > 0
                                    ? rsvpResponses
                                        .filter((r) =>
                                            responseFilter === "all"
                                                ? true
                                                : r.attending.toLowerCase() === responseFilter
                                        )
                                        .filter((r) =>
                                            searchTerm === "" ||
                                            r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            r.email.toLowerCase().includes(searchTerm.toLowerCase())
                                        )
                                        .map((r) => (
                                            <tr
                                                key={r.guest_id}
                                                className={selectedRows.includes(r.guest_id) ? "selected" : ""}
                                            >
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRows.includes(r.guest_id)}
                                                        onChange={() => toggleRowSelection(r.guest_id)}
                                                    />
                                                </td>
                                                <td>{r.name}</td>
                                                <td>{r.email}</td>
                                                <td>{r.attending}</td>
                                                <td>{r.guest_count}</td>
                                                <td>{r.message}</td>
                                            </tr>
                                        ))
                                    : (
                                        <tr>
                                            <td colSpan="6" className="no-results">
                                                No RSVP responses found
                                            </td>
                                        </tr>
                                    )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RSVPResponses;
