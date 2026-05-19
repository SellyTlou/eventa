import React, { useState, useEffect, useRef } from "react";
import "./main.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import { logOut, DashboardHeader, DashboardSidebar, DashboardTicketSidebar } from "../components";
import '../../alert.css';
import { set } from "react-hook-form";

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
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [eventDetails, setEventDetails] = useState(null);
    const [isTicketEvent, setIsTicketEvent] = useState(false);
  

    const [alert, setAlert] = useState({ show: false, message: "", type: "" });

    const printAlert = (message, type = "info") => {
        setAlert({ show: true, message, type });
        setTimeout(() => {
            setAlert({ show: false, message: "", type: "" });
        }, 5000);
    };

    const API_URL = process.env.REACT_APP_API_URL;

    const getBaseFrontendUrl = () => {
        if (!API_URL) return "http://localhost:3000";

        let frontendUrl = API_URL;

        frontendUrl = frontendUrl.replace(/\/php(\/.*)?$/i, '');
        frontendUrl = frontendUrl.replace(/\/api(\/.*)?$/i, '');
        frontendUrl = frontendUrl.replace(/\/query\.php$/i, '');

        // Remove the /eventa/src/pages part if it exists
        frontendUrl = frontendUrl.replace(/\/eventa\/src\/pages(\/.*)?$/i, '');
        frontendUrl = frontendUrl.replace(/\/eventa\/src(\/.*)?$/i, '');
        frontendUrl = frontendUrl.replace(/\/eventa(\/.*)?$/i, '');

        // Remove any remaining specific React paths
        frontendUrl = frontendUrl.replace(/\/src\/.*$/i, '');
        frontendUrl = frontendUrl.replace(/\/pages\/.*$/i, '');
        frontendUrl = frontendUrl.replace(/\/components\/.*$/i, '');

        // Remove trailing slash
        frontendUrl = frontendUrl.replace(/\/$/, '');

        // If it's localhost with a port, ensure it's correct
        if (frontendUrl.includes('localhost')) {
            // Extract just the protocol and host with port
            try {
                const urlObj = new URL(frontendUrl);
                frontendUrl = `${urlObj.protocol}//${urlObj.host}`;

                // Ensure port 3000 for localhost if no port specified
                if (frontendUrl === 'http://localhost' || frontendUrl === 'https://localhost') {
                    frontendUrl = 'http://localhost:3000';
                }
            } catch (e) {
                // If URL parsing fails, use default
                if (!frontendUrl.includes(':3000') && !frontendUrl.match(/localhost:\d+/)) {
                    frontendUrl = 'http://localhost:3000';
                }
            }
        }

        console.log("Frontend URL generated:", frontendUrl);
        return frontendUrl;
    };

    // Function to get the correct invitation link based on event type
    const getInvitationLink = () => {
        if (!event_id) return "";

        const frontendBaseUrl = getBaseFrontendUrl();

        if (isTicketEvent) {
            // Ticket event link - no user_email parameter needed
            return `${frontendBaseUrl}/ticketEvent_details?id=${encodeURIComponent(event_id)}`;
        } else {
            // RSVP event link - include user_email parameter
            const userEmail = user?.email ? encodeURIComponent(user.email) : '';
            return `${frontendBaseUrl}/rsvpForm?event_id=${encodeURIComponent(event_id)}${userEmail ? `&user_email=${userEmail}` : ''}`;
        }
    };

    const invitationLink = getInvitationLink();

    useEffect(() => {
    
   const savedData = localStorage.getItem("selectedEventData");
    const storedUser = localStorage.getItem("user");
    
    if (savedData && storedUser) {
        const userData = JSON.parse(storedUser);
        const eventData = JSON.parse(savedData);

            setUser(userData);
setIsTicketEvent(eventData.hasTicket === 1 || eventData.hasTicket === true || eventData.hasTicket === "1");
            setEventId(eventData.eventId);
            fetchEventStatusByID(eventData.eventId, eventData.hasTicket);
            fetchEventDetails(eventData.eventId, eventData.hasTickets);
        }
        
        if (!savedData) navigate("/eventsDashboard");
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
    }, [searchParams, navigate]);

    const fetchEventDetails = async (id, hasTicketFlag) => {
        try {
            const formData = new FormData();

            if (hasTicketFlag === 1) {
                formData.append("function", "getTicketEventById");
            } else {
                formData.append("function", "getEventById");
            }

            formData.append("event_id", id);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            const data = await response.json();
            console.log("Event details response:", data);

            if (data.success && data.events) {
                const event = Array.isArray(data.events) ? data.events[0] : data.events;
                if (event) {
                    setEventDetails(event);

                    // Keep frontend state reactive to any backend modifications
                    const hasTickets = event.has_tickets === 1 || event.has_tickets === true || event.has_tickets === "1";
                    setIsTicketEvent(hasTickets);

                    // Optional: Keep localStorage updated if the ticket count hits 0 on the server
                    const updatedFlag = hasTickets ? 1 : 0;
                    if (updatedFlag !== hasTicketFlag) {
                        localStorage.setItem("selectedEventData", JSON.stringify({
                            eventId: id,
                            hasTicket: updatedFlag
                        }));
                    }
                }
            }
        } catch (err) {
            console.error("Failed to fetch event details:", err);
        }
    };

    const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const closeSidebar = () => {
        setSidebarOpen(false);
    };

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

    const getShareMessage = () => {
        if (isTicketEvent) {
            return `You're invited to purchase tickets for an event! 🎟️\n\nUse this link to view event details and purchase tickets:\n${invitationLink}`;
        } else {
            return `You're invited to an event! 🎉\n\nUse this link to RSVP:\n${invitationLink}`;
        }
    };

    const shareViaWhatsApp = () => {
        if (!invitationLink) return;
        const message = getShareMessage();
        const whatsappURL = `https://wa.me/?text=${encodeURIComponent(message)}`;
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

        // Debug: log the event_id
        console.log("Current event_id:", event_id);
        console.log("Event_id type:", typeof event_id);
        console.log("Event_id length:", event_id ? event_id.length : 0);

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

        const fetchEventImage = async () => {
            if (!event_id) return null;
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
                    return json.events[0].event_image || null;
                }
            } catch (err) {
                console.warn("Failed to fetch event image:", err);
            }
            return null;
        };

        const eventName = await fetchEventName();
        const eventImage = isTicketEvent ? await fetchEventImage() : null;

        // Debug: log the event image URL
        console.log("Event image URL being sent:", eventImage);

        const guestsArr = emailList.map((email) => ({
            name: email.split("@")[0],
            email,
        }));

        let successCount = 0;
        const failures = [];

        // Determine which endpoint to use based on event type
        const endpoint = isTicketEvent ? "send_ticket_invite.php" : "send_invite.php";

        for (const guest of guestsArr) {
            try {
                const fd = new FormData();

                // Debug each field before appending
                console.log("Appending data to FormData:");
                console.log("- email:", guest.email, "length:", guest.email.length);
                console.log("- name:", guest.name, "length:", guest.name.length);
                console.log("- event:", event_id, "length:", event_id ? event_id.length : 0);
                console.log("- API_URL:", API_URL, "length:", API_URL ? API_URL.length : 0);
                console.log("- user_email:", user.email, "length:", user.email ? user.email.length : 0);

                fd.append("email", guest.email);
                fd.append("name", guest.name);
                fd.append("event", event_id);
                fd.append("API_URL", API_URL);
                fd.append("user_email", user.email);

                // Add event image only for ticket events
                if (isTicketEvent && eventImage) {
                    console.log("- event_image:", eventImage, "length:", eventImage ? eventImage.length : 0);
                    fd.append("event_image", eventImage);
                }

                // Add event name for both types
                console.log("- event_name:", eventName, "length:", eventName ? eventName.length : 0);
                fd.append("event_name", eventName);

                // Log the complete data being sent
                console.log("Sending invitation with complete data:", {
                    email: guest.email,
                    name: guest.name,
                    event: event_id,
                    API_URL: API_URL,
                    user_email: user.email,
                    event_image: eventImage,
                    event_name: eventName,
                    endpoint: endpoint,
                    isTicketEvent: isTicketEvent
                });

                const resp = await fetch(`${API_URL}/${endpoint}`, {
                    method: "POST",
                    body: fd,
                });

                console.log("Response status:", resp.status);

                const text = await resp.text();
                console.log("Raw response text:", text);

                let parsed;
                try {
                    parsed = JSON.parse(text);
                    console.log("Parsed response:", parsed);
                } catch (e) {
                    console.error("Failed to parse JSON:", e);
                    console.error("Raw text that failed to parse:", text);
                    failures.push({
                        guest: guest.email,
                        reason: "Non-JSON response from server",
                        raw: text.slice(0, 200),
                    });
                    continue;
                }

                if (parsed.success) {
                    successCount++;
                    console.log("Success for", guest.email);
                } else {
                    console.log("Failed for", guest.email, "reason:", parsed?.message);
                    failures.push({
                        guest: guest.email,
                        reason: parsed?.message || "Unknown error",
                    });
                }
            } catch (err) {
                console.error("Exception for", guest.email, ":", err);
                failures.push({ guest: guest.email, reason: err.message });
            }
        }

        setIsSending(false);

        if (failures.length === 0) {
            setSendSuccess(true);
            setEmailList([]);
            setTimeout(() => setSendSuccess(false), 3000);

            // Show appropriate success message based on event type
            const message = isTicketEvent
                ? `Ticket invitations sent successfully to ${successCount} recipient(s). Guests will receive event images.`
                : `Invitations sent successfully to ${successCount} recipient(s).`;

            printAlert(message, "success");
        } else {
            const errorMessage = isTicketEvent
                ? `${successCount} ticket invitations sent, ${failures.length} failed.`
                : `${successCount} invitations sent, ${failures.length} failed.`;

            setEmailError(errorMessage);
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

    // Social share functions
    const shareOnFacebook = () => {
        const message = isTicketEvent
            ? "Check out this event and get your tickets! 🎟️"
            : "You're invited to this event! 🎉";
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(invitationLink)}&quote=${encodeURIComponent(message)}`, "_blank");
    };

    const shareOnTwitter = () => {
        const message = isTicketEvent
            ? "🎟️ Get your tickets for this event!"
            : "🎉 You're invited to this event!";
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(invitationLink)}&text=${encodeURIComponent(message)}`, "_blank");
    };

    const shareOnLinkedIn = () => {
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(invitationLink)}`, "_blank");
    };

    const shareOnTelegram = () => {
        const message = getShareMessage();
        window.open(`https://t.me/share/url?url=${encodeURIComponent(invitationLink)}&text=${encodeURIComponent(message)}`, "_blank");
    };

    const shareViaEmail = () => {
        const subject = isTicketEvent ? "You're invited to purchase tickets!" : "You're invited!";
        const body = getShareMessage();
        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
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

            {/* CONDITIONAL SIDEBAR */}
            {isTicketEvent ? (
                <DashboardTicketSidebar
                    isOpen={sidebarOpen}
                    onClose={closeSidebar}
                />
            ) : (
                <DashboardSidebar
                    isOpen={sidebarOpen}
                    onClose={closeSidebar}
                />
            )}

            <div className={`invitation-content ${isTicketEvent ? 'ticket-event' : 'rsvp-event'}`}>
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
                        {isTicketEvent && (
                            <div className="event-type-badge">
                                <span className="ticket-badge">
                                    <i className="bi bi-ticket-perforated"></i>
                                    Ticket Event
                                </span>
                            </div>
                        )}
                        {!isTicketEvent && (
                            <div className="event-type-badge">
                                <span className="rsvp-badge">
                                    <i className="bi bi-calendar-check"></i>
                                    RSVP Event
                                </span>
                            </div>
                        )}
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
                                    ) : isTicketEvent ? (
                                        `Send Ticket Invitations to ${emailList.length}`
                                    ) : (
                                        `Send RSVP Invitations to ${emailList.length}`
                                    )}
                                </button>

                                {sendSuccess && (
                                    <div className="success-message">
                                        ✅ {isTicketEvent ? "Ticket invitations" : "Invitations"} sent successfully!
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
                                <p>
                                    {isTicketEvent
                                        ? "Share this link with your guests to purchase tickets"
                                        : "Share this link with your guests to RSVP"}
                                </p>
                                {isTicketEvent && (
                                    <div className="ticket-note">
                                        <i className="bi bi-ticket-perforated"></i>
                                        This link directs guests to the ticket purchase page
                                    </div>
                                )}
                                {!isTicketEvent && (
                                    <div className="rsvp-note">
                                        <i className="bi bi-calendar-check"></i>
                                        This link directs guests to the RSVP form
                                    </div>
                                )}
                                <div className="link-container">
                                    <input
                                        type="text"
                                        value={invitationLink}
                                        readOnly
                                        className="link-input"
                                        title={invitationLink}
                                    />
                                    <button onClick={copyLink} className="copy-link-btn">
                                        Copy Link
                                    </button>
                                </div>
                                {copySuccess && (
                                    <div className="success-message">{copySuccess}</div>
                                )}
                                <div className="link-info">
                                    <small>
                                        <i className="bi bi-info-circle"></i>
                                        {isTicketEvent
                                            ? "Guests will be directed to the ticket purchase page"
                                            : "Guests will be directed to the RSVP form"}
                                    </small>
                                </div>
                            </div>
                        </div>

                        {/* Share Options */}
                        <div className="share-options">
                            <p>Share via:</p>
                            <div className="social-buttons">
                                <button
                                    className="social-btn whatsapp"
                                    onClick={shareViaWhatsApp}
                                    disabled={eventStatus === "Unpublished" || !invitationLink}
                                    title="Share on WhatsApp"
                                >
                                    <i className="bi bi-whatsapp"></i>
                                </button>
                                <button
                                    className="social-btn facebook"
                                    onClick={shareOnFacebook}
                                    disabled={eventStatus === "Unpublished" || !invitationLink}
                                    title="Share on Facebook"
                                >
                                    <i className="bi bi-facebook"></i>
                                </button>
                                <button
                                    className="social-btn twitter"
                                    onClick={shareOnTwitter}
                                    disabled={eventStatus === "Unpublished" || !invitationLink}
                                    title="Share on Twitter"
                                >
                                    <i className="bi bi-twitter-x"></i>
                                </button>
                                <button
                                    className="social-btn linkedin"
                                    onClick={shareOnLinkedIn}
                                    disabled={eventStatus === "Unpublished" || !invitationLink}
                                    title="Share on LinkedIn"
                                >
                                    <i className="bi bi-linkedin"></i>
                                </button>
                                <button
                                    className="social-btn telegram"
                                    onClick={shareOnTelegram}
                                    disabled={eventStatus === "Unpublished" || !invitationLink}
                                    title="Share on Telegram"
                                >
                                    <i className="bi bi-telegram"></i>
                                </button>
                                <button
                                    className="social-btn email"
                                    onClick={shareViaEmail}
                                    disabled={eventStatus === "Unpublished" || !invitationLink}
                                    title="Share via Email"
                                >
                                    <i className="bi bi-envelope-paper"></i>
                                </button>
                            </div>
                            <div className="share-instructions">
                                <small>
                                    <i className="bi bi-lightbulb"></i>
                                    {isTicketEvent
                                        ? "When sharing, let guests know they can purchase tickets through the link"
                                        : "When sharing, let guests know they can RSVP through the link"}
                                </small>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvitationPage;