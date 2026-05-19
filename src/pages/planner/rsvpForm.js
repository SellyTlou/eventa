import React, { useState, useEffect } from "react";
import "./rsvp.css";
import '../../alert.css';
import { useSearchParams, useNavigate } from 'react-router-dom';

const RsvpForm = () => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        attending: "yes",
        guestCount: 0,
        message: "",
        customAnswers: {}  // Store answers to custom questions
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
    const [customQuestions, setCustomQuestions] = useState([]); // New state for custom questions
    const navigate = useNavigate();
    const [eventStatus, setEventStatus] = useState(null);

    // Custom alert
    const [alert, setAlert] = useState({ show: false, message: "", type: "" });
    const printAlert = (message, type = "info") => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert({ show: false, message: "", type: "" }), 5000);
    };

    // Phone handler
    const handlePhoneChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.length > 0 && value[0] !== '0') {
            value = '0' + value;
        }
        
        if (value.length > 10) {
            value = value.slice(0, 10);
        }
        
        if (value.length > 1) {
            if (value.length <= 3) {
                value = value.replace(/(\d{3})/, '$1');
            } else if (value.length <= 6) {
                value = value.replace(/(\d{3})(\d{0,})/, '$1 $2');
            } else {
                value = value.replace(/(\d{3})(\d{3})(\d{0,})/, '$1 $2 $3');
            }
        }
        
        setFormData(prev => ({
            ...prev,
            phone: value
        }));
    };

    // Handle custom question answer change
    const handleCustomAnswerChange = (questionId, value) => {
        setFormData(prev => ({
            ...prev,
            customAnswers: {
                ...prev.customAnswers,
                [questionId]: value
            }
        }));
    };

    // General form change handler
    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name !== 'phone') {
            setFormData(prev => ({
                ...prev,
                [name]: value,
                ...(name === "attending" && value === "no" && { guestCount: 0 })
            }));
        }
    };

    useEffect(() => {
        const id = searchParams.get("event_id");
        if (id) {
            setEventId(id);
            fetchEventData(id);
            fetchCustomQuestions(id); // Load custom questions
            setUser(searchParams.get("user_email") || "");
        }
    }, [searchParams]);

    const fetchEventData = async (eventId) => {
        try {
            setLoadingEvent(true);
            setEventStatus(null);

            const event = await fetchEvent(eventId);
            if (!event) {
                setEventStatus('not_found');
                setLoadingEvent(false);
                return;
            }

            const isCanceled = event.status === 'cancelled' || event.status === 'Cancelled';
            if (isCanceled) {
                setEventStatus('canceled');
                setLoadingEvent(false);
                return;
            }

            const eventDateTime = new Date(`${event.event_start_date}T${event.event_start_time || '00:00'}`);
            const now = new Date();
            if (eventDateTime < now) {
                setEventStatus('past');
                setLoadingEvent(false);
                return;
            }

            setEventStatus('active');
            setEventData(event);

            await Promise.all([
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

    // Fetch custom questions from database
    const fetchCustomQuestions = async (eventId) => {
        try {
            const formData = new FormData();
            formData.append("function", "getEventCustomQuestions");
            formData.append("event_id", eventId);

            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/rsvp.php`, {
                method: "POST",
                body: formData,
            });

            const data = await response.json();
            if (data.success && data.questions) {
                setCustomQuestions(data.questions);
                console.log("Loaded custom questions:", data.questions);
            }
        } catch (err) {
            console.error("Error fetching custom questions:", err);
        }
    };

    const fetchRsvpCount = async (eventId) => {
        try {
            if (!eventId) return;
            const form = new FormData();
            form.append("function", "getRsvpGuestCount");
            form.append("event_id", eventId);

            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/rsvp.php`, {
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
        }
    };

    const fetchEventLimit = async (eventId) => {
        try {
            if (!eventId) return;
            const form = new FormData();
            form.append("function", "getEventGuestLimit");
            form.append("event_id", eventId);

            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/rsvp.php`, {
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
            return 0;
        }
    };

    const fetchEvent = async (eventId) => {
        try {
            const form = new FormData();
            form.append("function", "getEventById");
            form.append("event_id", eventId);

            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/events.php`, {
                method: "POST",
                body: form
            });

            const data = await response.json();
            if (data.success && data.events && data.events.length > 0) {
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

    const handleGuestCountChange = (increment) => {
        setFormData(prev => ({
            ...prev,
            guestCount: Math.max(0, Math.min(1, prev.guestCount + increment))
        }));
    };

    // Render a question based on its type
    const renderQuestion = (question) => {
        const answer = formData.customAnswers[question.id] || '';
        
        switch (question.question_type) {
            case 'text':
                return (
                    <input
                        type="text"
                        value={answer}
                        onChange={(e) => handleCustomAnswerChange(question.id, e.target.value)}
                        className="rsvp_form__input"
                        placeholder="Your answer..."
                    />
                );
            
            case 'textarea':
                return (
                    <textarea
                        value={answer}
                        onChange={(e) => handleCustomAnswerChange(question.id, e.target.value)}
                        className="rsvp_form__textarea"
                        rows="3"
                        placeholder="Your answer..."
                    />
                );
            
            case 'select':
                return (
                    <select
                        value={answer}
                        onChange={(e) => handleCustomAnswerChange(question.id, e.target.value)}
                        className="rsvp_form__input"
                    >
                        <option value="">Select an option...</option>
                        <option value="Option 1">Option 1</option>
                        <option value="Option 2">Option 2</option>
                        <option value="Option 3">Option 3</option>
                    </select>
                );
            
            case 'radio':
                return (
                    <div className="custom-radio-group">
                        <label className="custom-radio-option">
                            <input
                                type="radio"
                                name={`question_${question.id}`}
                                value="Option 1"
                                checked={answer === "Option 1"}
                                onChange={(e) => handleCustomAnswerChange(question.id, e.target.value)}
                            />
                            <span>Option 1</span>
                        </label>
                        <label className="custom-radio-option">
                            <input
                                type="radio"
                                name={`question_${question.id}`}
                                value="Option 2"
                                checked={answer === "Option 2"}
                                onChange={(e) => handleCustomAnswerChange(question.id, e.target.value)}
                            />
                            <span>Option 2</span>
                        </label>
                        <label className="custom-radio-option">
                            <input
                                type="radio"
                                name={`question_${question.id}`}
                                value="Option 3"
                                checked={answer === "Option 3"}
                                onChange={(e) => handleCustomAnswerChange(question.id, e.target.value)}
                            />
                            <span>Option 3</span>
                        </label>
                    </div>
                );
            
            default:
                return (
                    <input
                        type="text"
                        value={answer}
                        onChange={(e) => handleCustomAnswerChange(question.id, e.target.value)}
                        className="rsvp_form__input"
                        placeholder="Your answer..."
                    />
                );
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const availableSpots = totalEventLimit - totalRplyGuestCount;
        const requestedSpots = formData.attending === "yes" ? 1 + formData.guestCount : 0;

        if (totalEventLimit > 0 && requestedSpots > availableSpots) {
            printAlert(`Sorry, only ${availableSpots} spot(s) available`, "warning");
            return;
        }

        // Validate required custom questions
        const missingRequired = customQuestions.filter(q => q.is_required === 1 && !formData.customAnswers[q.id]);
        if (missingRequired.length > 0) {
            printAlert(`Please answer: ${missingRequired.map(q => q.question_text).join(", ")}`, "warning");
            return;
        }

        setError(null);
        setIsSubmitting(true);

        const formDataToSend = new FormData();
        formDataToSend.append("function", "guestRsvp");
        formDataToSend.append("event_id", event_id);
        formDataToSend.append("name", formData.name);
        formDataToSend.append("email", formData.email);
        formDataToSend.append("phone", formData.phone);
        formDataToSend.append("attending", formData.attending);
        formDataToSend.append("message", formData.message);
        formDataToSend.append("guestCount", formData.guestCount);
        formDataToSend.append("totalRplyGuestCount", totalRplyGuestCount);
        formDataToSend.append("totalEventLimit", totalEventLimit);
        formDataToSend.append("customAnswers", JSON.stringify(formData.customAnswers)); // Send custom answers

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/rsvp.php`, {
                method: "POST",
                body: formDataToSend,
            });

            if (!response.ok) throw new Error("Network error");

            const result = await response.json();

            if (result.success) {
                printAlert(result.message || "RSVP submitted successfully!", "success");
                setFormData({
                    name: "", email: "", phone: "", attending: "yes", guestCount: 0, message: "", customAnswers: {}
                });
                await fetchEventData(event_id);
                setTimeout(() => {
                    navigate("/");
                }, 3000);
            } else {
                throw new Error(result.message || "Failed to submit RSVP");
            }
        } catch (err) {
            printAlert(err.message || "Failed to submit RSVP", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // LOADING
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

    // EVENT NOT FOUND
    if (eventStatus === 'not_found') {
        return (
            <div className="rsvp_form__container">
                <div className="event-status-message error">
                    <i className="fas fa-exclamation-triangle"></i>
                    <h2>Event Not Found</h2>
                    <p>This event does not exist or has been removed.</p>
                    <p>Please check the invitation link or contact the organizer.</p>
                </div>
            </div>
        );
    }

    // EVENT CANCELED
    if (eventStatus === 'canceled') {
        return (
            <div className="rsvp_form__container">
                <div className="event-status-message warning">
                    <i className="fas fa-ban"></i>
                    <h2>Event Canceled</h2>
                    <p><strong>{eventData?.event_name}</strong> has been canceled by the organizer.</p>
                    <p>RSVP is no longer available.</p>
                </div>
            </div>
        );
    }

    // EVENT PAST
    if (eventStatus === 'past') {
        return (
            <div className="rsvp_form__container">
                <div className="event-status-message info">
                    <i className="fas fa-clock"></i>
                    <h2>Event Has Passed</h2>
                    <p><strong>{eventData?.event_name}</strong> took place on:</p>
                    <p className="event-date">
                        {new Date(`${eventData.event_start_date}T${eventData.event_start_time || '00:00'}`).toLocaleString()}
                    </p>
                    <p>RSVP is now closed.</p>
                </div>
            </div>
        );
    }

    // EVENT FULL
    const availableSpots = totalEventLimit - totalRplyGuestCount;
    const isEventFull = totalEventLimit > 0 && availableSpots <= 0;

    return (
        <div className="rsvp_form__container">

            {/* Custom alert */}
            {alert.show && (
                <div className={`custom-alert ${alert.type}`}>
                    <i className={`fas ${alert.type === "error" ? "fa-times-circle" :
                        alert.type === "success" ? "fa-check-circle" :
                            alert.type === "warning" ? "fa-exclamation-triangle" :
                                "fa-info-circle"
                        }`}></i>
                    <span>{alert.message}</span>
                </div>
            )}

            {/* Full overlay */}
            {isEventFull && (
                <div className="event-full-overlay">
                    <div className="event-full-message">
                        <h2>Sorry, this event is fully booked!</h2>
                        <p>Maximum limit: <strong>{totalEventLimit}</strong> guests</p>
                        <p>Currently registered: <strong>{totalRplyGuestCount}</strong></p>
                        <p>Contact organizer: <strong>{userEmail || "info@example.com"}</strong></p>
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
                                    alt="Event"
                                    className="invitation_image"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                            ) : (
                                <div className="no-image-placeholder">
                                    <i className="fas fa-image"></i>
                                    <p>No image</p>
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
                                    <span>{new Date(`${eventData.event_start_date}T${eventData.event_start_time}`).toLocaleString()}</span>
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
                                    <label className="rsvp_form__label">Your Full Name *</label>
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
                                    <label className="rsvp_form__label">Your Email *</label>
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

                            {/* Phone Number Row */}
                            <div className="form-row">
                                <div className="rsvp_form__group">
                                    <label className="rsvp_form__label">Phone Number</label>
                                    <div className="phone-input-container">
                                        <span className="phone-prefix">+27</span>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handlePhoneChange}
                                            className="rsvp_form__input phone-input"
                                            placeholder="Phone number"
                                            maxLength="12"
                                        />
                                    </div>
                                    <small className="phone-hint">Enter your 9-digit SA number starting with 0</small>
                                </div>
                            </div>

                            <div className="rsvp_form__group--radio">
                                <label className="rsvp_form__label">Will you be attending? *</label>
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
                                            How many guests? (Max 1)
                                            {availableSpots > 0 && (
                                                <span style={{ fontSize: '0.9em', color: '#666', marginLeft: '10px' }}>
                                                    Available: {availableSpots}
                                                </span>
                                            )}
                                        </label>
                                        <div className="counter-controls">
                                            <button
                                                type="button"
                                                onClick={() => handleGuestCountChange(-1)}
                                                className="counter-btn"
                                                disabled={formData.guestCount <= 0 || isEventFull}
                                            >-</button>
                                            <span className="guest-count">{formData.guestCount}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleGuestCountChange(1)}
                                                className="counter-btn"
                                                disabled={formData.guestCount >= 1 || availableSpots <= 1 || isEventFull}
                                            >+</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Custom Questions Section - NEW */}
                            {customQuestions.length > 0 && (
                                <div className="custom-questions-section">
                                    <h3 className="rsvp_form__guests_title">
                                        <i className="fas fa-question-circle"></i> Additional Information
                                    </h3>
                                    {customQuestions.map((question) => (
                                        <div key={question.id} className="rsvp_form__group">
                                            <label className="rsvp_form__label">
                                                {question.question_text}
                                                {question.is_required === 1 && <span className="required-star"> *</span>}
                                            </label>
                                            {renderQuestion(question)}
                                        </div>
                                    ))}
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
                                    placeholder="Dietary needs, notes..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || isEventFull}
                                className={`rsvp_form__button ${isSubmitting || isEventFull ? "rsvp_form__button--disabled" : ""}`}
                            >
                                {isSubmitting ? (
                                    <>Submitting...</>
                                ) : isEventFull ? (
                                    <>Event Full</>
                                ) : (
                                    <>Submit RSVP</>
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