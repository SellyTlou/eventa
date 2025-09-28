import React, { useState, useEffect, useMemo } from "react";
import "../App.css";
import "../responce.css";
import { Navbar, Footer, Login } from "./components";

function Features() {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [activeTab, setActiveTab] = useState("Organizing Tools");
    const [startIndex, setStartIndex] = useState(0);

    const featureSections = useMemo(() => ({
        "Organizing Tools": [
            { 
                id: 1, 
                title: "Event Dashboard", 
                description: "Centralized control panel to manage all your events in one place with real-time updates and analytics.",
                icon: "bi bi-speedometer2"
            },
            { 
                id: 2, 
                title: "Calendar Sync", 
                description: "Automatically sync events with Google Calendar, Outlook, and Apple Calendar for seamless scheduling.",
                icon: "bi bi-calendar-event"
            },
            { 
                id: 3, 
                title: "Task Management", 
                description: "Create and assign tasks to team members with deadlines and progress tracking.",
                icon: "bi bi-check2-square"
            }
        ],
        "Invitation Tools": [
            { 
                id: 4, 
                title: "Email Invitations", 
                description: "Create totally customized and branded emails for save the dates, invitations, updates, and reminder emails.",
                icon: "bi bi-envelope"
            },
            { 
                id: 5, 
                title: "Guest List Management", 
                description: "Everything you need to manage your guest list from the first invitation to the last thank-you note.",
                icon: "bi bi-people"
            },
            { 
                id: 6, 
                title: "QR Codes", 
                description: "Add QR codes to invitations for easy guest registration or RSVP scanning.",
                icon: "bi bi-qr-code"
            }
        ],
        "Security Tools": [
            { 
                id: 7, 
                title: "Private Event Security", 
                description: "Password protect your page and limit event registration to invited guests only.",
                icon: "bi bi-shield-lock"
            },
            { 
                id: 8, 
                title: "Vaccine Passport", 
                description: "Confirm your guests' vaccine status or test results ahead of arrival.",
                icon: "bi bi-heart-pulse"
            },
            { 
                id: 9, 
                title: "Video Hosting", 
                description: "Add video to your event website hosted on popular platforms or with RSVPify.",
                icon: "bi bi-play-btn"
            }
        ],
        "Management Tools": [
            { 
                id: 10, 
                title: "Gift & Donation Collection", 
                description: "Seamlessly collect donations and gifts within the RSVP process. No external apps or hassle.",
                icon: "bi bi-gift"
            },
            { 
                id: 11, 
                title: "Check-In System", 
                description: "Handle event check-in for guests from any mobile device, tablet or desktop computer.",
                icon: "bi bi-clipboard-check"
            },
            { 
                id: 12, 
                title: "Seating Chart Maker", 
                description: "Drag-and-drop event seating chart tool to organize attendees into tables or groups.",
                icon: "bi bi-grid-3x3"
            }
        ]
    }), []);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [loginMode, setLoginMode] = useState("login");

    const handleLoginClick = () => {
        setLoginMode("login");
        setIsLoginOpen(true);
    };

    const handleSignupClick = () => {
        setLoginMode("signup");
        setIsLoginOpen(true);
    }

    const handleNext = () => {
        const currentCards = featureSections[activeTab];
        const newIndex = (startIndex + 1) % currentCards.length;
        setStartIndex(newIndex);
        
        // Update tab if we're at the last card and need to switch categories
        if (newIndex === 0 && currentCards.length === 3) {
            const tabs = Object.keys(featureSections);
            const currentIndex = tabs.indexOf(activeTab);
            const nextIndex = (currentIndex + 1) % tabs.length;
            setActiveTab(tabs[nextIndex]);
        }
    };

    const handlePrev = () => {
        const currentCards = featureSections[activeTab];
        const newIndex = (startIndex - 1 + currentCards.length) % currentCards.length;
        setStartIndex(newIndex);
        
        // Update tab if we're at the first card and need to switch categories
        if (newIndex === currentCards.length - 1 && currentCards.length === 3) {
            const tabs = Object.keys(featureSections);
            const currentIndex = tabs.indexOf(activeTab);
            const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
            setActiveTab(tabs[prevIndex]);
        }
    };

    const handleTabClick = (tab) => {
        setActiveTab(tab);
        setStartIndex(0);
    };

    const getVisibleCards = () => {
        const currentCards = featureSections[activeTab];
        const cardsToShow = isMobile ? 1 : 3;
        const visibleCards = [];

        for (let i = 0; i < cardsToShow; i++) {
            const index = (startIndex + i) % currentCards.length;
            visibleCards.push(currentCards[index]);
        }
        return visibleCards;
    };

    return (
        <>
            <Navbar
                onLoginClick={handleLoginClick}
                onSignupClick={handleSignupClick}
            />
            <Login
                isOpen={isLoginOpen}
                onClose={() => setIsLoginOpen(false)}
                defaultMode={loginMode}
            />

            <div className="features-page">
                {/* Hero Section */}
                <section className="features-hero">
                    <div className="container">
                        <div className="row">
                            <div className="col-12 text-center">
                                <h1>Event Management Software Features</h1>
                                <p className="lead">
                                    Powerful, end-to-end event management software with all the features 
                                    you need to make your events successful.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Tabs Section */}
                <section className="features-tabs-section">
                    <div className="container">
                        {/* Tab Navigation */}
                        <div className="row navBtn">
                            {Object.keys(featureSections).map((tab) => (
                                <button
                                    key={tab}
                                    className={`btn ${activeTab === tab ? 'btn-create' : 'btn-demo'}`}
                                    onClick={() => handleTabClick(tab)}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="features-content">
                            <div className="section-header text-center">
                                <h2>{activeTab}</h2>
                                <p>Discover our comprehensive {activeTab.toLowerCase()} designed to streamline your event planning process</p>
                            </div>

                            {/* Cards Slider */}
                        <div className="features-slider-wrapper">
                                <button className="slider-btn" onClick={handlePrev}>
                                    <i className="bi bi-caret-left"></i>
                                </button>
                                
                                <div className="cards-container features-row">
                                    {getVisibleCards().map((card) => (
                                        <div key={card.id} className="col-lg-4 feature-card">
                                            <div className="feature-icon">
                                                <i className={card.icon}></i>
                                            </div>
                                            <h4>{card.title}</h4>
                                            <p>{card.description}</p>
                                            <button className="btn btn-view-more">Learn More</button>
                                        </div>
                                    ))}
                                </div>
                                
                                <button className="slider-btn" onClick={handleNext}>
                                    <i className="bi bi-caret-right"></i>
                                </button>
                            </div>

                            {/* Mobile Indicators */}
                            {isMobile && (
                                <div className="mobile-indicators">
                                    {featureSections[activeTab].map((_, index) => (
                                        <span
                                            key={index}
                                            className={`indicator-dot ${index === startIndex ? 'active' : ''}`}
                                            onClick={() => setStartIndex(index)}
                                        ></span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            <Footer />
        </>
    );
}

export default Features;