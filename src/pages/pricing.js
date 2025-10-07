import React, { useState, useEffect } from "react";
import "../App.css";
import "../responce.css";
import { Navbar, Footer, Login } from "./components";

function Pricing() {
    // eslint-disable-next-line no-unused-vars
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [billingCycle, setBillingCycle] = useState("monthly");
    const [activeCategory, setActiveCategory] = useState("Personal Events");
    const [activeFaq, setActiveFaq] = useState(null);

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

    const handleLoginClick = () => {
        setLoginMode("login");
        setIsLoginOpen(true);
    };

    const handleSignupClick = () => {
        setLoginMode("signup");
        setIsLoginOpen(true);
    }

    const pricingCategories = {
        "Personal Events": [
            {
                name: "Free",
                monthlyPrice: "R0",
                yearlyPrice: "R0",
                description: "Perfect for small gatherings",
                isPopular: false,
                features: [
                    "Up to 100 guests",
                    "Send basic email invitations",
                    "Collect RSVPs & track guests",
                    "Basic event management"
                ],
                ctaText: "Create my event",
                ctaVariant: "btn-demo"
            },
            {
                name: "Gold",
                monthlyPrice: "R100",
                yearlyPrice: "R600",
                description: "For growing events",
                isPopular: false,
                features: [
                    "Up to 300 guests",
                    "Plan multiple events",
                    "Premium features",
                    "Email support",
                    "Custom invitations",
                    "RSVP reminders"
                ],
                ctaText: "Try plan",
                ctaVariant: "btn-create"
            },
            {
                name: "Platinum",
                monthlyPrice: "R150",
                yearlyPrice: "R900",
                description: "For premium events",
                isPopular: true,
                features: [
                    "Up to 500 guests",
                    "Advanced features",
                    "Custom emails",
                    "Embed RSVP form",
                    "Priority support",
                    "Analytics dashboard",
                    "Seating charts"
                ],
                ctaText: "Try plan",
                ctaVariant: "btn-create"
            }
        ],
        "Business & Nonprofit": [
            {
                name: "Business Starter",
                monthlyPrice: "R200",
                yearlyPrice: "R1200",
                description: "For small businesses",
                isPopular: false,
                features: [
                    "Up to 200 guests",
                    "Branded invitations",
                    "Team collaboration",
                    "Basic analytics",
                    "Email support"
                ],
                ctaText: "Get Started",
                ctaVariant: "btn-create"
            },
            {
                name: "Business Pro",
                monthlyPrice: "R350",
                yearlyPrice: "R2100",
                description: "For growing businesses",
                isPopular: true,
                features: [
                    "Up to 500 guests",
                    "Advanced analytics",
                    "Priority support",
                    "Custom domains",
                    "API access",
                    "Multi-event management"
                ],
                ctaText: "Try plan",
                ctaVariant: "btn-create"
            }
        ],
        "Selling Tickets": [
            {
                name: "Ticket Basic",
                monthlyPrice: "R250",
                yearlyPrice: "R1500",
                description: "For ticket sales",
                isPopular: false,
                features: [
                    "Up to 300 tickets",
                    "5% transaction fee",
                    "Basic ticketing",
                    "Email support",
                    "QR code tickets"
                ],
                ctaText: "Get Started",
                ctaVariant: "btn-create"
            },
            {
                name: "Ticket Pro",
                monthlyPrice: "R450",
                yearlyPrice: "R2700",
                description: "Advanced ticketing",
                isPopular: true,
                features: [
                    "Unlimited tickets",
                    "3% transaction fee",
                    "Advanced analytics",
                    "Priority support",
                    "Custom branding",
                    "Seat selection"
                ],
                ctaText: "Try plan",
                ctaVariant: "btn-create"
            }
        ]
    };

    const faqItems = [
        {
            question: "What features can I use for free?",
            answer: "Our Free plan includes basic event creation, up to 100 guests, email invitations, RSVP tracking, and essential event management tools. It's perfect for small personal events and gatherings."
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
        const monthly = parseInt(monthlyPrice.replace('R', ''));
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
                                    onClick={() => setActiveCategory(category)}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Pricing Cards */}
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

                                        <button className={`btn ${plan.ctaVariant} w-100`}>
                                            {plan.ctaText}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

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
        </>
    );
}

export default Pricing;