import { useNavigate } from "react-router-dom";
import "./ticket_Sales.css";
import React, { useState, useEffect } from "react";
import "../App.css";
import "../responce.css";
import "../alert.css";
import PriorityQueue from "js-priority-queue";
import { Navbar, Footer, Login } from "./components";

function Ticket_Sale() {
  const navigate = useNavigate();

  const [eventsToShow, setEventsToShow] = useState(6);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState("login");
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "",
  });
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [debugInfo, setDebugInfo] = useState("");

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (events.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);


    const filtered = events.filter((event) => {

      const isPublished = event.published === 1 || event.published === "1";
      const hasTickets = event.has_tickets === 1 || event.has_tickets === true || event.has_tickets === "1";
      const isCancelled = isEventCancelled(event);

      if (process.env.NODE_ENV !== "production") {
        console.log(`Event "${event.event_name}" - Published: ${isPublished}, Has Tickets: ${hasTickets}, Cancelled: ${isCancelled}`);
        return true;
      }
      return isPublished && hasTickets && !isCancelled;
    });

    const sorted = sortEventsByDate(filtered);
    setFilteredEvents(sorted);

    setDebugInfo(
      `Raw events: ${events.length}  |  After filters: ${filtered.length}  |  Shown: ${sorted.length}\n` +
      `Status filter: published only\n` +
      `Ticket filter: has_tickets=1 or true\n` +
      `Date filter: disabled for debugging\n` +
      `Today: ${today.toDateString()}`
    );
  }, [events]);

  const handleClick = (event) => {
    const id = event.event_id || event.id;
    if (id) {
      navigate(`/ticketEvent_details?id=${id}`);
    }
  };

  const handleLoginClick = () => {
    setLoginMode("login");
    setIsLoginOpen(true);
  };

  const handleSignupClick = () => {
    setLoginMode("signup");
    setIsLoginOpen(true);
  };

  const loadMoreEvents = () => {
    setEventsToShow((prev) => prev + 6);
  };

  const isEventCancelled = (event) => {
    const status = (event.status || "").toLowerCase().trim();
    return status === "cancelled" || status === "canceled";
  };

  const sortEventsByDate = (eventsArray) => {
    if (!eventsArray?.length) return [];

    const heap = new PriorityQueue({
      comparator: (a, b) => {
        const da = new Date(a.event_start_date || a.created_at || 0);
        const db = new Date(b.event_start_date || b.created_at || 0);
        return da.getTime() - db.getTime();
      },
    });

    eventsArray.forEach((e) => heap.queue(e));

    const sorted = [];
    while (heap.length) {
      sorted.push(heap.dequeue());
    }

    return sorted;
  };

  // Helper function to check if any price is set
  const hasAnyPrice = (event) => {
    return (
      parseFloat(String(event.early_bird_price)) > 0 ||
      parseFloat(String(event.general_price)) > 0 ||
      parseFloat(String(event.vip_price)) > 0 ||
      parseFloat(String(event.vvip_price)) > 0
    );
  };

  // Helper function to format price
  const formatPrice = (price) => {
    if (!price) return "0.00";
    const num = parseFloat(String(price));
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
      const formData = new FormData();
      formData.append("function", "getTicketEvents");

      const res = await fetch(`${API_URL}/query.php`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data = await res.json();
      console.log("API response:", data);

      if (data.success && Array.isArray(data.events)) {
        const seen = new Set();
        const unique = data.events.filter((e) => {
          const id = e.event_id || e.id;
          if (id && !seen.has(id)) {
            seen.add(id);
            return true;
          }
          return false;
        });

        setEvents(unique);
        if (unique.length > 0) {
          printAlert(`Loaded ${unique.length} events`, "success");
        } else {
          printAlert("No ticket events found", "info");
        }
      } else {
        console.log("API error response:", data); // DEBUG
        printAlert(data.message || "No events returned from server", "error");
        setEvents([]);
      }
    } catch (err) {
      console.error("Fetch failed:", err);
      printAlert("Failed to load events. Check connection.", "error");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const printAlert = (msg, type = "info") => {
    setAlert({ show: true, message: msg, type });
    setTimeout(() => setAlert({ show: false, message: "", type: "" }), 6000);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading ticket events...</div>
        </div>
      </div>
    );
  }

  const hasMore = eventsToShow < filteredEvents.length;

  return (
    <div className="ticket-sale">
      <Navbar onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />
      <Login
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        defaultMode={loginMode}
      />

      {alert.show && (
        <div className={`custom-alert ${alert.type}`}>
          <i
            className={`fas ${alert.type === "error"
                ? "fa-times-circle"
                : alert.type === "success"
                  ? "fa-check-circle"
                  : alert.type === "warning"
                    ? "fa-exclamation-triangle"
                    : "fa-info-circle"
              }`}
          />
          <span>{alert.message}</span>
        </div>
      )}

      <section className="ticket-header">
        <img src="/images/event.png" alt="Events background" className="hero-bg-img" />
        <div className="overlayer" />
        <div className="container">
          <div className="row">
            <div className="col-lg-7"></div>
            <h1>
              Explore Exciting Events
              <br />& Experiences
            </h1>
            <p>Discover events that match your vibe — tickets available now</p>
          </div>
        </div>
      </section>

      <div className="events-section">
        <h2>Upcoming Ticket Events</h2>
        <span className="sub-text">Events with tickets on sale</span>

        {/* <div className="debug-panel" style={{
          background: "#f0f0f0",
          padding: "15px",
          borderRadius: "8px",
          margin: "1rem 0",
          fontSize: "14px",
          borderLeft: "4px solid #667eea"
        }}>
          <h4 style={{ marginTop: 0, color: "#333" }}>Debug Information:</h4>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
            {debugInfo}
          </pre>
          <div style={{ marginTop: "10px", padding: "10px", background: "#fff", borderRadius: "4px" }}>
            <strong>Raw Events Data:</strong>
            <pre style={{ margin: "5px 0 0 0", fontSize: "12px", maxHeight: "150px", overflow: "auto" }}>
              {JSON.stringify(events, null, 2)}
            </pre>
          </div>
        </div>  */}

        {filteredEvents.length === 0 ? (
          <div className="no-events">
            <i className="fas fa-ticket-alt no-events-icon"></i>
            <p className="no-events-message">No upcoming ticket events right now</p>
            <p className="no-events-subtext">
              Check the debug panel above to see why events are being filtered out.
            </p>
            <div style={{ marginTop: "20px" }}>
              <button onClick={fetchEvents} className="refresh-btn" style={{ marginRight: "10px" }}>
                <i className="fas fa-sync-alt"></i> Refresh Events
              </button>
              <button onClick={() => {
                // Temporary bypass filter for debugging
                setFilteredEvents(events);
                printAlert("Showing ALL events (bypassing filters)", "warning");
              }} className="refresh-btn" style={{ background: "#f59e0b" }}>
                <i className="fas fa-eye"></i> Show All Events (Debug)
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="events-grid">
              {filteredEvents.slice(0, eventsToShow).map((event, index) => {
                return (
                  <div
                    key={event.event_id || event.id || index}
                    className="event-card"
                    onClick={() => handleClick(event)}
                  >
                    <div className="event-image-container">
                      <img
                        src={event.event_image || event.image || "/images/default-event.jpg"}
                        alt={event.event_name || event.title || "Event"}
                        onError={(e) => {
                          e.target.src = "/images/default-event.jpg";
                        }}
                      />
                      {(event.has_tickets === 1 || event.has_tickets === true || event.has_tickets === "1") && (
                        <div className="ticket-badge">🎫 TICKETS</div>
                      )}
                      {isEventCancelled(event) && (
                        <div className="cancelled-badge">CANCELLED</div>
                      )}
                    </div>

                    <div className="event-info">
                      <span className="event-date">
                        {event.event_start_date
                          ? new Date(event.event_start_date).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                          : "Date TBA"}
                      </span>

                      <h3>{event.event_name || event.title || "Untitled Event"}</h3>
                      <p>{event.event_location || event.location || "Location TBA"}</p>

                      <div className="ticket-prices">
                        {parseFloat(String(event.early_bird_price)) > 0 && (
                          <span className={`price-tag early-bird ${event.early_bird_quantity <= 0 ? "sold-out" : ""}`}>
                            Early Bird: R{formatPrice(event.early_bird_price)}

                            {event.early_bird_quantity > 0 ? (
                              <span> ({event.early_bird_quantity} tickets left)</span>
                            ) : (
                              <span className="sold-out-text"> — Sold Out</span>
                            )}
                          </span>
                        )}

                        {parseFloat(String(event.general_price)) > 0 && (
                          <span className="price-tag general">
                            General: R{formatPrice(event.general_price)}
                          </span>
                        )}
                        {parseFloat(String(event.vip_price)) > 0 && (
                          <span className="price-tag vip">
                            VIP: R{formatPrice(event.vip_price)}
                          </span>
                        )}
                        {parseFloat(String(event.vvip_price)) > 0 && (
                          <span className="price-tag vvip">
                            VVIP: R{formatPrice(event.vvip_price)}
                          </span>
                        )}
                        {!hasAnyPrice(event) && (
                          <strong className="price">Price TBA</strong>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div className="load-more-container">
                <button className="load-more-btn" onClick={loadMoreEvents}>
                  Load More Events
                </button>
              </div>
            )}

            {!hasMore && filteredEvents.length > 6 && (
              <div className="all-events-loaded">
                <p>All available events loaded!</p>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default Ticket_Sale;