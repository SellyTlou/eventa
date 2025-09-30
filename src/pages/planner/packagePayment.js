import React, { useState, useEffect, useRef } from "react";
import "./main.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import { logOut } from "../components";
import { packages } from "./packages"; // Import the packages

const PackagePayment = () => {
    const dropdownRef = useRef(null);
    const [user, setUser] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [event_id, setEventId] = useState("");
    const [eventStatus, setEventStatus] = useState("");
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
    const [showPaymentPopup, setShowPaymentPopup] = useState(false);
    const [loading, setLoading] = useState(true);

    const vatRate = 0.15; // 15% VAT

    useEffect(() => {
        const initializePage = async () => {
            setLoading(true);

            // Get parameters from URL
            const id = searchParams.get("event_id");
            const packageId = searchParams.get("package_id");
            const userId = searchParams.get("user_id");

            console.log("URL Parameters:", { id, packageId, userId });

            if (id) {
                setEventId(id);
                await fetchEventStatusByID(id);
            }

            // Get user from localStorage
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                const userData = JSON.parse(storedUser);
                setUser(userData);
                console.log("User found:", userData);
            }

            // Get package details
            if (packageId) {
                // Find package by ID in the imported packages object
                const packageKey = Object.keys(packages).find(key =>
                    packages[key].id === packageId
                );

                if (packageKey && packages[packageKey]) {
                    setSelectedPackage(packages[packageKey]);
                    console.log("Package found:", packages[packageKey]);
                } else {
                    console.error("Package not found for ID:", packageId);
                    // Fallback to first available package
                    const firstPackage = Object.values(packages)[0];
                    setSelectedPackage(firstPackage);
                }
            } else {
                // If no package_id provided, use Free package as default
                setSelectedPackage(packages.Free);
            }

            setLoading(false);
        };

        initializePage();
    }, [searchParams]);

    useEffect(() => {
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
            const API_URL = process.env.REACT_APP_API_URL;

            const response = await fetch(`${API_URL}/query.php`,
                { method: "POST", body: formData }
            );
            if (!response.ok) throw new Error("Network response was not ok");
            const data = await response.json();
            if (data.success && data.status) {
                if (data.status.published === "0") {
                    setEventStatus("Unpublished");
                } else if (data.status.published === "1") {
                    setEventStatus("Published");
                } else {
                    setEventStatus("Unknown");
                }
            } else {
                setEventStatus("Unknown");
            }
        } catch (err) {
            console.error("Failed to fetch event status:", err);
            setEventStatus("Unknown");
        }
    };

    const toggleDropdown = () => setDropdownOpen((prev) => !prev);

    const goToHome = () => navigate("/eventsDashboard");
    const goToEventManagement = () =>
        navigate(`/eventManagement?event_id=${event_id}`);
    const goToInvitations = () =>
        navigate(`/invitationPage?event_id=${event_id}`);
    const goToManage = () => navigate(`/manage_my_event?event_id=${event_id}`);

    const handleBack = () => {
        navigate(-1);
    };

    // Calculate payment details
    const calculatePaymentDetails = () => {
        if (!selectedPackage) return null;

        const basePrice = selectedPackage.price || 0;
        const vatAmount = basePrice * vatRate;
        const serviceFee = basePrice > 0 ? 5.0 : 0; // Only charge service fee for paid packages
        const totalAmount = basePrice + vatAmount + serviceFee;

        return {
            basePrice,
            vatAmount,
            serviceFee,
            totalAmount
        };
    };

    const paymentDetails = calculatePaymentDetails();

    const handlePaymentMethodSelect = (method) => {
        setSelectedPaymentMethod(method);
        setShowPaymentPopup(true);
    };

    const handlePaymentSubmit = (paymentData) => {
        // Here you would typically send the payment data to your backend
        console.log("Payment submitted:", {
            package: selectedPackage,
            method: selectedPaymentMethod,
            paymentData,
            user: user,
            event_id: event_id
        });

        // Simulate payment processing
        alert(`Payment processed successfully for ${selectedPackage.name} package!`);
        setShowPaymentPopup(false);

        // Redirect to success page or back to event management
        navigate(`/eventManagement?event_id=${event_id}`);
    };

    const closePopup = () => {
        setShowPaymentPopup(false);
        setSelectedPaymentMethod("");
    };

    // Credit Card Form Component
    const CreditCardForm = ({ onSubmit }) => {
        const [cardData, setCardData] = useState({
            cardNumber: "",
            expiryDate: "",
            cvv: "",
            cardholderName: ""
        });

        const handleSubmit = (e) => {
            e.preventDefault();
            onSubmit(cardData);
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
                        onChange={(e) => setCardData({ ...cardData, cardNumber: e.target.value })}
                        placeholder="1234 5678 9012 3456"
                        maxLength="19"
                        required
                    />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Expiry Date</label>
                        <input
                            type="text"
                            value={cardData.expiryDate}
                            onChange={(e) => setCardData({ ...cardData, expiryDate: e.target.value })}
                            placeholder="MM/YY"
                            maxLength="5"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>CVV</label>
                        <input
                            type="text"
                            value={cardData.cvv}
                            onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                            placeholder="123"
                            maxLength="3"
                            required
                        />
                    </div>
                </div>
                <button type="submit" className="submit-payment-btn">Pay Now</button>
            </form>
        );
    };

    // PayPal Form Component
    const PayPalForm = ({ onSubmit }) => {
        const [email, setEmail] = useState("");

        const handleSubmit = (e) => {
            e.preventDefault();
            onSubmit({ email });
        };

        return (
            <form onSubmit={handleSubmit} className="payment-form">
                <div className="form-group">
                    <label>PayPal Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                    />
                </div>
                <p className="payment-info">You will be redirected to PayPal to complete your payment.</p>
                <button type="submit" className="submit-payment-btn">Continue to PayPal</button>
            </form>
        );
    };

    // Bank Transfer Form Component
    const BankTransferForm = ({ onSubmit }) => {
        const handleSubmit = (e) => {
            e.preventDefault();
            onSubmit({});
        };

        return (
            <div className="bank-transfer-info">
                <h4>Bank Transfer Instructions</h4>
                <div className="bank-details">
                    <p><strong>Bank Name:</strong> evenda Bank</p>
                    <p><strong>Account Holder:</strong> evenda Pty Ltd</p>
                    <p><strong>Account Number:</strong> 1234 5678 9012</p>
                    <p><strong>Branch Code:</strong> 123456</p>
                    <p><strong>Reference:</strong> {user?.name} - {selectedPackage?.name}</p>
                    <p><strong>Amount:</strong> R{paymentDetails?.totalAmount?.toFixed(2)}</p>
                </div>
                <p className="payment-info">
                    Please use the reference above when making the transfer.
                    Your package will be activated once payment is confirmed (2-3 business days).
                </p>
                <button onClick={handleSubmit} className="submit-payment-btn">
                    I've Made the Transfer
                </button>
            </div>
        );
    };

    // EFT Form Component (Common in South Africa)
    const EFTForm = ({ onSubmit }) => {
        const handleSubmit = (e) => {
            e.preventDefault();
            onSubmit({});
        };

        return (
            <div className="eft-info">
                <h4>EFT Payment Instructions</h4>
                <div className="bank-details">
                    <p><strong>Bank:</strong> Standard Bank</p>
                    <p><strong>Account Name:</strong> Evenda Solutions</p>
                    <p><strong>Account Number:</strong> 9876 5432 1098</p>
                    <p><strong>Branch Code:</strong> 051001</p>
                    <p><strong>Reference:</strong> {user?.id}-{selectedPackage?.id}</p>
                    <p><strong>Amount:</strong> R{paymentDetails?.totalAmount?.toFixed(2)}</p>
                </div>
                <p className="payment-info">
                    Make an EFT payment using the details above. Payment confirmation is usually instant.
                </p>
                <button onClick={handleSubmit} className="submit-payment-btn">
                    Confirm EFT Payment
                </button>
            </div>
        );
    };

    // Render appropriate payment form based on selection
    const renderPaymentForm = () => {
        switch (selectedPaymentMethod) {
            case 'credit-card':
                return <CreditCardForm onSubmit={handlePaymentSubmit} />;
            case 'paypal':
                return <PayPalForm onSubmit={handlePaymentSubmit} />;
            case 'bank-transfer':
                return <BankTransferForm onSubmit={handlePaymentSubmit} />;
            case 'eft':
                return <EFTForm onSubmit={handlePaymentSubmit} />;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="dashboard-container">
                <div className="packagePayment-content container">
                    <div className="loading-message">
                        <p>Loading package details...</p>
                        <button onClick={handleBack} className="btn-event btn-event-back">
                            Back to Packages
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!selectedPackage) {
        return (
            <div className="dashboard-container">
                <div className="packagePayment-content container">
                    <div className="error-message">
                        <p>Package not found. Please select a valid package.</p>
                        <button onClick={handleBack} className="btn-event btn-event-back">
                            Back to Packages
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>evenda</h1>
                <div className="header-tabs">
                    <button className={`status-btn ${eventStatus === "Published" ? "status-success" : "status-failed"}`}>
                        {eventStatus}
                    </button>

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
                    <li onClick={goToHome}>Home</li>
                    <li onClick={goToEventManagement}>Overview</li>
                    <li onClick={goToManage} className="active">Publish</li>
                    <li onClick={goToInvitations}>Invitations</li>
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

                <div className="payymentForm">
                    <div className="paymentInfo">
                        <h3 className="packageName">{selectedPackage.name} Plan</h3>
                        <div className="package-features">
                            <p>Max Guests: {selectedPackage.maxGuest}</p>
                            <p>Max Events: {selectedPackage.maxEvents}</p>
                        </div>

                        <div className="item">
                            <p className="planCost">Plan Cost</p>
                            <span className="costAmount">R{selectedPackage.price.toFixed(2)}</span>
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

                    <h3 className="paymentTitle">Payment Method</h3>

                    <div className="payment-method">
                        <button
                            className={`paymentOption ${selectedPaymentMethod === 'credit-card' ? 'active' : ''}`}
                            onClick={() => handlePaymentMethodSelect('credit-card')}
                        >
                            <i className="bi bi-credit-card-2-front"></i>Credit/Debit Card
                        </button>
                        <button
                            className={`paymentOption ${selectedPaymentMethod === 'paypal' ? 'active' : ''}`}
                            onClick={() => handlePaymentMethodSelect('paypal')}
                        >
                            <i className="bi bi-paypal"></i>PayPal
                        </button>
                        <button
                            className={`paymentOption ${selectedPaymentMethod === 'bank-transfer' ? 'active' : ''}`}
                            onClick={() => handlePaymentMethodSelect('bank-transfer')}
                        >
                            <i className="bi bi-bank"></i>Bank Transfer
                        </button>
                        <button
                            className={`paymentOption ${selectedPaymentMethod === 'eft' ? 'active' : ''}`}
                            onClick={() => handlePaymentMethodSelect('eft')}
                        >
                            <i className="bi bi-arrow-left-right"></i>EFT
                        </button>
                    </div>
                </div>

                {/* Payment Method Popup */}
                {showPaymentPopup && (
                    <div className="payment-popup-overlay">
                        <div className="payment-popup">
                            <button className="close-popup" onClick={closePopup}>×</button>
                            <h3>Complete Payment - {selectedPaymentMethod.replace('-', ' ').toUpperCase()}</h3>
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

export default PackagePayment;