import React from "react";

function EventProgressBar({ currentStep, totalSteps = 2 }) {
  const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="create-event-progress">
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      <div className={`progress-step${currentStep === 1 ? " active" : currentStep > 1 ? " completed" : ""}`}>
        <div className="progress-step-number">1</div>
        <div className="progress-step-label">Event Details</div>
      </div>
      <div className={`progress-step${currentStep === 2 ? " active" : ""}`}>
        <div className="progress-step-number">2</div>
        <div className="progress-step-label">Account Info</div>
      </div>
    </div>
  );
}

export default EventProgressBar;