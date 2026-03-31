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

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState("login");
  const [loginAccountType, setLoginAccountType] = useState("personal");
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "",
  });
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  
  // Filter states
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDate, setSelectedDate] = useState("all");
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
    
    setEventCategories(eventTypes);

    // Filter: only show upcoming events (not passed) and not cancelled
    const upcomingEvents = events.filter((event) => {
      // Check if event is cancelled
      if (isEventCancelled(event)) return false;
      
      // Check if event has a start date
      if (!event.event_start_date) return true;
      
      const eventDate = new Date(event.event_start_date);
      eventDate.setHours(0, 0, 0, 0);
      
      // Return true if event date is today or in the future
      return eventDate >= today;
    });

    // Apply additional filters
    const filteredAndSorted = applyFilters(upcomingEvents);
    setFilteredEvents(filteredAndSorted);
    setCurrentPage(1);

  }, [events, selectedCategory, selectedDate, searchTerm]);

  // Helper function to check if event has any tickets available
  const checkIfEventHasTickets = (event) => {
    return (
      parseInt(event.earlybird_quantity) > 0 ||
      parseInt(event.general_quantity) > 0 ||
      parseInt(event.vip_quantity) > 0
    );
  };

  // Helper function to get total available tickets
  const getTotalAvailableTickets = (event) => {
    return (
      (parseInt(event.earlybird_quantity) || 0) +
      (parseInt(event.general_quantity) || 0) +
      (parseInt(event.vip_quantity) || 0)
    );
  };

  const applyFilters = (eventsArray) => {
    if (!eventsArray?.length) return [];

    let filtered = [...eventsArray];

    // Search filter
    if (searchTerm.trim() !== "") {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(event => {
        const name = (event.event_name || "").toLowerCase();
        const category = (event.event_type || "").toLowerCase();
        const city = (event.city || "").toLowerCase();
        const province = (event.province || "").toLowerCase();
        
        return name.includes(searchLower) || 
               category.includes(searchLower) || 
               city.includes(searchLower) ||
               province.includes(searchLower);
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

    return sortEventsByDate(filtered);
  };

  const handleFilterReset = () => {
    setSelectedCategory("all");
    setSelectedDate("all");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const getFilterCount = () => {
    let count = 0;
    if (selectedCategory !== "all") count++;
    if (selectedDate !== "all") count++;
    if (searchTerm.trim() !== "") count++;
    return count;
  };

  const handleClick = (event) => {
    const id = event.event_id || event.id;
    if (id) {
      navigate(`/ticketEvent_details?id=${id}`);
    }
  };

  const handleLoginClick = (accountType = "personal") => {
    setLoginAccountType(accountType);
    setLoginMode("login");
    setIsLoginOpen(true);
  };

  const handleSignupClick = (accountType = "personal") => {
    setLoginAccountType(accountType);
    setLoginMode("signup");
    setIsLoginOpen(true);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
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

    return [...eventsArray].sort((a, b) => {
      const dateA = new Date(a.event_start_date || a.created_at || 0);
      const dateB = new Date(b.event_start_date || b.created_at || 0);
      return dateA - dateB;
    });
  };

  // Helper function to format date
  const formatEventDate = (event) => {
    if (!event.event_start_date) return "Date TBA";
    
    const date = new Date(event.event_start_date);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
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
      } else {
        printAlert(data.message || "No events returned from server", "error");
        setEvents([]);
      }
    } catch (err) {
      console.error("Fetch failed:", err);
      printAlert(`Failed to load events: ${err.message}`, "error");
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
      <Login isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} defaultMode={loginMode} defaultAccountType={loginAccountType} />
      <NewEventPopupBtn />

      {alert.show && (
        <div className={`custom-alert ${alert.type}`}>
          <i
            className={`fas ${
              alert.type === "error" ? "fa-times-circle" :
              alert.type === "success" ? "fa-check-circle" :
              alert.type === "warning" ? "fa-exclamation-triangle" : "fa-info-circle"
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
              Live Your Life With <br/>Unforgettable<br/>Moments
            </h1>
            <p>Discover events that match your vibe — tickets available now</p>
          </div>
        </div>
      </section>

      <div className="events-section">
        <div className="events-container">
          {/* Filter Sidebar */}
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
            {/* Mobile Filter Bar */}
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
              <p>Showing {filteredEvents.length} upcoming {filteredEvents.length === 1 ? 'event' : 'events'}</p>
            </div>

            {/* Events Grid */}
            {filteredEvents.length === 0 ? (
              <div className="no-events">
                <i className="fas fa-calendar-times no-events-icon"></i>
                <p className="no-events-message">No upcoming events found</p>
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
                      if (parseInt(event.earlybird_quantity) > 0 && parseFloat(event.earlybird_price) > 0) {
                        prices.push(parseFloat(event.earlybird_price));
                      }
                      if (parseInt(event.general_quantity) > 0 && parseFloat(event.general_price) > 0) {
                        prices.push(parseFloat(event.general_price));
                      }
                      if (parseInt(event.vip_quantity) > 0 && parseFloat(event.vip_price) > 0) {
                        prices.push(parseFloat(event.vip_price));
                      }
                      
                      if (prices.length === 0) return null;
                      return Math.min(...prices);
                    };

                    const lowestPrice = getLowestPrice();
                    const totalTickets = getTotalAvailableTickets(event);
                    const hasTickets = totalTickets > 0;
                    
                    return (
                      <div
                        key={event.event_id || event.id || index}
                        className="event-card"
                        onClick={() => handleClick(event)}
                      >
                        <div className="event-image-container">
                          <img
                            src={event.event_image || "/images/default-event.jpg"}
                            alt={event.event_name || "Event"}
                            onError={(e) => {
                              e.target.src = "/images/default-event.jpg";
                            }}
                          />
                          {hasTickets && (
                            <div className="ticket-badge">
                              <i className="bi bi-ticket-fill"></i> {totalTickets} left
                            </div>
                          )}
                          {!hasTickets && (
                            <div className="sold-out-badge">SOLD OUT</div>
                          )}
                          {isEventCancelled(event) && (
                            <div className="cancelled-badge">CANCELLED</div>
                          )}
                        </div>

                        <div className="event-info">
                          <div className="event-meta">
                            <span className="event-date">
                              <i className="bi bi-calendar"></i> {formatEventDate(event)}
                            </span>
                            {event.event_type && (
                              <span className="event-category">
                                {event.event_type}
                              </span>
                            )}
                          </div>

                          <h3>{event.event_name || "Untitled Event"}</h3>
                          
                          <p className="event-location">
                            <i className="bi bi-geo-alt"></i> 
                            {event.city || "City TBA"}{event.province ? `, ${event.province}` : ""}
                          </p>

                          <div className="event-footer">
                            {!hasTickets ? (
                              <span className="event-price sold-out">
                                Sold Out
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
                            
                            {event.event_start_time && (
                              <span className="event-time">
                                <i className="far fa-clock"></i> {event.event_start_time}
                              </span>
                            )}
                          </div>

                          {/* Limited tickets indicator */}
                          {hasTickets && totalTickets <= 10 && (
                            <div className="limited-tickets">
                              <i className="bi bi-exclamation-triangle-fill"></i>
                              Only {totalTickets} tickets left!
                            </div>
                          )}
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
                      <i className="bi bi-chevron-left"></i>
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
                      <i className="bi bi-chevron-right"></i>
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