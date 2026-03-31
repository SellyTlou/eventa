// InviteListManager.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LoginNav } from "../components";
import "./inviteListManager.css";
import "../../alert.css";

const InviteListManager = () => {
    const navigate = useNavigate();
    const [eventId, setEventId] = useState(null);
    const [eventData, setEventData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [inviteList, setInviteList] = useState([]);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteName, setInviteName] = useState("");
    const [sendingInvites, setSendingInvites] = useState(false);
    const [bulkEmails, setBulkEmails] = useState("");
    const [exclusiveMode, setExclusiveMode] = useState(false);
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
        fetchInviteList(storedEventId);
        loadSettings(storedEventId);
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
        }
    };

    const fetchInviteList = async (eventId) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "getEventInviteList");
            formData.append("event_id", eventId);
            
            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });
            
            const data = await response.json();
            if (data.success && data.invites) {
                setInviteList(data.invites);
            }
        } catch (err) {
            console.error("Error fetching invite list:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadSettings = async (eventId) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "getEventInviteSettings");
            formData.append("event_id", eventId);
            
            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });
            
            const data = await response.json();
            if (data.success && data.settings) {
                setExclusiveMode(data.settings.exclusive_mode || false);
            }
        } catch (err) {
            console.error("Error loading settings:", err);
        }
    };

    const addToInviteList = async () => {
        if (!inviteEmail.trim()) {
            printAlert("Please enter an email address", "warning");
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(inviteEmail)) {
            printAlert("Please enter a valid email address", "warning");
            return;
        }
        
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "addEventInvite");
            formData.append("event_id", eventId);
            formData.append("email", inviteEmail);
            formData.append("name", inviteName);
            
            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });
            
            const data = await response.json();
            if (data.success) {
                setInviteList([...inviteList, { id: data.invite_id, email: inviteEmail, name: inviteName, invitation_sent: 0 }]);
                setInviteEmail("");
                setInviteName("");
                printAlert("Invite added to list!", "success");
            } else {
                printAlert(data.message || "Failed to add invite.", "error");
            }
        } catch (err) {
            console.error("Error adding invite:", err);
            printAlert("Error adding invite.", "error");
        }
    };

    const removeFromInviteList = async (email) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "removeEventInvite");
            formData.append("event_id", eventId);
            formData.append("email", email);
            
            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });
            
            const data = await response.json();
            if (data.success) {
                setInviteList(inviteList.filter(invite => invite.email !== email));
                printAlert("Invite removed.", "success");
            } else {
                printAlert("Failed to remove invite.", "error");
            }
        } catch (err) {
            console.error("Error removing invite:", err);
            printAlert("Error removing invite.", "error");
        }
    };

    const sendBulkInvites = async () => {
        if (inviteList.length === 0) {
            printAlert("No guests to invite. Add guests to your invite list first.", "warning");
            return;
        }
        
        const unsentInvites = inviteList.filter(invite => !invite.invitation_sent);
        if (unsentInvites.length === 0) {
            printAlert("All guests have already been invited.", "info");
            return;
        }
        
        setSendingInvites(true);
        
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "sendBulkInvites");
            formData.append("event_id", eventId);
            formData.append("user_id", JSON.parse(localStorage.getItem("user")).user_id);
            formData.append("API_URL", API_URL);
            
            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });
            
            const data = await response.json();
            
            if (data.success) {
                printAlert(`Successfully sent ${data.sent} of ${data.total} invitations!`, "success");
                fetchInviteList(eventId);
            } else {
                printAlert(data.message || "Failed to send invitations", "error");
            }
        } catch (err) {
            console.error("Error sending bulk invites:", err);
            printAlert("Error sending invitations. Please try again.", "error");
        } finally {
            setSendingInvites(false);
        }
    };

    const importBulkEmails = () => {
        if (!bulkEmails.trim()) {
            printAlert("Please enter emails", "warning");
            return;
        }
        
        const emails = bulkEmails.split(/[\n,]/).map(e => e.trim()).filter(e => e);
        let added = 0;
        let invalid = 0;
        
        emails.forEach(async (email) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailRegex.test(email)) {
                try {
                    const API_URL = process.env.REACT_APP_API_URL;
                    const formData = new FormData();
                    formData.append("function", "addEventInvite");
                    formData.append("event_id", eventId);
                    formData.append("email", email);
                    formData.append("name", email.split('@')[0]);
                    
                    await fetch(`${API_URL}/query.php`, {
                        method: "POST",
                        body: formData,
                    });
                    added++;
                } catch (err) {
                    console.error("Error adding email:", err);
                }
            } else {
                invalid++;
            }
        });
        
        setTimeout(() => {
            fetchInviteList(eventId);
            printAlert(`Added ${added} guests. ${invalid} invalid emails skipped.`, "success");
            setBulkEmails("");
        }, 1000);
    };

    const saveExclusiveMode = async () => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "saveEventInviteSettings");
            formData.append("event_id", eventId);
            formData.append("exclusive_mode", exclusiveMode ? "1" : "0");
            
            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });
            
            const data = await response.json();
            if (data.success) {
                printAlert("Settings saved!", "success");
            }
        } catch (err) {
            console.error("Error saving settings:", err);
        }
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
                <p>Loading invite list...</p>
            </div>
        );
    }

    return (
        <>
            <LoginNav />
            <div className="invite-list-page">
                {alert.show && (
                    <div className={`custom-alert ${alert.type}`}>
                        <i className={`fas ${alert.type === "error" ? "fa-times-circle" : alert.type === "success" ? "fa-check-circle" : "fa-info-circle"}`}></i>
                        <span>{alert.message}</span>
                    </div>
                )}
                
                <div className="invite-list-container">
                    {/* Breadcrumb */}
                    <div className="breadcrumb">
                        <button className="breadcrumb-link" onClick={goBack}>azishe</button>
                        <span className="breadcrumb-separator"> &gt; </span>
                        <button className="breadcrumb-link" onClick={goBack}>Setup</button>
                        <span className="breadcrumb-separator"> &gt; </span>
                        <span className="breadcrumb-current">Invite List Manager</span>
                    </div>
                    
                    <div className="invite-list-main">
                        {/* Left Panel - Add Guests */}
                        <div className="invite-list-left">
                            <h3>Add Guests</h3>
                            
                            <div className="add-single-guest">
                                <h4>Add Single Guest</h4>
                                <input
                                    type="text"
                                    placeholder="Guest name (optional)"
                                    value={inviteName}
                                    onChange={(e) => setInviteName(e.target.value)}
                                    className="form-input"
                                />
                                <input
                                    type="email"
                                    placeholder="Email address *"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="form-input"
                                />
                                <button className="add-btn" onClick={addToInviteList}>
                                    <i className="bi bi-plus"></i> Add to List
                                </button>
                            </div>
                            
                            <div className="bulk-import">
                                <h4>Bulk Import</h4>
                                <textarea
                                    placeholder="Enter email addresses (one per line or comma separated)"
                                    value={bulkEmails}
                                    onChange={(e) => setBulkEmails(e.target.value)}
                                    rows={5}
                                    className="form-textarea"
                                />
                                <button className="import-btn" onClick={importBulkEmails}>
                                    <i className="bi bi-file-text"></i> Import Emails
                                </button>
                            </div>
                            
                            <div className="exclusive-mode">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={exclusiveMode}
                                        onChange={(e) => setExclusiveMode(e.target.checked)}
                                    />
                                    <span>Make event exclusive - only invited guests can RSVP</span>
                                </label>
                                <button className="save-settings-btn" onClick={saveExclusiveMode}>
                                    Save Settings
                                </button>
                            </div>
                        </div>
                        
                        {/* Right Panel - Guest List */}
                        <div className="invite-list-right">
                            <div className="guest-list-header">
                                <h3>Guest List ({inviteList.length})</h3>
                                {inviteList.length > 0 && (
                                    <button 
                                        className="send-all-btn" 
                                        onClick={sendBulkInvites}
                                        disabled={sendingInvites}
                                    >
                                        {sendingInvites ? (
                                            <>Sending...</>
                                        ) : (
                                            <><i className="bi bi-envelope-paper"></i> Send All Invitations</>
                                        )}
                                    </button>
                                )}
                            </div>
                            
                            <div className="guest-list">
                                {inviteList.length > 0 ? (
                                    inviteList.map((invite, idx) => (
                                        <div key={idx} className="guest-item">
                                            <div className="guest-info">
                                                <div className="guest-name">
                                                    <strong>{invite.name || invite.email.split('@')[0]}</strong>
                                                    {invite.invitation_sent && (
                                                        <span className="invited-badge">✓ Invited</span>
                                                    )}
                                                </div>
                                                <span className="guest-email">{invite.email}</span>
                                            </div>
                                            <button 
                                                className="remove-guest-btn"
                                                onClick={() => removeFromInviteList(invite.email)}
                                            >
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state">
                                        <i className="bi bi-envelope"></i>
                                        <p>No guests added yet</p>
                                        <p className="helper-text">Add guests using the form on the left</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Footer Actions */}
                    <div className="invite-list-footer">
                        <button className="back-btn" onClick={goBack}>
                            <i className="bi bi-arrow-left"></i> Back to Checklist
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default InviteListManager;