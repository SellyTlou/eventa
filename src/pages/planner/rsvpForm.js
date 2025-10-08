import React, { useState, useEffect } from "react";
import "./rsvp.css";
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

    const [searchParams] = useSearchParams();
    const [event_id, setEventId] = useState("");

    useEffect(() => {
        const id = searchParams.get("event_id");
        if (id) {
            setEventId(id);
            fetchEvent(id);
        }
        console.log(id);
    }, [searchParams]);

    const fetchEvent = async (eventId) => {
        const API_URL = process.env.REACT_APP_API_URL;
        try {
            setLoadingEvent(true);
            const formData = new FormData();
            formData.append("function", "getEventById");
            formData.append("event_id", eventId);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData
            });

            const data = await response.json();
            console.log("Fetched event data:", data);
            if (data.success && data.events && data.events.length > 0) {
                setEventData(data.events[0]);
            } else {
                setError("Event not found");
            }
        } catch (err) {
            console.error("Error fetching event:", err);
            setError("Failed to load event details");
        } finally {
            setLoadingEvent(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        // If the user changes their attending status to "no", reset guest count
        if (name === "attending" && value === "no") {
            setFormData(prev => ({ ...prev, guestCount: 0 }));
        }
    };

    const handleGuestCountChange = (increment) => {
        setFormData(prev => ({
            ...prev,
            guestCount: Math.max(0, Math.min(1, prev.guestCount + increment)) // Limit to max 2 guests
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);
        const API_URL = process.env.REACT_APP_API_URL;

        const formDataToSend = new FormData();
        formDataToSend.append("function", "guestRsvp");
        formDataToSend.append("event_id", event_id);
        formDataToSend.append("name", formData.name);
        formDataToSend.append("email", formData.email);
        formDataToSend.append("attending", formData.attending);
        formDataToSend.append("message", formData.message);
        formDataToSend.append("guestCount", formData.guestCount);

        try {
            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formDataToSend, 
            });

            if (!response.ok) throw new Error("Network response was not ok");

            const result = await response.json();
            alert(result.message || "RSVP submitted successfully!");
            setFormData({
                name: "",
                email: "",
                attending: "yes",
                guestCount: 0,
                message: ""
            });
        } catch (err) {
            setError("Failed to submit RSVP. Please try again.");
            console.error("Submission error:", err);
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

    return (
        <div className="rsvp_form__container">
            <div className="overlay"></div>
            <div className="content-wrapper">
                <div className="invitation_card">
                    {eventData && eventData.event_image ? (
                        <img
                            src={eventData.event_image}
                            alt="Event Invitation"
                            className="invitation_image"
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                    ) : (
                        <div className="no-image-placeholder">
                            <i className="fas fa-image"></i>
                            <p>No event image available</p>
                        </div>
                    )}

                    {/* {eventData ? (
                      <>
                            <h2 className="invitation_card__eventName">{eventData.event_name}</h2>
                            <div className="invitation_details">
                                <div className="detail-item">
                                    <i className="fas fa-calendar-alt"></i>
                                    <span>
                                        {eventData.event_date ?
                                            new Date(eventData.event_date).toLocaleDateString() :
                                            'Date not specified'
                                        }
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <i className="fas fa-clock"></i>
                                    <span>
                                        {eventData.event_time || 'Time not specified'}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <i className="fas fa-map-marker-alt"></i>
                                    <span>
                                        {eventData.event_location || 'Location not specified'}
                                    </span>
                                </div>
                            </div>
                            <p className="invitation_message">
                                {eventData.event_description ||
                                    "We are thrilled to invite you to our special event. Please let us know if you can join us by filling out the RSVP form below."}
                            </p>
                        </>*
                    ) : (
                        <p className="invitation_message">
                            We are thrilled to invite you to our special event. Please let us know if you can join us by filling out the RSVP form below.
                        </p>
                    )} */}
                </div>

                <div className="rsvp_form_wrapper">
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
                                    <label className="rsvp_form__label">How many guests will you bring? (Maximum 1)</label>
                                    <div className="counter-controls">
                                        <button
                                            type="button"
                                            onClick={() => handleGuestCountChange(-1)}
                                            className="counter-btn"
                                            disabled={formData.guestCount <= 0}
                                        >
                                            -
                                        </button>
                                        <span className="guest-count">{formData.guestCount}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleGuestCountChange(1)}
                                            className="counter-btn"
                                            disabled={formData.guestCount >= 1}
                                        >
                                            +
                                        </button>
                                    </div>
                                    <input
                                        type="hidden"
                                        name="guestCount"
                                        value={formData.guestCount}
                                    />
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
                            disabled={isSubmitting}
                            className={`rsvp_form__button ${isSubmitting ? "rsvp_form__button--disabled" : ""}`}
                        >
                            {isSubmitting ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i> Submitting...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-paper-plane"></i> Submit RSVP
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RsvpForm;