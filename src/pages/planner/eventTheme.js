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
    localStorage.setItem(eventDataKey, JSON.stringify(eventData));
    
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
    
    return JSON.parse(data);
  } catch (error) {
    console.error('Error retrieving event data:', error);
    return null;
  }
};

export default function EventTheme() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [eventData, setEventData] = useState(null);

  // Load existing event data on component mount
  useEffect(() => {
    const storedEventData = getEventDataFromStorage();
    if (storedEventData) {
      setEventData(storedEventData);
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
    
    // Navigate directly to editor without ticket modal
    navigateToEditor(templateId, category, template);
  };

  const handleBack = () => {
    if (eventData?.eventName) {
      navigate("/createEvent");
    } else {
      navigate(-1);
    }
  };

  const navigateToEditor = (templateId, category, template) => {
    navigate(`/postcardEditor?template=${templateId}&category=${category}`, {
      state: {
        eventData: eventData,
        template: template
      }
    });
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
    </>
  );
}