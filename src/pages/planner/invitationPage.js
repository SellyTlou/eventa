import React, { useState, useEffect, useRef } from "react";
import "./main.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import { logOut } from "../components";
import '../../alert.css';

const InvitationPage = () => {
    const [emailInput, setEmailInput] = useState("");
    const [emailList, setEmailList] = useState([]);
    const [emailError, setEmailError] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [sendSuccess, setSendSuccess] = useState(false);
    const [copySuccess, setCopySuccess] = useState("");
    const navigate = useNavigate();
    const [event_id, setEventId] = useState("");
    const [searchParams] = useSearchParams();
    const [eventStatus, setEventStatus] = useState("");
    const dropdownRef = useRef(null);
    const [user, setUser] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const [alert, setAlert] = useState({ show: false, message: "", type: "" });
    
        const printAlert = (message, type = "info") => {
            setAlert({ show: true, message, type });
            setTimeout(() => {
                setAlert({ show: false, message: "", type: "" });
            }, 5000);
        };
    

    const API_URL = process.env.REACT_APP_API_URL;
    let baseURL = "";

    if (API_URL) {
        if (API_URL.includes("localhost")) {
            baseURL = "http://localhost:3000/";
        } else {
            baseURL = API_URL.replace(/\/(php|api)(\/.*)?$/i, "/");
            baseURL = baseURL.replace(/\/query\.php$/i, "/");
        }
    } else {
        baseURL = "http://localhost:3000/";
    }

    const invitationLink = event_id
        ? `${baseURL}rsvpForm?event_id=${event_id}&user_email=${user.email}`
        : "";

    useEffect(() => {
        const id = localStorage.getItem("selectedEventId");
        const storedUser = localStorage.getItem("user");

        if (id && storedUser) {
            setUser(JSON.parse(storedUser));
            setEventId(id);
            fetchEventStatusByID(id);
        }

        if (!id) navigate("/eventsDashboard");
        if (!storedUser) {
            printAlert("Session expired. Please log in again.", "error");
            logOut();
            navigate("/");
            return;
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
    }, [searchParams]);

    const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const goToHome = () => navigate("/eventsDashboard");
    const goToEventManagement = () => navigate(`/eventManagement`);
    const goToInvitations = () => navigate(`/invitationPage`);
    const goToManage = () => navigate(`/manage_my_event`);
    const goToGuestInsights = () => navigate("/guest_insights");
    const goToAttendanceStats = () => navigate("/attendance_stats");
    const goToProfile = () => navigate("/Profile");

    const fetchEventStatusByID = async (eventId) => {
        try {
            const formData = new FormData();
            formData.append("function", "getEventStatusByID");
            formData.append("event_id", eventId);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            const data = await response.json();
            if (data.success && data.status) {
                setEventStatus(data.status.published == 1 ? "Published" : "Unpublished");
            } else {
                setEventStatus("Unknown");
            }
        } catch (err) {
            console.error("Failed to fetch event status:", err);
        }
    };

    const addEmail = () => {
        if (!emailInput.trim()) return;
        const emails = emailInput
            .split(",")
            .map((email) => email.trim())
            .filter((email) => email.length > 0);

        const validEmails = [];
        const invalidEmails = [];

        emails.forEach((email) =>
            isValidEmail(email) ? validEmails.push(email) : invalidEmails.push(email)
        );

        if (invalidEmails.length > 0) {
            setEmailError(`Invalid email format: ${invalidEmails.join(", ")}`);
            return;
        }

        setEmailList([...emailList, ...validEmails]);
        setEmailInput("");
        setEmailError("");
    };

    const shareViaWhatsApp = () => {
        if (!invitationLink) return;
        const message = `You're invited!\nJoin the event using this link:\n${invitationLink}`;
        const whatsappURL = `https://wa.me/?text=${message}`;
        window.open(whatsappURL, "_blank");
    };


    const removeEmail = (emailToRemove) =>
        setEmailList(emailList.filter((email) => email !== emailToRemove));

    const handleKeyPress = (e) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addEmail();
        }
    };

    const sendInvitations = async () => {
        if (emailList.length === 0) {
            printAlert("Please add at least one email address", "error");
            return;
        }

        setIsSending(true);
        setEmailError("");

        const fetchEventName = async () => {
            if (!event_id) return "Evenda Event";
            try {
                const fd = new FormData();
                fd.append("function", "getEventById");
                fd.append("event_id", event_id);
                const resp = await fetch(`${API_URL}/query.php`, {
                    method: "POST",
                    body: fd,
                });
                const text = await resp.text();
                const json = JSON.parse(text);
                if (json.success && json.events?.length > 0) {
                    return json.events[0].event_name || `Event ${event_id}`;
                }
            } catch (err) {
                console.warn("Failed to fetch event name:", err);
                printAlert("Failed to fetch event name", "warning");
            }
            return "Evenda Event";
        };

        const eventName = await fetchEventName();
        const guestsArr = emailList.map((email) => ({
            name: email.split("@")[0],
            email,
        }));

        let successCount = 0;
        const failures = [];

        for (const guest of guestsArr) {
            try {
                const fd = new FormData();
                fd.append("email", guest.email);
                fd.append("name", guest.name);
                fd.append("event", event_id);
                fd.append("API_URL", API_URL);
                fd.append("user_email", user.email);
                const resp = await fetch(`${API_URL}/send_invite.php`, {
                    method: "POST",
                    body: fd,
                });

                const text = await resp.text();
                let parsed;
                try {
                    parsed = JSON.parse(text);
                } catch {
                    failures.push({
                        guest: guest.email,
                        reason: "Non-JSON response from server",
                        raw: text.slice(0, 200),
                    });
                    continue;
                }

                if (parsed.success) successCount++;
                else {
                    failures.push({
                        guest: guest.email,
                        reason: parsed?.message || "Unknown error",
                    });
                }
            } catch (err) {
                failures.push({ guest: guest.email, reason: err.message });
            }
        }

        setIsSending(false);

        if (failures.length === 0) {
            setSendSuccess(true);
            setEmailList([]);
            setTimeout(() => setSendSuccess(false), 3000);
            printAlert(`Invitations sent successfully to ${successCount} recipient(s).`, "success");
        } else {
            setEmailError(`${successCount} sent, ${failures.length} failed. Check console.`);
            console.error("Invitation failures:", failures);
        }
    };

    const toggleDropdown = () => setDropdownOpen((prev) => !prev);

    const copyLink = () => {
        if (!invitationLink) {
            setCopySuccess("No link available");
            return;
        }
        navigator.clipboard
            .writeText(invitationLink)
            .then(() => {
                setCopySuccess("Link copied to clipboard!");
                setTimeout(() => setCopySuccess(""), 3000);
            })
            .catch((err) => {
                console.error("Copy failed:", err);
                setCopySuccess("Failed to copy link");
            });
    };

    const handlePublishNow = () => navigate(`/manage_my_event`);

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
            <div className="dashboard-header">
                <h1>Evenda</h1>
                <div className="header-tabs">
                    <button className={`status-btn status-${eventStatus.toLowerCase()}`}>{eventStatus}</button>                    <div ref={dropdownRef} className={`profile-container ${dropdownOpen ? "open" : ""}`} onClick={toggleDropdown}>
                        <i className="bi bi-person-circle"></i>
                        <span>{user?.name || "Guest"}</span>
                        <i className="bi bi-chevron-bar-down"></i>
                        {dropdownOpen && (
                            <div className="dropdown-menu show">
                                <button className="dropdown-item" onClick={goToProfile}><i className="bi bi-person"></i>Profile</button>
                                <button className="dropdown-item" onClick={logOut}><i className="bi bi-box-arrow-right"></i>Logout</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* SIDEBAR */}
            <div className="dashboard-sidebar">
                <div className="sidebar-header"><h3>Event Management</h3></div>
                <div className="sidebar-section">
                    <h4>Event Planning</h4>
                    <ul>
                        <li onClick={goToHome}><i className="bi bi-house"></i>Dashboard</li>
                        <li onClick={goToManage}><i className="bi bi-megaphone"></i>Publish Event</li>
                        <li className="active" onClick={goToInvitations}><i className="bi bi-send"></i>Send Invitations</li>
                        <li onClick={goToEventManagement}><i className="bi bi-list-check"></i>RSVP Responses</li>
                    </ul>
                </div>
                <div className="sidebar-section">
                    <h4>Event Analytics</h4>
                    <ul>
                        <li onClick={goToAttendanceStats}><i className="bi bi-graph-up"></i>Attendance Stats</li>
                        <li onClick={goToGuestInsights}><i className="bi bi-people"></i>Guest Insights</li>
                    </ul>
                </div>
            </div>

            <div className="invitation-content">
                {eventStatus === "Unpublished" && (
                    <div className="unpublished-overlay">
                        <div className="overlay-content">
                            <div className="overlay-icon">📧</div>
                            <h3>Publish Your Event to Send Invitations</h3>
                            <p>
                                You need to publish your event before you can send invitations to guests.
                            </p>
                            <button className="publish-now-btn" onClick={handlePublishNow}>
                                Publish Event Now
                            </button>
                        </div>
                    </div>
                )}

                <div
                    className={`content-container ${eventStatus === "Unpublished" ? "disabled" : ""}`}
                >
                    <div className="content-header">
                        <h2>Send Invitations</h2>
                        <p>Invite guests to your event via email or shareable link</p>
                    </div>

                    <div className="invitation-cards">
                        {/* Email Invitations */}
                        <div className="invitation-card">
                            <div className="card-header">
                                <h3>Email Invitations</h3>
                                <div className="email-icon">✉️</div>
                            </div>
                            <div className="card-body">
                                <div className="email-input-container">
                                    <label htmlFor="email-input">
                                        Enter email addresses (separate with commas)
                                    </label>
                                    <div className="input-with-button">
                                        <input
                                            id="email-input"
                                            type="text"
                                            value={emailInput}
                                            onChange={(e) => setEmailInput(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            placeholder="guest1@example.com, guest2@example.com"
                                            className={emailError ? "error" : ""}
                                        />
                                        <button onClick={addEmail} className="add-email-btn">
                                            Add
                                        </button>
                                    </div>
                                    {emailError && <div className="error-message">{emailError}</div>}
                                </div>

                                {emailList.length > 0 && (
                                    <div className="email-list">
                                        <h4>Recipients ({emailList.length})</h4>
                                        <div className="email-chips">
                                            {emailList.map((email, i) => (
                                                <div key={i} className="email-chip">
                                                    {email}
                                                    <button
                                                        onClick={() => removeEmail(email)}
                                                        className="remove-email"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={sendInvitations}
                                    className="send-invites-btn"
                                    disabled={emailList.length === 0 || isSending}
                                >
                                    {isSending ? (
                                        <>
                                            <span className="spinner"></span> Sending...
                                        </>
                                    ) : (
                                        `Send Invitations to ${emailList.length}`
                                    )}
                                </button>

                                {sendSuccess && (
                                    <div className="success-message">
                                        ✅ Invitations sent successfully!
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Shareable Link */}
                        <div className="invitation-card">
                            <div className="card-header">
                                <h3>Shareable Link</h3>
                                <div className="link-icon">🔗</div>
                            </div>
                            <div className="card-body">
                                <p>Share this link with your guests directly</p>
                                <div className="link-container">
                                    <input
                                        type="text"
                                        value={invitationLink}
                                        readOnly
                                        className="link-input"
                                    />
                                    <button onClick={copyLink} className="copy-link-btn">
                                        Copy Link
                                    </button>
                                </div>
                                {copySuccess && (
                                    <div className="success-message">{copySuccess}</div>
                                )}
                            </div>
                        </div>

                        <div className="share-options">
                            <p>Or share directly to:</p>
                            <div className="social-buttons">
                                <button
                                    className="social-btn whatsapp"
                                    onClick={shareViaWhatsApp}
                                    disabled={eventStatus === "Unpublished"}
                                >
                                    WhatsApp
                                </button>
                                <button
                                    className="social-btn facebook"
                                    onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(invitationLink)}`, "_blank")}
                                    disabled={eventStatus === "Unpublished"}
                                >
                                    Facebook
                                </button>
                                <button
                                    className="social-btn twitter"
                                    onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(invitationLink)}&text=${encodeURIComponent("You're invited! 🎉")}`, "_blank")}
                                    disabled={eventStatus === "Unpublished"}
                                >
                                    Twitter
                                </button>
                                <button
                                    className="social-btn email"
                                    onClick={() => window.open(`mailto:?subject=You're invited!&body=${encodeURIComponent(`Join the event using this link:\n${invitationLink}`)}`)}
                                    disabled={eventStatus === "Unpublished"}
                                >
                                    Email
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvitationPage;
