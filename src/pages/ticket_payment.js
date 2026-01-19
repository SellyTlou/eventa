import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./ticket_payment.css";

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

  const [ticketData, setTicketData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    ticketType: "general",
    quantity: 1,
    cardNumber: "",
    cardExpiry: "",
    cardCVC: "",
    cardName: "",
    agreeToTerms: false,
  });

  // If no event data, redirect back
  useEffect(() => {
    if (!event) {
      navigate("/ticket_sales");
    }
  }, [event, navigate]);

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
        price = parseFloat(event.early_bird_price) || 0;
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

  const handlePaymentMethodSelect = (method) => {
    setSelectedPaymentMethod(method);
    setShowPaymentPopup(true);
  };

  const sendBookingPDF = async (booking) => {
    if (!booking || !event) {
      setError("No booking data available to send PDF");
      return false;
    }

    try {
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
      const formData = new FormData();

      const pdfData = {
        function: "sendPDF",
        event_name: event.event_name,
        event_image: event.event_image || "",
        event_date: event.event_start_date || "",
        event_time: event.event_start_time || "",
        event_location: event.event_location || "",
        event_id: event.event_id,
        customer_email: booking.customer_email,
        customer_first_name: ticketData.firstName,
        customer_last_name: ticketData.lastName,
        customer_phone: ticketData.phone || "",
        ticket_type: ticketData.ticketType,
        ticket_type_label: getTicketTypeLabel(ticketData.ticketType),
        quantity: ticketData.quantity.toString(),
        unit_price: getTicketPrice(),
        total_amount: calculateTotal(),
        payment_method: booking.payment_method,
        payment_status: "completed",
        transaction_id: booking.transaction_id,
        booking_id: booking.booking_id || booking.transaction_id,
        booking_date: new Date().toISOString().split('T')[0]
      };

      Object.entries(pdfData).forEach(([key, value]) => {
        formData.append(key, value);
      });

      const response = await fetch(`${API_URL}/sendBookingPDF.php`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const text = await response.text();
      if (!text.trim()) {
        throw new Error("Empty response from PDF endpoint");
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON from PDF endpoint");
      }

      if (data.success) {
        console.log("PDF sent successfully");
        return true;
      } else {
        throw new Error(data.message || "PDF sending failed");
      }
    } catch (err) {
      console.error("PDF sending error:", err);
      setError("Payment succeeded but could not send confirmation email: " + err.message);
      return false;
    }
  };

  const recordPayment = async () => {
    if (!event) {
      throw new Error("No event data available");
    }

    const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
    
    // Generate transaction ID
    const transactionId = "TXN_" + Date.now() + Math.random().toString(36).substr(2, 9);

    const bookingPayload = {
      function: "processTicketPayment",
      event_id: event.event_id,
      customer_email: ticketData.email,
      customer_first_name: ticketData.firstName, 
      customer_last_name: ticketData.lastName,
      customer_phone: ticketData.phone,
      ticket_type: ticketData.ticketType,
      ticket_type_label: getTicketTypeLabel(ticketData.ticketType),
      quantity: ticketData.quantity.toString(),
      unit_price: getTicketPrice(),
      total_amount: calculateTotal(),
      payment_method: selectedPaymentMethod,
      payment_status: "completed",
      transaction_id: transactionId,
    };

    const formData = new FormData();
    Object.entries(bookingPayload).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const res = await fetch(`${API_URL}/query.php`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    const text = await res.text();
    if (!text.trim()) {
      throw new Error("Empty response from server");
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Invalid JSON response from server");
    }

    if (!data.success) {
      throw new Error(data.message || "Failed to record booking");
    }

    return {
      ...bookingPayload,
      booking_id: data.bookingId || transactionId,
      bookingId: data.bookingId,
      transaction_id: transactionId,
      customer_email: ticketData.email,
      payment_method: selectedPaymentMethod,
    };
  };

  const getTicketPrice = () => {
    if (!event) return "0.00";

    switch (ticketData.ticketType) {
      case "early_bird":
        return formatPrice(event.early_bird_price);
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

  const processPayment = async (paymentData) => {
    if (processingPayment || paymentStarted) {
      console.log("Payment already in progress — ignoring");
      return;
    }

    setPaymentStarted(true);
    setProcessingPayment(true);
    setError("");

    try {
      // Simulate processing delay (remove or replace with real gateway in production)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newBooking = await recordPayment();

      setBookingData(newBooking);

      // Send PDF **right after** successful DB insert
      await sendBookingPDF(newBooking);

      setPaymentSuccess(true);
    } catch (err) {
      console.error("Payment flow error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setProcessingPayment(false);
      setPaymentStarted(false);
      setShowPaymentPopup(false);
    }
  };

  const closePopup = () => {
    setShowPaymentPopup(false);
    setSelectedPaymentMethod("");
    setError("");
  };

  const handlePrintInvoice = () => {
    setPrintInvoice(true);
    // Use setTimeout to ensure the invoice container is rendered before printing
    setTimeout(() => {
      window.print();
      setPrintInvoice(false);
    }, 100);
  };

  const CreditCardForm = ({ onSubmit }) => {
    const [cardData, setCardData] = useState({
      cardNumber: "",
      expiryDate: "",
      cvv: "",
      cardholderName: ""
    });
    const [formLoading, setFormLoading] = useState(false);

    const handleSubmit = (e) => {
      e.preventDefault();
      setFormLoading(true);

      setTimeout(() => {
        setFormLoading(false);
        onSubmit({
          paymentMethod: "credit_card",
          provider: "Visa/MasterCard",
          status: "completed"
        });
      }, 2500);
    };

    return (
      <form onSubmit={handleSubmit} className="payment-form">
        <div className="form-group">
          <label>Cardholder Name</label>
          <input
            type="text"
            value={cardData.cardholderName}
            onChange={(e) => setCardData({ ...cardData, cardholderName: e.target.value })}
            placeholder="John Doe"
            required
          />
        </div>
        <div className="form-group">
          <label>Card Number</label>
          <input
            type="text"
            value={cardData.cardNumber}
            onChange={(e) =>
              setCardData({ ...cardData, cardNumber: e.target.value.replace(/\D/g, '').slice(0, 16) })
            }
            placeholder="1234 5678 9012 3456"
            required
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Expiry Date</label>
            <input
              type="text"
              value={cardData.expiryDate}
              onChange={(e) =>
                setCardData({ ...cardData, expiryDate: e.target.value.replace(/[^0-9/]/g, '').slice(0, 5) })
              }
              placeholder="MM/YY"
              required
            />
          </div>
          <div className="form-group">
            <label>CVV</label>
            <input
              type="text"
              value={cardData.cvv}
              onChange={(e) =>
                setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) })
              }
              placeholder="123"
              required
            />
          </div>
        </div>

        <button type="submit" className="submit-payment-btn" disabled={formLoading}>
          {formLoading ? (
            <>
              <div className="spinner-border spinner-border-sm" role="status"></div>
               Processing Secure Payment...
            </>
          ) : (
            `Pay Securely R${(parseFloat(calculateTotal()) + 15).toFixed(2)}`
          )}
        </button>
      </form>
    );
  };

  const PayPalForm = ({ onSubmit }) => {
    const [formLoading, setFormLoading] = useState(false);

    const handleSubmit = (e) => {
      e.preventDefault();
      setFormLoading(true);

      setTimeout(() => {
        setFormLoading(false);
        onSubmit({
          paymentMethod: "paypal",
          provider: "PayPal",
          status: "completed"
        });
      }, 2500);
    };

    return (
      <div className="paypal-container">
        <div className="paypal-header">
          <i className="bi bi-paypal"></i>
          <h4>Pay with PayPal</h4>
        </div>
        <p className="payment-info">
          This is a demo simulation — no real payment will be processed.
        </p>
        <div className="paypal-amount">
          <strong>Amount: R{(parseFloat(calculateTotal()) + 15).toFixed(2)}</strong>
        </div>
        <button
          onClick={handleSubmit}
          className="submit-payment-btn paypal-btn"
          disabled={formLoading}
        >
          {formLoading ? (
            <>
              <div className="spinner-border spinner-border-sm" role="status"></div>
               Processing PayPal Payment...
            </>
          ) : (
            "Confirm Payment"
          )}
        </button>
      </div>
    );
  };

  const StripeForm = ({ onSubmit }) => {
    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit({
        paymentMethod: 'stripe',
        provider: 'Stripe'
      });
    };

    return (
      <div className="stripe-container">
        <div className="stripe-header">
          <i className="bi bi-credit-card"></i>
          <h4>Pay with Stripe</h4>
        </div>
        <p className="payment-info">
          Secure payment processed by Stripe. Your card details are encrypted and safe.
        </p>
        <div className="stripe-features">
          <div className="feature-item">
            <i className="bi bi-shield-check"></i>
            <span>PCI DSS compliant</span>
          </div>
          <div className="feature-item">
            <i className="bi bi-lock"></i>
            <span>256-bit encryption</span>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          className="submit-payment-btn stripe-btn"
          disabled={processingPayment}
        >
          {processingPayment ? (
            <>
              <div className="spinner-border spinner-border-sm" role="status"></div>
              Processing with Stripe...
            </>
          ) : (
            `Pay R${(parseFloat(calculateTotal()) + 15).toFixed(2)} with Stripe`
          )}
        </button>
      </div>
    );
  };

  const renderPaymentForm = () => {
    switch (selectedPaymentMethod) {
      case 'credit-card':
        return <CreditCardForm onSubmit={processPayment} />;
      case 'paypal':
        return <PayPalForm onSubmit={processPayment} />;
      case 'stripe':
        return <StripeForm onSubmit={processPayment} />;
      default:
        return null;
    }
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
                <p><strong>Payment Method:</strong> {bookingData.payment_method}</p>
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
              <p><strong>Total Paid:</strong> R {calculateTotal()}</p>
              <p><strong>Confirmation Email:</strong> {ticketData.email}</p>
            </div>
          </div>
        </div>

        {/* Print-only invoice container */}
        {printInvoice && (
          <div className="invoice-print-container">
            <div className="invoice-header">
              {event.event_image && (
                <img 
                  src={event.event_image} 
                  alt={event.event_name}
                  onError={(e) => {
                    e.target.src = "/images/default-event.jpg";
                    e.target.style.display = "none";
                  }}
                />
              )}
              <h1>🎟️ Ticket Invoice</h1>
              <p>Booking Confirmation</p>
            </div>

            <div className="invoice-details">
              <div className="detail-row">
                <span className="detail-label">Invoice Number:</span>
                <span className="detail-value">{bookingData?.transaction_id || "N/A"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Booking Date:</span>
                <span className="detail-value">{new Date().toLocaleDateString()}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Event Name:</span>
                <span className="detail-value">{event.event_name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Date:</span>
                <span className="detail-value">{formatDate(event.event_start_date)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Time:</span>
                <span className="detail-value">{event.event_start_time || "TBA"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Venue:</span>
                <span className="detail-value">{event.event_location || "TBA"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Customer:</span>
                <span className="detail-value">{ticketData.firstName} {ticketData.lastName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{ticketData.email}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Phone:</span>
                <span className="detail-value">{ticketData.phone || "Not provided"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Ticket Type:</span>
                <span className="detail-value">{getTicketTypeLabel(ticketData.ticketType)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Quantity:</span>
                <span className="detail-value">{ticketData.quantity}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Unit Price:</span>
                <span className="detail-value">R {getTicketPrice()}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Subtotal:</span>
                <span className="detail-value">R {calculateTotal()}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Service Fee:</span>
                <span className="detail-value">R 15.00</span>
              </div>
              <div className="detail-row" style={{ fontWeight: 'bold', fontSize: '18px', borderTop: '2px solid #000' }}>
                <span className="detail-label">Total Paid:</span>
                <span className="detail-value">R {(parseFloat(calculateTotal()) + 15).toFixed(2)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Payment Method:</span>
                <span className="detail-value">{selectedPaymentMethod.replace('-', ' ').toUpperCase()}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Payment Status:</span>
                <span className="detail-value" style={{ color: '#27ae60', fontWeight: 'bold' }}>COMPLETED</span>
              </div>
            </div>

            <div className="ticket-number-print">
              TICKET: {bookingData?.transaction_id ? `EVT-${event.event_name.substring(0, 3).toUpperCase()}-${bookingData.transaction_id.slice(-8)}` : "N/A"}
            </div>

            <div className="invoice-footer">
              <p>Thank you for your booking!</p>
              <p>Please present this invoice at the event entrance.</p>
              <p>Eventa Tickets • support@eventa.com</p>
              <p>Generated on: {new Date().toLocaleString()}</p>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="ticket-payment-page">
      <div className="payment-container">
        {/* Left Column: Event Details */}
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

        {/* Right Column: Personal Info Form */}
        <div className="payment-form-container">
          <h2>Complete Your Booking</h2>

          {error && (
            <div className="alert error">
              <i className="fas fa-exclamation-circle"></i> {error}
            </div>
          )}

          <form>
            {/* Personal Information */}
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

            {/* Ticket Selection */}
            <div className="form-section">
              <h3>Ticket Details</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Ticket Type</label>
                  <select
                    name="ticketType"
                    value={ticketData.ticketType}
                    onChange={handleInputChange}
                  >
                    {parseFloat(event.early_bird_price) > 0 && (
                      <option value="early_bird">Early Bird - R {formatPrice(event.early_bird_price)}</option>
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
                  <label>Quantity</label>
                  <select
                    name="quantity"
                    value={ticketData.quantity}
                    onChange={handleInputChange}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Terms and Total */}
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
                  I agree to the terms and conditions and understand that tickets are non-refundable
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
                  className={`payment-option ${selectedPaymentMethod === 'credit-card' ? 'active' : ''}`}
                  onClick={() => handlePaymentMethodSelect('credit-card')}
                >
                  <i className="bi bi-credit-card-2-front"></i>
                  <span>Credit/Debit Card</span>
                  <small>Visa, Mastercard, Amex</small>
                </button>
                <button
                  type="button"
                  className={`payment-option ${selectedPaymentMethod === 'paypal' ? 'active' : ''}`}
                  onClick={() => handlePaymentMethodSelect('paypal')}
                >
                  <i className="bi bi-paypal"></i>
                  <span>PayPal</span>
                  <small>Fast & secure</small>
                </button>
                <button
                  type="button"
                  className={`payment-option ${selectedPaymentMethod === 'stripe' ? 'active' : ''}`}
                  onClick={() => handlePaymentMethodSelect('stripe')}
                >
                  <i className="bi bi-shield-check"></i>
                  <span>Stripe</span>
                  <small>Secure payments</small>
                </button>
              </div>

              <p className="secure-payment">
                <i className="fas fa-lock"></i> Your payment is secure and encrypted
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Payment Method Popup */}
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