import React, { useState, useEffect, useRef } from "react";
import "./main.css";
import '../../alert.css';
import { useNavigate, useSearchParams } from "react-router-dom";
import { logOut, DashboardHeader, DashboardSidebar,LoginNav } from "../components";

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
    const [originalGuestLimit, setOriginalGuestLimit] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [availablePackages, setAvailablePackages] = useState([]);
    const [currentPlan, setCurrentPlan] = useState(null);
    const [showUpdateButton, setShowUpdateButton] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
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
            printAlert("Session expired. Please log in again.", "error");
            logOut();
            navigate("/");
            return;
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
                // If event is not published and guest limit is changed, show publish button automatically
                if (eventStatus !== "Published" && guestLimit !== originalGuestLimit) {
                    setShowUpdateButton(true);
                }
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

    // Check if guest limit has changed
    useEffect(() => {
        if (guestLimit !== originalGuestLimit) {
            setShowUpdateButton(true);
        } else {
            setShowUpdateButton(false);
        }
    }, [guestLimit, originalGuestLimit]);

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
                const formattedPackages = data.packages.map(pkg => ({
                    id: pkg.package_id,
                    name: pkg.package_type.charAt(0).toUpperCase() + pkg.package_type.slice(1),
                    maxGuest: pkg.max_guests,
                    maxEvents: pkg.max_events,
                    price: parseFloat(pkg.price),
                    features: pkg.features ? pkg.features.split(',').map(feature => feature.trim()) : getDefaultFeatures(pkg.package_type)
                }));
                setAvailablePackages(formattedPackages);
            }
        } catch (err) {
            console.error("Error fetching available packages:", err);
            setAvailablePackages([]);
        }
    };

    const goToUpgradePlan = () => navigate("/upgrade_package");
    // Fallback function in case features column is empty
    const getDefaultFeatures = (packageType) => {
        const defaultFeaturesMap = {
            'basic': [
                "Up to 100 guests per event",
                "Basic event templates",
                "RSVP management",
                "Guest list tracking",
                "Email invitations",
                "Basic analytics"
            ],
            'premium': [
                "Up to 500 guests per event",
                "Premium event templates",
                "Custom branding options",
                "Advanced RSVP analytics",
                "Priority customer support",
                "Bulk guest imports",
                "Reminder emails"
            ],
            'enterprise': [
                "Unlimited guests",
                "Custom event templates",
                "Dedicated account manager",
                "API access for integrations",
                "Advanced reporting dashboard",
                "White-label solutions",
                "Team collaboration tools",
                "Custom workflows"
            ],
            'free': [
                "Up to 50 guests per event",
                "Basic templates",
                "RSVP tracking",
                "Email notifications",
                "Mobile-friendly invites"
            ]
        };
        return defaultFeaturesMap[packageType] || ["Event management features"];
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
                setOriginalGuestLimit(event.guest_limit || 0);

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
                setOriginalGuestLimit(0);
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
            setOriginalGuestLimit(0);
        } finally {
            setLoading(false);
        }
    };

   
    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const closeSidebar = () => {
        setSidebarOpen(false);
    };

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

    const handleUpdateEvent = () => {
        if (guestLimit === 0) {
            printAlert("Please select a guest limit greater than 0.", "warning");
            return;
        }
        updateEventGuestLimit();
    };

    const handlePublishEvent = async () => {
        if (guestLimit === 0) {
            printAlert("Please select a guest limit greater than 0.", "warning");
            return;
        }

        if (currentPlan && currentPlan.hasPackage && currentPlan.available_events > 0) {
            // Ensure the event usage is recorded before marking the event published
            const updated = await updateEventUsedCount();
            if (updated) {
                await updateEventStatus();
            } else {
                printAlert("Failed to record event usage. Publish aborted.", "error");
            }
        } else {
            printAlert("No available events left in your plan or no active package. Please upgrade your package.", "error");
        }
    };

    const updateEventGuestLimit = async () => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "updateEventGuestLimit");
            formData.append("event_id", event_id);
            formData.append("guest_limit", guestLimit);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                setOriginalGuestLimit(guestLimit);
                setShowUpdateButton(false);
                printAlert("Guest limit updated successfully!", "success");
            } else {
                printAlert("Failed to update guest limit. Please try again.", "error");
            }
        } catch (err) {
            console.error("Error updating guest limit:", err);
            printAlert("Error updating guest limit. Please try again.", "error");
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
                setOriginalGuestLimit(guestLimit);
                setShowUpdateButton(false);
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
                // Refresh package info and return success
                await fetchUserPackage(user.user_id);
                return true;
            } else {
                printAlert("Failed to update event count: " + (data.message || ''), "error");
                return false;
            }
        } catch (err) {
            console.error("Error updating event used count:", err);
            printAlert("Error updating event count.", "error");
            return false;
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

                {/* Event Details & Current Plan - REMOVED THE CONDITIONAL RENDERING */}
                <div className="eventDetails-section">
                    <div className="container">
                        <h2 className="section-title">Event Details & Current Plan</h2>
                        <div className="details-grid">
                            {/* Event Details Card */}
                            <div className="details-card event-details-card">
                                <div className="card-header">
                                    <h3>Event Details</h3>
                                    {/* Show Update button when event is published and guest limit is changed */}
                                    {eventStatus === "Published" && showUpdateButton && (
                                        <button className="update-event-btn" onClick={handleUpdateEvent}>
                                            Update Guest Limit
                                        </button>
                                    )}
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
                                            <small>
                                                {eventStatus === "Published"
                                                    ? "Drag the slider or enter a number to update your guest limit"
                                                    : "Drag the slider or enter a number to set your guest limit before publishing"
                                                }
                                                (Max: {maxGuests})
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Current Plan Card */}
                            {renderCurrentPlanCard()}
                        </div>

                        {/* Show different buttons based on event status and guest limit changes */}
                        <div className="action-buttons-container">
                            {/* Show Publish button when event is not published AND guest limit has been changed */}
                            {eventStatus !== "Published" && showUpdateButton && (
                                <button
                                    className={`publish-event-btn ${!currentPlan?.hasPackage || currentPlan?.available_events === 0 ? 'disabled' : ''}`}
                                    onClick={handlePublishEvent}
                                    disabled={!currentPlan?.hasPackage || currentPlan?.available_events === 0}
                                >
                                    Publish Event
                                    {(!currentPlan?.hasPackage || currentPlan?.available_events === 0) && (
                                        <span className="tooltip">
                                            {!currentPlan?.hasPackage ? "No active package" : "No available events left"}
                                        </span>
                                    )}
                                </button>
                            )}

                            {/* Show Update button when event is published AND guest limit has been changed */}
                            {eventStatus === "Published" && showUpdateButton && (
                                <button
                                    className="update-event-btn-large"
                                    onClick={handleUpdateEvent}
                                >
                                    Update Guest Limit
                                </button>
                            )}

                            {/* Show instruction when event is not published and no changes made */}
                            {eventStatus !== "Published" && !showUpdateButton && guestLimit === 0 && (
                                <div className="publish-instruction">
                                    <i className="bi bi-info-circle"></i>
                                    Set a guest limit above 0 to publish your event
                                </div>
                            )}
                        </div>
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
                                <p><strong>Price:</strong> R{selectedPackage.price}</p>
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