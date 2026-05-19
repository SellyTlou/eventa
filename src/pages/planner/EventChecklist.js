// EventChecklist.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardHeader, DashboardSidebar, DashboardTicketSidebar } from "../components";
import "./eventChecklist.css";
import "../../alert.css";

const EventChecklist = () => {
    const [eventData, setEventData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [eventStatus, setEventStatus] = useState("");
    const [isTicketEvent, setIsTicketEvent] = useState(false);
    const [checklistItems, setChecklistItems] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: "", type: "" });
    const [user, setUser] = useState(null);
    const [eventId, setEventId] = useState(null);
    const [ticketConfig, setTicketConfig] = useState(null);
    
    // Collapsible sections state - all closed by default
    const [expandedSections, setExpandedSections] = useState({
        quickStart: false,
        launch: false,
        organize: false,
        followUp: false
    });
    
    const navigate = useNavigate();
    
    const printAlert = (message, type = "info") => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert({ show: false, message: "", type: "" }), 5000);
    };
    
    // Toggle section function
    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };
    
    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        const savedEventData = localStorage.getItem("selectedEventData");
        
        if (!storedUser) {
            printAlert("Session expired. Please log in again.", "error");
            navigate("/");
            return;
        }
        
        const userData = JSON.parse(storedUser);
        setUser(userData);
        
        if (savedEventData) {
            const eventDataObj = JSON.parse(savedEventData);
            const eventIdValue = eventDataObj.eventId;
            const hasTicketFlag = eventDataObj.hasTicket === 1 || eventDataObj.hasTicket === true;
            
            setEventId(eventIdValue);
            setIsTicketEvent(hasTicketFlag);
            
            fetchEventDetails(eventIdValue, hasTicketFlag);
            fetchEventStatus(eventIdValue, hasTicketFlag);
        } else {
            // No event selected, go to dashboard
            const dashPath = userData?.account_type === 'business' ? '/businessdashboard' : '/eventsDashboard';
            navigate(dashPath);
        }
    }, [navigate]);
    
    const fetchEventDetails = async (eventId, hasTicketFlag) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            
            if (hasTicketFlag) {
                formData.append("function", "getTicketEventById");
            } else {
                formData.append("function", "getEventById");
            }
            
            formData.append("event_id", eventId);
            
            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });
            
            const data = await response.json();
            console.log("Event details response:", data);
            
            if (data.success && data.events && data.events.length > 0) {
                const event = data.events[0];
                setEventData(event);
                
                // For ticket events, also fetch ticket configuration
                if (hasTicketFlag) {
                    fetchTicketConfiguration(eventId);
                }
                
                calculateProgress(event, hasTicketFlag);
                fetchChecklist(eventId);
            }
        } catch (err) {
            console.error("Error fetching event details:", err);
        } finally {
            setLoading(false);
        }
    };
    
    const fetchTicketConfiguration = async (eventId) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "getTicketEventById");
            formData.append("event_id", eventId);
            
            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });
            
            const data = await response.json();
            
            if (data.success && data.events && data.events.length > 0) {
                const event = data.events[0];
                setTicketConfig({
                    earlybird_price: event.earlybird_price,
                    earlybird_quantity: event.earlybird_quantity,
                    general_price: event.general_price,
                    general_quantity: event.general_quantity,
                    vip_price: event.vip_price,
                    vip_quantity: event.vip_quantity,
                    has_tickets: event.has_tickets
                });
            }
        } catch (err) {
            console.error("Error fetching ticket configuration:", err);
        }
    };

    const fetchChecklist = async (eventId) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append('function', 'getEventChecklist');
            formData.append('event_id', eventId);

            const response = await fetch(`${API_URL}/query.php`, { method: 'POST', body: formData });
            const data = await response.json();
            if (data.success && Array.isArray(data.items)) {
                setChecklistItems(data.items);
                // compute progress from checklist
                const total = data.items.length || 1;
                const done = data.items.filter(i => (i.completed == 1 || i.completed === '1')).length;
                setProgress(Math.round((done / total) * 100));
            }
        } catch (err) {
            console.error('Error fetching checklist:', err);
        }
    };

    const toggleChecklistItem = async (item) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append('function', 'updateChecklistItem');
            formData.append('event_id', eventId);
            formData.append('item_key', item.item_key);
            formData.append('completed', item.completed == 1 ? 0 : 1);
            const response = await fetch(`${API_URL}/query.php`, { method: 'POST', body: formData });
            const data = await response.json();
            if (data.success && Array.isArray(data.items)) {
                setChecklistItems(data.items);
                const total = data.items.length || 1;
                const done = data.items.filter(i => (i.completed == 1 || i.completed === '1')).length;
                setProgress(Math.round((done / total) * 100));
            }
        } catch (err) {
            console.error('Error updating checklist item:', err);
        }
    };

    const updateChecklistItemByKey = async (itemKey, completed = 1) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append('function', 'updateChecklistItem');
            formData.append('event_id', eventId);
            formData.append('item_key', itemKey);
            formData.append('completed', completed);

            const response = await fetch(`${API_URL}/query.php`, { method: 'POST', body: formData });
            const data = await response.json();
            if (data.success && Array.isArray(data.items)) {
                setChecklistItems(data.items);
                const total = data.items.length || 1;
                const done = data.items.filter(i => (i.completed == 1 || i.completed === '1')).length;
                setProgress(Math.round((done / total) * 100));
            }
        } catch (err) {
            console.error('Error updating checklist item by key:', err);
        }
    };
    
    const fetchEventStatus = async (eventId, isTicketEvent) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            
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
            
            const data = await response.json();
            console.log("Event status response:", data);
            
            if (data.success && data.status) {
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
                    setEventStatus(data.status.published == 1 ? "Published" : "Unpublished");
                }
            }
        } catch (err) {
            console.error("Error fetching event status:", err);
        }
    };
    
    const calculateProgress = (event, isTicketEvent) => {
        let completedSteps = 0;
        let totalSteps = isTicketEvent ? 6 : 5;
        
        if (event.event_name && event.event_name !== "Untitled Event") completedSteps++;
        if (event.event_start_date) completedSteps++;
        if (event.event_location || event.address) completedSteps++;
        if (event.event_image) completedSteps++;
        
        if (isTicketEvent) {
            // For ticket events, check if any tickets are configured
            const hasTicketsConfigured = (
                (event.general_quantity > 0 && event.general_price > 0) ||
                (event.earlybird_quantity > 0 && event.earlybird_price > 0) ||
                (event.vip_quantity > 0 && event.vip_price > 0)
            );
            if (hasTicketsConfigured) completedSteps++;
        } else {
            // For RSVP events, check guest limit
            if (event.guest_limit > 0) completedSteps++;
        }
        
        setProgress(Math.round((completedSteps / totalSteps) * 100));
    };
    
    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    const closeSidebar = () => setSidebarOpen(false);
    
    const getBaseFrontendUrl = () => {
        const API_URL = process.env.REACT_APP_API_URL;
        if (!API_URL) return "http://localhost:3000";
        
        let frontendUrl = API_URL;
        frontendUrl = frontendUrl.replace(/\/php(\/.*)?$/i, '');
        frontendUrl = frontendUrl.replace(/\/api(\/.*)?$/i, '');
        frontendUrl = frontendUrl.replace(/\/query\.php$/i, '');
        frontendUrl = frontendUrl.replace(/\/eventa\/src\/pages(\/.*)?$/i, '');
        frontendUrl = frontendUrl.replace(/\/eventa\/src(\/.*)?$/i, '');
        frontendUrl = frontendUrl.replace(/\/eventa(\/.*)?$/i, '');
        frontendUrl = frontendUrl.replace(/\/$/, '');
        
        if (frontendUrl.includes('localhost')) {
            try {
                const urlObj = new URL(frontendUrl);
                frontendUrl = `${urlObj.protocol}//${urlObj.host}`;
                if (frontendUrl === 'http://localhost' || frontendUrl === 'https://localhost') {
                    frontendUrl = 'http://localhost:3000';
                }
            } catch (e) {
                frontendUrl = 'http://localhost:3000';
            }
        }
        
        return frontendUrl;
    };
    
    const handlePreview = () => {
        if (eventId) {
            const frontendUrl = getBaseFrontendUrl();
            const previewUrl = isTicketEvent 
                ? `${frontendUrl}/ticketEvent_details?id=${eventId}`
                : `${frontendUrl}/rsvpForm?event_id=${eventId}`;
            window.open(previewUrl, "_blank");
            // mark preview completed
            updateChecklistItemByKey('preview', 1);
        }
    };
    
    const handlePublish = async () => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            
            if (isTicketEvent) {
                formData.append("function", "publishTicketEvent");
                // Calculate total capacity from ticket quantities
                const totalCapacity = (
                    parseInt(ticketConfig?.earlybird_quantity || 0) +
                    parseInt(ticketConfig?.general_quantity || 0) +
                    parseInt(ticketConfig?.vip_quantity || 0)
                );
                formData.append("guest_limit", totalCapacity);
                formData.append("published", 1);
            } else {
                formData.append("function", "updateEventStatus");
                formData.append("guest_limit", eventData?.guest_limit || 50);
                formData.append("published", 1);
            }
            
            formData.append("event_id", eventId);
            
            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });
            
            const data = await response.json();
            console.log("Publish response:", data);
            
            if (data.success) {
                setEventStatus("Published");
                printAlert("Event published successfully! You can now share it with guests.", "success");
                // mark publish completed
                updateChecklistItemByKey('publish', 1);
            } else {
                printAlert("Failed to publish event: " + (data.message || ''), "error");
            }
        } catch (err) {
            console.error("Error publishing event:", err);
            printAlert("Error publishing event.", "error");
        }
    };
    
    const handleShare = () => {
        if (eventId) {
            updateChecklistItemByKey('share', 1);
        }
        navigate(`/invitationPage`);
    };
    
    const handleSettings = () => {
        navigate(`/manage_my_event`);
    };
    
    const handleGuestInsights = () => {
        navigate(`/guest_insights`);
    };
    
    const handleExportReporting = () => {
        if (eventId) {
            updateChecklistItemByKey('export_report', 1);
        }
        navigate(`/guest_insights`);
    };
    
    const handleReviewAttendance = () => {
        if (eventId) {
            updateChecklistItemByKey('review_attendance', 1);
        }
        navigate(`/guest_insights`);
    };
    
    const handleThankYouEmails = () => {
        if (eventId) {
            updateChecklistItemByKey('thank_you', 1);
        }
        navigate(`/invitationPage`);
    };
    
    const copyEventLink = () => {
        const frontendUrl = getBaseFrontendUrl();
        const eventLink = isTicketEvent 
            ? `${frontendUrl}/ticketEvent_details?id=${eventId}`
            : `${frontendUrl}/rsvpForm?event_id=${eventId}`;
        navigator.clipboard.writeText(eventLink);
        printAlert("Event link copied to clipboard!", "success");
        updateChecklistItemByKey('share', 1);
    };
    
    // Calculate total capacity for ticket events
    const getTotalCapacity = () => {
        if (!isTicketEvent || !ticketConfig) return 0;
        return (
            parseInt(ticketConfig.earlybird_quantity || 0) +
            parseInt(ticketConfig.general_quantity || 0) +
            parseInt(ticketConfig.vip_quantity || 0)
        );
    };
    
    if (loading) {
        return (
            <div className="dashboard-container">
                <DashboardHeader user={user} eventStatus={eventStatus} onToggleSidebar={toggleSidebar} />
                <div className="loading-container">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p>Loading event checklist...</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="dashboard-container">
            {alert.show && (
                <div className={`custom-alert ${alert.type}`}>
                    <i className={`fas ${alert.type === "error" ? "fa-times-circle" : alert.type === "success" ? "fa-check-circle" : "fa-info-circle"}`}></i>
                    <span>{alert.message}</span>
                </div>
            )}
            
            <DashboardHeader
                user={user}
                eventStatus={eventStatus}
                onToggleSidebar={toggleSidebar}
            />
            
            {isTicketEvent ? (
                <DashboardTicketSidebar isMobileOpen={sidebarOpen} onClose={closeSidebar} />
            ) : (
                <DashboardSidebar isMobileOpen={sidebarOpen} onClose={closeSidebar} />
            )}
            
            <div className={`event-checklist-content ${isTicketEvent ? 'ticket-event' : 'rsvp-event'}`}>
                {/* Event Type Badge */}
                <div className="event-type-badge-header">
                    <span className={`badge ${isTicketEvent ? 'ticket-badge' : 'rsvp-badge'}`}>
                        <i className={`bi ${isTicketEvent ? 'bi-ticket-perforated' : 'bi-calendar-check'}`}></i>
                        {isTicketEvent ? "Ticket Event" : "RSVP Event"}
                    </span>
                </div>
                
                <div className="checklist-header">
                    <h1>Event Checklist</h1>
                    <p>Complete these steps to launch your event</p>
                </div>
                
                {/* Progress Bar */}
                <div className="progress-section">
                    <div className="progress-header">
                        <span className="progress-label">EVENT PROGRESS</span>
                        <span className="progress-percentage">{progress}%</span>
                    </div>
                    <div className="progress-bar-container">
                        <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
                
                {/* QUICK START Section - Collapsible */}
                <div className="checklist-section collapsible-section">
                    <div 
                        className="section-header-collapsible" 
                        onClick={() => toggleSection('quickStart')}
                    >
                        <div className="section-header-left">
                            <i className={`bi ${expandedSections.quickStart ? 'bi-chevron-down' : 'bi-chevron-right'} section-icon`}></i>
                            <h2 className="section-title">QUICK START</h2>
                        </div>
                        <div className="section-header-right">
                            {!expandedSections.quickStart && (
                                <span className="section-summary">Click to expand</span>
                            )}
                        </div>
                    </div>
                    
                    {expandedSections.quickStart && (
                        <div className="section-content">
                            {/* Event Website Builder - Navigate to page */}
                            <div className="checklist-item clickable-item">
                                <div className="item-header" onClick={() => navigate("/event-website-builder")}>
                                    <i className="bi bi-browser-chrome"></i>
                                    <h3>Event website</h3>
                                    <span className="item-badge">Create a website to showcase details about your event</span>
                                    <i className="bi bi-chevron-right arrow-icon"></i>
                                </div>
                            </div>
                            
                            {/* Form Builder - Navigate to page */}
                            <div className="checklist-item clickable-item">
                                <div className="item-header" onClick={() => navigate("/form-builder")}>
                                    <i className="bi bi-pencil-square"></i>
                                    <h3>Form builder</h3>
                                    <span className="item-badge">Customize your registration form</span>
                                    <i className="bi bi-chevron-right arrow-icon"></i>
                                </div>
                            </div>
                            
                            {/* Invite List - Navigate to page */}
                            <div className="checklist-item clickable-item">
                                <div className="item-header" onClick={() => navigate("/invitationPage")}>
                                    <i className="bi bi-envelope-paper"></i>
                                    <h3>Invite list (optional)</h3>
                                    <span className="item-badge">Add invitees to receive email invitations</span>
                                    <i className="bi bi-chevron-right arrow-icon"></i>
                                </div>
                            </div>

                            {/* Ticket Configuration - Only for ticket events */}
                            {isTicketEvent && (
                                <div className="checklist-item clickable-item">
                                    <div className="item-header" onClick={() => navigate("/manage_my_event")}>
                                        <i className="bi bi-ticket-perforated"></i>
                                        <h3>Configure Tickets</h3>
                                        <span className="item-badge">Set up ticket types, prices, and quantities</span>
                                        <i className="bi bi-chevron-right arrow-icon"></i>
                                    </div>
                                </div>
                            )}

                            {/* Checklist items for Quick Start */}
                            <div className="checklist-group">
                                {checklistItems.filter(i => i.category === 'Quick Start').map(item => (
                                    <div key={item.id} className="checklist-row">
                                        <label>
                                            <input type="checkbox" checked={item.completed == 1 || item.completed === '1'} onChange={() => toggleChecklistItem(item)} />
                                            <span className="checklist-title">{item.title}</span>
                                        </label>
                                        <small className="checklist-desc">{item.description}</small>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* LAUNCH Section - Collapsible */}
                <div className="checklist-section collapsible-section">
                    <div 
                        className="section-header-collapsible" 
                        onClick={() => toggleSection('launch')}
                    >
                        <div className="section-header-left">
                            <i className={`bi ${expandedSections.launch ? 'bi-chevron-down' : 'bi-chevron-right'} section-icon`}></i>
                            <h2 className="section-title">LAUNCH</h2>
                        </div>
                        <div className="section-header-right">
                            {!expandedSections.launch && (
                                <span className="section-summary">Click to expand</span>
                            )}
                        </div>
                    </div>
                    
                    {expandedSections.launch && (
                        <div className="section-content">
                            {/* Show ticket event specific info */}
                            {isTicketEvent && ticketConfig && (
                                <div className="ticket-capacity-info">
                                    <i className="bi bi-info-circle"></i>
                                    <span>Total ticket capacity: {getTotalCapacity()} tickets</span>
                                </div>
                            )}
                            
                            <div className="launch-actions">
                                <div className="launch-card" onClick={handlePreview}>
                                    <i className="bi bi-eye launch-icon"></i>
                                    <h3>Preview</h3>
                                    <p>Test out the full experience from start to finish</p>
                                    <button className="action-btn secondary">Preview Event</button>
                                </div>
                                
                                <div className="launch-card" onClick={handlePublish}>
                                    <i className="bi bi-cloud-upload launch-icon"></i>
                                    <h3>Publish</h3>
                                    <p>Make your event link live and start collecting responses</p>
                                    {eventStatus === "Published" ? (
                                        <div className="published-badge">
                                            <i className="bi bi-check-circle"></i> Published
                                        </div>
                                    ) : (
                                        <button className="action-btn primary">Publish Event</button>
                                    )}
                                </div>
                                
                                <div className="launch-card" onClick={() => handleShare()}>
                                    <i className="bi bi-share launch-icon"></i>
                                    <h3>Share & Invite</h3>
                                    <p>Share your event link or send email invitations</p>
                                    <div className="share-buttons">
                                        <button 
                                            className="action-btn secondary" 
                                            onClick={(e) => { e.stopPropagation(); copyEventLink(); }}
                                        >
                                            Copy Link
                                        </button>
                                        <button 
                                            className="action-btn primary" 
                                            onClick={(e) => { e.stopPropagation(); handleShare(); }}
                                        >
                                            Send Invites
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Checklist items for Launch */}
                            <div className="checklist-group">
                                {checklistItems.filter(i => i.category === 'Launch').map(item => (
                                    <div key={item.id} className="checklist-row">
                                        <label>
                                            <input type="checkbox" checked={item.completed == 1 || item.completed === '1'} onChange={() => toggleChecklistItem(item)} />
                                            <span className="checklist-title">{item.title}</span>
                                        </label>
                                        <small className="checklist-desc">{item.description}</small>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* ORGANIZE Section - Collapsible */}
                <div className="checklist-section collapsible-section">
                    <div 
                        className="section-header-collapsible" 
                        onClick={() => toggleSection('organize')}
                    >
                        <div className="section-header-left">
                            <i className={`bi ${expandedSections.organize ? 'bi-chevron-down' : 'bi-chevron-right'} section-icon`}></i>
                            <h2 className="section-title">ORGANIZE</h2>
                        </div>
                        <div className="section-header-right">
                            {!expandedSections.organize && (
                                <span className="section-summary">Click to expand</span>
                            )}
                        </div>
                    </div>
                    
                    {expandedSections.organize && (
                        <div className="section-content">
                            <div className="organize-grid">
                                <div className="organize-card" onClick={handleGuestInsights}>
                                    <i className="bi bi-bar-chart"></i>
                                    <h4>Reporting</h4>
                                    <p>Review and export all event response data</p>
                                </div>
                                
                                <div className="organize-card" onClick={handleSettings}>
                                    <i className="bi bi-sliders2"></i>
                                    <h4>Event Settings</h4>
                                    <p>Manage event details, capacity, and tickets</p>
                                </div>
                                
                                <div className="organize-card" onClick={() => navigate('/event-checkin')} style={{cursor: 'pointer'}}>
                                    <i className="bi bi-qr-code"></i>
                                    <h4>Check-in</h4>
                                    <p>Check-in guests by name, email, or QR code</p>
                                </div>
                                
                                {/* Ticket Management - Only for ticket events */}
                                {isTicketEvent && (
                                    <div className="organize-card" onClick={() => navigate('/manage_my_event')}>
                                        <i className="bi bi-ticket-perforated"></i>
                                        <h4>Ticket Management</h4>
                                        <p>Manage ticket types, prices, and availability</p>
                                    </div>
                                )}
                            </div>

                            {/* Checklist items for Organize */}
                            <div className="checklist-group">
                                {checklistItems.filter(i => i.category === 'Organize').map(item => (
                                    <div key={item.id} className="checklist-row">
                                        <label>
                                            <input type="checkbox" checked={item.completed == 1 || item.completed === '1'} onChange={() => toggleChecklistItem(item)} />
                                            <span className="checklist-title">{item.title}</span>
                                        </label>
                                        <small className="checklist-desc">{item.description}</small>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* FOLLOW UP Section - Collapsible */}
                <div className="checklist-section collapsible-section">
                    <div 
                        className="section-header-collapsible" 
                        onClick={() => toggleSection('followUp')}
                    >
                        <div className="section-header-left">
                            <i className={`bi ${expandedSections.followUp ? 'bi-chevron-down' : 'bi-chevron-right'} section-icon`}></i>
                            <h2 className="section-title">FOLLOW UP</h2>
                        </div>
                        <div className="section-header-right">
                            {!expandedSections.followUp && (
                                <span className="section-summary">Click to expand</span>
                            )}
                        </div>
                    </div>
                    
                    {expandedSections.followUp && (
                        <div className="section-content">
                            <div className="followup-actions">
                                <div className="followup-item" onClick={handleExportReporting}>
                                    <i className="bi bi-download"></i>
                                    <span>Export reporting</span>
                                </div>
                                <div className="followup-item" onClick={handleReviewAttendance}>
                                    <i className="bi bi-people"></i>
                                    <span>Review attendance</span>
                                </div>
                                <div className="followup-item" onClick={handleThankYouEmails}>
                                    <i className="bi bi-envelope-heart"></i>
                                    <span>Send thank you emails</span>
                                </div>
                            </div>

                            {/* Checklist items for Follow Up */}
                            <div className="checklist-group">
                                {checklistItems.filter(i => i.category === 'Follow Up').map(item => (
                                    <div key={item.id} className="checklist-row">
                                        <label>
                                            <input type="checkbox" checked={item.completed == 1 || item.completed === '1'} onChange={() => toggleChecklistItem(item)} />
                                            <span className="checklist-title">{item.title}</span>
                                        </label>
                                        <small className="checklist-desc">{item.description}</small>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Action Buttons Footer */}
                <div className="checklist-footer">
                    <button className="footer-btn secondary" onClick={handleSettings}>
                        <i className="bi bi-gear"></i> EVENT SETTINGS
                    </button>
                    <button className="footer-btn secondary" onClick={handlePreview}>
                        <i className="bi bi-eye"></i> PREVIEW
                    </button>
                    {eventStatus !== "Published" && (
                        <button className="footer-btn primary" onClick={handlePublish}>
                            <i className="bi bi-cloud-upload"></i> PUBLISH
                        </button>
                    )}
                    <button className="footer-btn primary" onClick={handleShare}>
                        <i className="bi bi-envelope"></i> SHARE & INVITE
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EventChecklist;