import React, { useState, useEffect, useMemo, useRef } from "react";
import "../App.css";
import "../responce.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { Navbar, Footer, Login, NewEventPopupBtn } from "./components";
import { useNavigate } from "react-router-dom";

function Pricing() {
    // eslint-disable-next-line no-unused-vars
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [activeCategory, setActiveCategory] = useState("Personal Events");
    const [activeFaq, setActiveFaq] = useState(null);
    const navigate = useNavigate();

    // State for pricing plans
    const [pricingPlans, setPricingPlans] = useState([]);
    const [businessPlans, setBusinessPlans] = useState([]);
    const [loadingPricing, setLoadingPricing] = useState(true);

    // Slider state
    const [startIndex, setStartIndex] = useState(0);

    // State for annual billing toggle
    const [annualBilling, setAnnualBilling] = useState(false);

    // States for modals
    const [showCustomPlanModal, setShowCustomPlanModal] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [alert, setAlert] = useState({ show: false, message: '', type: '' });

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);

        // Fetch pricing plans when component mounts
        fetchPricingPlans();
        fetchBusinessPlans();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Check for logged-in user
    useEffect(() => {
        const userJson = localStorage.getItem('user');
        if (userJson) {
            setCurrentUser(JSON.parse(userJson));
        }

        const handleUserChange = () => {
            const updatedUser = localStorage.getItem('user');
            setCurrentUser(updatedUser ? JSON.parse(updatedUser) : null);
        };

        window.addEventListener('userLoggedIn', handleUserChange);
        window.addEventListener('userLoggedOut', handleUserChange);

        return () => {
            window.removeEventListener('userLoggedIn', handleUserChange);
            window.removeEventListener('userLoggedOut', handleUserChange);
        };
    }, []);

    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [loginMode, setLoginMode] = useState("login");
    const [showTicketMaintenance, setShowTicketMaintenance] = useState(false);
    const [showContactSalesModal, setShowContactSalesModal] = useState(false);

    const printAlert = (message, type = 'info') => {
        setAlert({ show: true, message, type });
        setTimeout(() => {
            setAlert({ show: false, message: '', type: '' });
        }, 5000);
    };

    const handleCustomPlanClick = () => {
        if (!currentUser) {
            setLoginMode("login");
            setIsLoginOpen(true);
            printAlert('Please log in to request a custom plan', 'info');
            return;
        }

        if (currentUser.account_type !== 'business') {
            printAlert('Custom plans are only available for business accounts. Please upgrade to a business account.', 'warning');
            return;
        }

        navigate('/custom-plan-request');
    };

    const getDefaultFeatures = (packageType, maxGuests, maxEvents) => {
        const baseFeatures = [
            `Up to ${maxGuests} guests per event`,
            `Create up to ${maxEvents} events`,
            "Event management tools",
            "RSVP tracking"
        ];

        switch (packageType.toLowerCase()) {
            case 'premium':
                return [
                    ...baseFeatures,
                    "Access to premium templates",
                    "Custom branding options",
                    "Priority support",
                    "Advanced RSVP analytics"
                ];
            case 'advanced':
                return [
                    ...baseFeatures,
                    "Dedicated account manager",
                    "Custom integrations",
                    "Team collaboration tools",
                    "Unlimited events",
                    "Advanced analytics"
                ];
            default:
                return [
                    ...baseFeatures,
                    "Access to basic templates",
                    "Create and send invitations",
                    "Basic support"
                ];
        }
    };

    const getDefaultPricingPlans = () => {
        return [
            {
                id: 1,
                name: "Basic",
                price: "R200",
                duration: "per month",
                max_guests: 100,
                max_events: 6,
                features: getDefaultFeatures('basic', 100, 6),
                isPopular: false
            },
            {
                id: 2,
                name: "Premium",
                price: "R100",
                duration: "per month",
                max_guests: 1700,
                max_events: 20,
                features: getDefaultFeatures('premium', 1700, 20),
                isPopular: true
            },
            {
                id: 3,
                name: "Advanced",
                price: "R750",
                duration: "per month",
                max_guests: 1000,
                max_events: 50,
                features: getDefaultFeatures('advanced', 1000, 50),
                isPopular: false
            }
        ];
    };

    const fetchPricingPlans = async () => {
        try {
            const API_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';
            const formData = new FormData();
            formData.append("function", "getAllPackages");

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            if (data.success && data.packages) {
                const baseFeatureLimits = {
                    'basic': { max_guests: 250, max_events: 5 },
                    'premium': { max_guests: 1700, max_events: 20 },
                    'advanced': { max_guests: 1000, max_events: 50 }
                };

                const formattedPlans = data.packages.map(pkg => {
                    const limits = baseFeatureLimits[pkg.package_type.toLowerCase()] || baseFeatureLimits['basic'];
                    return {
                        id: pkg.package_id,
                        name: pkg.package_type.charAt(0).toUpperCase() + pkg.package_type.slice(1),
                        price: pkg.price === 0 ? "Free" : `R${pkg.price}`,
                        duration: "per month",
                        max_guests: limits.max_guests,
                        max_events: limits.max_events,
                        features: pkg.features ? pkg.features.split(',').map(feature => feature.trim()) : getDefaultFeatures(pkg.package_type, limits.max_guests, limits.max_events),
                        isPopular: pkg.package_type === 'premium'
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

    const fetchBusinessPlans = async () => {
        try {
            const API_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';
            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ function: 'getBusinessPackages' })
            });

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            if (data.success && data.packages) {
                console.log("success fetching business plans:", data.packages);

                // Format money values properly
                const formatMoney = (price) => {
                    if (price === 0 || price === '0.00' || price === null) return 'Contact Sales';
                    const numPrice = parseFloat(price);
                    return `R ${numPrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
                };

                const formattedBusinessPlans = data.packages.map(pkg => ({
                    id: pkg.id,
                    name: pkg.name === 'Customize Plan' ? 'CUSTOM PLAN' : pkg.name,
                    monthlyPrice: formatMoney(pkg.price),
                    description: pkg.name === 'Customize Plan'
                        ? 'For large-scale business events'
                        : `Perfect for ${pkg.name.toLowerCase()} business events`,
                    isPopular: pkg.package_type === 'advance',
                    features: pkg.features ? pkg.features.split(',').map(feature => feature.trim()) : [],
                    ctaText: pkg.package_type === 'advance_plus'
                        ? "GET IN TOUCH"
                        : (pkg.name === 'Customize Plan' ? "" : (pkg.price > 0 ? "Get started" : "Contact Sales")),
                    ctaVariant: pkg.package_type === 'advance' ? "btn-create" : "btn-demo",
                    isContactSales: pkg.price === 0 || pkg.price === '0.00' || pkg.name === 'Customize Plan'
                }));

                // Define the desired order based on package_type
                const getPlanRank = (plan) => {
                    switch (plan.package_type) {
                        case 'starter':
                            return 0;
                        case 'intermediate':
                            return 1;
                        case 'advance':
                            return 2;
                        case 'advance_plus':
                            return 3;  // Customize Plan
                        default:
                            return 999;
                    }
                };

                // Sort the plans according to the defined order
                const sortedBusinessPlans = formattedBusinessPlans.sort((a, b) => {
                    // First find the original package data to get package_type
                    const originalA = data.packages.find(pkg => pkg.id === a.id);
                    const originalB = data.packages.find(pkg => pkg.id === b.id);

                    const rankA = getPlanRank(originalA);
                    const rankB = getPlanRank(originalB);

                    return rankA - rankB;
                });

                console.log("Sorted business plans:", sortedBusinessPlans.map(p => p.name));

                setBusinessPlans(sortedBusinessPlans);
                // Reset startIndex when business plans are loaded
                setStartIndex(0);
            } else {
                console.error("Error fetching business plans");
            }
        } catch (err) {
            console.error("Error fetching business plans:", err);
        }
    };
    const calculateAnnualPrice = (monthlyPrice) => {
        if (monthlyPrice === 'Contact Sales' || monthlyPrice === 'Custom Pricing') {
            return monthlyPrice;
        }

        const priceMatch = monthlyPrice.match(/R\s*([\d,.]+)/);
        if (!priceMatch) return monthlyPrice;

        const price = parseFloat(priceMatch[1].replace(/,/g, ''));
        if (isNaN(price)) return monthlyPrice;

        const annualPrice = (price * 12) * 0.85;

        return `R ${annualPrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    };

    const handleLoginClick = () => {
        setLoginMode("login");
        setIsLoginOpen(true);
    };

    const handleSignupClick = () => {
        setLoginMode("signup");
        setIsLoginOpen(true);
    }

    const handleCreateEvent = () => {
        navigate("/createevent");
    };

    const handleCategoryClick = (category) => {
        if (category === "Selling Tickets") {
            setShowTicketMaintenance(true);
        } else {
            setActiveCategory(category);
            setStartIndex(0);
            if (category !== "Business") {
                setAnnualBilling(false);
            }
        }
    };

    const pricingCategories = useMemo(() => ({
        "Personal Events": pricingPlans.map(plan => ({
            name: plan.name,
            monthlyPrice: plan.price,
            description: `Perfect for ${plan.name.toLowerCase()} events`,
            isPopular: plan.isPopular,
            features: plan.features,
            ctaText: plan.price === "Free" ? "Get started for free" : "Get started",
            ctaVariant: plan.isPopular ? "btn-create" : "btn-demo",
            isContactSales: false
        })),
        "Business": businessPlans.length > 0 ? businessPlans.map(plan => ({
            name: plan.name,
            monthlyPrice: plan.monthlyPrice,
            description: plan.description,
            isPopular: plan.isPopular,
            features: plan.features,
            ctaText: plan.ctaText,
            ctaVariant: plan.ctaVariant,
            isContactSales: plan.isContactSales
        })) : [],
        "Selling Tickets": [
            {
                name: "Basic",
                monthlyPrice: "R0",
                description: "For basic ticketing",
                isPopular: false,
                features: [
                    "Up to 50 guests per event",
                    "Create up to 5 events",
                    "Access to basic templates",
                    "Create and send invitations",
                    "RSVP tracking",
                    "Event management tools"
                ],
                ctaText: "Get started",
                ctaVariant: "btn-create",
                isContactSales: false
            },
            {
                name: "Premium",
                monthlyPrice: "R49.99",
                description: "For advanced ticketing",
                isPopular: false,
                features: [
                    "Up to 200 guests per event",
                    "Create up to 20 events",
                    "All Basic features",
                    "Access to premium templates",
                    "Custom branding options",
                    "Priority support",
                    "Advanced RSVP analytics"
                ],
                ctaText: "Create event",
                ctaVariant: "btn-create",
                isContactSales: false
            },
            {
                name: "Advanced",
                monthlyPrice: "R99.99",
                description: "For professional ticketing",
                isPopular: true,
                features: [
                    "Up to 1000 guests per event",
                    "Create up to 100 events",
                    "All Premium features",
                    "Dedicated account manager",
                    "Custom integrations",
                    "Team collaboration tools",
                    "Unlimited events"
                ],
                ctaText: "Create event",
                ctaVariant: "btn-create",
                isContactSales: false
            }
        ]
    }), [pricingPlans, businessPlans]);

    // Slider functions
    const handleNext = () => {
        const currentCards = pricingCategories[activeCategory];
        const cardsPerView = isMobile ? 1 : 3;

        // Don't slide if we have fewer cards than the view
        if (currentCards.length <= cardsPerView) return;

        // Calculate max start index
        const maxStartIndex = Math.max(0, currentCards.length - cardsPerView);

        // Move to next if possible, otherwise wrap to beginning
        if (startIndex < maxStartIndex) {
            setStartIndex(startIndex + 1);
        } else {
            setStartIndex(0);
        }
    };

    const handlePrev = () => {
        const currentCards = pricingCategories[activeCategory];
        const cardsPerView = isMobile ? 1 : 3;

        // Don't slide if we have fewer cards than the view
        if (currentCards.length <= cardsPerView) return;

        // Calculate max start index
        const maxStartIndex = Math.max(0, currentCards.length - cardsPerView);

        // Move to previous if possible, otherwise wrap to end
        if (startIndex > 0) {
            setStartIndex(startIndex - 1);
        } else {
            setStartIndex(maxStartIndex);
        }
    };

    const getVisibleCards = () => {
        const currentCards = pricingCategories[activeCategory];
        if (!currentCards || currentCards.length === 0) return [];

        const cardsToShow = isMobile ? 1 : 3;
        const visibleCards = [];

        // If we have fewer cards than we want to show, show all cards
        if (currentCards.length <= cardsToShow) {
            return currentCards;
        }

        // Get the visible cards based on startIndex
        for (let i = 0; i < cardsToShow; i++) {
            const index = startIndex + i;
            if (index < currentCards.length) {
                visibleCards.push(currentCards[index]);
            }
        }

        return visibleCards;
    };

    const faqItems = [
        {
            question: "What does the Basic plan include?",
            answer: "Our Basic plan at R200/month includes event creation, up to 100 guests per event, 6 events total, email invitations, RSVP tracking, and essential event management tools. It's perfect for small to medium personal events and gatherings."
        },
        {
            question: "Do you offer a free trial?",
            answer: "We don't offer a traditional free trial, but you can start with our Basic plan at R200/month to test our features. We don't offer refunds."
        },
        {
            question: "How flexible are the plans?",
            answer: "Our plans are flexible and scalable. You can upgrade, downgrade, or cancel anytime with no long-term contracts. Adjust your plan as your event needs change."
        },
        {
            question: "Can I cancel or change my plan at any time?",
            answer: "Yes, you can upgrade, downgrade, or cancel your plan at any time. Changes take effect immediately. Please note that we don't offer refunds."
        },
        {
            question: "Can I get a custom plan?",
            answer: "Certainly! For large organizations or unique requirements, we offer custom plans. Contact our sales team to discuss your specific needs and get a tailored solution."
        }
    ];

    const toggleFaq = (index) => {
        setActiveFaq(activeFaq === index ? null : index);
    };

    if (loadingPricing) {
        return (
            <>
                <Navbar onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />
                <div className="pricing-page">
                    <section className="pricing-hero">
                        <div className="container">
                            <div className="row">
                                <div className="col-12 text-center">
                                    <h1>Plans designed to grow with your celebration</h1>
                                    <p className="lead">Loading pricing plans...</p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
                <Footer />
            </>
        );
    }

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

            {alert.show && (
                <div className={`custom-alert ${alert.type}`}>
                    <i className={`fas ${alert.type === "error" ? "fa-times-circle" :
                        alert.type === "success" ? "fa-check-circle" :
                            alert.type === "warning" ? "fa-exclamation-triangle" :
                                "fa-info-circle"
                        }`}></i>
                    <span>{alert.message}</span>
                </div>
            )}
            <NewEventPopupBtn />

            <div className="pricing-page">
                <section className="pricing-hero">
                    <div className="container">
                        <div className="row">
                            <div className="col-12 text-center">
                                <h1>Plans designed to grow with your celebration</h1>
                                <p className="lead">
                                    Plan smarter with options designed for personal
                                    gatherings, corporate events, or ticketed experiences.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="category-section">
                    <div className="container">
                        <div className="row navBtn">
                            {Object.keys(pricingCategories).map((category) => (
                                <button
                                    key={category}
                                    className={`btn ${activeCategory === category ? 'btn-create' : 'btn-demo'}`}
                                    onClick={() => handleCategoryClick(category)}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {activeCategory === "Business" && (
                    <div className="annual-toggle-container">
                        <div className="toggle-wrapper">
                            <span className="toggle-label">Monthly</span>
                            <div
                                className={`toggle-switch ${annualBilling ? 'annual' : 'monthly'}`}
                                onClick={() => setAnnualBilling(!annualBilling)}
                            >
                                <div className="toggle-knob"></div>
                            </div>
                            <span className="toggle-label">
                                Annual <span className="save-badge">15% off</span>
                            </span>
                        </div>
                    </div>
                )}

                {activeCategory !== "Selling Tickets" && (
                    <section className={`pricing-cards-section ${activeCategory === 'Business' ? 'business' : ''}`}>
                        <div className="container">
                            <div className="pricing-cards-wrapper">
                                <div className="features-content">
                                    {/* <div className="section-header text-center">
                                        <h2>{activeCategory}</h2>
                                        <p>Discover our comprehensive {activeCategory.toLowerCase()} designed to streamline your event planning process</p>
                                    </div> */}

                                    <div className="features-slider-wrapper">
                                        <button className="slider-btn prev" onClick={handlePrev}>
                                            <i className="bi bi-caret-left"></i>
                                        </button>

                                        <div className="cards-container features-row">
                                            {getVisibleCards().map((card, index) => (
                                                <div key={index} className={`pricing-card-wrapper col-lg-4 ${card.isPopular ? 'popular' : ''}`}>
                                                    <div className={`pricing-card ${card.isContactSales ? 'contact-card' : ''}`}>
                                                        {card.isContactSales ? (
                                                            <>
                                                                {/* Display the actual plan name from the database */}
                                                                <div className="enterprise-label large-green">{card.name}</div>

                                                                {/* Only show "Get in touch" label if it's not already CUSTOM PLAN */}
                                                                {card.name !== "CUSTOM PLAN" && (
                                                                    <div className="basic-label get-in-touch-label">Get in touch</div>
                                                                )}

                                                                <ul className="features-list contact-features">
                                                                    {card.features.map((feature, featureIndex) => (
                                                                        <li key={featureIndex}>
                                                                            <i className="bi bi-check2-circle text-success me-2"></i>
                                                                            {feature}
                                                                        </li>
                                                                    ))}
                                                                </ul>

                                                                <div className="contact-cta-wrapper">
                                                                    {card.name === "CUSTOM PLAN" ? (
                                                                        <button
                                                                            className="btn btn-create w-100"
                                                                            onClick={() => setShowContactSalesModal(true)}
                                                                        >
                                                                            Get in touch
                                                                        </button>
                                                                    ) : (
                                                                        <div className="coming-soon">Coming soon</div>
                                                                    )}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                {card.isPopular && (
                                                                    <div className="popular-badge">MOST POPULAR</div>
                                                                )}
                                                                <h3>{card.name}</h3>
                                                                <p className="plan-description">{card.description}</p>

                                                                <div className="price-tag">
                                                                    <span className="price">
                                                                        {activeCategory === "Business" && annualBilling && !card.isContactSales
                                                                            ? calculateAnnualPrice(card.monthlyPrice)
                                                                            : card.monthlyPrice}
                                                                    </span>
                                                                    <span className="duration">
                                                                        {activeCategory === "Business" && annualBilling && !card.isContactSales
                                                                            ? "/year"
                                                                            : "/month"}
                                                                    </span>
                                                                </div>

                                                                <ul className="features-list">
                                                                    {card.features.map((feature, featureIndex) => (
                                                                        <li key={featureIndex}>
                                                                            <i className="bi bi-check2-circle"></i> {feature}
                                                                        </li>
                                                                    ))}
                                                                </ul>

                                                                <button
                                                                    className={`btn ${card.ctaVariant} w-100`}
                                                                    onClick={handleCreateEvent}
                                                                >
                                                                    {card.ctaText}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <button className="slider-btn next" onClick={handleNext}>
                                            <i className="bi bi-caret-right"></i>
                                        </button>
                                    </div>

                                    {isMobile && (
                                        <div className="mobile-indicators">
                                            {pricingCategories[activeCategory].map((_, index) => (
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
                        </div>
                    </section>
                )}

                <section className="faq-section">
                    <div className="container">
                        <div className="row">
                            <div className="col-12 text-center">
                                <h2>Answers to Your Personal Event Planning Questions</h2>
                            </div>
                        </div>
                        <div className="row justify-content-center">
                            <div className="col-lg-8">
                                <div className="faq-container">
                                    {faqItems.map((faq, index) => (
                                        <div key={index} className="faq-item">
                                            <div
                                                className="faq-question"
                                                onClick={() => toggleFaq(index)}
                                            >
                                                <span>{faq.question}</span>
                                                <i className={`bi ${activeFaq === index ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                                            </div>
                                            {activeFaq === index && (
                                                <div className="faq-answer">
                                                    <p>{faq.answer}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <Footer />

            {showTicketMaintenance && (
                <div className="modal-overlay-new" onClick={() => setShowTicketMaintenance(false)}>
                    <div className="modal-content-new" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-new">
                            <div className="modal-title-section">
                                <div className="modal-icon-large">
                                    <i className="bi bi-tools"></i>
                                </div>
                                <div className="modal-title">
                                    <h2>Ticket Selling Under Maintenance</h2>
                                    <p>We're working hard to bring you ticketing features</p>
                                </div>
                            </div>
                            <button
                                className="close-btn-new"
                                onClick={() => setShowTicketMaintenance(false)}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="modal-body-new">
                            <div className="maintenance-message">
                                <div className="maintenance-icon">
                                    <i className="bi bi-ticket-perforated"></i>
                                </div>
                                <h3>Coming Soon!</h3>
                                <p>Our ticket selling feature is currently being developed and will be available in our next update.</p>
                                <p>We're building a comprehensive ticketing system to make your event ticket sales seamless and efficient!</p>

                                <div className="maintenance-tips">
                                    <h4>In the meantime, you can:</h4>
                                    <ul>
                                        <li>Create free events with RSVP functionality</li>
                                        <li>Explore our event management tools</li>
                                        <li>Set up your event details and invitations</li>
                                        <li>Contact support for early access inquiries</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="modal-actions-new">
                                <button
                                    className="action-btn-new primary"
                                    onClick={() => setShowTicketMaintenance(false)}
                                >
                                    <i className="bi bi-check-circle"></i>
                                    Got It
                                </button>
                                <button
                                    className="action-btn-new secondary"
                                    onClick={handleCreateEvent}
                                >
                                    <i className="bi bi-calendar-event"></i>
                                    Create Free Event
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showContactSalesModal && (
                <div className="modal-overlay-new" onClick={() => setShowContactSalesModal(false)}>
                    <div className="modal-content-new" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-new">
                            <div className="modal-title-section">
                                <div className="modal-icon-large">
                                    <i className="bi bi-people"></i>
                                </div>
                                <div className="modal-title">
                                    <h2>Contact Sales</h2>
                                    <p>Our sales desk is temporarily unavailable — we're working on it.</p>
                                </div>
                            </div>
                            <button
                                className="close-btn-new"
                                onClick={() => setShowContactSalesModal(false)}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="modal-body-new">
                            <div className="maintenance-message">
                                <div className="maintenance-icon">
                                    <i className="bi bi-envelope-paper"></i>
                                </div>
                                <h3>Get in touch</h3>
                                <p>We're preparing a dedicated sales experience for enterprise customers. Please check back soon or contact support for early access.</p>
                            </div>

                            <div className="modal-actions-new">
                                <button
                                    className="action-btn-new primary"
                                    onClick={() => setShowContactSalesModal(false)}
                                >
                                    <i className="bi bi-check-circle"></i>
                                    Got It
                                </button>
                                <button
                                    className="action-btn-new secondary"
                                    onClick={() => { setShowContactSalesModal(false); handleCreateEvent(); }}
                                >
                                    <i className="bi bi-calendar-event"></i>
                                    Create Event
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default Pricing;