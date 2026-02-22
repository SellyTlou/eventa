import React, { useState, useEffect, useRef, useCallback } from "react";
import "../planner/main.css";
import "../../alert.css";
import { useNavigate } from "react-router-dom";
import { LoginNav, Footer } from "../components";

const BusinessPackagePayment = () => {
    const dropdownRef = useRef(null);
    const [user, setUser] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const navigate = useNavigate();
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

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';

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

            const response = await fetch(`${API_BASE_URL}/query.php`, {
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
                const packageType = localStorage.getItem("selectedPackageType");
                const storedUser = localStorage.getItem("user");

                if (!storedUser) {
                    printAlert("Session expired. Please log in again.", "error");
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

                if (!packageId || packageType !== 'business') {
                    printAlert("No business package selected.", "warning");
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
    }, [navigate]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleBack = () => {
        navigate(-1);
    };

    const handlePaymentMethodSelect = (method) => {
        setSelectedPaymentMethod(method);
        setShowPaymentPopup(true);
    };

    const recordBusinessPayment = async (paymentData) => {
        try {
            const formData = new FormData();
            
            formData.append("function", "recordBusinessPayment");
            formData.append("user_id", user?.user_id);
            formData.append("business_package_id", selectedPackage?.id);
            formData.append("amount", paymentDetails?.totalAmount);
            formData.append("payment_method", selectedPaymentMethod);
            formData.append("transaction_id", `BP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
            
            console.log("Recording business payment with data:", {
                user_id: user?.user_id,
                business_package_id: selectedPackage?.id,
                amount: paymentDetails?.totalAmount,
                payment_method: selectedPaymentMethod,
            });
            
            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

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

    const assignBusinessPackage = async () => {
        try {
            const formData = new FormData();
            formData.append("function", "assignBusinessPackage");
            formData.append("user_id", user?.user_id);
            formData.append("business_package_id", selectedPackage?.id);

            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            const text = await response.text();
            if (!text.trim()) {
                console.error("Empty response from server (assignBusinessPackage)");
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
                throw new Error(result.message || "Failed to assign business package");
            }

            return true;
        } catch (error) {
            console.error("Error assigning business package:", error);
            return false;
        }
    };

    const processPayment = async () => {
        if (processingPayment || paymentStarted) {
            console.log("Payment already in progress, ignoring duplicate click");
            return;
        }

        setPaymentStarted(true);
        setProcessingPayment(true);
        setError("");

        try {
            // Simulate payment processing (replace with actual payment gateway)
            await new Promise(resolve => setTimeout(resolve, 2000));

            const paymentSuccess = await recordBusinessPayment();

            console.log("Business payment success status:", paymentSuccess);
            if (paymentSuccess) {
                const assignSuccess = await assignBusinessPackage();

                if (assignSuccess) {
                    // Clear localStorage items
                    localStorage.removeItem("selectedPackageId");
                    localStorage.removeItem("selectedPackageType");
                    localStorage.removeItem("selectedBusinessPackage");
                    
                    printAlert("Payment successful! Your business package has been activated.", "success");
                    
                    // Redirect to business dashboard after 2 seconds
                    setTimeout(() => {
                        navigate('/businessdashboard');
                    }, 2000);
                } else {
                    throw new Error("Failed to assign business package");
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

    // Payment Form Components
    const CreditCardForm = () => {
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
            processPayment();
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

                <button type="submit" className="submit-payment-btn" disabled={loading || processingPayment}>
                    {loading || processingPayment ? (
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

    const PayPalForm = () => {
        const [loading, setLoading] = useState(false);

        const handleSubmit = (e) => {
            e.preventDefault();
            setLoading(true);
            processPayment();
        };

        return (
            <div className="paypal-container">
                <div className="paypal-header">
                    <i className="bi bi-paypal"></i>
                    <h4>Pay with PayPal</h4>
                </div>
                <p className="payment-info">
                    You will be redirected to PayPal to complete your payment.
                </p>
                <div className="paypal-amount">
                    <strong>Amount: R{paymentDetails?.totalAmount?.toFixed(2) || "0.00"}</strong>
                </div>
                <button
                    onClick={handleSubmit}
                    className="submit-payment-btn paypal-btn"
                    disabled={loading || processingPayment}
                >
                    {loading || processingPayment ? (
                        <>
                            <div className="spinner-border spinner-border-sm" role="status"></div>
                            &nbsp;Processing PayPal Payment...
                        </>
                    ) : (
                        "Continue to PayPal"
                    )}
                </button>
            </div>
        );
    };

    const StripeForm = () => {
        const [loading, setLoading] = useState(false);

        const handleSubmit = (e) => {
            e.preventDefault();
            setLoading(true);
            processPayment();
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
                    disabled={loading || processingPayment}
                >
                    {loading || processingPayment ? (
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
                return <CreditCardForm />;
            case 'paypal':
                return <PayPalForm />;
            case 'stripe':
                return <StripeForm />;
            default:
                return null;
        }
    };

    const goToProfile = () => navigate("/Profile");
    const goToDashboard = () => navigate('/businessdashboard');

    if (loading) {
        return (
            <>
                <LoginNav />
                <div className="loading-container">
                    <div className="loading-overlay">
                        <div className="loading-spinner"></div>
                        <p className="loading-text">Loading package details...</p>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    if (!selectedPackage) {
        return (
            <>
                <LoginNav />
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
                <Footer />
            </>
        );
    }

    return (
        <>
            <LoginNav />
            
            {/* Custom alert box */}
            {alert.show && (
                <div className={`custom-alert ${alert.type}`}>
                    <i className={`fas ${alert.type === "error"
                        ? "fa-times-circle"
                        : alert.type === "success"
                            ? "fa-check-circle"
                            : alert.type === "warning"
                                ? "fa-exclamation-triangle"
                                : "fa-info-circle"
                        }`}></i>
                    <span>{alert.message}</span>
                </div>
            )}

            <div className="business-payment-page">
                <div className="container">
                    <button className="btn-event btn-event-back" onClick={handleBack}>
                        <i className="bi bi-arrow-left"></i> Back
                    </button>

                    <div className="payment-header">
                        <h1>Complete Your Business Package Payment</h1>
                        <p className="lead">Secure and fast checkout powered by Evendi</p>
                        
                        {/* Business Account Badge */}
                        <div className="account-badge">
                            <i className="bi bi-building"></i>
                            <span>Business Account: {user?.business_name || user?.name}</span>
                        </div>
                    </div>

                    {error && (
                        <div className="alert alert-danger" role="alert">
                            <i className="bi bi-exclamation-triangle"></i>
                            {error}
                        </div>
                    )}

                    <div className="payment-content">
                        <div className="payment-left">
                            {/* Package Summary Card */}
                            <div className="package-summary-card">
                                <h2>Package Summary</h2>
                                <div className="package-info">
                                    <h3 className="package-name">{selectedPackage.name}</h3>
                                    <div className="package-limits">
                                        <div className="limit-item">
                                            <i className="bi bi-people"></i>
                                            <span>Max Guests: <strong>{selectedPackage.max_guests}</strong></span>
                                        </div>
                                        <div className="limit-item">
                                            <i className="bi bi-calendar-event"></i>
                                            <span>Max Events: <strong>{selectedPackage.max_events || 'Unlimited'}</strong></span>
                                        </div>
                                    </div>

                                    {selectedPackage.features && (
                                        <div className="package-features-list">
                                            <h4>Features Included:</h4>
                                            <ul>
                                                {selectedPackage.features.split(',').map((feature, index) => (
                                                    <li key={index}>
                                                        <i className="bi bi-check-circle-fill"></i>
                                                        {feature.trim()}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                <div className="price-breakdown">
                                    <h4>Price Breakdown</h4>
                                    <div className="breakdown-item">
                                        <span>Plan Cost:</span>
                                        <span>R{paymentDetails?.basePrice.toFixed(2)}</span>
                                    </div>
                                    {selectedPackage.price > 0 && (
                                        <>
                                            <div className="breakdown-item">
                                                <span>VAT (15%):</span>
                                                <span>R{paymentDetails?.vatAmount.toFixed(2)}</span>
                                            </div>
                                            <div className="breakdown-item">
                                                <span>Service Fee:</span>
                                                <span>R{paymentDetails?.serviceFee.toFixed(2)}</span>
                                            </div>
                                        </>
                                    )}
                                    <div className="breakdown-total">
                                        <span>Total Amount:</span>
                                        <span className="total-price">R{paymentDetails?.totalAmount.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="payment-right">
                            <h2>Choose Payment Method</h2>

                            <div className="payment-methods">
                                <button
                                    className={`payment-method-card ${selectedPaymentMethod === 'credit-card' ? 'active' : ''}`}
                                    onClick={() => handlePaymentMethodSelect('credit-card')}
                                >
                                    <div className="method-icon">
                                        <i className="bi bi-credit-card-2-front"></i>
                                    </div>
                                    <div className="method-info">
                                        <h4>Credit/Debit Card</h4>
                                        <p>Visa, Mastercard, American Express</p>
                                    </div>
                                </button>

                                <button
                                    className={`payment-method-card ${selectedPaymentMethod === 'paypal' ? 'active' : ''}`}
                                    onClick={() => handlePaymentMethodSelect('paypal')}
                                >
                                    <div className="method-icon">
                                        <i className="bi bi-paypal"></i>
                                    </div>
                                    <div className="method-info">
                                        <h4>PayPal</h4>
                                        <p>Fast and secure online payments</p>
                                    </div>
                                </button>

                                <button
                                    className={`payment-method-card ${selectedPaymentMethod === 'stripe' ? 'active' : ''}`}
                                    onClick={() => handlePaymentMethodSelect('stripe')}
                                >
                                    <div className="method-icon">
                                        <i className="bi bi-shield-check"></i>
                                    </div>
                                    <div className="method-info">
                                        <h4>Stripe</h4>
                                        <p>Secure payment processing</p>
                                    </div>
                                </button>
                            </div>

                            <div className="secure-note">
                                <i className="bi bi-lock"></i>
                                <span>Your payment information is secure and encrypted</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method Popup */}
                    {showPaymentPopup && (
                        <div className="payment-popup-overlay" onClick={closePopup}>
                            <div className="payment-popup" onClick={(e) => e.stopPropagation()}>
                                <button className="close-popup" onClick={closePopup}>×</button>
                                <h3>Complete Your Payment</h3>
                                
                                <div className="popup-package-summary">
                                    <p><strong>Package:</strong> {selectedPackage.name}</p>
                                    <p><strong>Total Amount:</strong> R{paymentDetails?.totalAmount.toFixed(2)}</p>
                                </div>

                                {renderPaymentForm()}

                                <p className="payment-disclaimer">
                                    This is a secure transaction. You will not be charged until you confirm.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Footer />
        </>
    );
};

export default BusinessPackagePayment;