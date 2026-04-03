import React, { useState, useEffect, useRef, useCallback } from "react";
import "../planner/main.css";
import "../../alert.css";
import { useNavigate } from "react-router-dom";
import { LoginNav, Footer } from "../components";
import crypto from "crypto-js";

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
    const [paymentProof, setPaymentProof] = useState(null);
    const [showProofOptions, setShowProofOptions] = useState(false);
    const [transactionId, setTransactionId] = useState("");

    const vatRate = 0.15;
    const [alert, setAlert] = useState({ show: false, message: "", type: "" });

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';

    // ============ PAYFAST CONFIGURATION for LIVE ============
    const PAYFAST_CONFIG = {
        MERCHANT_ID: "33426571",
        MERCHANT_KEY: "lkqoiy0ftb9yc",
        PASS_PHRASE: "",
        
        ITN_URL: "https://evenditest.evendi.co.za/src/pages/php/payFastIntBusiness.php",
        PAYFAST_URL: "https://www.payfast.co.za/eng/process",
        
        RETURN_URL: "https://evenditest.evendi.co.za/business-payment-success",
        CANCEL_URL: "https://evenditest.evendi.co.za/business-payment-cancel",
        
        EMAIL_CONFIRMATION: true,
        PAYMENT_METHOD: "",
    };

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
            formDataToSend.append("API_URL", API_BASE_URL);
            formDataToSend.append("user_email", email);

            const url = `${API_BASE_URL}/query.php`;
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
        return `BP-${timestamp}-${random}`;
    };

    const generatePayFastSignature = (data) => {
        let pfOutput = "";
        Object.keys(data)
            .sort()
            .forEach(key => {
                if (data[key] !== "" && key !== 'signature') {
                    let value = data[key];
                    
                    if (value === null || value === undefined) {
                        value = "";
                    } else if (typeof value === 'object') {
                        value = JSON.stringify(value);
                    } else {
                        value = String(value);
                    }
                    
                    const trimmedValue = value.trim ? value.trim() : value;
                    
                    if (trimmedValue !== "") {
                        pfOutput += `${key}=${encodeURIComponent(trimmedValue).replace(/%20/g, '+')}&`;
                    }
                }
            });
        
        pfOutput = pfOutput.slice(0, -1);
        
        if (PAYFAST_CONFIG.PASS_PHRASE) {
            pfOutput += `&passphrase=${encodeURIComponent(PAYFAST_CONFIG.PASS_PHRASE).replace(/%20/g, '+')}`;
        }
        
        return crypto.MD5(pfOutput).toString();
    };

    const preparePayFastData = () => {
        const mPaymentId = generateTransactionId();
        setTransactionId(mPaymentId);
        
        const userData = user || JSON.parse(localStorage.getItem("user") || "{}");
        
        const paymentData = {
            merchant_id: String(PAYFAST_CONFIG.MERCHANT_ID),
            merchant_key: String(PAYFAST_CONFIG.MERCHANT_KEY),
            return_url: String(PAYFAST_CONFIG.RETURN_URL),
            cancel_url: String(PAYFAST_CONFIG.CANCEL_URL),
            notify_url: String(PAYFAST_CONFIG.ITN_URL),
            
            name_first: String(userData?.name?.split(' ')[0] || ''),
            name_last: String(userData?.name?.split(' ').slice(1).join(' ') || ''),
            email_address: String(userData?.email || ''),
            cell_number: String(userData?.phone || ''),
            
            m_payment_id: String(mPaymentId),
            amount: String(paymentDetails?.totalAmount || "0.00"),
            item_name: String(`${selectedPackage?.name || selectedPackage?.package_type || 'Business Package'} - Evenda`),
            item_description: String(`Max Events: ${selectedPackage?.max_events || 'Unlimited'}, Max Guests: ${selectedPackage?.max_guests || 0}`),
            
            custom_str1: String(userData?.user_id || ''),
            custom_str2: String(selectedPackage?.id || selectedPackage?.package_id || ''),
            custom_str3: String(selectedPackage?.name || selectedPackage?.package_type || 'Business'),
            custom_str4: 'PayFast-Business',
            custom_int1: String(parseInt(selectedPackage?.max_events) || 0),
            custom_int2: String(parseInt(selectedPackage?.max_guests) || 0),
            
            email_confirmation: PAYFAST_CONFIG.EMAIL_CONFIRMATION ? "1" : "0",
        };

        if (userData?.email) {
            paymentData.confirmation_address = String(userData.email);
        }

        paymentData.signature = generatePayFastSignature(paymentData);
        
        console.log("PayFast Data prepared for Business Package:", {
            ...paymentData,
            signature: "***HIDDEN***"
        });
        
        return paymentData;
    };

    // ============ PAYMENT FUNCTIONS ============
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

    const recordBusinessPayment = async (paymentInfo = {}) => {
        try {
            const formData = new FormData();
            
            formData.append("function", "recordBusinessPayment");
            formData.append("user_id", user?.user_id);
            formData.append("business_package_id", selectedPackage?.id || selectedPackage?.package_id);
            formData.append("amount", paymentDetails?.totalAmount || "0.00");
            formData.append("payment_method", paymentInfo.payment_method || selectedPaymentMethod);
            formData.append("payment_status", paymentInfo.payment_status || "pending");
            
            if (transactionId || paymentInfo.transaction_id) {
                formData.append("transaction_id", paymentInfo.transaction_id || transactionId);
            }

            console.log("Recording business payment with data:", {
                user_id: user?.user_id,
                business_package_id: selectedPackage?.id,
                amount: paymentDetails?.totalAmount,
                payment_method: paymentInfo.payment_method || selectedPaymentMethod,
                payment_status: paymentInfo.payment_status || "pending"
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
            
            if (paymentInfo.payment_status === 'completed' || result.payment_id) {
                generatePaymentProof(result.transaction_id || transactionId);
                setShowProofOptions(true);
            }
            
            return { success: true, transaction_id: transactionId };

        } catch (error) {
            console.error("Error recording business payment:", error);
            printAlert("Failed to record payment: " + error.message, "error");
            return { success: false };
        }
    };

    const assignBusinessPackage = async (transaction_id = null) => {
        try {
            const formData = new FormData();
            formData.append("function", "assignBusinessPackage");
            formData.append("user_id", user?.user_id);
            formData.append("business_package_id", selectedPackage?.id);
            if (transaction_id) {
                formData.append("transaction_id", transaction_id);
            }

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

    const initiatePayFastPayment = async () => {
        setProcessingPayment(true);
        setPaymentStarted(true);
        
        try {
            const paymentData = preparePayFastData();

            localStorage.setItem("lastBusinessTransactionId", paymentData.m_payment_id);
            localStorage.setItem("selectedBusinessPackageId", selectedPackage?.id);
            
            // Record initial payment with pending status
            const paymentRecorded = await recordBusinessPayment({
                payment_method: 'payfast',
                payment_status: 'pending',
                transaction_id: paymentData.m_payment_id
            });

            if (!paymentRecorded.success) {
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
            transactionId: paymentId || transactionId || `EVENDA-BIZ-${Date.now()}`,
            date: new Date().toISOString(),
            merchant: "Evenda Events",
            customer: user?.business_name || user?.name || "",
            email: user?.email || "",
            package: selectedPackage?.name || selectedPackage?.package_type || "Business Package",
            amount: paymentDetails?.totalAmount || "0.00",
            vat: paymentDetails?.vatAmount?.toFixed(2) || "0.00",
            serviceFee: paymentDetails?.serviceFee?.toFixed(2) || "0.00",
            total: paymentDetails?.totalAmount || "0.00",
            status: "Completed",
            reference: `EVENDA-BIZ-${Date.now()}`,
            terms: "Thank you for your business package payment. Your account has been upgraded."
        };
        
        setPaymentProof(proof);
        return proof;
    };

    const downloadPaymentProof = () => {
        if (!paymentProof) return;
        
        const proofText = `
        =====================================
          BUSINESS PACKAGE PAYMENT RECEIPT
        =====================================
        Transaction ID: ${paymentProof.transactionId}
        Date: ${new Date(paymentProof.date).toLocaleString()}
        
        Merchant: ${paymentProof.merchant}
        
        Business Customer Details:
        Name: ${paymentProof.customer}
        Email: ${paymentProof.email}
        
        Business Package Details:
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
        a.download = `Evenda-Business-Payment-${paymentProof.transactionId}.txt`;
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
                user.business_name || user.name,
                paymentProof.transactionId,
                paymentProof.total,
                paymentProof.package
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

    const processPayment = async () => {
        if (processingPayment || paymentStarted) {
            console.log("Payment already in progress, ignoring duplicate click");
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
            
            // For other payment methods (if any)
            await new Promise(resolve => setTimeout(resolve, 2000));

            const paymentResult = await recordBusinessPayment({
                payment_method: selectedPaymentMethod,
                payment_status: "completed"
            });

            if (paymentResult.success) {
                const assignSuccess = await assignBusinessPackage(paymentResult.transaction_id);

                if (assignSuccess) {
                    localStorage.removeItem("selectedPackageId");
                    localStorage.removeItem("selectedPackageType");
                    localStorage.removeItem("selectedPackage");
                    localStorage.removeItem("selectedBusinessPackage");
                    
                    printAlert("Payment successful! Your business package has been activated.", "success");
                    
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
            if (selectedPaymentMethod !== 'payfast') {
                setProcessingPayment(false);
                setPaymentStarted(false);
                setShowPaymentPopup(false);
            }
        }
    };

    // ============ PAYMENT FORM COMPONENTS ============
    const PayFastForm = () => {
        const [loading, setLoading] = useState(false);

        const handleSubmit = (e) => {
            e.preventDefault();
            setLoading(true);
            processPayment();
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
                    You will be securely redirected to PayFast to complete your business package payment.
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

    const PaymentProofModal = () => (
        <div className="proof-modal-overlay">
            <div className="proof-modal">
                <button className="close-modal" onClick={() => setShowProofOptions(false)}>×</button>
                <h3>Payment Successful! 🎉</h3>
                <p>Your business package payment of <strong>R{paymentDetails?.totalAmount}</strong> has been processed successfully.</p>
                
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
                            localStorage.removeItem("selectedPackageType");
                            localStorage.removeItem("selectedPackage");
                            localStorage.removeItem("selectedBusinessPackage");
                            navigate('/businessdashboard');
                        }}
                    >
                        <i className="bi bi-check-circle"></i> Go to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );

    const closePopup = () => {
        setShowPaymentPopup(false);
        setSelectedPaymentMethod("");
        setError("");
    };

    // ============ INITIALIZATION ============
    useEffect(() => {
        const initializePage = async () => {
            setLoading(true);
            setError("");

            try {
                const packageId = localStorage.getItem("selectedPackageId");
                const packageType = localStorage.getItem("selectedPackageType");
                const storedUser = localStorage.getItem("user");

                console.log("Initializing Business Package Payment Page with:", {
                    packageId,
                    packageType,
                    storedUser: storedUser ? "Found" : "Not Found"
                });

                if (!storedUser) {
                    printAlert("Session expired. Please log in again.", "error");
                    navigate("/");
                    return;
                }

                const userData = JSON.parse(storedUser);
                
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

                // Handle custom plans
                if (packageId.startsWith('CUSTOM-')) {
                    try {
                        const reqId = packageId.substring(7);
                        const formData = new FormData();
                        formData.append("function", "getCustomPlanForPayment");
                        formData.append("request_id", reqId);
                        const response = await fetch(`${API_BASE_URL}/query.php`, {
                            method: "POST",
                            body: formData
                        });
                        const data = await response.json();
                        if (data.success && data.request) {
                            const r = data.request;
                            setSelectedPackage({
                                id: packageId,
                                package_id: packageId,
                                name: 'Custom Business Plan',
                                package_type: 'Custom Plan',
                                price: r.final_price || r.proposed_price || 0,
                                max_events: r.approved_events || r.requested_events || 0,
                                max_guests: r.approved_guests || r.requested_guests || 0
                            });
                        } else {
                            throw new Error(data.message || 'Request not found');
                        }
                    } catch (err) {
                        console.error('Failed to load custom request:', err);
                        printAlert('Unable to load custom request details', 'error');
                        navigate("/upgrade_business_package");
                        return;
                    }
                } else {
                    await getBusinessPackageById(packageId);
                }
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
                        <p className="lead">Secure and fast checkout powered by PayFast</p>
                        
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
                                    <h3 className="package-name">{selectedPackage.name || selectedPackage.package_type}</h3>
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
                                        <span className="total-price">R{paymentDetails?.totalAmount}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="payment-right">
                            <h2>Choose Payment Method</h2>

                            <div className="payment-methods">
                                <button
                                    className={`payment-method-card ${selectedPaymentMethod === 'payfast' ? 'active' : ''}`}
                                    onClick={() => handlePaymentMethodSelect('payfast')}
                                >
                                    <div className="method-icon">
                                        <i className="bi bi-bank"></i>
                                    </div>
                                    <div className="method-info">
                                        <h4>PayFast</h4>
                                        <p>Secure South African payments</p>
                                    </div>
                                </button>
                            </div>

                            <div className="secure-note">
                                <i className="bi bi-lock"></i>
                                <span>Your payment information is secure and encrypted with PayFast</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method Popup */}
                    {showPaymentPopup && (
                        <div className="payment-popup-overlay" onClick={closePopup}>
                            <div className="payment-popup" onClick={(e) => e.stopPropagation()}>
                                <button className="close-popup" onClick={closePopup}>×</button>
                                <h3>Complete Your Business Package Payment</h3>
                                
                                <div className="popup-package-summary">
                                    <p><strong>Package:</strong> {selectedPackage.name || selectedPackage.package_type}</p>
                                    <p><strong>Total Amount:</strong> R{paymentDetails?.totalAmount}</p>
                                </div>

                                <PayFastForm />

                                <p className="payment-disclaimer">
                                    You will be redirected to PayFast's secure payment gateway to complete your transaction.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Payment Proof Modal */}
                    {showProofOptions && paymentProof && (
                        <PaymentProofModal />
                    )}
                </div>
            </div>

            <Footer />
        </>
    );
};

export default BusinessPackagePayment;