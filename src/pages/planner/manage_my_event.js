import React, { useState, useEffect, useRef, useCallback } from "react";
import "./main.css";
import '../../alert.css';
import { useNavigate, useSearchParams } from "react-router-dom";
import { logOut, DashboardHeader, DashboardSidebar, LoginNav, DashboardTicketSidebar } from "../components";
import { 
    getEffectivePackageValue, 
    getEffectivePackageName,
    isCustomPackage,
    formatFeatures,
    canCreateEvent,
    canHostGuests 
} from "../utils/customPackageUtils";
import { s } from "framer-motion/client";
import { set } from "react-hook-form";

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

    const [isTicketEvent, setIsTicketEvent] = useState(false);

    // Ticket configuration state
    const [ticketConfig, setTicketConfig] = useState({
        earlyBird: { name: "Early Bird", price: "", quantity: "", description: "Limited early bird tickets" },
        general: { name: "General Admission", price: "", quantity: "", description: "Standard admission ticket" },
        vip: { name: "VIP", price: "", quantity: "", description: "VIP experience with perks" },
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

    const calculateTotalCapacity = () => {
        if (!isTicketEvent) return guestLimit;
        
        let total = 0;
        Object.values(ticketConfig).forEach(ticket => {
            const quantity = parseInt(ticket.quantity) || 0;
            total += quantity;
        });
        return total;
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

    // Move fetchAvailablePackages to useCallback to avoid dependency issues
    const fetchAvailablePackages = useCallback(async () => {
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
            console.log("Personal packages:", data);

            if (data.success && data.packages) {
                const formattedPackages = data.packages.map(pkg => ({
                    id: pkg.package_id,
                    name: pkg.package_type.charAt(0).toUpperCase() + pkg.package_type.slice(1),
                    maxGuest: pkg.max_guests,
                    maxEvents: pkg.max_events,
                    price: parseFloat(pkg.price),
                    features: getPackageFeatures(pkg.package_type), // Use local helper
                    account_type: "personal",
                    package_type: pkg.package_type
                }));
                setAvailablePackages(formattedPackages);
            }
        } catch (err) {
            console.error("Error fetching personal packages:", err);
            // Fallback to default personal packages
            const defaultPackages = [
                {
                    id: 1,
                    name: "Free",
                    maxGuest: 50,
                    maxEvents: 1,
                    price: 0,
                    features: getPackageFeatures('free'),
                    account_type: "personal",
                    package_type: "free"
                },
                {
                    id: 2,
                    name: "Basic",
                    maxGuest: 100,
                    maxEvents: 5,
                    price: 49.99,
                    features: getPackageFeatures('basic'),
                    account_type: "personal",
                    package_type: "basic"
                },
                {
                    id: 3,
                    name: "Premium",
                    maxGuest: 500,
                    maxEvents: 20,
                    price: 149.99,
                    features: getPackageFeatures('premium'),
                    account_type: "personal",
                    package_type: "premium"
                }
            ];
            setAvailablePackages(defaultPackages);
        }
    }, []);

useEffect(() => {
    const savedData = localStorage.getItem("selectedEventData");
    const storedUser = localStorage.getItem("user");
    
    
    if (savedData && storedUser) {
        const userData = JSON.parse(storedUser);
        const eventData = JSON.parse(savedData);
        
        console.log("Loaded event data from localStorage:", eventData);
        setEventId(eventData.eventId);
        setIsTicketEvent(eventData.hasTicket === 1 || eventData.hasTicket === true || eventData.hasTicket === "1");
        setUser(userData);
        
     
        fetchEventDetails(eventData.eventId, eventData.hasTicket);
        fetchEventStatusByID(eventData.eventId, eventData.hasTicket);

        if (userData.account_type === 'business') {
            console.log("Detected BUSINESS user (account_type='business'), fetching business packages...");
            fetchUserBusinessPackage(userData.user_id);
            fetchBusinessPackages();
        } else {
            console.log("Detected PERSONAL user (account_type='personal'), fetching personal packages...");
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
    
    // ... rest of your useEffect code
}, [navigate, fetchAvailablePackages]);


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
                    message: "You don't have an active package yet.",
                    is_business: false
                });
            }
        } catch (err) {
            console.error("Error fetching user package:", err);
            setCurrentPlan({
                hasPackage: false,
                message: "Error loading package information.",
                is_business: false
            });
        }
    };

    const fetchUserBusinessPackage = async (userId) => {
    try {
        const API_URL = process.env.REACT_APP_API_URL;
        const formData = new FormData();
        formData.append("function", "getUserBusinessPackage");
        formData.append("user_id", userId);

        const response = await fetch(`${API_URL}/query.php`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) throw new Error("Network response was not ok");

        const data = await response.json();
        console.log("User business package data:", data);

        if (data.success && data.userBusinessPackage) {
            const userPkg = data.userBusinessPackage;
            console.log("Package found:", userPkg);

            // Use utility functions to get effective values
            const isCustom = isCustomPackage(userPkg);
            const eventLimit = getEffectivePackageValue(userPkg, 'events', 0);
            const guestLimit = getEffectivePackageValue(userPkg, 'guests', 0);
            const price = getEffectivePackageValue(userPkg, 'price', 0);
            const features = getEffectivePackageValue(userPkg, 'features', []);

            const availableEvents = eventLimit === 0 ?
                "Unlimited" : // For custom plan with unlimited events
                (eventLimit - (userPkg.event_used || 0));

            const planData = {
                hasPackage: true,
                isCustom: isCustom,
                plan_name: getEffectivePackageName(userPkg),
                max_guest: guestLimit,
                max_events: eventLimit === 0 ? "Unlimited" : eventLimit,
                available_events: availableEvents,
                price: price,
                renewal_date: userPkg.expiry_date ? new Date(userPkg.expiry_date).toLocaleDateString() : "N/A",
                event_limit: eventLimit,
                event_used: userPkg.event_used || 0,
                package_type: userPkg.package_type,
                is_business: true,
                features: features.length > 0 ? features : getPackageFeatures(userPkg.package_type)
            };

            console.log("Setting current plan:", planData);
            setCurrentPlan(planData);

            setUserPackage({
                package_id: userPkg.business_package_id,
                account_type: "business",
                is_custom: isCustom,
                custom_limits: userPkg.custom_limits
            });
        } else {
            console.log("No business package found:", data.message);
            setCurrentPlan({
                hasPackage: false,
                message: "You don't have an active business package yet.",
                is_business: true
            });
            setUserPackage(null);
        }
    } catch (err) {
        console.error("Error fetching user business package:", err);
        setCurrentPlan({
            hasPackage: false,
            message: "Error loading business package information.",
            is_business: true
        });
        setUserPackage(null);
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
                    package_type: packageData.package_type,
                    is_business: false,
                    features: getPackageFeatures(packageData.package_type)
                });
            }
        } catch (err) {
            console.error("Error fetching package details:", err);
        }
    };

    const fetchBusinessPackages = async () => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "getBusinessPackages");

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            console.log("Business packages:", data);

            if (data.success && data.packages) {
                const formattedPackages = data.packages.map(pkg => ({
                    id: pkg.id,
                    name: pkg.name,
                    maxGuest: pkg.max_guests,
                    maxEvents: pkg.max_events || 0,
                    price: parseFloat(pkg.price),
                    features: pkg.features ? pkg.features.split(',').map(feature => feature.trim()) : [],
                    account_type: "business",
                    package_type: pkg.package_type
                }));
                setAvailablePackages(formattedPackages);
            }
        } catch (err) {
            console.error("Error fetching business packages:", err);
            // Fallback to default business packages
            const defaultBusinessPackages = [
                {
                    id: 1,
                    name: "STARTER PLAN",
                    maxGuest: 200,
                    maxEvents: 0,
                    price: 649.00,
                    features: [
                        "Up to 200 guests",
                        "Event management tools",
                        "RSVP tracking",
                        "Create and send invitations",
                        "Free support"
                    ],
                    account_type: "business",
                    package_type: "starter"
                },
                {
                    id: 2,
                    name: "INTERMEDIATE PLAN",
                    maxGuest: 750,
                    maxEvents: null,
                    price: 2149.00,
                    features: [
                        "Up to 750 guests",
                        "Event management tools",
                        "RSVP tracking",
                        "Event Check-In",
                        "Custom branding options",
                        "Priority support"
                    ],
                    account_type: "business",
                    package_type: "intermediate"
                },
                {
                    id: 3,
                    name: "ADVANCE PLAN",
                    maxGuest: 2000,
                    maxEvents: null,
                    price: 6999.00,
                    features: [
                        "Up to 2000 guests",
                        "Event management tools",
                        "RSVP tracking",
                        "Dedicated account manager",
                        "Custom integrations",
                        "Team collaboration tools",
                        "Event Check-In"
                    ],
                    account_type: "business",
                    package_type: "advance"
                },
                {
                    id: 4,
                    name: "CUSTOM PLAN",
                    maxGuest: 0,
                    maxEvents: 0,
                    price: 0.00,
                    features: [
                        "Manage large-scale events",
                        "Your brand, ad-free",
                        "Custom data fields",
                        "Custom fonts",
                        "Email whitelabeling",
                        "Self check-in kiosk",
                        "Single sign-on (SSO)",
                        "Priority support",
                        "Dedicated Account Manager"
                    ],
                    account_type: "business",
                    package_type: "custom plan"
                }
            ];
            setAvailablePackages(defaultBusinessPackages);
        }
    };

    const goToUpgradePlan = () => navigate("/upgrade_package");

const fetchEventStatusByID = async (eventId, isTicketEvent) => {
    try {
        const API_URL = process.env.REACT_APP_API_URL;
        const formData = new FormData();
        
        // Use different function names based on event type
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
        console.log("Event status response:", data);
        
        if (data.success && data.status) {
            // For ticket events, status is stored as 'published', 'pending', etc.
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
                // For regular events, published is 0 or 1
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


const fetchEventDetails = async (id, hasTicketFlag) => {
    console.log(`Fetching event details for ID: ${id} with hasTicketFlag: ${hasTicketFlag}`);
    try {
        const formData = new FormData();
        const API_URL = process.env.REACT_APP_API_URL;

        if (hasTicketFlag === 1) {
            console.log("Fetching details for ticket event with ID:", id);
            formData.append("function", "getTicketEventById");
        } else {
            formData.append("function", "getEventById");
        }

        formData.append("event_id", id);

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
            
            localStorage.setItem("selectedEventData", JSON.stringify({
                eventId: id,
                hasTicket: hasTickets ? 1 : 0
            }));

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
                venue: event.event_location || event.address || "Venue not specified",
                guest_limit: event.guest_limit || 0,
                has_tickets: hasTickets,
                event_type: hasTickets ? "Ticket Event" : "RSVP Event"
            };

            setEventDetails(formattedEventDetails);
            setGuestLimit(event.guest_limit || 0);
            setOriginalGuestLimit(event.guest_limit || 0);

            // For ticket events, fetch ticket configuration
            if (hasTickets) {
                fetchTicketConfiguration(id);
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
        setOriginalGuestLimit(0);
    } finally {
        setLoading(false);
    }
};

  const fetchTicketConfiguration = async (eventId) => {
    try {
        const API_URL = process.env.REACT_APP_API_URL;
        const formData = new FormData();
        formData.append("function", "getTicketEventById"); // Reuse the same function
        formData.append("event_id", eventId);

        const response = await fetch(`${API_URL}/query.php`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) throw new Error("Network response was not ok");

        const data = await response.json();
        console.log("Ticket configuration response:", data);

        if (data.success && data.events && data.events.length > 0) {
            const event = data.events[0];
            
            // Initialize with default structure
            const newTicketConfig = {
                earlyBird: { name: "Early Bird", price: "", quantity: "", description: "Limited early bird tickets" },
                general: { name: "General Admission", price: "", quantity: "", description: "Standard admission ticket" },
                vip: { name: "VIP", price: "", quantity: "", description: "VIP experience with perks" },
            };

            // Set ticket quantities and prices from the event data
            if (event.earlybird_quantity > 0) {
                newTicketConfig.earlyBird.price = event.earlybird_price?.toString() || "";
                newTicketConfig.earlyBird.quantity = event.earlybird_quantity?.toString() || "";
            }
            
            if (event.general_quantity > 0) {
                newTicketConfig.general.price = event.general_price?.toString() || "";
                newTicketConfig.general.quantity = event.general_quantity?.toString() || "";
            }
            
            if (event.vip_quantity > 0) {
                newTicketConfig.vip.price = event.vip_price?.toString() || "";
                newTicketConfig.vip.quantity = event.vip_quantity?.toString() || "";
            }

            // Try to parse VVIP info from more_info if stored there
            if (event.more_info) {
                try {
                    const moreInfo = JSON.parse(event.more_info);
                    if (moreInfo.vvip_quantity > 0) {
                        newTicketConfig.vvip.price = moreInfo.vvip_price?.toString() || "";
                        newTicketConfig.vvip.quantity = moreInfo.vvip_quantity?.toString() || "";
                    }
                    // Extract event info if it was stored
                    if (moreInfo.event_info) {
                        setEventInfo(moreInfo.event_info);
                        setOriginalEventInfo(moreInfo.event_info);
                    }
                } catch (e) {
                    // If not JSON, use as plain text for event info
                    setEventInfo(event.more_info);
                    setOriginalEventInfo(event.more_info);
                }
            }

            setTicketConfig(newTicketConfig);
            setOriginalTicketConfig(JSON.parse(JSON.stringify(newTicketConfig)));
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
            localStorage.setItem("selectedPackageType", selectedPackage.account_type);

            if (selectedPackage.account_type === 'business') {
                navigate(`/business-package-payment`);
            } else {
                navigate(`/packagePayment`);
            }
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
        formData.append("guest_limit", calculateTotalCapacity()); // Add the calculated total capacity
        formData.append("published", 1);

        const response = await fetch(`${API_URL}/query.php`, {
            method: "POST",
            body: formData,
        });

        const data = await response.json();
        console.log("Publish ticket event response:", data);

        if (data.success) {
            setEventStatus("Published");
            setOriginalGuestLimit(calculateTotalCapacity());
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
        formData.append("account_type", user?.account_type === 'business' ? 'business' : 'personal');
        formData.append("is_ticket_event", isTicketEvent ? 1 : 0);

        const response = await fetch(`${API_URL}/query.php`, {
            method: "POST",
            body: formData,
        });

        const data = await response.json();
        console.log("Update event used count response:", data);
        
        if (data.success) {
            console.log("Event count updated:", data.message);
            if (user?.account_type === 'business') {
                await fetchUserBusinessPackage(user.user_id);
            } else {
                await fetchUserPackage(user.user_id);
            }
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

const updateBusinessEventCount = async () => {
    try {
        const API_URL = process.env.REACT_APP_API_URL;
        const formData = new FormData();
        formData.append("function", "updateEventUsedCount");
        formData.append("user_id", user.user_id);
        formData.append("event_id", event_id);
        formData.append("package_id", userPackage?.package_id);
        formData.append("account_type", 'business');
        formData.append("is_ticket_event", isTicketEvent ? 1 : 0); // Add this line

        const response = await fetch(`${API_URL}/query.php`, {
            method: "POST",
            body: formData,
        });

        const data = await response.json();
        console.log("Business event count update:", data);

        if (data.success) {
            console.log("Business event used count updated");
            if (user?.account_type === 'business') {
                await fetchUserBusinessPackage(user.user_id);
            }
            return true;
        } else {
            printAlert("Failed to update business event count: " + (data.message || ''), "error");
            return false;
        }
    } catch (err) {
        console.error("Error updating business event used count:", err);
        printAlert("Error updating business event count.", "error");
        return false;
    }
};

const handlePublishEvent = async () => {
    if (isTicketEvent) {
        // For ticket events, validate tickets
        const validTickets = validateTicketConfiguration();
        if (!validTickets) {
            printAlert("Please configure at least one valid ticket type with price and quantity.", "warning");
            return;
        }

        // First save the ticket configuration to ensure guest_limit is calculated
        const saved = await saveTicketConfiguration();
        if (!saved) {
            printAlert("Please save your ticket configuration before publishing.", "warning");
            return;
        }

        // Check if user has available events using utility
        if (currentPlan && currentPlan.hasPackage) {
            const canPublish = canCreateEvent(
                { 
                    ...currentPlan, 
                    is_custom: currentPlan.isCustom,
                    event_used: currentPlan.event_used,
                    event_limit: currentPlan.event_limit === "Unlimited" ? 0 : currentPlan.event_limit
                }, 
                currentPlan.event_used
            );

            if (canPublish.allowed || currentPlan.available_events === "Unlimited") {
                // Determine which update function to use
                let updated = false;
                if (user?.account_type === 'business') {
                    updated = await updateBusinessEventCount();
                } else {
                    updated = await updateEventUsedCount();
                }
                
                if (updated) {
                    await publishTicketEvent();
                } else {
                    printAlert("Failed to record event usage. Publish aborted.", "error");
                }
            } else {
                printAlert("No available events left in your plan or no active package. Please upgrade your package.", "error");
            }
        } else {
            printAlert("No available events left in your plan or no active package. Please upgrade your package.", "error");
        }
    } else {
        // For RSVP events
        if (!currentPlan?.hasPackage || (currentPlan?.available_events === 0 && currentPlan?.available_events !== "Unlimited")) {
            printAlert("No available events left in your plan or no active package. Please upgrade your package.", "error");
            return;
        }

        if (guestLimit === 0) {
            printAlert("Please set a guest limit greater than 0 before publishing.", "warning");
            return;
        }

        let updated = false;
        if (user?.account_type === 'business') {
            updated = await updateBusinessEventCount();
        } else {
            updated = await updateEventUsedCount();
        }
        
        if (updated) {
            await updateEventStatus();
        } else {
            printAlert("Failed to record event usage. Publish aborted.", "error");
        }
    }
};

    const maxGuests = currentPlan?.hasPackage ? 
        (currentPlan.max_guest || 0) : 
        (user?.account_type === 'business' ? 200 : 50);

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

        // Process each ticket type
        let earlyBirdPrice = 0;
        let earlyBirdQuantity = 0;
        let generalPrice = 0;
        let generalQuantity = 0;
        let vipPrice = 0;
        let vipQuantity = 0;

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

        // Check if at least one ticket type is configured
        const totalQuantity = earlyBirdQuantity + generalQuantity + vipQuantity;
        if (totalQuantity === 0) {
            printAlert("Please configure at least one ticket type with quantity.", "warning");
            return false;
        }

        const formData = new FormData();
        formData.append("function", "saveTicketConfiguration");
        formData.append("event_id", event_id);
        formData.append("earlybird_price", earlyBirdPrice);
        formData.append("earlybird_quantity", earlyBirdQuantity);
        formData.append("general_price", generalPrice);
        formData.append("general_quantity", generalQuantity);
        formData.append("vip_price", vipPrice);
        formData.append("vip_quantity", vipQuantity);

        const moreInfo = JSON.stringify({
            event_info: eventInfo,  
            ticket_config: configJson,
        });
        formData.append("more_info", moreInfo);

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
            });

            setOriginalTicketConfig(JSON.parse(JSON.stringify(ticketConfig)));
            setOriginalEventInfo(eventInfo);

            // Calculate and update guest limit automatically
            const newGuestLimit = earlyBirdQuantity + generalQuantity + vipQuantity;
            setGuestLimit(newGuestLimit);
            setOriginalGuestLimit(newGuestLimit);

            printAlert("Ticket configuration saved successfully! Total capacity: " + newGuestLimit, "success");
            
            try {
                const syncFd = new FormData();
                syncFd.append('function', 'syncChecklistAutoItems');
                syncFd.append('event_id', event_id);
                await fetch(`${process.env.REACT_APP_API_URL}/query.php`, { method: 'POST', body: syncFd });
            } catch (e) {
                console.error('Error syncing checklist after saving tickets', e);
            }
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

    // Render package card for RSVP events
    const renderPackageCard = (pkg) => {
        if (isTicketEvent) return null;

        return (
            <div key={pkg.id} className={`package-card ${userPackage?.package_id === pkg.id ? "active" : ""}`} onClick={() => handlePackageClick(pkg)}>
                <h3>{pkg.name}</h3>
                <p>Max Guests: {pkg.maxGuest === Infinity || pkg.maxGuest === 0 ? "Unlimited" : pkg.maxGuest}</p>
                <p>Max Events: {pkg.maxEvents === Infinity || pkg.maxEvents === 0 ? "Unlimited" : pkg.maxEvents}</p>
                <p>Price: {pkg.price === 0 ? "Custom Pricing" : `R${pkg.price}`}</p>
                <button className="view-details-btn">View Details</button>
            </div>
        );
    };

    // Render ticket configuration grid
    const renderTicketConfiguration = () => {
        if (!isTicketEvent) return null;

        // Calculate current total capacity
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
                        
                     
                    </div>
                    
                    <div className="ticket-notes">
                        <p><strong>Note:</strong> Only ticket types with both price and quantity filled will be created.</p>
                        <p>Leave fields empty for ticket types you don't want to offer.</p>
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
                        <h3>{user?.account_type === 'business' ? 'Business Plan' : 'Current Plan'}</h3>
                        <div className="plan-badge unavailable">No Package</div>
                    </div>
                    <div className="card-content">
                        <div className="plan-main-info">
                            <h4 className="plan-name">No Active {user?.account_type === 'business' ? 'Business' : ''} Package</h4>
                            <p className="plan-message">{currentPlan.message}</p>
                        </div>
                        <div className="upgrade-alert">
                            <span className="alert-icon">⚠️</span>
                            <p>You need a package to publish events. Choose a plan from above.</p>
                        </div>
                        <div className="plan-footer">
                            <button className="upgrade-btn" onClick={goToUpgradePlan}>
                                {user?.account_type === 'business' ? 'Choose Business Plan' : 'Choose Plan'}
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        const isCustom = currentPlan.isCustom || false;

        return (
            <div className={`details-card current-plan-card ${isCustom ? 'custom-plan-card' : ''}`}>
                <div className="card-header">
                    <h3>
                        {isCustom ? 'Custom Plan' : (currentPlan.is_business ? 'Business Plan' : 'Current Plan')}
                        {isCustom && (
                            <span className="custom-badge">✨ Custom</span>
                        )}
                    </h3>
                    <div className={`plan-badge ${currentPlan.available_events === 0 ? 'unavailable' : 'available'}`}>
                        {currentPlan.available_events === 0 ? 'No Events Left' :
                            currentPlan.available_events === "Unlimited" ? 'Unlimited' : 'Active'}
                    </div>
                </div>
                <div className="card-content">
                    <div className="plan-main-info">
                        <h4 className="plan-name">{currentPlan.plan_name}</h4>
                        <p className="plan-price">
                                {currentPlan.price === 0 ? 'Custom Pricing' : `R${Number(currentPlan.price).toFixed(2)}/month`}

                        </p>
                        {currentPlan.is_business && (
                            <span className={`plan-type-badge ${isCustom ? 'custom' : 'business'}`}>
                                {isCustom ? 'Custom Plan' : 'Business Plan'}
                            </span>
                        )}
                    </div>

                    <div className="plan-features">
                        <div className="feature-item">
                            <span className="feature-icon">👥</span>
                            <div className="feature-details">
                                <span className="feature-label">Max Guests</span>
                                <span className="feature-value">
                                    {currentPlan.max_guest === 0 ? "Unlimited" : currentPlan.max_guest.toLocaleString()}
                                </span>
                            </div>
                        </div>
                        <div className="feature-item">
                            <span className="feature-icon">📅</span>
                            <div className="feature-details">
                                <span className="feature-label">Max Events</span>
                                <span className="feature-value">
                                    {currentPlan.max_events === 0 || currentPlan.max_events === "Unlimited" ?
                                        "Unlimited" : currentPlan.max_events}
                                </span>
                            </div>
                        </div>
                        <div className="feature-item">
                            <span className="feature-icon">🎯</span>
                            <div className="feature-details">
                                <span className="feature-label">Available Events</span>
                                <span className={`feature-value ${currentPlan.available_events === 0 ? 'zero-events' : ''}`}>
                                    {currentPlan.available_events === "Unlimited" ? "Unlimited" : currentPlan.available_events}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Plan Features List */}
                    {currentPlan.features && currentPlan.features.length > 0 && (
                        <div className="plan-included-features">
                            <h4>{isCustom ? 'Your Custom Features:' : 'Features Included:'}</h4>
                            <ul className="features-list">
                                {currentPlan.features.map((feature, index) => (
                                    <li key={index} className={isCustom ? 'custom-feature' : ''}>
                                        <i className={`bi ${isCustom ? 'bi-star-fill' : 'bi-check-circle'}`}></i>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {currentPlan.available_events === 0 && currentPlan.available_events !== "Unlimited" && (
                        <div className="upgrade-alert">
                            <span className="alert-icon">⚠️</span>
                            <p>You've used all available events. {currentPlan.is_business ? 'Contact sales for custom plan.' : 'Upgrade your plan to create more events.'}</p>
                        </div>
                    )}

                    <div className="plan-footer">
                        {currentPlan.renewal_date !== "N/A" && (
                            <p className="renewal-date">
                                {currentPlan.is_business ? 'Expires: ' : 'Last updated: '}
                                {currentPlan.renewal_date}
                            </p>
                        )}
                        <button className="upgrade-btn" onClick={goToUpgradePlan}>
                            {isCustom ? 'View Plan Details' : (currentPlan.is_business ? 'Upgrade Business Plan' : 'Upgrade Plan')}
                        </button>
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

                                            {/* Progress Bar showing capacity breakdown */}
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

                                {/* Current Plan Card - UPDATED with custom plan support */}
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
                                    disabled={calculateTotalCapacity() === 0 || !currentPlan?.hasPackage}
                                >
                                    Publish Ticket Event
                                    {calculateTotalCapacity() === 0 && (
                                        <span className="tooltip">
                                            Add at least one ticket with quantity to publish
                                        </span>
                                    )}
                                    {!currentPlan?.hasPackage && (
                                        <span className="tooltip">
                                            No active package
                                        </span>
                                    )}
                                </button>
                            )}

                            {/* For RSVP Events */}
                            {!isTicketEvent && eventStatus !== "Published" && (showUpdateButton || guestLimit > 0) && (
                                <button
                                    className={`publish-event-btn ${!currentPlan?.hasPackage || (currentPlan?.available_events === 0 && currentPlan?.available_events !== "Unlimited") ? 'disabled' : ''}`}
                                    onClick={handlePublishEvent}
                                    disabled={!currentPlan?.hasPackage || (currentPlan?.available_events === 0 && currentPlan?.available_events !== "Unlimited")}
                                >
                                    Publish Event
                                    {(!currentPlan?.hasPackage || (currentPlan?.available_events === 0 && currentPlan?.available_events !== "Unlimited")) && (
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
                            <div className="package-type-header">
                                <span className={`package-type-badge ${selectedPackage.account_type}`}>
                                    {selectedPackage.account_type === 'business' ? 'Business Plan' : 'Personal Plan'}
                                </span>
                            </div>
                            <div className="package-details">
                                <p><strong>Max Guests:</strong> {selectedPackage.maxGuest === Infinity || selectedPackage.maxGuest === 0 ? "Unlimited" : selectedPackage.maxGuest}</p>
                                <p><strong>Max Events:</strong> {selectedPackage.maxEvents === Infinity || selectedPackage.maxEvents === 0 ? "Unlimited" : selectedPackage.maxEvents}</p>
                                <p><strong>Price:</strong> {selectedPackage.price === 0 ? "Custom Pricing" : `R${selectedPackage.price}`}</p>
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
            </div>
        </div>
    );
};

export default Manage_my_event;