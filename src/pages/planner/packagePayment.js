import React, { useState, useEffect, useRef, useCallback } from "react";
import "./main.css";
import "../../alert.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import { logOut } from "../components";

// API URL Configuration
const API_URL = process.env.REACT_APP_API_URL;

const PackagePayment = () => {
    const dropdownRef = useRef(null);
    const [user, setUser] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [eventStatus, setEventStatus] = useState("");
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
    const [showPaymentPopup, setShowPaymentPopup] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [processingPayment, setProcessingPayment] = useState(false);
    const [paymentStarted, setPaymentStarted] = useState(false);

    const vatRate = 0.0;
    const [alert, setAlert] = useState({ show: false, message: "", type: "" });

    // // ============ PAYFAST CONFIGURATION for testing ============
    // const PAYFAST_CONFIG = {
    //     MERCHANT_ID: "10039229",
    //     MERCHANT_KEY: "1ogl07vai6oig",
    //     ITN_URL: "https://dc86-197-185-137-11.ngrok-free.app/eventa/src/pages/api/payFastInt.php",
    //     PAYFAST_URL: "https://sandbox.payfast.co.za/eng/process",
    //     RETURN_URL: "https://105c-197-185-137-11.ngrok-free.app/paymentSuccess",
    //     CANCEL_URL: "https://105c-197-185-137-11.ngrok-free.app/paymentCancel",
    //     EMAIL_CONFIRMATION: true,
    //     CONFIRMATION_EMAIL: "",
    //     PAYMENT_METHOD: "cc",
    // };
    const API_URL = process.env.REACT_APP_API_URL;
    const BASE_URL = API_URL.replace('/api', '');

    const PAYFAST_CONFIG = {

        MERCHANT_ID: "33426571",
        MERCHANT_KEY: "lkqoiy0ftb9yc",
        PAYFAST_URL: "https://www.payfast.co.za/eng/process",

        ITN_URL: `${API_URL}/payFastInt.php`,

        RETURN_URL: `${BASE_URL}/paymentSuccess`,

        CANCEL_URL: `${BASE_URL}/paymentCancel`,

        EMAIL_CONFIRMATION: true,

        CONFIRMATION_EMAIL: "",

        PAYMENT_METHOD: ""
    };

    const printAlert = (message, type = "info") => {
        setAlert({ show: true, message, type });
        setTimeout(() => {
            setAlert({ show: false, message: "", type: "" });
        }, 5000);
    };

    // Calculate payment details
    const calculatePaymentDetails = useCallback(() => {
        if (!selectedPackage?.price) return null;

        const basePrice = Number(selectedPackage.price) || 0;
        const vatAmount = basePrice * vatRate;
        const serviceFee = basePrice > 0 ? 2.0 : 0;
        const totalAmount = basePrice + vatAmount + serviceFee;

        return {
            basePrice,
            vatAmount,
            serviceFee,
            totalAmount: totalAmount.toFixed(2)
        };
    }, [selectedPackage]);

    const paymentDetails = calculatePaymentDetails();

    // ============ PAYFAST FUNCTIONS ============
    const generateTransactionId = () => {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `PF-${timestamp}-${random}`;
    };

    const generatePayFastSignature = async (data) => {

        try {
            const formData = new FormData();

            Object.entries(data).forEach(([key, value]) => {

                if (
                    value !== '' &&
                    value !== null &&
                    value !== undefined
                ) {
                    formData.append(key, value);
                }
            });

            const response = await fetch(`${API_URL}/generateSignature.php`, {
                method: 'POST',
                body: formData
            });

            const text = await response.text();

            console.log("RAW RESPONSE:", text);

            const result = JSON.parse(text);

            if (!result.success) {
                throw new Error(result.error || 'Signature generation failed');
            }

            return result.signature;

        } catch (error) {

            console.error('Signature generation error:', error);
            throw error;
        }
    };

    const preparePayFastData = () => {

        const mPaymentId = generateTransactionId();

        const userData = JSON.parse(localStorage.getItem("user") || "{}");

        const fullName = (userData?.name || "").trim();

        const firstName = fullName.split(" ")[0] || "";

        const lastName = fullName.split(" ").slice(1).join(" ") || "";

        const amount = parseFloat(paymentDetails?.totalAmount || 0).toFixed(2);

        const rawData = {

            merchant_id: PAYFAST_CONFIG.MERCHANT_ID,
            merchant_key: PAYFAST_CONFIG.MERCHANT_KEY,

            return_url: PAYFAST_CONFIG.RETURN_URL,
            cancel_url: PAYFAST_CONFIG.CANCEL_URL,
            notify_url: PAYFAST_CONFIG.ITN_URL,

            name_first: firstName,
            name_last: lastName,

            email_address: userData?.email || "",

            m_payment_id: mPaymentId,

            amount: amount,

            item_name: `${selectedPackage?.package_type || "Event"} Package`,

            item_description: `Max Events: ${selectedPackage?.max_events || 0}, Max Guests: ${selectedPackage?.max_guests || 0}`,

            email_confirmation: "1",

            confirmation_address: userData?.email || "",

            custom_str1: String(userData?.user_id || ""),
            custom_str2: String(selectedPackage?.package_id || ""),
            custom_str3: String(selectedPackage?.package_type || ""),
            custom_str4: "payfast",

            custom_int1: String(parseInt(selectedPackage?.max_events) || 0),
            custom_int2: String(parseInt(selectedPackage?.max_guests) || 0),
        };

        // IMPORTANT:
        // Create ONE cleaned object ONLY
        const cleanedData = {};

        Object.entries(rawData).forEach(([key, value]) => {

            if (
                value !== '' &&
                value !== null &&
                value !== undefined
            ) {
                cleanedData[key] = String(value);
            }
        });

        console.log("Prepared PayFast Data:", cleanedData);

        return cleanedData;
    };

    const initiatePayFastPayment = async () => {
        setProcessingPayment(true);
        setPaymentStarted(true);

        try {
            const paymentData = preparePayFastData();

            // Generate signature SERVER-SIDE
            const signature = await generatePayFastSignature(paymentData);

            // Add signature to data
            const signedPaymentData = {
                ...paymentData,
                signature: signature
            };

            console.log("FINAL DATA BEING SENT:", signedPaymentData);


            localStorage.setItem('last_payfast_transaction', paymentData.m_payment_id);

            // Create and submit form
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = PAYFAST_CONFIG.PAYFAST_URL;
            form.target = '_blank';
            form.style.display = 'none';

            Object.keys(signedPaymentData).forEach(key => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = String(signedPaymentData[key]);
                form.appendChild(input);
                console.log(`Adding field: ${key}=${signedPaymentData[key]}`);
            });

            document.body.appendChild(form);
            setShowPaymentPopup(false);
            form.submit();

            // Clean up
            setTimeout(() => {
                document.body.removeChild(form);
            }, 1000);

            // Show success message and redirect after a delay
            printAlert("Redirecting to PayFast... Complete your payment there.", "info");

            // Optional: Redirect back to dashboard after some time
            setTimeout(() => {
                setProcessingPayment(false);
                setPaymentStarted(false);
                navigate("/eventsDashboard");
            }, 5000);

        } catch (error) {
            console.error("PayFast payment error:", error);
            printAlert("Payment initiation failed: " + error.message, "error");
            setProcessingPayment(false);
            setPaymentStarted(false);
        }
    };

    // ============ GET PACKAGE DETAILS ============
    const getPackageById = async (packageId) => {
        try {
            const formData = new FormData();
            formData.append("function", "getPackageById");
            formData.append("package_id", packageId);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            if (data.success && data.package) {
                setSelectedPackage({
                    ...data.package,
                    price: Number(data.package.price) || 0
                });
            } else {
                throw new Error("Package not found");
            }
        } catch (err) {
            console.error("Failed to fetch package:", err);
            setError("Failed to load package details");
            setSelectedPackage(null);
        }
    };

    const processPayment = async (paymentData) => {
        if (processingPayment || paymentStarted) {
            console.log("Payment already in progress");
            return;
        }

        if (selectedPaymentMethod === 'payfast') {
            await initiatePayFastPayment();
        }
    };

    // ============ PAYMENT FORM COMPONENTS ============
    const PayFastForm = ({ onSubmit }) => {
        const [loading, setLoading] = useState(false);

        const handleSubmit = (e) => {
            e.preventDefault();
            setLoading(true);
            onSubmit({
                paymentMethod: "payfast",
                provider: "PayFast",
                status: "redirecting"
            });
        };

        return (
            <div className="payfast-container">
                <div className="payfast-header">
                    <i className="bi bi-shield-lock"></i>
                    <h4>Pay with PayFast</h4>
                </div>
                <div className="payfast-features">
                    <div className="feature-item">
                        <i className="bi bi-credit-card"></i>
                        <span>Credit/Debit Cards</span>
                    </div>
                    <div className="feature-item">
                        <i className="bi bi-bank"></i>
                        <span>EFT & Instant EFT</span>
                    </div>
                    <div className="feature-item">
                        <i className="bi bi-phone"></i>
                        <span>Mobile Wallets</span>
                    </div>
                </div>
                <p className="payment-info">
                    You will be securely redirected to PayFast to complete your payment.
                </p>
                <div className="payfast-amount">
                    <strong>Amount: R{paymentDetails?.totalAmount || "0.00"}</strong>
                </div>
                <button
                    onClick={handleSubmit}
                    className="submit-payment-btn payfast-btn"
                    disabled={loading || processingPayment}
                >
                    {loading || processingPayment ? (
                        <>
                            <div className="spinner-border spinner-border-sm" role="status"></div>
                            &nbsp;Redirecting to PayFast...
                        </>
                    ) : (
                        "Proceed to PayFast"
                    )}
                </button>
                <div className="payfast-security">
                    <i className="bi bi-shield-check"></i>
                    <small>Secured by PayFast | PCI DSS Level 1 Compliant</small>
                </div>
            </div>
        );
    };

    const renderPaymentForm = () => {
        switch (selectedPaymentMethod) {
            case 'payfast':
                return <PayFastForm onSubmit={processPayment} />;
            default:
                return null;
        }
    };

    // ============ NAVIGATION & INITIALIZATION ============
    useEffect(() => {
        const initializePage = async () => {
            setLoading(true);
            setError("");

            try {
                const packageId = localStorage.getItem("selectedPackageId");
                const storedUser = localStorage.getItem("user");

                if (!storedUser) {
                    printAlert("Session expired. Please log in again.", "error");
                    logOut();
                    navigate("/");
                    return;
                }

                const userData = JSON.parse(storedUser);
                setUser(userData);

                if (!packageId) {
                    navigate("/upgrade-package");
                    return;
                }

                await getPackageById(packageId);

                console.log("PayFast Configuration:", {
                    environment: process.env.NODE_ENV,
                    payfast_url: PAYFAST_CONFIG.PAYFAST_URL,
                    itn_url: PAYFAST_CONFIG.ITN_URL,
                    return_url: PAYFAST_CONFIG.RETURN_URL,
                    cancel_url: PAYFAST_CONFIG.CANCEL_URL
                });
            } catch (error) {
                console.error("Initialization error:", error);
                setError("Failed to initialize page");
                navigate("/upgrade-package");
            } finally {
                setLoading(false);
            }
        };

        initializePage();
    }, [searchParams, navigate]);

    useEffect(() => {
        const id = localStorage.getItem("selectedEventId");
        fetchEventStatusByID(id);
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchEventStatusByID = async (eventId) => {
        try {
            const formData = new FormData();
            formData.append("function", "getEventStatusByID");
            formData.append("event_id", eventId);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });
            if (!response.ok) throw new Error("Network response was not ok");
            const data = await response.json();
            console.log("Event Status data:", data);
            if (data.success && data.status) {
                setEventStatus(data.status.published == 1 ? "Published" : "Unpublished");
            } else {
                setEventStatus("Unknown");
            }
        } catch (err) {
            console.error("Failed to fetch event status:", err);
            return "unknown";
        }
    }

    const toggleDropdown = () => setDropdownOpen(!dropdownOpen);
    const handleBack = () => navigate(-1);
    const goToHome = () => navigate("/eventsDashboard");
    const goToEventManagement = () => navigate(`/eventManagement`);
    const goToInvitations = () => navigate(`/invitationPage`);
    const goToManage = () => navigate(`/manage_my_event`);
    const goToGuestInsights = () => navigate("/guest_insights");
    const goToAttendanceStats = () => navigate("/attendance_stats");
    const goToProfile = () => navigate("/Profile");
    const handlePaymentMethodSelect = (method) => {
        setSelectedPaymentMethod(method);
        setShowPaymentPopup(true);
    };
    const closePopup = () => {
        setShowPaymentPopup(false);
        setSelectedPaymentMethod("");
        setError("");
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-overlay">
                    <div className="loading-spinner"></div>
                    <p className="loading-text">Loading package details...</p>
                </div>
            </div>
        );
    }

    if (!selectedPackage) {
        return (
            <div className="loading-container">
                <div className="loading-overlay">
                    <div className="error-message">
                        <p>Package not found. Please select a valid package.</p>
                        {error && <p className="text-danger">{error}</p>}
                    </div>
                    <button onClick={handleBack} className="btn-event btn-event-back">
                        Back to Packages
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            {alert.show && (
                <div className={`custom-alert ${alert.type}`}>
                    <i className={`fas ${alert.type === "error" ? "fa-times-circle" :
                        alert.type === "success" ? "fa-check-circle" :
                            alert.type === "warning" ? "fa-exclamation-triangle" : "fa-info-circle"
                        }`}></i>
                    <span>{alert.message}</span>
                </div>
            )}

            <div className="dashboard-header">
                <h1>Evenda</h1>
                <div className="header-tabs">
                    <button className={`status-btn status-${eventStatus.toLowerCase()}`}>{eventStatus}</button>
                    <div ref={dropdownRef} className={`profile-container ${dropdownOpen ? "open" : ""}`} onClick={toggleDropdown}>
                        <i className="bi bi-person-circle"></i>
                        <span>{user?.name || "Guest"}</span>
                        <i className="bi bi-chevron-bar-down"></i>
                        {dropdownOpen && (
                            <div className="dropdown-menu show">
                                <button className="dropdown-item" onClick={goToProfile}><i className="bi bi-person"></i>Profile</button>
                                <button className="dropdown-item" onClick={logOut}><i className="bi bi-box-arrow-right"></i>Logout</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="dashboard-sidebar">
                <div className="sidebar-header"><h3>Event Management</h3></div>
                <div className="sidebar-section">
                    <h4>Event Planning</h4>
                    <ul>
                        <li onClick={goToHome}><i className="bi bi-house"></i>Dashboard</li>
                        <li onClick={goToManage}><i className="bi bi-megaphone"></i>Publish Event</li>
                        <li onClick={goToInvitations}><i className="bi bi-send"></i>Send Invitations</li>
                        <li className="active" onClick={goToEventManagement}><i className="bi bi-list-check"></i>RSVP Responses</li>
                    </ul>
                </div>
                <div className="sidebar-section">
                    <h4>Event Analytics</h4>
                    <ul>
                        <li onClick={goToAttendanceStats}><i className="bi bi-graph-up"></i>Attendance Stats</li>
                        <li onClick={goToGuestInsights}><i className="bi bi-people"></i>Guest Insights</li>
                    </ul>
                </div>
            </div>

            <div className="packagePayment-content container">
                <button className="btn-event btn-event-back" onClick={handleBack}>
                    Back
                </button>
                <div className="header">
                    <h2>Complete Your Payment</h2>
                    <p>Secure and fast checkout powered by evenda</p>
                    <hr />
                </div>

                {error && (
                    <div className="alert alert-danger" role="alert">
                        {error}
                    </div>
                )}

                <div className="payymentForm">
                    <div className="paymentInfo">
                        <h3 className="packageName">{selectedPackage.package_type} Plan</h3>
                        <div className="package-features">
                            <p><i className="bi bi-people"></i> Max Guests: {selectedPackage.max_guests}</p>
                            <p><i className="bi bi-calendar-event"></i> Max Events: {selectedPackage.max_events}</p>
                        </div>

                        <div className="payment-breakdown">
                            <div className="item">
                                <p className="planCost">Plan Cost</p>
                                <span className="costAmount">
                                    R{Number(selectedPackage?.price || 0).toFixed(2)}
                                </span>
                            </div>

                            {selectedPackage.price > 0 && (
                                <>
                                    <div className="item">
                                        <p className="planCost">VAT (15%)</p>
                                        <span className="costAmount">R{paymentDetails?.vatAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="item">
                                        <p className="planCost">Service Fee</p>
                                        <span className="costAmount">R{paymentDetails?.serviceFee.toFixed(2)}</span>
                                    </div>
                                </>
                            )}

                            <div className="totalAmount">
                                <h3 className="totalTitle">Total</h3>
                                <h3 className="totalPrice">R{paymentDetails?.totalAmount}</h3>
                            </div>
                        </div>
                    </div>

                    <h3 className="paymentTitle">Choose Payment Method</h3>

                    <div className="payment-method">
                        <button
                            className={`paymentOption ${selectedPaymentMethod === 'payfast' ? 'active' : ''}`}
                            onClick={() => handlePaymentMethodSelect('payfast')}
                        >
                            <i className="bi bi-bank"></i>
                            <span>PayFast</span>
                            <small>Secure SA Payments</small>
                        </button>
                    </div>
                </div>

                {showPaymentPopup && (
                    <div className="payment-popup-overlay">
                        <div className="payment-popup">
                            <button className="close-popup" onClick={closePopup}>×</button>
                            <h3>Complete Payment</h3>
                            <div className="payment-summary">
                                <p><strong>Package:</strong> {selectedPackage.package_type}</p>
                                <p><strong>Amount:</strong> R{paymentDetails?.totalAmount}</p>
                            </div>
                            {renderPaymentForm()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PackagePayment;