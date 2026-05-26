import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginNav, Footer } from '../components';
import './MyRequests.css';

const MyRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [alert, setAlert] = useState({ show: false, message: '', type: '' });
    
    const navigate = useNavigate();
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
        fetchUserRequests(userData.user_id);
    }, [navigate]);

    const fetchUserRequests = async (userId) => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('function', 'getUserCustomPlanRequests');
            formData.append('user_id', userId);

            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            console.log('Fetched requests:', data);
            if (data.success) {
                setRequests(data.requests);
            } else {
                showAlert('Failed to load requests', 'error');
            }
        } catch (error) {
            console.error('Error fetching requests:', error);
            showAlert('Error loading requests', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showAlert = (message, type) => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000);
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

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
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

    const handleViewDetails = (requestId) => {
        navigate(`/request-details/${requestId}`);
    };

    const handleNewRequest = () => {
        navigate('/custom-plan-request');
    };

    return (
        <>
            <LoginNav />
            
            <div className="my-requests-page">
                <div className="container">
                    {/* Header */}
                    <div className="page-header">
                        <div className="header-content">
                            <h1>My Custom Plan Requests</h1>
                            <p className="lead">
                                Track the status of your custom plan requests and respond to offers
                            </p>
                        </div>
                        <button className="btn-new-request" onClick={handleNewRequest}>
                            <i className="bi bi-plus-circle"></i>
                            New Request
                        </button>
                    </div>

                    {/* Alert */}
                    {alert.show && (
                        <div className={`custom-alert ${alert.type}`}>
                            <i className={`fas ${alert.type === "error" ? "fa-times-circle" : "fa-check-circle"}`}></i>
                            <span>{alert.message}</span>
                        </div>
                    )}

                    {/* Requests List */}
                    {loading ? (
                        <div className="loading-container">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <p>Loading your requests...</p>
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">
                                <i className="bi bi-file-text"></i>
                            </div>
                            <h3>No Custom Plan Requests</h3>
                            <p>You haven't submitted any custom plan requests yet.</p>
                            <button className="btn-start-request" onClick={handleNewRequest}>
                                <i className="bi bi-send"></i>
                                Submit Your First Request
                            </button>
                        </div>
                    ) : (
                        <div className="requests-list">
                            {requests.map((request) => (
                                <div key={request.request_id} className="request-card">
                                    <div className="request-header">
                                        <div className="request-title">
                                            <h3>{request.event_name}</h3>
                                            <span className="request-date">
                                                <i className="bi bi-calendar"></i>
                                                {formatDate(request.created_at)}
                                            </span>
                                        </div>
                                        {getStatusBadge(request.status)}
                                    </div>

                                    <div className="request-details">
                                        <div className="detail-grid">
                                            <div className="detail-item">
                                                <label>Requested Guests</label>
                                                <span className="detail-value">
                                                    <i className="bi bi-people"></i>
                                                    {request.requested_guests?.toLocaleString() || 'N/A'}
                                                </span>
                                            </div>
                                            <div className="detail-item">
                                                <label>Requested Events</label>
                                                <span className="detail-value">
                                                    <i className="bi bi-calendar-event"></i>
                                                    {request.requested_events || 'N/A'} /month
                                                </span>
                                            </div>
                                            <div className="detail-item">
                                                <label>Proposed Price</label>
                                                <span className="detail-value">
                                                    <i className="bi bi-currency-dollar"></i>
                                                    {formatCurrency(request.proposed_price)}
                                                </span>
                                            </div>
                                            <div className="detail-item">
                                                <label>Event Type</label>
                                                <span className="detail-value">
                                                    <i className="bi bi-tag"></i>
                                                    {request.event_type?.replace('_', ' ') || 'N/A'}
                                                </span>
                                            </div>
                                        </div>

                                        {request.admin_notes && (
                                            <div className="admin-note">
                                                <i className="bi bi-chat-dots"></i>
                                                <strong>Admin note:</strong> {request.admin_notes}
                                            </div>
                                        )}
                                    </div>

                                    <div className="request-actions">
                                        <button 
                                            className="btn-view-details"
                                            onClick={() => handleViewDetails(request.request_id)}
                                        >
                                            <i className="bi bi-eye"></i>
                                            View Details
                                        </button>
                                        {request.status === 'countered' && (
                                            <button className="btn-respond blink">
                                                <i className="bi bi-chat"></i>
                                                Respond to Offer
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <Footer />
        </>
    );
};

export default MyRequests;