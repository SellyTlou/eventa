import React, { useState, useEffect } from "react";
import "./rsvp.css";
import '../../alert.css';
import { useSearchParams } from 'react-router-dom';

const RsvpForm = () => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        attending: "yes",
        guestCount: 0,
        message: "",
    });
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [eventData, setEventData] = useState(null);
    const [loadingEvent, setLoadingEvent] = useState(true);
    const [userEmail, setUser] = useState(null);
    const [searchParams] = useSearchParams();
    const [totalRplyGuestCount, setTotalRplyGuestCount] = useState(0);
    const [totalEventLimit, setTotalEventLimit] = useState(0);
    const [event_id, setEventId] = useState("");

    // ✅ Custom alert state
    const [alert, setAlert] = useState({ show: false, message: "", type: "" });

    // ✅ Custom alert helper
    const printAlert = (message, type = "info") => {
        setAlert({ show: true, message, type });
        setTimeout(() => {
            setAlert({ show: false, message: "", type: "" });
        }, 5000);
    };

    useEffect(() => {
        const id = searchParams.get("event_id");
        if (id) {
            setEventId(id);
            fetchEventData(id);
            setUser(searchParams.get("user_email") || "");
        }
    }, [searchParams]);

    const fetchEventData = async (eventId) => {
        try {
            setLoadingEvent(true);
            await Promise.all([
                fetchEvent(eventId),
                fetchRsvpCount(eventId),
                fetchEventLimit(eventId)
            ]);
        } catch (err) {
            console.error("Error fetching event data:", err);
            printAlert("Failed to load event details", "error");
        } finally {
            setLoadingEvent(false);
        }
    };

    const fetchRsvpCount = async (eventId) => {
        try {
            if (!eventId) {
                setTotalRplyGuestCount(0);
                return 0;
            }

            const form = new FormData();
            form.append("function", "getRsvpGuestCount");
            form.append("event_id", eventId);

            const response = await fetch(`${process.env.REACT_APP_API_URL}/query.php`, {
                method: "POST",
                body: form,
            });

            const data = await response.json();

            let guestCount = 0;
            if (data.success && typeof data.guestCount === "number") {
                guestCount = data.guestCount;
            }
            setTotalRplyGuestCount(guestCount);
        } catch (err) {
            console.error("Error fetching RSVP guest count:", err);
            setTotalRplyGuestCount(0);
            printAlert("Error fetching RSVP guest count", "error");
        }
    };

    const fetchEventLimit = async (eventId) => {
        try {
            if (!eventId) {
                setTotalEventLimit(0);
                return 0;
            }

            const form = new FormData();
            form.append("function", "getEventGuestLimit");
            form.append("event_id", eventId);

            const response = await fetch(`${process.env.REACT_APP_API_URL}/query.php`, {
                method: "POST",
                body: form,
            });

            const data = await response.json();

            let eventLimit = 0;
            if (data.success && data.guestLimit) {
                eventLimit = parseInt(data.guestLimit.guest_limit || 0);
            }

            setTotalEventLimit(eventLimit);
            return eventLimit;
        } catch (err) {
            console.error("Error fetching events guest limit:", err);
            setTotalEventLimit(0);
            printAlert("Error fetching guest limit", "error");
            return 0;
        }
    };

    const fetchEvent = async (eventId) => {
        try {
            const form = new FormData();
            form.append("function", "getEventById");
            form.append("event_id", eventId);

            const response = await fetch(`${process.env.REACT_APP_API_URL}/query.php`, {
                method: "POST",
                body: form
            });

            const data = await response.json();
            if (data.success && data.events && data.events.length > 0) {
                setEventData(data.events[0]);
                return data.events[0];
            } else {
                printAlert("Event not found", "warning");
                return null;
            }
        } catch (err) {
            console.error("Error fetching event:", err);
            printAlert("Failed to load event details", "error");
            return null;
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
            ...(name === "attending" && value === "no" && { guestCount: 0 })
        }));
    };

    const handleGuestCountChange = (increment) => {
        setFormData(prev => ({
            ...prev,
            guestCount: Math.max(0, Math.min(1, prev.guestCount + increment))
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const availableSpots = totalEventLimit - totalRplyGuestCount;
        const requestedSpots = formData.attending === "yes" ? 1 + formData.guestCount : 0;

        if (totalEventLimit > 0 && requestedSpots > availableSpots) {
            printAlert(`Sorry, only ${availableSpots} spot(s) available but you requested ${requestedSpots}`, "warning");
            return;
        }

        setError(null);
        setIsSubmitting(true);

        const formDataToSend = new FormData();
        formDataToSend.append("function", "guestRsvp");
        formDataToSend.append("event_id", event_id);
        formDataToSend.append("name", formData.name);
        formDataToSend.append("email", formData.email);
        formDataToSend.append("attending", formData.attending);
        formDataToSend.append("message", formData.message);
        formDataToSend.append("guestCount", formData.guestCount);
        formDataToSend.append("totalRplyGuestCount", totalRplyGuestCount);
        formDataToSend.append("totalEventLimit", totalEventLimit);

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/query.php`, {
                method: "POST",
                body: formDataToSend,
            });

            if (!response.ok) throw new Error("Network response was not ok");

            const result = await response.json();

            if (result.success) {
                printAlert(result.message || "RSVP submitted successfully!", "success");
                setFormData({
                    name: "",
                    email: "",
                    attending: "yes",
                    guestCount: 0,
                    message: ""
                });
                await fetchEventData(event_id);
            } else {
                throw new Error(result.message || "Failed to submit RSVP");
            }
        } catch (err) {
            console.error("Submission error:", err);
            printAlert(err.message || "Failed to submit RSVP. Please try again.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loadingEvent) {
        return (
            <div className="rsvp_form__container">
                <div className="loading-container">
                    <div className="spinner-border text-info" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <div className="loading-text">Loading event details...</div>
                </div>
            </div>
        );
    }

    const availableSpots = totalEventLimit - totalRplyGuestCount;
    const isEventFull = totalEventLimit > 0 && availableSpots <= 0;

    return (
        <div className="rsvp_form__container">

            {/* ✅ Custom alert box */}
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

            {/* Full page overlay if event is full */}
            {isEventFull && (
                <div className="event-full-overlay">
                    <div className="event-full-message">
                        <h2>Sorry, this event is fully booked!</h2>
                        <p>
                            The number of RSVPs has reached the maximum limit of <strong>{totalEventLimit}</strong> guests.
                        </p>
                        <p>
                            Currently there are <strong>{totalRplyGuestCount}</strong> guests registered.
                        </p>
                        <p>
                            If you still want to attend, please contact the event organizer at:
                            <strong> {userEmail || "info@example.com"}</strong>
                        </p>
                    </div>
                </div>
            )}

            <div className="overlay-behind"></div>
            <div className="content-wrapper">
                <div className="invitation_card">
                    {eventData && (
                        <>
                            {eventData.event_image ? (
                                <img
                                    src={eventData.event_image}
                                    alt="Event Invitation"
                                    className="invitation_image"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                            ) : (
                                <div className="no-image-placeholder">
                                    <i className="fas fa-image"></i>
                                    <p>No event image available</p>
                                </div>
                            )}

                            <div className="invitation_header">
                                <div className="decoration top-left"></div>
                                <div className="decoration top-right"></div>
                                <h1 className="invitation_card__eventName">{eventData.event_name}</h1>
                                <p className="invitation_card__subtitle">{eventData.event_description}</p>
                            </div>

                            <div className="invitation_details">
                                <div className="detail-item">
                                    <i className="fas fa-calendar-alt"></i>
                                    <span>{new Date(eventData.event_date).toLocaleDateString()}</span>
                                </div>
                                <div className="detail-item">
                                    <i className="fas fa-map-marker-alt"></i>
                                    <span>{eventData.event_location}</span>
                                </div>
                                {totalEventLimit > 0 && (
                                    <div className="detail-item">
                                        <i className="fas fa-users"></i>
                                        <span>
                                            {availableSpots > 0
                                                ? `${availableSpots} spot(s) available of ${totalEventLimit}`
                                                : 'Fully booked'
                                            }
                                        </span>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="rsvp_form_wrapper">
                    <fieldset disabled={isEventFull} style={{ border: "none", padding: 0, margin: 0 }}>
                        <form className="rsvp_form" onSubmit={handleSubmit}>
                            <h1 className="rsvp_form__title">
                                <i className="fas fa-envelope-open-text"></i> RSVP
                            </h1>

                            <div className="form-row">
                                <div className="rsvp_form__group">
                                    <label className="rsvp_form__label">Your Full Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        className="rsvp_form__input"
                                        placeholder="Your full name"
                                    />
                                </div>

                                <div className="rsvp_form__group">
                                    <label className="rsvp_form__label">Your Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="rsvp_form__input"
                                        placeholder="Your email address"
                                    />
                                </div>
                            </div>

                            <div className="rsvp_form__group--radio">
                                <label className="rsvp_form__label">Will you be attending?</label>
                                <div className="rsvp_form__radio_options">
                                    <label className={`radio-option ${formData.attending === "yes" ? "selected" : ""}`}>
                                        <input
                                            type="radio"
                                            name="attending"
                                            value="yes"
                                            checked={formData.attending === "yes"}
                                            onChange={handleChange}
                                            disabled={isEventFull}
                                        />
                                        <span className="radio-custom"></span>
                                        <span className="radio-label">Yes, I'll be there!</span>
                                    </label>

                                    <label className={`radio-option ${formData.attending === "no" ? "selected" : ""}`}>
                                        <input
                                            type="radio"
                                            name="attending"
                                            value="no"
                                            checked={formData.attending === "no"}
                                            onChange={handleChange}
                                        />
                                        <span className="radio-custom"></span>
                                        <span className="radio-label">Sorry, can't make it</span>
                                    </label>

                                    <label className={`radio-option ${formData.attending === "maybe" ? "selected" : ""}`}>
                                        <input
                                            type="radio"
                                            name="attending"
                                            value="maybe"
                                            checked={formData.attending === "maybe"}
                                            onChange={handleChange}
                                            disabled={isEventFull}
                                        />
                                        <span className="radio-custom"></span>
                                        <span className="radio-label">Maybe</span>
                                    </label>
                                </div>
                            </div>

                            {formData.attending === "yes" && (
                                <div className="rsvp_form__guests_section">
                                    <h3 className="rsvp_form__guests_title">
                                        <i className="fas fa-users"></i> Number of Guests
                                    </h3>
                                    <div className="guest-counter">
                                        <label className="rsvp_form__label">
                                            How many guests will you bring? (Maximum 1)
                                            {availableSpots > 0 && (
                                                <span style={{ fontSize: '0.9em', color: '#666', marginLeft: '10px' }}>
                                                    Available spots: {availableSpots}
                                                </span>
                                            )}
                                        </label>
                                        <div className="counter-controls">
                                            <button
                                                type="button"
                                                onClick={() => handleGuestCountChange(-1)}
                                                className="counter-btn"
                                                disabled={formData.guestCount <= 0 || isEventFull}
                                            >
                                                -
                                            </button>
                                            <span className="guest-count">{formData.guestCount}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleGuestCountChange(1)}
                                                className="counter-btn"
                                                disabled={formData.guestCount >= 1 || availableSpots <= 1 || isEventFull}
                                            >
                                                +
                                            </button>
                                        </div>
                                        <input type="hidden" name="guestCount" value={formData.guestCount} />
                                    </div>
                                </div>
                            )}

                            <div className="rsvp_form__group">
                                <label className="rsvp_form__label">Message (optional)</label>
                                <textarea
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    className="rsvp_form__textarea"
                                    rows="4"
                                    placeholder="Any special requests, dietary restrictions, or notes?"
                                />
                            </div>

                            {error && <p className="rsvp_form__error">{error}</p>}

                            <button
                                type="submit"
                                disabled={isSubmitting || isEventFull}
                                className={`rsvp_form__button ${isSubmitting || isEventFull ? "rsvp_form__button--disabled" : ""}`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin"></i> Submitting...
                                    </>
                                ) : isEventFull ? (
                                    <>
                                        <i className="fas fa-times"></i> Event Full
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-paper-plane"></i> Submit RSVP
                                    </>
                                )}
                            </button>
                        </form>
                    </fieldset>
                </div>
            </div>
        </div>
    );
};

export default RsvpForm;