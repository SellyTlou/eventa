import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./report-event.css";
import "../alert.css";

const ReportEvent = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        violation_type: "",
        description: "",
        reporter_email: ""
    });
    const [eventData, setEventData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: "", type: "" });

    const eventId = searchParams.get("event_id");

    const violationTypes = [
        { value: "inappropriate_content", label: "Inappropriate Content or Images" },
        { value: "spam", label: "Spam or Fake Event" },
        { value: "copyright", label: "Copyright Infringement" },
        { value: "harassment", label: "Harassment or Hate Speech" },
        { value: "illegal", label: "Illegal Activities" },
        { value: "other", label: "Other Issue" }
    ];

    // Unified Alert Function
    const printAlert = (message, type = "info") => {
        setAlert({ show: true, message, type });
        setTimeout(() => {
            setAlert({ show: false, message: "", type: "" });
        }, 5000);
    };

    useEffect(() => {
        if (eventId) {
            fetchEventData();
        } else {
            printAlert("No event specified", "error");
            setLoading(false);
        }
    }, [eventId]);

    const fetchEventData = async () => {
        try {
            const formData = new FormData();
            formData.append("function", "getEventById");
            formData.append("event_id", eventId);

            const response = await fetch(`${process.env.REACT_APP_API_URL}/query.php`, {
                method: "POST",
                body: formData
            });

            const data = await response.json();
            if (data.success && data.events && data.events.length > 0) {
                setEventData(data.events[0]);
            } else {
                printAlert("Event not found", "error");
            }
        } catch (error) {
            console.error("Error fetching event:", error);
            printAlert("Failed to load event details", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.violation_type) {
            printAlert("Please select a violation type", "error");
            return;
        }

        setSubmitting(true);

        try {
            const submitData = new FormData();
            submitData.append("function", "reportEvent");
            submitData.append("event_id", eventId);
            submitData.append("violation_type", formData.violation_type);
            submitData.append("description", formData.description);
            submitData.append("reporter_email", formData.reporter_email);

            const response = await fetch(`${process.env.REACT_APP_API_URL}/query.php`, {
                method: "POST",
                body: submitData
            });

            const data = await response.json();

            if (data.success) {
                printAlert("Thank you for your report. Our team will review it shortly.", "success");
                setFormData({ violation_type: "", description: "", reporter_email: "" });

                // Redirect after 3 seconds
                setTimeout(() => {
                    navigate("/");
                }, 3000);
            } else {
                printAlert(data.message || "Failed to submit report", "error");
            }
        } catch (error) {
            console.error("Error submitting report:", error);
            printAlert("Network error. Please try again.", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    if (loading) {
        return (
            <div className="report-event-container">
                <div className="loading">Loading event details...</div>
            </div>
        );
    }

    return (
        <div className="report-event-container">
            {/*  Custom Alert */}
            {alert.show && (
                <div className={`custom-alert ${alert.type}`}>
                    <i
                        className={`fas ${alert.type === "error" ? "fa-times-circle" :
                                alert.type === "success" ? "fa-check-circle" :
                                    alert.type === "warning" ? "fa-exclamation-triangle" :
                                        "fa-info-circle"
                            }`}
                    ></i>
                    <span>{alert.message}</span>
                </div>
            )}

            <div className="report-event-card">
                <div className="report-header">
                    <h1>Report Event</h1>
                    <p>Help us keep the community safe by reporting inappropriate content</p>
                </div>

                {eventData && (
                    <div className="event-preview">
                        <h3>Event Being Reported:</h3>
                        <div className="event-details">
                            <strong>{eventData.event_name}</strong>
                            {eventData.event_image && (
                                <img
                                    src={eventData.event_image}
                                    alt="Event preview"
                                    className="event-image-preview"
                                />
                            )}
                            <p>Created by: {eventData.user_name}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="report-form">
                    <div className="form-group">
                        <label>What is the issue? *</label>
                        <select
                            name="violation_type"
                            value={formData.violation_type}
                            onChange={handleChange}
                            required
                            className="form-select"
                        >
                            <option value="">Select a violation type</option>
                            {violationTypes.map(type => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Additional Details (Optional)</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Please provide any additional information that might help us review this event..."
                            className="form-textarea"
                            rows="4"
                        />
                    </div>

                    <div className="form-group">
                        <label>Your Email (Optional)</label>
                        <input
                            type="email"
                            name="reporter_email"
                            value={formData.reporter_email}
                            onChange={handleChange}
                            placeholder="Enter your email if you'd like updates on this report"
                            className="form-input"
                        />
                        <small>Your report will be anonymous unless you provide your email</small>
                    </div>

                    <div className="form-actions">
                        <button
                            type="submit"
                            disabled={submitting || !formData.violation_type}
                            className="submit-btn"
                        >
                            {submitting ? "Submitting Report..." : "Submit Report"}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            className="cancel-btn"
                        >
                            Cancel
                        </button>
                    </div>
                </form>

                <div className="report-guidelines">
                    <h4>Reporting Guidelines:</h4>
                    <ul>
                        <li>Only report events that violate our community guidelines</li>
                        <li>False reports may result in account suspension</li>
                        <li>Our team typically reviews reports within 24 hours</li>
                        <li>Event organizers will be notified if their event is removed</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ReportEvent;