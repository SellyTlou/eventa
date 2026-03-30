import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import EventProgressBar from "./EventProgressBar";
import "../App.css";
import "../responce.css";

import { Navbar, Footer, Login } from "./components";
import { useEventCreation } from "./eventDataCollector";

function CreateEvent() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [step2SubStep, setStep2SubStep] = useState(1);
  const [eventName, setEventName] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventStartTime, setEventStartTime] = useState("11:15");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventEndTime, setEventEndTime] = useState("13:15");
  const [timezone, setTimezone] = useState("Africa/Johannesburg");
  const [eventLocation, setEventLocation] = useState("");
  const [eventCity, setEventCity] = useState("");
  const [eventProvince, setEventProvince] = useState("");
  const [eventCategory, setEventCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  
  // NEW: Event Type State
  const [eventType, setEventType] = useState(""); // "ticket" or "rsvp"
  const [ticketPrice, setTicketPrice] = useState("");
  const [ticketQuantity, setTicketQuantity] = useState("");
  const [rsvpLimit, setRsvpLimit] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);
  
  const [error, setError] = useState("");
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [loginMode, setLoginMode] = useState("login");
  const [loginAccountType, setLoginAccountType] = useState("personal");
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [user, setUser] = useState(null);

  const { saveStep1Data, saveStep2Data, getEventDetails, saveEventTypeData } = useEventCreation();
  const totalSteps = 4; // Changed from 3 to 4 (added event type step)

  // Event categories
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

  // Check if user is already logged in on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setCurrentStep(1);
    } else {
      setCurrentStep(4); // Changed from 3 to 4 (login step is now step 4)
    }
  }, []);

  // Load saved data when user logs in
  useEffect(() => {
    const loadSavedData = async () => {
      if (user) {
        try {
          const savedData = await getEventDetails?.();
          if (savedData) {
            if (savedData.eventName) setEventName(savedData.eventName);
            if (savedData.eventStartDate) setEventStartDate(savedData.eventStartDate);
            if (savedData.eventStartTime) setEventStartTime(savedData.eventStartTime);
            if (savedData.eventEndDate) setEventEndDate(savedData.eventEndDate);
            if (savedData.eventEndTime) setEventEndTime(savedData.eventEndTime);
            if (savedData.timezone) setTimezone(savedData.timezone);
            if (savedData.eventLocation) setEventLocation(savedData.eventLocation);
            if (savedData.eventCity) setEventCity(savedData.eventCity);
            if (savedData.eventProvince) setEventProvince(savedData.eventProvince);
            if (savedData.eventCategory) {
              setEventCategory(savedData.eventCategory);
              if (savedData.eventCategory === "other" && savedData.customCategory) {
                setCustomCategory(savedData.customCategory);
              }
            }
            // Load event type data
            if (savedData.eventType) setEventType(savedData.eventType);
            if (savedData.ticketPrice) setTicketPrice(savedData.ticketPrice);
            if (savedData.ticketQuantity) setTicketQuantity(savedData.ticketQuantity);
            if (savedData.rsvpLimit) setRsvpLimit(savedData.rsvpLimit);
            if (savedData.requireApproval) setRequireApproval(savedData.requireApproval);
          }
        } catch (error) {
          console.error("Error loading saved data:", error);
        }
      }
    };

    loadSavedData();
  }, [user]);

  // Validation rules
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
    eventCategory: {
      required: true,
      message: "Please select an event category"
    },
    customCategory: {
      required: false,
      maxLength: 50,
      message: "Custom category cannot exceed 50 characters"
    },
    // NEW: Event Type Validation
    eventType: {
      required: true,
      message: "Please select an event type"
    },
    ticketPrice: {
      required: (values) => values.eventType === "ticket",
      min: 0,
      message: "Please enter a valid ticket price"
    },
    ticketQuantity: {
      required: (values) => values.eventType === "ticket",
      min: 1,
      message: "Please enter the number of tickets available"
    },
    rsvpLimit: {
      required: false,
      min: 1,
      message: "Please enter a valid RSVP limit"
    }
  };

  // Handle successful login
  const handleLoginSuccess = (userData) => {
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    setShowLoginPopup(false);
    setCurrentStep(1);
  };

  // Handle successful signup
  const handleSignupSuccess = (userData) => {
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    setShowLoginPopup(false);
    setCurrentStep(1);
  };

  // Helper function to get today's date
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

  const validateField = (name, value, allValues = {}) => {
    const rules = validationRules[name];
    if (!rules) return "";

    // Handle conditional required fields
    if (rules.required) {
      const isRequired = typeof rules.required === 'function' 
        ? rules.required(allValues) 
        : rules.required;
      
      if (isRequired && (!value || value.trim() === "")) {
        return "This field is required";
      }
    }

    if (rules.minLength && value && value.length < rules.minLength) {
      return `Must be at least ${rules.minLength} characters long`;
    }

    if (rules.maxLength && value && value.length > rules.maxLength) {
      return `Cannot exceed ${rules.maxLength} characters`;
    }

    if (rules.pattern && value && !rules.pattern.test(value)) {
      return rules.message;
    }

    if (rules.futureDate && value) {
      const inputDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (inputDate < today) {
        return "Event date cannot be in the past";
      }
    }

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

    // Numeric validations
    if (rules.min !== undefined && value && parseFloat(value) < rules.min) {
      return `Value must be at least ${rules.min}`;
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
      }

      if (subStep === 3) {
        const categoryError = validateField("eventCategory", eventCategory);
        if (categoryError) newErrors.eventCategory = categoryError;

        if (eventCategory === "other") {
          const customError = validateField("customCategory", customCategory);
          if (customError) newErrors.customCategory = customError;
        }
      }
    }

    // NEW: Validate Event Type Step
    if (step === 3) {
      const allValues = { eventType, ticketPrice, ticketQuantity, rsvpLimit };
      
      const eventTypeError = validateField("eventType", eventType);
      if (eventTypeError) newErrors.eventType = eventTypeError;
      
      if (eventType === "ticket") {
        const ticketPriceError = validateField("ticketPrice", ticketPrice, allValues);
        if (ticketPriceError) newErrors.ticketPrice = ticketPriceError;
        
        const ticketQuantityError = validateField("ticketQuantity", ticketQuantity, allValues);
        if (ticketQuantityError) newErrors.ticketQuantity = ticketQuantityError;
      }
      
      if (eventType === "rsvp" && rsvpLimit) {
        const rsvpLimitError = validateField("rsvpLimit", rsvpLimit, allValues);
        if (rsvpLimitError) newErrors.rsvpLimit = rsvpLimitError;
      }
    }

    setFieldErrors(newErrors);
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
      customCategory,
      eventType,
      ticketPrice,
      ticketQuantity,
      rsvpLimit
    };

    const error = validateField(fieldName, allValues[fieldName], allValues);
    setFieldErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  const handleLoginClick = (accountType = "personal") => {
    setLoginMode("login");
    setLoginAccountType(accountType);
    setShowLoginPopup(true);
  };

  const handleSignupClick = (accountType = "personal") => {
    setLoginMode("signup");
    setLoginAccountType(accountType);
    setShowLoginPopup(true);
  };

  const handleNext = async () => {
    setError("");

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
    } else if (currentStep === 3) {
      newTouched.eventType = true;
      if (eventType === "ticket") {
        newTouched.ticketPrice = true;
        newTouched.ticketQuantity = true;
      }
      if (eventType === "rsvp" && rsvpLimit) {
        newTouched.rsvpLimit = true;
      }
    }
    setTouched(newTouched);

    // Validate current step
    const isValid = validateStep(currentStep, step2SubStep);
    if (!isValid) return;

    // Step 1 validation and saving
    if (currentStep === 1) {
      const success = saveStep1Data(eventName);
      if (!success) {
        setError("Failed to save event name. Please try again.");
        return;
      }
    }

    // Step 2 validation and saving
    if (currentStep === 2) {
      if (step2SubStep < 3) {
        setStep2SubStep(step2SubStep + 1);
        return;
      }

      if (step2SubStep === 3) {
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

        const success = saveStep2Data(step2Data);
        if (!success) {
          setError("Failed to save event details. Please try again.");
          return;
        }
      }
    }

    // NEW: Step 3 - Save Event Type
    if (currentStep === 3) {
      const eventTypeData = {
        eventType,
        ticketPrice: eventType === "ticket" ? ticketPrice : null,
        ticketQuantity: eventType === "ticket" ? ticketQuantity : null,
        rsvpLimit: eventType === "rsvp" && rsvpLimit ? rsvpLimit : null,
        requireApproval: eventType === "rsvp" ? requireApproval : false
      };
      
      const success = saveEventTypeData(eventTypeData);
      if (!success) {
        setError("Failed to save event type. Please try again.");
        return;
      }
    }

    // If user is logged in and completed step 3, go to event theme
    if (user && currentStep === 3) {
      navigate("/eventTheme");
      return;
    }

    // If user is not logged in and reached step 4, show login/signup
    if (!user && currentStep === 4) {
      handleLoginClick();
      return;
    }

    // Move to next step
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      if (currentStep === 2) setStep2SubStep(1);
    }
  };

  const handleBack = () => {
    if (currentStep === 2 && step2SubStep > 1) {
      setStep2SubStep(step2SubStep - 1);
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate(-1);
    }
    setError("");
    setFieldErrors({});
  };

  const shouldShowError = (fieldName) => {
    return touched[fieldName] && fieldErrors[fieldName];
  };

  const handleCategorySelect = (categoryValue) => {
    setEventCategory(categoryValue);
    if (categoryValue !== "other") {
      setCustomCategory("");
    }
    setTouched(prev => ({ ...prev, eventCategory: true }));
    setFieldErrors(prev => ({ ...prev, eventCategory: "" }));
  };

  // NEW: Handle Event Type Selection
  const handleEventTypeSelect = (type) => {
    setEventType(type);
    // Reset related fields
    if (type === "ticket") {
      setRsvpLimit("");
      setRequireApproval(false);
    } else if (type === "rsvp") {
      setTicketPrice("");
      setTicketQuantity("");
    }
    setTouched(prev => ({ ...prev, eventType: true }));
    setFieldErrors(prev => ({ ...prev, eventType: "" }));
  };

  // Get selected category details
  const getSelectedCategory = () => {
    if (eventCategory === "other") {
      return { label: customCategory || "Other", icon: "📌" };
    }
    return eventCategories.find(cat => cat.value === eventCategory) || null;
  };

  return (
    <div>
      {/* Login/Signup Popup */}
      {showLoginPopup && (
        <Login
          isOpen={showLoginPopup}
          onClose={() => setShowLoginPopup(false)}
          defaultMode={loginMode}
          defaultAccountType={loginAccountType}
          onLoginSuccess={handleLoginSuccess}
          onSignupSuccess={handleSignupSuccess}
        />
      )}

      <div className="eventa-header-bar">
        <div className="eventa-header-logo">
          <img
            src="/images/logo.png"
            alt="Eventa Logo"
            className="eventa-logo-img"
          />
        </div>
        <button
          className="eventa-back-btn"
          onClick={handleBack}
        >
          &#8592; Back
        </button>
      </div>

      {/* Show progress bar only if user is logged in and on steps 1-3 */}
      {user && currentStep !== 4 && (
        <EventProgressBar currentStep={currentStep} totalSteps={totalSteps} />
      )}

      <div className="create-event-container" id="createEventPage">
        <div className="create-event-body">
          {/* Step 1: Event Name */}
          {user && currentStep === 1 && (
            <div className="event-step">
              {error && <div className="form-error">{error}</div>}
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
                  <div className="field-error">
                    <span className="error-icon">⚠</span>
                    {fieldErrors.eventName}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Event Details */}
          {user && currentStep === 2 && (
            <div className="event-step">
              {error && <div className="form-error">{error}</div>}
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
                        <div className="field-error">
                          <span className="error-icon">⚠</span>
                          {fieldErrors.eventStartDate}
                        </div>
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
                        <div className="field-error">
                          <span className="error-icon">⚠</span>
                          {fieldErrors.eventStartTime}
                        </div>
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
                        <div className="field-error">
                          <span className="error-icon">⚠</span>
                          {fieldErrors.eventEndDate}
                        </div>
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
                        <div className="field-error">
                          <span className="error-icon">⚠</span>
                          {fieldErrors.eventEndTime}
                        </div>
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
                      <div className="field-error">
                        <span className="error-icon">⚠</span>
                        {fieldErrors.timezone}
                      </div>
                    )}
                  </div>
                </>
              )}

              {step2SubStep === 2 && (
                <>
                  <h2 className="step-title">Event Location</h2>
                  <p className="step-subtitle">Where is your Event?</p>

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
                      <div className="field-error">
                        <span className="error-icon">⚠</span>
                        {fieldErrors.eventLocation}
                      </div>
                    )}
                  </div>

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
                      <div className="field-error">
                        <span className="error-icon">⚠</span>
                        {fieldErrors.eventCity}
                      </div>
                    )}
                  </div>

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
                      <div className="field-error">
                        <span className="error-icon">⚠</span>
                        {fieldErrors.eventProvince}
                      </div>
                    )}
                  </div>

                  <p className="text-muted small mt-1">
                    Not sure yet? You can add location details later.
                  </p>
                </>
              )}

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
                        {fieldErrors.eventCategory}
                      </div>
                    )}

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
                            {fieldErrors.customCategory}
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

          {/* NEW: Step 3: Event Type (Ticket vs RSVP) */}
          {user && currentStep === 3 && (
            <div className="event-step">
              {error && <div className="form-error">{error}</div>}
              <h2 className="step-title">How will people attend?</h2>
              <p className="step-subtitle">Choose how you want to manage attendance</p>

              <div className="event-type-selector">
                {/* Ticket Event Option */}
                <div 
                  className={`event-type-card ${eventType === "ticket" ? "selected" : ""}`}
                  onClick={() => handleEventTypeSelect("ticket")}
                >
                  <div className="event-type-icon">🎟️</div>
                  <h3>Ticket Event</h3>
                  <p>Sell tickets to your event. Perfect for concerts, workshops, conferences, and paid events.</p>
                  <div className="event-type-features">
                    <span>✓ Set ticket prices</span>
                    <span>✓ Limit ticket quantity</span>
                    <span>✓ Track sales</span>
                  </div>
                </div>

                {/* RSVP Event Option */}
                <div 
                  className={`event-type-card ${eventType === "rsvp" ? "selected" : ""}`}
                  onClick={() => handleEventTypeSelect("rsvp")}
                >
                  <div className="event-type-icon">📝</div>
                  <h3>RSVP Event</h3>
                  <p>Free event where guests confirm attendance. Great for parties, weddings, and social gatherings.</p>
                  <div className="event-type-features">
                    <span>✓ Free attendance</span>
                    <span>✓ Track guest count</span>
                    <span>✓ Optional approval</span>
                  </div>
                </div>
              </div>

              {shouldShowError('eventType') && (
                <div className="field-error">
                  <span className="error-icon">⚠</span>
                  {fieldErrors.eventType}
                </div>
              )}

              {/* Ticket Event Details */}
              {eventType === "ticket" && (
                <div className="event-type-details">
                  <h3>Ticket Details</h3>
                  
                  <div className="form-group-event">
                    <label htmlFor="ticketPrice">Ticket Price (ZAR)</label>
                    <input
                      type="number"
                      id="ticketPrice"
                      className={`form-control-event ${shouldShowError('ticketPrice') ? 'error' : ''}`}
                      placeholder="e.g., 150"
                      value={ticketPrice}
                      onChange={(e) => setTicketPrice(e.target.value)}
                      onBlur={() => handleBlur('ticketPrice')}
                      min="0"
                      step="0.01"
                    />
                    {shouldShowError('ticketPrice') && (
                      <div className="field-error">
                        <span className="error-icon">⚠</span>
                        {fieldErrors.ticketPrice}
                      </div>
                    )}
                  </div>

                  <div className="form-group-event">
                    <label htmlFor="ticketQuantity">Number of Tickets Available</label>
                    <input
                      type="number"
                      id="ticketQuantity"
                      className={`form-control-event ${shouldShowError('ticketQuantity') ? 'error' : ''}`}
                      placeholder="e.g., 100"
                      value={ticketQuantity}
                      onChange={(e) => setTicketQuantity(e.target.value)}
                      onBlur={() => handleBlur('ticketQuantity')}
                      min="1"
                    />
                    {shouldShowError('ticketQuantity') && (
                      <div className="field-error">
                        <span className="error-icon">⚠</span>
                        {fieldErrors.ticketQuantity}
                      </div>
                    )}
                  </div>

                  <p className="text-muted small">
                    You can add multiple ticket types (VIP, Early Bird, etc.) after creating the event.
                  </p>
                </div>
              )}

              {/* RSVP Event Details */}
              {eventType === "rsvp" && (
                <div className="event-type-details">
                  <h3>RSVP Settings</h3>
                  
                  <div className="form-group-event">
                    <label htmlFor="rsvpLimit">RSVP Limit (Optional)</label>
                    <input
                      type="number"
                      id="rsvpLimit"
                      className={`form-control-event ${shouldShowError('rsvpLimit') ? 'error' : ''}`}
                      placeholder="Leave empty for unlimited"
                      value={rsvpLimit}
                      onChange={(e) => setRsvpLimit(e.target.value)}
                      onBlur={() => handleBlur('rsvpLimit')}
                      min="1"
                    />
                    {shouldShowError('rsvpLimit') && (
                      <div className="field-error">
                        <span className="error-icon">⚠</span>
                        {fieldErrors.rsvpLimit}
                      </div>
                    )}
                  </div>

                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={requireApproval}
                        onChange={(e) => setRequireApproval(e.target.checked)}
                      />
                      <span>Require approval for RSVPs</span>
                    </label>
                    <p className="text-muted small">
                      If enabled, you'll need to manually approve each RSVP request.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Login/Signup Prompt */}
          {!user && currentStep === 4 && (
            <div className="event-step">
              <h2 className="step-title">Account Required</h2>
              <p className="step-subtitle">To create and manage your event, you need an account</p>

              <div className="account-prompt-container">
                <div className="account-prompt-card">
                  <h3>Already have an account?</h3>
                  <p>Log in to continue creating your event</p>
                  <button
                    className="btn-event btn-event-primary"
                    onClick={() => handleLoginClick()}
                  >
                    Log In
                  </button>
                </div>

                <div className="account-prompt-card">
                  <h3>New to Eventa?</h3>
                  <p>Create an account to start managing your events</p>
                  <button
                    className="btn-event btn-event-secondary"
                    onClick={() => handleSignupClick()}
                  >
                    Sign Up
                  </button>
                </div>
              </div>

              <p className="text-muted small mt-3">
                Don't worry, your event details are saved. You can continue where you left off after logging in.
              </p>
            </div>
          )}
        </div>

        {/* Footer with navigation buttons */}
        <div className="create-event-footer">
          <div>
            {((user && currentStep > 1) || (user && currentStep === 2 && step2SubStep > 1)) && (
              <button className="btn-event btn-event-back" onClick={handleBack}>
                Back
              </button>
            )}
          </div>
          <div>
            {user ? (
              <button className="btn-event btn-event-next" onClick={handleNext}>
                {currentStep === 1 && "NEXT: EVENT DETAILS"}
                {currentStep === 2 && step2SubStep === 1 && "NEXT: LOCATION"}
                {currentStep === 2 && step2SubStep === 2 && "NEXT: EVENT CATEGORY"}
                {currentStep === 2 && step2SubStep === 3 && "NEXT: EVENT TYPE"}
                {currentStep === 3 && "NEXT: EVENT THEME"}
              </button>
            ) : (
              <button className="btn-event btn-event-next" onClick={handleNext}>
                CONTINUE
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .event-type-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin: 30px 0;
        }

        .event-type-card {
          background: white;
          border: 2px solid #e0e0e0;
          border-radius: 16px;
          padding: 24px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .event-type-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.1);
        }

        .event-type-card.selected {
          border-color: #667eea;
          background: linear-gradient(135deg, rgba(102,126,234,0.05) 0%, rgba(118,75,162,0.05) 100%);
        }

        .event-type-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .event-type-card h3 {
          font-size: 20px;
          margin-bottom: 12px;
          color: #333;
        }

        .event-type-card p {
          color: #666;
          margin-bottom: 16px;
          line-height: 1.5;
        }

        .event-type-features {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 13px;
          color: #667eea;
        }

        .event-type-features span {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .event-type-details {
          margin-top: 30px;
          padding: 24px;
          background: #f8f9fa;
          border-radius: 12px;
        }

        .event-type-details h3 {
          margin-bottom: 20px;
          color: #333;
        }

        .checkbox-group {
          margin-top: 16px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }

        .checkbox-label input {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .checkbox-label span {
          font-size: 14px;
          color: #333;
        }

        @media (max-width: 768px) {
          .event-type-selector {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default CreateEvent;