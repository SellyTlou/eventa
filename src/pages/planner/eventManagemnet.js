import React, { useState, useEffect, useRef } from "react";
import "./main.css";
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

    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) return logOut();
        setUser(JSON.parse(storedUser));

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setDropdownOpen(false);
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

            const response = await fetch(`${API_URL}/query.php`, { method: "POST", body: formData });
            const data = await response.json();
            if (data.success && data.status) {
                setEventStatus(data.status.published == 1 ? "Published" : "Unpublished");
            }
            else {
                setEventStatus("Unknown");
            }
        } catch {
            setEventStatus("Unknown");
        }
    };

    useEffect(() => {
        if (!bst) return;
        let results = bst.searchPartial(searchTerm);
        results = bst.filterByAttending(responseFilter).filter(r => results.includes(r));
        setFilteredResponses(results);
    }, [searchTerm, responseFilter, bst]);

    const handleSort = (order) => {
        if (!bst) return;
        const sorted = bst.toArray(order).filter(r => bst.filterByAttending(responseFilter).includes(r));
        setFilteredResponses(sorted);
    };

    const toggleDropdown = () => setDropdownOpen(prev => !prev);
    const goToHome = () => navigate("/eventsDashboard");
    const goToEventManagement = () => navigate("/eventManagement");
    const goToInvitations = () => navigate("/invitationPage");
    const goToManage = () => navigate("/manage_my_event");

    return (
        <div className="dashboard-container">
            {/* === HEADER / SIDEBAR === */}
            <div className="dashboard-header">
                <h1>Evenda</h1>
                <div className="header-tabs">
                    <button>Upgrade</button>
                    <button className={`status-btn ${eventStatus === "Published" ? "status-success" : "status-failed"}`}>{eventStatus}</button>
                    <div ref={dropdownRef} className={`profile-container ${dropdownOpen ? "open" : ""}`} onClick={toggleDropdown}>
                        <i className="bi bi-person-circle"></i>
                        <span>{user ? user.name : "Guest"}</span>
                        <i className="bi bi-chevron-bar-down"></i>
                        {dropdownOpen && (
                            <div className="dropdown-menu show">
                                <button className="dropdown-item">Profile</button>
                                <button className="dropdown-item">Settings</button>
                                <button className="dropdown-item" onClick={logOut}>Logout</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="dashboard-sidebar">
                <h3>DASHBOARD</h3>
                <ul>
                    <li onClick={goToHome}>Home</li>
                    <li onClick={goToEventManagement} className="active">Overview</li>
                    <li onClick={goToManage}>Publish</li>
                    <li onClick={goToInvitations}>Invitations</li>
                    <li>Preview</li>
                </ul>
            </div>

            {/* === MAIN CONTENT === */}
            <div className="dashboard-content">
                <div className="content-header">
                    <h5>RSVP {eventData && `for "${eventData.event_name}"`}</h5>
                    <div className="header-actions">
                        <div className="filter-dropdown">
                            <select value={responseFilter} onChange={(e) => setResponseFilter(e.target.value)} className="filter-select">
                                <option value="all">All Responses</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                                <option value="maybe">Maybe</option>
                            </select>
                        </div>
                        <div className="search-box">
                            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
                        </div>
                        <button className="btn btn-sm btn-secondary ms-2" onClick={() => handleSort("asc")}>Sort A–Z</button>
                        <button className="btn btn-sm btn-secondary ms-1" onClick={() => handleSort("desc")}>Sort Z–A</button>
                    </div>
                </div>

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
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Attending</th>
                                    <th>Guests</th>
                                    <th>Message</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredResponses.length > 0 ? filteredResponses.map((r) => (
                                    <tr key={r.guest_id}>
                                        <td>{r.name}</td>
                                        <td>{r.email}</td>
                                        <td>{r.attending}</td>
                                        <td>{r.guest_count}</td>
                                        <td>{r.message}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" className="no-results">No RSVP responses found</td>
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
