import React, { useState, useEffect, useMemo } from "react";
import "../App.css";
import "../responce.css";
import { Navbar, Footer, Login } from "./components";
import { useNavigate } from "react-router-dom";

function Pricing() {
    // eslint-disable-next-line no-unused-vars
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [activeCategory, setActiveCategory] = useState("Personal Events");
    const [activeFaq, setActiveFaq] = useState(null);
    const [annualBilling, setAnnualBilling] = useState(false);
    const navigate = useNavigate();

    // State for pricing plans
    const [pricingPlans, setPricingPlans] = useState([]);
    const [businessPlans, setBusinessPlans] = useState([]);
    const [loadingPricing, setLoadingPricing] = useState(true);

    // Slider state
    const [startIndex, setStartIndex] = useState(0);

    // States for modals and user
    const [showCustomPlanModal, setShowCustomPlanModal] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [alert, setAlert] = useState({ show: false, message: '', type: '' });

    // Custom plan form state
    const [customPlanForm, setCustomPlanForm] = useState({
        companyName: '',
        contactPerson: '',
        email: '',
        phone: '',
        estimatedAttendees: '',
        eventsPerYear: '',
        timeline: 'asap',
        features: {
            customBranding: false,
            apiAccess: false,
            teamCollaboration: false,
            advancedAnalytics: false,
            prioritySupport: false,
            dedicatedManager: false,
            customIntegrations: false,
            whiteLabel: false
        },
        additionalRequirements: '',
        budget: ''
    });

    const [formStep, setFormStep] = useState(1);
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [loginMode, setLoginMode] = useState("login");
    const [showTicketMaintenance, setShowTicketMaintenance] = useState(false);
    const [showContactSalesModal, setShowContactSalesModal] = useState(false);

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';

    // Check for logged-in user
    useEffect(() => {
        const userJson = localStorage.getItem('user');
        if (userJson) {
            setCurrentUser(JSON.parse(userJson));
            // Pre-fill custom plan form with user data
            const user = JSON.parse(userJson);
            setCustomPlanForm(prev => ({
                ...prev,
                contactPerson: `${user.name || ''} ${user.lastname || ''}`.trim(),
                email: user.email || ''
            }));
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

    const printAlert = (message, type = 'info') => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000);
    };

    const handleCustomPlanClick = () => {
        if (!currentUser) {
            setLoginMode("login");
            setIsLoginOpen(true);
            printAlert('Please log in to request a custom plan', 'info');
            return;
        }

        if (currentUser.account_type !== 'business') {
            printAlert('Custom plans are only available for business accounts', 'warning');
            return;
        }

        // Reset form and show modal
        setCustomPlanForm({
            companyName: currentUser.business_name,
            contactPerson: `${currentUser.name || ''} ${currentUser.lastname || ''}`.trim(),
            email: currentUser.email || '',
            phone: currentUser.phone,
            estimatedAttendees: '',
            eventsPerYear: '',
            timeline: 'asap',
            features: {
                customBranding: false,
                apiAccess: false,
                teamCollaboration: false,
                advancedAnalytics: false,
                prioritySupport: false,
                dedicatedManager: false,
                customIntegrations: false,
                whiteLabel: false
            },
            additionalRequirements: '',
            budget: ''
        });
        setFormStep(1);
        setFormErrors({});
        setShowCustomPlanModal(true);
    };

    const handleCustomPlanInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        if (type === 'checkbox') {
            setCustomPlanForm(prev => ({
                ...prev,
                features: {
                    ...prev.features,
                    [name]: checked
                }
            }));
        } else {
            setCustomPlanForm(prev => ({
                ...prev,
                [name]: value
            }));
        }

        // Clear error for this field
        if (formErrors[name]) {
            setFormErrors(prev => ({
                ...prev,
                [name]: null
            }));
        }
    };

    const validateStep1 = () => {
        const errors = {};
        if (!customPlanForm.companyName.trim()) errors.companyName = 'Company name is required';
        if (!customPlanForm.contactPerson.trim()) errors.contactPerson = 'Contact person is required';
        if (!customPlanForm.email.trim()) errors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(customPlanForm.email)) errors.email = 'Email is invalid';
        if (!customPlanForm.phone.trim()) errors.phone = 'Phone number is required';
        
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const validateStep2 = () => {
        const errors = {};
        if (!customPlanForm.estimatedAttendees) errors.estimatedAttendees = 'Estimated attendees is required';
        if (!customPlanForm.eventsPerYear) errors.eventsPerYear = 'Events per year is required';
        
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleNextStep = () => {
        if (formStep === 1 && validateStep1()) {
            setFormStep(2);
        } else if (formStep === 2 && validateStep2()) {
            setFormStep(3);
        }
    };

    const handlePrevStep = () => {
        setFormStep(formStep - 1);
    };

    const handleSubmitCustomPlan = async () => {
        setSubmitting(true);
        
        try {
            // Here you would send the data to your backend
            const API_URL = process.env.REACT_APP_API_URL || 'http://localhost/eventa/src/pages/php';
            
            const formData = new FormData();
            formData.append('function', 'submitCustomPlanRequest');
            formData.append('user_id', currentUser?.user_id || '');
            formData.append('company_name', customPlanForm.companyName);
            formData.append('contact_person', customPlanForm.contactPerson);
            formData.append('email', customPlanForm.email);
            formData.append('phone', customPlanForm.phone);
            formData.append('estimated_attendees', customPlanForm.estimatedAttendees);
            formData.append('events_per_year', customPlanForm.eventsPerYear);
            formData.append('timeline', customPlanForm.timeline);
            formData.append('features', JSON.stringify(customPlanForm.features));
            formData.append('additional_requirements', customPlanForm.additionalRequirements);
            formData.append('budget', customPlanForm.budget);

            const response = await fetch(`${API_URL}/query.php`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                printAlert('Custom plan request submitted successfully! Our sales team will contact you within 24 hours.', 'success');
                setShowCustomPlanModal(false);
            } else {
                printAlert(result.message || 'Failed to submit request', 'error');
            }
        } catch (error) {
            console.error('Error submitting custom plan:', error);
            printAlert('An error occurred while submitting your request', 'error');
        } finally {
            setSubmitting(false);
        }
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

    const getDefaultBusinessPlans = () => {
        return [
            {
                name: "STARTER PLAN",
                monthlyPrice: "R649.00",
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
                description: "Perfect for intermediate business events",
                isPopular: false,
                features: ["Up to 750 guests", "Event management tools", "RSVP tracking", "Event Check-In", "Custom branding options", "Priority support"],
                ctaText: "Get started",
                ctaVariant: "btn-demo",
                isContactSales: false
            },
            {
                name: "ADVANCE PLUS PLAN",
                monthlyPrice: "Contact Sales",
                description: "Perfect for advanced business events",
                isPopular: false,
                features: ["Up to 2000 guests", "Event management tools", "RSVP tracking", "Dedicated account manager", "Custom integrations", "Team collaboration tools", "Event Check-In", "Advanced analytics"],
                ctaText: "GET IN TOUCH",
                ctaVariant: "btn-demo",
                isContactSales: true
            },
            {
                name: "CUSTOM PLAN",
                monthlyPrice: "Custom Pricing",
                description: "For large-scale business events",
                isPopular: false,
                features: ["Manage large-scale events", "Your brand, ad-free", "Custom data fields", "Custom fonts", "Email whitelabeling", "Self check-in kiosk", "Single sign-on (SSO)", "Priority support", "Dedicated Account Manager"],
                ctaText: "Request Custom Plan",
                ctaVariant: "btn-create",
                isContactSales: true
            }
        ];
    };

    const fetchPricingPlans = async () => {
        try {
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

                // Ensure CUSTOM PLAN is last (additional safety)
                const finalSortedPlans = sortedBusinessPlans.sort((a, b) => {
                    if (a.name === "CUSTOM PLAN") return 1;
                    if (b.name === "CUSTOM PLAN") return -1;
                    return 0;
                });
                
                setBusinessPlans(finalSortedPlans);
                // Reset startIndex when business plans are loaded
                setStartIndex(0);
            } else {
                console.error("Error fetching business plans");
                setBusinessPlans(getDefaultBusinessPlans());
            }
        } catch (err) {
            console.error("Error fetching business plans:", err);
            setBusinessPlans(getDefaultBusinessPlans());
        }
    };

    useEffect(() => {
        fetchPricingPlans();
        fetchBusinessPlans();
    }, []);

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
    };

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
        })) : getDefaultBusinessPlans(),
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
            answer: "Our plans are flexible and scalable. You can upgrade, downgrade, or cancel anytime with no long-term contracts."
        },
        {
            question: "Can I cancel or change my plan at any time?",
            answer: "Yes, you can upgrade, downgrade, or cancel your plan at any time. Changes take effect immediately. Please note that we don't offer refunds."
        },
        {
            question: "Can I get a custom plan?",
            answer: "Certainly! For large organizations or unique requirements, we offer custom plans. Click the 'Request Custom Plan' button to tell us your needs."
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
            <Navbar onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />
            <Login isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} defaultMode={loginMode} />

            {alert.show && (
                <div className={`custom-alert ${alert.type}`}>
                    <i className={`fas ${alert.type === "error" ? "fa-times-circle" :
                        alert.type === "success" ? "fa-check-circle" :
                            alert.type === "warning" ? "fa-exclamation-triangle" :
                                "fa-info-circle"}`}>
                    </i>
                    <span>{alert.message}</span>
                </div>
            )}

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
                                                                            onClick={handleCustomPlanClick}
                                                                        >
                                                                            Request Custom Plan
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
                                <h2>Frequently Asked Questions</h2>
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

            {/* Custom Plan Request Modal */}
            {showCustomPlanModal && (
                <div className="modal-overlay-new" onClick={() => setShowCustomPlanModal(false)}>
                    <div className="modal-content-new pricing-custom-plan-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-new">
                            <div className="modal-title-section">
                                <div className="modal-icon-large">
                                    <i className="bi bi-stars"></i>
                                </div>
                                <div className="modal-title">
                                    <h2>Request a Custom Plan</h2>
                                    <p>Tell us about your requirements and we'll create a tailored solution for your business</p>
                                </div>
                            </div>
                            <button
                                className="close-btn-new"
                                onClick={() => setShowCustomPlanModal(false)}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="modal-body-new">
                            {/* Progress Steps */}
                            <div className="form-progress">
                                <div className={`progress-step ${formStep >= 1 ? 'completed' : ''} ${formStep === 1 ? 'active' : ''}`}>
                                    <span className="step-number">1</span>
                                    <span className="step-label">Company Info</span>
                                </div>
                                <div className={`progress-step ${formStep >= 2 ? 'completed' : ''} ${formStep === 2 ? 'active' : ''}`}>
                                    <span className="step-number">2</span>
                                    <span className="step-label">Requirements</span>
                                </div>
                                <div className={`progress-step ${formStep >= 3 ? 'completed' : ''} ${formStep === 3 ? 'active' : ''}`}>
                                    <span className="step-number">3</span>
                                    <span className="step-label">Features</span>
                                </div>
                            </div>

                            <form onSubmit={(e) => e.preventDefault()}>
                                {/* Step 1: Company Information */}
                                {formStep === 1 && (
                                    <div className="form-step">
                                        <h3 className="step-title">Company Information</h3>
                                        
                                        <div className="form-group">
                                            <label htmlFor="companyName">
                                                Company Name <span className="required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="companyName"
                                                name="companyName"
                                                value={customPlanForm.companyName}
                                                onChange={handleCustomPlanInputChange}
                                                placeholder="Enter your company name"
                                                className={formErrors.companyName ? 'error' : ''}
                                            />
                                            {formErrors.companyName && (
                                                <span className="error-message">{formErrors.companyName}</span>
                                            )}
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="contactPerson">
                                                Contact Person <span className="required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="contactPerson"
                                                name="contactPerson"
                                                value={customPlanForm.contactPerson}
                                                onChange={handleCustomPlanInputChange}
                                                placeholder="Full name"
                                                className={formErrors.contactPerson ? 'error' : ''}
                                            />
                                            {formErrors.contactPerson && (
                                                <span className="error-message">{formErrors.contactPerson}</span>
                                            )}
                                        </div>

                                        <div className="form-row">
                                            <div className="form-group half">
                                                <label htmlFor="email">
                                                    Email <span className="required">*</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    id="email"
                                                    name="email"
                                                    value={customPlanForm.email}
                                                    onChange={handleCustomPlanInputChange}
                                                    placeholder="your@email.com"
                                                    className={formErrors.email ? 'error' : ''}
                                                />
                                                {formErrors.email && (
                                                    <span className="error-message">{formErrors.email}</span>
                                                )}
                                            </div>

                                            <div className="form-group half">
                                                <label htmlFor="phone">
                                                    Phone <span className="required">*</span>
                                                </label>
                                                <input
                                                    type="tel"
                                                    id="phone"
                                                    name="phone"
                                                    value={customPlanForm.phone}
                                                    onChange={handleCustomPlanInputChange}
                                                    placeholder="+27 123 456 789"
                                                    className={formErrors.phone ? 'error' : ''}
                                                />
                                                {formErrors.phone && (
                                                    <span className="error-message">{formErrors.phone}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Requirements */}
                                {formStep === 2 && (
                                    <div className="form-step">
                                        <h3 className="step-title">Event Requirements</h3>
                                        
                                        <div className="form-row">
                                            <div className="form-group half">
                                                <label htmlFor="estimatedAttendees">
                                                    Estimated Attendees per Event <span className="required">*</span>
                                                </label>
                                                <select
                                                    id="estimatedAttendees"
                                                    name="estimatedAttendees"
                                                    value={customPlanForm.estimatedAttendees}
                                                    onChange={handleCustomPlanInputChange}
                                                    className={formErrors.estimatedAttendees ? 'error' : ''}
                                                >
                                                    <option value="">Select range</option>
                                                    <option value="1-500">1 - 500</option>
                                                    <option value="501-2000">501 - 2,000</option>
                                                    <option value="2001-5000">2,001 - 5,000</option>
                                                    <option value="5001-10000">5,001 - 10,000</option>
                                                    <option value="10000+">10,000+</option>
                                                </select>
                                                {formErrors.estimatedAttendees && (
                                                    <span className="error-message">{formErrors.estimatedAttendees}</span>
                                                )}
                                            </div>

                                            <div className="form-group half">
                                                <label htmlFor="eventsPerYear">
                                                    Events per Year <span className="required">*</span>
                                                </label>
                                                <select
                                                    id="eventsPerYear"
                                                    name="eventsPerYear"
                                                    value={customPlanForm.eventsPerYear}
                                                    onChange={handleCustomPlanInputChange}
                                                    className={formErrors.eventsPerYear ? 'error' : ''}
                                                >
                                                    <option value="">Select range</option>
                                                    <option value="1-10">1 - 10</option>
                                                    <option value="11-50">11 - 50</option>
                                                    <option value="51-100">51 - 100</option>
                                                    <option value="101-500">101 - 500</option>
                                                    <option value="500+">500+</option>
                                                </select>
                                                {formErrors.eventsPerYear && (
                                                    <span className="error-message">{formErrors.eventsPerYear}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="timeline">
                                                When do you need this? <span className="required">*</span>
                                            </label>
                                            <select
                                                id="timeline"
                                                name="timeline"
                                                value={customPlanForm.timeline}
                                                onChange={handleCustomPlanInputChange}
                                            >
                                                <option value="asap">As soon as possible</option>
                                                <option value="1month">Within 1 month</option>
                                                <option value="3months">Within 3 months</option>
                                                <option value="6months">Within 6 months</option>
                                                <option value="justbrowsing">Just browsing</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="budget">
                                                Budget Range (Optional)
                                            </label>
                                            <select
                                                id="budget"
                                                name="budget"
                                                value={customPlanForm.budget}
                                                onChange={handleCustomPlanInputChange}
                                            >
                                                <option value="">Select range</option>
                                                <option value="R1000-R5000">R1,000 - R5,000/month</option>
                                                <option value="R5000-R10000">R5,000 - R10,000/month</option>
                                                <option value="R10000-R20000">R10,000 - R20,000/month</option>
                                                <option value="R20000+">R20,000+/month</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: Features Selection */}
                                {formStep === 3 && (
                                    <div className="form-step">
                                        <h3 className="step-title">Select Desired Features</h3>
                                        <p className="step-description">Check all features you're interested in</p>
                                        
                                        <div className="features-grid">
                                            <div className="feature-checkbox">
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        name="customBranding"
                                                        checked={customPlanForm.features.customBranding}
                                                        onChange={handleCustomPlanInputChange}
                                                    />
                                                    <div className="feature-info">
                                                        <strong>Custom Branding</strong>
                                                        <span>Full white-labeling with your brand</span>
                                                    </div>
                                                </label>
                                            </div>

                                            <div className="feature-checkbox">
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        name="apiAccess"
                                                        checked={customPlanForm.features.apiAccess}
                                                        onChange={handleCustomPlanInputChange}
                                                    />
                                                    <div className="feature-info">
                                                        <strong>API Access</strong>
                                                        <span>Integrate with your existing systems</span>
                                                    </div>
                                                </label>
                                            </div>

                                            <div className="feature-checkbox">
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        name="teamCollaboration"
                                                        checked={customPlanForm.features.teamCollaboration}
                                                        onChange={handleCustomPlanInputChange}
                                                    />
                                                    <div className="feature-info">
                                                        <strong>Team Collaboration</strong>
                                                        <span>Multi-user access with roles</span>
                                                    </div>
                                                </label>
                                            </div>

                                            <div className="feature-checkbox">
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        name="advancedAnalytics"
                                                        checked={customPlanForm.features.advancedAnalytics}
                                                        onChange={handleCustomPlanInputChange}
                                                    />
                                                    <div className="feature-info">
                                                        <strong>Advanced Analytics</strong>
                                                        <span>Detailed reporting and insights</span>
                                                    </div>
                                                </label>
                                            </div>

                                            <div className="feature-checkbox">
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        name="prioritySupport"
                                                        checked={customPlanForm.features.prioritySupport}
                                                        onChange={handleCustomPlanInputChange}
                                                    />
                                                    <div className="feature-info">
                                                        <strong>Priority Support</strong>
                                                        <span>24/7 dedicated support line</span>
                                                    </div>
                                                </label>
                                            </div>

                                            <div className="feature-checkbox">
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        name="dedicatedManager"
                                                        checked={customPlanForm.features.dedicatedManager}
                                                        onChange={handleCustomPlanInputChange}
                                                    />
                                                    <div className="feature-info">
                                                        <strong>Dedicated Account Manager</strong>
                                                        <span>Personal point of contact</span>
                                                    </div>
                                                </label>
                                            </div>

                                            <div className="feature-checkbox">
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        name="customIntegrations"
                                                        checked={customPlanForm.features.customIntegrations}
                                                        onChange={handleCustomPlanInputChange}
                                                    />
                                                    <div className="feature-info">
                                                        <strong>Custom Integrations</strong>
                                                        <span>Connect with your tools</span>
                                                    </div>
                                                </label>
                                            </div>

                                            <div className="feature-checkbox">
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        name="whiteLabel"
                                                        checked={customPlanForm.features.whiteLabel}
                                                        onChange={handleCustomPlanInputChange}
                                                    />
                                                    <div className="feature-info">
                                                        <strong>White Label Solution</strong>
                                                        <span>Remove all Evendi branding</span>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="additionalRequirements">
                                                Additional Requirements
                                            </label>
                                            <textarea
                                                id="additionalRequirements"
                                                name="additionalRequirements"
                                                rows="4"
                                                value={customPlanForm.additionalRequirements}
                                                onChange={handleCustomPlanInputChange}
                                                placeholder="Tell us more about your specific needs..."
                                            ></textarea>
                                        </div>
                                    </div>
                                )}

                                {/* Form Navigation */}
                                <div className="form-navigation">
                                    {formStep > 1 && (
                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            onClick={handlePrevStep}
                                        >
                                            <i className="bi bi-arrow-left"></i>
                                            Back
                                        </button>
                                    )}
                                    
                                    {formStep < 3 ? (
                                        <button
                                            type="button"
                                            className="btn-primary"
                                            onClick={handleNextStep}
                                        >
                                            Next
                                            <i className="bi bi-arrow-right"></i>
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="btn-primary"
                                            onClick={handleSubmitCustomPlan}
                                            disabled={submitting}
                                        >
                                            {submitting ? (
                                                <>
                                                    <span className="spinner"></span>
                                                    Submitting...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-send"></i>
                                                    Submit Request
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

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