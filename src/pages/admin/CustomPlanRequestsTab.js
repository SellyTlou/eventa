import React from 'react';

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
        <div className="admin-tab-content">
            <div className="admin-content-header">
                <h2>Custom Plan Requests</h2>
                <div className="header-actions">
                    <div className="filter-controls">
                        <select 
                            value={statusFilter} 
                            onChange={(e) => onStatusFilterChange(e.target.value)}
                            className="status-filter"
                            style={{
                                padding: '8px 15px',
                                borderRadius: '6px',
                                border: '1px solid #ddd',
                                marginRight: '10px'
                            }}
                        >
                            <option value="pending">Pending</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="completed">Completed</option>
                            <option value="all">All Requests</option>
                        </select>
                        
                        <button 
                            className="btn btn-outline" 
                            onClick={onRefresh}
                            disabled={loading}
                            style={{
                                padding: '8px 20px',
                                borderRadius: '6px',
                                border: '1px solid #667eea',
                                background: 'white',
                                color: '#667eea',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}
                        >
                            <i className="bi bi-arrow-clockwise"></i> Refresh
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading" style={{ textAlign: 'center', padding: '50px' }}>
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p style={{ marginTop: '15px', color: '#666' }}>Loading requests...</p>
                </div>
            ) : (
                <div className="requests-table-container" style={{
                    background: 'white',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    marginTop: '20px'
                }}>
                    {requests.length === 0 ? (
                        <div className="no-data" style={{
                            textAlign: 'center',
                            padding: '60px 20px',
                            color: '#999'
                        }}>
                            <i className="bi bi-inbox" style={{ fontSize: '48px', display: 'block', marginBottom: '15px' }}></i>
                            <p style={{ fontSize: '16px', marginBottom: '10px' }}>No custom plan requests found</p>
                            <p style={{ fontSize: '14px' }}>When business users submit custom plan requests, they will appear here.</p>
                        </div>
                    ) : (
                        <div className="requests-table">
                            <div className="table-header" style={{
                                display: 'grid',
                                gridTemplateColumns: '120px 1.5fr 1.5fr 1.5fr 100px 100px 80px',
                                padding: '15px 20px',
                                background: '#f8f9fa',
                                fontWeight: '600',
                                color: '#333',
                                borderBottom: '2px solid #e0e0e0'
                            }}>
                                <span>Date</span>
                                <span>Business</span>
                                <span>Contact</span>
                                <span>Event</span>
                                <span>Attendees</span>
                                <span>Status</span>
                                <span>Actions</span>
                            </div>

                            <div className="table-body">
                                {requests.map(request => (
                                    <div key={request.request_id} className="table-row" style={{
                                        display: 'grid',
                                        gridTemplateColumns: '120px 1.5fr 1.5fr 1.5fr 100px 100px 80px',
                                        padding: '15px 20px',
                                        borderBottom: '1px solid #e0e0e0',
                                        alignItems: 'center'
                                    }}>
                                        <span className="date-cell">
                                            {formatDate ? formatDate(request.created_at) : new Date(request.created_at).toLocaleDateString()}
                                        </span>
                                        
                                        <span className="business-info">
                                            <div className="business-name" style={{ fontWeight: '500', color: '#333' }}>{request.business_name}</div>
                                            <small className="text-muted" style={{ color: '#999', fontSize: '12px' }}>{request.contact_name}</small>
                                        </span>
                                        
                                        <span>
                                            <div>{request.email}</div>
                                            <small className="text-muted" style={{ color: '#999', fontSize: '12px' }}>{request.phone}</small>
                                        </span>
                                        
                                        <span className="event-info">
                                            <div className="event-name" style={{ fontWeight: '500', color: '#333' }}>{request.event_name}</div>
                                            <small className="text-muted" style={{ color: '#999', fontSize: '12px' }}>
                                                {getEventTypeLabel(request.event_type)}
                                            </small>
                                        </span>
                                        
                                        <span className="attendees-cell" style={{ fontWeight: '600', color: '#667eea' }}>
                                            {request.expected_attendees}
                                        </span>
                                        
                                        <span>
                                            <span className={`status-badge ${getStatusBadgeClass(request.status)}`} style={{
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                textTransform: 'capitalize',
                                                ...(request.status === 'pending' && { background: '#fff3cd', color: '#856404' }),
                                                ...(request.status === 'reviewed' && { background: '#cce5ff', color: '#004085' }),
                                                ...(request.status === 'approved' && { background: '#d4edda', color: '#155724' }),
                                                ...(request.status === 'rejected' && { background: '#f8d7da', color: '#721c24' }),
                                                ...(request.status === 'completed' && { background: '#d1e7dd', color: '#0f5132' })
                                            }}>
                                                {request.status}
                                            </span>
                                        </span>
                                        
                                        <span className="actions">
                                            <button
                                                className="btn-icon view-btn"
                                                onClick={() => onViewDetails(request)}
                                                title="View Details"
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#667eea',
                                                    cursor: 'pointer',
                                                    fontSize: '18px',
                                                    padding: '5px'
                                                }}
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