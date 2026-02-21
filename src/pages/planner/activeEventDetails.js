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
    const [eventCity, setEventCity] = useState("");
    const [eventProvince, setEventProvince] = useState("");
    
    // New state for event category
    const [eventCategory, setEventCategory] = useState("");
    const [customCategory, setCustomCategory] = useState("");
    
    const [touched, setTouched] = useState({});

    // Event categories - Compact list for 4x4 grid
    const eventCategories = [
        { value: "conference", label: "Conference", icon: "🎤" },
        { value: "workshop", label: "Workshop", icon: "🛠️" },
        { value: "seminar", label: "Seminar", icon: "📚" },
        { value: "webinar", label: "Webinar", icon: "💻" },
        { value: "networking", label: "Networking", icon: "🤝" },
        { value: "party", label: "Party", icon: "🎉" },
        { value: "wedding", label: "Wedding", icon: "💒" },
        { value: "concert", label: "Concert", icon: "🎵" },
        { value: "sports", label: "Sports", icon: "⚽" },
        { value: "charity", label: "Charity", icon: "❤️" },
        { value: "corporate", label: "Corporate", icon: "🏢" },
        { value: "education", label: "Education", icon: "🎓" },
        { value: "food", label: "Food & Drink", icon: "🍽️" },
        { value: "arts", label: "Arts", icon: "🎨" },
        { value: "tech", label: "Tech", icon: "💡" },
        { value: "other", label: "Other", icon: "📌" }
    ];

    // Validation rules (updated with eventCategory)
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
        },
        eventCity: {
            maxLength: 100,
            message: "City/Town cannot exceed 100 characters"
        },
        eventProvince: {
            required: false,
            message: "Please select a province"
        },
        // New validation for event category
        eventCategory: {
            required: true,
            message: "Please select an event category"
        },
        customCategory: {
            required: false,
            maxLength: 50,
            message: "Custom category cannot exceed 50 characters"
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
        if (savedData.eventCity) setEventCity(savedData.eventCity);
        if (savedData.eventProvince) setEventProvince(savedData.eventProvince);
        
        // Load saved category
        if (savedData.eventCategory) {
            setEventCategory(savedData.eventCategory);
            if (savedData.eventCategory === "other" && savedData.customCategory) {
                setCustomCategory(savedData.customCategory);
            }
        }
    }, []);

    // Validation functions (updated with eventCategory)
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

        // Future date validation
        if (rules.futureDate && value) {
            const inputDate = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (inputDate < today) {
                return "Event date cannot be in the past";
            }
        }

        // Date comparison validation
        if (rules.afterStartDate && value && allValues.eventStartDate) {
            const startDate = new Date(allValues.eventStartDate);
            const endDate = new Date(value);
            if (endDate < startDate) {
                return "End date cannot be before start date";
            }

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
                
                const cityError = validateField("eventCity", eventCity);
                if (cityError) newErrors.eventCity = cityError;
                
                const provinceError = validateField("eventProvince", eventProvince);
                if (provinceError) newErrors.eventProvince = provinceError;
            }

            // New validation for event category (substep 3)
            if (subStep === 3) {
                const categoryError = validateField("eventCategory", eventCategory);
                if (categoryError) newErrors.eventCategory = categoryError;
                
                // Validate custom category if "other" is selected
                if (eventCategory === "other") {
                    const customError = validateField("customCategory", customCategory);
                    if (customError) newErrors.customCategory = customError;
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleBlur = (fieldName) => {
        setTouched(prev => ({ ...prev, [fieldName]: true }));

        const allValues = {
            eventStartDate,
            eventStartTime,
            eventEndDate,
            eventEndTime,
            eventName,
            eventLocation,
            eventCity,
            eventProvince,
            timezone,
            eventCategory,
            customCategory
        };

        const error = validateField(fieldName, allValues[fieldName], allValues);
        setErrors(prev => ({ ...prev, [fieldName]: error }));
    };

    const handleCategorySelect = (categoryValue) => {
        setEventCategory(categoryValue);
        if (categoryValue !== "other") {
            setCustomCategory(""); // Clear custom category when not "other"
        }
        setTouched(prev => ({ ...prev, eventCategory: true }));
        setErrors(prev => ({ ...prev, eventCategory: "" }));
    };

    // Get selected category details
    const getSelectedCategory = () => {
        if (eventCategory === "other") {
            return { label: customCategory || "Other", icon: "📌" };
        }
        return eventCategories.find(cat => cat.value === eventCategory) || null;
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
                newTouched.eventCity = true;
                newTouched.eventProvince = true;
            } else if (step2SubStep === 3) {
                newTouched.eventCategory = true;
                if (eventCategory === "other") {
                    newTouched.customCategory = true;
                }
            }
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
                setStep2SubStep(3);
            }
            else if (step2SubStep === 3) {
                const step2Data = {
                    eventStartDate,
                    eventStartTime,
                    eventEndDate,
                    eventEndTime,
                    timezone,
                    eventLocation,
                    eventCity,
                    eventProvince,
                    eventCategory,
                    customCategory: eventCategory === "other" ? customCategory : ""
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
            if (step2SubStep < 3) {
                setStep2SubStep(step2SubStep + 1);
            } else {
                const step2Data = {
                    eventStartDate,
                    eventStartTime,
                    eventEndDate,
                    eventEndTime,
                    timezone,
                    eventLocation,
                    eventCity,
                    eventProvince,
                    eventCategory,
                    customCategory: eventCategory === "other" ? customCategory : ""
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
        <>
            <LoginNav />
            <div className="eventDetails-page">
                <button
                    className="eventa-back-btn"
                    onClick={handleBack}
                >
                    &#8592; Back
                </button>
                <div className="container">
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

                            {/* Step 2: Event Details with sub-steps */}
                            {currentStep === 2 && (
                                <div className="event-step">
                                    {errors.general && <div className="form-error">{errors.general}</div>}
                                    <h2 className="step-title">Event Details</h2>
                                    
                                    {/* Sub-step 1: Date and Time */}
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

                                    {/* Sub-step 2: Location */}
                                    {step2SubStep === 2 && (
                                        <>
                                            <p className="step-subtitle">Where is your Event?</p>
                                            
                                            {/* Venue/Address field */}
                                            <div className="form-group-event">
                                                <label htmlFor="eventLocation">VENUE / ADDRESS</label>
                                                <input
                                                    type="text"
                                                    className={`form-control-event ${shouldShowError('eventLocation') ? 'error' : ''}`}
                                                    id="eventLocation"
                                                    placeholder="e.g., 123 Main Street, Convention Center"
                                                    value={eventLocation}
                                                    onChange={(e) => setEventLocation(e.target.value)}
                                                    onBlur={() => handleBlur('eventLocation')}
                                                />
                                                {shouldShowError('eventLocation') && (
                                                    <div className="field-error">{errors.eventLocation}</div>
                                                )}
                                            </div>

                                            {/* City/Town field */}
                                            <div className="form-group-event">
                                                <label htmlFor="eventCity">CITY / TOWN</label>
                                                <input
                                                    type="text"
                                                    className={`form-control-event ${shouldShowError('eventCity') ? 'error' : ''}`}
                                                    id="eventCity"
                                                    placeholder="e.g., Johannesburg, Cape Town"
                                                    value={eventCity}
                                                    onChange={(e) => setEventCity(e.target.value)}
                                                    onBlur={() => handleBlur('eventCity')}
                                                />
                                                {shouldShowError('eventCity') && (
                                                    <div className="field-error">{errors.eventCity}</div>
                                                )}
                                            </div>

                                            {/* Province dropdown */}
                                            <div className="form-group-event">
                                                <label htmlFor="eventProvince">PROVINCE / STATE</label>
                                                <select
                                                    className={`form-control-event ${shouldShowError('eventProvince') ? 'error' : ''}`}
                                                    id="eventProvince"
                                                    value={eventProvince}
                                                    onChange={(e) => setEventProvince(e.target.value)}
                                                    onBlur={() => handleBlur('eventProvince')}
                                                >
                                                    <option value="">Select a province</option>
                                                    <option value="Eastern Cape">Eastern Cape</option>
                                                    <option value="Free State">Free State</option>
                                                    <option value="Gauteng">Gauteng</option>
                                                    <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                                                    <option value="Limpopo">Limpopo</option>
                                                    <option value="Mpumalanga">Mpumalanga</option>
                                                    <option value="Northern Cape">Northern Cape</option>
                                                    <option value="North West">North West</option>
                                                    <option value="Western Cape">Western Cape</option>
                                                </select>
                                                {shouldShowError('eventProvince') && (
                                                    <div className="field-error">{errors.eventProvince}</div>
                                                )}
                                            </div>

                                            <p className="text-muted small mt-1">
                                                Not sure yet? You can add location details later.
                                            </p>
                                        </>
                                    )}

                                    {/* NEW Sub-step 3: Event Category - 4x4 Grid */}
                                    {step2SubStep === 3 && (
                                        <>
                                            <h2 className="step-title">Event Category</h2>
                                            <p className="step-subtitle">Select the type of event you're creating</p>
                                            
                                            <div className="event-category-compact">
                                                <div className="category-grid-4x4">
                                                    {eventCategories.map((category) => (
                                                        <div
                                                            key={category.value}
                                                            className={`category-option ${eventCategory === category.value ? 'selected' : ''}`}
                                                            onClick={() => handleCategorySelect(category.value)}
                                                        >
                                                            <span className="category-option-icon">{category.icon}</span>
                                                            <span className="category-option-label">{category.label}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                
                                                {shouldShowError('eventCategory') && (
                                                    <div className="field-error">
                                                        <span className="error-icon">⚠</span>
                                                        {errors.eventCategory}
                                                    </div>
                                                )}
                                                
                                                {/* Custom category input for "Other" */}
                                                {eventCategory === "other" && (
                                                    <div className="custom-category-input-container">
                                                        <label htmlFor="customCategory">Specify event type</label>
                                                        <input
                                                            type="text"
                                                            id="customCategory"
                                                            className={`form-control-event ${shouldShowError('customCategory') ? 'error' : ''}`}
                                                            placeholder="e.g., Festival, Meetup, etc."
                                                            value={customCategory}
                                                            onChange={(e) => setCustomCategory(e.target.value)}
                                                            onBlur={() => handleBlur('customCategory')}
                                                            autoFocus
                                                        />
                                                        {shouldShowError('customCategory') && (
                                                            <div className="field-error">
                                                                <span className="error-icon">⚠</span>
                                                                {errors.customCategory}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                
                                                {eventCategory && (
                                                    <div className="selected-category-badge">
                                                        <span>Selected: </span>
                                                        <strong>
                                                            {getSelectedCategory()?.icon} {eventCategory === "other" ? customCategory || "Other" : getSelectedCategory()?.label}
                                                        </strong>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <p className="text-muted small mt-2">
                                                Choose a category to help attendees find your event
                                            </p>
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
                                        <p><strong>City/Town:</strong> {eventCity || "Not specified"}</p>
                                        <p><strong>Province/State:</strong> {eventProvince || "Not specified"}</p>
                                        <p><strong>Category:</strong> {
                                            eventCategory ? (
                                                eventCategory === "other" 
                                                    ? (customCategory || "Other") 
                                                    : (eventCategories.find(cat => cat.value === eventCategory)?.label || eventCategory)
                                            ) : "Not specified"
                                        }</p>
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
                                {/* Uncomment if you want skip functionality */}
                                {/* {currentStep === 2 && step2SubStep < 3 && (
                                    <button className="btn-event btn-event-skip" onClick={handleSkip}>
                                        Skip for now
                                    </button>
                                )} */}
                            </div>
                            <div>
                                <button className="btn-event btn-event-next" onClick={handleNext}>
                                    {currentStep === 1 && "NEXT: EVENT DETAILS"}
                                    {currentStep === 2 && step2SubStep === 1 && "NEXT: LOCATION"}
                                    {currentStep === 2 && step2SubStep === 2 && "NEXT: EVENT CATEGORY"}
                                    {currentStep === 2 && step2SubStep === 3 && "NEXT: CHOOSE THEME"}
                                    {currentStep === 3 && "CHOOSE A THEME"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default ActiveEventDetails;