import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar, Footer, Login, NewEventPopupBtn } from "./components";
import "../App.css";
import "./create-ticket-event.css";
import "../alert.css";

function CreateTicketEvent() {
    const navigate = useNavigate();

    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [loginMode, setLoginMode] = useState("login");
    const [loginAccountType, setLoginAccountType] = useState("personal");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [alert, setAlert] = useState({
        show: false,
        message: "",
        type: "",
    });

    const [currentStep, setCurrentStep] = useState(1);
    const [eventImage, setEventImage] = useState(null);
    const [imagePreview, setImagePreview] = useState("");
    const [eventName, setEventName] = useState("");

    // Date and time fields
    const [eventStartDate, setEventStartDate] = useState("");
    const [eventEndDate, setEventEndDate] = useState("");
    const [eventStartTime, setEventStartTime] = useState("");
    const [eventEndTime, setEventEndTime] = useState("");

    // Location fields
    const [address, setAddress] = useState("");
    const [province, setProvince] = useState("");
    const [cityTown, setCityTown] = useState("");
    const [eventType, setEventType] = useState("");
    const [moreInfo, setMoreInfo] = useState("");
    const [customEventType, setCustomEventType] = useState("");

    // Ticket types - only 4 types with their own state
    const [generalPrice, setGeneralPrice] = useState("");
    const [generalQuantity, setGeneralQuantity] = useState("");

    const [earlybirdPrice, setEarlybirdPrice] = useState("");
    const [earlybirdQuantity, setEarlybirdQuantity] = useState("");

    const [vipPrice, setVipPrice] = useState("");
    const [vipQuantity, setVipQuantity] = useState("");

    const [vvipPrice, setVvipPrice] = useState("");
    const [vvipQuantity, setVvipQuantity] = useState("");

    // Validation errors
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    // Event types for dropdown
    const eventTypes = [
        { value: "concert", label: "Concert" },
        { value: "festival", label: "Festival" },
        { value: "conference", label: "Conference" },
        { value: "workshop", label: "Workshop" },
        { value: "seminar", label: "Seminar" },
        { value: "sports", label: "Sports Event" },
        { value: "theater", label: "Theater / Performance" },
        { value: "comedy", label: "Comedy Show" },
        { value: "exhibition", label: "Exhibition / Trade Show" },
        { value: "networking", label: "Networking Event" },
        { value: "charity", label: "Charity / Fundraiser" },
        { value: "party", label: "Party / Celebration" },
        { value: "other", label: "Other" }
    ];

    // Check if user is logged in on component mount
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = () => {
        let userID = null;

        const userString = localStorage.getItem("user");
        if (userString) {
            try {
                const user = JSON.parse(userString);
                userID = user.id || user.user_id || user.ID || null;
            } catch (e) {
                console.error("Error parsing user object:", e);
            }
        }

        if (!userID) {
            userID = localStorage.getItem('user_id') || localStorage.getItem('userId') || localStorage.getItem('uid');
        }

        if (!userID) {
            printAlert("Please log in to create an event", "warning");
            setIsLoginOpen(true);
        }
    };

    const printAlert = (msg, type = "info") => {
        setAlert({ show: true, message: msg, type });
        setTimeout(() => setAlert({ show: false, message: "", type: "" }), 6000);
    };

    const handleLoginClick = (accountType = "personal") => {
        setLoginMode("login");
        setLoginAccountType(accountType);
        setIsLoginOpen(true);
    };

    const handleSignupClick = (accountType = "personal") => {
        setLoginMode("signup");
        setLoginAccountType(accountType);
        setIsLoginOpen(true);
    };

    const handleLoginSuccess = () => {
        setIsLoginOpen(false);
        checkAuth();
    };

    // Image upload handler
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setErrors(prev => ({ ...prev, eventImage: "Image size must be less than 5MB" }));
                return;
            }

            if (!file.type.match('image.*')) {
                setErrors(prev => ({ ...prev, eventImage: "Please upload an image file" }));
                return;
            }

            setEventImage(file);
            setErrors(prev => ({ ...prev, eventImage: "" }));

            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Validation rules
    const validateStep = (step) => {
        const newErrors = {};

        if (step === 1) {
            if (!eventName.trim()) {
                newErrors.eventName = "Event name is required";
            }

            if (!eventImage) {
                newErrors.eventImage = "Please upload an event image";
            }

            if (!eventStartDate) {
                newErrors.eventStartDate = "Start date is required";
            }

            if (!eventEndDate) {
                newErrors.eventEndDate = "End date is required";
            }

            if (!eventStartTime) {
                newErrors.eventStartTime = "Start time is required";
            }

            if (!eventEndTime) {
                newErrors.eventEndTime = "End time is required";
            }

            if (!address.trim()) {
                newErrors.address = "Address is required";
            }

            if (!cityTown.trim()) {
                newErrors.cityTown = "City/Town is required";
            }

            if (!province) {
                newErrors.province = "Please select a province";
            }

            if (!eventType) {
                newErrors.eventType = "Please select an event type";
            } else if (eventType === "other" && !customEventType.trim()) {
                newErrors.customEventType = "Please specify the event type";
            }

            if (!moreInfo.trim()) {
                newErrors.moreInfo = "Please provide more information about the event";
            } else if (moreInfo.length < 20) {
                newErrors.moreInfo = "Please provide at least 20 characters of information";
            }
        }

        if (step === 2) {
            // No validation needed for ticket fields - they can be blank
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleBlur = (fieldName) => {
        setTouched(prev => ({ ...prev, [fieldName]: true }));
    };

    const handleNext = () => {
        const newTouched = { ...touched };
        if (currentStep === 1) {
            newTouched.eventName = true;
            newTouched.eventImage = true;
            newTouched.eventStartDate = true;
            newTouched.eventEndDate = true;
            newTouched.eventStartTime = true;
            newTouched.eventEndTime = true;
            newTouched.address = true;
            newTouched.cityTown = true;
            newTouched.province = true;
            newTouched.eventType = true;
            newTouched.moreInfo = true;
            if (eventType === "other") {
                newTouched.customEventType = true;
            }
        }
        setTouched(newTouched);

        const isValid = validateStep(currentStep);
        if (!isValid) return;

        if (currentStep === 1) {
            setCurrentStep(2);
        } else if (currentStep === 2) {
            handleSubmit();
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        } else {
            navigate(-1);
        }
    };

    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    };

    const getUserCredentials = () => {
        let userID = null;
        let userName = null;

        const userString = localStorage.getItem("user");
        if (userString) {
            try {
                const user = JSON.parse(userString);
                userID = user.id || user.user_id || user.ID || null;
                userName = user.name || user.user_name || user.username || null;
            } catch (e) {
                console.error("Error parsing user object:", e);
            }
        }

        if (!userID) {
            userID = localStorage.getItem('user_id') || localStorage.getItem('userId') || localStorage.getItem('uid');
        }

        if (!userName) {
            userName = localStorage.getItem('user_name') || localStorage.getItem('username') || localStorage.getItem('name');
        }

        return { userID, userName };
    };

    const handleSubmit = async () => {
        const { userID, userName } = getUserCredentials();

        if (!userID) {
            printAlert("Please log in to create an event", "warning");
            setIsLoginOpen(true);
            return;
        }

        setIsSubmitting(true);

        try {
            const ticketEventData = {
                eventName: eventName || "Ticket Event",

                eventStartDate,
                eventEndDate,
                eventStartTime,
                eventEndTime,

                address,
                province,
                cityTown,
                eventType: eventType === "other" ? customEventType : eventType,
                moreInfo,

                generalPrice: generalPrice === "" ? null : generalPrice,
                generalQuantity: generalQuantity === "" ? null : generalQuantity,

                earlybirdPrice: earlybirdPrice === "" ? null : earlybirdPrice,
                earlybirdQuantity: earlybirdQuantity === "" ? null : earlybirdQuantity,

                vipPrice: vipPrice === "" ? null : vipPrice,
                vipQuantity: vipQuantity === "" ? null : vipQuantity,


            };

            console.log("Submitting ticket event:", ticketEventData);

            const API_URL = process.env.REACT_APP_API_URL || '';
            const fd = new FormData();

            if (eventImage) {
                if (eventImage instanceof File) {
                    const base64Image = await fileToBase64(eventImage);
                    ticketEventData.image = base64Image;
                } else {
                    ticketEventData.image = eventImage;
                }
            }

            fd.append("user_id", userID);
            fd.append("user_name", userName || '');
            fd.append("function", "saveNewTicketEvent");
            fd.append("data", JSON.stringify(ticketEventData));

            const resp = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: fd,
            });

            const data = await resp.json();

            if (data.success) {
                printAlert("Ticket event created successfully!", "success");
                const userString = localStorage.getItem("user");
                let accountType = null;

                if (userString) {
                    try {
                        const userData = JSON.parse(userString);
                        accountType = userData.account_type || userData.accountType || userData.user_type;
                    } catch (e) {
                        console.error("Error parsing user data:", e);
                    }
                }

                // Navigate based on account type
                setTimeout(() => {
                    if (accountType === "business") {
                        navigate("/businessdashboard");
                    } else {
                        navigate("/eventsDashboard");
                    }
                }, 2000);
            } else {
                printAlert(data.message || "Failed to create event", "error");
            }

        } catch (error) {
            console.error("Error creating ticket event:", error);
            printAlert("Network error. Please try again.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStepClass = (step) => {
        if (step === currentStep) return "progress-step active";
        if (step < currentStep) return "progress-step completed";
        return "progress-step";
    };

    const shouldShowError = (fieldName) => {
        return touched[fieldName] && errors[fieldName];
    };

    return (
        <>
            <Navbar
                onLoginClick={handleLoginClick}
                onSignupClick={handleSignupClick}
            />
            <Login
                isOpen={isLoginOpen}
                onClose={() => setIsLoginOpen(false)}
                onLoginSuccess={handleLoginSuccess}
                defaultMode={loginMode}
                defaultAccountType={loginAccountType}
            />
            <NewEventPopupBtn />

            {alert.show && (
                <div className={`custom-alert ${alert.type}`}>
                    <i className={`fas ${alert.type === "error" ? "fa-times-circle" :
                            alert.type === "success" ? "fa-check-circle" :
                                alert.type === "warning" ? "fa-exclamation-triangle" :
                                    "fa-info-circle"
                        }`} />
                    <span>{alert.message}</span>
                </div>
            )}

            <div className="create-ticket-event-page">
                <button className="eventa-back-btn" onClick={handleBack}>
                    &#8592; Back
                </button>

                <div className="container">
                    {/* Progress Bar */}
                    <div className="progressBar">
                        <div className="container">
                            <div className="row">
                                <div className={getStepClass(1)}>
                                    <div className="step-circle">1</div>
                                    <div className="step-label">Event Details</div>
                                </div>
                                <div className={getStepClass(2)}>
                                    <div className="step-circle">2</div>
                                    <div className="step-label">Ticket Pricing</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="create-ticket-event-container">
                        {/* Step 1: Event Details */}
                        {currentStep === 1 && (
                            <div className="event-step">
                                <h2 className="step-title">Event Details</h2>
                                <p className="step-subtitle">Tell us about your ticket event</p>

                                {/* Event Name */}
                                <div className="form-group-event">
                                    <label htmlFor="eventName">EVENT NAME *</label>
                                    <input
                                        type="text"
                                        className={`form-control-event ${shouldShowError('eventName') ? 'error' : ''}`}
                                        id="eventName"
                                        placeholder="e.g., Summer Music Festival 2024"
                                        value={eventName}
                                        onChange={(e) => setEventName(e.target.value)}
                                        onBlur={() => handleBlur('eventName')}
                                    />
                                    {shouldShowError('eventName') && (
                                        <div className="field-error">{errors.eventName}</div>
                                    )}
                                </div>

                                {/* Image Upload */}
                                <div className="form-group-event">
                                    <label htmlFor="eventImage">EVENT IMAGE / POSTER *</label>
                                    <div className="image-upload-container">
                                        {imagePreview ? (
                                            <div className="image-preview">
                                                <img src={imagePreview} alt="Event preview" />
                                                <button
                                                    type="button"
                                                    className="remove-image"
                                                    onClick={() => {
                                                        setEventImage(null);
                                                        setImagePreview("");
                                                    }}
                                                >
                                                    <i className="bi bi-x"></i>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="upload-placeholder">
                                                <input
                                                    type="file"
                                                    id="eventImage"
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                    onBlur={() => handleBlur('eventImage')}
                                                />
                                                <label htmlFor="eventImage" className="upload-label">
                                                    <i className="bi bi-cloud-upload"></i>
                                                    <span>Click to upload image</span>
                                                    <span className="upload-hint">PNG, JPG, GIF up to 5MB</span>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                    {shouldShowError('eventImage') && (
                                        <div className="field-error">{errors.eventImage}</div>
                                    )}
                                </div>

                                {/* Event Date and Time Row */}
                                <div className="form-row">
                                    <div className="form-group-event half">
                                        <label htmlFor="eventStartDate">START DATE *</label>
                                        <input
                                            type="date"
                                            className={`form-control-event ${shouldShowError('eventStartDate') ? 'error' : ''}`}
                                            id="eventStartDate"
                                            value={eventStartDate}
                                            onChange={(e) => setEventStartDate(e.target.value)}
                                            onBlur={() => handleBlur('eventStartDate')}
                                        />
                                        {shouldShowError('eventStartDate') && (
                                            <div className="field-error">{errors.eventStartDate}</div>
                                        )}
                                    </div>

                                    <div className="form-group-event half">
                                        <label htmlFor="eventEndDate">END DATE *</label>
                                        <input
                                            type="date"
                                            className={`form-control-event ${shouldShowError('eventEndDate') ? 'error' : ''}`}
                                            id="eventEndDate"
                                            value={eventEndDate}
                                            onChange={(e) => setEventEndDate(e.target.value)}
                                            onBlur={() => handleBlur('eventEndDate')}
                                        />
                                        {shouldShowError('eventEndDate') && (
                                            <div className="field-error">{errors.eventEndDate}</div>
                                        )}
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group-event half">
                                        <label htmlFor="eventStartTime">START TIME *</label>
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

                                    <div className="form-group-event half">
                                        <label htmlFor="eventEndTime">END TIME *</label>
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

                                {/* Address */}
                                <div className="form-group-event">
                                    <label htmlFor="address">VENUE / ADDRESS *</label>
                                    <input
                                        type="text"
                                        className={`form-control-event ${shouldShowError('address') ? 'error' : ''}`}
                                        id="address"
                                        placeholder="e.g., 123 Main Street, Convention Center"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        onBlur={() => handleBlur('address')}
                                    />
                                    {shouldShowError('address') && (
                                        <div className="field-error">{errors.address}</div>
                                    )}
                                </div>

                                {/* City/Town and Province Row */}
                                <div className="form-row">
                                    <div className="form-group-event half">
                                        <label htmlFor="cityTown">CITY / TOWN *</label>
                                        <input
                                            type="text"
                                            className={`form-control-event ${shouldShowError('cityTown') ? 'error' : ''}`}
                                            id="cityTown"
                                            placeholder="e.g., Johannesburg"
                                            value={cityTown}
                                            onChange={(e) => setCityTown(e.target.value)}
                                            onBlur={() => handleBlur('cityTown')}
                                        />
                                        {shouldShowError('cityTown') && (
                                            <div className="field-error">{errors.cityTown}</div>
                                        )}
                                    </div>

                                    <div className="form-group-event half">
                                        <label htmlFor="province">PROVINCE / STATE *</label>
                                        <select
                                            className={`form-control-event ${shouldShowError('province') ? 'error' : ''}`}
                                            id="province"
                                            value={province}
                                            onChange={(e) => setProvince(e.target.value)}
                                            onBlur={() => handleBlur('province')}
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
                                        {shouldShowError('province') && (
                                            <div className="field-error">{errors.province}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Event Type */}
                                <div className="form-group-event">
                                    <label htmlFor="eventType">EVENT TYPE *</label>
                                    <select
                                        className={`form-control-event ${shouldShowError('eventType') ? 'error' : ''}`}
                                        id="eventType"
                                        value={eventType}
                                        onChange={(e) => setEventType(e.target.value)}
                                        onBlur={() => handleBlur('eventType')}
                                    >
                                        <option value="">Select event type</option>
                                        {eventTypes.map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                    {shouldShowError('eventType') && (
                                        <div className="field-error">{errors.eventType}</div>
                                    )}
                                </div>

                                {/* Custom Event Type (if "other" selected) */}
                                {eventType === "other" && (
                                    <div className="form-group-event">
                                        <label htmlFor="customEventType">SPECIFY EVENT TYPE *</label>
                                        <input
                                            type="text"
                                            className={`form-control-event ${shouldShowError('customEventType') ? 'error' : ''}`}
                                            id="customEventType"
                                            placeholder="e.g., Virtual Reality Experience"
                                            value={customEventType}
                                            onChange={(e) => setCustomEventType(e.target.value)}
                                            onBlur={() => handleBlur('customEventType')}
                                        />
                                        {shouldShowError('customEventType') && (
                                            <div className="field-error">{errors.customEventType}</div>
                                        )}
                                    </div>
                                )}

                                {/* More Info */}
                                <div className="form-group-event">
                                    <label htmlFor="moreInfo">MORE INFORMATION *</label>
                                    <textarea
                                        className={`form-control-event ${shouldShowError('moreInfo') ? 'error' : ''}`}
                                        id="moreInfo"
                                        rows="6"
                                        placeholder="Describe your event, lineup, schedule, special guests, etc."
                                        value={moreInfo}
                                        onChange={(e) => setMoreInfo(e.target.value)}
                                        onBlur={() => handleBlur('moreInfo')}
                                    ></textarea>
                                    <div className="char-counter">
                                        <span className={moreInfo.length < 20 ? 'warning' : ''}>
                                            {moreInfo.length}/20 minimum characters
                                        </span>
                                    </div>
                                    {shouldShowError('moreInfo') && (
                                        <div className="field-error">{errors.moreInfo}</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Step 2: Ticket Pricing */}
                        {currentStep === 2 && (
                            <div className="event-step">
                                <h2 className="step-title">Ticket Pricing</h2>
                                <p className="step-subtitle">
                                    Set prices and quantities for your tickets (leave blank if not applicable)
                                </p>

                                <div className="ticket-types-container">
                                    {/* General Admission */}
                                    <div className="ticket-type-card">
                                        <div className="ticket-type-header">
                                            <span className="ticket-type-label">General Admission</span>
                                        </div>
                                        <div className="ticket-type-fields">
                                            <div className="form-row">
                                                <div className="form-group-event half">
                                                    <label htmlFor="generalPrice">PRICE (R) - Optional</label>
                                                    <input
                                                        type="number"
                                                        className="form-control-event"
                                                        id="generalPrice"
                                                        placeholder="Leave blank for TBD"
                                                        min="0"
                                                        step="0.01"
                                                        value={generalPrice}
                                                        onChange={(e) => setGeneralPrice(e.target.value)}
                                                    />
                                                </div>
                                                <div className="form-group-event half">
                                                    <label htmlFor="generalQuantity">QUANTITY - Optional</label>
                                                    <input
                                                        type="number"
                                                        className="form-control-event"
                                                        id="generalQuantity"
                                                        placeholder="Leave blank for unlimited"
                                                        min="1"
                                                        step="1"
                                                        value={generalQuantity}
                                                        onChange={(e) => setGeneralQuantity(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Early Bird */}
                                    <div className="ticket-type-card">
                                        <div className="ticket-type-header">
                                            <span className="ticket-type-label">Early Bird</span>
                                        </div>
                                        <div className="ticket-type-fields">
                                            <div className="form-row">
                                                <div className="form-group-event half">
                                                    <label htmlFor="earlybirdPrice">PRICE (R) - Optional</label>
                                                    <input
                                                        type="number"
                                                        className="form-control-event"
                                                        id="earlybirdPrice"
                                                        placeholder="Leave blank for TBD"
                                                        min="0"
                                                        step="0.01"
                                                        value={earlybirdPrice}
                                                        onChange={(e) => setEarlybirdPrice(e.target.value)}
                                                    />
                                                </div>
                                                <div className="form-group-event half">
                                                    <label htmlFor="earlybirdQuantity">QUANTITY - Optional</label>
                                                    <input
                                                        type="number"
                                                        className="form-control-event"
                                                        id="earlybirdQuantity"
                                                        placeholder="Leave blank for unlimited"
                                                        min="1"
                                                        step="1"
                                                        value={earlybirdQuantity}
                                                        onChange={(e) => setEarlybirdQuantity(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* VIP */}
                                    <div className="ticket-type-card">
                                        <div className="ticket-type-header">
                                            <span className="ticket-type-label">VIP</span>
                                        </div>
                                        <div className="ticket-type-fields">
                                            <div className="form-row">
                                                <div className="form-group-event half">
                                                    <label htmlFor="vipPrice">PRICE (R) - Optional</label>
                                                    <input
                                                        type="number"
                                                        className="form-control-event"
                                                        id="vipPrice"
                                                        placeholder="Leave blank for TBD"
                                                        min="0"
                                                        step="0.01"
                                                        value={vipPrice}
                                                        onChange={(e) => setVipPrice(e.target.value)}
                                                    />
                                                </div>
                                                <div className="form-group-event half">
                                                    <label htmlFor="vipQuantity">QUANTITY - Optional</label>
                                                    <input
                                                        type="number"
                                                        className="form-control-event"
                                                        id="vipQuantity"
                                                        placeholder="Leave blank for unlimited"
                                                        min="1"
                                                        step="1"
                                                        value={vipQuantity}
                                                        onChange={(e) => setVipQuantity(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>


                                </div>

                                <div className="ticket-info-note">
                                    <i className="bi bi-info-circle"></i>
                                    <span>
                                        Leave price blank if not decided yet, leave quantity blank for unlimited tickets.
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="create-event-footer">
                            <div>
                                {currentStep > 1 && (
                                    <button className="btn-event btn-event-back" onClick={handleBack}>
                                        Back
                                    </button>
                                )}
                            </div>
                            <div>
                                <button
                                    className="btn-event btn-event-next"
                                    onClick={handleNext}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "CREATING..." :
                                        currentStep === 1 ? "NEXT: TICKET PRICING" : "CREATE TICKET EVENT"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </>
    );
}

export default CreateTicketEvent;