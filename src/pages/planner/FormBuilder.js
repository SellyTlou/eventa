// FormBuilder.js - Updated with better UI and drag-drop
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LoginNav } from "../components";
import "./formBuilder.css";
import "../../alert.css";

const FormBuilder = () => {
    const navigate = useNavigate();
    const [eventId, setEventId] = useState(null);
    const [eventData, setEventData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [customQuestions, setCustomQuestions] = useState([]);
    const [newQuestion, setNewQuestion] = useState({ text: "", type: "text", required: false });
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [welcomeMessage, setWelcomeMessage] = useState("Let's Party");
    const [rsvpButtonText, setRsvpButtonText] = useState("Please press enter on your keyboard or click the button below to begin your RSVP.");
    const [alert, setAlert] = useState({ show: false, message: "", type: "" });
    const [showAddForm, setShowAddForm] = useState(false);

    const printAlert = (message, type = "info") => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert({ show: false, message: "", type: "" }), 5000);
    };

    useEffect(() => {
        const storedEventId = localStorage.getItem("selectedEventId");
        if (!storedEventId) {
            printAlert("No event selected", "error");
            navigate("/event-checklist");
            return;
        }
        setEventId(storedEventId);
        fetchEventDetails(storedEventId);
        fetchCustomQuestions(storedEventId);
    }, [navigate]);

    const fetchEventDetails = async (eventId) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "getEventById");
            formData.append("event_id", eventId);
            
            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });
            
            const data = await response.json();
            if (data.success && data.events && data.events.length > 0) {
                const event = data.events[0];
                setEventData(event);
                
                if (event.design_data) {
                    try {
                        const designData = JSON.parse(event.design_data);
                        if (designData.formBuilder) {
                            setWelcomeMessage(designData.formBuilder.welcomeMessage || "Let's Party");
                            setRsvpButtonText(designData.formBuilder.rsvpButtonText || "Please press enter on your keyboard or click the button below to begin your RSVP.");
                        }
                    } catch (e) {}
                }
            }
        } catch (err) {
            console.error("Error fetching event details:", err);
        }
    };

    const fetchCustomQuestions = async (eventId) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "getEventCustomQuestions");
            formData.append("event_id", eventId);
            
            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });
            
            const data = await response.json();
            if (data.success) {
                setCustomQuestions(data.questions || []);
            }
        } catch (err) {
            console.error("Error fetching custom questions:", err);
        } finally {
            setLoading(false);
        }
    };

    const addCustomQuestion = async () => {
        if (!newQuestion.text.trim()) {
            printAlert("Please enter a question", "warning");
            return;
        }
        
        setSaving(true);
        
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "addEventCustomQuestion");
            formData.append("event_id", eventId);
            formData.append("question_text", newQuestion.text);
            formData.append("question_type", newQuestion.type);
            formData.append("required", newQuestion.required ? "1" : "0");
            
            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });
            
            const data = await response.json();
            if (data.success) {
                setCustomQuestions([...customQuestions, { 
                    id: data.question_id, 
                    question_text: newQuestion.text, 
                    question_type: newQuestion.type, 
                    is_required: newQuestion.required ? 1 : 0,
                    display_order: customQuestions.length
                }]);
                setNewQuestion({ text: "", type: "text", required: false });
                setShowAddForm(false);
                printAlert("Question added successfully!", "success");
            } else {
                printAlert(data.message || "Failed to add question.", "error");
            }
        } catch (err) {
            console.error("Error adding question:", err);
            printAlert("Error adding question.", "error");
        } finally {
            setSaving(false);
        }
    };

    const removeCustomQuestion = async (questionId) => {
        if (!window.confirm("Are you sure you want to remove this question?")) return;
        
        setSaving(true);
        
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "removeEventCustomQuestion");
            formData.append("question_id", questionId);
            
            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });
            
            const data = await response.json();
            if (data.success) {
                setCustomQuestions(customQuestions.filter(q => q.id !== questionId));
                printAlert("Question removed.", "success");
            } else {
                printAlert(data.message || "Failed to remove question.", "error");
            }
        } catch (err) {
            console.error("Error removing question:", err);
            printAlert("Error removing question.", "error");
        } finally {
            setSaving(false);
        }
    };

    // Drag and Drop Functions
    const handleDragStart = (e, index) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index);
        setDraggedIndex(index);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e, dropIndex) => {
        e.preventDefault();
        
        if (draggedIndex === null || draggedIndex === dropIndex) return;
        
        const newQuestions = [...customQuestions];
        const [draggedItem] = newQuestions.splice(draggedIndex, 1);
        newQuestions.splice(dropIndex, 0, draggedItem);
        
        const updatedQuestions = newQuestions.map((q, idx) => ({
            ...q,
            display_order: idx
        }));
        
        setCustomQuestions(updatedQuestions);
        setDraggedIndex(null);
        
        setSaving(true);
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "updateQuestionOrder");
            formData.append("questions", JSON.stringify(updatedQuestions.map(q => ({ id: q.id, order: q.display_order }))));
            
            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });
            
            const data = await response.json();
            if (data.success) {
                printAlert("Question order updated!", "success");
            }
        } catch (err) {
            console.error("Error saving order:", err);
            fetchCustomQuestions(eventId);
        } finally {
            setSaving(false);
        }
    };

    const saveFormSettings = async () => {
        setSaving(true);
        
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            
            const designData = eventData?.design_data ? JSON.parse(eventData.design_data) : {};
            designData.formBuilder = {
                welcomeMessage,
                rsvpButtonText
            };
            
            const updateData = new FormData();
            updateData.append("function", "updateEventDesignData");
            updateData.append("event_id", eventId);
            updateData.append("design_data", JSON.stringify(designData));
            
            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: updateData,
            });
            
            const data = await response.json();
            if (data.success) {
                printAlert("Form settings saved successfully!", "success");
                setTimeout(() => navigate("/event-checklist"), 1500);
            } else {
                printAlert("Failed to save settings.", "error");
            }
        } catch (err) {
            console.error("Error saving form:", err);
            printAlert("Error saving form settings.", "error");
        } finally {
            setSaving(false);
        }
    };

    const goBack = () => {
        navigate("/event-checklist");
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p>Loading form builder...</p>
            </div>
        );
    }

    return (
        <>
            <LoginNav />
            <div className="form-builder-page">
                {alert.show && (
                    <div className={`custom-alert ${alert.type}`}>
                        <i className={`fas ${alert.type === "error" ? "fa-times-circle" : alert.type === "success" ? "fa-check-circle" : "fa-info-circle"}`}></i>
                        <span>{alert.message}</span>
                    </div>
                )}
                
                <div className="form-builder-container">
                    {/* Breadcrumb */}
                    <div className="breadcrumb">
                        <button className="breadcrumb-link" onClick={goBack}>azishe</button>
                        <span className="breadcrumb-separator"> &gt; </span>
                        <button className="breadcrumb-link" onClick={goBack}>Setup</button>
                        <span className="breadcrumb-separator"> &gt; </span>
                        <span className="breadcrumb-current">Form Builder</span>
                    </div>
                    
                    {/* Top Action Buttons */}
                    <div className="form-builder-top-actions">
                        <div className="action-buttons">
                            <button className="back-btn-top" onClick={goBack} disabled={saving}>
                                <i className="bi bi-arrow-left"></i> Back
                            </button>
                            <button className="save-btn-top" onClick={saveFormSettings} disabled={saving}>
                                {saving ? (
                                    <><span className="spinner-border spinner-border-sm me-2"></span> Saving...</>
                                ) : (
                                    <><i className="bi bi-check-lg"></i> Save Form</>
                                )}
                            </button>
                        </div>
                        <div className="event-status">
                            <span className="status-badge closed">Closed</span>
                            <button className="view-event-btn">View Event</button>
                            <button className="upgrade-btn">UPGRADE</button>
                        </div>
                    </div>
                    
                    {/* Main Content */}
                    <div className="form-builder-main">
                        {/* Left Sidebar */}
                        <div className="form-builder-sidebar">
                            <div className="sidebar-section">
                                <h3>Form Settings</h3>
                                <div className="theme-options">
                                    <button className="theme-option active">Form Builder</button>
                                    <button className="theme-option">Questions</button>
                                </div>
                            </div>
                            
                            <div className="sidebar-section">
                                <h3>Add New Question</h3>
                                {!showAddForm ? (
                                    <button 
                                        className="add-question-btn"
                                        onClick={() => setShowAddForm(true)}
                                    >
                                        <i className="bi bi-plus-circle"></i> Add Custom Question
                                    </button>
                                ) : (
                                    <div className="add-question-form-sidebar">
                                        <input
                                            type="text"
                                            placeholder="Enter your question"
                                            value={newQuestion.text}
                                            onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                                            className="form-input"
                                        />
                                        <select
                                            value={newQuestion.type}
                                            onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value })}
                                            className="form-select"
                                        >
                                            <option value="text">Short Text</option>
                                            <option value="textarea">Paragraph</option>
                                            <option value="select">Dropdown</option>
                                            <option value="radio">Multiple Choice</option>
                                        </select>
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={newQuestion.required}
                                                onChange={(e) => setNewQuestion({ ...newQuestion, required: e.target.checked })}
                                            />
                                            Required
                                        </label>
                                        <div className="form-actions">
                                            <button 
                                                className="cancel-btn"
                                                onClick={() => {
                                                    setShowAddForm(false);
                                                    setNewQuestion({ text: "", type: "text", required: false });
                                                }}
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                className="add-btn" 
                                                onClick={addCustomQuestion}
                                                disabled={saving}
                                            >
                                                Add Question
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Main Content Area */}
                        <div className="form-builder-content">
                            {/* Welcome Message */}
                            <div className="welcome-section">
                                <div className="welcome-editor">
                                    <label>Welcome Message</label>
                                    <textarea
                                        value={welcomeMessage}
                                        onChange={(e) => setWelcomeMessage(e.target.value)}
                                        className="welcome-input"
                                        rows="2"
                                        placeholder="Enter welcome message..."
                                    />
                                </div>
                                
                                <div className="rsvp-preview">
                                    <div className="event-icon">🎉</div>
                                    <h2>RSVP</h2>
                                    <p className="event-tagline">{welcomeMessage}</p>
                                    <div className="media-note">
                                        <i className="bi bi-info-circle"></i>
                                        <span>Text, Image, Video</span>
                                    </div>
                                    <div className="rsvp-trigger">
                                        <textarea
                                            value={rsvpButtonText}
                                            onChange={(e) => setRsvpButtonText(e.target.value)}
                                            className="rsvp-trigger-input"
                                            rows="2"
                                            placeholder="Enter RSVP button text..."
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Custom Questions */}
                            <div className="questions-section">
                                <h3>Form Questions <span className="question-count">({customQuestions.length})</span></h3>
                                <p className="drag-hint"><i className="bi bi-arrow-up-down"></i> Drag and drop to reorder questions</p>
                                
                                <div className="questions-list">
                                    {customQuestions.length > 0 ? (
                                        customQuestions.map((q, index) => (
                                            <div 
                                                key={q.id} 
                                                className={`question-item drag-item ${draggedIndex === index ? 'dragging' : ''}`}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, index)}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleDrop(e, index)}
                                            >
                                                <div className="drag-handle">
                                                    <i className="bi bi-grip-vertical"></i>
                                                </div>
                                                <div className="question-info">
                                                    <div className="question-header">
                                                        <span className="question-type">{q.question_type}</span>
                                                        {q.is_required === 1 && <span className="required-badge">Required</span>}
                                                        <button 
                                                            className="delete-question"
                                                            onClick={() => removeCustomQuestion(q.id)}
                                                            disabled={saving}
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </div>
                                                    <div className="question-text">{q.question_text}</div>
                                                    <div className="question-preview">
                                                        {q.question_type === 'text' && <input type="text" placeholder="Short answer" disabled />}
                                                        {q.question_type === 'textarea' && <textarea placeholder="Paragraph answer" rows="2" disabled />}
                                                        {q.question_type === 'select' && (
                                                            <select disabled>
                                                                <option>Option 1</option>
                                                                <option>Option 2</option>
                                                            </select>
                                                        )}
                                                        {q.question_type === 'radio' && (
                                                            <div className="radio-group">
                                                                <label><input type="radio" name="preview" disabled /> Option 1</label>
                                                                <label><input type="radio" name="preview" disabled /> Option 2</label>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="empty-questions">
                                            <i className="bi bi-plus-circle"></i>
                                            <p>No custom questions yet</p>
                                            <p className="helper-text">Click "Add Custom Question" on the left to get started</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default FormBuilder;