import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './ticketSuccess.css';

const API_URL = process.env.REACT_APP_API_URL || "https://evenditest.evendi.co.za";

const TicketSuccess = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [status, setStatus] = useState("verifying");
    const [transactionId, setTransactionId] = useState(null);
    const [paymentDetails, setPaymentDetails] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const urlId = params.get('m_payment_id');
        const storedId = localStorage.getItem("lastTransactionId");
        const finalId = urlId || storedId;

        if (finalId) {
            setTransactionId(finalId);
        } else {
            setStatus("unknown");
            setError("No transaction ID found. Please check your email.");
        }
    }, [location]);

    useEffect(() => {
        const verifyPayment = async () => {
            if (!transactionId) return;

            try {
                const formData = new FormData();
                formData.append("function", "checkTicketPaymentStatus");
                formData.append("transaction_id", transactionId);

                const response = await fetch(`${API_URL}/query.php`, {
                    method: "POST",
                    body: formData
                });

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                const text = await response.text();
                let data;
                try { data = JSON.parse(text); } 
                catch { throw new Error("Invalid response from server"); }

                if (data.success) {
                    setPaymentDetails(data);
                    if (data.status === "completed") setStatus("success");
                    else if (data.status === "pending") setStatus("pending");
                    else if (data.status === "failed") {
                        setStatus("failed");
                        setError(data.message || "Payment verification failed");
                    } else setStatus("unknown");
                } else {
                    setStatus("unknown");
                    setError(data.message || "Could not verify payment status");
                }

            } catch (err) {
                setStatus("unknown");
                setError(err.message);
            }
        };

        if (transactionId && (status === "verifying" || status === "pending")) {
            verifyPayment();
        }
    }, [transactionId, status]);

    const getStatusIcon = () => {
        switch(status) {
            case "success": return "bi bi-check-circle-fill";
            case "pending": return "bi bi-hourglass-split";
            case "failed": return "bi bi-x-circle-fill";
            case "verifying": return "bi bi-arrow-repeat";
            default: return "bi bi-question-circle-fill";
        }
    };

    const getStatusColor = () => {
        switch(status) {
            case "success": return "#4caf50";
            case "pending": return "#ff9800";
            case "failed": return "#f44336";
            case "verifying": return "#2196f3";
            default: return "#999";
        }
    };

    return (
        <div className="ticket-success-container">
            <div className="ticket-success-card">
                <div className="status-icon" style={{ backgroundColor: getStatusColor() }}>
                    <i className={getStatusIcon()}></i>
                </div>

                <h2>
                    {status === "success" && "Payment Successful! 🎉"}
                    {status === "pending" && "Payment Processing..."}
                    {status === "failed" && "Payment Failed"}
                    {status === "verifying" && "Verifying Payment..."}
                    {status === "unknown" && "Payment Status Unknown"}
                </h2>

                <p className="status-message">
                    {status === "verifying" && "Please wait while we verify your payment..."}
                    {status === "success" && "Your tickets have been booked successfully. A confirmation email has been sent to your email address."}
                    {status === "pending" && "Your payment is being processed. You will receive a confirmation email shortly."}
                    {status === "failed" && "Your payment could not be processed. Please try again."}
                    {status === "unknown" && (error || "We could not verify your payment status. Please check your email for confirmation.")}
                </p>

                {(paymentDetails || transactionId) && (
                    <div className="payment-details">
                        <h3>Payment Details</h3>
                        {transactionId && <p><strong>Transaction ID:</strong> {transactionId}</p>}
                        {paymentDetails?.amount && <p><strong>Amount:</strong> R{parseFloat(paymentDetails.amount).toFixed(2)}</p>}
                        {paymentDetails?.ticket_type && (
                            <>
                                <p><strong>Ticket Type:</strong> {paymentDetails.ticket_type}</p>
                                <p><strong>Quantity:</strong> {paymentDetails.quantity}</p>
                            </>
                        )}
                        {paymentDetails?.customer_email && <p><strong>Email:</strong> {paymentDetails.customer_email}</p>}
                        <p><strong>Status:</strong> <span style={{ color: getStatusColor(), marginLeft: '5px' }}>{paymentDetails?.status || status}</span></p>
                    </div>
                )}

                <div className="action-buttons">
                    {status === "success" && (
                        <button onClick={() => window.print()} className="btn-secondary">
                            <i className="bi bi-printer"></i> Print Tickets
                        </button>
                    )}
                    
                    <button onClick={() => navigate('/ticket_sales')} className="btn-primary">
                        {status === "failed" ? "Try Again" : "Back to Events"}
                    </button>
                    
                    {status === "pending" && (
                        <button onClick={() => window.location.reload()} className="btn-secondary">
                            <i className="bi bi-arrow-repeat"></i> Check Again
                        </button>
                    )}
                </div>

                {status === "success" && (
                    <div className="success-note">
                        <i className="bi bi-envelope-fill"></i>
                        <p>Check your email for ticket confirmation and QR codes.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TicketSuccess;