import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./ticket_Sales.css";
import "../App.css";
import "../responce.css";
import "../alert.css";
import PriorityQueue from "js-priority-queue";
import { Navbar, Footer, Login, NewEventPopupBtn } from "./components";

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
  
  // Filter states
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDate, setSelectedDate] = useState("all");
  const [showFeatured, setShowFeatured] = useState(false);
  const [showFree, setShowFree] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 6;

  // Extract unique event types
  const [eventCategories, setEventCategories] = useState(["all"]);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (events.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get unique event types for filter
    const eventTypes = ["all", ...new Set(events
      .filter(e => e.event_type)
      .map(e => e.event_type)
      .sort())];
    
    // Update filter options state if needed
    setEventCategories(eventTypes);

    const filtered = events.filter((event) => {
      // Base filters
      const isPublished = event.published === 1 || event.published === "1";
      const hasTickets = event.has_tickets === 1 || event.has_tickets === true || event.has_tickets === "1";
      const isCancelled = isEventCancelled(event);

      if (process.env.NODE_ENV !== "production") {
        console.log(`Event "${event.event_name}" - Published: ${isPublished}, Has Tickets: ${hasTickets}, Cancelled: ${isCancelled}`);
        return true;
      }
      return isPublished && hasTickets && !isCancelled;
    });

    // Apply additional filters
    const filteredAndSorted = applyFilters(filtered);
    setFilteredEvents(filteredAndSorted);
    setCurrentPage(1); // Reset to first page when filters change

  }, [events, selectedCategory, selectedDate, showFeatured, showFree, searchTerm]);

  const applyFilters = (eventsArray) => {
    if (!eventsArray?.length) return [];

    let filtered = [...eventsArray];

    // Search filter (by name or category)
    if (searchTerm.trim() !== "") {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(event => {
        const name = (event.event_name || event.title || "").toLowerCase();
        const category = (event.event_type || "").toLowerCase();
        const location = (event.event_location || event.location || "").toLowerCase();
        
        return name.includes(searchLower) || 
               category.includes(searchLower) || 
               location.includes(searchLower);
      });
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(event => 
        event.event_type === selectedCategory
      );
    }

    // Date filter
    if (selectedDate !== "all") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      filtered = filtered.filter(event => {
        if (!event.event_start_date) return false;
        
        const eventDate = new Date(event.event_start_date);
        eventDate.setHours(0, 0, 0, 0);

        switch (selectedDate) {
          case "today":
            return eventDate.getTime() === today.getTime();
          
          case "this-week":
            const endOfWeek = new Date(today);
            endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
            return eventDate >= today && eventDate <= endOfWeek;
          
          case "next-30-days":
            const in30Days = new Date(today);
            in30Days.setDate(today.getDate() + 30);
            return eventDate >= today && eventDate <= in30Days;
          
          default:
            return true;
        }
      });
    }

    // Featured events filter (has_tickets = 1)
    if (showFeatured) {
      filtered = filtered.filter(event => 
        event.has_tickets === 1 || event.has_tickets === true || event.has_tickets === "1"
      );
    }

    // Free events filter (has_tickets = 0)
    if (showFree) {
      filtered = filtered.filter(event => 
        event.has_tickets === 0 || event.has_tickets === false || event.has_tickets === "0"
      );
    }

    return sortEventsByDate(filtered);
  };

  const handleFilterReset = () => {
    setSelectedCategory("all");
    setSelectedDate("all");
    setShowFeatured(false);
    setShowFree(false);
    setSearchTerm("");
    setCurrentPage(1);
  };

  const getFilterCount = () => {
    let count = 0;
    if (selectedCategory !== "all") count++;
    if (selectedDate !== "all") count++;
    if (showFeatured) count++;
    if (showFree) count++;
    if (searchTerm.trim() !== "") count++;
    return count;
  };

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

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    // Search is already handled by the useEffect
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);
  const indexOfLastEvent = currentPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
  const currentEvents = filteredEvents.slice(indexOfFirstEvent, indexOfLastEvent);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          console.log(`Loaded ${unique.length} events`, "success");
        } else {
          printAlert("No ticket events found", "info");
        }
      } else {
        console.log("API error response:", data);
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

  const filterCount = getFilterCount();

  return (
    <div className="ticket-sale">
      <Navbar onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />
      <Login isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} defaultMode={loginMode} />
      <NewEventPopupBtn />

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
             Live Your Life With <br/>Unforgetteble<br/>Moments
            </h1>
            <p>Discover events that match your vibe — tickets available now</p>
          </div>
        </div>
      </section>

      <div className="events-section">
        <div className="events-container">
          {/* Filter Sidebar - Hidden on mobile by default */}
          <div className={`filter-sidebar ${isFilterOpen ? 'open' : ''}`}>
            <div className="filter-header">
              <h3>Filters</h3>
              <button 
                className="close-filter-btn" 
                onClick={() => setIsFilterOpen(false)}
                aria-label="Close filters"
              >
                <i className="bi bi-x"></i>
              </button>
            </div>

            <div className="filter-group">
              <form onSubmit={handleSearchSubmit} className="search-form">
                <div className="search-input-wrapper">
                  <i className="bi bi-search search-icon"></i>
                  <input
                    type="text"
                    placeholder="Search events, artists, venues..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="search-input"
                  />
                  {searchTerm && (
                    <button 
                      type="button" 
                      className="clear-search-btn"
                      onClick={() => setSearchTerm("")}
                    >
                      <i className="bi bi-times"></i>
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="filter-group">
              <h4>Categories</h4>
              <div className="category-list">
                <button
                  className={`category-btn ${selectedCategory === "all" ? "active" : ""}`}
                  onClick={() => setSelectedCategory("all")}
                >
                  All Categories
                </button>
                {eventCategories.filter(cat => cat !== "all").map((category, index) => (
                  <button
                    key={index}
                    className={`category-btn ${selectedCategory === category ? "active" : ""}`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <h4>Date</h4>
              <div className="date-options">
                {[
                  { value: "all", label: "All Time" },
                  { value: "today", label: "Today" },
                  { value: "this-week", label: "This Week" },
                  { value: "next-30-days", label: "Next 30 Days" }
                ].map((option) => (
                  <label key={option.value} className="radio-label">
                    <input
                      type="radio"
                      name="dateFilter"
                      value={option.value}
                      checked={selectedDate === option.value}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                    <span className="radio-custom"></span>
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            {/* <div className="filter-group">
              <h4>Event Type</h4>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={showFeatured}
                    onChange={(e) => setShowFeatured(e.target.checked)}
                  />
                  <span className="checkbox-custom"></span>
                  <span className="checkbox-text">
                    <i className="fas fa-star featured-icon"></i>
                    Featured Events
                  </span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={showFree}
                    onChange={(e) => setShowFree(e.target.checked)}
                  />
                  <span className="checkbox-custom"></span>
                  <span className="checkbox-text">
                    <i className="fas fa-gift free-icon"></i>
                    Free Events
                  </span>
                </label>
              </div>
            </div> */}

            <div className="filter-actions">
              <button 
                className="reset-filters-btn"
                onClick={handleFilterReset}
                disabled={filterCount === 0}
              >
                <i className="fas fa-redo"></i> Reset Filters
              </button>
            </div>
          </div>

          {/* Events Grid */}
          <div className="events-content">
            {/* Mobile Filter Toggle */}
         {/* Mobile Filter Bar - Floating */}
<div className="mobile-filter-bar">
  <button 
    className="filter-toggle-btn"
    onClick={() => {
      setIsFilterOpen(true);
      document.body.classList.add('filter-open');
    }}
  >
    <i className="bi bi-sliders-h"></i>
    Filters
    {filterCount > 0 && <span className="filter-count">{filterCount}</span>}
  </button>
  <div className="mobile-search">
    <form onSubmit={handleSearchSubmit} className="search-form">
      <div className="search-input-wrapper">
        <i className="bi bi-search search-icon"></i>
        <input
          type="text"
          placeholder="Search events..."
          value={searchTerm}
          onChange={handleSearch}
          className="search-input"
        />
        {searchTerm && (
          <button 
            type="button" 
            className="clear-search-btn"
            onClick={() => setSearchTerm("")}
          >
            <i className="bi bi-times"></i>
          </button>
        )}
      </div>
    </form>
  </div>
</div>

            {/* Active Filters Bar */}
            {filterCount > 0 && (
              <div className="active-filters">
                <div className="active-filters-list">
                  {searchTerm && (
                    <span className="active-filter-tag">
                      Search: "{searchTerm}"
                      <button onClick={() => setSearchTerm("")}>×</button>
                    </span>
                  )}
                  {selectedCategory !== "all" && (
                    <span className="active-filter-tag">
                      Category: {selectedCategory}
                      <button onClick={() => setSelectedCategory("all")}>×</button>
                    </span>
                  )}
                  {selectedDate !== "all" && (
                    <span className="active-filter-tag">
                      Date: {
                        selectedDate === "today" ? "Today" :
                        selectedDate === "this-week" ? "This Week" :
                        selectedDate === "next-30-days" ? "Next 30 Days" : ""
                      }
                      <button onClick={() => setSelectedDate("all")}>×</button>
                    </span>
                  )}
                  {showFeatured && (
                    <span className="active-filter-tag">
                      Featured Events
                      <button onClick={() => setShowFeatured(false)}>×</button>
                    </span>
                  )}
                  {showFree && (
                    <span className="active-filter-tag">
                      Free Events
                      <button onClick={() => setShowFree(false)}>×</button>
                    </span>
                  )}
                </div>
                <button 
                  className="clear-all-filters"
                  onClick={handleFilterReset}
                >
                  Clear All
                </button>
              </div>
            )}

            {/* Results Count */}
            <div className="results-count">
              <p>Showing {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}</p>
            </div>

            {/* Events Grid */}
            {filteredEvents.length === 0 ? (
              <div className="no-events">
                <i className="fas fa-calendar-times no-events-icon"></i>
                <p className="no-events-message">No events found</p>
                <p className="no-events-subtext">
                  {filterCount > 0 
                    ? "Try adjusting your filters or clearing them to see more events."
                    : "Check back soon for new events!"}
                </p>
                {filterCount > 0 && (
                  <button onClick={handleFilterReset} className="refresh-btn">
                    <i className="fas fa-redo"></i> Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="events-grid">
                  {currentEvents.map((event, index) => {
                    // Calculate the lowest available price
                    const getLowestPrice = () => {
                      const prices = [];
                      if (parseFloat(String(event.early_bird_price)) > 0) prices.push(parseFloat(String(event.early_bird_price)));
                      if (parseFloat(String(event.general_price)) > 0) prices.push(parseFloat(String(event.general_price)));
                      if (parseFloat(String(event.vip_price)) > 0) prices.push(parseFloat(String(event.vip_price)));
                      if (parseFloat(String(event.vvip_price)) > 0) prices.push(parseFloat(String(event.vvip_price)));
                      
                      if (prices.length === 0) return null;
                      return Math.min(...prices);
                    };

                    const lowestPrice = getLowestPrice();
                    const isFreeEvent = event.has_tickets === 0 || event.has_tickets === false || event.has_tickets === "0";
                    const isFeatured = event.has_tickets === 1 || event.has_tickets === true || event.has_tickets === "1";
                    
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
                          {isFeatured && (
                            <div className="ticket-badge">🎫 TICKETS</div>
                          )}
                          {isFreeEvent && (
                            <div className="free-badge">FREE</div>
                          )}
                          {isEventCancelled(event) && (
                            <div className="cancelled-badge">CANCELLED</div>
                          )}
                        </div>

                        <div className="event-info">
                          <div className="event-meta">
                            <span className="event-date">
                              {event.event_start_date
                                ? new Date(event.event_start_date).toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                                : "Date TBA"}
                            </span>
                            {event.event_type && (
                              <span className="event-category">
                                {event.event_type}
                              </span>
                            )}
                          </div>

                          <h3>{event.event_name || event.title || "Untitled Event"}</h3>
                          <p className="event-location">
                            <i className="bi bi-map"></i> 
                            {event.province || "Province TBA"} | {event.city || "City TBA" }
                          </p>

                          <div className="event-footer">
                            {isFreeEvent ? (
                              <span className="event-price free">
                                FREE
                              </span>
                            ) : lowestPrice ? (
                              <span className="event-price">
                                From R{lowestPrice.toFixed(2)}
                              </span>
                            ) : (
                              <span className="event-price tba">
                                Price TBA
                              </span>
                            )}
                            
                            {event.event_time && (
                              <span className="event-time">
                                <i className="far fa-clock"></i> {event.event_time}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pagination">
                    <button 
                      className={`pagination-btn ${currentPage === 1 ? 'disabled' : ''}`}
                      onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <i className="bi bi-skip-backward-btn-fill"></i>
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button 
                      className={`pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`}
                      onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <i className="bi bi-skip-forward-btn-fill"></i>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Ticket_Sale;