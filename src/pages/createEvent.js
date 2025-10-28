import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import EventProgressBar from "./EventProgressBar";
import "../App.css";
import "../responce.css";
import { Login } from "./components";
import { useEventCreation } from "./eventDataCollector";
import SecurityQuestionsModal from "./SecurityQuestionsModal";

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
  const [lastname, setLastname] = useState("");
  const [firstname, setFirstname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [securityAnswers, setSecurityAnswers] = useState(null);

  const { saveStep1Data, saveStep2Data } = useEventCreation();
  const totalSteps = 3;

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
    },
    fullName: {
      required: true,
      minLength: 2,
      maxLength: 100,
      pattern: /^[a-zA-Z\s\-'.]+$/,
      message: "Full name must be 2-100 characters long and can only contain letters, spaces, hyphens, and apostrophes"
    },
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: "Please enter a valid email address"
    },
    password: {
      required: true,
      minLength: 8,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      message: "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character"
    },
    confirmPassword: {
      required: true,
      match: true,
      message: "Passwords do not match"
    }
  };

  const handleLoginSuccess = (userData) => {
    localStorage.setItem("user", JSON.stringify(userData));
    navigate("/eventTheme");
  };

  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Enhanced helper function to get minimum end date
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

    // Password match validation
    if (rules.match && name === 'confirmPassword' && value !== allValues.password) {
      return "Passwords do not match";
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
    }

    if (step === 3) {
      const allValues = { password };
      
      const fullNameError = validateField("fullName", firstname + " " + lastname);
      if (fullNameError) newErrors.fullName = fullNameError;

      const emailError = validateField("email", email);
      if (emailError) newErrors.email = emailError;

      const passwordError = validateField("password", password);
      if (passwordError) newErrors.password = passwordError;

      const confirmPasswordError = validateField("confirmPassword", confirmPassword, allValues);
      if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;
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
      timezone,
      fullName: firstname + " " + lastname,
      email,
      password,
      confirmPassword
    };
    
    const error = validateField(fieldName, allValues[fieldName], allValues);
    setFieldErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  const handleSecurityQuestionsSave = (answers) => {
    setSecurityAnswers(answers);
    setShowSecurityModal(false);
    // Continue with registration
    completeRegistration();
  };

  const completeRegistration = async () => {
    try {
      const formData = new FormData();
      formData.append("function", "eventAccConfirm");
      formData.append("name", firstname.trim());
      formData.append("lastname", lastname.trim());
      formData.append("email", email.trim());
      formData.append("password", password);

      const API_URL = process.env.REACT_APP_API_URL;

      const response = await fetch(`${API_URL}/query.php`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      console.log(result);

      if (result.success) {
        // Save security questions for the new user
        if (securityAnswers) {
          await saveSecurityQuestions(result.user.user_id, securityAnswers);
        }
        
        localStorage.setItem("user", JSON.stringify(result.user));
        navigate("/eventTheme");
      } else {
        if (result.userExists) {
          alert(result.message || "User already exists. Please log in.");
          setShowLoginPopup(true);
        } else {
          alert(result.message || "Something went wrong!");
        }
      }
    } catch (err) {
      console.error(err);
      alert("Server error. Please try again later.");
    }
  };

  const saveSecurityQuestions = async (userId, answers) => {
    try {
      const API_URL = process.env.REACT_APP_API_URL;
      const formData = new FormData();
      formData.append("function", "saveSecurityQuestions");
      formData.append("user_id", userId);
      formData.append("question1", "What was the name of your first pet?");
      formData.append("answer1", answers.answer1);
      formData.append("question2", "What city were you born in?");
      formData.append("answer2", answers.answer2);
      formData.append("question3", "What is your mother's maiden name?");
      formData.append("answer3", answers.answer3);

      const response = await fetch(`${API_URL}/query.php`, {
        method: "POST",
        body: formData
      });

      const result = await response.json();
      if (!result.success) {
        console.error("Failed to save security questions:", result.message);
      }
    } catch (err) {
      console.error("Error saving security questions:", err);
    }
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
      }
    } else if (currentStep === 3) {
      newTouched.fullName = true;
      newTouched.email = true;
      newTouched.password = true;
      newTouched.confirmPassword = true;
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
      if (step2SubStep < 2) {
        setStep2SubStep(step2SubStep + 1);
        return;
      }

      // Save step 2 data when all sub-steps are completed
      if (step2SubStep === 2) {
        const step2Data = {
          eventStartDate,
          eventStartTime,
          eventEndDate,
          eventEndTime,
          timezone,
          eventLocation
        };

        const success = saveStep2Data(step2Data);
        if (!success) {
          setError("Failed to save event details. Please try again.");
          return;
        }
      }
    }

    // Step 3: Account Information - Show security questions modal instead of immediate registration
    if (currentStep === 3) {
      setShowSecurityModal(true);
      return;
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      if (currentStep === 2) setStep2SubStep(1);
    } else {
      navigate("/eventTheme");
    }
  };

  const handleBack = () => {
    if (currentStep === 2 && step2SubStep > 1) {
      setStep2SubStep(step2SubStep - 1);
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      window.history.back();
    }
    setError("");
    setFieldErrors({});
  };

  // Helper function to check if field should show error
  const shouldShowError = (fieldName) => {
    return touched[fieldName] && fieldErrors[fieldName];
  };

  return (
    <div>
      {/* Login Popup */}
      {showLoginPopup && (
        <Login
          isOpen={showLoginPopup}
          onClose={() => setShowLoginPopup(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* Security Questions Modal */}
      <SecurityQuestionsModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        onSave={handleSecurityQuestionsSave}
        mode="registration"
      />

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

      <EventProgressBar currentStep={currentStep} totalSteps={totalSteps} />

      <div className="create-event-container" id="createEventPage">
        <div className="create-event-body">
          {/* Step 1: Event Name */}
          {currentStep === 1 && (
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

          {/* Step 2: Event Details with sub-steps (removed URL sub-step) */}
          {currentStep === 2 && (
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
                      <div className="field-error">
                        <span className="error-icon">⚠</span>
                        {fieldErrors.eventLocation}
                      </div>
                    )}
                    <p className="text-muted small mt-1">Not sure yet? You can add location later.</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Account Information */}
          {currentStep === 3 && (
            <div className="event-step">
              {error && <div className="form-error">{error}</div>}
              <h2 className="step-title">Account Information</h2>
              <p className="step-subtitle">Create your account to manage your event</p>
              <div className="form-group-event">
                
                <label htmlFor="fullName">Firstname</label>
                <input
                  type="text"
                  className={`form-control-event ${shouldShowError('fullName') ? 'error' : ''}`}
                  id="fullName"
                  placeholder="Your Firstname"
                  value={firstname}
                  onChange={(e) => setFirstname(e.target.value)}
                  onBlur={() => handleBlur('fullName')}
                />
                {shouldShowError('fullName') && (
                  <div className="field-error">
                    <span className="error-icon">⚠</span>
                    {fieldErrors.fullName}
                  </div>
                )}
              </div>
              <div className="form-group-event">
                <label htmlFor="lastname">Lastname</label>
                <input
                  type="text"
                  className={`form-control-event ${shouldShowError('fullName') ? 'error' : ''}`}
                  id="lastname"
                  placeholder="Your Lastname"
                  value={lastname}
                  onChange={(e) => setLastname(e.target.value)}
                  onBlur={() => handleBlur('fullName')}
                />
              </div>
              <div className="form-group-event">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  className={`form-control-event ${shouldShowError('email') ? 'error' : ''}`}
                  id="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleBlur('email')}
                />
                {shouldShowError('email') && (
                  <div className="field-error">
                    <span className="error-icon">⚠</span>
                    {fieldErrors.email}
                  </div>
                )}
              </div>
              <div className="form-group-event">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  className={`form-control-event ${shouldShowError('password') ? 'error' : ''}`}
                  id="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => handleBlur('password')}
                />
                {shouldShowError('password') && (
                  <div className="field-error">
                    <span className="error-icon">⚠</span>
                    {fieldErrors.password}
                  </div>
                )}
                <div className="password-requirements">
                  <small>Password must contain:</small>
                  <ul>
                    <li className={password.length >= 8 ? 'valid' : ''}>At least 8 characters</li>
                    <li className={/[a-z]/.test(password) ? 'valid' : ''}>One lowercase letter</li>
                    <li className={/[A-Z]/.test(password) ? 'valid' : ''}>One uppercase letter</li>
                    <li className={/\d/.test(password) ? 'valid' : ''}>One number</li>
                    <li className={/[@$!%*?&]/.test(password) ? 'valid' : ''}>One special character</li>
                  </ul>
                </div>
              </div>
              <div className="form-group-event">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  className={`form-control-event ${shouldShowError('confirmPassword') ? 'error' : ''}`}
                  id="confirmPassword"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => handleBlur('confirmPassword')}
                />
                {shouldShowError('confirmPassword') && (
                  <div className="field-error">
                    <span className="error-icon">⚠</span>
                    {fieldErrors.confirmPassword}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="create-event-footer">
          <div>
            {(currentStep > 1 || (currentStep === 2 && step2SubStep > 1)) && (
              <button className="btn-event btn-event-back" onClick={handleBack}>
                Back
              </button>
            )}
          </div>
          <div>
            <button className="btn-event btn-event-next" onClick={handleNext}>
              {currentStep === 1 && "NEXT: EVENT DETAILS"}
              {currentStep === 2 && step2SubStep < 2 && "NEXT"}
              {currentStep === 2 && step2SubStep === 2 && "NEXT: ACCOUNT INFO"}
              {currentStep === 3 && "CREATE ACCOUNT & CONTINUE"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateEvent;