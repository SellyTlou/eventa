import React from "react";
import "../App.css";
import "../responce.css";
import { Navbar, Footer, Login } from "./components";

function About() {
    const [isLoginOpen, setIsLoginOpen] = React.useState(false);
    const [loginMode, setLoginMode] = React.useState("login");

    const handleLoginClick = () => {
        setLoginMode("login");
        setIsLoginOpen(true);
    };

    const handleSignupClick = () => {
        setLoginMode("signup");
        setIsLoginOpen(true);
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

            <div className="about-page">
                {/* Hero Section */}
                <section className="about-hero">
                    <div className="container">
                        <div className="row align-items-center">
                            <div className="col-lg-6">
                                <h1>About Eventa</h1>
                                <p className="lead">
                                    Simplifying event planning for <span className="highlight">every everyone</span> who wish to connect the people of south africa or who just want to PARTYYYY
                                </p>
                                <p>
                                    Eventa's intuitive, powerful event management platform helps you create memorable events, 
                                    engage guests, streamline planning, and build stronger connections through seamless event experiences.
                                </p>
                                <button className="btn btn-create">
                                    Get Started For Free
                                </button>
                            </div>
                            <div className="col-lg-6 image-content">
                                <img 
                                    src="/images/logo.png" 
                                    alt="Eventa About" 
                                    className="img-fluid" 
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Stats Section */}
                <section className="about-stats">
                    <div className="container">
                        <div className="row text-center">
                            <div className="col-md-4 stat-item">
                                <h3>0+</h3>
                                <p>Events Created</p>
                                <a href="/" className="stat-link">Learn more →</a>
                            </div>
                            <div className="col-md-4 stat-item">
                                <h3>0+</h3>
                                <p>Countries Served</p>
                                <a href="/" className="stat-link">Learn more →</a>
                            </div>
                            <div className="col-md-4 stat-item">
                                <h3>0%</h3>
                                <p>Customer Satisfaction</p>
                                <a href="/" className="stat-link">Learn more →</a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Mission Section */}
                <section className="about-mission">
                    <div className="container">
                        <div className="row">
                            <div className="col-12 text-center">
                                <h2>Improving the quality of every event experience</h2>
                                <p className="mission-subtitle">
                                    The trusted event management solution for everyone, from small gatherings to large corporate events
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Clients Section */}
                {/* Team Section */}
                <section className="about-team">
                    <div className="container">
                        <div className="row">
                            <div className="col-12 text-center">
                                <h2>Meet our leadership team</h2>
                                <p className="team-intro">
                                    Our dedicated team is passionate about creating the best event management experience for our users. 
                                    We believe in innovation, quality, and making event planning accessible to everyone.
                                </p>
                                <div className="team-grid">
                                    <div className="team-member">
                                        <div className="member-image"></div>
                                        <h4>Founder Name</h4>
                                        <p>CEO & Founder</p>
                                    </div>
                                    <div className="team-member">
                                        <div className="member-image"></div>
                                        <h4>Team Member</h4>
                                        <p>CTO</p>
                                    </div>
                                    <div className="team-member">
                                        <div className="member-image"></div>
                                        <h4>Team Member</h4>
                                        <p>Head of Design</p>
                                    </div>
                                </div>
                                <a href="/team" className="team-link">Meet our leaders →</a>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <Footer />
        </>
    );
}

export default About;