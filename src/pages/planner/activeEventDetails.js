import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useEventCreation } from "../../pages/eventDataCollector";
import { LoginNav } from "../components";
import "../../App.css";
import "./main.css";

function ActiveEventDetails() {
    const navigate = useNavigate();
    const { saveStep1Data, saveStep2Data, getEventDetails } = useEventCreation();

    const [currentStep, setCurrentStep] = useState(1);
    const [step2SubStep, setStep2SubStep] = useState(1);
    const [eventName, setEventName] = useState("");
    const [eventStartDate, setEventStartDate] = useState("");
    const [eventStartTime, setEventStartTime] = useState("11:15");
    const [eventEndDate, setEventEndDate] = useState("");
    const [eventEndTime, setEventEndTime] = useState("13:15");
    const [timezone, setTimezone] = useState("Africa/Johannesburg");
    const [eventLocation, setEventLocation] = useState("");
    const [eventUrl, setEventUrl] = useState("myevent");
    const [error, setError] = useState("");

    // Load saved data on component mount
    useEffect(() => {
        const savedData = getEventDetails();
        if (savedData.eventName) setEventName(savedData.eventName);
        if (savedData.eventStartDate) setEventStartDate(savedData.eventStartDate);
        if (savedData.eventStartTime) setEventStartTime(savedData.eventStartTime);
        if (savedData.eventEndDate) setEventEndDate(savedData.eventEndDate);
        if (savedData.eventEndTime) setEventEndTime(savedData.eventEndTime);
        if (savedData.timezone) setTimezone(savedData.timezone);
        if (savedData.eventLocation) setEventLocation(savedData.eventLocation);
        if (savedData.eventUrl) setEventUrl(savedData.eventUrl);
    }, []);

    const getStepClass = (step) => {
        if (step === currentStep) {
            return "progress-step active";
        } else if (step < currentStep) {
            return "progress-step completed";
        } else {
            return "progress-step";
        }
    };

    const handleNext = () => {
        setError("");

        if (currentStep === 1) {
            if (!eventName.trim()) {
                setError("Please enter the event name.");
                return;
            }

            // Save step 1 data
            if (saveStep1Data(eventName)) {
                setCurrentStep(2);
            } else {
                setError("Failed to save event data. Please try again.");
            }
        }
        else if (currentStep === 2) {
            if (step2SubStep === 1) {
                if (!eventStartDate || !eventStartTime || !eventEndDate || !eventEndTime || !timezone) {
                    setError("Please fill in all date, time, and timezone fields.");
                    return;
                }
                setStep2SubStep(2);
            }
            else if (step2SubStep === 2) {
                // Location is optional, so we can proceed even if empty
                setStep2SubStep(3);
            }
            else if (step2SubStep === 3) {
                if (!eventUrl.trim()) {
                    setError("Please enter a URL for your event.");
                    return;
                }

                // Save all step 2 data
                const step2Data = {
                    eventStartDate,
                    eventStartTime,
                    eventEndDate,
                    eventEndTime,
                    timezone,
                    eventLocation,
                    eventUrl
                };

                if (saveStep2Data(step2Data)) {
                    setCurrentStep(3);
                    setStep2SubStep(1);
                } else {
                    setError("Failed to save event details. Please try again.");
                }
            }
        }
        else if (currentStep === 3) {
            navigate("/eventTheme");
        }
    };

    const handleBack = () => {
        if (currentStep === 2 && step2SubStep > 1) {
            setStep2SubStep(step2SubStep - 1);
            return;
        }
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
            if (currentStep === 2) setStep2SubStep(1);
        }
        else {
            window.history.back();
        }
    };

    const handleSkip = () => {
        if (currentStep === 2) {
            if (step2SubStep < 3) {
                setStep2SubStep(step2SubStep + 1);
            } else {
                // Save data before moving to next step
                const step2Data = {
                    eventStartDate,
                    eventStartTime,
                    eventEndDate,
                    eventEndTime,
                    timezone,
                    eventLocation,
                    eventUrl
                };

                if (saveStep2Data(step2Data)) {
                    setCurrentStep(3);
                    setStep2SubStep(1);
                }
            }
        }
    };

    return (
        <div>
            {/* Header Bar with Logo and Back Button */}

            <LoginNav />
            <button
                className="eventa-back-btn"
                onClick={handleBack}
            >
                &#8592; Back
            </button>
            <div className="progressBar">
                <div className="container">
                    <div className="row">
                        <div className={getStepClass(1)}>
                            <div className="step-circle">1</div>
                            <div className="step-label">Event Name</div>
                        </div>
                        <div className={getStepClass(2)}>
                            <div className="step-circle">2</div>
                            <div className="step-label">Event Details</div>
                        </div>
                        <div className={getStepClass(3)}>
                            <div className="step-circle">3</div>
                            <div className="step-label">Choose a Theme</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="create-event-container" id="createEventPage">
                <div className="create-event-body">
                    {/* Step 1: Event Name */}
                    {currentStep === 1 && (
                        <div className="event-step">
                            {error && <div className="form-error" style={{ color: "red", marginBottom: 16 }}>{error}</div>}
                            <h2 className="step-title">What's the name of your Event</h2>
                            <p className="step-subtitle">Type the name of your Event</p>
                            <div className="form-group-event">
                                <input
                                    type="text"
                                    className="form-control-event"
                                    id="eventName"
                                    placeholder="e.g., mfana's Birthday Party"
                                    value={eventName}
                                    onChange={(e) => setEventName(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Event Details with sub-steps */}
                    {currentStep === 2 && (
                        <div className="event-step">
                            {error && <div className="form-error" style={{ color: "red", marginBottom: 16 }}>{error}</div>}
                            <h2 className="step-title">Event Details</h2>
                            {step2SubStep === 1 && (
                                <>
                                    <p className="step-subtitle">
                                        When is Your Event? <span className="text-muted">Not sure yet? You can add things later.</span>
                                    </p>
                                    <div className="datetime-row">
                                        <div className="datetime-group">
                                            <label htmlFor="eventStartDate">EVENT START - Date</label>
                                            <input
                                                type="date"
                                                className="form-control-event"
                                                id="eventStartDate"
                                                value={eventStartDate}
                                                onChange={(e) => setEventStartDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="datetime-group">
                                            <label htmlFor="eventStartTime">Time</label>
                                            <input
                                                type="time"
                                                className="form-control-event"
                                                id="eventStartTime"
                                                value={eventStartTime}
                                                onChange={(e) => setEventStartTime(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="datetime-row">
                                        <div className="datetime-group">
                                            <label htmlFor="eventEndDate">EVENT END - Date</label>
                                            <input
                                                type="date"
                                                className="form-control-event"
                                                id="eventEndDate"
                                                value={eventEndDate}
                                                onChange={(e) => setEventEndDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="datetime-group">
                                            <label htmlFor="eventEndTime">Time</label>
                                            <input
                                                type="time"
                                                className="form-control-event"
                                                id="eventEndTime"
                                                value={eventEndTime}
                                                onChange={(e) => setEventEndTime(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group-event">
                                        <label htmlFor="timezone">TIMEZONE</label>
                                        <select
                                            className="form-control-event"
                                            id="timezone"
                                            value={timezone}
                                            onChange={(e) => setTimezone(e.target.value)}
                                        >
                                            <option value="Africa/Johannesburg">Africa/Johannesburg</option>
                                            <option value="UTC">UTC</option>
                                            <option value="Europe/London">Europe/London</option>
                                            <option value="America/New_York">America/New_York</option>
                                        </select>
                                    </div>
                                </>
                            )}
                            {step2SubStep === 2 && (
                                <>
                                    <p className="step-subtitle">Where is your Event?</p>
                                    <div className="form-group-event">
                                        <input
                                            type="text"
                                            className="form-control-event"
                                            id="eventLocation"
                                            placeholder="Venue or Address"
                                            value={eventLocation}
                                            onChange={(e) => setEventLocation(e.target.value)}
                                        />
                                        <p className="text-muted small mt-1">Not sure yet? You can add location later.</p>
                                    </div>
                                </>
                            )}
                            {step2SubStep === 3 && (
                                <>
                                    <p className="step-subtitle">Customize your Eventa URL link</p>
                                    <div className="form-group-event">
                                        <input
                                            type="text"
                                            className="form-control-event"
                                            id="eventUrl"
                                            placeholder="myevent"
                                            value={eventUrl}
                                            onChange={(e) => setEventUrl(e.target.value)}
                                        />
                                        <div className="url-preview">
                                            <span className="url-preview-prefix">https://</span>
                                            <span className="url-preview-value">{eventUrl || "myevent"}</span>
                                            <span className="url-preview-prefix">.eventa.com</span>
                                        </div>
                                        <p className="text-muted small mt-1">
                                            This is the link you'll give to your guests so they can RSVP to your event.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Step 3: Confirmation before going to theme selection */}
                    {currentStep === 3 && (
                        <div className="event-step">
                            <h2 className="step-title">Ready to choose a theme!</h2>
                            <p className="step-subtitle">
                                Now let's create a beautiful invitation for your event.
                                You'll be able to customize colors, add text, and more.
                            </p>
                            <div className="event-summary">
                                <h3>Event Summary</h3>
                                <p><strong>Name:</strong> {eventName}</p>
                                <p><strong>When:</strong> {eventStartDate} {eventStartTime} to {eventEndDate} {eventEndTime}</p>
                                <p><strong>Where:</strong> {eventLocation || "Not specified"}</p>
                                <p><strong>URL:</strong> https://{eventUrl || "myevent"}.eventa.com</p>
                            </div>
                        </div>
                    )}
                </div>


                <div className="create-event-footer">
                    <div>
                        {currentStep > 1 && (
                            <button className="btn-event btn-event-back" onClick={handleBack}>
                                Back
                            </button>
                        )}
                        {currentStep === 2 && step2SubStep < 3 && (
                            <button className="btn-event btn-event-skip" onClick={handleSkip}>
                                Skip for now
                            </button>
                        )}
                    </div>
                    <div>
                        <button className="btn-event btn-event-next" onClick={handleNext}>
                            {currentStep === 1 && "NEXT: EVENT DETAILS"}
                            {currentStep === 2 && step2SubStep === 1 && "NEXT: LOCATION"}
                            {currentStep === 2 && step2SubStep === 2 && "NEXT: EVENTA URL"}
                            {currentStep === 2 && step2SubStep === 3 && "NEXT: CHOOSE THEME"}
                            {currentStep === 3 && "CHOOSE A THEME"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ActiveEventDetails;