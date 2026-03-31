import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import "../../src/pages/planner/main.css";
import "../responce.css";
import { Navbar, Footer, Login, NewEventPopupBtn } from "./components";

function Index() {
    const navigate = useNavigate();
    const [startIndex, setStartIndex] = useState(0);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showMaintenance, setShowMaintenance] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [pricingPlans, setPricingPlans] = useState([]);
    const [loadingPricing, setLoadingPricing] = useState(true);
    const [trendingEvents, setTrendingEvents] = useState([]);
    const [loadingTrending, setLoadingTrending] = useState(true);
    const [trendingIndex, setTrendingIndex] = useState(0);
    const sliderIntervalRef = useRef(null);

    const events = [
        { id: 1, title: "Wedding Bash", img: "/images/popular events/wedding.png", description: "Turn your wedding dream into a reality." },
        { id: 2, title: "Birthday Party", img: "/images/popular events/birthday.png", description: "Celebrate a special birthday with friends and family." },
        { id: 3, title: "Music Concert", img: "/images/popular events/concert.png", description: "Seamless concert planning from soundtrack to spotlight." },
        { id: 4, title: "Baby Shower", img: "images/popular events/baby shower.png", description: "Creating unforgattable baby shower memories" },
    ];

    // Fetch pricing plans from database
    const fetchPricingPlans = async () => {
        try {
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("function", "getAllPackages");

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            console.log("Pricing plans data:", data);

            if (data.success && data.packages) {
                const formattedPlans = data.packages.map(pkg => {
                    const baseName = pkg.package_type.toUpperCase();
                    const displayName = pkg.price == 0 ? "Free" : baseName;

                    return {
                        id: pkg.package_id,
                        name: displayName,
                        price: pkg.price == 0 ? "Free" : `R${pkg.price}`,
                        duration: "per month",
                        max_guests: pkg.max_guests,
                        max_events: pkg.max_events,
                        features: pkg.features ? pkg.features.split(',').map(feature => feature.trim()) :
                            getDefaultFeatures(pkg.package_type, pkg.max_guests, pkg.max_events),
                        isPopular: pkg.package_type.toUpperCase() === 'PREMIUM'
                    };
                });
                setPricingPlans(formattedPlans);
            } else {
                setPricingPlans(getDefaultPricingPlans());
            }
        } catch (err) {
            console.error("Error fetching pricing plans:", err);
            setPricingPlans(getDefaultPricingPlans());
        } finally {
            setLoadingPricing(false);
        }
    };

    // Fetch trending events based on ticket sales
    const fetchTrendingEvents = async () => {
        try {
            setLoadingTrending(true);
            const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
            const formData = new FormData();
            formData.append("function", "getTrendingEvents");

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            console.log("Trending events data:", data);

            if (data.success && Array.isArray(data.events)) {
                // Ensure each event has an event_id
                const validEvents = data.events.filter(event => event.event_id != null);
                console.log("Valid events with IDs:", validEvents.length);
                setTrendingEvents(validEvents);
            } else {
                console.error("Failed to fetch trending events:", data.message);
                setTrendingEvents([]);
            }
        } catch (err) {
            console.error("Error fetching trending events:", err);
            setTrendingEvents([]);
        } finally {
            setLoadingTrending(false);
        }
    };

    // Handle click on event
    const handleEventClick = (event) => {
        console.log("Event clicked:", event);

        // Get the event ID - could be in different formats
        const eventId = event?.event_id;

        if (eventId) {
            // Make sure to use the correct path for ticket events
            navigate(`/ticketEvent_details?id=${encodeURIComponent(eventId)}`);
        } else {
            console.error("No event ID found in:", event);

            // Try alternative ID fields
            const altId = event?.id;
            if (altId) {
                navigate(`/ticketEvent_details?id=${encodeURIComponent(altId)}`);
            } else {
                alert("Cannot open event: No ID found");
            }
        }
    };

    // Trending events slider functions
    const getVisibleTrendingEvents = () => {
        const cardsToShow = isMobile ? 1 : 3;

        // If we have fewer events than cards to show, just show all events
        if (trendingEvents.length <= cardsToShow) {
            return trendingEvents;
        }

        // Otherwise, show a sliding window of events
        const visibleEvents = [];
        for (let i = 0; i < cardsToShow; i++) {
            const index = (trendingIndex + i) % trendingEvents.length;
            visibleEvents.push(trendingEvents[index]);
        }
        return visibleEvents;
    };

    const handleTrendingNext = () => {
        const cardsToShow = isMobile ? 1 : 3;
        if (trendingEvents.length > cardsToShow) {
            setTrendingIndex((prevIndex) => (prevIndex + 1) % trendingEvents.length);
            resetSliderInterval();
        }
    };

    const handleTrendingPrev = () => {
        const cardsToShow = isMobile ? 1 : 3;
        if (trendingEvents.length > cardsToShow) {
            setTrendingIndex((prevIndex) => (prevIndex - 1 + trendingEvents.length) % trendingEvents.length);
            resetSliderInterval();
        }
    };

    const resetSliderInterval = () => {
        const cardsToShow = isMobile ? 1 : 3;
        if (sliderIntervalRef.current) {
            clearInterval(sliderIntervalRef.current);
        }
        // Only start interval if there are enough events to slide
        if (trendingEvents.length > cardsToShow) {
            sliderIntervalRef.current = setInterval(() => {
                setTrendingIndex((prevIndex) => (prevIndex + 1) % trendingEvents.length);
            }, 5000);
        }
    };

    // Auto-slide for trending events
    useEffect(() => {
        resetSliderInterval();
        return () => {
            if (sliderIntervalRef.current) {
                clearInterval(sliderIntervalRef.current);
            }
        };
    }, [trendingEvents.length, isMobile]);

    // Reset index when events change
    useEffect(() => {
        setTrendingIndex(0);
    }, [trendingEvents]);

    // Log trending events when they change
    useEffect(() => {
        console.log("Current trending events:", trendingEvents);
    }, [trendingEvents]);

    // Fallback function for features
    const getDefaultFeatures = (packageType, maxGuests, maxEvents) => {
        const packageTypeUpper = packageType.toUpperCase();

        const featuresMap = {
            'FREE': [
                `${maxEvents === 1 ? '1 event' : `${maxEvents} events`}`,
                `Up to ${maxGuests} guests`,
                "Basic invitations",
                "RSVP tracking",
                "Email support"
            ],
            'BASIC': [
                `${maxEvents === 1 ? '1 event' : `${maxEvents} events`}`,
                `Up to ${maxGuests} guests`,
                "Customizable invitations",
                "RSVP tracking",
                "Guest management",
                "Email support"
            ],
            'PREMIUM': [
                `${maxEvents === 1 ? '1 event' : `${maxEvents} events`}`,
                `Up to ${maxGuests} guests`,
                "Premium invitations",
                "Advanced RSVP tracking",
                "Seating charts",
                "Automated reminders",
                "Priority support"
            ],
            'ADVANCED': [
                `${maxEvents === 1 ? '1 event' : `${maxEvents} events`}`,
                `Up to ${maxGuests} guests`,
                "Custom branding",
                "Advanced analytics",
                "Dedicated account manager",
                "API access",
                "Custom integrations"
            ]
        };

        return featuresMap[packageTypeUpper] || ["Event management features"];
    };

    // Fallback default pricing plans
    const getDefaultPricingPlans = () => {
        return [
            {
                id: 1,
                name: "Free",
                price: "Free",
                duration: "per month",
                max_guests: 50,
                max_events: 1,
                features: [
                    "1 event",
                    "Up to 50 guests",
                    "Basic invitations",
                    "RSVP tracking",
                    "Email support"
                ],
                isPopular: false,
            },
            {
                id: 2,
                name: "BASIC",
                price: "R250",
                duration: "per month",
                max_guests: 50,
                max_events: 6,
                features: [
                    "6 events",
                    "Up to 50 guests",
                    "Customizable invitations",
                    "Guest management",
                    "Email support"
                ],
                isPopular: false,
            },
            {
                id: 3,
                name: "PREMIUM",
                price: "R400",
                duration: "per month",
                max_guests: 200,
                max_events: 20,
                features: [
                    "20 events",
                    "Up to 200 guests",
                    "Premium invitations",
                    "Advanced RSVP tracking",
                    "Seating charts",
                    "Automated reminders",
                    "Priority support"
                ],
                isPopular: true,
            },
            {
                id: 4,
                name: "ADVANCED",
                price: "R750",
                duration: "per month",
                max_guests: 100,
                max_events: 150,
                features: [
                    "150 events",
                    "Up to 100 guests",
                    "Custom branding",
                    "Advanced analytics",
                    "Dedicated account manager",
                    "API access",
                    "Custom integrations"
                ],
                isPopular: false,
            },
        ];
    };

    useEffect(() => {
        fetchPricingPlans();
        fetchTrendingEvents();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % 3);
        }, 6000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleNext = () => {
        setStartIndex((prevIndex) => (prevIndex + 1) % events.length);
    };

    const handlePrev = () => {
        setStartIndex((prevIndex) => (prevIndex - 1 + events.length) % events.length);
    };

    const getVisibleEvents = () => {
        const cardsToShow = isMobile ? 1 : 3;
        const visibleEvents = [];

        for (let i = 0; i < cardsToShow; i++) {
            const index = (startIndex + i) % events.length;
            visibleEvents.push(events[index]);
        }
        return visibleEvents;
    };

    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [loginMode, setLoginMode] = useState("login");
    const [loginAccountType, setLoginAccountType] = useState("personal");

    const handleLoginClick = (accountType = "personal") => {
        setLoginMode("login");
        setLoginAccountType(accountType);
        setIsLoginOpen(true);
    };

    const handleSignupClick = (accountType = "personal") => {
        setLoginMode("signup");
        setLoginAccountType(accountType);
        setIsLoginOpen(true);
    }

    const [activeTab, setActiveTab] = useState("Invitations");
    const [managementStartIndex, setManagementStartIndex] = useState(0);

    const managementFeatures = {
        Invitations: [
            { id: 1, icon: "bi bi-envelope", title: "Email Invitations", description: "Send elegant, customizable email invites with just a few clicks." },
            { id: 2, icon: "bi bi-qr-code", title: "QR Code Invitations", description: "Create scannable QR codes for easy guest check-in." },
            { id: 3, icon: "bi bi-link", title: "Shareable Links", description: "Generate a unique link to share your invitation on any platform." },
            { id: 4, icon: "bi bi-image", title: "Custom Designs", description: "Design your invitations with our intuitive template builder." },
        ],
        Management: [
            { id: 5, icon: "bi bi-people", title: "Guest List Management", description: "Easily manage and organize your guest list with our intuitive tools." },
            { id: 6, icon: "bi bi-list-columns", title: "Seating Charts", description: "Drag and drop to create perfect seating arrangements." },
            { id: 7, icon: "bi bi-calendar-check", title: "Event Schedule", description: "Build a detailed timeline for your event and share it with guests." },
        ],
        "RSVP Tracking": [
            { id: 8, icon: "bi bi-card-checklist", title: "Real-time RSVP Tracking", description: "Keep track of who is coming and who isn't with real-time updates." },
            { id: 9, icon: "bi bi-send-check", title: "Automated Reminders", description: "Send automated reminders to guests who haven't responded yet." },
            { id: 10, icon: "bi bi-bar-chart", title: "Guest Insights", description: "View analytics on guest responses and demographics." },
        ],
    };

    const handleManagementNext = () => {
        const currentCards = managementFeatures[activeTab];
        setManagementStartIndex((prevIndex) => (prevIndex + 1) % currentCards.length);
    };

    const handleManagementPrev = () => {
        const currentCards = managementFeatures[activeTab];
        setManagementStartIndex((prevIndex) => (prevIndex - 1 + currentCards.length) % currentCards.length);
    };

    const getVisibleManagementCards = () => {
        const currentCards = managementFeatures[activeTab];
        const cardsToShow = isMobile ? 1 : 3;
        const visibleCards = [];

        for (let i = 0; i < cardsToShow; i++) {
            const index = (managementStartIndex + i) % currentCards.length;
            visibleCards.push(currentCards[index]);
        }
        return visibleCards;
    };

    const handleViewMoreClick = () => {
        setShowMaintenance(true);
    };

    const handleGetStartedClick = (planName, planId) => {
        const isFreePlan = planName.toLowerCase() === 'free' || planName === 'Free';

        if (isFreePlan) {
            window.location.href = "/createevent";
        } else {
            window.location.href = `/upgrade_package?package_id=${planId}`;
        }
    };

    // Get visible trending events
    const visibleTrendingEvents = getVisibleTrendingEvents();
    const cardsToShow = isMobile ? 1 : 3;
    const canSlide = trendingEvents.length > cardsToShow;

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
                defaultAccountType={loginAccountType}
            />
            <NewEventPopupBtn />

            <div className="homepage-section">
                {/* Home Header with Carousel */}
                <section className="homeHeader">
                    <div className="hero-carousel">
                        {/* SLIDE 1 */}
                        <section className={`hero-slide ${currentSlide === 0 ? 'active' : ''}`} style={{ backgroundImage: "url('/images/home_2.jpg')" }}>
                            <div className="overlay"></div>
                            <div className="container">
                                <div className="row">
                                    <div className="col-lg-8 mx-auto text-center text-content">
                                        <span className="slide-tag">Welcome to Evendi</span>
                                        <h1 className="slide-title">Where Every Celebration Comes Alive</h1>
                                        <p className="slide-description">
                                            Make every event memorable. From intimate gatherings to grand celebrations,
                                            Evendi helps you design invitations, track responses, and engage your guests effortlessly.
                                        </p>
                                        <div className="btn-container">
                                            <button className="btn btn-primary btn-lg" onClick={() => window.location.href = "/createevent"}>
                                                Get Started
                                            </button>
                                            <button className="btn btn-outline-light btn-lg" onClick={() => window.location.href = "/ticket_sales"}>
                                                Explore Events
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* SLIDE 2 */}
                        <section className={`hero-slide ${currentSlide === 1 ? 'active' : ''}`} style={{ backgroundImage: "url('/images/home2.png')" }}>
                            <div className="overlay"></div>
                            <div className="container">
                                <div className="row">
                                    <div className="col-lg-8 mx-auto text-center text-content">
                                        <span className="slide-tag">Beautiful Designs</span>
                                        <h1 className="slide-title">Create Stunning Invitations in Minutes</h1>
                                        <p className="slide-description">
                                            Choose from hundreds of elegant templates. Customize colors, fonts, and animations.
                                            Send via Email, WhatsApp, SMS, or QR code — all with one click.
                                        </p>
                                        <div className="btn-container">
                                            <button className="btn btn-primary btn-lg" onClick={() => window.location.href = "/createevent"}>
                                                Start Creating
                                            </button>
                                            <button className="btn btn-outline-light btn-lg" onClick={() => window.location.href = "/templates"}>
                                                View Templates
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* SLIDE 3 */}
                        <section className={`hero-slide ${currentSlide === 2 ? 'active' : ''}`} style={{ backgroundImage: "url('/images/home3.png')" }}>
                            <div className="overlay"></div>
                            <div className="container">
                                <div className="row">
                                    <div className="col-lg-8 mx-auto text-center text-content">
                                        <span className="slide-tag">Smart Management</span>
                                        <h1 className="slide-title">Never Chase RSVPs Again</h1>
                                        <p className="slide-description">
                                            Real-time tracking, automated reminders, guest insights, seating charts —
                                            everything you need to stay organized and stress-free.
                                        </p>
                                        <div className="btn-container">
                                            <button className="btn btn-primary btn-lg" onClick={() => window.location.href = "/createevent"}>
                                                Get Started
                                            </button>
                                            <button className="btn btn-outline-light btn-lg" onClick={() => window.location.href = "/feature"}>
                                                See Features
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Navigation Arrows */}
                        <button className="carousel-arrow prev" onClick={() => setCurrentSlide((prev) => (prev === 0 ? 2 : prev - 1))}>
                            <i className="bi bi-chevron-left"></i>
                        </button>
                        <button className="carousel-arrow next" onClick={() => setCurrentSlide((prev) => (prev === 2 ? 0 : prev + 1))}>
                            <i className="bi bi-chevron-right"></i>
                        </button>

                        {/* Navigation Dots */}
                        <div className="carousel-dots">
                            {[0, 1, 2].map((index) => (
                                <span
                                    key={index}
                                    className={`dot ${currentSlide === index ? 'active' : ''}`}
                                    onClick={() => setCurrentSlide(index)}
                                />
                            ))}
                        </div>
                    </div>
                </section>

                {/* Home Categories Section */}
                <section className="homeCategories">
                    <div className="container">
                        <h2 className="section-title">Exclusive <span>Events</span></h2>
                        <div className="row g-4">
                            <div className="col-lg-3">
                                <div className="category-card">
                                    <div className="category-overlay"></div>
                                    <img src="/images/corporate.jpg" alt="Corporate" className="img-fluid category-image" />
                                    <div className="category-border">
                                        <div className="category-content">
                                            <h5>Corporate</h5>
                                            <span className="category-count">12+ Events</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-lg-6 mid-category-card">
                                <div className="category-card">
                                    <div className="category-overlay"></div>
                                    <img src="/images/sports.jpg" alt="Sports" className="img-fluid category-image" />
                                    <div className="category-border">
                                        <div className="category-content">
                                            <h5>Sports</h5>
                                            <span className="category-count">8+ Events</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="category-card">
                                    <div className="category-overlay"></div>
                                    <img src="/images/music.jpg" alt="Music" className="img-fluid category-image" />
                                    <div className="category-border">
                                        <div className="category-content">
                                            <h5>Music</h5>
                                            <span className="category-count">20+ Events</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-lg-3">
                                <div className="category-card">
                                    <div className="category-overlay"></div>
                                    <img src="/images/party_2.jpg" alt="Party" className="img-fluid category-image" />
                                    <div className="category-border">
                                        <div className="category-content">
                                            <h5>Parties</h5>
                                            <span className="category-count">15+ Events</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Trending Events Section */}
                <section className="homeTrendings">
                    <div className="container">
                        <div className="section-header">
                            <h2 className="section-title">Trending Tickets <span>Events</span></h2>
                            <p className="section-subtitle">Most popular events based on ticket sales</p>
                        </div>

                        {loadingTrending ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-warning" role="status">
                                    <span className="visually-hidden">Loading trending events...</span>
                                </div>
                                <p className="mt-3 text-white">Loading trending events...</p>
                            </div>
                        ) : trendingEvents.length > 0 ? (
                            <div className="trending-wrapper">
                                <div className="circle-slider-container">
                                    {/* Show navigation buttons only if we have enough events */}
                                    {canSlide && (
                                        <>
                                            <button className="slider-nav prev" onClick={handleTrendingPrev}>
                                                <i className="bi bi-chevron-left"></i>
                                            </button>
                                            <button className="slider-nav next" onClick={handleTrendingNext}>
                                                <i className="bi bi-chevron-right"></i>
                                            </button>
                                        </>
                                    )}

                                    {/* Slider track with conditional class */}
                                    <div className={`slider-track ${!canSlide ? 'no-animation' : ''}`}>
                                        {visibleTrendingEvents.map((event, index) => (
                                            <div
                                                className="car-item"
                                                key={event.event_id || index}
                                                onClick={() => handleEventClick(event)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <div className="car-card">
                                                    <div className="car-image-wrapper">
                                                        <img
                                                            src={event.event_image_url || event.event_image || "/images/default-event.jpg"}
                                                            alt={event.event_name || "Event"}
                                                            className="car-image"
                                                            onError={(e) => {
                                                                e.target.src = "/images/default-event.jpg";
                                                            }}
                                                        />
                                                        <div className="car-overlay">
                                                            <span className="trending-badge">
                                                                #{trendingEvents.findIndex(e => e.event_id === event.event_id) + 1} Trending
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="car-info">
                                                        <h3>{event.event_name || event.title || "Event Name"}</h3>
                                                        <div className="car-meta">
                                                            <span className="event-date">
                                                                <i className="bi bi-calendar"></i>
                                                                {event.formatted_date || event.event_start_date || "Date TBD"}
                                                            </span>
                                                            <span className="event-location">
                                                                <i className="bi bi-map"></i>
                                                                {event.location || event.city || "Location TBD"}
                                                            </span>
                                                        </div>
                                                        <div className="car-stats">
                                                            <span className="sold">
                                                                <i className="bi bi-ticket-alt"></i>
                                                                {event.total_tickets_sold || 0} Ticket's Sold
                                                            </span>
                                                        </div>
                                                        <button
                                                            className="btn-view"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEventClick(event);
                                                            }}
                                                        >
                                                            View Event →
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Progress Indicators - only show if can slide */}
                                {canSlide && (
                                    <div className="slider-progress">
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{
                                                width: `${(cardsToShow / trendingEvents.length) * 100}%`,
                                                transform: `translateX(${(trendingIndex / (trendingEvents.length - cardsToShow)) * 100}%)`
                                            }}></div>
                                        </div>
                                        <div className="slide-indicators">
                                            {Array.from({ length: trendingEvents.length - cardsToShow + 1 }).map((_, index) => (
                                                <span
                                                    key={index}
                                                    className={`indicator ${index === trendingIndex ? 'active' : ''}`}
                                                    onClick={() => {
                                                        if (canSlide) {
                                                            setTrendingIndex(index);
                                                            resetSliderInterval();
                                                        }
                                                    }}
                                                ></span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-5">
                                <div className="no-events-message">
                                    <i className="fas fa-calendar-alt fa-3x mb-3" style={{ color: '#ffd700' }}></i>
                                    <h3 style={{ color: 'white', marginBottom: '15px' }}>No Trending Events Yet</h3>
                                    <p style={{ color: 'rgba(255,255,255,0.7)' }}>Check back soon for exciting events!</p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <section className="homePricing">
                    <div className="container">
                        <div className="pricing-header text-center mb-5">
                            <h2>Choose Your Private <span className="highlight">Perfect Plan</span></h2>
                            <p className="lead">Simple, transparent pricing for events of any size</p>
                        </div>

                        {loadingPricing ? (
                            <div className="text-center">
                                <div className="spinner-border text-warning" role="status">
                                    <span className="visually-hidden">Loading plans...</span>
                                </div>
                                <p className="mt-3">Loading pricing plans...</p>
                            </div>
                        ) : (
                            <div className="row g-4 justify-content-center">
                                {pricingPlans.map((plan) => (
                                    <div key={plan.id || plan.name} className="col-lg-4 col-md-6">
                                        <div className={`pricing-card ${plan.isPopular ? 'popular' : ''} ${plan.name === 'Free' ? 'free-plan' : ''}`}>
                                            {plan.isPopular && <div className="popular-badge">Most Popular</div>}

                                            <div className="card-header">
                                                <h3>{plan.name}</h3>
                                                <div className="price-tag">
                                                    <span className="currency">R</span>
                                                    <span className="amount">{plan.price === 'Free' ? '0' : plan.price.replace('R', '')}</span>
                                                    <span className="period">/month</span>
                                                </div>
                                            </div>

                                            <div className="card-body">
                                                <ul className="features-list">
                                                    {plan.features.map((feature, index) => (
                                                        <li key={index}>
                                                            <i className="bi bi-check-circle-fill"></i>
                                                            <span>{feature}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            <div className="card-footer">
                                                <button
                                                    className="btn-select"
                                                    onClick={() => handleGetStartedClick(plan.name, plan.id)}
                                                >
                                                    {plan.price === "Free" ? "Get Started Free" : "Select Plan"}
                                                    <i className="bi bi-arrow-right"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <Footer />

            {/* Maintenance Modal */}
            {showMaintenance && (
                <div className="modal-overlay-new" onClick={() => setShowMaintenance(false)}>
                    <div className="modal-content-new" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-new">
                            <div className="modal-title-section">
                                <div className="modal-icon-large">
                                    <i className="bi bi-tools"></i>
                                </div>
                                <div className="modal-title">
                                    <h2>Feature Under Maintenance</h2>
                                    <p>We're working hard to bring you this feature</p>
                                </div>
                            </div>
                            <button
                                className="close-btn-new"
                                onClick={() => setShowMaintenance(false)}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="modal-body-new">
                            <div className="maintenance-message">
                                <div className="maintenance-icon">
                                    <i className="bi bi-gear"></i>
                                </div>
                                <h3>Coming Soon!</h3>
                                <p>This feature is currently being developed and will be available in our next update.</p>
                                <p>We appreciate your patience as we work to make Eventa even better!</p>

                                <div className="maintenance-tips">
                                    <h4>In the meantime, you can:</h4>
                                    <ul>
                                        <li>Explore our other available features</li>
                                        <li>Contact support for alternative solutions</li>
                                        <li>Check back later for updates</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="modal-actions-new">
                                <button
                                    className="action-btn-new primary"
                                    onClick={() => setShowMaintenance(false)}
                                >
                                    <i className="bi bi-check-circle"></i>
                                    Got It
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default Index;