import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ticketsupport.css";

export default function SupportTicket() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    department: "support",
    priority: "medium",
    message: ""
  });

  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });
  const navigate = useNavigate();

  const printAlert = (message, type = 'info') => {
    setAlert({ show: true, message, type });
    setTimeout(() => {
      setAlert({ show: false, message: '', type: '' });
    }, 5000);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    setAttachment(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const API_URL = process.env.REACT_APP_API_URL || `../php`;
      const formDataToSend = new FormData();
      formDataToSend.append("function", "submitTicket");
      formDataToSend.append("name", formData.name);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("subject", formData.subject);
      formDataToSend.append("department", formData.department);
      formDataToSend.append("priority", formData.priority);
      formDataToSend.append("message", formData.message);
      if (attachment) formDataToSend.append("attachment", attachment);

      const response = await fetch(`${API_URL}/query.php`, {
        method: "POST",
        body: formDataToSend
      });

      const result = await response.json();

      if (result.success) {
        printAlert("Support ticket submitted successfully!", 'success');
        // Clear form
        setFormData({
          name: "",
          email: "",
          subject: "",
          department: "support",
          priority: "medium",
          message: ""
        });
        setAttachment(null);
        // Navigate back to ticket selection after a short delay
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
      {/* Custom Alert */}
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
          <label>Name</label>
          <input name="name" value={formData.name} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Email Address</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Subject</label>
          <input name="subject" value={formData.subject} onChange={handleChange} required />
        </div>

        <div className="row">
          <div className="form-group half">
            <label>Department</label>
            <select name="department" value={formData.department} onChange={handleChange}>
              <option value="support">Support</option>
              <option value="technical">Technical</option>
              <option value="billing">Billing</option>
            </select>
          </div>

          <div className="form-group half">
            <label>Priority</label>
            <select name="priority" value={formData.priority} onChange={handleChange}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Message</label>
          <textarea name="message" rows="6" value={formData.message} onChange={handleChange} required></textarea>
        </div>

        {/* New attachment input */}
        <div className="form-group">
          <label>Attachment (optional)</label>
          <input type="file" onChange={handleFileChange} />
          {attachment && <p>Selected file: {attachment.name}</p>}
        </div>

        <button type="submit" className="btn" disabled={loading}>
          {loading ? "Submitting..." : "Submit Ticket"}
        </button>
      </form>
    </div>
  );
}
