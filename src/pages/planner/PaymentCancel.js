// PaymentCancel.js
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PaymentCancel = () => {
    const navigate = useNavigate();
    
    useEffect(() => {
        console.log('Payment cancelled');
    }, []);
    
    return (
        <div className="payment-cancel-container">
            <div className="payment-cancel-card">
                <i className="bi bi-x-circle-fill cancel-icon"></i>
                
                <h2>Payment Cancelled</h2>
                
                <p className="cancel-message">
                    Your payment was cancelled. No charges were made.
                </p>
                
                <p>You can try again or choose a different payment method.</p>
                
                <div className="action-buttons">
                    <button 
                        onClick={() => navigate('/upgrade-package')} 
                        className="btn-event btn-event-primary"
                    >
                        <i className="bi bi-arrow-left"></i>
                        Back to Packages
                    </button>
                    
                    <button 
                        onClick={() => navigate('/profile')} 
                        className="btn-event btn-event-secondary"
                    >
                        <i className="bi bi-house"></i>
                        Go to Profile
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentCancel;