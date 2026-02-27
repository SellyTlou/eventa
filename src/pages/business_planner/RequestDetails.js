import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LoginNav, Footer } from '../components';
import './RequestDetails.css';

const RequestDetails = () => {
    const { requestId } = useParams();
    const navigate = useNavigate();
    
    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [alert, setAlert] = useState({ show: false, message: '', type: '' });

    
    // State for counter-offer response
    const [showAcceptModal, setShowAcceptModal] = useState(false);
    const [showDeclineModal, setShowDeclineModal] = useState(false);
    const [message, setMessage] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const [messages, setMessages] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);


    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';

    useEffect(() => {
        const userJson = localStorage.getItem('user');
        if (!userJson) {
            navigate('/');
            return;
        }

        const userData = JSON.parse(userJson);
        
        // Check if user is business account
        if (userData.account_type !== 'business') {
            navigate('/eventsDashboard');
            return;
        }

        setUser(userData);
        fetchRequestDetails(userData.user_id, requestId);
        fetchRequestMessages(requestId);
    }, [navigate, requestId]);

    const fetchRequestDetails = async (userId, reqId) => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('function', 'getCustomPlanRequestById');
            formData.append('user_id', userId);
            formData.append('request_id', reqId);

            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                setRequest(data.request);
            } else {
                showAlert('Request not found', 'error');
                setTimeout(() => navigate('/my-requests'), 2000);
            }
        } catch (error) {
            console.error('Error fetching request:', error);
            showAlert('Error loading request', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchRequestMessages = async (reqId) => {
    try {
        const formData = new FormData();
        formData.append('function', 'getRequestMessages');
        formData.append('request_id', reqId);
        formData.append('admin_view', 'false'); // Business viewing

        const response = await fetch(`${API_BASE_URL}/query.php`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (data.success) {
            setMessages(data.messages || []);
            setUnreadCount(data.unread_count || 0);
        }
    } catch (error) {
        console.error('Error fetching messages:', error);
    }
};

    const showAlert = (message, type) => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-ZA', {
            style: 'currency',
            currency: 'ZAR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    

    const getStatusBadge = (status) => {
        const badges = {
            'pending': { class: 'badge-pending', icon: 'bi-hourglass', text: 'Pending Review' },
            'reviewed': { class: 'badge-review', icon: 'bi-eye', text: 'Under Review' },
            'countered': { class: 'badge-counter', icon: 'bi-arrow-left-right', text: 'Counter Offer' },
            'approved': { class: 'badge-approved', icon: 'bi-check-circle', text: 'Approved' },
            'rejected': { class: 'badge-rejected', icon: 'bi-x-circle', text: 'Rejected' },
            'completed': { class: 'badge-completed', icon: 'bi-check-all', text: 'Completed' }
        };
        
        const badge = badges[status] || badges.pending;
        return (
            <span className={`status-badge ${badge.class}`}>
                <i className={`bi ${badge.icon}`}></i>
                {badge.text}
            </span>
        );
    };

    const handleAcceptOffer = async () => {
        try {
            const formData = new FormData();
            formData.append('function', 'acceptCustomPlanOffer');
            formData.append('user_id', user.user_id);
            formData.append('request_id', request.request_id);

            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                showAlert('Offer accepted! Your custom plan is now active.', 'success');
                setShowAcceptModal(false);
                // Refresh request details
                fetchRequestDetails(user.user_id, request.request_id);
            } else {
                showAlert(data.message || 'Failed to accept offer', 'error');
            }
        } catch (error) {
            console.error('Error accepting offer:', error);
            showAlert('Error accepting offer', 'error');
        }
    };

    const handleDeclineOffer = async () => {
        try {
            const formData = new FormData();
            formData.append('function', 'declineCustomPlanOffer');
            formData.append('user_id', user.user_id);
            formData.append('request_id', request.request_id);
            formData.append('reason', message || 'No reason provided');

            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                showAlert('Offer declined', 'info');
                setShowDeclineModal(false);
                setMessage('');
                fetchRequestDetails(user.user_id, request.request_id);
            } else {
                showAlert(data.message || 'Failed to decline offer', 'error');
            }
        } catch (error) {
            console.error('Error declining offer:', error);
            showAlert('Error declining offer', 'error');
        }
    };

    const handleSendMessage = async () => {
        if (!message.trim()) {
            showAlert('Please enter a message', 'warning');
            return;
        }

        setSendingMessage(true);
        try {
            const formData = new FormData();
            formData.append('function', 'sendRequestMessage');
            formData.append('user_id', user.user_id);
            formData.append('request_id', request.request_id);
            formData.append('message', message);
            formData.append('sender_type', 'business');

            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                showAlert('Message sent', 'success');
                setMessage('');
                fetchRequestMessages(request.request_id);
                
                // Add message to local state for immediate display
                const newMessage = {
                    id: Date.now(),
                    message: message,
                    sender_type: 'business',
                    created_at: new Date().toISOString(),
                    sender_name: user.business_name || user.name
                };
                setMessages(prev => [...prev, newMessage]);
            } else {
                showAlert(data.message || 'Failed to send message', 'error');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            showAlert('Error sending message', 'error');
        } finally {
            setSendingMessage(false);
        }
    };

    if (loading) {
        return (
            <>
                <LoginNav />
                <div className="loading-container">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p>Loading request details...</p>
                </div>
                <Footer />
            </>
        );
    }

    if (!request) {
        return (
            <>
                <LoginNav />
                <div className="error-container">
                    <i className="bi bi-exclamation-triangle"></i>
                    <h2>Request Not Found</h2>
                    <p>The request you're looking for doesn't exist or you don't have permission to view it.</p>
                    <button onClick={() => navigate('/my-requests')} className="btn-back">
                        Back to My Requests
                    </button>
                </div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <LoginNav />
            
            <div className="request-details-page">
                <div className="container">
                    {/* Header with back button */}
                    <div className="page-header">
                        <button className="btn-back" onClick={() => navigate('/my-requests')}>
                            <i className="bi bi-arrow-left"></i>
                            Back to My Requests
                        </button>
                        <div className="header-right">
                            {getStatusBadge(request.status)}
                        </div>
                    </div>

                    {/* Alert */}
                    {alert.show && (
                        <div className={`custom-alert ${alert.type}`}>
                            <i className={`fas ${alert.type === "error" ? "fa-times-circle" : "fa-check-circle"}`}></i>
                            <span>{alert.message}</span>
                        </div>
                    )}

                    {/* Main Content */}
                    <div className="request-content">
                        {/* Left Column - Request Details */}
                        <div className="left-column">
                            <div className="details-card">
                                <h2>Request Details</h2>
                                <div className="request-id">
                                    <span className="label">Request ID:</span>
                                    <span className="value">{request.request_id}</span>
                                </div>
                                <div className="request-date">
                                    <span className="label">Submitted:</span>
                                    <span className="value">{formatDate(request.created_at)}</span>
                                </div>

                                <div className="divider"></div>

                                <h3>What You Requested</h3>
                                <div className="requested-items">
                                    <div className="item">
                                        <i className="bi bi-people"></i>
                                        <div className="item-details">
                                            <span className="item-label">Guests</span>
                                            <span className="item-value">{request.requested_guests?.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="item">
                                        <i className="bi bi-calendar-event"></i>
                                        <div className="item-details">
                                            <span className="item-label">Events per Month</span>
                                            <span className="item-value">{request.requested_events}</span>
                                        </div>
                                    </div>
                                    <div className="item">
                                        <i className="bi bi-currency-dollar"></i>
                                        <div className="item-details">
                                            <span className="item-label">Proposed Budget</span>
                                            <span className="item-value">{formatCurrency(request.proposed_price)}/month</span>
                                        </div>
                                    </div>
                                </div>

                                {request.desired_features && (
                                    <div className="features-section">
                                        <h4>Desired Features</h4>
                                        <p>{request.desired_features}</p>
                                    </div>
                                )}

                                <div className="divider"></div>

                                <h3>Event Details</h3>
                                <div className="event-details">
                                    <div className="detail-row">
                                        <span className="label">Event Name:</span>
                                        <span className="value">{request.event_name}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Event Type:</span>
                                        <span className="value">{request.event_type?.replace('_', ' ')}</span>
                                    </div>
                                    {request.event_description && (
                                        <div className="detail-row description">
                                            <span className="label">Description:</span>
                                            <p className="value">{request.event_description}</p>
                                        </div>
                                    )}
                                    {request.event_date && (
                                        <div className="detail-row">
                                            <span className="label">Event Date:</span>
                                            <span className="value">{new Date(request.event_date).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </div>

                                {request.special_requirements && (
                                    <>
                                        <div className="divider"></div>
                                        <h4>Special Requirements</h4>
                                        <p className="special-req">{request.special_requirements}</p>
                                    </>
                                )}

                                {request.additional_notes && (
                                    <>
                                        <div className="divider"></div>
                                        <h4>Additional Notes</h4>
                                        <p className="additional-notes">{request.additional_notes}</p>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Right Column - Admin Response & Actions */}
                        <div className="right-column">
                            {/* Admin Response Card */}
                            <div className="admin-response-card">
                                <h2>Admin Response</h2>
                                
                                {request.status === 'pending' && (
                                    <div className="status-message pending">
                                        <i className="bi bi-hourglass"></i>
                                        <p>Your request is pending review. Our team will respond within 24-48 hours.</p>
                                    </div>
                                )}

                                {request.status === 'reviewed' && (
                                    <div className="status-message review">
                                        <i className="bi bi-eye"></i>
                                        <p>Your request is currently under review. We'll get back to you soon.</p>
                                    </div>
                                )}

                                {request.status === 'countered' && (
                                    <div className="counter-offer">
                                        <div className="offer-header">
                                            <i className="bi bi-arrow-left-right"></i>
                                            <h3>Counter Offer</h3>
                                        </div>
                                        
                                        <div className="offer-items">
                                            <div className="offer-item">
                                                <span className="offer-label">Approved Guests:</span>
                                                <span className="offer-value">{request.approved_guests || request.requested_guests}</span>
                                                {request.approved_guests && request.approved_guests !== request.requested_guests && (
                                                    <span className="diff-badge">changed</span>
                                                )}
                                            </div>
                                            <div className="offer-item">
                                                <span className="offer-label">Approved Events:</span>
                                                <span className="offer-value">{request.approved_events || request.requested_events}</span>
                                                {request.approved_events && request.approved_events !== request.requested_events && (
                                                    <span className="diff-badge">changed</span>
                                                )}
                                            </div>
                                            <div className="offer-item highlight">
                                                <span className="offer-label">Final Price:</span>
                                                <span className="offer-value price">{formatCurrency(request.final_price || request.proposed_price)}/month</span>
                                                {request.final_price && request.final_price !== request.proposed_price && (
                                                    <span className="diff-badge">adjusted</span>
                                                )}
                                            </div>
                                        </div>

                                        {request.admin_notes && (
                                            <div className="admin-message">
                                                <i className="bi bi-chat-dots"></i>
                                                <div className="message-content">
                                                    <strong>Admin note:</strong>
                                                    <p>{request.admin_notes}</p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="action-buttons">
                                            <button 
                                                className="btn-accept"
                                                onClick={() => setShowAcceptModal(true)}
                                            >
                                                <i className="bi bi-check-circle"></i>
                                                Accept Offer
                                            </button>
                                            <button 
                                                className="btn-decline"
                                                onClick={() => setShowDeclineModal(true)}
                                            >
                                                <i className="bi bi-x-circle"></i>
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {request.status === 'approved' && (
                                    <div className="status-message approved">
                                        <i className="bi bi-check-circle"></i>
                                        <h4>Your custom plan has been approved!</h4>
                                        <p>Your new package is now active. You can view it in your dashboard.</p>
                                        <button 
                                            className="btn-view-package"
                                            onClick={() => navigate('/businessdashboard')}
                                        >
                                            View My Dashboard
                                        </button>
                                    </div>
                                )}

                                {request.status === 'rejected' && (
                                    <div className="status-message rejected">
                                        <i className="bi bi-x-circle"></i>
                                        <h4>Request Rejected</h4>
                                        {request.admin_notes && (
                                            <div className="rejection-reason">
                                                <strong>Reason:</strong>
                                                <p>{request.admin_notes}</p>
                                            </div>
                                        )}
                                        <button 
                                            className="btn-new-request"
                                            onClick={() => navigate('/custom-plan-request')}
                                        >
                                            Submit New Request
                                        </button>
                                    </div>
                                )}

                                {request.status === 'completed' && (
                                    <div className="status-message completed">
                                        <i className="bi bi-check-all"></i>
                                        <h4>Request Completed</h4>
                                        <p>This custom plan has been fully processed.</p>
                                    </div>
                                )}
                            </div>

                            {/* Message Thread */}
                            <div className="message-thread-card">
                                <h2>Conversation</h2>
                                
                                <div className="message-list">
                                    {messages.length === 0 ? (
                                        <div className="no-messages">
                                            <i className="bi bi-chat-dots"></i>
                                            <p>No messages yet</p>
                                        </div>
                                    ) : (
                                        messages.map((msg, index) => (
                                            <div 
                                                key={msg.id || index} 
                                                className={`message-item ${msg.sender_type === 'business' ? 'business-message' : 'admin-message'}`}
                                            >
                                                <div className="message-header">
                                                    <span className="sender">
                                                        {msg.sender_type === 'business' ? 'You' : (msg.sender_name || 'Admin')}
                                                    </span>
                                                    <span className="time">{formatDate(msg.created_at)}</span>
                                                </div>
                                                <div className="message-body">
                                                    {msg.message}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Message Input */}
                                {(request.status === 'pending' || request.status === 'reviewed' || request.status === 'countered') && (
                                    <div className="message-input">
                                        <textarea
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="Type your message here..."
                                            rows="3"
                                        />
                                        <button 
                                            onClick={handleSendMessage}
                                            disabled={sendingMessage || !message.trim()}
                                            className="btn-send"
                                        >
                                            {sendingMessage ? (
                                                <>
                                                    <div className="spinner-border spinner-border-sm" role="status"></div>
                                                    Sending...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-send"></i>
                                                    Send Message
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Accept Confirmation Modal */}
            {showAcceptModal && (
                <div className="modal-overlay" onClick={() => setShowAcceptModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Accept Counter Offer</h3>
                            <button className="close-btn" onClick={() => setShowAcceptModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to accept this counter offer?</p>
                            <div className="offer-summary">
                                <div className="summary-item">
                                    <span>Guests:</span>
                                    <strong>{request.approved_guests || request.requested_guests}</strong>
                                </div>
                                <div className="summary-item">
                                    <span>Events:</span>
                                    <strong>{request.approved_events || request.requested_events}</strong>
                                </div>
                                <div className="summary-item highlight">
                                    <span>Price:</span>
                                    <strong>{formatCurrency(request.final_price || request.proposed_price)}/month</strong>
                                </div>
                            </div>
                            <p className="warning-text">This action cannot be undone. Your custom plan will be activated immediately.</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowAcceptModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleAcceptOffer}>Yes, Accept Offer</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Decline Confirmation Modal */}
            {showDeclineModal && (
                <div className="modal-overlay" onClick={() => setShowDeclineModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Decline Offer</h3>
                            <button className="close-btn" onClick={() => setShowDeclineModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p>Please provide a reason for declining (optional):</p>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Let us know why you're declining this offer..."
                                rows="3"
                            />
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowDeclineModal(false)}>Cancel</button>
                            <button className="btn-danger" onClick={handleDeclineOffer}>Decline Offer</button>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </>
    );
};

export default RequestDetails;