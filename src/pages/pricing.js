import React, { useState, useEffect, useMemo } from "react";
import "../App.css";
import "../responce.css";
import { Navbar, Footer, Login } from "./components";
import { useNavigate } from "react-router-dom";

function Pricing() {
    // eslint-disable-next-line no-unused-vars
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [billingCycle, setBillingCycle] = useState("monthly");
    const [activeCategory, setActiveCategory] = useState("Personal Events");
    const [activeFaq, setActiveFaq] = useState(null);
    const navigate = useNavigate();

    // New state for pricing plans
    const [pricingPlans, setPricingPlans] = useState([]);
    const [businessPlans, setBusinessPlans] = useState([]);
    const [loadingPricing, setLoadingPricing] = useState(true);

    useEffect(() => {
        const handleResize = () => {
            // eslint-disable-next-line no-unused-vars
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);

        // Fetch pricing plans when component mounts
        fetchPricingPlans();
        fetchBusinessPlans();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [loginMode, setLoginMode] = useState("login");
    const [showTicketMaintenance, setShowTicketMaintenance] = useState(false);
    const [showContactSalesModal, setShowContactSalesModal] = useState(false);

    // Helper function to get default features based on package type
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
            default: // basic/free
                return [
                    ...baseFeatures,
                    "Access to basic templates",
                    "Create and send invitations",
                    "Basic support"
                ];
        }
    };

    // Default pricing plans fallback
    const getDefaultPricingPlans = () => {
        return [
            {
                id: 1,
                name: "Basic",
                price: "R50",
                duration: "per month",
                max_guests: 250,
                max_events: 5,
                features: getDefaultFeatures('basic', 250, 5),
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
            console.log("Pricing plans data:", data);

            if (data.success && data.packages) {
                // Base feature limits - hardcoded per plan type
                const baseFeatureLimits = {
                    'basic': { max_guests: 250, max_events: 5 },
                    'premium': { max_guests: 1700, max_events: 20 },
                    'advanced': { max_guests: 1000, max_events: 50 }
                };

                const formattedPlans = data.packages.map(pkg => {
                    // Use hardcoded base features instead of API values
                    const limits = baseFeatureLimits[pkg.package_type.toLowerCase()] || baseFeatureLimits['basic'];
                    return {
                        id: pkg.package_id,
                        name: pkg.package_type.charAt(0).toUpperCase() + pkg.package_type.slice(1),
                        price: pkg.price === 0 ? "Free" : `R${pkg.price}`,
                        duration: "per month",
                        max_guests: limits.max_guests,  // Use hardcoded limit
                        max_events: limits.max_events,  // Use hardcoded limit
                        features: pkg.features ? pkg.features.split(',').map(feature => feature.trim()) : getDefaultFeatures(pkg.package_type, limits.max_guests, limits.max_events),
                        isPopular: pkg.package_type === 'premium'
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

    const fetchBusinessPlans = async () => {
        try {
            console.log('Fetching business plans from pricing.js...');
            const API_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';
            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ function: 'getBusinessPackages' })
            });

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            console.log("Business plans data from pricing.js:", data);

            if (data.success && data.packages) {
                const formattedBusinessPlans = data.packages.map(pkg => ({
                    id: pkg.id,
                    name: pkg.name,
                    monthlyPrice: pkg.price > 0 ? `R${pkg.price}` : 'Contact Sales',
                    yearlyPrice: pkg.price > 0 ? `R${Math.round(pkg.price * 12 * 0.8)}` : 'Contact Sales', // 20% discount
                    description: `Perfect for ${pkg.name.toLowerCase()}`,
                    isPopular: pkg.package_type === 'advance',
                    features: pkg.features ? pkg.features.split(',').map(feature => feature.trim()) : [],
                    ctaText: pkg.package_type === 'advance_plus' ? "GET IN TOUCH" : (pkg.price > 0 ? "Get started" : "Contact Sales"),
                    ctaVariant: pkg.package_type === 'advance' ? "btn-create" : "btn-demo",
                    isContactSales: pkg.price === 0 || pkg.price === '0.00'
                }));
                console.log('Setting business plans:', formattedBusinessPlans);
                setBusinessPlans(formattedBusinessPlans);
            } else {
                console.error('Failed to fetch business plans from pricing.js:', data.message);
            }
        } catch (err) {
            console.error("Error fetching business plans from pricing.js:", err);
        }
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
        }
    };

    // Updated pricing categories using API data
    console.log('pricingCategories Business plans:', businessPlans);
    const pricingCategories = useMemo(() => ({
        "Personal Events": pricingPlans.map(plan => ({
            name: plan.name,
            monthlyPrice: plan.price,
            yearlyPrice: plan.price === "Free" ? "Free" : `R${Math.round(parseFloat(plan.price.replace('R', '')) * 12 * 0.6)}`, // 40% discount
            description: `Perfect for ${plan.name.toLowerCase()} events`,
            isPopular: plan.isPopular,
            features: plan.features,
            ctaText: plan.price === "Free" ? "Get started for free" : "Get started",
            ctaVariant: plan.isPopular ? "btn-create" : "btn-demo"
        })),
        "Business": businessPlans.length > 0 ? businessPlans.map(plan => {
            console.log('Mapping business plan:', plan);
            return {
                name: plan.name,
                monthlyPrice: plan.monthlyPrice,
                yearlyPrice: plan.yearlyPrice,
                description: plan.description,
                isPopular: plan.isPopular,
                features: plan.features,
                ctaText: plan.ctaText,
                ctaVariant: plan.ctaVariant,
                isContactSales: plan.isContactSales
            };
        }) : [
            {
                name: "STARTER PLAN",
                monthlyPrice: "R649.00",
                yearlyPrice: "R7788.00",
                description: "Perfect for starter business events",
                isPopular: true,
                features: ["Up to 200 guests", "Event management tools", "RSVP tracking", "Create and send invitations", "Priority support"],
                ctaText: "Get started",
                ctaVariant: "btn-create",
                isContactSales: false
            },
            {
                name: "INTERMEDIATE PLAN",
                monthlyPrice: "R2149.00",
                yearlyPrice: "R25788.00",
                description: "Perfect for intermediate business events",
                isPopular: false,
                features: ["Up to 750 guests", "Event management tools", "RSVP tracking", "Event Check-In", "Custom branding options", "Priority support"],
                ctaText: "Get started",
                ctaVariant: "btn-demo",
                isContactSales: false
            },
            {
                name: "ADVANCE PLAN",
                monthlyPrice: "R6999.00",
                yearlyPrice: "R83988.00",
                description: "Perfect for advance business events",
                isPopular: false,
                features: ["Up to 2000 guests", "Event management tools", "RSVP tracking", "Dedicated account manager", "Custom integrations", "Team collaboration tools", "Event Check-In"],
                ctaText: "Get started",
                ctaVariant: "btn-demo",
                isContactSales: false
            },
            {
                name: "ADVANCE PLUS PLAN",
                monthlyPrice: "Contact Sales",
                yearlyPrice: "Contact Sales",
                description: "For large-scale business events",
                isPopular: false,
                features: ["Manage large-scale events", "Your brand, ad-free", "Custom data fields", "Custom fonts", "Email whitelabeling", "Self check-in kiosk", "Single sign-on (SSO)", "Priority support", "Dedicated Account Manager"],
                ctaText: "Contact Sales",
                ctaVariant: "btn-demo",
                isContactSales: true
            }
        ],
        "Selling Tickets": [
            {
                name: "Basic",
                monthlyPrice: "R0",
                yearlyPrice: "R0",
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
                ctaVariant: "btn-create"
            },
            {
                name: "Premium",
                monthlyPrice: "R49.99",
                yearlyPrice: "R299.94",
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
                ctaVariant: "btn-create"
            },
            {
                name: "Advanced",
                monthlyPrice: "R99.99",
                yearlyPrice: "R599.94",
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
                ctaVariant: "btn-create"
            }
        ]
    }), [pricingPlans, businessPlans]);

    const faqItems = [
        {
            question: "What does the Basic plan include?",
            answer: "Our Basic plan at R50/month includes event creation, up to 250 guests per event, 5 events total, email invitations, RSVP tracking, and essential event management tools. It's perfect for small to medium personal events and gatherings."
        },
        {
            question: "Do you offer a free trial?",
            answer: "We don't offer a traditional free trial, but you can start with our Basic plan at R50/month to test our features. All plans include a 30-day money-back guarantee if you're not satisfied."
        },
        {
            question: "Do I get a discount if I pay yearly instead of monthly?",
            answer: "Absolutely! When you choose yearly billing, you save 40% compared to monthly payments. This is our way of rewarding customers who commit to long-term use."
        },
        {
            question: "Can I cancel or change my plan at any time?",
            answer: "Yes, you can upgrade, downgrade, or cancel your plan at any time. Changes take effect immediately, and we'll prorate any differences in billing."
        },
        {
            question: "Can I get a custom plan?",
            answer: "Certainly! For large organizations or unique requirements, we offer custom plans. Contact our sales team to discuss your specific needs and get a tailored solution."
        }
    ];

    const toggleFaq = (index) => {
        setActiveFaq(activeFaq === index ? null : index);
    };

    const calculateYearlySavings = (monthlyPrice) => {
        if (monthlyPrice === "Free") return "Completely free forever";
        const monthly = parseFloat(monthlyPrice.replace('R', ''));
        const yearly = monthly * 12 * 0.6; // 40% discount
        return `Save R${Math.round(monthly * 12 - yearly)} per year`;
    };

    // Show loading state
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

            <div className="pricing-page">
                {/* Hero Section */}
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

                {/* Billing Toggle */}
                <section className="billing-section">
                    <div className="container">
                        <div className="row justify-content-center">
                            <div className="col-lg-6 text-center">
                                <div className="billing-toggle">
                                    <span className={billingCycle === "monthly" ? "active" : ""}>
                                        Monthly
                                    </span>
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={billingCycle === "yearly"}
                                            onChange={(e) => setBillingCycle(e.target.checked ? "yearly" : "monthly")}
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                    <span className={billingCycle === "yearly" ? "active" : ""}>
                                        Yearly <span className="save-badge"></span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Category Tabs */}
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

                {/* Pricing Cards - Only show if activeCategory is NOT "Selling Tickets" */}
                {activeCategory !== "Selling Tickets" && (
                    <section className={`pricing-cards-section ${activeCategory === 'Business' ? 'business' : ''}`}>
                        <div className="container">
                            {console.log('Active category:', activeCategory, 'Plans:', pricingCategories[activeCategory])}
                            <div className="row justify-content-center">
                                {pricingCategories[activeCategory] && pricingCategories[activeCategory].length > 0 ? (
                                    pricingCategories[activeCategory].map((plan, index) => {
                                    const colClass = activeCategory === 'Selling Tickets' ? 'col-lg-4' : 'col-lg-3'; // 4 cards per row for Personal and Business
                                    return (
                                        <div key={index} className={`${colClass} pricing-card-wrapper ${plan.isPopular ? 'popular' : ''}`}>
                                            <div className={`pricing-card text-center ${plan.isContactSales ? 'contact-card' : ''}`}>
                                                {plan.isContactSales ? (
                                                    <>
                                                        <div className="enterprise-label large-green">Advanced</div>
                                                        <div className="basic-label get-in-touch-label">Get in touch</div>

                                                        <ul className="features-list contact-features">
                                                            {plan.features.map((feature, featureIndex) => (
                                                                <li key={featureIndex}>
                                                                    <i className="bi bi-check2-circle text-success me-2"></i>
                                                                    {feature}
                                                                </li>
                                                            ))}
                                                        </ul>

                                                        <div className="contact-cta-wrapper">
                                                            <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#999' }}>
                                                                Coming soon
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        {plan.isPopular && (
                                                            <div className="popular-badge">MOST POPULAR</div>
                                                        )}
                                                        <h3>{plan.name}</h3>
                                                        <p className="plan-description">{plan.description}</p>

                                                        <div className="price-tag">
                                                            <span className="price">
                                                                {billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice}
                                                            </span>
                                                            <span className="duration">
                                                                {billingCycle === "monthly" ? "/month" : "/year"}
                                                            </span>
                                                        </div>

                                                        {billingCycle === "yearly" && plan.monthlyPrice !== "Free" && (
                                                            <div className="savings-text">
                                                                {calculateYearlySavings(plan.monthlyPrice)}
                                                            </div>
                                                        )}

                                                        <ul className="features-list">
                                                            {plan.features.map((feature, featureIndex) => (
                                                                <li key={featureIndex}>
                                                                    <i className="bi bi-check2-circle"></i> {feature}
                                                                </li>
                                                            ))}
                                                        </ul>

                                                        <button
                                                            className={`btn ${plan.ctaVariant} w-100`}
                                                            onClick={handleCreateEvent}
                                                        >
                                                            {plan.ctaText}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })) : (
                                    <div className="col-12 text-center">
                                        <p>Loading business packages...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {/* FAQ Section */}
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

            {/* Ticket Selling Maintenance Modal */}
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
            {/* Contact Sales Maintenance Modal */}
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