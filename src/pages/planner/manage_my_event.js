import React, { useState, useEffect, useRef } from "react";
import "./main.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import { logOut } from "../components";
import { packages } from "./packages"; // Import the packages from your file

const Manage_my_event = () => {
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef(null);
    const [user, setUser] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [event_id, setEventId] = useState("");
    const [eventStatus, setEventStatus] = useState("");
    const [eventDetails, setEventDetails] = useState(null);
    const [userPackage, setUserPackage] = useState(null);
    const [guestCount, setGuestCount] = useState("");
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [showPackagePopup, setShowPackagePopup] = useState(false);

    // Use the imported packages instead of hardcoded ones
    const packageOptions = Object.values(packages);

    useEffect(() => {
        const id = searchParams.get("event_id");
        if (id) {
            setEventId(id);
            fetchEventStatusByID(id);
            fetchEventDetails(id);
        }
    }, [searchParams]);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
            fetchUserPackage(JSON.parse(storedUser).user_id);
        }

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchUserPackage = async (userId) => {
        try {
            const formData = new FormData();
            formData.append("function", "getUserPackage");
            formData.append("user_id", userId);

            const response = await fetch(
                "http://localhost/eventa/src/pages/php/query.php",
                { method: "POST", body: formData }
            );

            if (!response.ok) throw new Error("Failed to fetch package");

            const data = await response.json();
            console.log("User package:", data);

            if (data.success && data.package) {
                setUserPackage(data.package);
            } else {
                setUserPackage({ package_type: "free" });
            }
        } catch (err) {
            console.error("Error fetching package:", err);
            setUserPackage({ package_type: "free" });
        }
    };

    const fetchEventStatusByID = async (eventId) => {
        try {
            const formData = new FormData();
            formData.append("function", "getEventStatusByID");
            formData.append("event_id", eventId);

            const response = await fetch(
                "http://localhost/eventa/src/pages/php/query.php",
                { method: "POST", body: formData }
            );
            if (!response.ok) throw new Error("Network response was not ok");
            const data = await response.json();
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
    };

    const fetchEventDetails = async (eventId) => {
        try {
            const formData = new FormData();
            formData.append("function", "getEventById");
            formData.append("event_id", eventId);

            const response = await fetch(
                "http://localhost/eventa/src/pages/php/query.php",
                { method: "POST", body: formData }
            );

            if (!response.ok) throw new Error("Failed to fetch event details");

            const data = await response.json();
            console.log("Event details:", data);
            if (data.success && data.events) {
                setEventDetails(data.events);
            }
        } catch (err) {
            console.error("Error fetching event details:", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleDropdown = () => setDropdownOpen((prev) => !prev);

    const goToHome = () => navigate("/eventsDashboard");
    const goToEventManagement = () =>
        navigate(`/eventManagement?event_id=${event_id}`);
    const goToInvitations = () =>
        navigate(`/invitationPage?event_id=${event_id}`);
    const goToManage = () => navigate(`/manage_my_event?event_id=${event_id}`);

    // Get current package details
    const currentPackage = packages[userPackage?.package_type] || packages.Free;

    const handleGuestChange = (e) => {
        const value = parseInt(e.target.value) || 0;
        if (value <= currentPackage.maxGuest || currentPackage.maxGuest === Infinity) {
            setGuestCount(value);
        }
    };

    const handlePackageClick = (pkg) => {
        setSelectedPackage(pkg);
        setShowPackagePopup(true);
    };

    const handleChoosePackage = () => {
        if (selectedPackage && user) {
            navigate(`/packagePayment?user_id=${user.user_id}&package_id=${selectedPackage.id}&event_id=${event_id}`);
        }
    };

    const closePopup = () => {
        setShowPackagePopup(false);
        setSelectedPackage(null);
    };

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div className="dashboard-header">
                <h1>Eventa</h1>
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

            {/* Sidebar */}
            <div className="dashboard-sidebar">
                <h3>DASHBOARD</h3>
                <ul>
                    <li onClick={goToHome}>Home</li>
                    <li onClick={goToEventManagement}>Overview</li>
                    <li onClick={goToManage} className="active">
                        Publish
                    </li>
                    <li onClick={goToInvitations}>Invitations</li>
                    <li>Preview</li>
                </ul>
            </div>

            {/* Content */}
            <div className="manage-my-event-content">

                <div className="eventDetails">
                    {loading ? (
                        <p>Loading event details...</p>
                    ) : eventDetails ? (
                        <div>
                            <h2>{eventDetails.event_name}</h2>
                            <p>{eventDetails.description}</p>
                            <p>Date: {new Date(eventDetails.event_start_date).toLocaleDateString()}</p>
                            <p>Location: {eventDetails.location}</p>
                        </div>
                    ) : (
                        <p>No event details found.</p>
                    )}
                </div>

                <div className="event-form">
                    <h2>Current Plan: {currentPackage.name}</h2>
                    <label>
                        Number of Guests (max {currentPackage.maxGuest === Infinity ? "Unlimited" : currentPackage.maxGuest}):
                        <input
                            type="number"
                            value={guestCount}
                            onChange={handleGuestChange}
                            min="1"
                            max={currentPackage.maxGuest === Infinity ? "" : currentPackage.maxGuest}
                        />
                    </label>
                </div>

                <div className="package-slider">
                    <button
                        className="slide-btn left"
                        onClick={() =>
                            document.querySelector(".package-cards").scrollBy({ left: -200, behavior: "smooth" })
                        }
                    >
                        ◀
                    </button>
                    <div className="package-cards">
                        {packageOptions.map((pkg) => (
                            <div
                                key={pkg.id}
                                className={`package-card ${pkg.id === currentPackage.id ? "active" : ""}`}
                                onClick={() => handlePackageClick(pkg)}
                            >
                                <h3>{pkg.name}</h3>
                                <p>Max Guests: {pkg.maxGuest === Infinity ? "Unlimited" : pkg.maxGuest}</p>
                                <p>Max Events: {pkg.maxEvents === Infinity ? "Unlimited" : pkg.maxEvents}</p>
                                <p>Price: {pkg.price === 0 ? "Free" : `R${pkg.price}`}</p>
                                <button className="view-details-btn">View Details</button>
                            </div>
                        ))}
                    </div>
                    <button
                        className="slide-btn right"
                        onClick={() =>
                            document.querySelector(".package-cards").scrollBy({ left: 200, behavior: "smooth" })
                        }
                    >
                        ▶
                    </button>
                </div>

                {/* Package Popup */}
                {showPackagePopup && selectedPackage && (
                    <div className="package-popup-overlay">
                        <div className="package-popup">
                            <button className="close-popup" onClick={closePopup}>×</button>
                            <h2>{selectedPackage.name} Package</h2>
                            <div className="package-details">
                                <p><strong>Max Guests:</strong> {selectedPackage.maxGuest === Infinity ? "Unlimited" : selectedPackage.maxGuest}</p>
                                <p><strong>Max Events:</strong> {selectedPackage.maxEvents === Infinity ? "Unlimited" : selectedPackage.maxEvents}</p>
                                <p><strong>Price:</strong> {selectedPackage.price === 0 ? "Free" : `R${selectedPackage.price}`}</p>
                                <div className="features-list">
                                    <h4>Features:</h4>
                                    <ul>
                                        {selectedPackage.features.map((feature, index) => (
                                            <li key={index}>{feature}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            <button className="choose-package-btn" onClick={handleChoosePackage}>
                                Choose {selectedPackage.name} Package
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Manage_my_event;