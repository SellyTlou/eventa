import React, { useState, useEffect, useRef, useCallback } from "react";
import "./main.css"; // Verify this path is correct
import { useNavigate, useSearchParams } from "react-router-dom";
import { logOut } from "../components"; // Verify this import path

const PackagePayment = () => {
    const dropdownRef = useRef(null);
    const [user, setUser] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [selectedPackage, setSelectedPackage] = useState(null);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
    const [showPaymentPopup, setShowPaymentPopup] = useState(false);
    const [loading, setLoading] = useState(true);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [error, setError] = useState("");

    const vatRate = 0.15;

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

    const getPackageById = async (packageId) => {
        try {
            const formData = new FormData();
            formData.append("function", "getPackageById");
            formData.append("package_id", packageId);
            const API_URL = process.env.REACT_APP_API_URL;

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

    useEffect(() => {
        const initializePage = async () => {
            setLoading(true);
            setError("");

            try {
                const packageId = localStorage.getItem("selectedPackageId");
                const storedUser = localStorage.getItem("user");

                if (!storedUser) {
                    logOut();
                    return;
                }

                const userData = JSON.parse(storedUser);
                setUser(userData);

                if (!packageId) {
                    navigate("/upgrade-package");
                    return;
                }

                await getPackageById(packageId);
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
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleDropdown = () => setDropdownOpen((prev) => !prev);

    const navigationHandlers = {
        home: () => navigate("/eventsDashboard"),
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

  

    const recordPayment = async (paymentData) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();

            formData.append("function", "recordPayment");
            formData.append("user_id", user?.user_id);
            formData.append("user_name", user?.name);
            formData.append("package_id", selectedPackage?.package_id);
            formData.append("package_name", selectedPackage?.package_type);
            formData.append("amount", paymentDetails?.totalAmount);
            formData.append("payment_method", selectedPaymentMethod);
            formData.append("payment_status", "completed");
            

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            // Check if the response is empty or invalid JSON
            const text = await response.text();
            console.log("Raw response text (recordPayment):", text);
            if (!text.trim()) {
                console.error("Empty response from server (recordPayment)");
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

            console.log("✅ Payment recorded successfully:", result);
            return true;

        } catch (error) {
            console.error("Error recording payment:", error);
            return false;
        }
    };


    const updateUserPackage = async () => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "updateUserPackage");
            formData.append("user_id", user?.user_id);
            formData.append("package_id", selectedPackage?.package_id);
            formData.append("events_limit", selectedPackage?.max_events);

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Network response was not ok");

            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error("Error updating package:", error);
            return false;
        }
    };

    const processPayment = async (paymentData) => {
        setProcessingPayment(true);
        setError("");

        try {
            await new Promise(resolve => setTimeout(resolve, 2000));

            const paymentSuccess = await recordPayment(paymentData);

            if (paymentSuccess) {
                const updateSuccess = await updateUserPackage();

                if (updateSuccess) {
                    localStorage.removeItem("selectedPackageId");
                    alert("Payment successful! Your package has been upgraded.");
                    navigate("/manage_my_event");
                } else {
                    throw new Error("Failed to update user package");
                }
            } else {
                throw new Error("Payment recording failed");
            }
        } catch (error) {
            console.error("Payment processing error:", error);
            setError("An error occurred during payment processing. Please try again.");
            alert("Payment failed. Please try again.");
        } finally {
            setProcessingPayment(false);
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

        const handleSubmit = async (e) => {
            e.preventDefault();
            setLoading(true);

            // Simulate payment processing delay (like a real gateway)
            setTimeout(() => {
                setLoading(false);
                // Instead of redirecting to PayPal, just call onSubmit()
                onSubmit({
                    paymentMethod: "paypal",
                    provider: "PayPal",
                    status: "completed"
                });
            }, 2500); // 2.5 seconds delay
        };

        return (
            <div className="paypal-container">
                <div className="paypal-header">
                    <i className="bi bi-paypal"></i>
                    <h4>Pay with PayPal</h4>
                </div>
                <p className="payment-info">
                    Simulating PayPal payment processing for demo purposes.
                </p>
                <div className="paypal-amount">
                    <strong>Amount: R{paymentDetails?.totalAmount?.toFixed(2) || '0.00'}</strong>
                </div>
                <button
                    onClick={handleSubmit}
                    className="submit-payment-btn paypal-btn"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <div className="spinner-border spinner-border-sm" role="status"></div>
                            &nbsp;Processing Payment...
                        </>
                    ) : (
                        "Confirm Payment"
                    )}
                </button>
            </div>
        );
    };

    const StripeForm = ({ onSubmit }) => {
        const [loading, setLoading] = useState(false);

        const handleSubmit = (e) => {
            e.preventDefault();
            setLoading(true);

            setTimeout(() => {
                setLoading(false);
                onSubmit({
                    paymentMethod: "stripe",
                    provider: "Stripe",
                    status: "completed"
                });
            }, 2500);
        };

        return (
            <div className="stripe-container">
                <div className="stripe-header">
                    <i className="bi bi-credit-card"></i>
                    <h4>Pay with Stripe</h4>
                </div>
                <p className="payment-info">
                    Secure Stripe-style payment simulation for demonstration only.
                </p>
                <button
                    onClick={handleSubmit}
                    className="submit-payment-btn stripe-btn"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <div className="spinner-border spinner-border-sm" role="status"></div>
                            &nbsp;Processing Securely...
                        </>
                    ) : (
                        `Pay R${paymentDetails?.totalAmount?.toFixed(2) || "0.00"}`
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
            {/* Header and sidebar remain the same */}
            <div className="dashboard-header">
                <h1>evenda</h1>
                <div className="header-tabs">
                    <div
                        ref={dropdownRef}
                        className={`profile-container ${dropdownOpen ? "open" : ""}`}
                        onClick={toggleDropdown}
                    >
                        <i className="bi bi-person-circle"></i>
                        <span>{user ? user.name : "Guest"}</span>
                        <i className="bi bi-chevron-bar-down"></i>

                        {dropdownOpen && (
                            <div className="dropdown-menu show">
                                <button className="dropdown-item">
                                    <i className="bi bi-person"></i>Profile
                                </button>
                                <button className="dropdown-item">
                                    <i className="bi bi-gear"></i>Settings
                                </button>
                                <button className="dropdown-item" onClick={logOut}>
                                    <i className="bi bi-box-arrow-right"></i>Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="dashboard-sidebar">
                <h3>DASHBOARD</h3>
                <ul>
                    <li onClick={navigationHandlers.home}>Home</li>
                    <li onClick={navigationHandlers.eventManagement}>Overview</li>
                    <li onClick={navigationHandlers.manage} className="active">Publish</li>
                    <li onClick={navigationHandlers.invitations}>Invitations</li>
                    <li>Preview</li>
                </ul>
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
                                <p><strong>Package:</strong> {selectedPackage.package_type}</p>
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

export default PackagePayment;