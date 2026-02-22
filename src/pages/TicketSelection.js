import React from "react";
import { Link } from "react-router-dom";
import { FiMail } from "react-icons/fi";
import { DEPARTMENTS, URL_DEPT_MAP } from "./ticketConstants"; // Import
import "./selection.css";

function TicketSelection() {
  // Build department links dynamically from constants
  const departmentLinks = [
    { 
      dept: 'general', 
      title: 'General Support', 
      desc: 'Issues related to RSVP features & guest lists.',
      icon: <FiMail className="ticket-icon" />
    },
    { 
      dept: 'technical', 
      title: 'Technical Issues', 
      desc: 'System errors, login problems, loading issues.',
      icon: <FiMail className="ticket-icon" />
    },
    { 
      dept: 'accounts', 
      title: 'Billing & Accounts', 
      desc: 'Billing issues and account configuration queries.',
      icon: <FiMail className="ticket-icon" />
    },
    { 
      dept: 'event', 
      title: 'Event Management Help', 
      desc: 'Help with event setup & attendee limits.',
      icon: <FiMail className="ticket-icon" />
    },
    { 
      dept: 'sales', 
      title: 'Sales', 
      desc: 'Questions about pricing and packages.',
      icon: <FiMail className="ticket-icon" />
    },
    { 
      dept: 'rsvp', 
      title: 'RSVP Issues', 
      desc: 'Problems with RSVP forms and responses.',
      icon: <FiMail className="ticket-icon" />
    }
  ];

  return (
    <div className="ticket-wrapper">
      <div className="ticket-container">
        <h2 className="ticket-title">Open New Support Request</h2>
        <p className="ticket-subtitle">
          Having trouble? Select the relevant support department below
        </p>

        <div className="ticket-list">
          {departmentLinks.map(item => (
            <Link 
              key={item.dept}
              to={`/support-ticket?dept=${item.dept}`} 
              className="ticket-item"
            >
              {item.icon}
              <div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TicketSelection;