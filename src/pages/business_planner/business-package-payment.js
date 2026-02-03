import React, { useState, useEffect, useRef, useCallback } from "react";
import "../planner/main.css"; // Verify this path is correct
import "../../alert.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import { logOut } from "../components"; 

const BusinessPackagePayment = () => {
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

    const vatRate = 0.15;
    const [alert, setAlert] = useState({ show: false, message: "", type: "" });

    const printAlert = (message, type = "info") => {
        setAlert({ show: true, message, type });
        setTimeout(() => {
            setAlert({ show: false, message: "", type: "" });
        }, 5000);
    };


    // Memoized calculation function
    const calculatePaymentDetails = useCallback(() => {
        if (!selectedPackage?.price) return null;

        const basePrice = Number(selectedPackage.price) || 0;
        const vatAmount = basePrice * vatRate;
        const serviceFee = basePrice > 0 ? 5.0 : 0;
        const totalAmount = basePrice + vatAmount + serviceFee;

        return {
            basePrice,
            vatAmount,
            serviceFee,
            totalAmount
        };
    }, [selectedPackage]);

    const paymentDetails = calculatePaymentDetails();

    const getBusinessPackageById = async (packageId) => {
        try {
            const formData = new FormData();
            formData.append("function", "getBusinessPackageById");
            formData.append("package_id", packageId);
            const API_URL = process.env.REACT_APP_API_URL;

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Network response was not ok");

            const text = await response.text();
            if (!text.trim()) {
                console.error("Empty response from server (getBusinessPackageById)");
                throw new Error("Empty response from server");
            }

            let data;
            try {
                data = JSON.parse(text);
            } catch (err) {
                console.error("Invalid JSON from server:", text);
                throw new Error("Invalid JSON response");
            }

            if (data.success && data.package) {
                setSelectedPackage({
                    ...data.package,
                    price: Number(data.package.price) || 0
                });
            } else {
                throw new Error(data.message || "Package not found");
            }
        } catch (err) {
            console.error("Failed to fetch business package:", err);
            setError("Failed to load package details");
            setSelectedPackage(null);
        }
    };

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
                
                // Verify business user
                if (userData.account_type !== 'business') {
                    printAlert("This page is for business accounts only.", "error");
                    navigate("/packagePayment");
                    return;
                }
                
                setUser(userData);

                if (!packageId) {
                    navigate("/upgrade_business_package");
                    return;
                }

                await getBusinessPackageById(packageId);
            } catch (error) {
                console.error("Initialization error:", error);
                setError("Failed to initialize page");
                navigate("/upgrade_business_package");
            } finally {
                setLoading(false);
            }
        };

        initializePage();
    }, [searchParams, navigate]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    const navigationHandlers = {
        home: () => {
            const storedUser = localStorage.getItem('user');
            const user = storedUser ? JSON.parse(storedUser) : null;
            const dashPath = user?.account_type === 'business' ? '/businessdashboard' : '/eventsDashboard';
            navigate(dashPath);
        },
        eventManagement: () => navigate("/eventManagement"),
        invitations: () => navigate("/invitationPage"),
        manage: () => navigate("/manage_my_event")
    };

    const handleBack = () => {
        navigate(-1);
    };

    const handlePaymentMethodSelect = (method) => {
        setSelectedPaymentMethod(method);
        setShowPaymentPopup(true);
    };

    const recordBusinessPayment = async (paymentData) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            // derive a robust user id from the stored user object
            const resolveUserId = (u) => {
                if (!u) return null;
                return u.user_id || u.id || u.userID || u.uid || u.email || null;
            };
            const resolvedUserId = resolveUserId(user);

            formData.append("function", "recordBusinessPayment");
            formData.append("user_id", resolvedUserId);
            formData.append("business_package_id", selectedPackage?.id);
            formData.append("amount", paymentDetails?.totalAmount);
            formData.append("payment_method", selectedPaymentMethod);
            
            console.log("Recording business payment with data:", {
                user_id: resolvedUserId,
                business_package_id: selectedPackage?.id,
                amount: paymentDetails?.totalAmount,
                payment_method: selectedPaymentMethod,
            });
            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            // Check if the response is empty or invalid JSON
            const text = await response.text();
            if (!text.trim()) {
                console.error("Empty response from server (recordBusinessPayment)");
                throw new Error("Empty response from server");
            }

            let result;
            try {
                result = JSON.parse(text);
            } catch (err) {
                console.error("Invalid JSON from server:", text);
                throw new Error("Invalid JSON response");
            }

            if (!response.ok || !result.success) {
                console.error("Server error:", result.message || "Unknown error");
                throw new Error(result.message || "Payment not recorded");
            }

            console.log("✅ Business payment recorded successfully:", result);
            return true;

        } catch (error) {
            console.error("Error recording business payment:", error);
            return false;
        }
    };

    const updateUserBusinessPackage = async () => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "updateUserBusinessPackage");
            formData.append("user_id", user?.user_id);
            formData.append("business_package_id", selectedPackage?.id);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            const text = await response.text();
            if (!text.trim()) {
                console.error("Empty response from server (updateUserBusinessPackage)");
                throw new Error("Empty response from server");
            }

            let result;
            try {
                result = JSON.parse(text);
            } catch (err) {
                console.error("Invalid JSON from server:", text);
                throw new Error("Invalid JSON response");
            }

            if (!response.ok || !result.success) {
                console.error("Server error:", result.message || "Unknown error");
                throw new Error(result.message || "Failed to update user business package");
            }

            return true;
        } catch (error) {
            console.error("Error updating business package:", error);
            return false;
        }
    };

    const processPayment = async (paymentData) => {
        if (processingPayment || paymentStarted) {
            console.log("Payment already in progress, ignoring duplicate click");
            return;
        }

        setPaymentStarted(true);
        setProcessingPayment(true);
        setError("");

        try {
            await new Promise(resolve => setTimeout(resolve, 2000));

            const paymentSuccess = await recordBusinessPayment(paymentData);

            console.log("Business payment success status:", paymentSuccess);
            if (paymentSuccess) {
                const updateSuccess = await updateUserBusinessPackage();

                if (updateSuccess) {
                    localStorage.removeItem("selectedPackageId");
                    printAlert("Payment successful! Your business package has been upgraded.", "success");
                    handleBack();
                } else {
                    throw new Error("Failed to update user business package");
                }
            } else {
                throw new Error("Payment recording failed");
            }
        } catch (error) {
            console.error("Payment processing error:", error);
            setError("An error occurred during payment processing. Please try again.");
            printAlert("Payment failed. Please try again.", "error");
        } finally {
            setProcessingPayment(false);
            setPaymentStarted(false);
            setShowPaymentPopup(false);
        }
    };

    const closePopup = () => {
        setShowPaymentPopup(false);
        setSelectedPaymentMethod("");
        setError("");
    };

    // Payment Form Components (CreditCardForm, PayPalForm, StripeForm remain the same)
    const CreditCardForm = ({ onSubmit }) => {
        const [cardData, setCardData] = useState({
            cardNumber: "",
            expiryDate: "",
            cvv: "",
            cardholderName: ""
        });
        const [loading, setLoading] = useState(false);

        const handleSubmit = (e) => {
            e.preventDefault();
            setLoading(true);

            // Simulate secure card validation
            setTimeout(() => {
                setLoading(false);
                onSubmit({
                    paymentMethod: "credit_card",
                    provider: "Visa/MasterCard",
                    status: "completed"
                });
            }, 2500);
        };

        return (
            <form onSubmit={handleSubmit} className="payment-form">
                <div className="form-group">
                    <label>Cardholder Name</label>
                    <input
                        type="text"
                        value={cardData.cardholderName}
                        onChange={(e) => setCardData({ ...cardData, cardholderName: e.target.value })}
                        placeholder="John Doe"
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Card Number</label>
                    <input
                        type="text"
                        value={cardData.cardNumber}
                        onChange={(e) =>
                            setCardData({ ...cardData, cardNumber: e.target.value.replace(/\D/g, '').slice(0, 16) })
                        }
                        placeholder="1234 5678 9012 3456"
                        required
                    />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Expiry Date</label>
                        <input
                            type="text"
                            value={cardData.expiryDate}
                            onChange={(e) =>
                                setCardData({ ...cardData, expiryDate: e.target.value.replace(/[^0-9/]/g, '').slice(0, 5) })
                            }
                            placeholder="MM/YY"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>CVV</label>
                        <input
                            type="text"
                            value={cardData.cvv}
                            onChange={(e) =>
                                setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) })
                            }
                            placeholder="123"
                            required
                        />
                    </div>
                </div>

                <button type="submit" className="submit-payment-btn" disabled={loading}>
                    {loading ? (
                        <>
                            <div className="spinner-border spinner-border-sm" role="status"></div>
                            &nbsp;Processing Secure Payment...
                        </>
                    ) : (
                        `Pay Securely R${paymentDetails?.totalAmount?.toFixed(2) || "0.00"}`
                    )}
                </button>
            </form>
        );
    };

    const PayPalForm = ({ onSubmit }) => {
        const [loading, setLoading] = useState(false);

        const handleSubmit = (e) => {
            e.preventDefault();
            setLoading(true);

            setTimeout(() => {
                setLoading(false);
                onSubmit({
                    paymentMethod: "paypal",
                    provider: "PayPal",
                    status: "completed"
                });
            }, 2500);
        };

        return (
            <div className="paypal-container">
                <div className="paypal-header">
                    <i className="bi bi-paypal"></i>
                    <h4>Pay with PayPal</h4>
                </div>
                <p className="payment-info">
                    This is a demo simulation — no real payment will be processed.
                </p>
                <div className="paypal-amount">
                    <strong>Amount: R{paymentDetails?.totalAmount?.toFixed(2) || "0.00"}</strong>
                </div>
                <button
                    onClick={handleSubmit}
                    className="submit-payment-btn paypal-btn"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <div className="spinner-border spinner-border-sm" role="status"></div>
                            &nbsp;Processing PayPal Payment...
                        </>
                    ) : (
                        "Confirm Payment"
                    )}
                </button>
            </div>
        );
    };

    const StripeForm = ({ onSubmit }) => {
        const handleSubmit = (e) => {
            e.preventDefault();
            onSubmit({
                paymentMethod: 'stripe',
                provider: 'Stripe'
            });
        };

        return (
            <div className="stripe-container">
                <div className="stripe-header">
                    <i className="bi bi-credit-card"></i>
                    <h4>Pay with Stripe</h4>
                </div>
                <p className="payment-info">
                    Secure payment processed by Stripe. Your card details are encrypted and safe.
                </p>
                <div className="stripe-features">
                    <div className="feature-item">
                        <i className="bi bi-shield-check"></i>
                        <span>PCI DSS compliant</span>
                    </div>
                    <div className="feature-item">
                        <i className="bi bi-lock"></i>
                        <span>256-bit encryption</span>
                    </div>
                </div>
                <button
                    onClick={handleSubmit}
                    className="submit-payment-btn stripe-btn"
                    disabled={processingPayment}
                >
                    {processingPayment ? (
                        <>
                            <div className="spinner-border spinner-border-sm" role="status"></div>
                            Processing with Stripe...
                        </>
                    ) : (
                        `Pay R${paymentDetails?.totalAmount?.toFixed(2) || '0.00'} with Stripe`
                    )}
                </button>
            </div>
        );
    };

    const renderPaymentForm = () => {
        switch (selectedPaymentMethod) {
            case 'credit-card':
                return <CreditCardForm onSubmit={processPayment} />;
            case 'paypal':
                return <PayPalForm onSubmit={processPayment} />;
            case 'stripe':
                return <StripeForm onSubmit={processPayment} />;
            default:
                return null;
        }
    };

    const toggleDropdown = () => setDropdownOpen(!dropdownOpen);
    const goToHome = () => {
        const storedUser = localStorage.getItem('user');
        const user = storedUser ? JSON.parse(storedUser) : null;
        const dashPath = user?.account_type === 'business' ? '/businessdashboard' : '/eventsDashboard';
        navigate(dashPath);
    };
    const goToEventManagement = () => navigate(`/eventManagement`);
    const goToInvitations = () => navigate(`/invitationPage`);
    const goToManage = () => navigate(`/manage_my_event`);
    const goToGuestInsights = () => navigate("/guest_insights");
    const goToAttendanceStats = () => navigate("/attendance_stats");
    const goToProfile = () => navigate("/Profile");

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
            {/* Custom alert box */}
            {alert.show && (
                <div className={`custom-alert ${alert.type}`}>
                    <i
                        className={`fas ${alert.type === "error"
                            ? "fa-times-circle"
                            : alert.type === "success"
                                ? "fa-check-circle"
                                : alert.type === "warning"
                                    ? "fa-exclamation-triangle"
                                    : "fa-info-circle"
                            }`}
                    ></i>
                    <span>{alert.message}</span>
                </div>
            )}


            {/* HEADER */}
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

            {/* SIDEBAR */}
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
                    <h2>Complete Your Business Package Payment</h2>
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
                        <h3 className="packageName">{selectedPackage.name}</h3>
                        <div className="package-features">
                            <p><i className="bi bi-people"></i> Max Guests: {selectedPackage.max_guests}</p>
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
                                <h3 className="totalPrice">R{paymentDetails?.totalAmount.toFixed(2)}</h3>
                            </div>
                        </div>
                    </div>

                    <h3 className="paymentTitle">Choose Payment Method</h3>

                    <div className="payment-method">
                        <button
                            className={`paymentOption ${selectedPaymentMethod === 'credit-card' ? 'active' : ''}`}
                            onClick={() => handlePaymentMethodSelect('credit-card')}
                        >
                            <i className="bi bi-credit-card-2-front"></i>
                            <span>Credit/Debit Card</span>
                            <small>Visa, Mastercard, Amex</small>
                        </button>
                        <button
                            className={`paymentOption ${selectedPaymentMethod === 'paypal' ? 'active' : ''}`}
                            onClick={() => handlePaymentMethodSelect('paypal')}
                        >
                            <i className="bi bi-paypal"></i>
                            <span>PayPal</span>
                            <small>Fast & secure</small>
                        </button>
                        <button
                            className={`paymentOption ${selectedPaymentMethod === 'stripe' ? 'active' : ''}`}
                            onClick={() => handlePaymentMethodSelect('stripe')}
                        >
                            <i className="bi bi-shield-check"></i>
                            <span>Stripe</span>
                            <small>Secure payments</small>
                        </button>
                    </div>
                </div>

                {/* Payment Method Popup */}
                {showPaymentPopup && (
                    <div className="payment-popup-overlay">
                        <div className="payment-popup">
                            <button className="close-popup" onClick={closePopup}>×</button>
                            <h3>Complete Payment</h3>
                            <div className="payment-summary">
                                <p><strong>Package:</strong> {selectedPackage.name}</p>
                                <p><strong>Amount:</strong> R{paymentDetails?.totalAmount.toFixed(2)}</p>
                            </div>
                            {renderPaymentForm()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BusinessPackagePayment;
