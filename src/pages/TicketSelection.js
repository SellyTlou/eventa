import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  FiMail, 
  FiHelpCircle, 
  FiAlertCircle, 
  FiCreditCard, 
  FiCalendar, 
  FiDollarSign, 
  FiUsers,
  FiHeadphones,
  FiMessageCircle
} from "react-icons/fi";
import { DEPARTMENTS, URL_DEPT_MAP } from "./ticketConstants";
import "./selection.css";
import { Navbar, LoginNav, Login, Footer, NewEventPopupBtn } from "./components";

function TicketSelection() {
  const departmentLinks = [
    { 
      dept: 'general', 
      title: 'General Support', 
      desc: 'Issues related to RSVP features & guest lists.',
      icon: <FiHelpCircle className="ticket-icon" />,
      color: '#4a90e2'
    },
    { 
      dept: 'technical', 
      title: 'Technical Issues', 
      desc: 'System errors, login problems, loading issues.',
      icon: <FiAlertCircle className="ticket-icon" />,
      color: '#e74c3c'
    },
    { 
      dept: 'accounts', 
      title: 'Billing & Accounts', 
      desc: 'Billing issues and account configuration queries.',
      icon: <FiCreditCard className="ticket-icon" />,
      color: '#27ae60'
    },
    { 
      dept: 'event', 
      title: 'Event Management Help', 
      desc: 'Help with event setup & attendee limits.',
      icon: <FiCalendar className="ticket-icon" />,
      color: '#9b59b6'
    },
    { 
      dept: 'sales', 
      title: 'Sales', 
      desc: 'Questions about pricing and packages.',
      icon: <FiDollarSign className="ticket-icon" />,
      color: '#f39c12'
    },
    { 
      dept: 'rsvp', 
      title: 'RSVP Issues', 
      desc: 'Problems with RSVP forms and responses.',
      icon: <FiUsers className="ticket-icon" />,
      color: '#1abc9c'
    }
  ];

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState("login");

  const handleLoginClick = () => {
      setLoginMode("login");
      setIsLoginOpen(true);
  };

  const handleSignupClick = () => {
      setLoginMode("signup");
      setIsLoginOpen(true);
  };

  return (
    <>
      <Navbar
        onLoginClick={handleLoginClick}
        onSignupClick={handleSignupClick}
      />
      <Login
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        defaultMode={loginMode}
      />
      <NewEventPopupBtn />

      {/* Hero Section */}
      <section className="ticket-hero">
        <div className="ticket-hero-overlay"></div>
        <div className="ticket-hero-content">
          <div className="ticket-hero-icon">
            <FiHeadphones />
          </div>
          <h1>How can we help you today?</h1>
          <p>Choose a department below and we'll get back to you within 2 hours</p>
        </div>
      </section>

      {/* Main Content */}
      <div className="ticket-wrapper">
        <div className="ticket-container">
          {/* Header Section */}
          <div className="ticket-header">
            <div className="ticket-badge">
              <FiMessageCircle />
              <span>Support Tickets</span>
            </div>
            <h2 className="ticket-title">Open New Support Request</h2>
            <p className="ticket-subtitle">
              Having trouble? Select the relevant support department below and we'll connect you with the right team.
            </p>
          </div>

          {/* Stats Section */}
          <div className="ticket-stats">
            <div className="stat-item">
              <span className="stat-value">&lt; 2h</span>
              <span className="stat-label">Avg Response Time</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">24/7</span>
              <span className="stat-label">Support Available</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">98%</span>
              <span className="stat-label">Satisfaction Rate</span>
            </div>
          </div>

          {/* Department Grid */}
          <div className="ticket-grid">
            {departmentLinks.map(item => (
              <Link 
                key={item.dept}
                to={`/support-ticket?dept=${item.dept}`} 
                className="ticket-card"
                style={{ '--card-color': item.color }}
              >
                <div className="ticket-card-icon" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
                  {item.icon}
                </div>
                <div className="ticket-card-content">
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
                <div className="ticket-card-arrow">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </Link>
            ))}
          </div>

          {/* Help Section */}
          <div className="ticket-help-section">
            <div className="help-content">
              <h3>Need immediate assistance?</h3>
              <p>Our live chat support is available 24/7 for urgent issues</p>
              <div className="help-buttons">
                <button className="btn-chat">
                  <FiMessageCircle />
                  Start Live Chat
                </button>
                <a href="tel:+27111234567" className="btn-call">
                  Call Us Now
                </a>
              </div>
            </div>
            <div className="help-image">
              <img src="/images/support-illustration.svg" alt="Support team" />
            </div>
          </div>

          {/* FAQ Link */}
          <div className="ticket-faq-link">
            <p>
              <FiHelpCircle />
              Check our <Link to="/support#faq">Frequently Asked Questions</Link> for quick answers
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default TicketSelection;