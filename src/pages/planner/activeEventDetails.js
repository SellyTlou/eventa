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
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    // Validation rules (removed eventUrl validation)
    const validationRules = {
        eventName: {
            required: true,
            minLength: 2,
            maxLength: 100,
            pattern: /^[a-zA-Z0-9\s\-_'",.!&()@]+$/,
            message: "Event name must be 2-100 characters long and can only contain letters, numbers, spaces, and basic punctuation"
        },
        eventStartDate: {
            required: true,
            futureDate: true,
            message: "Event start date must be in the future"
        },
        eventStartTime: {
            required: true,
            message: "Event start time is required"
        },
        eventEndDate: {
            required: true,
            futureDate: true,
            afterStartDate: true,
            message: "Event end date must be after start date"
        },
        eventEndTime: {
            required: true,
            afterStartTime: true,
            message: "Event end time must be after start time"
        },
        timezone: {
            required: true,
            message: "Timezone is required"
        },
        eventLocation: {
            maxLength: 200,
            message: "Location cannot exceed 200 characters"
        }
    };

    // Helper function to get today's date in YYYY-MM-DD format
    const getTodayDate = () => {
        return new Date().toISOString().split('T')[0];
    };

    // Helper function to get minimum end date
    const getMinEndDate = () => {
        if (eventStartDate) {
            const startDate = new Date(eventStartDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Return the later date between start date and today
            return startDate > today ? eventStartDate : getTodayDate();
        }
        return getTodayDate();
    };

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
    }, []);

    // Validation functions (removed eventUrl validation)
    const validateField = (name, value, allValues = {}) => {
        const rules = validationRules[name];
        if (!rules) return "";

        // Required validation
        if (rules.required && (!value || value.trim() === "")) {
            return "This field is required";
        }

        // Min length validation
        if (rules.minLength && value && value.length < rules.minLength) {
            return `Must be at least ${rules.minLength} characters long`;
        }

        // Max length validation
        if (rules.maxLength && value && value.length > rules.maxLength) {
            return `Cannot exceed ${rules.maxLength} characters`;
        }

        // Pattern validation
        if (rules.pattern && value && !rules.pattern.test(value)) {
            return rules.message;
        }

        // Future date validation - enhanced
        if (rules.futureDate && value) {
            const inputDate = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (inputDate < today) {
                return "Event date cannot be in the past";
            }
        }

        // Date comparison validation - enhanced
        if (rules.afterStartDate && value && allValues.eventStartDate) {
            const startDate = new Date(allValues.eventStartDate);
            const endDate = new Date(value);
            if (endDate < startDate) {
                return "End date cannot be before start date";
            }
            
            // Also check if end date is in the past
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (endDate < today) {
                return "End date cannot be in the past";
            }
        }

        // Time comparison validation
        if (rules.afterStartTime && value && allValues.eventStartTime && 
            allValues.eventStartDate && allValues.eventEndDate) {
            
            const startDateTime = new Date(`${allValues.eventStartDate}T${allValues.eventStartTime}`);
            const endDateTime = new Date(`${allValues.eventEndDate}T${value}`);
            
            if (startDateTime.getTime() === endDateTime.getTime()) {
                return "End time cannot be the same as start time";
            }
            
            if (endDateTime <= startDateTime) {
                return "End time must be after start time";
            }
        }

        return "";
    };

    const validateStep = (step, subStep = null) => {
        const newErrors = {};

        if (step === 1) {
            const eventNameError = validateField("eventName", eventName);
            if (eventNameError) newErrors.eventName = eventNameError;
        }

        if (step === 2) {
            if (subStep === 1) {
                const allValues = {
                    eventStartDate,
                    eventStartTime,
                    eventEndDate,
                    eventEndTime
                };

                const startDateError = validateField("eventStartDate", eventStartDate);
                if (startDateError) newErrors.eventStartDate = startDateError;

                const startTimeError = validateField("eventStartTime", eventStartTime, allValues);
                if (startTimeError) newErrors.eventStartTime = startTimeError;

                const endDateError = validateField("eventEndDate", eventEndDate, allValues);
                if (endDateError) newErrors.eventEndDate = endDateError;

                const endTimeError = validateField("eventEndTime", eventEndTime, allValues);
                if (endTimeError) newErrors.eventEndTime = endTimeError;

                const timezoneError = validateField("timezone", timezone);
                if (timezoneError) newErrors.timezone = timezoneError;
            }

            if (subStep === 2) {
                const locationError = validateField("eventLocation", eventLocation);
                if (locationError) newErrors.eventLocation = locationError;
            }
            // Removed subStep === 3 (URL validation)
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleBlur = (fieldName) => {
        setTouched(prev => ({ ...prev, [fieldName]: true }));
        
        // Validate individual field on blur
        const allValues = {
            eventStartDate,
            eventStartTime,
            eventEndDate,
            eventEndTime,
            eventName,
            eventLocation,
            timezone
        };
        
        const error = validateField(fieldName, allValues[fieldName], allValues);
        setErrors(prev => ({ ...prev, [fieldName]: error }));
    };

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
        // Mark all fields in current step as touched
        const newTouched = { ...touched };
        if (currentStep === 1) {
            newTouched.eventName = true;
        } else if (currentStep === 2) {
            if (step2SubStep === 1) {
                newTouched.eventStartDate = true;
                newTouched.eventStartTime = true;
                newTouched.eventEndDate = true;
                newTouched.eventEndTime = true;
                newTouched.timezone = true;
            } else if (step2SubStep === 2) {
                newTouched.eventLocation = true;
            }
            // Removed subStep === 3
        }
        setTouched(newTouched);

        // Validate current step
        const isValid = validateStep(currentStep, step2SubStep);
        if (!isValid) return;

        if (currentStep === 1) {
            if (saveStep1Data(eventName)) {
                setCurrentStep(2);
            } else {
                setErrors({ general: "Failed to save event data. Please try again." });
            }
        }
        else if (currentStep === 2) {
            if (step2SubStep === 1) {
                setStep2SubStep(2);
            }
            else if (step2SubStep === 2) {
                const step2Data = {
                    eventStartDate,
                    eventStartTime,
                    eventEndDate,
                    eventEndTime,
                    timezone,
                    eventLocation
                    // Removed eventUrl
                };

                if (saveStep2Data(step2Data)) {
                    setCurrentStep(3);
                    setStep2SubStep(1);
                } else {
                    setErrors({ general: "Failed to save event details. Please try again." });
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
            if (step2SubStep < 2) { // Changed from 3 to 2
                setStep2SubStep(step2SubStep + 1);
            } else {
                const step2Data = {
                    eventStartDate,
                    eventStartTime,
                    eventEndDate,
                    eventEndTime,
                    timezone,
                    eventLocation
                    // Removed eventUrl
                };

                if (saveStep2Data(step2Data)) {
                    setCurrentStep(3);
                    setStep2SubStep(1);
                }
            }
        }
    };

    // Helper function to check if field should show error
    const shouldShowError = (fieldName) => {
        return touched[fieldName] && errors[fieldName];
    };

    return (
        <div>
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
                            {errors.general && <div className="form-error">{errors.general}</div>}
                            <h2 className="step-title">What's the name of your Event</h2>
                            <p className="step-subtitle">Type the name of your Event</p>
                            <div className="form-group-event">
                                <input
                                    type="text"
                                    className={`form-control-event ${shouldShowError('eventName') ? 'error' : ''}`}
                                    id="eventName"
                                    placeholder="e.g., mfana's Birthday Party"
                                    value={eventName}
                                    onChange={(e) => setEventName(e.target.value)}
                                    onBlur={() => handleBlur('eventName')}
                                />
                                {shouldShowError('eventName') && (
                                    <div className="field-error">{errors.eventName}</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Event Details with sub-steps (removed URL sub-step) */}
                    {currentStep === 2 && (
                        <div className="event-step">
                            {errors.general && <div className="form-error">{errors.general}</div>}
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
                                                className={`form-control-event ${shouldShowError('eventStartDate') ? 'error' : ''}`}
                                                id="eventStartDate"
                                                value={eventStartDate}
                                                onChange={(e) => setEventStartDate(e.target.value)}
                                                onBlur={() => handleBlur('eventStartDate')}
                                                min={getTodayDate()}
                                            />
                                            {shouldShowError('eventStartDate') && (
                                                <div className="field-error">{errors.eventStartDate}</div>
                                            )}
                                        </div>
                                        <div className="datetime-group">
                                            <label htmlFor="eventStartTime">Time</label>
                                            <input
                                                type="time"
                                                className={`form-control-event ${shouldShowError('eventStartTime') ? 'error' : ''}`}
                                                id="eventStartTime"
                                                value={eventStartTime}
                                                onChange={(e) => setEventStartTime(e.target.value)}
                                                onBlur={() => handleBlur('eventStartTime')}
                                            />
                                            {shouldShowError('eventStartTime') && (
                                                <div className="field-error">{errors.eventStartTime}</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="datetime-row">
                                        <div className="datetime-group">
                                            <label htmlFor="eventEndDate">EVENT END - Date</label>
                                            <input
                                                type="date"
                                                className={`form-control-event ${shouldShowError('eventEndDate') ? 'error' : ''}`}
                                                id="eventEndDate"
                                                value={eventEndDate}
                                                onChange={(e) => setEventEndDate(e.target.value)}
                                                onBlur={() => handleBlur('eventEndDate')}
                                                min={getMinEndDate()}
                                            />
                                            {shouldShowError('eventEndDate') && (
                                                <div className="field-error">{errors.eventEndDate}</div>
                                            )}
                                        </div>
                                        <div className="datetime-group">
                                            <label htmlFor="eventEndTime">Time</label>
                                            <input
                                                type="time"
                                                className={`form-control-event ${shouldShowError('eventEndTime') ? 'error' : ''}`}
                                                id="eventEndTime"
                                                value={eventEndTime}
                                                onChange={(e) => setEventEndTime(e.target.value)}
                                                onBlur={() => handleBlur('eventEndTime')}
                                            />
                                            {shouldShowError('eventEndTime') && (
                                                <div className="field-error">{errors.eventEndTime}</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="form-group-event">
                                        <label htmlFor="timezone">TIMEZONE</label>
                                        <select
                                            className={`form-control-event ${shouldShowError('timezone') ? 'error' : ''}`}
                                            id="timezone"
                                            value={timezone}
                                            onChange={(e) => setTimezone(e.target.value)}
                                            onBlur={() => handleBlur('timezone')}
                                        >
                                            <option value="Africa/Johannesburg">Africa/Johannesburg</option>
                                            <option value="UTC">UTC</option>
                                            <option value="Europe/London">Europe/London</option>
                                            <option value="America/New_York">America/New_York</option>
                                        </select>
                                        {shouldShowError('timezone') && (
                                            <div className="field-error">{errors.timezone}</div>
                                        )}
                                    </div>
                                </>
                            )}
                            {step2SubStep === 2 && (
                                <>
                                    <p className="step-subtitle">Where is your Event?</p>
                                    <div className="form-group-event">
                                        <input
                                            type="text"
                                            className={`form-control-event ${shouldShowError('eventLocation') ? 'error' : ''}`}
                                            id="eventLocation"
                                            placeholder="Venue or Address"
                                            value={eventLocation}
                                            onChange={(e) => setEventLocation(e.target.value)}
                                            onBlur={() => handleBlur('eventLocation')}
                                        />
                                        {shouldShowError('eventLocation') && (
                                            <div className="field-error">{errors.eventLocation}</div>
                                        )}
                                        <p className="text-muted small mt-1">Not sure yet? You can add location later.</p>
                                    </div>
                                </>
                            )}
                            {/* Removed step2SubStep === 3 (URL step) */}
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
                        {currentStep === 2 && step2SubStep < 2 && ( // Changed from 3 to 2
                            <button className="btn-event btn-event-skip" onClick={handleSkip}>
                                Skip for now
                            </button>
                        )}
                    </div>
                    <div>
                        <button className="btn-event btn-event-next" onClick={handleNext}>
                            {currentStep === 1 && "NEXT: EVENT DETAILS"}
                            {currentStep === 2 && step2SubStep === 1 && "NEXT: LOCATION"}
                            {currentStep === 2 && step2SubStep === 2 && "NEXT: CHOOSE THEME"} {/* Updated text */}
                            {currentStep === 3 && "CHOOSE A THEME"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ActiveEventDetails;