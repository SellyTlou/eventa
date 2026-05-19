import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './main.css';

const API_URL = process.env.REACT_APP_API_URL || "https://evenditest.evendi.co.za/api";

const PaymentSuccess = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [countdown, setCountdown] = useState(5);
    const [status, setStatus] = useState("verifying");
    const [transactionId, setTransactionId] = useState(null);
    const [paymentDetails, setPaymentDetails] = useState(null);

  useEffect(() => {

    const params = new URLSearchParams(location.search);

    let id = params.get('m_payment_id');

    if (!id) {

        id = localStorage.getItem("last_payfast_transaction");
    }

    if (id) {

        console.log("Found transaction ID:", id);

        setTransactionId(id);

    } else {

        console.log("No transaction ID found");

        setStatus("unknown");
    }

}, [location]);

    useEffect(() => {
        const verifyPayment = async () => {
            if (!transactionId) return;

            try {
                console.log("Verifying payment for transaction:", transactionId);
                
                const formData = new FormData();
                formData.append("function", "checkPaymentStatus");
                formData.append("transaction_id", transactionId);

                const response = await fetch(`${API_URL}/query.php`, {
                    method: "POST",
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log("Payment verification response:", data);

                if (data.success) {
                    setPaymentDetails(data);
                    
                    if (data.status === "completed") {
                        setStatus("success");
                    } else if (data.status === "pending") {
                        setStatus("pending");
                    } else {
                        setStatus("unknown");
                    }
                } else {
                    console.error("Verification failed:", data.message);
                    setStatus("unknown");
                }

            } catch (err) {
                console.error("Verification error:", err);
                setStatus("unknown");
            }
        };

        // Poll every 3 seconds if status is pending
        let interval;
        if (transactionId && status === "pending") {
            interval = setInterval(verifyPayment, 3000);
        } else if (transactionId && status === "verifying") {
            verifyPayment();
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [transactionId, status]);

    // Countdown timer
    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Navigate after countdown
    useEffect(() => {
        if (countdown <= 0) {
            navigate('/profile');
        }
    }, [countdown, navigate]);

    return (
        <div className="payment-success-container">
            <div className="payment-success-card">
                <div className="success-animation">
                    <i className="bi bi-check-circle-fill"></i>
                </div>

                <h2>Payment Received 🎉</h2>

                <p className="success-message">
                    {status === "verifying" && "Verifying your payment..."}
                    {status === "success" && "Your payment has been confirmed successfully."}
                    {status === "pending" && "Your payment is being processed. It will reflect shortly."}
                    {status === "unknown" && "We could not verify payment, but it may still be processing."}
                </p>

                <div className="payment-details">
                    <p>
                        <strong>Transaction ID:</strong> 
                        {transactionId || (status === "verifying" ? "Loading..." : "Not found")}
                    </p>
                    {paymentDetails && paymentDetails.amount && (
                        <>
                            <p><strong>Amount:</strong> R{paymentDetails.amount}</p>
                            <p><strong>Status:</strong> {paymentDetails.status}</p>
                        </>
                    )}
                </div>

                <p className="redirect-message">
                    Redirecting in {countdown} seconds...
                </p>

                <div className="action-buttons">
                    <button
                        onClick={() => navigate('/profile')}
                        className="btn-event btn-event-primary"
                    >
                        Go to Profile
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess;