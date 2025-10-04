import React, { useState, useEffect, useRef } from "react";
import "./main.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import { logOut } from "../components";

const PackagePayment = () => {
    const dropdownRef = useRef(null);
    const [user, setUser] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [event_id, setEventId] = useState("");
    const [eventStatus, setEventStatus] = useState("");
    const [selectedPackage, setSelectedPackage] = useState([]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
    const [showPaymentPopup, setShowPaymentPopup] = useState(false);
    const [loading, setLoading] = useState(true);

    const vatRate = 0.15;

    useEffect(() => {
        const initializePage = async () => {
            setLoading(true);

            const id = searchParams.get("event_id");
            const packageId = searchParams.get("package_id");
            const userId = searchParams.get("user_id");

            if (!userId) {
                setLoading(false);
                alert("User ID not found");
                navigate("/");
                return;
            }

            if (!id) {
                setLoading(false);
                alert("Event ID not found");
                navigate("/eventsDashboard");
                return;
            }

            setEventId(id);

            if (!packageId) {
                setLoading(false);
                alert("Package ID not found ");
                navigate("/eventsDashboard");
                return;
            }

            try {
                await fetchEventStatusByID(id);
                await getPackageById(packageId);
            } catch (error) {
                console.error("Failed to fetch event status:", error);
                setLoading(false);
                navigate("/eventsDashboard");
                return;
            }

            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                const userData = JSON.parse(storedUser);
                setUser(userData);
            } else {
                console.error("User not found in localStorage");
                setLoading(false);
                navigate("/eventsDashboard");
                return;
            }



            setLoading(false);
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
            console.log(data);
            if (data.success && data.package) {
                setSelectedPackage({
                    ...data.package,
                    price: Number(data.package.price) || 0
                });
            }
        } catch (err) {
            console.error("Failed to fetch package:", err);
            setSelectedPackage(null);
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

    const calculatePaymentDetails = () => {
        if (!selectedPackage) return null;

        const basePrice = selectedPackage.price || 0;
        const vatAmount = basePrice * vatRate;
        const serviceFee = basePrice > 0 ? 5.0 : 0;
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


        setShowPaymentPopup(false);
        if (updateUserPackage()) {
           navigate(`/manage_my_event?event_id=${event_id}`);

       }

    };

    const closePopup = () => {
        setShowPaymentPopup(false);
        setSelectedPaymentMethod("");
    };

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

    const updateUserPackage = async () => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "updateUserPackage");
            formData.append("user_id", user?.user_id); 
            formData.append("package_id", selectedPackage?.package_id);
            formData.append("events_limit", selectedPackage?.max_events);

            console.log("Submitting package update:", {
                user_id: user?.user_id,
                package_id: selectedPackage?.package_id,
                events_limit: selectedPackage?.max_events
            });
            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Network response was not ok");
            const results = await response.json();
            console.log(results);
            if (results.success) {
                alert("Package updated successfully after EFT!");
            } else {
                alert("Failed to update package.");
            }
        } catch (err) {
            console.error("Error updating package:", err);
            alert("Error updating package. Please try again.");
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
                    <div className="loading-spinner"></div>
                    <p>Package not found. Please select a valid package.</p>
                    <button onClick={handleBack} className="btn-event btn-event-back">
                        Back to Packages
                    </button>
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
                            <p>Max Guests: {selectedPackage.max_guests}</p>
                            <p>Max Events: {selectedPackage.max_events}</p>
                        </div>

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