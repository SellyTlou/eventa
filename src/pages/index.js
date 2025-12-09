import React, { useState, useEffect } from "react";
import "../App.css";
import "../responce.css";
import { Navbar, Footer, Login } from "./components";
import { Star } from 'react-konva';

function Index() {
    const [startIndex, setStartIndex] = useState(0);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showMaintenance, setShowMaintenance] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [pricingPlans, setPricingPlans] = useState([]);
    const [loadingPricing, setLoadingPricing] = useState(true);

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
                    // Special handling for free plan - show as "Free" not "FREE"
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
                // Fallback to default plans if API fails
                setPricingPlans(getDefaultPricingPlans());
            }
        } catch (err) {
            console.error("Error fetching pricing plans:", err);
            // Fallback to default plans
            setPricingPlans(getDefaultPricingPlans());
        } finally {
            setLoadingPricing(false);
        }
    };

    // Fallback function for features (only used if API doesn't provide features)
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
            'ENTERPRISE': [
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

    // Fallback default pricing plans (only used if API fails)
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
                name: "ENTERPRISE",
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

    const handleLoginClick = () => {
        setLoginMode("login");
        setIsLoginOpen(true);
    };

    const handleSignupClick = () => {
        setLoginMode("signup");
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
        // Check if it's a free plan (price = 0 or name = Free)
        const isFreePlan = planName.toLowerCase() === 'free' || planName === 'Free';
        
        if (isFreePlan) {
            window.location.href = "/createevent";
        } else {
            // For paid plans, redirect to upgrade page with package ID
            window.location.href = `/upgrade_package?package_id=${planId}`;
        }
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

            <div className="homepage-section">
                <section className="homeHeader">
                    <div className="hero-carousel">

                        {/* SLIDE 1 */}
                        <section className={`hero-slide ${currentSlide === 0 ? 'active' : ''}`}>
                            <div className="container">
                                <div className="row align-items-center">
                                    <div className="col-lg-6 text-content">
                                        <h1>Evendi – Where Every Celebration Comes Alive</h1>
                                        <p>
                                            Make every event memorable. From intimate gatherings to grand celebrations,
                                            Evendi helps you design invitations, track responses, and engage your guests effortlessly.
                                        </p>
                                        <div className="btn-container">
                                            <button className="btn btn-create" onClick={() => window.location.href = "/createevent"}>
                                                Get Started
                                            </button>
                                        </div>
                                    </div>
                                    <div className="col-lg-6 image-content">
                                        <img src="/images/homeheader.png" alt="Celebrate with Evendi" className="img-fluid hero-image" />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* SLIDE 2 */}
                        <section className={`hero-slide ${currentSlide === 1 ? 'active' : ''}`}>
                            <div className="container">
                                <div className="row align-items-center">
                                    <div className="col-lg-6 text-content">
                                        <h1>Create Stunning Invitations in Minutes</h1>
                                        <p>
                                            Choose from hundreds of elegant templates. Customize colors, fonts, and animations.
                                            Send via Email, WhatsApp, SMS, or QR code — all with one click.
                                        </p>
                                        <div className="btn-container">
                                            <button className="btn btn-create" onClick={() => window.location.href = "/createevent"}>
                                                Get Started
                                            </button>
                                        </div>
                                    </div>
                                    <div className="col-lg-6 image-content">
                                        <img src="/images/invitation.png" alt="Beautiful Invitations" className="img-fluid hero-image" />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* SLIDE 3 */}
                        <section className={`hero-slide ${currentSlide === 2 ? 'active' : ''}`}>
                            <div className="container">
                                <div className="row align-items-center">
                                    <div className="col-lg-6 text-content">
                                        <h1>Never Chase RSVPs Again</h1>
                                        <p>
                                            Real-time tracking, automated reminders, guest insights, seating charts —
                                            everything you need to stay organized and stress-free.
                                        </p>
                                        <div className="btn-container">
                                            <button className="btn btn-create" onClick={() => window.location.href = "/createevent"}>
                                                Get Started
                                            </button>
                                        </div>
                                    </div>
                                    <div className="col-lg-6 image-content">
                                        <img src="/images/chirs.png" alt="RSVP Management" className="img-fluid hero-image" />
                                    </div>
                                </div>
                            </div>
                        </section>

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

                <section className="homeFeatures">
                    <div className="popular-events">
                        <div className="container">
                            <h2 className="mb-4">Popular Events</h2>
                            <div className="slider-wrapper">
                                <button className="slider-btn" onClick={handlePrev}>
                                    <i className="bi bi-caret-left"></i>
                                </button>
                                <div className="cards-container">
                                    {getVisibleEvents().map((event) => (
                                        <div key={event.id} className="event-card">
                                            <div className="card-img-container">
                                                <h5>{event.title}</h5>
                                                <div className="card-img-overlay"></div>
                                                <img
                                                    src={event.img}
                                                    alt={event.title}
                                                    className="card-img"
                                                />
                                            </div>
                                            <div className="card-content">
                                                <p>{event.description}</p>
                                                <button
                                                    className="btn btn-view"
                                                    onClick={() => window.location.href = "/createevent"}
                                                >
                                                    Get Started
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button className="slider-btn" onClick={handleNext}>
                                    <i className="bi bi-caret-right"></i>
                                </button>
                            </div>
                            {/* Mobile indicator dots */}
                            {isMobile && (
                                <div className="mobile-indicators">
                                    {events.map((_, index) => (
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

                <section className="ManagementsGuid">
                    <div className="container">
                        <div className="ManagementsGuid-header text-content">
                            <h2>Comprehensive Event Management</h2>
                            <p>
                                Planning an event has never been this easy! Evendi helps you manage guest lists, send invites, set up seating charts,
                                and schedule reminders so you can focus on enjoying the celebration.
                            </p>
                        </div>
                        <div className="row navBtn">
                            {["Invitations", "Management", "RSVP Tracking"].map((tab) => (
                                <button
                                    key={tab}
                                    className={`btn ${activeTab === tab ? 'btn-create' : 'btn-demo'}`}
                                    onClick={() => {
                                        setActiveTab(tab);
                                        setManagementStartIndex(0);
                                    }}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                        <div className="slider-wrapper">
                            <button className="slider-btn" onClick={handleManagementPrev}>
                                <i className="bi bi-caret-left"></i>
                            </button>
                            <div className="cards-container features-row">
                                {getVisibleManagementCards().map((card) => (
                                    <div key={card.id} className="col-lg-4 feature-card">
                                        <h4><i className={card.icon}></i> {card.title}</h4>
                                        <p>{card.description}</p>
                                        <button className="btn btn-view-more" onClick={handleViewMoreClick}>View More</button>
                                    </div>
                                ))}
                            </div>
                            <button className="slider-btn" onClick={handleManagementNext}>
                                <i className="bi bi-caret-right"></i>
                            </button>
                        </div>
                        {isMobile && (
                            <div className="mobile-indicators">
                                {managementFeatures[activeTab].map((_, index) => (
                                    <span
                                        key={index}
                                        className={`indicator-dot ${index === managementStartIndex ? 'active' : ''}`}
                                        onClick={() => setManagementStartIndex(index)}
                                    ></span>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <section className="our-pricing">
                    <div className="container">
                        <div className="pricing-header text-center mb-5">
                            <h2>Our Flexible Pricing Plans</h2>
                            <p className="lead text-muted">Choose the right plan to match your event, from cozy get-togethers to grand conferences.</p>
                        </div>

                        {loadingPricing ? (
                            <div className="text-center">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading plans...</span>
                                </div>
                                <p className="mt-2">Loading pricing plans...</p>
                            </div>
                        ) : (
                            <div className="row d-flex justify-content-center">
                                {pricingPlans.map((plan) => (
                                    <div key={plan.id || plan.name} className={`col-lg-3 pricing-card-wrapper ${plan.isPopular ? 'popular' : ''}`}>
                                        <div className="pricing-card text-center">
                                            {plan.isPopular && <div className="popular-badge">Most Popular</div>}
                                            <h3>{plan.name}</h3>
                                            <div className="price-tag">
                                                <span className="price">{plan.price}</span>
                                                <p className="duration">{plan.duration}</p>
                                            </div>
                                            <ul className="features-list list-unstyled text-left">
                                                {plan.features.map((feature, index) => (
                                                    <li key={index}>
                                                        <i className="bi bi-check2-circle"></i> {feature}
                                                    </li>
                                                ))}
                                            </ul>  
                                            <button 
                                                className="btn btn-create" 
                                                onClick={() => handleGetStartedClick(plan.name, plan.id)}
                                            >
                                                {plan.price === "Free" ? "Get Started Free" : "Choose Plan"}
                                            </button>                 
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