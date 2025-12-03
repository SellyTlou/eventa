import React, { useState } from "react";
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

  const [attachment, setAttachment] = useState(null); // new state for file

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    setAttachment(e.target.files[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Submitted Ticket:", formData, "Attachment:", attachment);
    alert("Support ticket submitted!");
    // TODO: send formData + attachment to backend or API
  };

  return (
    <div className="support-container">
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

        <button type="submit" className="btn">Submit Ticket</button>
      </form>
    </div>
  );
}
