import React, { useState, useEffect, useRef } from "react";
import "./main.css";
import '../../alert.css';
import { useNavigate, useSearchParams } from "react-router-dom";
import { logOut } from "../components";

const Manage_my_event = () => {
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef(null);
    const sliderRef = useRef(null);
    const [user, setUser] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const navigate = useNavigate();
    const [event_id, setEventId] = useState("");
    const [eventStatus, setEventStatus] = useState("");
    const [eventDetails, setEventDetails] = useState(null);
    const [userPackage, setUserPackage] = useState(null);

    const [selectedPackage, setSelectedPackage] = useState(null);
    const [showPackagePopup, setShowPackagePopup] = useState(false);
    const [guestLimit, setGuestLimit] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [availablePackages, setAvailablePackages] = useState([]);
    const [currentPlan, setCurrentPlan] = useState(null);

    const [alert, setAlert] = useState({ show: false, message: "", type: "" });

    const printAlert = (message, type = "info") => {
        setAlert({ show: true, message, type });
        setTimeout(() => {
            setAlert({ show: false, message: "", type: "" });
        }, 5000);
    };

    useEffect(() => {
        const id = localStorage.getItem("selectedEventId")
        const storedUser = localStorage.getItem("user");
        if (id && storedUser) {
            const userData = JSON.parse(storedUser);
            setUser(userData);
            setEventId(id);
            fetchEventStatusByID(id);
            fetchEventDetails(id);
            fetchUserPackage(userData.user_id);
            fetchAvailablePackages();
        }
        if (!storedUser) {
            logOut();
        }
        if (!id) {
            navigate("/eventsDashboard");
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

    useEffect(() => {
        const handleGlobalMouseMove = (e) => {
            if (isDragging) {
                updateGuestLimit(e);
            }
        };

        const handleGlobalMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
            }
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleGlobalMouseMove);
            document.addEventListener('mouseup', handleGlobalMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleGlobalMouseMove);
            document.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [isDragging]);

    const fetchUserPackage = async (userId) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "getUserPackage");
            formData.append("user_id", userId);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            console.log("User package data:", data);

            if (data.success && data.userPackage) {
                setUserPackage(data.userPackage);

                fetchPackageDetails(data.userPackage.package_id, data.userPackage);
            } else {

                setCurrentPlan({
                    hasPackage: false,
                    message: "You don't have an active package yet."
                });
            }
        } catch (err) {
            console.error("Error fetching user package:", err);
            setCurrentPlan({
                hasPackage: false,
                message: "Error loading package information."
            });
        }
    };

    const fetchPackageDetails = async (packageId, userPackageData) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "getPackageById");
            formData.append("package_id", packageId);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            console.log("Package details:", data);

            if (data.success && data.package) {
                const packageData = data.package;
                const availableEvents = userPackageData.event_limit - userPackageData.event_used;

                setCurrentPlan({
                    hasPackage: true,
                    plan_name: packageData.package_type.charAt(0).toUpperCase() + packageData.package_type.slice(1),
                    max_guest: packageData.max_guests,
                    max_events: userPackageData.event_limit,
                    available_events: availableEvents,
                    price: parseFloat(packageData.price),
                    renewal_date: userPackageData.updated_at ? new Date(userPackageData.updated_at).toLocaleDateString() : "N/A",
                    event_limit: userPackageData.event_limit,
                    event_used: userPackageData.event_used
                });
            }
        } catch (err) {
            console.error("Error fetching package details:", err);
        }
    };


    const fetchAvailablePackages = async () => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "getAllPackages");

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            console.log("Available packages:", data);

            if (data.success && data.packages) {
                // Format packages to match frontend structure
                const formattedPackages = data.packages.map(pkg => ({
                    id: pkg.package_id,
                    name: pkg.package_type.charAt(0).toUpperCase() + pkg.package_type.slice(1),
                    maxGuest: pkg.max_guests,
                    maxEvents: pkg.max_events,
                    price: parseFloat(pkg.price),
                    features: getPackageFeatures(pkg.package_type)
                }));
                setAvailablePackages(formattedPackages);
            }
        } catch (err) {
            console.error("Error fetching available packages:", err);
            // Fallback to empty array
            setAvailablePackages([]);
        }
    };

    // Helper function to get features based on package type
    const getPackageFeatures = (packageType) => {
        const featuresMap = {
            'basic': [
                "Access to basic templates",
                "Create and send invitations",
                "RSVP tracking",
                "Event management tools"
            ],
            'premium': [
                "All Basic features",
                "Access to premium templates",
                "Custom branding options",
                "Priority support",
                "Advanced RSVP analytics"
            ],
            'enterprise': [
                "All Premium features",
                "Dedicated account manager",
                "Custom integrations",
                "Unlimited events",
                "Team collaboration tools"
            ],
            'free': [
                "Access to basic templates",
                "Create and send invitations",
                "RSVP tracking",
                "Event management tools"
            ]
        };
        return featuresMap[packageType] || ["Basic event management features"];
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

    const fetchEventDetails = async (eventId) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;

            const formData = new FormData();
            formData.append("function", "getEventById");
            formData.append("event_id", eventId);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            console.log("Event details response:", data);

            if (data.success && data.events && data.events.length > 0) {
                const event = data.events[0];

                // Format the date and time for display
                const formatDate = (dateString) => {
                    if (!dateString) return "Not set";
                    try {
                        return new Date(dateString).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                    } catch (error) {
                        return dateString;
                    }
                };

                const formatTime = (timeString) => {
                    if (!timeString) return "";
                    try {
                        const [hours, minutes] = timeString.split(':');
                        const hour = parseInt(hours);
                        const ampm = hour >= 12 ? 'PM' : 'AM';
                        const displayHour = hour % 12 || 12;
                        return `${displayHour}:${minutes} ${ampm}`;
                    } catch (error) {
                        return timeString;
                    }
                };

                const formattedEventDetails = {
                    event_name: event.event_name || "Untitled Event",
                    event_start_date: formatDate(event.event_start_date),
                    event_end_date: formatDate(event.event_end_date),
                    event_start_time: formatTime(event.event_start_time),
                    event_end_time: formatTime(event.event_end_time),
                    venue: event.event_location || "Venue not specified",
                    guest_limit: event.guest_limit || 0
                };

                setEventDetails(formattedEventDetails);
                setGuestLimit(event.guest_limit || 0);

            } else {
                console.error("No event found:", data.message);
                setEventDetails({
                    event_name: "---",
                    event_start_date: "---",
                    event_end_date: "---",
                    event_start_time: "---",
                    event_end_time: "---",
                    venue: "----",
                    guest_limit: 0
                });
                setGuestLimit(0);
            }

        } catch (err) {
            console.error("Error fetching event details:", err);
            setEventDetails({
                event_name: "---",
                event_start_date: "---",
                event_end_date: "---",
                event_start_time: "---",
                event_end_time: "---",
                venue: "----",
                guest_limit: 0
            });
            setGuestLimit(0);
        } finally {
            setLoading(false);
        }
    };

    const toggleDropdown = () => setDropdownOpen((prev) => !prev);
    const goToHome = () => navigate("/eventsDashboard");
    const goToEventManagement = () => navigate(`/eventManagement`);
    const goToInvitations = () => navigate(`/invitationPage`);
    const goToManage = () => navigate(`/manage_my_event`);
    const goToUpgradePlan = () => navigate(`/upgrade_package`);

    const handlePackageClick = (pkg) => {
        setSelectedPackage(pkg);
        setShowPackagePopup(true);
    };

    const handleChoosePackage = () => {
        if (selectedPackage && user) {
            localStorage.setItem("selectedPackageId", selectedPackage.id);
            navigate(`/packagePayment`);
        }
    };

    const closePopup = () => {
        setShowPackagePopup(false);
        setSelectedPackage(null);
    };


    const handlePublishEvent = () => {
        if (guestLimit === 0) {
            printAlert("Please select a guest limit greater than 0.", "warning");
            return;
        }

        if (currentPlan && currentPlan.hasPackage && currentPlan.available_events > 0) {
            updateEventStatus();
            updateEventUsedCount();
        } else {
            printAlert("No available events left in your plan or no active package. Please upgrade your package.", "error");
        }
    };


    const updateEventStatus = async () => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "updateEventStatus");
            formData.append("event_id", event_id);
            formData.append("published", 1);
            formData.append("guest_limit", guestLimit);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                setEventStatus("Published");
                printAlert("Event published successfully!", "success");
            } else {
                printAlert("Failed to publish event. Please try again.", "error");
            }
        } catch (err) {
            console.error("Error updating event status:", err);
            printAlert("Error publishing event. Please try again.", "error");
        }
    };

    const updateEventUsedCount = async () => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "updateEventUsedCount");
            formData.append("user_id", user.user_id);
            formData.append("event_id", event_id);
            formData.append("package_id", userPackage.package_id);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            const data = await response.json();
            console.log(data);
            if (data.success) {
                console.log("Event used count updated and package assigned to event");
                fetchUserPackage(user.user_id);
            } else {
                printAlert("Failed to update event count.", "error");
            }
        } catch (err) {
            console.error("Error updating event used count:", err);
            printAlert("Error updating event count.", "error");
        }
    };

    const maxGuests = currentPlan?.hasPackage ? currentPlan.max_guest : 50;

    const handleMouseDown = (e) => {
        e.preventDefault();
        setIsDragging(true);
        updateGuestLimit(e);
    };

    const handleTouchStart = (e) => {
        setIsDragging(true);
        updateGuestLimit(e.touches[0]);
    };

    const updateGuestLimit = (e) => {
        if (!sliderRef.current) return;

        const rect = sliderRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const newGuestLimit = Math.round(percentage * maxGuests);
        setGuestLimit(newGuestLimit);
    };

    const handleInputChange = (e) => {
        const value = parseInt(e.target.value) || 0;
        const newGuestLimit = Math.max(0, Math.min(maxGuests, value));
        setGuestLimit(newGuestLimit);
    };



    const renderCurrentPlanCard = () => {
        if (!currentPlan) {
            return (
                <div className="details-card current-plan-card">
                    <div className="card-header">
                        <h3>Current Plan</h3>
                        <div className="plan-badge unavailable">Loading...</div>
                    </div>
                    <div className="card-content">
                        <div className="plan-main-info">
                            <p>Loading package information...</p>
                        </div>
                    </div>
                </div>
            );
        }

        if (!currentPlan.hasPackage) {
            return (
                <div className="details-card current-plan-card">
                    <div className="card-header">
                        <h3>Current Plan</h3>
                        <div className="plan-badge unavailable">No Package</div>
                    </div>
                    <div className="card-content">
                        <div className="plan-main-info">
                            <h4 className="plan-name">No Active Package</h4>
                            <p className="plan-message">{currentPlan.message}</p>
                        </div>
                        <div className="upgrade-alert">
                            <span className="alert-icon">⚠️</span>
                            <p>You need a package to publish events. Choose a plan from above.</p>
                        </div>
                        <div className="plan-footer">
                            <button className="upgrade-btn" onClick={goToUpgradePlan}>Choose Plan</button>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="details-card current-plan-card">
                <div className="card-header">
                    <h3>Current Plan</h3>
                    <div className={`plan-badge ${currentPlan.available_events === 0 ? 'unavailable' : 'available'}`}>
                        {currentPlan.available_events === 0 ? 'No Events Left' : 'Active'}
                    </div>
                </div>
                <div className="card-content">
                    <div className="plan-main-info">
                        <h4 className="plan-name">{currentPlan.plan_name}</h4>
                        <p className="plan-price">R{currentPlan.price}/month</p>
                    </div>

                    <div className="plan-features">
                        <div className="feature-item">
                            <span className="feature-icon">👥</span>
                            <div className="feature-details">
                                <span className="feature-label">Max Guests</span>
                                <span className="feature-value">{currentPlan.max_guest}</span>
                            </div>
                        </div>
                        <div className="feature-item">
                            <span className="feature-icon">📅</span>
                            <div className="feature-details">
                                <span className="feature-label">Max Events</span>
                                <span className="feature-value">{currentPlan.max_events}</span>
                            </div>
                        </div>
                        <div className="feature-item">
                            <span className="feature-icon">🎯</span>
                            <div className="feature-details">
                                <span className="feature-label">Available Events</span>
                                <span className={`feature-value ${currentPlan.available_events === 0 ? 'zero-events' : ''}`}>
                                    {currentPlan.available_events}
                                </span>
                            </div>
                        </div>
                    </div>

                    {currentPlan.available_events === 0 && (
                        <div className="upgrade-alert">
                            <span className="alert-icon">⚠️</span>
                            <p>You've used all available events. Upgrade your plan to create more events.</p>
                        </div>
                    )}

                    <div className="plan-footer">
                        <p className="renewal-date">Last updated: {currentPlan.renewal_date}</p>
                        <button className="upgrade-btn" onClick={goToUpgradePlan}>Upgrade Plan</button>
                    </div>
                </div>
            </div>
        );
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

            {/* Header */}
            <div className="dashboard-header">
                <h1>Evenda</h1>
                <div className="header-tabs">
                    <button className={`status-btn ${eventStatus === "Published" ? "status-success" : "status-failed"}`}>
                        {eventStatus}
                    </button>
                    <div ref={dropdownRef} className={`profile-container ${dropdownOpen ? "open" : ""}`} onClick={toggleDropdown}>
                        <i className="bi bi-person-circle"></i>
                        <span>{user ? user.name : "Guest"}</span>
                        <i className="bi bi-chevron-bar-down"></i>
                        {dropdownOpen && (
                            <div className="dropdown-menu show">
                                <button className="dropdown-item"><i className="bi bi-person"></i>Profile</button>
                                <button className="dropdown-item"><i className="bi bi-gear"></i>Settings</button>
                                <button className="dropdown-item" onClick={logOut}><i className="bi bi-box-arrow-right"></i>Logout</button>
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
                    <li onClick={goToManage} className="active">Publish</li>
                    <li onClick={goToInvitations}>Invitations</li>
                    <li>Preview</li>
                </ul>
            </div>

            {/* Content */}
            <div className="manage-my-event-content">
                {/* Package Slider */}
                <div className="package-slider">
                    <h2>Available Plans</h2>
                    <button className="slide-btn left" onClick={() => document.querySelector(".package-cards").scrollBy({ left: -200, behavior: "smooth" })}>◀</button>
                    <div className="package-cards">
                        {availablePackages.map((pkg) => (
                            <div key={pkg.id} className={`package-card ${userPackage?.package_id === pkg.id ? "active" : ""}`} onClick={() => handlePackageClick(pkg)}>
                                <h3>{pkg.name}</h3>
                                <p>Max Guests: {pkg.maxGuest === Infinity ? "Unlimited" : pkg.maxGuest}</p>
                                <p>Max Events: {pkg.maxEvents === Infinity ? "Unlimited" : pkg.maxEvents}</p>
                                <p>Price: {pkg.price === 0 ? "Free" : `R${pkg.price}`}</p>
                                <button className="view-details-btn">View Details</button>
                            </div>
                        ))}
                    </div>
                    <button className="slide-btn right" onClick={() => document.querySelector(".package-cards").scrollBy({ left: 200, behavior: "smooth" })}>▶</button>
                </div>

                {/* Event Details & Current Plan */}
                <div className="eventDetails-section">
                    <div className="container">
                        <h2 className="section-title">Event Details & Current Plan</h2>
                        <div className="details-grid">
                            {/* Event Details Card */}
                            <div className="details-card event-details-card">
                                <div className="card-header">
                                    <h3>Event Details</h3>
                                    <span className="edit-icon">✏️</span>
                                </div>
                                <div className="card-content">
                                    <div className="detail-item">
                                        <span className="detail-label">Event Name:</span>
                                        <span className="detail-value">{eventDetails?.event_name || "Loading..."}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Start Date:</span>
                                        <span className="detail-value">{eventDetails?.event_start_date || "Not set"}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">End Date:</span>
                                        <span className="detail-value">{eventDetails?.event_end_date || "Not set"}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Start Time:</span>
                                        <span className="detail-value">{eventDetails?.event_start_time || "Not set"}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">End Time:</span>
                                        <span className="detail-value">{eventDetails?.event_end_time || "Not set"}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Venue:</span>
                                        <span className="detail-value">{eventDetails?.venue || "Not specified"}</span>
                                    </div>

                                    {/* Guest Limit Section */}
                                    <div className="guest-limit-section">
                                        <div className="guest-limit-header">
                                            <span className="guest-limit-label">Guest Limit</span>
                                            <div className="guest-limit-display">
                                                <span className="guest-count">{guestLimit}</span>
                                                <span className="guest-max">/ {maxGuests}</span>
                                            </div>
                                        </div>

                                        <div
                                            ref={sliderRef}
                                            className="guest-limit-slider"
                                            onMouseDown={handleMouseDown}
                                            onTouchStart={handleTouchStart}
                                        >
                                            <div
                                                className="guest-limit-progress"
                                                style={{ width: `${(guestLimit / maxGuests) * 100}%` }}
                                            >
                                                <div className="guest-limit-handle"></div>
                                            </div>
                                        </div>

                                        <div className="guest-limit-input">
                                            <label htmlFor="guest-limit-input">Or set exact number:</label>
                                            <input
                                                id="guest-limit-input"
                                                type="number"
                                                min="0"
                                                max={maxGuests}
                                                value={guestLimit}
                                                onChange={handleInputChange}
                                            />
                                        </div>

                                        <div className="guest-limit-info">
                                            <small>Drag the slider or enter a number to set your guest limit (Max: {maxGuests})</small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Current Plan Card */}
                            {renderCurrentPlanCard()}
                        </div>

                        <button
                            className={`publish-event-btn ${!currentPlan?.hasPackage || currentPlan?.available_events === 0 ? 'disabled' : ''}`}
                            onClick={handlePublishEvent}
                            disabled={!currentPlan?.hasPackage || currentPlan?.available_events === 0}
                        >
                            {eventStatus === "Published" ? "Update Event" : "Publish Event"}
                            {(!currentPlan?.hasPackage || currentPlan?.available_events === 0) && (
                                <span className="tooltip">
                                    {!currentPlan?.hasPackage ? "No active package" : "No available events left"}
                                </span>
                            )}
                        </button>
                    </div>
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
                                Choose {selectedPackage.id} Package
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Manage_my_event;