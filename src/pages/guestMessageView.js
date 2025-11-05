// src/pages/GuestMessageView.js
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import './GuestMessageView.css';

const GuestMessageView = () => {
    const location = useLocation();
    const messagesEndRef = useRef(null);
    const [event, setEvent] = useState(null);
    const [guest, setGuest] = useState(null);
    const [email, setEmail] = useState('');
    const [messageInput, setMessageInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [emailChecked, setEmailChecked] = useState(false);
    const [eventStatus, setEventStatus] = useState(null);
    const [alert, setAlert] = useState({ show: false, message: '', type: '' });
    const API_URL = process.env.REACT_APP_API_URL;
    const eventId = new URLSearchParams(location.search).get('event_id');

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (guest?.messages?.length > 0) scrollToBottom();
    }, [guest?.messages]);

    const showAlert = (msg, type = 'info') => {
        setAlert({ show: true, message: msg, type });
        setTimeout(() => setAlert({ show: false }), 4000);
    };

    const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

    const fetchGuest = async () => {
        if (!email.trim() || !eventId) return;

        setLoading(true);
        setEmailChecked(false);
        setGuest(null);
        setEvent(null);
        setEventStatus(null);

        try {
            const eventFormData = new FormData();
            eventFormData.append('function', 'getEventById');
            eventFormData.append('event_id', eventId);

            const eventRes = await fetch(`${API_URL}/query.php`, {
                method: 'POST',
                body: eventFormData
            });
            const eventData = await eventRes.json();

            if (!eventData.success) {
                setEventStatus('not_found');
                showAlert('This event does not exist or has been removed.', 'error');
                setLoading(false);
                setEmailChecked(true);
                return;
            }

            const eventInfo = eventData.events[0];   
            setEvent(eventInfo);
            const isCanceled =
                eventInfo.status === 'Cancelled' ||
                eventInfo.status === 'cancelled';

            if (isCanceled) {
                setEventStatus('canceled');
                showAlert('This event has been canceled. Messaging is disabled.', 'warning');
                setLoading(false);
                setEmailChecked(true);
                return;
            }

            setEventStatus('active');

            const guestFormData = new FormData();
            guestFormData.append('function', 'getGuestMessageByEmail');
            guestFormData.append('event_id', eventId);
            guestFormData.append('email', email.trim().toLowerCase());

            const guestRes = await fetch(`${API_URL}/query.php`, {
                method: 'POST',
                body: guestFormData
            });
            const guestData = await guestRes.json();

            if (guestData.success) {
                setGuest(guestData.guest);
                setMessageInput('');
            } else {
                showAlert(guestData.message || 'No RSVP found for this email.', 'error');
            }
        } catch (err) {
            console.error(err);
            showAlert('Network error. Please try again.', 'error');
        } finally {
            setLoading(false);
            setEmailChecked(true);
        }
    };

    const sendMessage = async () => {
        if (!messageInput.trim() || !guest?.msg_id || eventStatus !== 'active') return;

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('function', 'guestSendMessage');
            formData.append('msg_id', guest.msg_id);
            formData.append('message', messageInput.trim());

            const res = await fetch(`${API_URL}/query.php`, { method: 'POST', body: formData });
            const result = await res.json();

            if (result.success) {
                setMessageInput('');
                fetchGuest(); 
            } else {
                showAlert(result.message, 'error');
            }
        } catch (err) {
            showAlert('Failed to send message.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (!eventId) {
        return (
            <div className="chat-container">
                <div className="chat-card">
                    <div className="no-data">
                        <h3>Invalid Link</h3>
                        <p>This messaging link is missing required information.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-container">
            <div className="chat-card">
                {alert.show && <div className={`chat-alert alert-${alert.type}`}>{alert.message}</div>}

                {/* Email Input */}
                {!guest && !emailChecked && (
                    <div className="email-section">
                        <p>Enter your email to start chatting:</p>
                        <div className="input-group">
                            <input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && isValidEmail(email) && fetchGuest()}
                                autoFocus
                            />
                            <button onClick={fetchGuest} disabled={!isValidEmail(email) || loading}>
                                {loading ? 'Checking...' : 'Continue'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Loading */}
                {loading && <div className="chat-loading">Loading chat...</div>}

                {/* Event Not Found */}
                {eventStatus === 'not_found' && !loading && (
                    <div className="no-data">
                        <h3>Event Not Found</h3>
                        <p>This event no longer exists or has been removed.</p>
                        <button onClick={() => { setEmail(''); setEmailChecked(false); setEventStatus(null); }}>
                            Try Another Link
                        </button>
                    </div>
                )}

                {/* Event Canceled */}
                {eventStatus === 'canceled' && !loading && (
                    <div className="no-data">
                        <h3>Event Canceled</h3>
                        <p>
                            <strong>{event?.event_name}</strong> has been canceled.
                            <br />
                            Messaging is no longer available.
                        </p>
                        {/* <div className="event-details">
                            <p>
                                <strong>Date:</strong> {event?.event_date ? new Date(event.event_date).toLocaleDateString() : 'N/A'}
                            </p>
                            {event?.location && <p><strong>Location:</strong> {event.location}</p>}
                        </div> */}
                        <button onClick={() => { setEmail(''); setEmailChecked(false); setEventStatus(null); }}>
                            Back to Email
                        </button>
                    </div>
                )}

                {/* No Guest Found */}
                {guest === null && !loading && emailChecked && eventStatus === 'active' && (
                    <div className="no-data">
                        <p>No RSVP found for <strong>{email}</strong></p>
                        <p>Make sure you used the email you registered with.</p>
                        <button onClick={() => { setEmail(''); setEmailChecked(false); }}>
                            Try Another Email
                        </button>
                    </div>
                )}

                {/* Chat Interface */}
                {guest && event && eventStatus === 'active' && (
                    <>
                        <div className="chat-header">
                            <h2>{event.event_name}</h2>
                            <p>
                                {new Date(event.event_date).toLocaleDateString()} • {event.event_time}
                                {event.location && ` • ${event.location}`}
                            </p>
                        </div>

                        <div className="messages-container">
                            {guest.messages?.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`message-bubble ${msg.sender === 'guest' ? 'guest' : 'organizer'}`}
                                    style={{
                                        marginTop: i > 0 && msg.sender === guest.messages[i - 1].sender ? '2px' : '8px'
                                    }}
                                >
                                    <div className="message-text">{msg.text}</div>
                                    <div className="message-time">
                                        {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="chat-input">
                            <textarea
                                placeholder="Type a message..."
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage();
                                    }
                                }}
                                rows="1"
                            />
                            <button onClick={sendMessage} disabled={submitting || !messageInput.trim()}>
                                {submitting ? 'Sending...' : 'Send'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default GuestMessageView;