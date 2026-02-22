import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { DEPARTMENTS, DEPARTMENT_OPTIONS, PRIORITIES, URL_DEPT_MAP } from "./ticketConstants";
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
    department: initialDepartment, // Use mapped value
    priority: PRIORITIES.MEDIUM,
    message: ""
  });

  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });
  
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
  }, []);

  const printAlert = (message, type = 'info') => {
    setAlert({ show: true, message, type });
    setTimeout(() => {
      setAlert({ show: false, message: '', type: '' });
    }, 5000);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleFileChange = (e) => setAttachment(e.target.files[0]);

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
      formDataToSend.append("department", formData.department); // Now consistent!
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

  return (
    <div className="support-container">
      {alert.show && (
        <div className={`custom-alert ${alert.type}`}>
          <div className="alert-content">
            <span className="alert-message">{alert.message}</span>
            <button className="alert-close" onClick={() => setAlert({ show: false, message: '', type: '' })}>×</button>
          </div>
        </div>
      )}

      <h2>Open Support Ticket</h2>
      <p className="subtitle">Submit your issue and our team will assist you.</p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Name *</label>
          <input 
            name="name" 
            value={formData.name} 
            onChange={handleChange} 
            required 
            disabled={isLoggedIn} // Auto-filled, can't edit
          />
        </div>

        <div className="form-group">
          <label>Email Address *</label>
          <input 
            type="email" 
            name="email" 
            value={formData.email} 
            onChange={handleChange} 
            required 
            disabled={isLoggedIn} // Auto-filled, can't edit
          />
        </div>

        <div className="form-group">
          <label>Subject *</label>
          <input name="subject" value={formData.subject} onChange={handleChange} required />
        </div>

        <div className="row">
          <div className="form-group half">
            <label>Department *</label>
            <select 
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
            <label>Priority *</label>
            <select name="priority" value={formData.priority} onChange={handleChange} required>
              <option value={PRIORITIES.LOW}>Low</option>
              <option value={PRIORITIES.MEDIUM}>Medium</option>
              <option value={PRIORITIES.HIGH}>High</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Message *</label>
          <textarea 
            name="message" 
            rows="6" 
            value={formData.message} 
            onChange={handleChange} 
            required
            placeholder="Please describe your issue in detail..."
          ></textarea>
        </div>

        <div className="form-group">
          <label>Attachment (optional)</label>
          <input type="file" onChange={handleFileChange} />
          {attachment && <p className="file-name">Selected: {attachment.name}</p>}
        </div>

        <button type="submit" className="btn" disabled={loading}>
          {loading ? "Submitting..." : "Submit Ticket"}
        </button>
      </form>
    </div>
  );
}