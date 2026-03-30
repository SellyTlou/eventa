import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./main.css";
import { templates } from "./templates.js";
import { LoginNav } from "../components";
import { populateTemplateWithEventData } from "../utils/templateUtils";

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
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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

  // Handle template preview on hover/click
  const handlePreviewTemplate = (template) => {
    if (!eventData) {
      // Show preview without event data if no event exists
      setPreviewTemplate(template);
      return;
    }
    
    setIsLoading(true);
    try {
      const populated = populateTemplateWithEventData(template, eventData);
      setPreviewTemplate(populated);
    } catch (error) {
      console.error('Error populating template:', error);
      setPreviewTemplate(template);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (eventData?.eventName) {
      navigate("/createEvent");
    } else {
      navigate(-1);
    }
  };

  const navigateToEditor = (templateId, category, template) => {
    // Populate template with event data before sending to editor
    let finalTemplate = template;
    if (eventData) {
      try {
        finalTemplate = populateTemplateWithEventData(template, eventData);
      } catch (error) {
        console.error('Error populating template for editor:', error);
      }
    }
    
    navigate(`/postcardEditor?template=${templateId}&category=${category}`, {
      state: {
        eventData: eventData,
        template: finalTemplate
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
                  <div className="event-info">
                    <div className="event-icon">🎉</div>
                    <div className="event-details">
                      <strong>{eventData.eventName}</strong>
                      {eventData.eventStartDate && (
                        <span className="event-date">
                          on {new Date(eventData.eventStartDate).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                          {eventData.eventStartTime && ` at ${new Date(`2000-01-01T${eventData.eventStartTime}`).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="template-filters">
                {["All", "Birthday", "BabyShower", "Wedding", "Graduation"].map(filter => (
                  <button
                    key={filter}
                    className={`filter-btn ${activeFilter === filter ? "active" : ""}`}
                    onClick={() => handleFilterClick(filter)}
                  >
                    {filter === "All" ? "All Templates" : filter.replace(/([A-Z])/g, " $1").trim()}
                  </button>
                ))}
              </div>

              {/* Template Grid */}
              <div className="template-grid">
                {currentTemplates.length > 0 ? (
                  currentTemplates.map(template => (
                    <div
                      key={template.id}
                      className="template-card"
                      onClick={() => handleTemplateSelect(template.id)}
                      onMouseEnter={() => handlePreviewTemplate(template)}
                      onMouseLeave={() => setPreviewTemplate(null)}
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
                        {/* Preview badge for templates with placeholders */}
                        {template.placeholders && Object.keys(template.placeholders).length > 0 && (
                          <div className="dynamic-badge">
                            <span>✨ Dynamic</span>
                          </div>
                        )}
                      </div>
                      <div className="template-info">
                        <h3>{template.title}</h3>
                        <p>{template.description || "Beautiful customizable template"}</p>
                        {template.placeholders && (
                          <div className="template-placeholders">
                            <small>
                              Auto-fills: {Object.keys(template.placeholders).map(p => 
                                p.replace(/([A-Z])/g, " $1").toLowerCase()
                              ).join(", ")}
                            </small>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ textAlign: "center", gridColumn: "1/-1", fontSize: "18px", color: "#666" }}>
                    No templates found in this category.
                  </p>
                )}
              </div>

              {/* Preview Modal */}
              {previewTemplate && (
                <div className="template-preview-modal" onClick={() => setPreviewTemplate(null)}>
                  <div className="preview-content" onClick={(e) => e.stopPropagation()}>
                    <button className="close-preview" onClick={() => setPreviewTemplate(null)}>×</button>
                    <h3>Preview: {previewTemplate.title}</h3>
                    {isLoading ? (
                      <div className="preview-loading">Loading preview...</div>
                    ) : (
                      <div className="preview-canvas">
                        <TemplateMiniPreview template={previewTemplate} eventData={eventData} />
                      </div>
                    )}
                    <div className="preview-actions">
                      <button 
                        className="btn-use-template"
                        onClick={() => handleTemplateSelect(previewTemplate.id)}
                      >
                        Use This Template
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </>
  );
}

// Mini Preview Component for Templates
// Mini Preview Component for Templates
function TemplateMiniPreview({ template, eventData }) {
  const [populatedTemplate, setPopulatedTemplate] = useState(template);

  useEffect(() => {
    if (eventData && template.placeholders) {
      try {
        const populated = populateTemplateWithEventData(template, eventData);
        setPopulatedTemplate(populated);
      } catch (error) {
        console.error('Error populating preview:', error);
      }
    }
  }, [template, eventData]);

  const { data } = populatedTemplate;

  // Sort elements by zIndex to ensure proper layering
  const sortedShapes = useMemo(() => {
    return [...(data.shapes || [])].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  }, [data.shapes]);

  const sortedImages = useMemo(() => {
    return [...(data.images || [])].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  }, [data.images]);

  const sortedTexts = useMemo(() => {
    return [...(data.texts || [])].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  }, [data.texts]);

  // Combine all elements and sort by zIndex for overall layering
  const allElements = useMemo(() => {
    const elements = [
      ...sortedShapes.map(el => ({ ...el, elementType: 'shape' })),
      ...sortedImages.map(el => ({ ...el, elementType: 'image' })),
      ...sortedTexts.map(el => ({ ...el, elementType: 'text' }))
    ];
    return elements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  }, [sortedShapes, sortedImages, sortedTexts]);

  return (
    <div 
      className="mini-preview-canvas"
      style={{
        width: `${data.design?.properties?.size?.width || 500}px`,
        height: `${data.design?.properties?.size?.height || 400}px`,
        position: "relative",
        backgroundColor: data.bgConfig?.type === "color" ? data.bgConfig.value : "transparent",
        backgroundImage: data.bgConfig?.type === "image" ? `url(${data.bgConfig.value})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        overflow: "hidden",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
      }}
    >
      {/* Render all elements in sorted order */}
      {allElements.map(element => {
        if (element.elementType === 'shape') {
          return (
            <div
              key={element.id}
              style={{
                position: "absolute",
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height,
                backgroundColor: element.fill !== "transparent" ? element.fill : undefined,
                borderRadius: element.shapeType === "circle" ? "50%" : 
                             element.shapeType === "ellipse" ? "50%" : undefined,
                transform: `rotate(${element.rotation}deg)`,
                opacity: element.opacity,
                border: element.stroke ? `${element.strokeWidth}px solid ${element.stroke}` : "none"
              }}
            />
          );
        } else if (element.elementType === 'image') {
          return (
            <img
              key={element.id}
              src={element.src}
              alt=""
              style={{
                position: "absolute",
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height,
                transform: `rotate(${element.rotation}deg)`,
                opacity: element.opacity,
                objectFit: "contain"
              }}
            />
          );
        } else if (element.elementType === 'text') {
          return (
            <div
              key={element.id}
              style={{
                position: "absolute",
                left: element.x,
                top: element.y,
                width: element.width,
                fontSize: element.fontSize,
                fontFamily: element.fontFamily,
                fontWeight: element.fontWeight,
                color: element.fill,
                textAlign: element.align,
                transform: `rotate(${element.rotation}deg)`,
                opacity: element.opacity,
                whiteSpace: element.wrap === "none" ? "nowrap" : "normal",
                lineHeight: element.lineHeight,
                wordBreak: "break-word"
              }}
            >
              {element.text.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < element.text.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}