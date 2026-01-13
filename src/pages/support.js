import React, { useState } from "react";
import "../App.css";
import "../responce.css";
import "./support.css";
import { Navbar, Footer, Login } from "./components";
import { useNavigate } from "react-router-dom";

function Support() {
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [loginMode, setLoginMode] = useState("login");
    const [showMaintenance, setShowMaintenance] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const navigate = useNavigate();

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

    const handleMaintenanceClick = () => {
        setShowMaintenance(true);
    };

    const handleContactClick = () => {
        setShowContactModal(true);
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

            <section className="support-page">
                
                {/* Hero Section */}
                <section className="header-section">
                    <img
                        src="/images/meee.jpg"
                        alt="Support hero background"
                        className="hero-bg-img"
                    />
                    <div className="overlayer"/>
                    <div className="container">
                        <div className="row">
                            <div className="col-lg-7">
                                <h1>We're Here to Help</h1>
                                <p className="lead">
                                    Your success is our priority. Get the support you need to create unforgettable events.
                                </p>
                                <button 
                                    className="btns"
                                    onClick={handleCreateEvent}
                                >
                                    Get Started
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Support Options */}
                <section className="features-page">
                    <div className="container">
                        <div className="section-header text-center">
                            <h2>How Can We Help You?</h2>
                            <p>
                                Choose from our support options to get the assistance you need.
                            </p>
                        </div>
                        <div className="features-row">
                            <div className="feature-card col-lg-4 col-md-6 col-12">
                                <div className="feature-icon">
                                    <i className="bi bi-chat-dots"></i>
                                </div>
                                <h4>Live Chat</h4>
                                <p>
                                    Get instant help from our support team through live chat. Available 24/7 for all your urgent queries.
                                </p>
                                <button 
                                    className="btn btn-view-more"
                                    onClick={handleMaintenanceClick}
                                >
                                    Start Chat
                                </button>
                            </div>
                            <div className="feature-card col-lg-4 col-md-6 col-12">
                                <div className="feature-icon">
                                    <i className="bi bi-envelope"></i>
                                </div>
                                <h4>Email Support</h4>
                                <p>
                                    Send us detailed questions and we'll get back to you with comprehensive solutions within hours.
                                </p>
                                <button 
                                    className="btn btn-view-more"
                                    onClick={handleMaintenanceClick}
                                >
                                    Email Us
                                </button>
                            </div>
                            <div className="feature-card col-lg-4 col-md-6 col-12">
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
                                    Call Now
                                </button>
                            </div>
                            <div className="feature-card col-lg-4 col-md-6 col-12">
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
                                    Open Ticket
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQ Section */}
                <section className="faq-section">
                    <div className="container">
                        <div className="section-header text-center">
                            <h2>Frequently Asked Questions</h2>
                            <p>
                                Quick answers to common questions about Evendi.
                            </p>
                        </div>
                        <div className="faq-container">
                            <div className="faq-item">
                                <h4>How do I create my first event?</h4>
                                <p>Click "Get Started" and follow our simple step-by-step guide to set up your event in minutes.</p>
                            </div>
                            <div className="faq-item">
                                <h4>Can I customize my event invitations?</h4>
                                <p>Yes! We offer various templates and customization options to match your event's theme.</p>
                            </div>
                            <div className="faq-item">
                                <h4>What's your response time for support?</h4>
                                <p>We typically respond within 2 hours for emails and instantly for live chat during business hours.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Contact CTA */}
                <section className="cta-banner text-light d-flex align-items-center">
                    <img
                        src="/images/SalesHero.jpeg"
                        alt="Support CTA background"
                        className="cta-bg-img"
                    />
                    <div className="cta-overlay"/>
                    <div className="container position-relative text-center text-lg-start">
                        <div className="row align-items-center">
                            <div className="col-lg-8">
                                <h3 className="fw-semibold">Still need help? We're here for you.</h3>
                                <p>Our support team is ready to assist you with any questions or concerns.</p>
                            </div>
                            <div>
                                <button 
                                    className="btn btn-view-more"
                                    onClick={handleContactClick}
                                >
                                    Contact Support
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

            {/* Contact Information Modal */}
            {showContactModal && (
                <div className="modal-overlay-new" onClick={() => setShowContactModal(false)}>
                    <div className="modal-content-new" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-new">
                            <div className="modal-title-section">
                                <div className="modal-icon-large">
                                    <i className="bi bi-telephone-fill"></i>
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
                                <div className="contact-icon">
                                    <i className="bi bi-headset"></i>
                                </div>
                                <h3>We're Here to Help!</h3>
                                <p>Our support team is available to assist you with any questions about your events.</p>
                                
                                <div className="contact-info">
                                    <div className="contact-item">
                                        <i className="bi bi-telephone"></i>
                                        <div>
                                            <h4>Phone Number</h4>
                                            <p>+27 11 123 4567</p>
                                            <small>Available Monday - Friday, 8:00 AM - 5:00 PM</small>
                                        </div>
                                    </div>
                                    
                                    <div className="contact-item">
                                        <i className="bi bi-whatsapp"></i>
                                        <div>
                                            <h4>WhatsApp</h4>
                                            <p>+27 82 123 4567</p>
                                            <small>24/7 support for urgent matters</small>
                                        </div>
                                    </div>
                                    
                                    <div className="contact-item">
                                        <i className="bi bi-envelope"></i>
                                        <div>
                                            <h4>Email</h4>
                                            <p>support@evenda.co.za</p>
                                            <small>Response within 2 business hours</small>
                                        </div>
                                    </div>
                                </div>

                                <div className="contact-tips">
                                    <h4>Before Calling:</h4>
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