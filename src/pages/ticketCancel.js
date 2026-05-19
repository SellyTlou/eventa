// PaymentCancel.js
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TicketCancel = () => {
    const navigate = useNavigate();
    
    useEffect(() => {
        // Optional: Clean up any pending payment state
        console.log('Ticket cancellation confirmed');
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
                        onClick={() => navigate('/ticket_Sales')} 
                        className="btn-event btn-event-secondary"
                    >
                        <i className="bi bi-house"></i>
                        Go to Events
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TicketCancel;