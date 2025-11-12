import React, { useState } from 'react';
import './securityQuestionsModal.css';

const SecurityQuestionsModal = ({ isOpen, onClose, onSave, mode = "registration", email = "" }) => {
    const [answers, setAnswers] = useState({
        answer1: '',
        answer2: '',
        answer3: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [questions, setQuestions] = useState({
        question1: "what Primary school did you attend?",
        question2: "What city were you born in?",
        question3: "What is your mother's maiden name?"
    });

    // Predefined questions for registration
    const predefinedQuestions = {
        question1: "What Primary school did you attend?",
        question2: "What city were you born in?",
        question3: "What is your mother's maiden name?"
    };

    // Load questions for password reset mode
    React.useEffect(() => {
        if (mode === "reset" && email && isOpen) {
            loadUserQuestions();
        } else if (mode === "registration") {
            setQuestions(predefinedQuestions);
        }
    }, [mode, email, isOpen]);

    const loadUserQuestions = async () => {
        try {
            setLoading(true);
            const API_URL = process.env.REACT_APP_API_URL;
            const formData = new FormData();
            formData.append("email", email);
            formData.append("function", "getSecurityQuestions");

            const response = await fetch(`${API_URL}/query.php`, {
                method: "POST",
                body: formData
            });

            const result = await response.json();
            
            if (result.success) {
                setQuestions(result.questions);
            } else {
                setError(result.message || "Failed to load security questions");
            }
        } catch (err) {
            setError("Server error loading security questions");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (questionNumber, value) => {
        setAnswers(prev => ({
            ...prev,
            [`answer${questionNumber}`]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate all answers are provided
        if (!answers.answer1.trim() || !answers.answer2.trim() || !answers.answer3.trim()) {
            setError("Please answer all security questions");
            return;
        }

        setLoading(true);

        try {
            if (mode === "registration") {
                // For registration, we just pass the answers to the parent
                onSave(answers);
            } else {
                // For password reset, verify the answers
                const API_URL = process.env.REACT_APP_API_URL;
                const formData = new FormData();
                formData.append("email", email);
                formData.append("answer1", answers.answer1);
                formData.append("answer2", answers.answer2);
                formData.append("answer3", answers.answer3);
                formData.append("function", "verifySecurityQuestions");

                const response = await fetch(`${API_URL}/query.php`, {
                    method: "POST",
                    body: formData
                });

                const result = await response.json();
                
                if (result.success) {
                    onSave(answers);
                } else {
                    setError(result.message || "Security questions verification failed");
                }
            }
        } catch (err) {
            setError("Server error during verification");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setAnswers({ answer1: '', answer2: '', answer3: '' });
        setError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="security-modal-overlay" onClick={handleClose}>
            <div className="security-modal-content" onClick={e => e.stopPropagation()}>
                <button className="security-modal-close" onClick={handleClose}>
                    <i className="bi bi-x"></i>
                </button>

                <div className="security-modal-header">
                    <h3>
                        {mode === "registration" 
                            ? "Set Security Questions" 
                            : "Verify Your Identity"}
                    </h3>
                    <p>
                        {mode === "registration" 
                            ? "These questions will help secure your account and verify your identity if you forget your password."
                            : "Please answer your security questions to reset your password."}
                    </p>
                </div>

                {error && (
                    <div className="security-modal-error">
                        <i className="bi bi-exclamation-triangle"></i>
                        {error}
                    </div>
                )}

                {loading && mode === "reset" && (
                    <div className="security-modal-loading">
                        Loading security questions...
                    </div>
                )}

                <form onSubmit={handleSubmit} className="security-modal-form">
                    <div className="security-question-group">
                        <label htmlFor="answer1">1. {questions.question1}</label>
                        <input
                            type="text"
                            id="answer1"
                            value={answers.answer1}
                            onChange={(e) => handleInputChange(1, e.target.value)}
                            placeholder="Your answer"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="security-question-group">
                        <label htmlFor="answer2">2. {questions.question2}</label>
                        <input
                            type="text"
                            id="answer2"
                            value={answers.answer2}
                            onChange={(e) => handleInputChange(2, e.target.value)}
                            placeholder="Your answer"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="security-question-group">
                        <label htmlFor="answer3">3. {questions.question3}</label>
                        <input
                            type="text"
                            id="answer3"
                            value={answers.answer3}
                            onChange={(e) => handleInputChange(3, e.target.value)}
                            placeholder="Your answer"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="security-modal-actions">
                        <button 
                            type="button" 
                            className="security-modal-cancel"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="security-modal-submit"
                            disabled={loading}
                        >
                            {loading ? "Verifying..." : (mode === "registration" ? "Save Questions" : "Verify Answers")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SecurityQuestionsModal;