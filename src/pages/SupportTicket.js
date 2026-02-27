import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { DEPARTMENTS, DEPARTMENT_OPTIONS, PRIORITIES, URL_DEPT_MAP } from "./ticketConstants";
import { FiArrowLeft, FiPaperclip, FiSend, FiAlertCircle, FiCheckCircle, FiInfo } from "react-icons/fi";
import "./ticketsupport.css";

export default function SupportTicket() {
  const location = useLocation();
  const navigate = useNavigate();

  // Get department from URL and map to correct value
  const queryParams = new URLSearchParams(location.search);
  const urlDept = queryParams.get('dept') || 'general';
  const initialDepartment = URL_DEPT_MAP[urlDept] || DEPARTMENTS.GENERAL;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    department: initialDepartment,
    priority: PRIORITIES.MEDIUM,
    message: ""
  });

  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });
  const [charCount, setCharCount] = useState(0);
  
  // Get admin user from localStorage if available
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isLoggedIn = user && user.user_id;

  // Pre-fill form if user is logged in
  useEffect(() => {
    if (isLoggedIn) {
      setFormData(prev => ({
        ...prev,
        name: `${user.name || ''} ${user.lastname || ''}`.trim(),
        email: user.email || ''
      }));
    }
  }, [isLoggedIn, user.name, user.lastname, user.email]);

  // Update character count when message changes
  useEffect(() => {
    setCharCount(formData.message.length);
  }, [formData.message]);

  const printAlert = (message, type = 'info') => {
    setAlert({ show: true, message, type });
    setTimeout(() => {
      setAlert({ show: false, message: '', type: '' });
    }, 5000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        printAlert("File size must be less than 5MB", 'error');
        e.target.value = null;
        return;
      }
      setAttachment(file);
    }
  };

  const handleBack = () => {
    navigate('/ticket-selection');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use consistent API URL - from env or fallback
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';
      
      const formDataToSend = new FormData();
      formDataToSend.append("function", "submitTicket");
      formDataToSend.append("name", formData.name);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("subject", formData.subject);
      formDataToSend.append("department", formData.department);
      formDataToSend.append("priority", formData.priority);
      formDataToSend.append("message", formData.message);
      
      // Include user ID if logged in
      if (isLoggedIn) {
        formDataToSend.append("user_id", user.user_id);
      }
      
      if (attachment) formDataToSend.append("attachment", attachment);

      const response = await fetch(`${API_BASE_URL}/query.php`, {
        method: "POST",
        body: formDataToSend
      });

      const result = await response.json();

      if (result.success) {
        printAlert("Support ticket submitted successfully!", 'success');
        setFormData({
          name: isLoggedIn ? `${user.name} ${user.lastname}`.trim() : "",
          email: isLoggedIn ? user.email : "",
          subject: "",
          department: DEPARTMENTS.GENERAL,
          priority: PRIORITIES.MEDIUM,
          message: ""
        });
        setAttachment(null);
        
        setTimeout(() => {
          navigate('/ticket-selection');
        }, 2000);
      } else {
        printAlert(result.message || "Failed to submit ticket", 'error');
      }
    } catch (error) {
      console.error("Error:", error);
      printAlert("An error occurred while submitting the ticket", 'error');
    } finally {
      setLoading(false);
    }
  };

  // Get icon for alert type
  const getAlertIcon = (type) => {
    switch(type) {
      case 'success': return <FiCheckCircle />;
      case 'error': return <FiAlertCircle />;
      default: return <FiInfo />;
    }
  };

  return (
    <div className="support-ticket-page">
      {alert.show && (
        <div className={`custom-alert ${alert.type}`}>
          <div className="alert-content">
            {getAlertIcon(alert.type)}
            <span className="alert-message">{alert.message}</span>
            <button className="alert-close" onClick={() => setAlert({ show: false, message: '', type: '' })}>×</button>
          </div>
        </div>
      )}

      <div className="support-ticket-container">
        {/* Header with back button */}
        <div className="ticket-header">
          <button className="back-button" onClick={handleBack}>
            <FiArrowLeft />
            <span>Back to Departments</span>
          </button>
          <div className="header-content">
            <h1>Open Support Ticket</h1>
            <p className="subtitle">Submit your issue and our team will assist you within 2 hours.</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="progress-steps">
          <div className="step completed">
            <span className="step-number">1</span>
            <span className="step-label">Select Department</span>
          </div>
          <div className="step active">
            <span className="step-number">2</span>
            <span className="step-label">Fill Details</span>
          </div>
          <div className="step">
            <span className="step-number">3</span>
            <span className="step-label">Submit</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="ticket-form">
          <div className="form-grid">
            {/* Personal Information Section */}
            <div className="form-section">
              <h3 className="section-title">Personal Information</h3>
              <div className="form-group">
                <label htmlFor="name">
                  Full Name <span className="required">*</span>
                </label>
                <input 
                  id="name"
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  required 
                  disabled={isLoggedIn}
                  placeholder="Enter your full name"
                  className={isLoggedIn ? 'auto-filled' : ''}
                />
                {isLoggedIn && <small className="field-note">Auto-filled from your account</small>}
              </div>

              <div className="form-group">
                <label htmlFor="email">
                  Email Address <span className="required">*</span>
                </label>
                <input 
                  id="email"
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  required 
                  disabled={isLoggedIn}
                  placeholder="Enter your email address"
                  className={isLoggedIn ? 'auto-filled' : ''}
                />
                {isLoggedIn && <small className="field-note">Auto-filled from your account</small>}
              </div>
            </div>

            {/* Ticket Details Section */}
            <div className="form-section">
              <h3 className="section-title">Ticket Details</h3>
              <div className="form-group">
                <label htmlFor="subject">
                  Subject <span className="required">*</span>
                </label>
                <input 
                  id="subject"
                  name="subject" 
                  value={formData.subject} 
                  onChange={handleChange} 
                  required 
                  placeholder="Brief summary of your issue"
                />
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label htmlFor="department">
                    Department <span className="required">*</span>
                  </label>
                  <select 
                    id="department"
                    name="department" 
                    value={formData.department} 
                    onChange={handleChange}
                    required
                  >
                    {DEPARTMENT_OPTIONS.map(dept => (
                      <option key={dept.value} value={dept.value}>
                        {dept.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group half">
                  <label htmlFor="priority">
                    Priority <span className="required">*</span>
                  </label>
                  <select 
                    id="priority"
                    name="priority" 
                    value={formData.priority} 
                    onChange={handleChange} 
                    required
                  >
                    <option value={PRIORITIES.LOW}>🐢 Low</option>
                    <option value={PRIORITIES.MEDIUM}>⚡ Medium</option>
                    <option value={PRIORITIES.HIGH}>🔥 High</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Message Section */}
          <div className="form-section full-width">
            <h3 className="section-title">Message</h3>
            <div className="form-group">
              <label htmlFor="message">
                Describe Your Issue <span className="required">*</span>
              </label>
              <textarea 
                id="message"
                name="message" 
                rows="6" 
                value={formData.message} 
                onChange={handleChange} 
                required
                placeholder="Please provide as much detail as possible..."
                maxLength="2000"
              ></textarea>
              <div className="char-counter">
                <span className={charCount > 1800 ? 'warning' : ''}>
                  {charCount}/2000 characters
                </span>
              </div>
            </div>
          </div>

          {/* Attachment Section */}
          <div className="form-section full-width">
            <h3 className="section-title">Attachments</h3>
            <div className="form-group attachment-group">
              <label htmlFor="attachment" className="attachment-label">
                <FiPaperclip />
                <span>Upload File (Optional)</span>
              </label>
              <input 
                id="attachment"
                type="file" 
                onChange={handleFileChange} 
                className="file-input"
              />
              {attachment && (
                <div className="file-preview">
                  <span className="file-name">{attachment.name}</span>
                  <span className="file-size">
                    ({(attachment.size / 1024).toFixed(1)} KB)
                  </span>
                  <button 
                    type="button" 
                    className="remove-file"
                    onClick={() => setAttachment(null)}
                  >
                    ×
                  </button>
                </div>
              )}
              <small className="attachment-hint">
                Max file size: 5MB. Supported: Images, PDF, DOC, TXT
              </small>
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={handleBack}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Submitting...
                </>
              ) : (
                <>
                  <FiSend />
                  Submit Ticket
                </>
              )}
            </button>
          </div>
        </form>

        {/* Support Info */}
        <div className="support-info">
          <div className="info-item">
            <FiInfo />
            <span>Our team typically responds within 2 hours during business hours</span>
          </div>
          <div className="info-item">
            <FiAlertCircle />
            <span>For urgent issues, please use our live chat or call support</span>
          </div>
        </div>
      </div>
    </div>
  );
}