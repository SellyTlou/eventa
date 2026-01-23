import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./ticketEvent_details.css";
import { Navbar, Footer, Login } from "./components";

function TicketEvent_details() {
  const [activeTab, setActiveTab] = useState("info");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [event, setEvent] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState("login");

  // Get ID from query parameter
  const queryParams = new URLSearchParams(location.search);
  const id = queryParams.get('id');

  useEffect(() => {
    if (id) {
      fetchEventDetails();
    } else {
      setError("No event ID provided");
      setLoading(false);
    }
  }, [id]);

  const handleLoginClick = () => {
    setLoginMode("login");
    setIsLoginOpen(true);
  };

  const handleSignupClick = () => {
    setLoginMode("signup");
    setIsLoginOpen(true);
  };


  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      setError("");

      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
      const formData = new FormData();
      formData.append("function", "getEventById");
      formData.append("event_id", id);

      const res = await fetch(`${API_URL}/query.php`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data = await res.json();

      if (data.success && Array.isArray(data.events) && data.events.length > 0) {
        setEvent(data.events[0]);
      } else {
        setError(data.message || "Event not found");
      }
    } catch (err) {
      console.error("Fetch failed:", err);
      setError("Failed to load event details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = () => {
    if (event) {
      navigate(`/ticket_payment`, { state: { event } });
    }
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "Date TBA";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Helper function to format price
  const formatPrice = (price) => {
    if (!price) return "0.00";
    const num = parseFloat(String(price));
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  // Get lowest price from available ticket types
  const getLowestPrice = () => {
    if (!event) return "0.00";

    const prices = [
      parseFloat(String(event.early_bird_price)),
      parseFloat(String(event.general_price)),
      parseFloat(String(event.vip_price)),
      parseFloat(String(event.vvip_price)),
    ].filter(price => price > 0);

    if (prices.length === 0) return "0.00";

    return Math.min(...prices).toFixed(2);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading event details...</div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="error-container">
        <div className="error-content">
          <i className="fas fa-exclamation-circle error-icon"></i>
          <h2>Event Not Found</h2>
          <p>{error || "The event you're looking for doesn't exist or has been removed."}</p>
          <button
            className="back-btn"
            onClick={() => navigate("/ticket-sales")}
          >
            <i className="fas fa-arrow-left"></i> Back to Events
          </button>
        </div>
      </div>
    );
  }

  const getMapEmbedUrl = (location) => {
    if (!location) return "";
    const encodedLocation = encodeURIComponent(location);
    return `https://www.google.com/maps?q=${encodedLocation}&output=embed`;
  };

  return (
    <div className="event-details-page">

      <Navbar onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />
      <Login
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        defaultMode={loginMode}
      />

      {/* TOP SECTION */}
      <div className="event-top">
        {/* LEFT: BANNER IMAGE */}
        <div className="event-banner">
          <img
            src={event.event_image || event.image || "/images/default-event.jpg"}
            alt={event.event_name || event.title || "Event"}
            onError={(e) => {
              e.target.src = "/images/default-event.jpg";
            }}
          />
        </div>

        {/* RIGHT: BOOKING CARD */}
        <div className="booking-card">
          <h3>Book Tickets</h3>

          <div className="booking-info">
            <p>
              <strong>{formatDate(event.event_start_date)}</strong>
            </p>
            <p>
              {event.event_start_time ? `${event.event_start_time}` : "Time TBA"}
              {event.event_end_time ? ` – ${event.event_end_time}` : ""}
            </p>
            {parseFloat(String(event.early_bird_price)) > 0 && (
              event.early_bird_quantity > 0 ? (
                <span className="limited">
                  {event.early_bird_quantity} Early Bird tickets left
                </span>
              ) : (
                <span className="limited sold-out">
                  Early Bird Sold Out
                </span>
              )
            )}

          </div>

          <div className="price">
            <p>Price from</p>
            <h2>R {getLowestPrice()}</h2>
          </div>

          <button
            className="book-btn"
            onClick={handleBooking}
          >
            Continue to Booking
          </button>
        </div>
      </div>

      {/* EVENT TITLE */}
      <h1 className="event-title">{event.event_name || event.title || "Untitled Event"}</h1>

      {/* TAGS */}
      <div className="event-tags">
        <span>{event.event_location || "Location TBA"}</span>
        {(event.has_tickets === 1 || event.has_tickets === true || event.has_tickets === "1") && (
          <span className="ticket-tag">Tickets Available</span>
        )}
      </div>

      {/* TABS */}
      <div className="tabs">
        <button
          className={activeTab === "info" ? "active" : ""}
          onClick={() => setActiveTab("info")}
        >
          Info
        </button>
        <button
          className={activeTab === "venue" ? "active" : ""}
          onClick={() => setActiveTab("venue")}
        >
          Venue Information
        </button>

        <button
          className={activeTab === "tickets" ? "active" : ""}
          onClick={() => setActiveTab("tickets")}
        >
          Ticket Details
        </button>
      </div>

      {/* TAB CONTENT */}
      <div className="tab-content">
        {activeTab === "info" && (
          <div className="info-content">
            <p>{event.event_info || "No event description available."}</p>
            {event.organizer_name && (
              <div className="organizer-info">
                <h4>Organizer</h4>
                <p>{event.organizer_name}</p>
                {event.organizer_email && <p>{event.organizer_email}</p>}
              </div>
            )}
          </div>
        )}

        {activeTab === "venue" && (
          <div className="venue-content">
            <h4>📍 {event.event_location || "Location TBA"}</h4>

            {event.event_location ? (
              <div className="map-placeholder" style={{ padding: 0, overflow: "hidden" }}>
                <iframe
                  title="Event Location Map"
                  src={getMapEmbedUrl(event.event_location)}
                  width="100%"
                  height="300"
                  style={{ border: 0, borderRadius: "10px" }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : (
              <p style={{ color: "#666", marginTop: "15px" }}>
                Location not available for this event.
              </p>
            )}
          </div>
        )}



        {activeTab === "tickets" && (
          <div className="tickets-content">
            <h4>Available Ticket Types</h4>
            <div className="ticket-types">
              {parseFloat(String(event.early_bird_price)) > 0 && (
                <div className="ticket-type">
                  <h5>Early Bird</h5>
                  <p className="ticket-price">R {formatPrice(event.early_bird_price)}</p>
                  {event.early_bird_quantity && event.early_bird_quantity > 0 && (
                    <p className="ticket-quantity">{event.early_bird_quantity} tickets left</p>
                  )}
                </div>
              )}
              {parseFloat(String(event.general_price)) > 0 && (
                <div className="ticket-type">
                  <h5>General Admission</h5>
                  <p className="ticket-price">R {formatPrice(event.general_price)}</p>
                </div>
              )}
              {parseFloat(String(event.vip_price)) > 0 && (
                <div className="ticket-type">
                  <h5>VIP</h5>
                  <p className="ticket-price">R {formatPrice(event.vip_price)}</p>
                </div>
              )}
              {parseFloat(String(event.vvip_price)) > 0 && (
                <div className="ticket-type">
                  <h5>VVIP</h5>
                  <p className="ticket-price">R {formatPrice(event.vvip_price)}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TicketEvent_details;