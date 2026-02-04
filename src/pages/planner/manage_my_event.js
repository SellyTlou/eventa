import React, { useState, useEffect, useRef } from "react";
import "./main.css";
import '../../alert.css';
import { useNavigate, useSearchParams } from "react-router-dom";
import { logOut, DashboardHeader, DashboardSidebar, LoginNav, DashboardTicketSidebar } from "../components";

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
    const [isTicketEvent, setIsTicketEvent] = useState(false);

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

    // Ticket configuration state
    const [ticketConfig, setTicketConfig] = useState({
        earlyBird: { name: "Early Bird", price: "", quantity: "", description: "Limited early bird tickets" },
        general: { name: "General Admission", price: "", quantity: "", description: "Standard admission ticket" },
        vip: { name: "VIP", price: "", quantity: "", description: "VIP experience with perks" },
        vvip: { name: "VVIP", price: "", quantity: "", description: "Exclusive VVIP experience" }
    });
    const [eventInfo, setEventInfo] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [originalTicketConfig, setOriginalTicketConfig] = useState(null);
    const [originalEventInfo, setOriginalEventInfo] = useState("");

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

            // Only fetch package for non-ticket events
            const isTicket = localStorage.getItem("isTicketEvent") === "true";
            if (!isTicket) {
                fetchUserPackage(userData.user_id);
                fetchAvailablePackages();
            }
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
                event_used: userPackageData.event_used,
                features: getPackageFeatures(packageData.package_type) // Add features to current plan
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
                features: getPackageFeatures(pkg.package_type), // Use local helper
                package_type: pkg.package_type.toLowerCase()
            }));
            setAvailablePackages(formattedPackages);
        }
    } catch (err) {
        console.error("Error fetching available packages:", err);
        setAvailablePackages([]);
    }
};

// Helper to get package features based on type
const getPackageFeatures = (packageType) => {
    const type = packageType?.toLowerCase();

    switch (type) {
        case "basic":
        case "free":
            return ["Basic event management", "RSVP tracking", "Basic analytics"];
        case "premium":
            return ["All Basic features", "Export to PDF", "Bulk messaging", "Advanced analytics"];
        case "advanced":
        case "enterprise":
            return ["All Premium features", "Priority support", "Custom integrations", "Advanced security"];
        case "professional":
            return ["All Premium features", "Custom branding", "API access", "Dedicated support"];
        default:
            return ["Basic features only"];
    }
};

    const goToUpgradePlan = () => navigate("/upgrade_package");

    const getDefaultFeatures = (packageType) => {
        const defaultFeaturesMap = {
            'basic': [
                "Basic event management",
                "RSVP & Ticket management",
                "Guest list tracking",
                "Email invitations",
                "Basic analytics"
            ],
            'premium': [
                "Premium event templates",
                "Custom branding options",
                "Advanced analytics",
                "Priority customer support",
                "Bulk guest imports",
                "Reminder emails"
            ],
            'enterprise': [
                "Custom event templates",
                "Dedicated account manager",
                "API access for integrations",
                "Advanced reporting dashboard",
                "White-label solutions",
                "Team collaboration tools",
                "Custom workflows"
            ],
            'free': [
                "Basic templates",
                "RSVP & Ticket tracking",
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

                const hasTickets = event.has_tickets === 1 || event.has_tickets === true || event.has_tickets === "1";
                setIsTicketEvent(hasTickets);
                localStorage.setItem("isTicketEvent", hasTickets);

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
                    guest_limit: event.guest_limit || 0,
                    has_tickets: hasTickets,
                    event_type: hasTickets ? "Ticket Event" : "RSVP Event"
                };

                setEventDetails(formattedEventDetails);
                setGuestLimit(event.guest_limit || 0);
                setOriginalGuestLimit(event.guest_limit || 0);

                // For ticket events, fetch ticket configuration
                if (hasTickets) {
                    fetchTicketConfiguration(eventId);
                }

            } else {
                console.error("No event found:", data.message);
                setEventDetails({
                    event_name: "---",
                    event_start_date: "---",
                    event_end_date: "---",
                    event_start_time: "---",
                    event_end_time: "---",
                    venue: "----",
                    guest_limit: 0,
                    has_tickets: false,
                    event_type: "RSVP Event"
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
                guest_limit: 0,
                has_tickets: false,
                event_type: "RSVP Event"
            });
            setGuestLimit(0);
        } finally {
            setLoading(false);
        }
    };

    const fetchTicketConfiguration = async (eventId) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "getEventTickets");
            formData.append("event_id", eventId);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            console.log("Ticket configuration response:", data);

            if (data.success && data.tickets) {
                // Initialize with default structure
                const newTicketConfig = {
                    earlyBird: { name: "Early Bird", price: "", quantity: "", description: "Limited early bird tickets" },
                    general: { name: "General Admission", price: "", quantity: "", description: "Standard admission ticket" },
                    vip: { name: "VIP", price: "", quantity: "", description: "VIP experience with perks" },
                    vvip: { name: "VVIP", price: "", quantity: "", description: "Exclusive VVIP experience" }
                };

                let totalCapacity = 0;

                // Map returned tickets to our configuration
                data.tickets.forEach(ticket => {
                    const quantity = parseInt(ticket.quantity_available) || 0;
                    totalCapacity += quantity;

                    switch (ticket.type_key) {
                        case 'earlyBird':
                            newTicketConfig.earlyBird = {
                                name: ticket.ticket_type,
                                price: ticket.price.toString(),
                                quantity: quantity.toString(),
                                description: ticket.description
                            };
                            break;
                        case 'general':
                            newTicketConfig.general = {
                                name: ticket.ticket_type,
                                price: ticket.price.toString(),
                                quantity: quantity.toString(),
                                description: ticket.description
                            };
                            break;
                        case 'vip':
                            newTicketConfig.vip = {
                                name: ticket.ticket_type,
                                price: ticket.price.toString(),
                                quantity: quantity.toString(),
                                description: ticket.description
                            };
                            break;
                        case 'vvip':
                            newTicketConfig.vvip = {
                                name: ticket.ticket_type,
                                price: ticket.price.toString(),
                                quantity: quantity.toString(),
                                description: ticket.description
                            };
                            break;
                    }
                });

                setTicketConfig(newTicketConfig);
                setOriginalTicketConfig(JSON.parse(JSON.stringify(newTicketConfig)));

                // Set event info
                if (data.event_info) {
                    setEventInfo(data.event_info);
                    setOriginalEventInfo(data.event_info);
                }
            }
        } catch (err) {
            console.error("Error fetching ticket configuration:", err);
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
        if (isTicketEvent) {
            // For ticket events, validate tickets
            const validTickets = validateTicketConfiguration();
            if (!validTickets) {
                printAlert("Please configure at least one valid ticket type with price and quantity.", "warning");
                return;
            }

            // Save ticket configuration and publish
            const success = await saveTicketConfiguration();
            if (success) {
                // Calculate total capacity from ticket quantities
                const totalCapacity = calculateTotalCapacity();

                // Update event with calculated guest limit and publish
                await updateEventGuestLimitAndPublish(totalCapacity);
            }
        } else {
            // For RSVP events, use existing package logic (unchanged)
            if (currentPlan && currentPlan.hasPackage && currentPlan.available_events > 0) {
                const updated = await updateEventUsedCount();
                if (updated) {
                    await updateEventStatus();
                } else {
                    printAlert("Failed to record event usage. Publish aborted.", "error");
                }
            } else {
                printAlert("No available events left in your plan or no active package. Please upgrade your package.", "error");
            }
        }
    };

    const calculateTotalCapacity = () => {
        let total = 0;

        Object.entries(ticketConfig).forEach(([type, config]) => {
            if (config.price && config.quantity) {
                const quantity = parseInt(config.quantity);
                if (!isNaN(quantity) && quantity >= 1) {
                    total += quantity;
                }
            }
        });

        return total;
    };

    // Add new function to update guest limit and publish
    const updateEventGuestLimitAndPublish = async (totalCapacity) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "publishTicketEvent");
            formData.append("event_id", event_id);
            formData.append("guest_limit", totalCapacity);
            formData.append("published", 1);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            const data = await response.json();
            console.log("Publish ticket event response:", data);

            if (data.success) {
                setEventStatus("Published");
                setGuestLimit(totalCapacity);
                setOriginalGuestLimit(totalCapacity);
                setShowUpdateButton(false);
                printAlert(`Ticket event published successfully! Total capacity: ${totalCapacity}`, "success");
            } else {
                printAlert(`Failed to publish ticket event: ${data.message}`, "error");
            }
        } catch (err) {
            console.error("Error publishing ticket event:", err);
            printAlert("Error publishing ticket event. Please try again.", "error");
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
                printAlert("Total capacity updated successfully!", "success");
            } else {
                printAlert("Failed to update total capacity. Please try again.", "error");
            }
        } catch (err) {
            console.error("Error updating guest limit:", err);
            printAlert("Error updating total capacity. Please try again.", "error");
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
            console.log("Update event status response:", data);

            if (data.success) {
                setEventStatus("Published");
                setOriginalGuestLimit(guestLimit);
                setShowUpdateButton(false);
                printAlert(`Event published successfully!`, "success");
            } else {
                printAlert(`Failed to publish event: ${data.message}`, "error");
            }
        } catch (err) {
            console.error("Error updating event status:", err);
            printAlert("Error publishing event. Please try again.", "error");
        }
    };

    const publishTicketEvent = async () => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "publishTicketEvent");
            formData.append("event_id", event_id);
            formData.append("guest_limit", guestLimit);
            formData.append("published", 1);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            const data = await response.json();
            console.log("Publish ticket event response:", data);

            if (data.success) {
                setEventStatus("Published");
                setOriginalGuestLimit(guestLimit);
                setShowUpdateButton(false);
                printAlert(`Ticket event published successfully!`, "success");
            } else {
                printAlert(`Failed to publish ticket event: ${data.message}`, "error");
            }
        } catch (err) {
            console.error("Error publishing ticket event:", err);
            printAlert("Error publishing ticket event. Please try again.", "error");
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

    const maxGuests = isTicketEvent ? 10000 : (currentPlan?.hasPackage ? currentPlan.max_guest : 50);

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

    // Ticket configuration handlers
    const handleTicketInputChange = (type, field, value) => {
        setTicketConfig(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                [field]: value
            }
        }));
    };

    const validateTicketConfiguration = () => {
        // Check if at least one ticket type has both price and quantity
        const hasValidTicket = Object.entries(ticketConfig).some(([type, config]) => {
            const price = parseFloat(config.price);
            const quantity = parseInt(config.quantity);

            return !isNaN(price) && price >= 0 && !isNaN(quantity) && quantity >= 1;
        });

        return hasValidTicket;
    };

    const saveTicketConfiguration = async () => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;

            // Filter out empty ticket types
            let earlyBirdPrice = 0;
            let earlyBirdQuantity = 0;
            let generalPrice = 0;
            let generalQuantity = 0;
            let vipPrice = 0;
            let vipQuantity = 0;
            let vvipPrice = 0;
            let vvipQuantity = 0;

            // Also prepare JSON config
            const configJson = {};

            // Process Early Bird
            if (ticketConfig.earlyBird.price && ticketConfig.earlyBird.quantity) {
                const price = parseFloat(ticketConfig.earlyBird.price);
                const quantity = parseInt(ticketConfig.earlyBird.quantity);

                if (!isNaN(price) && price >= 0 && !isNaN(quantity) && quantity >= 1) {
                    earlyBirdPrice = price;
                    earlyBirdQuantity = quantity;
                    configJson.earlyBird = {
                        name: ticketConfig.earlyBird.name,
                        price: price,
                        quantity: quantity,
                        description: ticketConfig.earlyBird.description
                    };
                }
            }

            // Process General Admission
            if (ticketConfig.general.price && ticketConfig.general.quantity) {
                const price = parseFloat(ticketConfig.general.price);
                const quantity = parseInt(ticketConfig.general.quantity);

                if (!isNaN(price) && price >= 0 && !isNaN(quantity) && quantity >= 1) {
                    generalPrice = price;
                    generalQuantity = quantity;
                    configJson.general = {
                        name: ticketConfig.general.name,
                        price: price,
                        quantity: quantity,
                        description: ticketConfig.general.description
                    };
                }
            }

            // Process VIP
            if (ticketConfig.vip.price && ticketConfig.vip.quantity) {
                const price = parseFloat(ticketConfig.vip.price);
                const quantity = parseInt(ticketConfig.vip.quantity);

                if (!isNaN(price) && price >= 0 && !isNaN(quantity) && quantity >= 1) {
                    vipPrice = price;
                    vipQuantity = quantity;
                    configJson.vip = {
                        name: ticketConfig.vip.name,
                        price: price,
                        quantity: quantity,
                        description: ticketConfig.vip.description
                    };
                }
            }

            // Process VVIP
            if (ticketConfig.vvip.price && ticketConfig.vvip.quantity) {
                const price = parseFloat(ticketConfig.vvip.price);
                const quantity = parseInt(ticketConfig.vvip.quantity);

                if (!isNaN(price) && price >= 0 && !isNaN(quantity) && quantity >= 1) {
                    vvipPrice = price;
                    vvipQuantity = quantity;
                    configJson.vvip = {
                        name: ticketConfig.vvip.name,
                        price: price,
                        quantity: quantity,
                        description: ticketConfig.vvip.description
                    };
                }
            }

            // Check if at least one ticket type is configured
            const totalQuantity = earlyBirdQuantity + generalQuantity + vipQuantity + vvipQuantity;
            if (totalQuantity === 0) {
                printAlert("Please configure at least one ticket type with quantity.", "warning");
                return false;
            }

            // Save ticket configuration
            const formData = new FormData();
            formData.append("function", "saveTicketConfiguration");
            formData.append("event_id", event_id);
            formData.append("has_tickets", 1);
            formData.append("event_info", eventInfo);
            formData.append("early_bird_price", earlyBirdPrice);
            formData.append("early_bird_quantity", earlyBirdQuantity);
            formData.append("general_price", generalPrice);
            formData.append("general_quantity", generalQuantity);
            formData.append("vip_price", vipPrice);
            formData.append("vip_quantity", vipQuantity);
            formData.append("vvip_price", vvipPrice);
            formData.append("vvip_quantity", vvipQuantity);
            formData.append("ticket_config", JSON.stringify(configJson));

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                // Update local state with the saved values
                setTicketConfig({
                    earlyBird: {
                        name: "Early Bird",
                        price: earlyBirdPrice > 0 ? earlyBirdPrice.toString() : "",
                        quantity: earlyBirdQuantity > 0 ? earlyBirdQuantity.toString() : "",
                        description: "Limited early bird tickets"
                    },
                    general: {
                        name: "General Admission",
                        price: generalPrice > 0 ? generalPrice.toString() : "",
                        quantity: generalQuantity > 0 ? generalQuantity.toString() : "",
                        description: "Standard admission ticket"
                    },
                    vip: {
                        name: "VIP",
                        price: vipPrice > 0 ? vipPrice.toString() : "",
                        quantity: vipQuantity > 0 ? vipQuantity.toString() : "",
                        description: "VIP experience with perks"
                    },
                    vvip: {
                        name: "VVIP",
                        price: vvipPrice > 0 ? vvipPrice.toString() : "",
                        quantity: vvipQuantity > 0 ? vvipQuantity.toString() : "",
                        description: "Exclusive VVIP experience"
                    }
                });

                setOriginalTicketConfig(JSON.parse(JSON.stringify(ticketConfig)));
                setOriginalEventInfo(eventInfo);

                // Calculate and update guest limit automatically
                const newGuestLimit = earlyBirdQuantity + generalQuantity + vipQuantity + vvipQuantity;
                setGuestLimit(newGuestLimit);
                setOriginalGuestLimit(newGuestLimit);

                printAlert("Ticket configuration saved successfully! Total capacity: " + newGuestLimit, "success");
                return true;
            } else {
                printAlert("Failed to save ticket configuration: " + (data.message || ''), "error");
                return false;
            }
        } catch (err) {
            console.error("Error saving ticket configuration:", err);
            printAlert("Error saving ticket configuration. Please try again.", "error");
            return false;
        }
    };

    const handleEditTickets = () => {
        setIsEditing(true);
    };

    const handleSaveTickets = async () => {
        const valid = validateTicketConfiguration();
        if (!valid) {
            printAlert("Please configure at least one valid ticket type with price and quantity.", "warning");
            return;
        }

        const success = await saveTicketConfiguration();
        if (success) {
            setIsEditing(false);
        }
    };

    const handleCancelEdit = () => {
        setTicketConfig(JSON.parse(JSON.stringify(originalTicketConfig)));
        setEventInfo(originalEventInfo);
        setIsEditing(false);
    };

    const hasTicketChanges = () => {
        return JSON.stringify(ticketConfig) !== JSON.stringify(originalTicketConfig) ||
            eventInfo !== originalEventInfo;
    };

    // Render package card for RSVP events
    const renderPackageCard = (pkg) => {
        if (isTicketEvent) return null;

        return (
            <div key={pkg.id} className={`package-card ${userPackage?.package_id === pkg.id ? "active" : ""}`} onClick={() => handlePackageClick(pkg)}>
                <h3>{pkg.name}</h3>
                <p>Max Guests: {pkg.maxGuest === Infinity ? "Unlimited" : pkg.maxGuest}</p>
                <p>Max Events: {pkg.maxEvents === Infinity ? "Unlimited" : pkg.maxEvents}</p>
                <p>Price: {pkg.price === 0 ? "Free" : `R${pkg.price}`}</p>
                <button className="view-details-btn">View Details</button>
            </div>
        );
    };

   const renderCurrentPlanCard = () => {
    if (isTicketEvent) return null;
    
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

                {/* Plan Features List */}
                {currentPlan.features && currentPlan.features.length > 0 && (
                    <div className="plan-included-features">
                        <h4>Features Included:</h4>
                        <ul className="features-list">
                            {currentPlan.features.map((feature, index) => (
                                <li key={index}>
                                    <i className="bi bi-check-circle"></i>
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

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
    // Render ticket configuration grid
    const renderTicketConfiguration = () => {
        if (!isTicketEvent) return null;

        const currentTotalCapacity = calculateTotalCapacity();

        return (
            <div className="details-card ticket-config-card">
                <div className="card-header">
                    <h3>Ticket Configuration</h3>
                    {eventStatus === "Published" && !isEditing && (
                        <button className="edit-tickets-btn" onClick={handleEditTickets}>
                            Edit Tickets
                        </button>
                    )}
                    {isEditing && (
                        <div className="ticket-edit-buttons">
                            <button className="save-tickets-btn" onClick={handleSaveTickets}>
                                Save Changes
                            </button>
                            <button className="cancel-edit-btn" onClick={handleCancelEdit}>
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
                <div className="card-content">
                    <div className="total-capacity-display">
                        <div className="total-capacity-label">Total Event Capacity:</div>
                        <div className="total-capacity-value">{currentTotalCapacity} attendees</div>
                        <div className="total-capacity-note">
                            <i className="bi bi-info-circle"></i>
                            Capacity is automatically calculated from the sum of all ticket quantities.
                        </div>
                    </div>
                    <div className="ticket-types-grid">
                        {/* Early Bird Ticket */}
                        <div className="ticket-type-card">
                            <h4>Early Bird</h4>
                            <p className="ticket-description">Limited early bird tickets</p>
                            <div className="ticket-fields">
                                <div className="form-group">
                                    <label>Price (R)</label>
                                    <input
                                        type="number"
                                        value={ticketConfig.earlyBird.price}
                                        onChange={(e) => handleTicketInputChange('earlyBird', 'price', e.target.value)}
                                        placeholder="e.g., 100"
                                        min="0"
                                        step="0.01"
                                        disabled={!isEditing && eventStatus === "Published"}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Quantity</label>
                                    <input
                                        type="number"
                                        value={ticketConfig.earlyBird.quantity}
                                        onChange={(e) => handleTicketInputChange('earlyBird', 'quantity', e.target.value)}
                                        placeholder="e.g., 50"
                                        min="1"
                                        disabled={!isEditing && eventStatus === "Published"}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* General Admission */}
                        <div className="ticket-type-card">
                            <h4>General Admission</h4>
                            <p className="ticket-description">Standard admission ticket</p>
                            <div className="ticket-fields">
                                <div className="form-group">
                                    <label>Price (R)</label>
                                    <input
                                        type="number"
                                        value={ticketConfig.general.price}
                                        onChange={(e) => handleTicketInputChange('general', 'price', e.target.value)}
                                        placeholder="e.g., 150"
                                        min="0"
                                        step="0.01"
                                        disabled={!isEditing && eventStatus === "Published"}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Quantity</label>
                                    <input
                                        type="number"
                                        value={ticketConfig.general.quantity}
                                        onChange={(e) => handleTicketInputChange('general', 'quantity', e.target.value)}
                                        placeholder="e.g., 200"
                                        min="1"
                                        disabled={!isEditing && eventStatus === "Published"}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* VIP Ticket */}
                        <div className="ticket-type-card">
                            <h4>VIP</h4>
                            <p className="ticket-description">VIP experience with perks</p>
                            <div className="ticket-fields">
                                <div className="form-group">
                                    <label>Price (R)</label>
                                    <input
                                        type="number"
                                        value={ticketConfig.vip.price}
                                        onChange={(e) => handleTicketInputChange('vip', 'price', e.target.value)}
                                        placeholder="e.g., 300"
                                        min="0"
                                        step="0.01"
                                        disabled={!isEditing && eventStatus === "Published"}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Quantity</label>
                                    <input
                                        type="number"
                                        value={ticketConfig.vip.quantity}
                                        onChange={(e) => handleTicketInputChange('vip', 'quantity', e.target.value)}
                                        placeholder="e.g., 50"
                                        min="1"
                                        disabled={!isEditing && eventStatus === "Published"}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* VVIP Ticket */}
                        <div className="ticket-type-card">
                            <h4>VVIP</h4>
                            <p className="ticket-description">Exclusive VVIP experience</p>
                            <div className="ticket-fields">
                                <div className="form-group">
                                    <label>Price (R)</label>
                                    <input
                                        type="number"
                                        value={ticketConfig.vvip.price}
                                        onChange={(e) => handleTicketInputChange('vvip', 'price', e.target.value)}
                                        placeholder="e.g., 500"
                                        min="0"
                                        step="0.01"
                                        disabled={!isEditing && eventStatus === "Published"}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Quantity</label>
                                    <input
                                        type="number"
                                        value={ticketConfig.vvip.quantity}
                                        onChange={(e) => handleTicketInputChange('vvip', 'quantity', e.target.value)}
                                        placeholder="e.g., 20"
                                        min="1"
                                        disabled={!isEditing && eventStatus === "Published"}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="ticket-notes">
                        <p><strong>Note:</strong> Only ticket types with both price and quantity filled will be created.</p>
                        <p>Leave fields empty for ticket types you don't want to offer.</p>
                        <p><strong>Total capacity:</strong> {guestLimit} attendees</p>
                    </div>

                    {/* Event Info Textarea */}
                    <div className="event-info-section">
                        <h4>Event Information</h4>
                        <textarea
                            value={eventInfo}
                            onChange={(e) => setEventInfo(e.target.value)}
                            placeholder="Add any important information about your event, ticket terms, or special instructions..."
                            rows="4"
                            disabled={!isEditing && eventStatus === "Published"}
                        />
                    </div>
                </div>
            </div>
        );
    };

  return (
    <div className="dashboard-container">

{showPackagePopup && selectedPackage && !isTicketEvent && (
    <div className="package-popup-overlay">
        <div className="package-popup">
            <button className="close-popup" onClick={closePopup}>×</button>
            <h2>{selectedPackage.name} Package</h2>
            <div className="package-details">
                <p><strong>Max Guests/Capacity:</strong> {selectedPackage.maxGuest === Infinity ? "Unlimited" : selectedPackage.maxGuest}</p>
                <p><strong>Max Events:</strong> {selectedPackage.maxEvents === Infinity ? "Unlimited" : selectedPackage.maxEvents}</p>
                <p><strong>Price:</strong> {selectedPackage.price === 0 ? "Free" : `R${selectedPackage.price}/month`}</p>
                {selectedPackage.features && selectedPackage.features.length > 0 && (
                    <div className="features-list">
                        <h4>Features:</h4>
                        <ul>
                            {selectedPackage.features.map((feature, index) => (
                                <li key={index}>
                                    <i className="bi bi-check-circle"></i>
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            <button className="choose-package-btn" onClick={handleChoosePackage}>
                Choose {selectedPackage.name} Package
            </button>
        </div>
    </div>
)}

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

        {/* Content */}
        <div className={`manage-my-event-content ${isTicketEvent ? 'ticket-event' : 'rsvp-event'}`}>
            {/* Event Type Badge */}
            <div className="event-type-badge">
                <span className={`badge ${isTicketEvent ? 'ticket-badge' : 'rsvp-badge'}`}>
                    <i className={`bi ${isTicketEvent ? 'bi-ticket-perforated' : 'bi-calendar-check'}`}></i>
                    {isTicketEvent ? "Ticket Event" : "RSVP Event"}
                </span>
            </div>

            {/* Package Slider - Only for RSVP events */}
            {!isTicketEvent && availablePackages.length > 0 && (
                <div className="package-slider">
                    <h2>Available Plans</h2>
                    <div className="slider-controls">
                        <button className="slide-btn left" onClick={() => document.querySelector(".package-cards").scrollBy({ left: -200, behavior: "smooth" })}>◀</button>
                        <div className="package-cards">
                            {availablePackages.map(renderPackageCard)}
                        </div>
                        <button className="slide-btn right" onClick={() => document.querySelector(".package-cards").scrollBy({ left: 200, behavior: "smooth" })}>▶</button>
                    </div>
                </div>
            )}

            {/* Event Details & Current Plan/Ticket Configuration */}
            <div className="eventDetails-section">
                <div className="container">
                    <h2 className="section-title">
                        {isTicketEvent ? "Ticket Event Management" : "Event Details & Current Plan"}
                    </h2>

                    {isTicketEvent ? (
                        // Ticket Event Layout - Event Details and Ticket Configuration
                        <div className="details-grid">
                            {/* Event Details Card */}
                            <div className="details-card event-details-card">
                                <div className="card-header">
                                    <h3>Event Details</h3>
                                    {eventStatus === "Published" && (
                                        <div className="total-capacity-badge">
                                            Total Capacity: {calculateTotalCapacity()}
                                        </div>
                                    )}
                                </div>
                                <div className="card-content">
                                    <div className="detail-item">
                                        <span className="detail-label">Event Name:</span>
                                        <span className="detail-value">{eventDetails?.event_name || "Loading..."}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Event Type:</span>
                                        <span className={`detail-value event-type ticket-type`}>
                                            <i className="bi bi-ticket-perforated"></i>
                                            Ticket Event
                                        </span>
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

                                    {/* Total Capacity Progress Bar for Ticket Events */}
                                    <div className="capacity-progress-section">
                                        <div className="capacity-progress-header">
                                            <span className="capacity-progress-label">Total Capacity</span>
                                            <div className="capacity-progress-display">
                                                <span className="capacity-current">{calculateTotalCapacity()}</span>
                                                <span className="capacity-calculated">attendees (calculated from tickets)</span>
                                            </div>
                                        </div>

                                        {/* Progress Bar showing capacity breakdown 
                                        <div className="ticket-capacity-breakdown">
                                            {Object.entries(ticketConfig).map(([type, config]) => {
                                                const quantity = parseInt(config.quantity) || 0;
                                                const totalCapacity = calculateTotalCapacity();
                                                const percentage = totalCapacity > 0 ? (quantity / totalCapacity) * 100 : 0;
                                                
                                                if (quantity > 0) {
                                                    return (
                                                        <div key={type} className="ticket-capacity-item">
                                                            <div className="ticket-capacity-label">
                                                                <span className="ticket-type-name">{config.name}:</span>
                                                                <span className="ticket-type-quantity">{quantity} tickets</span>
                                                            </div>
                                                            <div className="ticket-capacity-bar">
                                                                <div 
                                                                    className="ticket-capacity-fill"
                                                                    style={{ width: `${percentage}%` }}
                                                                    data-ticket-type={type}
                                                                ></div>
                                                            </div>
                                                            <div className="ticket-capacity-percentage">
                                                                {percentage.toFixed(1)}%
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </div>
                                       

                                        <div className="capacity-summary">
                                            <div className="capacity-summary-item">
                                                <span className="summary-label">Total Capacity:</span>
                                                <span className="summary-value">{calculateTotalCapacity()} attendees</span>
                                            </div>
                                            <div className="capacity-summary-item">
                                                <span className="summary-label">Ticket Types:</span>
                                                <span className="summary-value">
                                                    {Object.values(ticketConfig).filter(config => parseInt(config.quantity) > 0).length} active
                                                </span>
                                            </div>
                                        </div>
 */}
                                        <div className="capacity-info">
                                            <small>
                                                <i className="bi bi-info-circle"></i>
                                                Total capacity is automatically calculated from the sum of all ticket quantities.
                                                {eventStatus !== "Published" && " Update ticket quantities below to change capacity."}
                                            </small>
                                        </div>
                                    </div>

                                    {/* Ticket Event Info */}
                                    <div className="ticket-event-info">
                                        <div className="ticket-icon">
                                            <i className="bi bi-ticket-perforated"></i>
                                        </div>
                                        <div className="ticket-content">
                                            <h4>Ticket Event Information</h4>
                                            <p>This event uses tickets. Total capacity is automatically calculated from ticket quantities.</p>
                                            <p className="ticket-note">
                                                <i className="bi bi-info-circle"></i>
                                                Update ticket quantities in the Ticket Configuration section to change total capacity.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Ticket Configuration Card */}
                            {renderTicketConfiguration()}
                        </div>
                    ) : (
                        // RSVP Event Layout - Event Details and Current Plan
                        <div className="details-grid">
                            {/* Event Details Card */}
                            <div className="details-card event-details-card">
                                <div className="card-header">
                                    <h3>Event Details</h3>
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
                                        <span className="detail-label">Event Type:</span>
                                        <span className={`detail-value event-type rsvp-type`}>
                                            <i className="bi bi-calendar-check"></i>
                                            RSVP Event
                                        </span>
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

                                    {/* Guest Limit Section for RSVP Events */}
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
                                            <label htmlFor="guest-limit-input">Or set guest limit:</label>
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
                    )}

                    {/* Show different buttons based on event status and type */}
                    <div className="action-buttons-container">
                        {/* For Ticket Events */}
                        {isTicketEvent && eventStatus !== "Published" && (
                            <button
                                className="publish-event-btn"
                                onClick={handlePublishEvent}
                                disabled={calculateTotalCapacity() === 0}
                            >
                                Publish Ticket Event
                                {calculateTotalCapacity() === 0 && (
                                    <span className="tooltip">
                                        Add at least one ticket with quantity to publish
                                    </span>
                                )}
                            </button>
                        )}

                        {/* For RSVP Events */}
                        {!isTicketEvent && eventStatus !== "Published" && (showUpdateButton || guestLimit > 0) && (
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
                                Update {isTicketEvent ? "Capacity" : "Guest Limit"}
                            </button>
                        )}

                        {/* Show instruction when event is not published and no changes made */}
                        {eventStatus !== "Published" && !isTicketEvent && !showUpdateButton && guestLimit === 0 && (
                            <div className="publish-instruction">
                                <i className="bi bi-info-circle"></i>
                                Set a guest limit above 0 to publish your event
                            </div>
                        )}

                        {/* Show instruction for ticket events when ready */}
                        {eventStatus !== "Published" && isTicketEvent && calculateTotalCapacity() === 0 && (
                            <div className="publish-instruction ticket-instruction">
                                <i className="bi bi-ticket-perforated"></i>
                                Configure at least one ticket type with quantity to publish your event
                            </div>
                        )}
                        
                        {eventStatus !== "Published" && isTicketEvent && calculateTotalCapacity() > 0 && (
                            <div className="publish-instruction ticket-instruction">
                                <i className="bi bi-check-circle"></i>
                                Ready to publish your ticket event with {calculateTotalCapacity()} total capacity
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Package Popup - Only for RSVP events */}
            {showPackagePopup && selectedPackage && !isTicketEvent && (
                <div className="package-popup-overlay">
                    <div className="package-popup">
                        <button className="close-popup" onClick={closePopup}>×</button>
                        <h2>{selectedPackage.name} Package</h2>
                        <div className="package-details">
                            <p><strong>Max Guests/Capacity:</strong> {selectedPackage.maxGuest === Infinity ? "Unlimited" : selectedPackage.maxGuest}</p>
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