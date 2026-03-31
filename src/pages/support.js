import React, { useState } from "react";
import "../App.css";
import "../responce.css";
import "./support.css";
import { Navbar, Footer, Login, NewEventPopupBtn } from "./components";
import { useNavigate } from "react-router-dom";

function Support() {
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [loginMode, setLoginMode] = useState("login");
    const [loginAccountType, setLoginAccountType] = useState("personal");
    const [showMaintenance, setShowMaintenance] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const [activeFaq, setActiveFaq] = useState(null);
    const navigate = useNavigate();

    const handleLoginClick = (accountType = "personal") => {
        setLoginMode("login");
        setLoginAccountType(accountType);
        setIsLoginOpen(true);
    };

    const handleSignupClick = (accountType = "personal") => {
        setLoginMode("signup");
        setLoginAccountType(accountType);
        setIsLoginOpen(true);
    };

    const handleCreateEvent = () => {
        navigate("/createevent");
    };

    const handleMaintenanceClick = () => {
        setShowMaintenance(true);
    };

    const handleContactClick = () => {
        setShowContactModal(true);
    };

    const toggleFaq = (index) => {
        setActiveFaq(activeFaq === index ? null : index);
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
                defaultAccountType={loginAccountType}
            />
            <NewEventPopupBtn />

            <section className="support-page">

                {/* Hero Section */}
                <section className="header-section">
                    <img
                        src="/images/meee.jpg"
                        alt="Support hero background"
                        className="hero-bg-img"
                    />
                    <div className="overlayer" />
                    <div className="container">
                        <div className="row">
                            <div className="col-lg-7">
                                <h1>We're Here to <span className="text-yellow">Help</span></h1>
                                <p className="lead">
                                    Your success is our priority. Get the support you need to create unforgettable events.
                                </p>
                                <button
                                    className="btn btn-create"
                                    onClick={handleCreateEvent}
                                >
                                    Get Started <i className="bi bi-arrow-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Support Options */}
                <section className="features-page">
                    <div className="container">
                        <div className="section-header text-center">
                            <h2>How Can We <span className="text-purple">Help</span> You?</h2>
                            <p>
                                Choose from our support options to get the assistance you need.
                            </p>
                        </div>
                        <div className="features-row">
                            <div className="feature-card">
                                <div className="feature-icon">
                                    <i className="bi bi-envelope"></i>
                                </div>
                                <h4>Email Support</h4>
                                <p>
                                    Send us detailed questions and we'll get back to you with comprehensive solutions within hours.
                                </p>
                                <a
                                    href="mailto:support@evendi.co.za?subject=Support%20Request&body=Hello%20Support%20Team%2C%0A%0AI%20need%20assistance%20with%3A%0A%0A%0A%0AThank%20you%2C%0A%5BYour%20Name%5D"
                                    className="btn btn-view-more"
                                >
                                    Email Us <i className="bi bi-arrow-right"></i>
                                </a>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon">
                                    <i className="bi bi-telephone"></i>
                                </div>
                                <h4>Phone Support</h4>
                                <p>
                                    Prefer to talk? Call our support line for personalized assistance with your event planning.
                                </p>
                                <button
                                    className="btn btn-view-more"
                                    onClick={handleContactClick}
                                >
                                    Call Now <i className="bi bi-arrow-right"></i>
                                </button>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon">
                                    <i className="bi bi-ticket-perforated"></i>
                                </div>
                                <h4>Support Ticket</h4>
                                <p>
                                    Have a specific issue? Submit a detailed support ticket and our team will assist you promptly.
                                </p>
                                <button
                                    className="btn btn-view-more"
                                    onClick={() => navigate('/ticket-selection')}
                                >
                                    Open Ticket <i className="bi bi-arrow-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQ Section */}
                <section className="faq-section">
                    <div className="container">
                        <div className="section-header text-center">
                            <h2>Frequently Asked <span className="text-blue">Questions</span></h2>
                            <p>
                                Quick answers to common questions about Evendi.
                            </p>
                        </div>
                        <div className="faq-container">
                            <div className="faq-item">
                                <div
                                    className="faq-question"
                                    onClick={() => toggleFaq(0)}
                                >
                                    <h4>How do I create my first event?</h4>
                                    <i className={`bi ${activeFaq === 0 ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                                </div>
                                {activeFaq === 0 && (
                                    <div className="faq-answer">
                                        <p>Click "Get Started" and follow our simple step-by-step guide to set up your event in minutes. You can choose from various templates and customize your event details.</p>
                                    </div>
                                )}
                            </div>
                            <div className="faq-item">
                                <div
                                    className="faq-question"
                                    onClick={() => toggleFaq(1)}
                                >
                                    <h4>Can I customize my event invitations?</h4>
                                    <i className={`bi ${activeFaq === 1 ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                                </div>
                                {activeFaq === 1 && (
                                    <div className="faq-answer">
                                        <p>Yes! We offer various templates and customization options to match your event's theme. You can customize colors, fonts, images, and add your personal touch to make your invitations stand out.</p>
                                    </div>
                                )}
                            </div>
                            <div className="faq-item">
                                <div
                                    className="faq-question"
                                    onClick={() => toggleFaq(2)}
                                >
                                    <h4>What's your response time for support?</h4>
                                    <i className={`bi ${activeFaq === 2 ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                                </div>
                                {activeFaq === 2 && (
                                    <div className="faq-answer">
                                        <p>We typically respond within 2 hours for emails and instantly for live chat during business hours (Monday-Friday, 8 AM - 6 PM). For urgent matters, our phone support is available 24/7.</p>
                                    </div>
                                )}
                            </div>
                            <div className="faq-item">
                                <div
                                    className="faq-question"
                                    onClick={() => toggleFaq(3)}
                                >
                                    <h4>Is there a free trial available?</h4>
                                    <i className={`bi ${activeFaq === 3 ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                                </div>
                                {activeFaq === 3 && (
                                    <div className="faq-answer">
                                        <p>Yes! We offer a 14-day free trial on all our plans. No credit card required. You can explore all features and see how Evendi can transform your event planning experience.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Contact CTA */}
                <section className="cta-banner">
                    <img
                        src="/images/SalesHero.jpeg"
                        alt="Support CTA background"
                        className="cta-bg-img"
                    />
                    <div className="cta-overlay" />
                    <div className="container">
                        <div className="row align-items-center">
                            <div className="col-lg-8">
                                <h3>Still need help? <span className="text-yellow">We're here for you.</span></h3>
                                <p>Our support team is ready to assist you with any questions or concerns, 24/7.</p>
                            </div>
                            <div className="col-lg-4 text-lg-end">
                                <button
                                    className="btn btn-cta"
                                    onClick={handleContactClick}
                                >
                                    Contact Support <i className="bi bi-arrow-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </section>

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
                                <p>We appreciate your patience as we work to make Evendi even better!</p>

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

            {/* Contact Information Modal */}
            {showContactModal && (
                <div className="modal-overlay-new" onClick={() => setShowContactModal(false)}>
                    <div className="modal-content-new" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-new">
                            <div className="modal-title-section">
                                <div className="modal-icon-large">
                                    <i className="bi bi-headset"></i>
                                </div>
                                <div className="modal-title">
                                    <h2>Contact Our Support Team</h2>
                                    <p>Get in touch with us directly</p>
                                </div>
                            </div>
                            <button
                                className="close-btn-new"
                                onClick={() => setShowContactModal(false)}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="modal-body-new">
                            <div className="contact-message">
                                <div className="contact-icon-large">
                                    <i className="bi bi-chat-dots"></i>
                                </div>
                                <h3>We're Here to Help!</h3>
                                <p>Our support team is available 24/7 to assist you with any questions about your events.</p>

                                <div className="contact-info-grid">
                                    <div className="contact-item">
                                        <div className="contact-item-icon">
                                            <i className="bi bi-telephone-fill"></i>
                                        </div>
                                        <div className="contact-item-details">
                                            <h4>Phone</h4>
                                            <p><a href="tel:+27111234567">+27 11 123 4567</a></p>
                                            <small>Mon-Fri, 8AM - 6PM</small>
                                        </div>
                                    </div>

                                    <div className="contact-item">
                                        <div className="contact-item-icon">
                                            <i className="bi bi-whatsapp"></i>
                                        </div>
                                        <div className="contact-item-details">
                                            <h4>WhatsApp</h4>
                                            <p><a href="https://wa.me/27821234567">+27 82 123 4567</a></p>
                                            <small>24/7 urgent support</small>
                                        </div>
                                    </div>

                                    <div className="contact-item">
                                        <div className="contact-item-icon">
                                            <i className="bi bi-envelope-fill"></i>
                                        </div>
                                        <div className="contact-item-details">
                                            <h4>Email</h4>
                                            <p><a href="mailto:support@evendi.co.za">support@evendi.co.za</a></p>
                                            <small>Response within 2 hours</small>
                                        </div>
                                    </div>

                                    <div className="contact-item">
                                        <div className="contact-item-icon">
                                            <i className="bi bi-chat"></i>
                                        </div>
                                        <div className="contact-item-details">
                                            <h4>Live Chat</h4>
                                            <p><button className="chat-link" onClick={handleMaintenanceClick}>Start Chat</button></p>
                                            <small>Available 24/7</small>
                                        </div>
                                    </div>
                                </div>

                                <div className="contact-tips">
                                    <h4><i className="bi bi-lightbulb"></i> Before Contacting:</h4>
                                    <ul>
                                        <li>Have your event details ready</li>
                                        <li>Note down any error messages you've encountered</li>
                                        <li>Prepare your account email address</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="modal-actions-new">
                                <button
                                    className="action-btn-new primary"
                                    onClick={() => setShowContactModal(false)}
                                >
                                    <i className="bi bi-check-circle"></i>
                                    Got It
                                </button>
                                <a
                                    href="tel:+27111234567"
                                    className="action-btn-new secondary"
                                >
                                    <i className="bi bi-telephone"></i>
                                    Call Now
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default Support;