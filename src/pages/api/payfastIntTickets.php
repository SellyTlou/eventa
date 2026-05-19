<?php
// Enable error reporting for testing
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_errors.log');

// Create log directory if it doesn't exist
if (!file_exists(__DIR__)) {
    mkdir(__DIR__, 0777, true);
}

// Log file for debugging - ALWAYS log at the very beginning
$logFile = __DIR__ . '/payfast_tickets_debug.log';
file_put_contents(
    $logFile,
    date('Y-m-d H:i:s') . " - payFastIntTickets.php accessed\n" .
    "REQUEST_METHOD: " . $_SERVER['REQUEST_METHOD'] . "\n" .
    "REMOTE_ADDR: " . $_SERVER['REMOTE_ADDR'] . "\n" .
    "POST data: " . print_r($_POST, true) . "\n" .
    "GET data: " . print_r($_GET, true) . "\n" .
    str_repeat('=', 80) . "\n\n",
    FILE_APPEND
);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once "dbConnection.php";

class TicketPayFastITN
{
    private $pdo;
    private $BREVO_API_KEY = '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';

    private $PAYFAST_PASSPHRASE = '';

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    public function handleITN()
    {
        try {
            $this->logData('🚀 handleITN() started', ['post_data' => $_POST]);
            
            $paymentData = $_POST;

            if (empty($paymentData)) {
                $this->logData('⚠️ No POST data received', []);
                echo "OK";
                return;
            }

            $m_payment_id = $paymentData['m_payment_id'] ?? '';
            $pf_payment_id = $paymentData['pf_payment_id'] ?? '';
            $payment_status_raw = strtoupper($paymentData['payment_status'] ?? '');

            $this->logData('📊 Payment Data Extracted', [
                'm_payment_id' => $m_payment_id,
                'pf_payment_id' => $pf_payment_id,
                'payment_status_raw' => $payment_status_raw
            ]);

            if (empty($m_payment_id)) {
                $this->logData('❌ Missing m_payment_id', $paymentData);
                echo "INVALID";
                return;
            }

            $isValid = $this->validatePayFastData($paymentData);
            $this->logData('Validation Result', ['is_valid' => $isValid]);
            
            if (!$isValid) {
                $this->logData('❌ Signature validation failed', $paymentData);
                echo "INVALID";
                return;
            }

            $this->logData('✅ Signature validated successfully', ['bookingId' => $m_payment_id]);

            switch ($payment_status_raw) {
                case 'COMPLETE':
                    $this->logData('💰 Processing COMPLETE payment', ['bookingId' => $m_payment_id]);
                    $result = $this->processSuccessfulPayment($paymentData);
                    echo $result ? "VALID" : "INVALID";
                    break;

                case 'FAILED':
                    $this->logData('❌ Payment FAILED', ['bookingId' => $m_payment_id]);
                    $this->updatePaymentStatus($m_payment_id, 'failed', $pf_payment_id);
                    echo "VALID";
                    break;

                case 'PENDING':
                    $this->logData('⏳ Payment PENDING', ['bookingId' => $m_payment_id]);
                    $this->updatePaymentStatus($m_payment_id, 'pending', $pf_payment_id);
                    echo "VALID";
                    break;

                default:
                    $this->logData('❌ Unknown payment status: ' . $payment_status_raw, $paymentData);
                    echo "INVALID";
                    return;
            }

        } catch (Exception $e) {
            $this->logData('❌ ITN ERROR in handleITN', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            echo "INVALID";
        }
    }

   private function validatePayFastData($paymentData) {
    if (!isset($paymentData['signature'])) {
        return false;
    }

    $receivedSignature = $paymentData['signature'];
    
    
    $generatedSignature = $this->localSignatureGenerator($paymentData, null); 
    
    $this->logData('Signature Validation', [
        'generated' => $generatedSignature,
        'received' => $receivedSignature
    ]);

    return ($receivedSignature === $generatedSignature);
}

private function localSignatureGenerator($data, $passphrase = null)
{
    unset($data['signature']);

    $pfOutput = '';

    foreach ($data as $key => $val) {

        $val = (string)$val;

        $pfOutput .= $key . '=' . urlencode(trim($val)) . '&';
    }

    $getString = rtrim($pfOutput, '&');

    if (!empty($passphrase)) {
        $getString .= '&passphrase=' . urlencode($passphrase);
    }

    $this->logData('ITN Signature String', [
        'string' => $getString
    ]);

    return md5($getString);
}

private function processSuccessfulPayment($data)
{
    try {
        $this->pdo->beginTransaction();

        $m_payment_id = trim($data['m_payment_id'] ?? '');
        $pf_payment_id = trim($data['pf_payment_id'] ?? '');
        $amount = $data['amount_gross'] ?? '0.00';

        if (empty($m_payment_id)) {
            throw new Exception("Missing m_payment_id");
        }

        $this->logData('💰 Processing payment', [
            'bookingId' => $m_payment_id,
            'pf_payment_id' => $pf_payment_id
        ]);

        $checkStmt = $this->pdo->prepare("
            SELECT * FROM bookings WHERE bookingId = ?
        ");
        $checkStmt->execute([$m_payment_id]);
        $existingBooking = $checkStmt->fetch(PDO::FETCH_ASSOC);

        $this->logData('🔎 BOOKING CHECK', [
            'bookingId' => $m_payment_id,
            'exists' => $existingBooking ? 'YES' : 'NO'
        ]);

        $customData = json_decode($data['custom_str4'] ?? '{}', true);
        $ticketType = $customData['ticket_type'] ?? 'general';
        $quantity = (int)($customData['quantity'] ?? 1);
        $eventId = $customData['event_id'] ?? '';

        if (!$existingBooking) {
            $this->logData('📝 Creating booking from ITN', []);
            
            $ticketTypeLabel = ucfirst(str_replace('_', ' ', $ticketType));

            $insertStmt = $this->pdo->prepare("
                INSERT INTO bookings (
                    bookingId, event_id, customer_email,
                    customer_first_name, customer_last_name, customer_phone,
                    ticket_type, ticket_type_label,
                    quantity, unit_price, total_amount,
                    payment_method, payment_status,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");

            $insertStmt->execute([
                $m_payment_id,
                $eventId,
                $customData['email'] ?? '',
                $customData['firstName'] ?? '',
                $customData['lastName'] ?? '',
                $customData['phone'] ?? '',
                $ticketType,
                $ticketTypeLabel,
                $quantity,
                0,
                $amount,
                'payfast',
                'pending'
            ]);

            $this->logData('✅ Booking inserted', ['bookingId' => $m_payment_id]);
        }

        $updateStmt = $this->pdo->prepare("
            UPDATE bookings 
            SET 
                payment_status = 'completed',
                pf_payment_id = :pf_payment_id,
                payment_date = NOW(),
                updated_at = NOW()
            WHERE bookingId = :bookingId
        ");

        $updateStmt->execute([
            ':pf_payment_id' => $pf_payment_id,
            ':bookingId' => $m_payment_id
        ]);

        $this->logData('🧪 UPDATE ATTEMPT', [
            'bookingId' => $m_payment_id,
            'rows_affected' => $updateStmt->rowCount()
        ]);

        $verifyStmt = $this->pdo->prepare("
            SELECT payment_status, pf_payment_id 
            FROM bookings 
            WHERE bookingId = ?
        ");
        $verifyStmt->execute([$m_payment_id]);
        $verify = $verifyStmt->fetch(PDO::FETCH_ASSOC);

        $this->logData('🧪 VERIFY AFTER UPDATE', $verify);

        if (!$verify || $verify['payment_status'] !== 'completed') {
            throw new Exception("Update failed — booking not updated");
        }

        if (!empty($eventId) && !empty($ticketType) && $quantity > 0) {
            $this->logData('🎫 Attempting to deduct tickets', [
                'event_id' => $eventId,
                'ticket_type' => $ticketType,
                'quantity' => $quantity,
                'bookingId' => $m_payment_id
            ]);
            
            $deductionResult = $this->deductQty($eventId, $ticketType, $quantity);
            
            if (!$deductionResult) {
                throw new Exception("Failed to deduct ticket quantity from inventory");
            }
            
            $this->logData('✅ Tickets deducted successfully', [
                'event_id' => $eventId,
                'ticket_type' => $ticketType,
                'quantity' => $quantity
            ]);
        } else {
            $this->logData('⚠️ No ticket data to deduct', [
                'eventId' => $eventId,
                'ticketType' => $ticketType,
                'quantity' => $quantity
            ]);
        }

        $bookingStmt = $this->pdo->prepare("
            SELECT 
                b.*, 
                te.event_name, 
                te.event_start_date, 
                te.event_start_time, 
                te.address,
                te.city,
                te.province
            FROM bookings b
            LEFT JOIN ticket_events te 
                ON b.event_id COLLATE utf8mb4_unicode_ci = te.event_id COLLATE utf8mb4_unicode_ci
            WHERE b.bookingId = :bookingId
        ");
        
        $bookingStmt->execute([':bookingId' => $m_payment_id]);
        $booking = $bookingStmt->fetch(PDO::FETCH_ASSOC);

        if (!$booking) {
            $this->logData('⚠️ No event details found, using basic booking info', []);
        }

        $this->pdo->commit();

        $this->logData('✅ PAYMENT COMPLETED', [
            'bookingId' => $m_payment_id,
            'pf_payment_id' => $pf_payment_id,
            'tickets_deducted' => [
                'event_id' => $eventId,
                'ticket_type' => $ticketType,
                'quantity' => $quantity
            ]
        ]);


        
        $this->sendTicketConfirmationEmail($booking, $data);

        return true;

    } catch (Exception $e) {
        if ($this->pdo->inTransaction()) {
            $this->pdo->rollBack();
        }

        $this->logData('❌ PROCESSING ERROR', [
            'error' => $e->getMessage()
        ]);

        return false;
    }
}

private function deductQty($eventID, $ticketType, $qty)
{
    try {
        $qty = intval($qty);
        if ($qty <= 0) {
            $this->logData("⚠️ Invalid quantity to deduct", [
                'eventID' => $eventID,
                'ticketType' => $ticketType,
                'quantity' => $qty
            ]);
            return false;
        }

        $ticketColumns = [
            'general' => 'general_quantity',
            'earlybird' => 'earlybird_quantity',
            'vip' => 'vip_quantity'
        ];

        if (!isset($ticketColumns[$ticketType])) {
            $this->logData("❌ Unknown ticket type", [
                'eventID' => $eventID,
                'ticketType' => $ticketType
            ]);
            return false;
        }

        $column = $ticketColumns[$ticketType];

        $stmt = $this->pdo->prepare("
            UPDATE ticket_events
            SET {$column} = {$column} - :qty
            WHERE event_id = :event_id AND {$column} >= :qty
        ");
        $stmt->execute([
            ':qty' => $qty,
            ':event_id' => $eventID
        ]);

        $rowsAffected = $stmt->rowCount();

        $this->logData("🧾 Deducted ticket quantity", [
            'eventID' => $eventID,
            'ticketType' => $ticketType,
            'quantityDeducted' => $qty, 
            'rowsAffected' => $rowsAffected
        ]);

        if ($rowsAffected === 0) {
            throw new Exception("Not enough {$ticketType} tickets available for event {$eventID}");
        }

        return true;

    } catch (Exception $e) {
        $this->logData("❌ Failed to deduct ticket quantity", [
            'eventID' => $eventID,
            'ticketType' => $ticketType,
            'quantity' => $qty,
            'error' => $e->getMessage()
        ]);
        return false;
    }
}
    private function updatePaymentStatus($bookingId, $status, $pfPaymentId = null)
    {
        try {
            $sql = "UPDATE bookings SET payment_status = ?, updated_at = NOW()";
            $params = [$status, $bookingId];
            
            if ($pfPaymentId) {
                $sql = "UPDATE bookings SET payment_status = ?, pf_payment_id = ?, updated_at = NOW() WHERE bookingId = ?";
                $params = [$status, $pfPaymentId, $bookingId];
            } else {
                $sql = "UPDATE bookings SET payment_status = ?, updated_at = NOW() WHERE bookingId = ?";
                $params = [$status, $bookingId];
            }
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            
            $rowsAffected = $stmt->rowCount();
            $this->logData("📝 Updated payment status", [
                'bookingId' => $bookingId,
                'status' => $status,
                'rows_affected' => $rowsAffected
            ]);
        } catch (Exception $e) {
            $this->logData("❌ Failed to update payment status", ['error' => $e->getMessage()]);
        }
    }

    private function sendTicketConfirmationEmail($booking, $paymentData)
    {
        try {
            $bookingId = $booking['bookingId'];
            $customerEmail = $booking['customer_email'];
            $customerName = $booking['customer_first_name'] . ' ' . $booking['customer_last_name'];
            
            // Get event details from the booking (already joined)
            $eventName = $booking['event_name'] ?? 'Event';
            $eventDate = $booking['event_start_date'] ? date('F j, Y', strtotime($booking['event_start_date'])) : 'Date TBA';
            $eventTime = $booking['event_start_time'] ?? 'TBA';
            
            // Build full location from address, city, province
            $locationParts = array_filter([
                $booking['address'] ?? '',
                $booking['city'] ?? '',
                $booking['province'] ?? ''
            ]);
            $eventLocation = !empty($locationParts) ? implode(', ', $locationParts) : ($booking['address'] ?? 'Location TBA');
            
            $ticketType = ucfirst(str_replace('_', ' ', $booking['ticket_type_label'] ?? $booking['ticket_type']));
            $quantity = $booking['quantity'];
            $unitPrice = number_format($booking['unit_price'], 2);
            $totalAmount = number_format($booking['total_amount'], 2);
            $transactionId = $paymentData['pf_payment_id'] ?? $bookingId;
            
            $this->logData('📧 Preparing email', [
                'to' => $customerEmail,
                'bookingId' => $bookingId,
                'eventName' => $eventName
            ]);
            
            // Generate QR code data
            $qrData = base64_encode(json_encode([
                'booking_id' => $bookingId,
                'event_id' => $booking['event_id'],
                'ticket_type' => $booking['ticket_type'],
                'quantity' => $quantity
            ])); 
            
            $customData = json_decode($paymentData['custom_str4'] ?? '{}', true);
         $APP_URL = $customData['base_url'] ?? '';
            
            $htmlContent = "
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { text-align: center; background: #4caf50; color: white; padding: 20px; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
                    .event-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
                    .ticket-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
                    .qr-code { text-align: center; margin: 20px 0; }
                    .footer { text-align: center; font-size: 12px; color: #888; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='header'>
                        <h2>🎟️ Your Tickets Are Ready!</h2>
                    </div>
                    <div class='content'>
                        <p>Dear <strong>{$customerName}</strong>,</p>
                        <p>Thank you for your purchase! Your ticket booking has been confirmed.</p>
                        
                        <div class='event-details'>
                            <h3>📅 Event Details</h3>
                            <p><strong>Event:</strong> {$eventName}<br>
                            <strong>Date:</strong> {$eventDate}<br>
                            <strong>Time:</strong> {$eventTime}<br>
                            <strong>Venue:</strong> {$eventLocation}</p>
                        </div>
                        
                        <div class='ticket-details'>
                            <h3>🎫 Ticket Information</h3>
                            <p><strong>Ticket Type:</strong> {$ticketType}<br>
                            <strong>Quantity:</strong> {$quantity}<br>
                            <strong>Unit Price:</strong> R{$unitPrice}<br>
                            <strong>Total Paid:</strong> R{$totalAmount}<br>
                            <strong>Booking ID:</strong> {$bookingId}<br>
                            <strong>Transaction ID:</strong> {$transactionId}</p>
                        </div>
                        
                        <div class='qr-code'>
                            <img src='https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={$qrData}' alt='QR Code' />
                            <p><small>Scan this QR code at the entrance</small></p>
                        </div>
                        
                        <p><strong>Important:</strong> Please present this email (digital or printed) at the event entrance.</p>
                    </div>
                    <div class='footer'>
                        <p>Need help? Contact us at support@evendi.co.za</p>
                        <p>&copy; " . date('Y') . " Evendi. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            ";
            
            $textContent = "Your Tickets Are Ready!\n\n" .
                          "Event: {$eventName}\n" .
                          "Date: {$eventDate}\n" .
                          "Time: {$eventTime}\n" .
                          "Venue: {$eventLocation}\n\n" .
                          "Ticket Type: {$ticketType}\n" .
                          "Quantity: {$quantity}\n" .
                          "Total Paid: R{$totalAmount}\n" .
                          "Booking ID: {$bookingId}\n\n" .
                          "Thank you for your purchase!";
            
            $payload = [
                "sender" => [
                    "email" => "ananiasndou0@gmail.com",
                    "name" => "Evendi Support"
                ],
                "to" => [
                    [
                        "email" => $customerEmail,
                        "name" => $customerName
                    ]
                ],
                "subject" => "Your Tickets for {$eventName}",
                "htmlContent" => $htmlContent,
                "textContent" => $textContent
            ];
            
            $ch = curl_init("https://api.brevo.com/v3/smtp/email");
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => [
                    "api-key: {$this->BREVO_API_KEY}",
                    "Content-Type: application/json",
                ],
                CURLOPT_POSTFIELDS => json_encode($payload),
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 30,
            ]);
            
            $response = curl_exec($ch);
            $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($status === 201) {
                $this->logData("✅ Email sent successfully", ["email" => $customerEmail]);
            } else {
                $this->logData("❌ Email failed", ["status" => $status, "response" => $response]);
            }
            
        } catch (Exception $e) {
            $this->logData("❌ Email error", ["error" => $e->getMessage()]);
        }
    }

    private function logData($title, $data)
    {
        $logFile = __DIR__ . '/payfast_tickets_itn.log';
        $timestamp = date('Y-m-d H:i:s');
        $logEntry = "[$timestamp] $title\n";
        $logEntry .= print_r($data, true) . "\n";
        $logEntry .= str_repeat('-', 80) . "\n\n";
        
        file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
        error_log("PayFast ITN - $title: " . json_encode($data));
    }
}

// Initialize and handle
try {
    if (!class_exists('Database')) {
        error_log("Database class not found!");
        echo "INVALID";
        exit;
    }
    
    $db = new Database();
    $pdo = $db->getConnection();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $itnHandler = new TicketPayFastITN($pdo);
    $itnHandler->handleITN();
    
} catch (Exception $e) {
    error_log("PayFast Tickets ITN Fatal Error: " . $e->getMessage());
    file_put_contents(
        __DIR__ . '/payfast_tickets_fatal.log',
        date('Y-m-d H:i:s') . " - Fatal Error: " . $e->getMessage() . "\n",
        FILE_APPEND
    );
    echo "INVALID";
}
?>