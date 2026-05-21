import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./ticket_payment.css";
import { tr } from "framer-motion/client";

function Ticket_payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const event = location.state?.event;

  const [loading, setLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentStarted, setPaymentStarted] = useState(false);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [bookingData, setBookingData] = useState(null);
  const [printInvoice, setPrintInvoice] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });
  const [ticketData, setTicketData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    ticketType: "general",
    quantity: 1,
    agreeToTerms: false,
  });
  const API_URL = process.env.REACT_APP_API_URL;
  const BASE_URL = API_URL.replace('/api', '');

  useEffect(() => {
    if (!event) {
      navigate("/ticket_sales");
    }
  }, [event, navigate]);

  const printAlert = (msg, type = "info") => {
    setAlert({ show: true, message: msg, type });
    setTimeout(() => setAlert({ show: false, message: "", type: "" }), 6000);
  };

  // // ============ PAYFAST CONFIGURATION for testing ============
  //   const PAYFAST_CONFIG = {
  //       MERCHANT_ID: "10039229",
  //       MERCHANT_KEY: "1ogl07vai6oig",
  //       ITN_URL: "https://dc86-197-185-137-11.ngrok-free.app/eventa/src/pages/api/payfastIntTickets.php",
  //       PAYFAST_URL: "https://sandbox.payfast.co.za/eng/process",
  //       RETURN_URL: "https://105c-197-185-137-11.ngrok-free.app/paymentSuccess",
  //       CANCEL_URL: "https://105c-197-185-137-11.ngrok-free.app/paymentCancel",
  //       EMAIL_CONFIRMATION: true,
  //       CONFIRMATION_EMAIL: "",
  //       PAYMENT_METHOD: "cc", 
  //   };

   const PAYFAST_CONFIG = {

        MERCHANT_ID: "33426571",
        MERCHANT_KEY: "lkqoiy0ftb9yc",
        PAYFAST_URL: "https://www.payfast.co.za/eng/process",

        ITN_URL: `${API_URL}/payfastIntTickets.php`,

        RETURN_URL: `${BASE_URL}/paymentSuccess`,

        CANCEL_URL: `${BASE_URL}/paymentCancel`,

        EMAIL_CONFIRMATION: true,

        CONFIRMATION_EMAIL: "",

        PAYMENT_METHOD: ""
    };
const generateTransactionId = () => {

    const timestamp = Date.now();

    const random = Math.random()
        .toString(36)
        .substr(2, 9);

    return `TKT-${timestamp}-${random}`;
};

const generatePayFastSignature = async (data) => {

    try {

        const formData = new FormData();

        Object.entries(data).forEach(([key, value]) => {

            if (
                value !== '' &&
                value !== null &&
                value !== undefined
            ) {

                formData.append(key, value);
            }
        });

        const response = await fetch(
            `${API_URL}/generateSignature.php`,
            {
                method: 'POST',
                body: formData
            }
        );

        const text = await response.text();

        console.log("RAW RESPONSE:", text);

        const result = JSON.parse(text);

        if (!result.success) {

            throw new Error(
                result.error || 'Signature generation failed'
            );
        }

        return result.signature;

    } catch (error) {

        console.error(
            'Signature generation error:',
            error
        );

        throw error;
    }
};

const preparePayFastData = (transactionId) => {

    const totalWithFee =
        (
            parseFloat(calculateTotal()) + 15
        ).toFixed(2);

    const customData = {

        firstName: ticketData.firstName,

        lastName: ticketData.lastName,

        email: ticketData.email,

        phone: ticketData.phone,

        event_id: event.event_id,

        ticket_type: ticketData.ticketType,

        quantity: ticketData.quantity,

        base_url: BASE_URL,
    };

    const paymentData = {

        merchant_id: PAYFAST_CONFIG.MERCHANT_ID,

        merchant_key: PAYFAST_CONFIG.MERCHANT_KEY,

        return_url: PAYFAST_CONFIG.RETURN_URL,

        cancel_url: PAYFAST_CONFIG.CANCEL_URL,

        notify_url: PAYFAST_CONFIG.ITN_URL,

        name_first:
            ticketData.firstName || "Customer",

        name_last:
            ticketData.lastName || "User",

        email_address:
            ticketData.email || "customer@email.com",

        cell_number:
            ticketData.phone || "0123456789",

        m_payment_id: transactionId,

        amount: totalWithFee,

        item_name:
            `${event.event_name} - ${getTicketTypeLabel(ticketData.ticketType)} Tickets`,

        item_description:
            `${ticketData.quantity} x ${getTicketTypeLabel(ticketData.ticketType)} ticket(s)`,

        custom_str1:
            String(event.event_id || ""),

        custom_str2:
            String(ticketData.ticketType || ""),

        custom_str3:
            String(ticketData.quantity || "1"),

        custom_str4:
            JSON.stringify(customData),

        email_confirmation:
            PAYFAST_CONFIG.EMAIL_CONFIRMATION
                ? "1"
                : "0"
    };

    if (ticketData.email) {

        paymentData.confirmation_address =
            ticketData.email;
    }

    /*
    |--------------------------------------------------------------------------
    | CLEAN EMPTY VALUES
    |--------------------------------------------------------------------------
    */

    const cleanedData = {};

    Object.entries(paymentData).forEach(([key, value]) => {

        if (
            value !== '' &&
            value !== null &&
            value !== undefined
        ) {

            cleanedData[key] = String(value);
        }
    });

    console.log(
        "PayFast Data prepared:",
        cleanedData
    );

    return cleanedData;
};

const initiatePayFastPayment = async () => {

    setProcessingPayment(true);

    setPaymentStarted(true);

    try {

        const id = generateTransactionId();

        console.log(
            "FINAL TRANSACTION ID:",
            id
        );

        const paymentData =
            preparePayFastData(id);

        /*
        |--------------------------------------------------------------------------
        | GENERATE SIGNATURE
        |--------------------------------------------------------------------------
        */

        const signature =
            await generatePayFastSignature(paymentData);

        paymentData.signature = signature;

        /*
        |--------------------------------------------------------------------------
        | SAVE TRANSACTION ID
        |--------------------------------------------------------------------------
        */

        localStorage.setItem(
            "last_payfast_transaction",
            id
        );

        /*
        |--------------------------------------------------------------------------
        | CREATE FORM
        |--------------------------------------------------------------------------
        */

        const form =
            document.createElement("form");

        form.method = "POST";

        form.action =
            PAYFAST_CONFIG.PAYFAST_URL;

        form.target = "_blank";

        form.style.display = "none";

        Object.keys(paymentData).forEach((key) => {

            const input =
                document.createElement("input");

            input.type = "hidden";

            input.name = key;

            input.value = paymentData[key];

            form.appendChild(input);

            console.log(
                `Adding field: ${key}=${paymentData[key]}`
            );
        });

        document.body.appendChild(form);

        /*
        |--------------------------------------------------------------------------
        | SUBMIT TO PAYFAST
        |--------------------------------------------------------------------------
        */

        form.submit();

        setTimeout(() => {

            document.body.removeChild(form);

            setShowPaymentPopup(false);

            setProcessingPayment(false);

        }, 1000);

    } catch (error) {

        console.error(
            "PayFast payment error:",
            error
        );

        printAlert(
            "Failed to initiate payment. Please try again.",
            "error"
        );

        setProcessingPayment(false);

        setPaymentStarted(false);
    }
};
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTicketData({
      ...ticketData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const calculateTotal = () => {
    if (!event) return "0.00";

    let price = 0;
    const quantity = parseInt(ticketData.quantity) || 1;

    switch (ticketData.ticketType) {
      case "early_bird":
        price = parseFloat(event.earlybird_price) || 0;
        break;
      case "general":
        price = parseFloat(event.general_price) || 0;
        break;
      case "vip":
        price = parseFloat(event.vip_price) || 0;
        break;
      case "vvip":
        price = parseFloat(event.vvip_price) || 0;
        break;
      default:
        price = parseFloat(event.general_price) || 0;
    }

    return (price * quantity).toFixed(2);
  };

  const formatPrice = (price) => {
    if (!price) return "0.00";
    const num = parseFloat(String(price));
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  const getTicketTypeLabel = (type) => {
    switch (type) {
      case "early_bird": return "Early Bird";
      case "general": return "General Admission";
      case "vip": return "VIP";
      case "vvip": return "VVIP";
      default: return "General Admission";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Date TBA";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const validateForm = () => {
    const errors = [];

    if (!ticketData.firstName.trim()) {
      errors.push("First name is required");
    }
    if (!ticketData.lastName.trim()) {
      errors.push("Last name is required");
    }
    if (!ticketData.email.trim()) {
      errors.push("Email address is required");
    } else if (!/\S+@\S+\.\S+/.test(ticketData.email)) {
      errors.push("Please enter a valid email address");
    }
    if (!ticketData.agreeToTerms) {
      errors.push("You must agree to the terms and conditions");
    }

    if (errors.length > 0) {
      printAlert(errors.join(". "), "error");
      return false;
    }

    return true;
  };

  const handlePaymentMethodSelect = () => {
    if (validateForm()) {
      setSelectedPaymentMethod('payFast');
      setShowPaymentPopup(true);
    }
  };

  const getTicketPrice = () => {
    if (!event) return "0.00";

    switch (ticketData.ticketType) {
      case "early_bird":
        return formatPrice(event.earlybird_price);
      case "general":
        return formatPrice(event.general_price);
      case "vip":
        return formatPrice(event.vip_price);
      case "vvip":
        return formatPrice(event.vvip_price);
      default:
        return formatPrice(event.general_price);
    }
  };

  const processPayment = async () => {
    if (processingPayment || paymentStarted) {
      console.log("Payment already in progress — ignoring");
      printAlert("Payment is already being processed. Please wait...", "warning");

      setTimeout(() => {
        window.location.reload();
      }, 2000);

      return;
    }

    if (selectedPaymentMethod === 'payFast') {
      await initiatePayFastPayment();
      return;
    }
  };

  const closePopup = () => {
    setShowPaymentPopup(false);
    setSelectedPaymentMethod("");
    setError("");
  };

  const handlePrintInvoice = () => {
    setPrintInvoice(true);
    setTimeout(() => {
      window.print();
      setPrintInvoice(false);
    }, 100);
  };

  const PayFastForm = () => {
    const [formLoading, setFormLoading] = useState(false);

    const handleSubmit = (e) => {
      e.preventDefault();
      setFormLoading(true);
      processPayment();
    };

    return (
      <div className="payfast-container">
        <div className="payfast-header">
          <i className="bi bi-shield-lock"></i>
          <h4>Pay with PayFast</h4>
        </div>
        <div className="payfast-features">
          <div className="feature-item">
            <i className="bi bi-credit-card"></i>
            <span>Credit/Debit Cards</span>
          </div>
          <div className="feature-item">
            <i className="bi bi-bank"></i>
            <span>EFT & Instant EFT</span>
          </div>
          <div className="feature-item">
            <i className="bi bi-phone"></i>
            <span>Mobile Wallets</span>
          </div>
        </div>
        <p className="payment-info">
          You will be securely redirected to PayFast to complete your payment.
        </p>
        <div className="payfast-amount">
          <strong>Amount: R{(parseFloat(calculateTotal()) + 15).toFixed(2)}</strong>
        </div>
        <button
          onClick={handleSubmit}
          className="submit-payment-btn payfast-btn"
          disabled={formLoading || processingPayment}
        >
          {formLoading || processingPayment ? (
            <>
              <div className="spinner-border spinner-border-sm" role="status"></div>
              &nbsp;Redirecting to PayFast...
            </>
          ) : (
            "Proceed to PayFast"
          )}
        </button>
        <div className="payfast-security">
          <i className="bi bi-shield-check"></i>
          <small>Secured by PayFast | PCI DSS Level 1 Compliant</small>
        </div>

        {/* {<div className="payfast-test-info">
                    <small className="text-muted">
                        Test Mode: Use card 4111111111111111, any expiry, CVV 123
                    </small>
                </div>} */}
      </div>
    );
  };

  const renderPaymentForm = () => {
    if (selectedPaymentMethod === 'payFast') {
      return <PayFastForm />;
    }
    return null;
  };

  if (!event) {
    return null;
  }

  if (paymentSuccess) {
    return (
      <>
        <div className="payment-success-container">
          <div className="payment-success">
            <div className="success-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <h2>Payment Successful!</h2>
            <p>Your tickets have been booked successfully.</p>

            {bookingData && (
              <div className="success-details">
                <p><strong>Booking ID:</strong> {bookingData.booking_id || bookingData.transaction_id}</p>
                <p><strong>Payment Method:</strong> PayFast</p>
                <p><strong>Email sent to:</strong> {bookingData.customer_email}</p>
              </div>
            )}

            {error && (
              <div className="alert error mt-3">
                {error}
              </div>
            )}

            <div className="success-actions">
              <button
                className="btn-primary"
                onClick={() => navigate("/ticket_sales")}
              >
                Browse More Events
              </button>
              <button
                className="btn-secondary"
                onClick={handlePrintInvoice}
              >
                <i className="fas fa-print"></i> Print Invoice
              </button>
            </div>

            <div className="ticket-summary">
              <h4>Booking Summary</h4>
              <p><strong>Event:</strong> {event.event_name}</p>
              <p><strong>Date:</strong> {formatDate(event.event_start_date)}</p>
              <p><strong>Tickets:</strong> {ticketData.quantity} × {getTicketTypeLabel(ticketData.ticketType)}</p>
              <p><strong>Total Paid:</strong> R {(parseFloat(calculateTotal()) + 15).toFixed(2)}</p>
              <p><strong>Confirmation Email:</strong> {ticketData.email}</p>
            </div>
          </div>
        </div>

        {printInvoice && (
          <div className="invoice-print-container">
            <div className="invoice-header">
              <h1>🎟️ TICKET CONFIRMATION</h1>
              <p className="invoice-subtitle">Event Ticket & Booking Receipt</p>
            </div>

            <div className="invoice-details-grid">
              <div className="invoice-column">
                <div className="invoice-section">
                  <h3><i className="fas fa-ticket-alt"></i> EVENT DETAILS</h3>
                  <div className="detail-item">
                    <span className="detail-label">Event:</span>
                    <span className="detail-value">{event.event_name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Date:</span>
                    <span className="detail-value">{formatDate(event.event_start_date)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Time:</span>
                    <span className="detail-value">{event.event_start_time || "TBA"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Venue:</span>
                    <span className="detail-value">{event.event_location || "TBA"}</span>
                  </div>
                </div>

                <div className="invoice-section">
                  <h3><i className="fas fa-user"></i> CUSTOMER INFO</h3>
                  <div className="detail-item">
                    <span className="detail-label">Name:</span>
                    <span className="detail-value">{ticketData.firstName} {ticketData.lastName}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{ticketData.email}</span>
                  </div>
                  {ticketData.phone && (
                    <div className="detail-item">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">{ticketData.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="invoice-column">
                <div className="invoice-section">
                  <h3><i className="fas fa-receipt"></i> BOOKING INFO</h3>
                  <div className="detail-item">
                    <span className="detail-label">Booking ID:</span>
                    <span className="detail-value">{bookingData?.transaction_id || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Booking Date:</span>
                    <span className="detail-value">{new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Payment Method:</span>
                    <span className="detail-value">PAYFAST</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value status-completed">PAID ✓</span>
                  </div>
                </div>

                <div className="invoice-section">
                  <h3><i className="fas fa-qrcode"></i> TICKET INFO</h3>
                  <div className="detail-item">
                    <span className="detail-label">Ticket Type:</span>
                    <span className="detail-value">{getTicketTypeLabel(ticketData.ticketType)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Quantity:</span>
                    <span className="detail-value">{ticketData.quantity}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Ticket ID:</span>
                    <span className="detail-value ticket-id">
                      {bookingData?.transaction_id ? `TKT-${bookingData.transaction_id.slice(-8).toUpperCase()}` : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pricing-summary">
              <h3><i className="fas fa-calculator"></i> PAYMENT SUMMARY</h3>
              <div className="price-row">
                <span>Tickets ({ticketData.quantity} × {getTicketTypeLabel(ticketData.ticketType)})</span>
                <span>R {calculateTotal()}</span>
              </div>
              <div className="price-row">
                <span>Service Fee</span>
                <span>R 15.00</span>
              </div>
              <div className="price-row total-row">
                <span><strong>TOTAL PAID</strong></span>
                <span><strong>R {(parseFloat(calculateTotal()) + 15).toFixed(2)}</strong></span>
              </div>
            </div>

            <div className="important-notes">
              <h4><i className="fas fa-exclamation-circle"></i> IMPORTANT NOTES</h4>
              <ul>
                <li>Please present this confirmation at the event entrance</li>
                <li>Tickets are non-refundable and non-transferable</li>
                <li>Keep this receipt for your records</li>
              </ul>
            </div>

            <div className="invoice-footer">
              <div className="footer-line">Thank you for your booking!</div>
              <div className="footer-line">Eventa Tickets • support@eventa.com</div>
              <div className="footer-line">Printed: {new Date().toLocaleString()}</div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="ticket-payment-page">
      {alert.show && (
        <div className={`custom-alert ${alert.type}`}>
          <i
            className={`fas ${alert.type === "error" ? "fa-times-circle" :
                alert.type === "success" ? "fa-check-circle" :
                  alert.type === "warning" ? "fa-exclamation-triangle" : "fa-info-circle"
              }`}
          />
          <span>{alert.message}</span>
        </div>
      )}

      <div className="payment-container">
        <div className="event-summary">
          <div className="event-header">
            <h2>Event Details</h2>
            <button
              className="back-btn"
              onClick={() => navigate(-1)}
            >
              <i className="fas fa-arrow-left"></i> Back
            </button>
          </div>

          <div className="event-image">
            <img
              src={event.event_image || "/images/default-event.jpg"}
              alt={event.event_name}
              onError={(e) => {
                e.target.src = "/images/default-event.jpg";
              }}
            />
          </div>

          <div className="event-info">
            <h3>{event.event_name}</h3>
            <p className="event-date">
              <i className="fas fa-calendar"></i> {formatDate(event.event_start_date)}
              {event.event_start_time && ` • ${event.event_start_time}`}
            </p>
            <p className="event-location">
              <i className="fas fa-map-marker-alt"></i> {event.event_location || "Location TBA"}
            </p>

            <div className="ticket-selection-summary">
              <h4>Your Selection</h4>
              <div className="selected-ticket">
                <span>{getTicketTypeLabel(ticketData.ticketType)}</span>
                <span>R {getTicketPrice()} each</span>
              </div>
              <div className="quantity-selection">
                <span>Quantity: {ticketData.quantity}</span>
                <span>R {calculateTotal()} total</span>
              </div>
            </div>
          </div>
        </div>

        <div className="payment-form-container">
          <h2>Complete Your Booking</h2>

          {error && (
            <div className="alert error">
              <i className="fas fa-exclamation-circle"></i> {error}
            </div>
          )}

          <form onSubmit={(e) => e.preventDefault()}>
            <div className="form-section">
              <h3>Personal Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={ticketData.firstName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={ticketData.lastName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={ticketData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={ticketData.phone}
                    onChange={handleInputChange}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Ticket Details</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Ticket Type *</label>
                  <select
                    name="ticketType"
                    value={ticketData.ticketType}
                    onChange={handleInputChange}
                    required
                  >
                    {parseFloat(event.earlybird_price) > 0 && (
                      <option
                        value="early_bird"
                        disabled={event.earlybird_quantity <= 0}
                      >
                        {event.earlybird_quantity > 0
                          ? `Early Bird - R ${formatPrice(event.earlybird_price)}`
                          : `Early Bird - SOLD OUT`}
                      </option>
                    )}

                    {parseFloat(event.general_price) > 0 && (
                      <option value="general">General Admission - R {formatPrice(event.general_price)}</option>
                    )}
                    {parseFloat(event.vip_price) > 0 && (
                      <option value="vip">VIP - R {formatPrice(event.vip_price)}</option>
                    )}
                    {parseFloat(event.vvip_price) > 0 && (
                      <option value="vvip">VVIP - R {formatPrice(event.vvip_price)}</option>
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label>Quantity *</label>
                  <select
                    name="quantity"
                    value={ticketData.quantity}
                    onChange={handleInputChange}
                    required
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="terms-agreement">
                <input
                  type="checkbox"
                  id="agreeToTerms"
                  name="agreeToTerms"
                  checked={ticketData.agreeToTerms}
                  onChange={handleInputChange}
                  required
                />
                <label htmlFor="agreeToTerms">
                  I agree to the terms and conditions and understand that tickets are non-refundable *
                </label>
              </div>

              <div className="payment-total">
                <div className="total-row">
                  <span>Subtotal</span>
                  <span>R {calculateTotal()}</span>
                </div>
                <div className="total-row">
                  <span>Service Fee</span>
                  <span>R 15.00</span>
                </div>
                <div className="total-row grand-total">
                  <span>Total to pay</span>
                  <span>R {(parseFloat(calculateTotal()) + 15).toFixed(2)}</span>
                </div>
              </div>

              <h3 className="payment-title">Choose Payment Method</h3>

              <div className="payment-methods">
                <button
                  type="button"
                  className={`payment-option ${selectedPaymentMethod === 'payFast' ? 'active' : ''}`}
                  onClick={handlePaymentMethodSelect}
                >
                  <i className="bi bi-shield-check"></i>
                  <span>PayFast</span>
                  <small>Secure SA Payments</small>
                </button>
              </div>

              <p className="secure-payment">
                <i className="fas fa-lock"></i> Your payment is secure and encrypted
              </p>
            </div>
          </form>
        </div>
      </div>

      {showPaymentPopup && (
        <div className="payment-popup-overlay">
          <div className="payment-popup">
            <button className="close-popup" onClick={closePopup}>×</button>
            <h3>Complete Payment</h3>
            <div className="payment-summary">
              <p><strong>Event:</strong> {event.event_name}</p>
              <p><strong>Ticket Type:</strong> {getTicketTypeLabel(ticketData.ticketType)}</p>
              <p><strong>Quantity:</strong> {ticketData.quantity}</p>
              <p><strong>Amount:</strong> R{(parseFloat(calculateTotal()) + 15).toFixed(2)}</p>
            </div>
            {renderPaymentForm()}
          </div>
        </div>
      )}
    </div>
  );
}

export default Ticket_payment;