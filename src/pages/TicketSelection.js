import React from "react";
import "./selection.css";
import { Link } from "react-router-dom";
import { FiMail } from "react-icons/fi"; // email icon

function TicketSelection() {
  return (
    <div className="ticket-wrapper">

      <div className="ticket-container">
        <h2 className="ticket-title">Open New Support Request</h2>
        <p className="ticket-subtitle">
         Having trouble with your RSVP event? Select the relevant support department below
        </p>

        <div className="ticket-list">

          <Link to="/support-ticket?dept=general" className="ticket-item">
            <FiMail className="ticket-icon" />
            <div>
              <h3>General Support</h3>
              <p>Issues related to RSVP features & guest lists.</p>
            </div>
          </Link>

          <Link to="/support-ticket?dept=technical" className="ticket-item">
            <FiMail className="ticket-icon" />
            <div>
              <h3>Technical Issues</h3>
              <p>System errors, login problems, loading issues.</p>
            </div>
          </Link>

          <Link to="/support-ticket?dept=accounts" className="ticket-item">
            <FiMail className="ticket-icon" />
            <div>
              <h3>Billing & Accounts</h3>
              <p>Billing issues and account configuration queries.</p>
            </div>
          </Link>

          <Link to="/support-ticket?dept=event" className="ticket-item">
            <FiMail className="ticket-icon" />
            <div>
              <h3>Event Management Help</h3>
              <p>Help with event setup & attendee limits.</p>
            </div>
          </Link>

        </div>
      </div>

    </div>
  );
}

export default TicketSelection;
