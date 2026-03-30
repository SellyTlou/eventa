// EventWebsiteBuilder.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LoginNav } from "../components";
import "./eventWebsiteBuilder.css";
import "../../alert.css";

const EventWebsiteBuilder = () => {
    const navigate = useNavigate();
    const [eventId, setEventId] = useState(null);
    const [eventData, setEventData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [websiteSettings, setWebsiteSettings] = useState({
        showWebsite: true,
        customUrl: "",
        showSchedule: true,
        showMap: true,
        showGallery: true,
        showRSVP: true,
        themeColor: "#667eea",
        customCSS: ""
    });
    const [alert, setAlert] = useState({ show: false, message: "", type: "" });

    const printAlert = (message, type = "info") => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert({ show: false, message: "", type: "" }), 5000);
    };

    useEffect(() => {
        const storedEventId = localStorage.getItem("selectedEventId");
        if (!storedEventId) {
            printAlert("No event selected", "error");
            navigate("/event-checklist");
            return;
        }
        setEventId(storedEventId);
        fetchEventDetails(storedEventId);
        loadWebsiteSettings(storedEventId);
    }, [navigate]);

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
            
            const data = await response.json();
            if (data.success && data.events && data.events.length > 0) {
                setEventData(data.events[0]);
            }
        } catch (err) {
            console.error("Error fetching event details:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadWebsiteSettings = async (eventId) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "getEventWebsiteSettings");
            formData.append("event_id", eventId);
            
            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });
            
            const data = await response.json();
            if (data.success && data.settings) {
                setWebsiteSettings(data.settings);
            }
        } catch (err) {
            console.error("Error loading website settings:", err);
        }
    };

    const saveWebsiteSettings = async () => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "saveEventWebsiteSettings");
            formData.append("event_id", eventId);
            formData.append("settings", JSON.stringify(websiteSettings));
            
            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });
            
            const data = await response.json();
            if (data.success) {
                printAlert("Website settings saved successfully!", "success");
                setTimeout(() => navigate("/event-checklist"), 1500);
            } else {
                printAlert("Failed to save settings.", "error");
            }
        } catch (err) {
            console.error("Error saving website settings:", err);
            printAlert("Error saving settings.", "error");
        }
    };

    const previewWebsite = () => {
        if (eventId) {
            const frontendUrl = getBaseFrontendUrl();
            const previewUrl = `${frontendUrl}/event-website/${eventId}`;
            window.open(previewUrl, "_blank");
        }
    };

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

    const goBack = () => {
        navigate("/event-checklist");
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p>Loading website builder...</p>
            </div>
        );
    }

    return (
        <>
            <LoginNav />
            <div className="website-builder-page">
                {alert.show && (
                    <div className={`custom-alert ${alert.type}`}>
                        <i className={`fas ${alert.type === "error" ? "fa-times-circle" : alert.type === "success" ? "fa-check-circle" : "fa-info-circle"}`}></i>
                        <span>{alert.message}</span>
                    </div>
                )}
                
                <div className="website-builder-container">
                    {/* Breadcrumb */}
                    <div className="breadcrumb">
                        <button className="breadcrumb-link" onClick={goBack}>azishe</button>
                        <span className="breadcrumb-separator"> &gt; </span>
                        <button className="breadcrumb-link" onClick={goBack}>Setup</button>
                        <span className="breadcrumb-separator"> &gt; </span>
                        <span className="breadcrumb-current">Event Website Builder</span>
                    </div>
                    
                    <div className="website-builder-main">
                        {/* Left Sidebar */}
                        <div className="website-builder-sidebar">
                            <div className="sidebar-section">
                                <h3>Website Settings</h3>
                                <div className="settings-list">
                                    <label className="setting-item">
                                        <input
                                            type="checkbox"
                                            checked={websiteSettings.showWebsite}
                                            onChange={(e) => setWebsiteSettings({...websiteSettings, showWebsite: e.target.checked})}
                                        />
                                        <span>Enable Event Website</span>
                                    </label>
                                    <label className="setting-item">
                                        <input
                                            type="checkbox"
                                            checked={websiteSettings.showSchedule}
                                            onChange={(e) => setWebsiteSettings({...websiteSettings, showSchedule: e.target.checked})}
                                        />
                                        <span>Show Schedule</span>
                                    </label>
                                    <label className="setting-item">
                                        <input
                                            type="checkbox"
                                            checked={websiteSettings.showMap}
                                            onChange={(e) => setWebsiteSettings({...websiteSettings, showMap: e.target.checked})}
                                        />
                                        <span>Show Map</span>
                                    </label>
                                    <label className="setting-item">
                                        <input
                                            type="checkbox"
                                            checked={websiteSettings.showGallery}
                                            onChange={(e) => setWebsiteSettings({...websiteSettings, showGallery: e.target.checked})}
                                        />
                                        <span>Show Gallery</span>
                                    </label>
                                    <label className="setting-item">
                                        <input
                                            type="checkbox"
                                            checked={websiteSettings.showRSVP}
                                            onChange={(e) => setWebsiteSettings({...websiteSettings, showRSVP: e.target.checked})}
                                        />
                                        <span>Show RSVP Form</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div className="sidebar-section">
                                <h3>Custom URL</h3>
                                <input
                                    type="text"
                                    value={websiteSettings.customUrl}
                                    onChange={(e) => setWebsiteSettings({...websiteSettings, customUrl: e.target.value})}
                                    placeholder="custom-url"
                                    className="form-input"
                                />
                                <p className="helper-text">.eventa.com/{websiteSettings.customUrl || "your-event"}</p>
                            </div>
                            
                            <div className="sidebar-section">
                                <h3>Theme Color</h3>
                                <input
                                    type="color"
                                    value={websiteSettings.themeColor}
                                    onChange={(e) => setWebsiteSettings({...websiteSettings, themeColor: e.target.value})}
                                    className="color-picker"
                                />
                            </div>
                        </div>
                        
                        {/* Main Content - Website Preview */}
                        <div className="website-builder-preview">
                            <h3>Live Preview</h3>
                            <div className="website-preview" style={{ borderTop: `4px solid ${websiteSettings.themeColor}` }}>
                                <div className="preview-header">
                                    <h2>{eventData?.event_name || "Your Event"}</h2>
                                    {eventData?.event_start_date && (
                                        <p><i className="bi bi-calendar3"></i> {new Date(eventData.event_start_date).toLocaleDateString()}</p>
                                    )}
                                </div>
                                
                                {websiteSettings.showSchedule && (
                                    <div className="preview-section">
                                        <h4>Schedule</h4>
                                        <div className="schedule-placeholder">
                                            <p>Event schedule will appear here</p>
                                        </div>
                                    </div>
                                )}
                                
                                {websiteSettings.showMap && (
                                    <div className="preview-section">
                                        <h4>Location</h4>
                                        <div className="map-placeholder">
                                            <p>{eventData?.event_location || "Location TBD"}</p>
                                        </div>
                                    </div>
                                )}
                                
                                {websiteSettings.showRSVP && (
                                    <div className="preview-section">
                                        <h4>RSVP</h4>
                                        <button className="rsvp-button" style={{ background: websiteSettings.themeColor }}>
                                            RSVP Now
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Footer Actions */}
                    <div className="website-builder-footer">
                        <button className="back-btn" onClick={goBack}>
                            <i className="bi bi-arrow-left"></i> Back to Checklist
                        </button>
                        <button className="preview-btn" onClick={previewWebsite}>
                            <i className="bi bi-eye"></i> Preview Website
                        </button>
                        <button className="save-btn" onClick={saveWebsiteSettings}>
                            <i className="bi bi-check-lg"></i> Save Settings
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default EventWebsiteBuilder;