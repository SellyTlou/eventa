import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./main.css";
import { templates } from "./templates.js";
import { LoginNav } from "../components";

// Storage helper functions
const saveEventDataToStorage = (eventData) => {
  try {
    let deviceId = localStorage.getItem('eventa_device_id');
    if (!deviceId) {
      deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('eventa_device_id', deviceId);
    }

    const eventDataKey = `eventa_${deviceId}_current_event`;
    
    if (eventData.ticketConfig) {
      const ticketDataKey = `eventa_${deviceId}_ticket_config`;
      localStorage.setItem(ticketDataKey, JSON.stringify(eventData.ticketConfig));
      
      const { ticketConfig, ...eventDataWithoutTickets } = eventData;
      localStorage.setItem(eventDataKey, JSON.stringify(eventDataWithoutTickets));
    } else {
      localStorage.setItem(eventDataKey, JSON.stringify(eventData));
    }
    
    return true;
  } catch (error) {
    console.error('Error saving event data:', error);
    return false;
  }
};

const getEventDataFromStorage = () => {
  try {
    const deviceId = localStorage.getItem('eventa_device_id');
    if (!deviceId) return null;

    const eventDataKey = `eventa_${deviceId}_current_event`;
    const data = localStorage.getItem(eventDataKey);
    
    if (!data) return null;
    
    const eventData = JSON.parse(data);
    
    const ticketDataKey = `eventa_${deviceId}_ticket_config`;
    const ticketData = localStorage.getItem(ticketDataKey);
    
    if (ticketData) {
      eventData.ticketConfig = JSON.parse(ticketData);
    }
    
    return eventData;
  } catch (error) {
    console.error('Error retrieving event data:', error);
    return null;
  }
};

const saveTicketDataToStorage = (ticketData) => {
  try {
    const deviceId = localStorage.getItem('eventa_device_id');
    if (!deviceId) return false;

    const ticketDataKey = `eventa_${deviceId}_ticket_config`;
    localStorage.setItem(ticketDataKey, JSON.stringify(ticketData));
    
    return true;
  } catch (error) {
    console.error('Error saving ticket data:', error);
    return false;
  }
};

export default function EventTheme() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeFilter, setActiveFilter] = useState("All");
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [hasTickets, setHasTickets] = useState(null);
  const [ticketConfig, setTicketConfig] = useState({
    earlyBird: { name: "Early Bird", price: "", quantity: "", description: "Limited early bird tickets" },
    general: { name: "General Admission", price: "", quantity: "", description: "Standard admission ticket" },
    vip: { name: "VIP", price: "", quantity: "", description: "VIP experience with perks" },
    vvip: { name: "VVIP", price: "", quantity: "", description: "Exclusive VVIP experience" }
  });
  const [eventInfo, setEventInfo] = useState("");
  const [eventData, setEventData] = useState(null);

  // Load existing event data on component mount
  useEffect(() => {
    const storedEventData = getEventDataFromStorage();
    if (storedEventData) {
      setEventData(storedEventData);
      
      // If we already have ticket config from previous step, pre-fill it
      if (storedEventData.ticketConfig && storedEventData.ticketConfig.config) {
        setTicketConfig(storedEventData.ticketConfig.config);
        setEventInfo(storedEventData.ticketConfig.eventInfo || "");
      }
    }
  }, []);

  // Build category list including "All"
  const allCategories = useMemo(() => {
    const all = { All: [] };

    Object.keys(templates).forEach(category => {
      all[category] = templates[category];
      all.All = [...all.All, ...templates[category]];
    });

    return all;
  }, []);

  // Map template ID → category name
  const templateToCategoryMap = useMemo(() => {
    const map = new Map();
    Object.keys(templates).forEach(category => {
      templates[category].forEach(t => {
        map.set(t.id, category);
      });
    });
    return map;
  }, []);

  // Progress bar step classes
  const getStepClass = (step) => {
    const currentStep = 3;
    if (step === currentStep) return "progress-step active";
    if (step < currentStep) return "progress-step completed";
    return "progress-step";
  };

  const handleFilterClick = (filter) => setActiveFilter(filter);

  const handleTemplateSelect = (templateId) => {
    const category = templateToCategoryMap.get(templateId);
    const template = allCategories[activeFilter].find(t => t.id === templateId);
    setSelectedTemplate({ id: templateId, category, template });
    setShowTicketModal(true);
  };

  const handleBack = () => {
    if (eventData?.eventName) {
      navigate("/createEvent");
    } else {
      navigate(-1);
    }
  };

  const handleTicketOption = (option) => {
    setHasTickets(option);
    
    // If no tickets, go directly to editor
    if (option === false) {
      navigateToEditor();
    }
  };

  const handleInputChange = (type, field, value) => {
    setTicketConfig(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  const saveTicketConfiguration = () => {
    // Filter out empty ticket types
    const activeTickets = {};
    
    Object.entries(ticketConfig).forEach(([type, config]) => {
      if (config.price && config.quantity) {
        // Parse to numbers for validation
        const price = parseFloat(config.price);
        const quantity = parseInt(config.quantity);
        
        if (!isNaN(price) && price >= 0 && !isNaN(quantity) && quantity >= 1) {
          activeTickets[type] = {
            name: config.name,
            price: price,
            quantity: quantity,
            description: config.description
          };
        }
      }
    });
    
    const ticketData = {
      hasTickets: true,
      config: activeTickets,
      eventInfo: eventInfo.trim()
    };
    
    // Save ticket data to storage
    saveTicketDataToStorage(ticketData);
    
    // Update main event data with ticket info
    if (eventData) {
      const updatedEventData = {
        ...eventData,
        hasTickets: true,
        ticketConfig: ticketData
      };
      saveEventDataToStorage(updatedEventData);
    }
    
    return ticketData;
  };

  const navigateToEditor = () => {
    let ticketData = null;
    
    if (hasTickets) {
      ticketData = saveTicketConfiguration();
    } else {
      // Save that this event has no tickets
      const noTicketData = { hasTickets: false };
      saveTicketDataToStorage(noTicketData);
      
      if (eventData) {
        const updatedEventData = {
          ...eventData,
          hasTickets: false,
          ticketConfig: noTicketData
        };
        saveEventDataToStorage(updatedEventData);
      }
    }

    navigate(`/postcardEditor?template=${selectedTemplate.id}&category=${selectedTemplate.category}`, {
      state: {
        eventData: eventData,
        template: selectedTemplate.template,
        ticketConfig: ticketData
      }
    });
    
    // Reset modal state
    setShowTicketModal(false);
    setHasTickets(null);
    setTicketConfig({
      earlyBird: { name: "Early Bird", price: "", quantity: "", description: "Limited early bird tickets" },
      general: { name: "General Admission", price: "", quantity: "", description: "Standard admission ticket" },
      vip: { name: "VIP", price: "", quantity: "", description: "VIP experience with perks" },
      vvip: { name: "VVIP", price: "", quantity: "", description: "Exclusive VVIP experience" }
    });
    setEventInfo("");
  };

  const handleSubmitTickets = () => {
    // Validate ticket configuration
    if (hasTickets) {
      // Check if at least one ticket type has both price and quantity
      const hasValidTicket = Object.entries(ticketConfig).some(([type, config]) => {
        const price = parseFloat(config.price);
        const quantity = parseInt(config.quantity);
        
        return !isNaN(price) && price >= 0 && !isNaN(quantity) && quantity >= 1;
      });
      
      if (!hasValidTicket) {
        alert("Please enter valid price and quantity for at least one ticket type");
        return;
      }
    }
    
    navigateToEditor();
  };

  const currentTemplates = allCategories[activeFilter] || [];

  return (
    <>
      <LoginNav />
      <section className="eventThemePage">
        <div className="container">
          <button className="eventa-back-btn" onClick={handleBack}>
            Back
          </button>

          <div className="progressBar">
            <div className="container">
              <div className="row">
                <div className={getStepClass(1)}>
                  <div className="step-circle">1</div>
                  <div className="step-label">Event Name</div>
                </div>
                <div className={getStepClass(2)}>
                  <div className="step-circle">2</div>
                  <div className="step-label">Event Details</div>
                </div>
                <div className={getStepClass(3)}>
                  <div className="step-circle">3</div>
                  <div className="step-label">Choose a Theme</div>
                </div>
              </div>
            </div>
          </div> 

          <section className="template-selection">
            <div className="container">
              <h1>Select a Template</h1>
              {eventData?.eventName && (
                <div className="event-name-banner">
                  Creating: <strong>{eventData.eventName}</strong>
                  {eventData.eventStartDate && (
                    <span className="event-date">
                      on {new Date(eventData.eventStartDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  )}
                </div>
              )}

              <div className="template-filters">
                {["All", "Birthday", "BabyShower", "Wedding", "Graduation"].map(filter => (
                  <button
                    key={filter}
                    className={`filter-btn ${activeFilter === filter ? "active" : ""}`}
                    onClick={() => handleFilterClick(filter)}
                  >
                    {filter === "All" ? "All" : filter.replace(/([A-Z])/g, " $1").trim()}
                  </button>
                ))}
              </div>

              <div className="template-grid">
                {currentTemplates.length > 0 ? (
                  currentTemplates.map(template => (
                    <div
                      key={template.id}
                      className="template-card"
                      onClick={() => handleTemplateSelect(template.id)}
                    >
                      <div className="template-image">
                        <img
                          src={template.image}
                          alt={template.title}
                          loading="lazy"
                          onError={(e) => {
                            e.target.src = "https://via.placeholder.com/300x400/F5F5F5/999?text=Preview+Not+Found";
                          }}
                        />
                      </div>
                      <div className="template-info">
                        <h3>{template.title}</h3>
                        <p>{template.description || "Beautiful customizable template"}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ textAlign: "center", gridColumn: "1/-1", fontSize: "18px", color: "#666" }}>
                    No templates found in this category.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      </section>

      {/* Ticket Configuration Modal */}
      {showTicketModal && selectedTemplate && (
        <div className="ticket-modal-overlay">
          <div className="ticket-modal">
            <div className="ticket-modal-header">
              <h2>Ticket Configuration</h2>
              <button className="close-btn" onClick={() => setShowTicketModal(false)}>×</button>
            </div>
            
            <div className="ticket-modal-body">
              {hasTickets === null ? (
                // Step 1: Ask if event has tickets
                <div className="ticket-option-step">
                  <h3>Does your event require tickets?</h3>
                  <p>You can sell tickets for your event or make it free entry.</p>
                  
                  <div className="ticket-options">
                    <button 
                      className="ticket-option-btn ticket-option-yes"
                      onClick={() => handleTicketOption(true)}
                    >
                      <div className="option-icon">🎫</div>
                      <div className="option-content">
                        <h4>Yes, sell tickets</h4>
                        <p>Set up paid tickets for your event</p>
                      </div>
                    </button>
                    
                    <button 
                      className="ticket-option-btn ticket-option-no"
                      onClick={() => handleTicketOption(false)}
                    >
                      <div className="option-icon">🎉</div>
                      <div className="option-content">
                        <h4>No, free entry</h4>
                        <p>Create event without tickets</p>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                // Step 2: Ticket configuration form with quantity for all types
                <div className="ticket-config-step">
                  <h3>Configure Your Tickets</h3>
                  <p>Set prices and quantities for different ticket types</p>
                  
                  <div className="ticket-types-grid">
                    {/* Early Bird Ticket */}
                    <div className="ticket-type-card">
                      <h4>Early Bird</h4>
                      <p className="ticket-description">Limited early bird tickets</p>
                      <div className="ticket-fields">
                        <div className="form-group">
                          <label>Price (R)</label>
                          <input
                            type="number"
                            value={ticketConfig.earlyBird.price}
                            onChange={(e) => handleInputChange('earlyBird', 'price', e.target.value)}
                            placeholder="e.g., 100"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="form-group">
                          <label>Quantity</label>
                          <input
                            type="number"
                            value={ticketConfig.earlyBird.quantity}
                            onChange={(e) => handleInputChange('earlyBird', 'quantity', e.target.value)}
                            placeholder="e.g., 50"
                            min="1"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* General Admission */}
                    <div className="ticket-type-card">
                      <h4>General Admission</h4>
                      <p className="ticket-description">Standard admission ticket</p>
                      <div className="ticket-fields">
                        <div className="form-group">
                          <label>Price (R)</label>
                          <input
                            type="number"
                            value={ticketConfig.general.price}
                            onChange={(e) => handleInputChange('general', 'price', e.target.value)}
                            placeholder="e.g., 150"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="form-group">
                          <label>Quantity</label>
                          <input
                            type="number"
                            value={ticketConfig.general.quantity}
                            onChange={(e) => handleInputChange('general', 'quantity', e.target.value)}
                            placeholder="e.g., 200"
                            min="1"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* VIP Ticket */}
                    <div className="ticket-type-card">
                      <h4>VIP</h4>
                      <p className="ticket-description">VIP experience with perks</p>
                      <div className="ticket-fields">
                        <div className="form-group">
                          <label>Price (R)</label>
                          <input
                            type="number"
                            value={ticketConfig.vip.price}
                            onChange={(e) => handleInputChange('vip', 'price', e.target.value)}
                            placeholder="e.g., 300"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="form-group">
                          <label>Quantity</label>
                          <input
                            type="number"
                            value={ticketConfig.vip.quantity}
                            onChange={(e) => handleInputChange('vip', 'quantity', e.target.value)}
                            placeholder="e.g., 50"
                            min="1"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* VVIP Ticket */}
                    <div className="ticket-type-card">
                      <h4>VVIP</h4>
                      <p className="ticket-description">Exclusive VVIP experience</p>
                      <div className="ticket-fields">
                        <div className="form-group">
                          <label>Price (R)</label>
                          <input
                            type="number"
                            value={ticketConfig.vvip.price}
                            onChange={(e) => handleInputChange('vvip', 'price', e.target.value)}
                            placeholder="e.g., 500"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="form-group">
                          <label>Quantity</label>
                          <input
                            type="number"
                            value={ticketConfig.vvip.quantity}
                            onChange={(e) => handleInputChange('vvip', 'quantity', e.target.value)}
                            placeholder="e.g., 20"
                            min="1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ticket-notes">
                    <p><strong>Note:</strong> Only ticket types with both price and quantity filled will be created.</p>
                    <p>Leave fields empty for ticket types you don't want to offer.</p>
                  </div>
                  
                  {/* Event Info Textarea */}
                  <div className="event-info-section">
                    <h4>Event Information</h4>
                    <textarea
                      value={eventInfo}
                      onChange={(e) => setEventInfo(e.target.value)}
                      placeholder="Add any important information about your event, ticket terms, or special instructions..."
                      rows="4"
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="ticket-modal-footer">
              {hasTickets === null ? (
                <button 
                  className="btn-back"
                  onClick={() => setShowTicketModal(false)}
                >
                  Cancel
                </button>
              ) : (
                <>
                  <button 
                    className="btn-back"
                    onClick={() => setHasTickets(null)}
                  >
                    Back
                  </button>
                  <button 
                    className="btn-submit"
                    onClick={handleSubmitTickets}
                  >
                    Continue to Editor
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}