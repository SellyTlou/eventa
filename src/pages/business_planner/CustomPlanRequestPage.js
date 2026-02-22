import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginNav, Footer } from '../components';
import './CustomPlanRequestPage.css';

const CustomPlanRequestPage = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', type: '' });
    
    const [formData, setFormData] = useState({
        business_name: '',
        contact_name: '',
        email: '',
        phone: '',
        event_type: '',
        event_name: '',
        event_description: '',
        // NEW FIELDS - What the business wants
        requested_guests: '',
        requested_events: '',
        proposed_price: '',
        desired_features: '',
        // Keep existing fields
        event_date: '',
        special_requirements: '',
        additional_notes: ''
    });

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';

    // Check if user is logged in and is a business account
    useEffect(() => {
        const userJson = localStorage.getItem('user');
        if (!userJson) {
            // Redirect to home if not logged in
            navigate('/');
            return;
        }
        
        const currentUser = JSON.parse(userJson);
        
        // Check if user is business account
        if (currentUser.account_type !== 'business') {
            // Redirect business users to their dashboard
            navigate('/businessdashboard');
            return;
        }
        
        setUser(currentUser);
        
        // Pre-fill form with user data
        setFormData(prev => ({
            ...prev,
            business_name: currentUser.business_name || '',
            contact_name: `${currentUser.name || ''} ${currentUser.lastname || ''}`.trim(),
            email: currentUser.email || '',
            phone: currentUser.phone || ''
        }));
    }, [navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const showAlert = (message, type) => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation - including new fields
        if (!formData.event_name || !formData.event_type || 
            !formData.requested_guests || !formData.requested_events || !formData.proposed_price) {
            showAlert('Please fill in all required fields including your guest count, event count, and proposed price', 'error');
            return;
        }

        setLoading(true);

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('function', 'submitCustomPlanRequest');
            formDataToSend.append('user_id', user.user_id);
            formDataToSend.append('business_name', formData.business_name);
            formDataToSend.append('contact_name', formData.contact_name);
            formDataToSend.append('email', formData.email);
            formDataToSend.append('phone', formData.phone);
            formDataToSend.append('event_type', formData.event_type);
            formDataToSend.append('event_name', formData.event_name);
            formDataToSend.append('event_description', formData.event_description);
            
            // NEW FIELDS - Send what the business wants
            formDataToSend.append('requested_guests', formData.requested_guests);
            formDataToSend.append('requested_events', formData.requested_events);
            formDataToSend.append('proposed_price', formData.proposed_price);
            formDataToSend.append('desired_features', formData.desired_features);
            
            // Keep existing fields for backward compatibility
            formDataToSend.append('expected_attendees', formData.requested_guests); // Map to old field
            formDataToSend.append('event_date', formData.event_date);
            formDataToSend.append('special_requirements', formData.special_requirements);
            formDataToSend.append('additional_notes', formData.additional_notes);

            const response = await fetch(`${API_BASE_URL}/query.php`, {
                method: 'POST',
                body: formDataToSend
            });

            const data = await response.json();

            if (data.success) {
                showAlert('Your custom plan request has been submitted successfully! Our team will contact you within 24-48 hours.', 'success');
                
                // Clear form
                setFormData(prev => ({
                    ...prev,
                    event_type: '',
                    event_name: '',
                    event_description: '',
                    requested_guests: '',
                    requested_events: '',
                    proposed_price: '',
                    desired_features: '',
                    event_date: '',
                    special_requirements: '',
                    additional_notes: ''
                }));
                
                // Redirect after 3 seconds
                setTimeout(() => {
                    navigate('/businessdashboard');
                }, 3000);
            } else {
                showAlert(data.message || 'Failed to submit request', 'error');
            }
        } catch (error) {
            console.error('Error submitting custom plan request:', error);
            showAlert('Network error. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <>
                <LoginNav />
                <div className="loading-container">
                    <div className="spinner-border text-info" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <div className="loading-text">Verifying account...</div>
                </div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <LoginNav />
            
            <div className="custom-plan-page">
                <div className="container">
                    {/* Header Section */}
                    <div className="page-header">
                        <h1>Request a Custom Event Plan</h1>
                        <p className="lead">
                            Tell us exactly what you need and we'll create a tailored solution for your business
                        </p>
                        <div className="header-badge">
                            <i className="bi bi-building"></i>
                            <span>Business Account: {user.business_name || user.name}</span>
                        </div>
                    </div>

                    {/* Alert Message */}
                    {alert.show && (
                        <div className={`custom-alert ${alert.type}`}>
                            <i className={`fas ${alert.type === "error" ? "fa-times-circle" :
                                alert.type === "success" ? "fa-check-circle" :
                                alert.type === "warning" ? "fa-exclamation-triangle" :
                                "fa-info-circle"
                            }`}></i>
                            <span>{alert.message}</span>
                        </div>
                    )}

                    {/* Main Form */}
                    <div className="custom-plan-form-container">
                        <form onSubmit={handleSubmit} className="custom-plan-form">
                            {/* Business Information Section */}
                            <div className="form-section">
                                <div className="section-header">
                                    <i className="bi bi-building"></i>
                                    <h2>Business Information</h2>
                                </div>
                                
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="business_name">Business Name *</label>
                                        <input
                                            type="text"
                                            id="business_name"
                                            name="business_name"
                                            value={formData.business_name}
                                            onChange={handleChange}
                                            required
                                            placeholder="Your business name"
                                            disabled
                                            className="disabled-input"
                                        />
                                        <small className="field-note">Auto-filled from your account</small>
                                    </div>
                                    
                                    <div className="form-group">
                                        <label htmlFor="contact_name">Contact Person *</label>
                                        <input
                                            type="text"
                                            id="contact_name"
                                            name="contact_name"
                                            value={formData.contact_name}
                                            onChange={handleChange}
                                            required
                                            placeholder="Your full name"
                                            disabled
                                            className="disabled-input"
                                        />
                                        <small className="field-note">Auto-filled from your account</small>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="email">Email *</label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            placeholder="Your email"
                                            disabled
                                            className="disabled-input"
                                        />
                                        <small className="field-note">Auto-filled from your account</small>
                                    </div>
                                    
                                    <div className="form-group">
                                        <label htmlFor="phone">Phone *</label>
                                        <input
                                            type="tel"
                                            id="phone"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            required
                                            placeholder="Your phone number"
                                            disabled
                                            className="disabled-input"
                                        />
                                        <small className="field-note">Auto-filled from your account</small>
                                    </div>
                                </div>
                            </div>

                            {/* What You Need Section - NEW */}
                            <div className="form-section highlight-section">
                                <div className="section-header">
                                    <i className="bi bi-star-fill"></i>
                                    <h2>Tell Us What You Need</h2>
                                </div>
                                <p className="section-description">
                                    Be specific about your requirements. This helps us understand your needs and prepare the right solution.
                                </p>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="requested_guests">How Many Guests Do You Need? *</label>
                                        <input
                                            type="number"
                                            id="requested_guests"
                                            name="requested_guests"
                                            value={formData.requested_guests}
                                            onChange={handleChange}
                                            required
                                            min="1"
                                            placeholder="e.g., 4000"
                                        />
                                        <small className="field-note">Tell us the maximum guest capacity you need</small>
                                    </div>
                                    
                                    <div className="form-group">
                                        <label htmlFor="requested_events">How Many Events Per Month? *</label>
                                        <input
                                            type="number"
                                            id="requested_events"
                                            name="requested_events"
                                            value={formData.requested_events}
                                            onChange={handleChange}
                                            required
                                            min="1"
                                            placeholder="e.g., 50"
                                        />
                                        <small className="field-note">How many events do you plan to create monthly?</small>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="proposed_price">Your Proposed Monthly Budget (R) *</label>
                                        <input
                                            type="number"
                                            id="proposed_price"
                                            name="proposed_price"
                                            value={formData.proposed_price}
                                            onChange={handleChange}
                                            required
                                            min="0"
                                            step="0.01"
                                            placeholder="e.g., 2500"
                                        />
                                        <small className="field-note">What price do you have in mind? We'll work with you to find a fair rate.</small>
                                    </div>
                                    
                                    <div className="form-group">
                                        <label htmlFor="desired_features">Desired Features (Optional)</label>
                                        <textarea
                                            id="desired_features"
                                            name="desired_features"
                                            value={formData.desired_features}
                                            onChange={handleChange}
                                            rows="3"
                                            placeholder="e.g., API access, custom branding, white-labeling, dedicated support, SSO, etc."
                                        />
                                        <small className="field-note">List any specific features your business needs</small>
                                    </div>
                                </div>
                            </div>

                            {/* Event Details Section */}
                            <div className="form-section">
                                <div className="section-header">
                                    <i className="bi bi-calendar-event"></i>
                                    <h2>Event Details</h2>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="event_type">Event Type *</label>
                                        <select
                                            id="event_type"
                                            name="event_type"
                                            value={formData.event_type}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="">Select event type</option>
                                            <option value="conference">Conference</option>
                                            <option value="corporate_event">Corporate Event</option>
                                            <option value="product_launch">Product Launch</option>
                                            <option value="networking">Networking Event</option>
                                            <option value="workshop">Workshop/Training</option>
                                            <option value="seminar">Seminar</option>
                                            <option value="trade_show">Trade Show</option>
                                            <option value="gala">Gala/Dinner</option>
                                            <option value="team_building">Team Building</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    
                                    <div className="form-group">
                                        <label htmlFor="event_name">Event Name *</label>
                                        <input
                                            type="text"
                                            id="event_name"
                                            name="event_name"
                                            value={formData.event_name}
                                            onChange={handleChange}
                                            required
                                            placeholder="Name of your event"
                                        />
                                    </div>
                                </div>

                                <div className="form-group full-width">
                                    <label htmlFor="event_description">Event Description</label>
                                    <textarea
                                        id="event_description"
                                        name="event_description"
                                        value={formData.event_description}
                                        onChange={handleChange}
                                        rows="4"
                                        placeholder="Briefly describe your event (purpose, theme, activities, etc.)"
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="event_date">Event Date (if known)</label>
                                        <input
                                            type="date"
                                            id="event_date"
                                            name="event_date"
                                            value={formData.event_date}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        {/* Empty for layout balance */}
                                    </div>
                                </div>
                            </div>

                            {/* Additional Information Section */}
                            <div className="form-section">
                                <div className="section-header">
                                    <i className="bi bi-pencil"></i>
                                    <h2>Additional Information</h2>
                                </div>

                                <div className="form-group full-width">
                                    <label htmlFor="special_requirements">Special Requirements</label>
                                    <textarea
                                        id="special_requirements"
                                        name="special_requirements"
                                        value={formData.special_requirements}
                                        onChange={handleChange}
                                        rows="3"
                                        placeholder="Any special requirements? (e.g., custom branding, integrations, accessibility needs, etc.)"
                                    />
                                </div>

                                <div className="form-group full-width">
                                    <label htmlFor="additional_notes">Additional Notes</label>
                                    <textarea
                                        id="additional_notes"
                                        name="additional_notes"
                                        value={formData.additional_notes}
                                        onChange={handleChange}
                                        rows="3"
                                        placeholder="Any other information you'd like to share with our team"
                                    />
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={() => navigate('/businessdashboard')}
                                >
                                    <i className="bi bi-arrow-left"></i>
                                    Cancel
                                </button>
                                
                                <button
                                    type="submit"
                                    className="btn-submit"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-send"></i>
                                            Submit Request
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Form Footer Note */}
                            <div className="form-footer-note">
                                <i className="bi bi-info-circle"></i>
                                <p>
                                    Our team will review your specific requirements and contact you within 24-48 hours to discuss your custom plan.
                                    The more details you provide, the better we can tailor a solution for your business.
                                </p>
                            </div>
                        </form>

                        {/* Sidebar with helpful information */}
                        <div className="custom-plan-sidebar">
                            <div className="info-card">
                                <h3>What happens next?</h3>
                                <ol className="process-list">
                                    <li>
                                        <span className="step-number">1</span>
                                        <div className="step-content">
                                            <strong>Tell Us Your Needs</strong>
                                            <p>Fill in your guest count, event volume, and budget</p>
                                        </div>
                                    </li>
                                    <li>
                                        <span className="step-number">2</span>
                                        <div className="step-content">
                                            <strong>Review Period</strong>
                                            <p>Our team reviews your requirements (24-48 hours)</p>
                                        </div>
                                    </li>
                                    <li>
                                        <span className="step-number">3</span>
                                        <div className="step-content">
                                            <strong>Consultation Call</strong>
                                            <p>We'll contact you to discuss your custom plan</p>
                                        </div>
                                    </li>
                                    <li>
                                        <span className="step-number">4</span>
                                        <div className="step-content">
                                            <strong>Custom Solution</strong>
                                            <p>We create a tailored solution based on YOUR needs</p>
                                        </div>
                                    </li>
                                </ol>
                            </div>

                            <div className="info-card">
                                <h3>Example: What to Include</h3>
                                <ul className="benefits-list">
                                    <li>
                                        <i className="bi bi-people-fill"></i>
                                        <span><strong>Guests:</strong> 4000 attendees</span>
                                    </li>
                                    <li>
                                        <i className="bi bi-calendar-check-fill"></i>
                                        <span><strong>Events:</strong> 50 events per month</span>
                                    </li>
                                    <li>
                                        <i className="bi bi-currency-exchange"></i>
                                        <span><strong>Budget:</strong> R2500/month</span>
                                    </li>
                                    <li>
                                        <i className="bi bi-gear-wide-connected"></i>
                                        <span><strong>Features:</strong> API access, custom branding</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="info-card contact-card">
                                <h3>Need help?</h3>
                                <p>Contact our sales team directly:</p>
                                <a href="tel:1234567890" className="contact-link">
                                    <i className="bi bi-telephone"></i>
                                    +27 123 456 7890
                                </a>
                                <a href="mailto:sales@evendi.co.za" className="contact-link">
                                    <i className="bi bi-envelope"></i>
                                    sales@evendi.co.za
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </>
    );
};

export default CustomPlanRequestPage;