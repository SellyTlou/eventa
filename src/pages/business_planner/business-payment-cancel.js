// business-payment-cancel.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BusinessPaymentCancel = () => {
    const navigate = useNavigate();
    const [transactionId, setTransactionId] = useState('');
    
    useEffect(() => {
        console.log('Business payment cancelled');
        
        // Retrieve the transaction ID from localStorage if exists
        const lastTransactionId = localStorage.getItem("lastBusinessTransactionId");
        
        if (lastTransactionId) {
            setTransactionId(lastTransactionId);
            console.log('Cancelled transaction ID:', lastTransactionId);
            
            // Optional: Log the cancelled transaction for analytics
            // You can also send this to your backend for tracking
        }
        
        // Clear the stored transaction ID to prevent reuse
        localStorage.removeItem("lastBusinessTransactionId");
        localStorage.removeItem("selectedBusinessPackageId");
        
        // Optional: Redirect to packages page after 10 seconds
        const timer = setTimeout(() => {
            // navigate('/upgrade_business_package');
        }, 10000);
        
        return () => clearTimeout(timer);
    }, []);
    
    const handleTryAgain = () => {
        // Navigate back to the payment page with the same package
        const selectedPackageId = localStorage.getItem("selectedBusinessPackageId");
        if (selectedPackageId) {
            navigate('/business-package-payment');
        }
    };
    
    const handleGoToDashboard = () => {
        navigate('/businessdashboard');
    };
    
    const handleContactSupport = () => {
        window.location.href = 'mailto:support@evenda.com?subject=Business%20Package%20Payment%20Issue';
    };
    
    return (
        <div className="payment-cancel-container">
            <div className="payment-cancel-card">
                <i className="bi bi-x-circle-fill cancel-icon"></i>
                
                <h2>Payment Cancelled</h2>
                
                <p className="cancel-message">
                    Your business package payment was cancelled. No charges were made to your account.
                </p>
                
                {transactionId && (
                    <div className="transaction-info">
                        <p className="transaction-label">Cancelled Transaction ID:</p>
                        <p className="transaction-value">{transactionId}</p>
                        <small>You can try again with the same transaction reference.</small>
                    </div>
                )}
                
                <div className="why-cancelled">
                    <h3>Why was my payment cancelled?</h3>
                    <p>Common reasons include:</p>
                    <ul>
                        <li>
                            <i className="bi bi-x-circle"></i>
                            You closed the payment window before completing
                        </li>
                        <li>
                            <i className="bi bi-x-circle"></i>
                            Insufficient funds in your account
                        </li>
                        <li>
                            <i className="bi bi-x-circle"></i>
                            Payment verification failed
                        </li>
                        <li>
                            <i className="bi bi-x-circle"></i>
                            You clicked the cancel button on PayFast
                        </li>
                    </ul>
                </div>
                
                <div className="help-section">
                    <i className="bi bi-question-circle"></i>
                    <p>
                        Need assistance? Our support team is here to help you complete your business package purchase.
                    </p>
                </div>
                
                <div className="action-buttons">
                    <button 
                        onClick={handleTryAgain} 
                        className="btn-event btn-event-primary"
                    >
                        <i className="bi bi-arrow-repeat"></i>
                        Try Again
                    </button>
                    
                
                    
                    <button 
                        onClick={handleGoToDashboard} 
                        className="btn-event btn-event-outline"
                    >
                        <i className="bi bi-house"></i>
                        Go to Dashboard
                    </button>
                    
                    <button 
                        onClick={handleContactSupport} 
                        className="btn-event btn-event-link"
                    >
                        <i className="bi bi-envelope"></i>
                        Contact Support
                    </button>
                </div>
                
                <div className="security-note">
                    <i className="bi bi-shield-check"></i>
                    <p>
                        Your payment information is secure. No financial data was shared during this cancelled transaction.
                    </p>
                </div>
            </div>
            
            <style jsx>{`
                .payment-cancel-container {
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
                    padding: 20px;
                }
                
                .payment-cancel-card {
                    background: white;
                    border-radius: 20px;
                    padding: 40px;
                    max-width: 600px;
                    width: 100%;
                    text-align: center;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    animation: slideUp 0.5s ease-out;
                }
                
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .cancel-icon {
                    font-size: 80px;
                    color: #ef4444;
                    margin-bottom: 20px;
                    animation: shake 0.5s ease-out;
                }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-10px); }
                    75% { transform: translateX(10px); }
                }
                
                h2 {
                    color: #1f2937;
                    margin-bottom: 15px;
                    font-size: 28px;
                }
                
                .cancel-message {
                    color: #6b7280;
                    margin-bottom: 25px;
                    font-size: 16px;
                    line-height: 1.6;
                }
                
                .transaction-info {
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    padding: 15px;
                    border-radius: 10px;
                    margin: 20px 0;
                }
                
                .transaction-label {
                    font-size: 12px;
                    color: #991b1b;
                    margin-bottom: 5px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                
                .transaction-value {
                    font-size: 14px;
                    font-weight: 600;
                    color: #991b1b;
                    font-family: monospace;
                    word-break: break-all;
                }
                
                .transaction-info small {
                    font-size: 11px;
                    color: #dc2626;
                    display: block;
                    margin-top: 8px;
                }
                
                .why-cancelled {
                    text-align: left;
                    background: #f9fafb;
                    padding: 20px;
                    border-radius: 12px;
                    margin: 25px 0;
                }
                
                .why-cancelled h3 {
                    color: #1f2937;
                    margin-bottom: 10px;
                    font-size: 16px;
                }
                
                .why-cancelled p {
                    color: #6b7280;
                    font-size: 14px;
                    margin-bottom: 10px;
                }
                
                .why-cancelled ul {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                
                .why-cancelled li {
                    margin-bottom: 8px;
                    color: #4b5563;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .why-cancelled li i {
                    color: #ef4444;
                    font-size: 14px;
                }
                
                .help-section {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: #eff6ff;
                    padding: 15px;
                    border-radius: 10px;
                    margin: 20px 0;
                    text-align: left;
                }
                
                .help-section i {
                    font-size: 24px;
                    color: #3b82f6;
                }
                
                .help-section p {
                    margin: 0;
                    font-size: 13px;
                    color: #1e40af;
                    line-height: 1.5;
                }
                
                .action-buttons {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                    flex-wrap: wrap;
                    margin: 30px 0 20px;
                }
                
                .btn-event {
                    padding: 12px 20px;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    text-decoration: none;
                }
                
                .btn-event-primary {
                    background: #6366f1;
                    color: white;
                }
                
                .btn-event-primary:hover {
                    background: #4f46e5;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
                }
                
                .btn-event-secondary {
                    background: #10b981;
                    color: white;
                }
                
                .btn-event-secondary:hover {
                    background: #059669;
                    transform: translateY(-2px);
                }
                
                .btn-event-outline {
                    background: transparent;
                    color: #6366f1;
                    border: 2px solid #6366f1;
                }
                
                .btn-event-outline:hover {
                    background: #6366f1;
                    color: white;
                    transform: translateY(-2px);
                }
                
                .btn-event-link {
                    background: transparent;
                    color: #6b7280;
                }
                
                .btn-event-link:hover {
                    color: #4f46e5;
                    transform: translateY(-2px);
                }
                
                .security-note {
                    margin-top: 25px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    font-size: 12px;
                    color: #6b7280;
                }
                
                .security-note i {
                    font-size: 16px;
                    color: #10b981;
                }
                
                @media (max-width: 640px) {
                    .payment-cancel-card {
                        padding: 30px 20px;
                    }
                    
                    h2 {
                        font-size: 24px;
                    }
                    
                    .action-buttons {
                        flex-direction: column;
                    }
                    
                    .btn-event {
                        width: 100%;
                        justify-content: center;
                    }
                    
                    .help-section {
                        flex-direction: column;
                        text-align: center;
                    }
                }
            `}</style>
        </div>
    );
};

export default BusinessPaymentCancel;