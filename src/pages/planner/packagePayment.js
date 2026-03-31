import React, { useState, useEffect, useRef, useCallback } from "react";
import "./main.css"; // Verify this path is correct
import "../../alert.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import { logOut } from "../components"; 
import crypto from "crypto-js";

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
    const [paymentProof, setPaymentProof] = useState(null);
    const [showProofOptions, setShowProofOptions] = useState(false);
    const [transactionId, setTransactionId] = useState("");

    const vatRate = 0.15;
    const [alert, setAlert] = useState({ show: false, message: "", type: "" });

    // Get current tunnel URL for local testing
    const getCurrentBaseUrl = () => {
 
        if (process.env.NODE_ENV === 'development') {
          
         //   const ngrokUrl = localStorage.getItem('') || window.location.origin;
              return 'https://b578-102-253-67-0.ngrok-free.app';
        }
        return window.location.origin;
    };

    // ============ PAYFAST CONFIGURATION ============
    const PAYFAST_CONFIG = {
        MERCHANT_ID: "10046113",//33426571
        MERCHANT_KEY: "0kdmnse8055gx",//lkqoiy0ftb9yc
        PASS_PHRASE: "", // Add if you have one in PayFast settings
        
        // For local testing, update this to your ngrok URL
ITN_URL: "https://c84f-102-253-67-0.ngrok-free.app/eventa/src/pages/php/payFastInt.php",    
        // Use sandbox for testing
        PAYFAST_URL: process.env.NODE_ENV === 'production' 
            ? "https://www.payfast.co.za/eng/process"
            : "https://sandbox.payfast.co.za/eng/process",
        
         RETURN_URL: "https://b578-102-253-67-0.ngrok-free.app/paymentSuccess",
    CANCEL_URL: "https://b578-102-253-67-0.ngrok-free.app/paymentCancel",
        
        EMAIL_CONFIRMATION: true,
        CONFIRMATION_EMAIL: "",
        PAYMENT_METHOD: "cc",
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
        const serviceFee = basePrice > 0 ? 5.0 : 0;
        const totalAmount = basePrice + vatAmount + serviceFee;

        return {
            basePrice,
            vatAmount,
            serviceFee,
            totalAmount: totalAmount.toFixed(2)
        };
    }, [selectedPackage]);

    const paymentDetails = calculatePaymentDetails();

    // ============ HELPER FUNCTIONS ============
    const fetchWithTimeout = async (url, options = {}, timeout = 10000) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    };

    // ============ EMAIL FUNCTIONS ============
    const sendPaymentReceiptEmail = async (email, name, transactionId, amount, packageName) => {
        try {
            const formDataToSend = new FormData();
            formDataToSend.append("function", "sendPaymentReceipt");
            formDataToSend.append("email", email);
            formDataToSend.append("name", name);
            formDataToSend.append("transaction_id", transactionId);
            formDataToSend.append("amount", amount);
            formDataToSend.append("package_name", packageName);
            formDataToSend.append("payment_date", new Date().toISOString());
            formDataToSend.append("API_URL", API_URL);
            formDataToSend.append("user_email", email);

            const url = `${API_URL}/query.php`;
            console.log("Sending payment receipt request to:", url);

            const response = await fetchWithTimeout(url, {
                method: "POST",
                body: formDataToSend
            }, 15000);

            const result = await response.json();
            return result;
        } catch (error) {
            console.error("Error sending payment receipt email:", error);
            return { success: false, message: "Failed to send payment receipt email" };
        }
    };

    // ============ PAYFAST FUNCTIONS ============
    const generateTransactionId = () => {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `PF-${timestamp}-${random}`;
    };

   const generatePayFastSignature = (data) => {
    let pfOutput = "";
    Object.keys(data)
        .sort()
        .forEach(key => {
            // Skip empty values and signature field
            if (data[key] !== "" && key !== 'signature') {
                // Convert value to string if it's not already
                let value = data[key];
                
                // Handle different data types
                if (value === null || value === undefined) {
                    value = "";
                } else if (typeof value === 'object') {
                    value = JSON.stringify(value);
                } else {
                    value = String(value);
                }
                
                // Only apply trim if value is a string and not empty
                const trimmedValue = value.trim ? value.trim() : value;
                
                if (trimmedValue !== "") {
                    pfOutput += `${key}=${encodeURIComponent(trimmedValue).replace(/%20/g, '+')}&`;
                }
            }
        });
    
    // Remove last &
    pfOutput = pfOutput.slice(0, -1);
    
    // Add passphrase if exists
    if (PAYFAST_CONFIG.PASS_PHRASE) {
        pfOutput += `&passphrase=${encodeURIComponent(PAYFAST_CONFIG.PASS_PHRASE).replace(/%20/g, '+')}`;
    }
    
    return crypto.MD5(pfOutput).toString();
};

   const preparePayFastData = () => {
    const mPaymentId = generateTransactionId();
    setTransactionId(mPaymentId);
    
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    
    const paymentData = {
        merchant_id: String(PAYFAST_CONFIG.MERCHANT_ID),
        merchant_key: String(PAYFAST_CONFIG.MERCHANT_KEY),
        return_url: String(PAYFAST_CONFIG.RETURN_URL),
        cancel_url: String(PAYFAST_CONFIG.CANCEL_URL),
        notify_url: String(PAYFAST_CONFIG.ITN_URL),
        
        name_first: String(userData?.name?.split(' ')[0] || user?.name?.split(' ')[0] || ''),
        name_last: String(userData?.name?.split(' ').slice(1).join(' ') || user?.name?.split(' ').slice(1).join(' ') || ''),
        email_address: String(userData?.email || user?.email || ''),
        cell_number: String(userData?.phone || user?.phone || ''),
        
        m_payment_id: String(mPaymentId),
        amount: String(paymentDetails?.totalAmount || "0.00"),
        item_name: String(`${selectedPackage?.package_type} Package - Evenda`),
        item_description: String(`Max Events: ${selectedPackage?.max_events}, Max Guests: ${selectedPackage?.max_guests}`),
        
        custom_str1: String(userData?.user_id || user?.user_id || ''),
        custom_str2: String(selectedPackage?.package_id || ''),
        custom_str3: String(selectedPackage?.package_type || ''),
        custom_str4: 'PayFast',
        custom_int1: String(parseInt(selectedPackage?.max_events) || 0),
        custom_int2: String(parseInt(selectedPackage?.max_guests) || 0),
        
        payment_method: String(PAYFAST_CONFIG.PAYMENT_METHOD),
        email_confirmation: PAYFAST_CONFIG.EMAIL_CONFIRMATION ? "1" : "0", // Convert to string
    };

    // Add confirmation email if exists
    if (userData?.email || user?.email) {
        paymentData.confirmation_address = String(userData?.email || user?.email);
    }

    paymentData.signature = generatePayFastSignature(paymentData);
    
    console.log("PayFast Data prepared:", {
        ...paymentData,
        signature: "***HIDDEN***"
    });
    
    return paymentData;
};

    // ============ PAYMENT FUNCTIONS ============
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

    const recordPayment = async (paymentInfo = {}) => {
        try {
            const formData = new FormData();

            formData.append("function", "recordPayment");
            formData.append("user_id", user?.user_id);
            formData.append("user_name", user?.name || "");
            formData.append("package_id", selectedPackage?.package_id);
            formData.append("package_name", selectedPackage?.package_type || "");
            formData.append("amount", paymentDetails?.totalAmount || "0.00");
            formData.append("payment_method", paymentInfo.payment_method || selectedPaymentMethod);
            formData.append("payment_status", paymentInfo.payment_status || "pending");
            
            if (transactionId || paymentInfo.transaction_id) {
                formData.append("transaction_id", paymentInfo.transaction_id || transactionId);
            }

            console.log("Recording payment with data:", {
                user_id: user?.user_id,
                package_id: selectedPackage?.package_id,
                amount: paymentDetails?.totalAmount,
                payment_method: paymentInfo.payment_method || selectedPaymentMethod,
                payment_status: paymentInfo.payment_status || "pending"
            });

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            const text = await response.text();
            if (!text.trim()) {
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
                throw new Error(result.message || "Payment not recorded");
            }

            console.log("✅ Payment recorded successfully:", result);
            
            if (paymentInfo.payment_status === 'completed' || result.payment_id) {
                generatePaymentProof(result.payment_id || transactionId);
                setShowProofOptions(true);
            }
            
            return true;

        } catch (error) {
            console.error("Error recording payment:", error);
            printAlert("Failed to record payment: " + error.message, "error");
            return false;
        }
    };

   const initiatePayFastPayment = async () => {
    setProcessingPayment(true);
    setPaymentStarted(true);
    
    try {
        const paymentData = preparePayFastData();

        localStorage.setItem("lastTransactionId", paymentData.m_payment_id);
        
        // Record initial payment with pending status
        const paymentRecorded = await recordPayment({
            payment_method: 'payfast',
            payment_status: 'pending',
            transaction_id: paymentData.m_payment_id
            // DO NOT send pf_payment_id here - it doesn't exist yet
        });

        if (!paymentRecorded) {
            throw new Error("Failed to record payment");
        }

        // Create and submit the form to PayFast
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = PAYFAST_CONFIG.PAYFAST_URL;
        form.target = '_blank';
        form.style.display = 'none';
        
        Object.keys(paymentData).forEach(key => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = paymentData[key];
            form.appendChild(input);
        });
        
        document.body.appendChild(form);
        console.log("Submitting to PayFast:", PAYFAST_CONFIG.PAYFAST_URL);
        form.submit();
        
        setTimeout(() => {
            setShowPaymentPopup(false);
            setProcessingPayment(false);
        }, 1000);
        
    } catch (error) {
        console.error("PayFast payment error:", error);
        setError("Failed to initiate payment. Please try again.");
        printAlert("Payment initiation failed. Please try again.", "error");
        setProcessingPayment(false);
        setPaymentStarted(false);
    }
};

    const generatePaymentProof = (paymentId) => {
        const proof = {
            transactionId: paymentId || transactionId || `EVENDA-${Date.now()}`,
            date: new Date().toISOString(),
            merchant: "Evenda Events",
            customer: user?.name || "",
            email: user?.email || "",
            package: selectedPackage?.package_type || "",
            amount: paymentDetails?.totalAmount || "0.00",
            vat: paymentDetails?.vatAmount?.toFixed(2) || "0.00",
            serviceFee: paymentDetails?.serviceFee?.toFixed(2) || "0.00",
            total: paymentDetails?.totalAmount || "0.00",
            status: "Completed",
            reference: `EVENDA-${Date.now()}`,
            terms: "Thank you for your payment. This is your proof of payment."
        };
        
        setPaymentProof(proof);
        return proof;
    };

    const downloadPaymentProof = () => {
        if (!paymentProof) return;
        
        const proofText = `
        =====================================
                  PAYMENT RECEIPT
        =====================================
        Transaction ID: ${paymentProof.transactionId}
        Date: ${new Date(paymentProof.date).toLocaleString()}
        
        Merchant: ${paymentProof.merchant}
        
        Customer Details:
        Name: ${paymentProof.customer}
        Email: ${paymentProof.email}
        
        Package Details:
        Package: ${paymentProof.package}
        
        Payment Breakdown:
        Package Cost: R ${(parseFloat(paymentProof.amount) - parseFloat(paymentProof.vat) - parseFloat(paymentProof.serviceFee)).toFixed(2)}
        VAT (15%): R ${paymentProof.vat}
        Service Fee: R ${paymentProof.serviceFee}
        -------------------------------------
        TOTAL: R ${paymentProof.total}
        
        Payment Status: ${paymentProof.status}
        Reference: ${paymentProof.reference}
        
        ${paymentProof.terms}
        =====================================
        Generated by Evenda Event Management
        =====================================
        `;
        
        const blob = new Blob([proofText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Evenda-Payment-${paymentProof.transactionId}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        printAlert("Payment proof downloaded successfully!", "success");
    };

    const handleSendEmailReceipt = async () => {
        if (!paymentProof || !user?.email) {
            printAlert("Unable to send email. Missing payment proof or email address.", "error");
            return;
        }
        
        try {
            setProcessingPayment(true);
            
            const result = await sendPaymentReceiptEmail(
                user.email,
                user.name,
                paymentProof.transactionId,
                paymentProof.total,
                selectedPackage.package_type
            );
            
            if (result.success) {
                printAlert("Payment receipt sent to your email!", "success");
            } else {
                throw new Error(result.message || "Failed to send email");
            }
            
        } catch (error) {
            console.error("Email sending error:", error);
            printAlert("Failed to send email receipt. You can download the proof instead.", "error");
        } finally {
            setProcessingPayment(false);
        }
    };

    const processPayment = async (paymentData) => {
        if (processingPayment || paymentStarted) {
            console.log("Payment already in progress");
            return;
        }

        setPaymentStarted(true);
        setProcessingPayment(true);
        setError("");

        try {
            if (selectedPaymentMethod === 'payfast') {
                await initiatePayFastPayment();
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));

            const paymentSuccess = await recordPayment({
                ...paymentData,
                payment_status: "completed"
            });

            if (paymentSuccess) {
                printAlert("Payment successful! Your package has been upgraded.", "success");
                
                if (selectedPaymentMethod !== 'payfast') {
                    setTimeout(() => {
                        localStorage.removeItem("selectedPackageId");
                        handleBack();
                    }, 2000);
                }
            } else {
                throw new Error("Payment recording failed");
            }
        } catch (error) {
            console.error("Payment processing error:", error);
            setError("An error occurred during payment processing. Please try again.");
            printAlert("Payment failed. Please try again.", "error");
        } finally {
            if (selectedPaymentMethod !== 'payfast') {
                setProcessingPayment(false);
                setPaymentStarted(false);
                setShowPaymentPopup(false);
            }
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
                <div className="payfast-test-info">
                    <small className="text-muted">
                        Test Mode: Use card 4111111111111111, any expiry, CVV 123
                    </small>
                </div>
            </div>
        );
    };

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
                        `Pay Securely R${paymentDetails?.totalAmount || "0.00"}`
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
                    <strong>Amount: R{paymentDetails?.totalAmount || "0.00"}</strong>
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
        const [loading, setLoading] = useState(false);

        const handleSubmit = (e) => {
            e.preventDefault();
            setLoading(true);
            
            setTimeout(() => {
                setLoading(false);
                onSubmit({
                    paymentMethod: 'stripe',
                    provider: 'Stripe',
                    status: 'completed'
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
                    {loading ? (
                        <>
                            <div className="spinner-border spinner-border-sm" role="status"></div>
                            Processing with Stripe...
                        </>
                    ) : (
                        `Pay R${paymentDetails?.totalAmount || '0.00'} with Stripe`
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
            case 'payfast':
                return <PayFastForm onSubmit={processPayment} />;
            default:
                return null;
        }
    };

    const PaymentProofModal = () => (
        <div className="proof-modal-overlay">
            <div className="proof-modal">
                <button className="close-modal" onClick={() => setShowProofOptions(false)}>×</button>
                <h3>Payment Successful! 🎉</h3>
                <p>Your payment of <strong>R{paymentDetails?.totalAmount}</strong> has been processed successfully.</p>
                
                {paymentProof && (
                    <div className="proof-details">
                        <p><strong>Transaction ID:</strong> {paymentProof.transactionId}</p>
                        <p><strong>Reference:</strong> {paymentProof.reference}</p>
                        <p><strong>Date:</strong> {new Date(paymentProof.date).toLocaleString()}</p>
                    </div>
                )}
                
                <div className="proof-actions">
                    <button 
                        className="btn-event" 
                        onClick={downloadPaymentProof}
                        disabled={processingPayment}
                    >
                        <i className="bi bi-download"></i> Download Proof
                    </button>
                    <button 
                        className="btn-event btn-event-success" 
                        onClick={handleSendEmailReceipt}
                        disabled={processingPayment}
                    >
                        <i className="bi bi-envelope"></i> Email Receipt
                    </button>
                    <button 
                        className="btn-event btn-event-secondary" 
                        onClick={() => {
                            setShowProofOptions(false);
                            localStorage.removeItem("selectedPackageId");
                            handleBack();
                        }}
                    >
                        <i className="bi bi-check-circle"></i> Continue
                    </button>
                </div>
            </div>
        </div>
    );

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
                
                // Log current configuration for debugging
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
                    <i className={`fas ${
                        alert.type === "error" ? "fa-times-circle" :
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

                {showProofOptions && paymentProof && (
                    <PaymentProofModal />
                )}
            </div>
        </div>
    );
};

export default PackagePayment;