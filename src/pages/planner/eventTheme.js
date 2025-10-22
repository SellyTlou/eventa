import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./main.css";
import { templates } from "./templates.js";
import { LoginNav } from "../components";

export default function EventTheme() {
    const navigate = useNavigate();
    const [activeFilter, setActiveFilter] = useState("All");

    const allCategories = useMemo(() => {
        const allTemplates = {
            All: [
                ...templates.Birthday,
                ...templates.BabyShower,
                ...templates.Wedding,
                ...templates.Graduation
            ]
        };
        return { ...allTemplates, ...templates };
    }, []);

    // Create a mapping of template IDs to their categories using Map
    const templateToCategoryMap = useMemo(() => {
        const map = new Map();
        Object.keys(templates).forEach(category => {
            templates[category].forEach(template => {
                map.set(template.id, category);
            });
        });
        return map;
    }, []);

    // ADD THIS MISSING FUNCTION
    const getStepClass = (step) => {
        const currentStep = 3; // Since this is step 3 in the flow
        if (step === currentStep) {
            return "progress-step active";
        } else if (step < currentStep) {
            return "progress-step completed";
        } else {
            return "progress-step";
        }
    };

    // ADD THIS MISSING FUNCTION
    const handleFilterClick = (filter) => {
        setActiveFilter(filter);
    };

    const handleTemplateSelect = (templateId) => {
        const actualCategory = templateToCategoryMap.get(templateId);
        navigate(`/postcardEditor?template=${templateId}&category=${actualCategory}`);
    };

    const handleBack = () => {
        navigate(-1);
    };

    return (
        <section className="eventThemePage">
            <LoginNav />
            <button
                className="eventa-back-btn"
                onClick={handleBack}
            >
                &#8592; Back
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

                    <div className="template-filters">
                        <button
                            className={`filter-btn ${activeFilter === "All" ? "active" : ""}`}
                            onClick={() => handleFilterClick("All")}
                        >
                            All
                        </button>
                        <button
                            className={`filter-btn ${activeFilter === "BabyShower" ? "active" : ""}`}
                            onClick={() => handleFilterClick("BabyShower")}
                        >
                            Baby Shower
                        </button>
                        <button
                            className={`filter-btn ${activeFilter === "Birthday" ? "active" : ""}`}
                            onClick={() => handleFilterClick("Birthday")}
                        >
                            Birthday
                        </button>
                        <button
                            className={`filter-btn ${activeFilter === "Wedding" ? "active" : ""}`}
                            onClick={() => handleFilterClick("Wedding")}
                        >
                            Wedding
                        </button>
                        <button
                            className={`filter-btn ${activeFilter === "Graduation" ? "active" : ""}`}
                            onClick={() => handleFilterClick("Graduation")}
                        >
                            Graduation
                        </button>
                    </div>

                    <div className="template-grid">
                        {allCategories[activeFilter].map(template => (
                            <div
                                key={template.id}
                                className="template-card"
                                onClick={() => handleTemplateSelect(template.id)}
                            >
                                <div className="template-image">
                                    <img src={template.image} alt={template.title} />
                                </div>
                                <div className="template-info">
                                    <h3>{template.title}</h3>
                                    <p>{template.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </section>
    );
}