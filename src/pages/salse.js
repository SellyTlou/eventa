import React, { useState } from "react";
import "../App.css";
import "../responce.css";
import "./sales.css";
import { Navbar, Footer, Login } from "./components";

function Sales() {
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [loginMode, setLoginMode] = useState("login");
    const [showMaintenance, setShowMaintenance] = useState(false);
    

    const handleLoginClick = () => {
        setLoginMode("login");
        setIsLoginOpen(true);
    };

    const handleSignupClick = () => {
        setLoginMode("signup");
        setIsLoginOpen(true);
    };

    const handleMaintenanceClick = () => {
        setShowMaintenance(true);
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

            <section className="sales-page">
                
                <section className="header-section">
                    <img
                        src="/images/SalesHero.png"
                        alt="Sales hero background"
                        className="hero-bg-img"
                    />

                    <div className="overlayer"/>
                    <div className="container">
                        <div className="row ">
                            <div className="col-lg-7">
                                <h1>Let Us Chat About Your Event.</h1>
                                <p className="lead">
                                    No matter the size, we help organizations plan and execute successful events.
                                </p>
                                <button 
                                    className="btn btn-get-demo"
                                    onClick={handleMaintenanceClick}
                                >
                                    Get Demo
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FEATURES */}
                <section className="features-page">
                    <div className="container">
                        <div className="section-header text-center">
                            <h2>The Evendi difference.</h2>
                            <p>
                            Build events that shine and a brand that stands out.
                            </p>
                        </div>
                        <div className="features-row">
                            <div className="feature-card col-lg-4 col-md-6 col-12">
                                <div className="feature-icon">
                                    <i className="bi bi-speedometer2"></i>
                                </div>
                                <h4>Powerful Features</h4>
                                <p>
                                    EVENDA offers comprehensive, flexible tools to plan, manage, and analyze your events.
                                </p>
                                <button 
                                    className="btn btn-view-more"
                                    onClick={handleMaintenanceClick}
                                >
                                    Get started
                                </button>
                            </div>
                            <div className="feature-card col-lg-4 col-md-6 col-12">
                                <div className="feature-icon">
                                    <i className="bi bi-palette"></i>
                                </div>
                                <h4>Branded Event Experience</h4>
                                <p>
                                    evenda helps you design on-brand registrations, pages, and communications.
                                </p>
                                <button 
                                    className="btn btn-view-more"
                                    onClick={handleMaintenanceClick}
                                >
                                    Get started
                                </button>
                            </div>
                            <div className="feature-card col-lg-4 col-md-6 col-12">
                                <div className="feature-icon">
                                    <i className="bi bi-headset"></i>
                                </div>
                                <h4>World Class Support</h4>
                                <p>
                                    Our team delivers hands-on support to help you succeed at every stage.
                                </p>
                                <button 
                                    className="btn btn-view-more"
                                    onClick={handleMaintenanceClick}
                                >
                                    Get started
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA BANNER */}
                <section
                    className="cta-banner text-light d-flex align-items-center"
                    style={{
                        position: "relative"
                    }}
                    aria-label="CTA: Let's get your event started"
                >
                    <img
                        src="/images/Sales.png"
                        alt="CTA background"
                        className="cta-bg-img"
                    />

                    <div
                        className="cta-overlay"
                        style={{
                            position: "absolute",
                            inset: 0,
                            background: "rgba(0,0,0,0.35)",
                        }}
                        aria-hidden="true"
                    />
                    <div className="container position-relative text-center text-lg-start">
                        <div className="row align-items-center">
                            <div className="col-lg-8">
                                <h3 className="fw-semibold">Let's get your event started.</h3>
                            </div>
                            <div>
                                <button 
                                    className="btn btn-get-demo"
                                    onClick={handleMaintenanceClick}
                                >
                                    Get Demo
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </section>

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

            <Footer />
        </>
    );
}

export default Sales;