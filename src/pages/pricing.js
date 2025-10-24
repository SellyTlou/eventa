import React, { useState, useEffect } from "react";
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

    useEffect(() => {
        const handleResize = () => {
            // eslint-disable-next-line no-unused-vars
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [loginMode, setLoginMode] = useState("login");
    const [showTicketMaintenance, setShowTicketMaintenance] = useState(false);

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

    const pricingCategories = {
        "Personal Events": [
            {
                name: "Basic",
                monthlyPrice: "R400",
                yearlyPrice: "R2400",
                description: "Perfect for small gatherings",
                isPopular: false,
                features: [
                    "Up to 50 guests per event",
                    "Create up to 5 events",
                    "Access to basic templates",
                    "Create and send invitations",
                    "RSVP tracking",
                    "Event management tools"
                ],
                ctaText: "Create my event",
                ctaVariant: "btn-demo"
            },
            {
                name: "Enterprise",
                monthlyPrice: "R750",
                yearlyPrice: "R4500",
                description: "For large-scale events",
                isPopular: false,
                features: [
                    "Up to 150 guests per event",
                    "Create up to 10 events",
                    "All Premium features",
                    "Dedicated account manager",
                    "Custom integrations",
                    "Team collaboration tools",
                    "Unlimited events"
                ],
                ctaText: "Create event",
                ctaVariant: "btn-create"
            },
            {
                name: "Premium",
                monthlyPrice: "R100",
                yearlyPrice: "R299.94",
                description: "For premium events",
                isPopular: true,
                features: [
                    "Up to 300 guests per event",
                    "Create up to 20 events",
                    "All Basic features",
                    "Access to premium templates",
                    "Custom branding options",
                    "Priority support",
                    "Advanced RSVP analytics"
                ],
                ctaText: "Create event",
                ctaVariant: "btn-create"
            }
        ],
        "Business & Nonprofit": [
            {
                name: "Basic",
                monthlyPrice: "R400",
                yearlyPrice: "R2400",
                description: "For small businesses",
                isPopular: false,
                features: [
                    "Up to 50 guests per event",
                    "Create up to 5 events",
                    "Access to basic templates",
                    "Create and send invitations",
                    "RSVP tracking",
                    "Event management tools"
                ],
                ctaText: "Create event",
                ctaVariant: "btn-create"
            },
            {
                name: "Premium",
                monthlyPrice: "R100",
                yearlyPrice: "R599",
                description: "For growing businesses",
                isPopular: true,
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
                name: "Enterprise",
                monthlyPrice: "R750",
                yearlyPrice: "R4500",
                description: "For large enterprises",
                isPopular: false,
                features: [
                    "Up to 150 guests per event",
                    "Create up to 10 events",
                    "All Premium features",
                    "Dedicated account manager",
                    "Custom integrations",
                    "Team collaboration tools",
                    "Unlimited events"
                ],
                ctaText: "Create event",
                ctaVariant: "btn-create"
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
                ctaText: "Create event",
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
                name: "Enterprise",
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
    };

    const faqItems = [
        {
            question: "What features can I use for free?",
            answer: "Our Basic plan includes basic event creation, up to 50 guests per event, 5 events total, email invitations, RSVP tracking, and essential event management tools. It's perfect for small personal events and gatherings."
        },
        {
            question: "Do you offer a free trial?",
            answer: "Yes! All paid plans come with a 14-day free trial. You can explore all premium features without any commitment. No credit card required to start your trial."
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
            answer: "Certainly! For large enterprises or unique requirements, we offer custom plans. Contact our sales team to discuss your specific needs and get a tailored solution."
        }
    ];

    const toggleFaq = (index) => {
        setActiveFaq(activeFaq === index ? null : index);
    };

    const calculateYearlySavings = (monthlyPrice) => {
        const monthly = parseFloat(monthlyPrice.replace('R', ''));
        const yearly = monthly * 12 * 0.6; // 40% discount
        return `Save R${Math.round(monthly * 12 - yearly)} per year`;
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
                                        Yearly <span className="save-badge">save 40%</span>
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
                    <section className="pricing-cards-section">
                        <div className="container">
                            <div className="row justify-content-center">
                                {pricingCategories[activeCategory].map((plan, index) => (
                                    <div key={index} className={`col-lg-4 pricing-card-wrapper ${plan.isPopular ? 'popular' : ''}`}>
                                        <div className="pricing-card text-center">
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

                                            {billingCycle === "yearly" && (
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
                                        </div>
                                    </div>
                                ))}
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
        </>
    );
}

export default Pricing;