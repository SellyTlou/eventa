
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BusinessPaymentSuccess = () => {
    const navigate = useNavigate();
    const [transactionId, setTransactionId] = useState('');
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        console.log('Business payment success page loaded');
        
        const lastTransactionId = localStorage.getItem("lastBusinessTransactionId");
        const selectedPackageId = localStorage.getItem("selectedBusinessPackageId");
        
        console.log('Last Business Transaction ID:', lastTransactionId);
        console.log('Selected Business Package ID:', selectedPackageId);
        
        if (lastTransactionId) {
            setTransactionId(lastTransactionId);
            
            localStorage.removeItem("lastBusinessTransactionId");
            localStorage.removeItem("selectedBusinessPackageId");
        } else {
            console.warn('No transaction ID found in localStorage');
        }
        
        setLoading(false);
        
        const timer = setTimeout(() => {
            // navigate('/businessdashboard');
        }, 5000);
        
        return () => clearTimeout(timer);
    }, [navigate]);
    
    const handleViewDashboard = () => {
        navigate('/businessdashboard');
    };
    
    const handleViewProfile = () => {
        navigate('/profile');
    };
    
    const handleDownloadReceipt = () => {
        console.log('Download receipt for transaction:', transactionId);
        alert('Receipt download feature coming soon!');
    };
    
    if (loading) {
        return (
            <div className="payment-success-container">
                <div className="loading-spinner">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="payment-success-container">
            <div className="payment-success-card">
                <i className="bi bi-check-circle-fill success-icon"></i>
                
                <h2>Payment Successful! 🎉</h2>
                
                <p className="success-message">
                    Your business package payment has been processed successfully.
                </p>
                
                {transactionId && (
                    <div className="transaction-details">
                        <p className="transaction-id-label">Transaction ID:</p>
                        <p className="transaction-id-value">{transactionId}</p>
                        <small className="transaction-note">
                            Please save this transaction ID for future reference.
                        </small>
                    </div>
                )}
                
                <div className="whats-next">
                    <h3>What's Next?</h3>
                    <ul>
                        <li>
                            <i className="bi bi-check-circle"></i>
                            Your business package has been activated
                        </li>
                        <li>
                            <i className="bi bi-check-circle"></i>
                            You can now create events based on your package limits
                        </li>
                        <li>
                            <i className="bi bi-check-circle"></i>
                            A confirmation email has been sent to your registered email
                        </li>
                        <li>
                            <i className="bi bi-check-circle"></i>
                            Access all business features from your dashboard
                        </li>
                    </ul>
                </div>
                
                <div className="action-buttons">
                    <button 
                        onClick={handleViewDashboard} 
                        className="btn-event btn-event-primary"
                    >
                        <i className="bi bi-speedometer2"></i>
                        Go to Business Dashboard
                    </button>
                    
                    <button 
                        onClick={handleViewProfile} 
                        className="btn-event btn-event-secondary"
                    >
                        <i className="bi bi-person"></i>
                        View Profile
                    </button>
                    
                    <button 
                        onClick={handleDownloadReceipt} 
                        className="btn-event btn-event-outline"
                    >
                        <i className="bi bi-download"></i>
                        Download Receipt
                    </button>
                </div>
                
                <div className="support-info">
                    <i className="bi bi-headset"></i>
                    <p>
                        Need help? Contact our support team at{' '}
                        <a href="mailto:support@evenda.com">support@evenda.com</a>
                    </p>
                </div>
            </div>
            
            <style jsx>{`
                .payment-success-container {
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 20px;
                }
                
                .payment-success-card {
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
                
                .success-icon {
                    font-size: 80px;
                    color: #10b981;
                    margin-bottom: 20px;
                    animation: scaleIn 0.5s ease-out;
                }
                
                @keyframes scaleIn {
                    from {
                        transform: scale(0);
                    }
                    to {
                        transform: scale(1);
                    }
                }
                
                h2 {
                    color: #1f2937;
                    margin-bottom: 15px;
                    font-size: 28px;
                }
                
                .success-message {
                    color: #6b7280;
                    margin-bottom: 25px;
                    font-size: 16px;
                    line-height: 1.6;
                }
                
                .transaction-details {
                    background: #f3f4f6;
                    padding: 15px;
                    border-radius: 10px;
                    margin: 20px 0;
                }
                
                .transaction-id-label {
                    font-size: 12px;
                    color: #6b7280;
                    margin-bottom: 5px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                
                .transaction-id-value {
                    font-size: 16px;
                    font-weight: 600;
                    color: #1f2937;
                    font-family: monospace;
                    word-break: break-all;
                }
                
                .transaction-note {
                    font-size: 11px;
                    color: #9ca3af;
                    display: block;
                    margin-top: 8px;
                }
                
                .whats-next {
                    text-align: left;
                    background: #f9fafb;
                    padding: 20px;
                    border-radius: 12px;
                    margin: 25px 0;
                }
                
                .whats-next h3 {
                    color: #1f2937;
                    margin-bottom: 15px;
                    font-size: 18px;
                }
                
                .whats-next ul {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                
                .whats-next li {
                    margin-bottom: 12px;
                    color: #4b5563;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .whats-next li i {
                    color: #10b981;
                    font-size: 18px;
                }
                
                .action-buttons {
                    display: flex;
                    gap: 15px;
                    justify-content: center;
                    flex-wrap: wrap;
                    margin: 30px 0 20px;
                }
                
                .btn-event {
                    padding: 12px 24px;
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
                
                .support-info {
                    margin-top: 25px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    font-size: 13px;
                    color: #6b7280;
                }
                
                .support-info i {
                    font-size: 18px;
                    color: #6366f1;
                }
                
                .support-info a {
                    color: #6366f1;
                    text-decoration: none;
                }
                
                .support-info a:hover {
                    text-decoration: underline;
                }
                
                .loading-spinner {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                }
                
                @media (max-width: 640px) {
                    .payment-success-card {
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
                }
            `}</style>
        </div>
    );
};

export default BusinessPaymentSuccess;