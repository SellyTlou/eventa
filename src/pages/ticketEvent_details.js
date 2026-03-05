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
      formData.append("function", "getTicketEventById");
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

  const formatDate = (dateString) => {
    console.log("Formatting date:", event.event_start_date);
    if (!dateString) return "Date TBA";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatPrice = (price) => {
    if (!price && price !== 0) return "0.00";
    const num = parseFloat(String(price));
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  const getLowestPrice = () => {
    if (!event) return "0.00";

    const prices = [
      { price: parseFloat(String(event.earlybird_price)), quantity: parseInt(event.earlybird_quantity) },
      { price: parseFloat(String(event.general_price)), quantity: parseInt(event.general_quantity) },
      { price: parseFloat(String(event.vip_price)), quantity: parseInt(event.vip_quantity) },
      { price: parseFloat(String(event.vvip_price)) || 0, quantity: parseInt(event.vvip_quantity) || 0 }
    ].filter(item => item.price > 0 && item.quantity > 0);

    if (prices.length === 0) return "0.00";

    return Math.min(...prices.map(item => item.price)).toFixed(2);
  };

  // Helper function to get total available tickets
  const getTotalAvailableTickets = () => {
    if (!event) return 0;
    
    return (
      (parseInt(event.earlybird_quantity) || 0) +
      (parseInt(event.general_quantity) || 0) +
      (parseInt(event.vip_quantity) || 0) +
      (parseInt(event.vvip_quantity) || 0)
    );
  };

  // Helper function to check if a ticket type is available
  const isTicketTypeAvailable = (quantity, price) => {
    return parseInt(quantity) > 0 && parseFloat(price) > 0;
  };

  // Helper function to get ticket status badge
  const getTicketStatusBadge = (quantity, price) => {
    if (parseInt(quantity) === 0) {
      return <span className="ticket-status sold-out">Sold Out</span>;
    } else if (parseInt(quantity) <= 10) {
      return <span className="ticket-status limited">Only {quantity} left!</span>;
    } else if (parseFloat(price) === 0) {
      return <span className="ticket-status free">Free</span>;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="event-details-page">
        <Navbar onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />
        <div className="loading-container">
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading event details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="event-details-page">
        <Navbar onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />
        <div className="error-container">
          <div className="error-content">
            <i className="fas fa-exclamation-circle error-icon"></i>
            <h2>Event Not Found</h2>
            <p>{error || "The event you're looking for doesn't exist or has been removed."}</p>
            <button
              className="back-btn"
              onClick={() => navigate("/ticket_sales")}
            >
              <i className="fas fa-arrow-left"></i> Back to Events
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getMapEmbedUrl = (location) => {
    if (!location) return "";
    const encodedLocation = encodeURIComponent(location);
    return `https://www.google.com/maps?q=${encodedLocation}&output=embed`;
  };

  const totalTickets = getTotalAvailableTickets();

  return (
    <div className="event-details-page">
      <Navbar onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />
      <Login
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        defaultMode={loginMode}
      />

      <div className="event-details-container">
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
            <div className="banner-overlay"></div>
            {totalTickets > 0 && (
              <div className="ticket-badge">
                <i className="bi bi-ticket-fill"></i> {totalTickets} Tickets Available
              </div>
            )}
          </div>

          {/* RIGHT: BOOKING CARD - BLACK BACKGROUND */}
          <div className="booking-card">
            <h3>Book Tickets</h3>

            <div className="booking-info">
              <div className="date-info">
                <i className="bi bi-calendar-event"></i>
                <div>
                  <strong>{formatDate(event.event_start_date || event.event_start_date)}</strong>
                </div>
              </div>
              <div className="time-info">
                <i className="bi bi-clock"></i>
                <div>
                  {event.event_start_time ? `${event.event_start_time}` : "Time TBA"}
                  {event.event_end_time ? ` – ${event.event_end_time}` : ""}
                </div>
              </div>
            </div>

            {/* Ticket Availability Summary */}
            <div className="ticket-summary">
              <h4>Ticket Availability</h4>
              {isTicketTypeAvailable(event.earlybird_quantity, event.earlybird_price) && (
                <div className="ticket-summary-item">
                  <span>Early Bird</span>
                  <span className="ticket-summary-count">{event.earlybird_quantity} left</span>
                </div>
              )}
              {isTicketTypeAvailable(event.general_quantity, event.general_price) && (
                <div className="ticket-summary-item">
                  <span>General Admission</span>
                  <span className="ticket-summary-count">{event.general_quantity} left</span>
                </div>
              )}
              {isTicketTypeAvailable(event.vip_quantity, event.vip_price) && (
                <div className="ticket-summary-item">
                  <span>VIP</span>
                  <span className="ticket-summary-count">{event.vip_quantity} left</span>
                </div>
              )}
              {isTicketTypeAvailable(event.vvip_quantity, event.vvip_price) && (
                <div className="ticket-summary-item">
                  <span>VVIP</span>
                  <span className="ticket-summary-count">{event.vvip_quantity} left</span>
                </div>
              )}
            </div>

            <div className="price">
              <p>Starting from</p>
              <h2>R {getLowestPrice()}</h2>
            </div>

            <button
              className="book-btn"
              onClick={handleBooking}
              disabled={totalTickets === 0}
            >
              {totalTickets > 0 ? (
                <>Continue to Booking <i className="bi bi-arrow-right"></i></>
              ) : (
                <>Sold Out <i className="bi bi-x-circle"></i></>
              )}
            </button>
          </div>
        </div>

        {/* EVENT TITLE */}
        <h1 className="event-title">{event.event_name || event.title || "Untitled Event"}</h1>

        {/* TAGS */}
        <div className="event-tags">
          <span className="location-tag">
            <i className="bi bi-geo-alt-fill"></i> {event.address || event.event_location || "Location TBA"}
          </span>
          {totalTickets > 0 ? (
            <span className="ticket-tag available">
              <i className="bi bi-ticket-fill"></i> {totalTickets} Tickets Available
            </span>
          ) : (
            <span className="ticket-tag sold-out">
              <i className="bi bi-x-circle-fill"></i> Sold Out
            </span>
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
            Ticket Details ({totalTickets})
          </button>
        </div>

        {/* TAB CONTENT */}
        <div className="tab-content">
          {activeTab === "info" && (
            <div className="info-content">
              <div className="description-section">
                <h4>About This Event</h4>
                <p>{event.more_info || event.event_info || "No event description available."}</p>
              </div>
              
              {event.organizer_name && (
                <div className="organizer-section">
                  <h4>Organizer</h4>
                  <div className="organizer-info">
                    <i className="bi bi-person-circle"></i>
                    <div>
                      <p className="organizer-name">{event.organizer_name}</p>
                      {event.organizer_email && <p className="organizer-email">{event.organizer_email}</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "venue" && (
            <div className="venue-content">
              <h4>📍 {event.address || event.event_location || "Location TBA"}</h4>
              <p className="venue-detail">
                <i className="bi bi-building"></i> {event.city || "City TBA"}, {event.province || "Province TBA"}
              </p>

              {event.address ? (
                <div className="map-container">
                  <iframe
                    title="Event Location Map"
                    src={getMapEmbedUrl(`${event.address}, ${event.city}, ${event.province}`)}
                    width="100%"
                    height="350"
                    style={{ border: 0, borderRadius: "12px" }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              ) : (
                <div className="no-location">
                  <i className="bi bi-geo-alt"></i>
                  <p>Location not available for this event.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "tickets" && (
            <div className="tickets-content">
              <div className="tickets-header">
                <h4>Available Ticket Types</h4>
                <p className="total-tickets">Total Tickets Available: <strong>{totalTickets}</strong></p>
              </div>
              
              <div className="ticket-types">
                {/* Early Bird Tickets */}
                {parseFloat(String(event.earlybird_price)) >= 0 && (
                  <div className={`ticket-type ${parseInt(event.earlybird_quantity) === 0 ? 'sold-out' : ''}`}>
                    <div className="ticket-type-header">
                      <div>
                        <h5>Early Bird</h5>
                        {parseInt(event.earlybird_quantity) > 0 && parseInt(event.earlybird_quantity) <= 10 && (
                          <span className="limited-badge">Limited!</span>
                        )}
                      </div>
                      {getTicketStatusBadge(event.earlybird_quantity, event.earlybird_price)}
                    </div>
                    <div className="ticket-details">
                      <p className="ticket-price">R {formatPrice(event.earlybird_price)}</p>
                      <div className="ticket-quantity-info">
                        <i className="bi bi-ticket"></i>
                        <span>{event.earlybird_quantity || 0} tickets left</span>
                      </div>
                    </div>
                    {parseInt(event.earlybird_quantity) > 0 && (
                      <div className="ticket-progress">
                        <div 
                          className="ticket-progress-bar" 
                          style={{ width: `${Math.min(100, (parseInt(event.earlybird_quantity) / 100) * 100)}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                )}

                {/* General Admission Tickets */}
                {parseFloat(String(event.general_price)) >= 0 && (
                  <div className={`ticket-type ${parseInt(event.general_quantity) === 0 ? 'sold-out' : ''}`}>
                    <div className="ticket-type-header">
                      <div>
                        <h5>General Admission</h5>
                        {parseInt(event.general_quantity) > 0 && parseInt(event.general_quantity) <= 10 && (
                          <span className="limited-badge">Limited!</span>
                        )}
                      </div>
                      {getTicketStatusBadge(event.general_quantity, event.general_price)}
                    </div>
                    <div className="ticket-details">
                      <p className="ticket-price">R {formatPrice(event.general_price)}</p>
                      <div className="ticket-quantity-info">
                        <i className="bi bi-ticket"></i>
                        <span>{event.general_quantity || 0} tickets left</span>
                      </div>
                    </div>
                    {parseInt(event.general_quantity) > 0 && (
                      <div className="ticket-progress">
                        <div 
                          className="ticket-progress-bar" 
                          style={{ width: `${Math.min(100, (parseInt(event.general_quantity) / 100) * 100)}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                )}

                {/* VIP Tickets */}
                {parseFloat(String(event.vip_price)) >= 0 && (
                  <div className={`ticket-type ${parseInt(event.vip_quantity) === 0 ? 'sold-out' : ''}`}>
                    <div className="ticket-type-header">
                      <div>
                        <h5>VIP</h5>
                        {parseInt(event.vip_quantity) > 0 && parseInt(event.vip_quantity) <= 10 && (
                          <span className="limited-badge">Limited!</span>
                        )}
                      </div>
                      {getTicketStatusBadge(event.vip_quantity, event.vip_price)}
                    </div>
                    <div className="ticket-details">
                      <p className="ticket-price">R {formatPrice(event.vip_price)}</p>
                      <div className="ticket-quantity-info">
                        <i className="bi bi-ticket"></i>
                        <span>{event.vip_quantity || 0} tickets left</span>
                      </div>
                    </div>
                    {parseInt(event.vip_quantity) > 0 && (
                      <div className="ticket-progress">
                        <div 
                          className="ticket-progress-bar" 
                          style={{ width: `${Math.min(100, (parseInt(event.vip_quantity) / 100) * 100)}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                )}

                {/* VVIP Tickets (if they exist) */}
                {parseFloat(String(event.vvip_price)) > 0 && (
                  <div className={`ticket-type ${parseInt(event.vvip_quantity) === 0 ? 'sold-out' : ''}`}>
                    <div className="ticket-type-header">
                      <div>
                        <h5>VVIP</h5>
                        {parseInt(event.vvip_quantity) > 0 && parseInt(event.vvip_quantity) <= 10 && (
                          <span className="limited-badge">Limited!</span>
                        )}
                      </div>
                      {getTicketStatusBadge(event.vvip_quantity, event.vvip_price)}
                    </div>
                    <div className="ticket-details">
                      <p className="ticket-price">R {formatPrice(event.vvip_price)}</p>
                      <div className="ticket-quantity-info">
                        <i className="bi bi-ticket"></i>
                        <span>{event.vvip_quantity || 0} tickets left</span>
                      </div>
                    </div>
                    {parseInt(event.vvip_quantity) > 0 && (
                      <div className="ticket-progress">
                        <div 
                          className="ticket-progress-bar" 
                          style={{ width: `${Math.min(100, (parseInt(event.vvip_quantity) / 100) * 100)}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* No Tickets Available Message */}
              {totalTickets === 0 && (
                <div className="no-tickets-message">
                  <i className="bi bi-ticket"></i>
                  <p>No tickets are currently available for this event.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default TicketEvent_details;