import React, { useState, useEffect, useRef } from "react";
import "./main.css";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from 'react-router-dom';
import { logOut } from "../components";


const InvitationPage = () => {
    const [activeTab, setActiveTab] = useState("invitations");
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

    useEffect(() => {
        const id = searchParams.get("event_id");
        const storedUser = localStorage.getItem("user");
        if (id && storedUser) {
            setUser(JSON.parse(storedUser));
            setEventId(id);
            fetchEventStatusByID(id);
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

    const invitationLink = "";

    // Validate email format
    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };


    const goToHome = () => {
        navigate("/eventsDashboard");
    };
    const goToEventManagement = () => {
        navigate(`/eventManagement?event_id=${event_id}`);
    };
    const goToInvitations = () => {
        navigate(`/invitationPage?event_id=${event_id}`);
    };
    const goToManage = () => {
        navigate(`/manage_my_event?event_id=${event_id}`);
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
    }

    const addEmail = () => {
        if (!emailInput.trim()) return;

        const emails = emailInput.split(',')
            .map(email => email.trim())
            .filter(email => email.length > 0);

        const validEmails = [];
        const invalidEmails = [];

        emails.forEach(email => {
            if (isValidEmail(email)) {
                validEmails.push(email);
            } else {
                invalidEmails.push(email);
            }
        });

        if (invalidEmails.length > 0) {
            setEmailError(`Invalid email format: ${invalidEmails.join(', ')}`);
            return;
        }

        setEmailList([...emailList, ...validEmails]);
        setEmailInput("");
        setEmailError("");
    };

    const removeEmail = (emailToRemove) => {
        setEmailList(emailList.filter(email => email !== emailToRemove));
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addEmail();
        }
    };

    const sendInvitations = async () => {
        if (emailList.length === 0) {
            setEmailError("Please add at least one email address");
            return;
        }

        setIsSending(true);
        setEmailError("");

        const fetchEventName = async () => {
            if (!event_id) return "Evenda Event";
            try {
                const API_URL = process.env.REACT_APP_API_URL;
                const fd = new FormData();
                fd.append("function", "getEventById");
                fd.append("event_id", event_id);

                const resp = await fetch(`${API_URL}/query.php`, {
                    method: "POST",
                    body: fd
                });

                const text = await resp.text();
                try {
                    const json = JSON.parse(text);
                    if (json.success && json.events && json.events.length > 0) {
                        return json.events[0].event_name || `Event ${event_id}`;
                    }
                } catch (e) {
                    console.warn("getEventById returned non-JSON:", text);
                }
            } catch (err) {
                console.warn("Failed to fetch event name:", err);
            }
            return "Evenda Event";
        };

        // build basic guests array from emails (you can adjust name fallback)
        const guestsArr = emailList.map(email => ({
            name: email.split("@")[0],
            email
        }));

        const eventName = await fetchEventName();

        let successCount = 0;
        const failures = [];

        for (const guest of guestsArr) {
            try {
                const fd = new FormData();
                fd.append("email", guest.email);
                fd.append("name", guest.name);
                fd.append("event", event_id);
                const API_URL = process.env.REACT_APP_API_URL;

                const resp = await fetch(`${API_URL}/query.php/send_invite.php`, {
                    method: "POST",
                    body: fd,
                });

                const text = await resp.text();
                let parsed;
                try {
                    parsed = JSON.parse(text);
                } catch (parseErr) {
                    failures.push({
                        guest: guest.email,
                        reason: "Non-JSON response from server",
                        raw: text.slice(0, 500)
                    });
                    console.error("Non-JSON response for", guest.email, text);
                    continue;
                }

                if (parsed && parsed.success) {
                    successCount++;
                } else {
                    failures.push({
                        guest: guest.email,
                        reason: parsed?.message || "Unknown error",
                        raw: JSON.stringify(parsed).slice(0, 500)
                    });
                    console.error("Invite failed for", guest.email, parsed);
                }
            } catch (err) {
                failures.push({
                    guest: guest.email,
                    reason: err.message || "Network error"
                });
                console.error("Network/error sending invite for", guest.email, err);
            }
        }

        setIsSending(false);

        if (failures.length === 0) {
            setSendSuccess(true);
            setEmailList([]);
            setTimeout(() => setSendSuccess(false), 3000);
            alert(`Invitations sent successfully to ${successCount} recipient(s).`);
        } else {
            // show a helpful error to the user (and log details to console)
            setEmailError(`${successCount} sent, ${failures.length} failed. Check console for details.`);
            console.error("Invitation failures:", failures);
            // optionally keep the successful ones removed:
            const failedEmails = failures.map(f => f.guest);
            setEmailList(emailList.filter(e => failedEmails.includes(e)));
        }
    };
    const toggleDropdown = () => {
        setDropdownOpen(prev => !prev);
    };
    const copyLink = () => {
        navigator.clipboard.writeText(invitationLink)
            .then(() => {
                setCopySuccess("Link copied to clipboard!");
                setTimeout(() => setCopySuccess(""), 3000);
            })
            .catch(err => {
                setCopySuccess("Failed to copy link");
                console.error('Failed to copy: ', err);
            });
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>Evenda</h1>
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

            <div className="dashboard-sidebar">
                <h3>DASHBOARD</h3>
                <ul>
                    <li onClick={goToHome}>Home</li>
                    <li onClick={goToEventManagement}>overview</li>
                    <li onClick={goToManage} >Publish</li>
                    <li onClick={goToInvitations} className="active">Invitations</li>
                    <li>Preview</li>
                </ul>
            </div>

            <div className="invitation-content">
                <div className="content-header">
                    <h2>Send Invitations</h2>
                    <p>Invite guests to your event via email or shareable link</p>
                </div>

                <div className="invitation-cards">
                    {/* Email Invitation Card */}
                    <div className="invitation-card">
                        <div className="card-header">
                            <h3>Email Invitations</h3>
                            <div className="email-icon">✉️</div>
                        </div>

                        <div className="card-body">
                            <div className="email-input-container">
                                <label htmlFor="email-input">Enter email addresses (separate with commas)</label>
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
                                    <button
                                        onClick={addEmail}
                                        className="add-email-btn"
                                        disabled={!emailInput.trim()}
                                    >
                                        Add
                                    </button>
                                </div>
                                {emailError && <div className="error-message">{emailError}</div>}
                            </div>

                            {emailList.length > 0 && (
                                <div className="email-list">
                                    <h4>Recipients ({emailList.length})</h4>
                                    <div className="email-chips">
                                        {emailList.map((email, index) => (
                                            <div key={index} className="email-chip">
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
                                        <span className="spinner"></span>
                                        Sending...
                                    </>
                                ) : (
                                    `Send Invitations to ${emailList.length} ${emailList.length === 1 ? 'Recipient' : 'Recipients'}`
                                )}
                            </button>

                            {sendSuccess && (
                                <div className="success-message">
                                    ✅ Invitations sent successfully!
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Shareable Link Card */}
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
                                <button
                                    onClick={copyLink}
                                    className="copy-link-btn"
                                >
                                    Copy Link
                                </button>
                            </div>

                            {copySuccess && (
                                <div className="success-message">
                                    {copySuccess}
                                </div>
                            )}

                            <div className="share-options">
                                <p>Or share directly to:</p>
                                <div className="social-buttons">
                                    <button className="social-btn whatsapp">
                                        WhatsApp
                                    </button>
                                    <button className="social-btn facebook">
                                        Facebook
                                    </button>
                                    <button className="social-btn twitter">
                                        Twitter
                                    </button>
                                    <button className="social-btn email">
                                        Email
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default InvitationPage;