<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once "dbConnection.php";
          
$config = require_once __DIR__ . "/config.local.php";
$db  = new Database();
$pdo = $db->getConnection();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/* ---------- INPUT ---------- */
$guest_ids = $_POST['guest_ids'] ?? '';
$message   = $_POST['message'] ?? '';
$event_id  = $_POST['event_id'] ?? '';
$API_URL   = $_POST['API_URL'] ?? '';
$user_id   = $_POST['user_id'] ?? '';

if (empty($guest_ids) || empty($message) || empty($event_id) || empty($API_URL)) {
    echo json_encode([
        "success" => false,
        "message" => "Missing required fields",
        "debug"   => compact('guest_ids', 'message', 'event_id'),
    ]);
    exit;
}

$API_URL = str_replace(['/php', '/api'], '', $API_URL);
if (strpos($API_URL, 'localhost') !== false) {
    $API_URL = 'http://localhost:3000';
}
$messageLink = "$API_URL/guestMessageView?event_id=" . urlencode($event_id);

/* ---------- BREVO CONFIG ---------- */
$BREVO_API_KEY = $config['brevo_api_key'] ?? '';
$fromEmail     = $config['brevo_sender_email'] ?? 'testmyself012@gmail.com'; 
$fromName      = $config['brevo_sender_name'] ?? 'Evendi (no-reply)';

try {
    /* ---------- PREPARE GUESTS ---------- */
    $guest_ids_array = array_filter(explode(',', $guest_ids));
    if (empty($guest_ids_array)) {
        echo json_encode(["success" => false, "message" => "No valid guest IDs"]);
        exit;
    }

    // First determine if this is a ticket event or RSVP event
    $checkTicketStmt = $pdo->prepare("SELECT COUNT(*) FROM bookings WHERE event_id = ?");
    $checkTicketStmt->execute([$event_id]);
    $hasBookings = $checkTicketStmt->fetchColumn() > 0;
    
    $isTicketEvent = $hasBookings;

    // Only check package limits for RSVP events (non-ticket)
    if (!$isTicketEvent && !empty($user_id)) {
        $recipientCount = count($guest_ids_array);
        try {
            $pkgStmt = $pdo->prepare("SELECT p.package_type FROM user_packages up LEFT JOIN packagetb p ON up.package_id = p.package_id WHERE up.user_id = ? LIMIT 1");
            $pkgStmt->execute([$user_id]);
            $pkg = $pkgStmt->fetch(PDO::FETCH_ASSOC);
            $packageType = isset($pkg['package_type']) ? strtolower($pkg['package_type']) : 'basic';

            if ($recipientCount > 1 && !in_array($packageType, ['premium', 'enterprise'])) {
                echo json_encode(["success" => false, "message" => "Bulk messaging (2+ recipients) is not available on your current plan. Upgrade to Premium or Advanced."]);
                exit;
            }
        } catch (PDOException $e) {
            // Log error but don't block the message
            error_log("Package check error: " . $e->getMessage());
        }
    }

    // Get guests based on event type
    $guests = [];
    
    if ($isTicketEvent) {
        // This is a ticket event - get customers from bookings table
        $placeholders = str_repeat('?,', count($guest_ids_array) - 1) . '?';
        $bookingStmt = $pdo->prepare("
            SELECT 
                bookingId as guest_id, 
                customer_email as email, 
                CONCAT(customer_first_name, ' ', customer_last_name) as name,
                quantity,
                total_amount,
                ticket_type_label
            FROM bookings 
            WHERE bookingId IN ($placeholders) AND event_id = ?
        ");
        
        $params = array_merge($guest_ids_array, [$event_id]);
        $bookingStmt->execute($params);
        $guests = $bookingStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Add refund information to message for ticket events
        $refundMessage = "\n\nIMPORTANT: Your payment will be refunded within 5-7 business days. If you don't receive your refund by then, please contact your bank or payment provider.";
        if (strpos($message, 'refund') === false) {
            $message .= $refundMessage;
        }
    } else {
        // This is an RSVP event - get guests from rsvp table
        $placeholders = str_repeat('?,', count($guest_ids_array) - 1) . '?';
        $rsvpStmt = $pdo->prepare("SELECT guest_id, email, name FROM rsvp WHERE guest_id IN ($placeholders)");
        $rsvpStmt->execute($guest_ids_array);
        $guests = $rsvpStmt->fetchAll(PDO::FETCH_ASSOC);
    }

    if (empty($guests)) {
        echo json_encode(["success" => false, "message" => "No guests found"]);
        exit;
    }

    /* ---------- EVENT NAME ---------- */
    // Check both events and ticket_events tables
    $stmt = $pdo->prepare("SELECT event_name FROM events WHERE event_id = ?");
    $stmt->execute([$event_id]);
    $event = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$event) {
        $stmt = $pdo->prepare("SELECT event_name FROM ticket_events WHERE event_id = ?");
        $stmt->execute([$event_id]);
        $event = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    if (!$event) {
        echo json_encode(["success" => false, "message" => "Event not found"]);
        exit;
    }
    $eventName = $event['event_name'];

    $successCount = $failedCount = 0;
    $failedEmails = [];

    foreach ($guests as $guest) {
        // Customize message based on guest type
        $guestMessage = $message;
        if ($isTicketEvent) {
            // Personalize message for ticket buyers
            $guestMessage = str_replace(
                ['Dear guest,', 'Dear guest'],
                ["Dear {$guest['name']},", "Dear {$guest['name']}"],
                $message
            );
        }
        
        $payload = [
            "sender"  => ["email" => $fromEmail, "name" => $fromName],
            "to"      => [["email" => $guest['email'], "name" => $guest['name'] ?? 'Guest']],
            "subject" => $isTicketEvent ? "Important Update Regarding Your Ticket Purchase" : "Important Update for {$eventName}",
            "htmlContent" => "
                <html><head><style>
                    body{font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;margin:0}
                    .container{background:#fff;padding:30px;border-radius:12px;max-width:600px;margin:auto;box-shadow:0 2px 10px rgba(0,0,0,.1)}
                    .header{color:#75cc54;font-size:24px;margin-bottom:20px;text-align:center}
                    .message-box{background:#f8f9fa;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #667eea}
                    .message-text{margin:0;font-size:16px;line-height:1.6;color:#333;white-space:pre-line}
                    " . ($isTicketEvent ? ".refund-badge{background:#dc3545;color:#fff;padding:10px;border-radius:6px;margin:15px 0;text-align:center;font-weight:bold}" : "") . "
                    .button-container{text-align:center;margin:30px 0}
                    .view-button{background:#75cc54;color:#fff;padding:12px 30px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block}
                    .event-info{color:#666;font-size:14px;text-align:center;margin-bottom:20px}
                    .footer{color:#999;font-size:12px;text-align:center;margin-top:20px;padding-top:20px;border-top:1px solid #e0e0e0}
                </style></head><body>
                    <div class='container'>
                        <h1 class='header'>" . ($isTicketEvent ? 'Ticket Purchase Update' : "Update for {$eventName}") . "</h1>
                        " . ($isTicketEvent ? "<div class='refund-badge'>⚠️ REFUND INFORMATION INCLUDED ⚠️</div>" : "") . "
                        <div class='message-box'><p class='message-text'>" . nl2br(htmlspecialchars($guestMessage)) . "</p></div>
                        <div class='button-container'>
                            <a href='{$messageLink}' class='view-button' target='_blank'>View Event Details</a>
                        </div>
                        <p class='event-info'>This message was sent regarding <strong>{$eventName}</strong>.</p>
                        <div class='footer'>
                            <p>If you have any questions, please contact the event organizer.</p>
                            <p>© " . date('Y') . " Evendi. All rights reserved.</p>
                        </div>
                    </div>
                </body></html>",
        ];

        $ch = curl_init("https://api.brevo.com/v3/smtp/email");
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_HTTPHEADER     => [
                "api-key: $BREVO_API_KEY",
                "Content-Type: application/json",
                "Accept: application/json",
            ],
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 30,
        ]);

        $response = curl_exec($ch);
        $status   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($status === 201) {
            $successCount++;
        } else {
            $failedCount++;
            $failedEmails[] = $guest['email'];
            error_log("Brevo error for {$guest['email']}: HTTP $status - $response");
        }
    }

    $result = ($failedCount === 0)
        ? ["success" => true, "message" => "Message sent to {$successCount} recipient(s)", "sent_count" => $successCount]
        : ["success" => false, "message" => "Sent to {$successCount}, failed {$failedCount}", "sent_count" => $successCount, "failed_count" => $failedCount, "failed_emails" => $failedEmails];

    echo json_encode($result);

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
}