import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import EventProgressBar from "./EventProgressBar";
import "../App.css";
import "../responce.css";
import { Login } from "./components";
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
  const [eventUrl, setEventUrl] = useState("myevent");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const { saveStep1Data, saveStep2Data } = useEventCreation();
  const totalSteps = 4;

  const handleLoginSuccess = (userData) => {
    // Handle successful login
    localStorage.setItem("user", JSON.stringify(userData));
    navigate("/eventTheme");
  };

  const handleNext = async () => {
    setError("");
    setFieldErrors({});

    // Step 1 validation and saving
    if (currentStep === 1) {
      if (!eventName.trim()) {
        setError("Please enter the event name.");
        return;
      }

      // Save step 1 data using the data collector
      const success = saveStep1Data(eventName);
      if (!success) {
        setError("Failed to save event name. Please try again.");
        return;
      }
    }

    // Step 2 validation and saving
    if (currentStep === 2) {
      if (step2SubStep === 1) {
        if (
          !eventStartDate ||
          !eventStartTime ||
          !eventEndDate ||
          !eventEndTime ||
          !timezone
        ) {
          setError("Please fill in all date, time, and timezone fields.");
          return;
        }
      } else if (step2SubStep === 2) {
        if (!eventLocation.trim()) {
          setError("Please enter the event location.");
          return;
        }
      } else if (step2SubStep === 3) {
        if (!eventUrl.trim()) {
          setError("Please enter a URL for your event.");
          return;
        }
      }

      if (step2SubStep < 3) {
        setStep2SubStep(step2SubStep + 1);
        return;
      }

      // Save step 2 data when all sub-steps are completed
      if (step2SubStep === 3) {
        const step2Data = {
          eventStartDate,
          eventStartTime,
          eventEndDate,
          eventEndTime,
          timezone,
          eventLocation,
          eventUrl
        };

        const success = saveStep2Data(step2Data);
        if (!success) {
          setError("Failed to save event details. Please try again.");
          return;
        }
      }
    }

    // Step 3: Account Information
    if (currentStep === 3) {
      if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
        setError("Please fill in all account fields.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      try {
        const formData = new FormData();
        formData.append("function", "eventAccConfirm");
        formData.append("name", fullName.trim());
        formData.append("email", email.trim());
        formData.append("password", password);

        const response = await fetch("http://localhost/eventa/src/pages/php/query.php", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();
        console.log(result);

        if (result.success) {
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
      return; // Return early since we're handling navigation in the try/catch
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

  // Helper function to check if a field has error
  const hasError = (fieldName) => fieldErrors[fieldName];

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
          onClick={() => {
            if (currentStep === 1) {
              window.location.href = "/";
            } else if (currentStep === 2 && step2SubStep > 1) {
              setStep2SubStep(step2SubStep - 1);
            } else {
              setCurrentStep(currentStep - 1);
            }
          }}
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
              {error && <div className="form-error" style={{ color: "red", marginBottom: 16 }}>{error}</div>}
              <h2 className="step-title">What's the name of your Event</h2>
              <p className="step-subtitle">Type the name of your Event</p>
              <div className="form-group-event">
                <input
                  type="text"
                  className={`form-control-event ${hasError('eventName') ? 'error' : ''}`}
                  id="eventName"
                  placeholder="e.g., mfana's Birthday Party"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                />
                {hasError('eventName') && (
                  <div className="validation-error">
                    <span className="error-icon">⚠</span>
                    {fieldErrors.eventName}
                  </div>
                )}
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
                  <h2 className="step-title">Event Location</h2>
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
                  <h2 className="step-title">Event URL</h2>
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

          {/* Step 3: Account Information */}
          {currentStep === 3 && (
            <div className="event-step">
              {error && <div className="form-error" style={{ color: "red", marginBottom: 16 }}>{error}</div>}
              <h2 className="step-title">Account Information</h2>
              <p className="step-subtitle">Create your account to manage your event</p>
              <div className="form-group-event">
                <label htmlFor="fullName">Full Name</label>
                <input
                  type="text"
                  className="form-control-event"
                  id="fullName"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="form-group-event">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  className="form-control-event"
                  id="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="form-group-event">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  className="form-control-event"
                  id="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="form-group-event">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  className="form-control-event"
                  id="confirmPassword"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
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
              {currentStep === 2 && step2SubStep < 3 && "NEXT"}
              {currentStep === 2 && step2SubStep === 3 && "NEXT: ACCOUNT INFO"}
              {currentStep === 3 && "CREATE ACCOUNT & CONTINUE"}
              {currentStep === 4 && "CREATE EVENT"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateEvent;