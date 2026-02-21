// PaymentSuccess.js
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './main.css';

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [countdown, setCountdown] = useState(5);
    
    useEffect(() => {
        // Get payment details from URL
        const pfPaymentId = searchParams.get('pf_payment_id');
        const paymentId = searchParams.get('m_payment_id');
        
        console.log('Payment successful:', { pfPaymentId, paymentId });
        
        // Start countdown
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    navigate('/eventsDashboard');
                }
                return prev - 1;
            });
        }, 1000);
        
        return () => clearInterval(timer);
    }, [navigate, searchParams]);
    
    return (
        <div className="payment-success-container">
            <div className="payment-success-card">
                <div className="success-animation">
                    <i className="bi bi-check-circle-fill"></i>
                </div>
                
                <h2>Payment Successful! 🎉</h2>
                
                <p className="success-message">
                    Thank you for your payment. Your package has been successfully upgraded.
                </p>
                
                <div className="payment-details">
                    <p><strong>Transaction ID:</strong> {searchParams.get('pf_payment_id') || 'N/A'}</p>
                    <p><strong>Amount:</strong> R{searchParams.get('amount_gross') || '0.00'}</p>
                </div>
                
                <p className="redirect-message">
                    Redirecting to dashboard in {countdown} seconds...
                </p>
                
                <div className="action-buttons">
                    <button 
                        onClick={() => navigate('/eventsDashboard')} 
                        className="btn-event btn-event-primary"
                    >
                        <i className="bi bi-speedometer2"></i>
                        Go to Dashboard Now
                    </button>
                    
                    <button 
                        onClick={() => window.print()} 
                        className="btn-event btn-event-secondary"
                    >
                        <i className="bi bi-printer"></i>
                        Print Receipt
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess;