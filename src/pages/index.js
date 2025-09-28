import React, { useState, useEffect } from "react";
import "../App.css";
import "../responce.css";
import { Navbar, Footer, Login } from "./components";

function Index() {
    const [startIndex, setStartIndex] = useState(0);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    const events = [
        { id: 1, title: "Wedding Bash", img: "/images/popular events/wedding.png", description: "Turn your wedding dream into a reality." },
        { id: 2, title: "Birthday Party", img: "/images/popular events/birthday.png", description: "Celebrate a special birthday with friends and family." },
        { id: 3, title: "Music Concert", img: "/images/popular events/concert.png", description: "Seamless concert planning from soundtrack to spotlight." },
        { id: 4, title: "Baby Shower", img: "images/popular events/baby shower.png", description: "Creating unforgattable baby shower memories" },
    ];

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

    const pricingPlans = [
        {
            name: "Free",
            price: "R0",
            duration: "per month",
            features: [
                "1 event",
                "Up to 50 guests",
                "Basic invitations",
                "RSVP tracking",
            ],
            isPopular: false,
        },
        {
            name: "Pro",
            price: "R150",
            duration: "per month",
            features: [
                "5 events",
                "Unlimited guests",
                "Customizable invitations",
                "Seating charts",
                "Automated reminders",
                "Email support",
            ],
            isPopular: true,
        },
        {
            name: "Enterprise",
            price: "Contact us",
            duration: "",
            features: [
                "Unlimited events",
                "Priority support",
                "Advanced analytics",
                "Dedicated account manager",
                "Custom integrations",
            ],
            isPopular: false,
        },
    ];

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
                    <div className="container">
                        <div className="row">
                            <div className="col-lg-6 text-content">
                                <h1>Eventa — Where Every Event Begins.</h1>
                                <p>
                                    Eventa is the smarter way to plan and manage your events.
                                    Whether it's a wedding, birthday, corporate gathering, or
                                    casual hangout, Eventa makes it simple to create invitations,
                                    track RSVPs, and keep guests engaged — all in one place.
                                </p>
                            </div>
                            <div className="col-lg-6 image-content">
                                <img
                                    src="/images/homeheader.png"
                                    alt="Eventa Homepage"
                                    className="img-fluid"
                                />
                            </div>
                        </div>
                        <div className="btn-container">
                    <button 
                        className="btn btn-create" onClick={() => window.location.href = "/createevent"}>
                         Get Started For Free
                    </button>                            
                  <button className="btn btn-demo">Book a Demo</button>
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
                                From guest lists and invitations to seating charts and
                                reminders, Eventa has all the tools you need to plan and
                                execute a flawless event. Our intuitive platform makes it
                                easy to stay organized and keep track of every detail.
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
                                        <button className="btn btn-view-more">View More</button>
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
                            <p className="lead text-muted">Choose the perfect plan to fit your event needs, whether you're planning a small gathering or a large-scale conference.</p>
                        </div>
                        <div className="row d-flex justify-content-center">
                            {pricingPlans.map((plan) => (
                                <div key={plan.name} className={`col-lg-4 pricing-card-wrapper ${plan.isPopular ? 'popular' : ''}`}>
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
                                        <button className="btn btn-create">Get Started</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

            </div>

            <Footer />
        </>
    );
}

export default Index;