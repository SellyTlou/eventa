import React from 'react';
import "./customPlanRequestTab.css";
const CustomPlanRequestsTab = ({ 
    requests, 
    loading, 
    statusFilter, 
    onStatusFilterChange, 
    onViewDetails,
    onRefresh,
    formatDate 
}) => {
    
    const getStatusBadgeClass = (status) => {
        const classes = {
            'pending': 'status-pending',
            'reviewed': 'status-review',
            'approved': 'status-approved',
            'rejected': 'status-rejected',
            'completed': 'status-completed'
        };
        return classes[status] || 'status-pending';
    };

    const getEventTypeLabel = (type) => {
        const types = {
            'conference': 'Conference',
            'corporate_event': 'Corporate Event',
            'product_launch': 'Product Launch',
            'networking': 'Networking',
            'workshop': 'Workshop/Training',
            'seminar': 'Seminar',
            'trade_show': 'Trade Show',
            'gala': 'Gala/Dinner',
            'team_building': 'Team Building',
            'other': 'Other'
        };
        return types[type] || type;
    };

  return (
    <div className="custom-requests-tab">
        <div className="admin-content-header">
            <h2>Custom Plan Requests</h2>
            <div className="header-actions">
                <div className="filter-controls">
                    <select 
                        value={statusFilter} 
                        onChange={(e) => onStatusFilterChange(e.target.value)}
                        className="status-filter"
                    >
                         <option value="all">All Requests</option>
                        <option value="pending">Pending</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="completed">Completed</option>
                       
                    </select>
                    
                    <button 
                        className="refresh-btn" 
                        onClick={onRefresh}
                        disabled={loading}
                    >
                        <i className="bi bi-arrow-clockwise"></i> Refresh
                    </button>
                </div>
            </div>
        </div>

        {loading ? (
            <div className="loading-container">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="loading-text">Loading requests...</p>
            </div>
        ) : (
            <div className="requests-table-container">
                {requests.length === 0 ? (
                    <div className="no-data">
                        <i className="bi bi-inbox"></i>
                        <p>No custom plan requests found</p>
                        <p>When business users submit custom plan requests, they will appear here.</p>
                    </div>
                ) : (
                    <div className="requests-table">
                        <div className="table-header">
                            <span>Date</span>
                            <span>Business</span>
                            <span>Contact</span>
                            <span>Event</span>
                            <span>Attendees</span>
                            <span>Status</span>
                            <span>Payment</span>
                            <span>Actions</span>
                        </div>

                        <div className="table-body">
                            {requests.map(request => (
                                <div key={request.request_id} className="table-row">
                                    <span className="date-cell">
                                        {formatDate ? formatDate(request.created_at) : new Date(request.created_at).toLocaleDateString()}
                                    </span>
                                    
                                    <span className="business-info">
                                        <div className="business-name">{request.business_name}</div>
                                        <small>{request.contact_name}</small>
                                    </span>
                                    
                                    <span>
                                        <div className="contact-email">{request.email}</div>
                                        <small className="contact-phone">{request.phone}</small>
                                    </span>
                                    
                                    <span className="event-info">
                                        <div className="event-name">{request.event_name}</div>
                                        <small className="event-type">{getEventTypeLabel(request.event_type)}</small>
                                    </span>
                                    
                                    <span className="attendees-cell">
                                        {request.expected_attendees}
                                    </span>
                                    
                                    <span>
                                        <span className={`status-badge status-${request.status}`}>
                                            {request.status}
                                        </span>
                                    </span>
                                    
                                    <span>
                                        <span className={`payment-badge payment-${request.payment_status === 'completed' ? 'completed' : request.payment_status === 'pending' ? 'pending' : 'na'}`}>
                                            {request.payment_status || 'N/A'}
                                        </span>
                                    </span>
                                    
                                    <span className="action-buttons">
                                        <button
                                            className="view-btn"
                                            onClick={() => onViewDetails(request)}
                                            title="View Details"
                                        >
                                            <i className="bi bi-eye"></i>
                                        </button>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}
    </div>
);
};

export default CustomPlanRequestsTab;