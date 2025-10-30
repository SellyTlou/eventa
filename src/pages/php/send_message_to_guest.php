<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once "dbConnection.php";

$db  = new Database();
$pdo = $db->getConnection();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get data from POST (FormData) instead of JSON
$guest_ids = $_POST['guest_ids'] ?? '';
$message   = $_POST['message'] ?? '';
$event_id  = $_POST['event_id'] ?? '';
$API_URL   = $_POST['API_URL'] ?? '';

// Debug: Log what we received
error_log("Received guest_ids: " . $guest_ids);
error_log("Received message: " . $message);
error_log("Received event_id: " . $event_id);

if (empty($guest_ids) || empty($message) || empty($event_id) || empty($API_URL)) {
    echo json_encode([
        "success" => false,
        "message" => "Missing required fields",
        "debug"   => [
            "guest_ids_received" => $guest_ids,
            "message_received"   => $message,
            "event_id_received"  => $event_id,
        ],
    ]);
    exit;
}

$API_URL = str_replace(['/php', '/api'], '', $API_URL);
if (strpos($API_URL, 'localhost') !== false) {
    $API_URL = 'http://localhost:3000';
}

$messageLink = "$API_URL/guestMessageView?event_id=" . urlencode($event_id);

try {
    // Convert guest_ids to array
    $guest_ids_array = explode(',', $guest_ids);

    // Remove any empty values
    $guest_ids_array = array_filter($guest_ids_array);

    if (empty($guest_ids_array)) {
        echo json_encode([
            "success" => false,
            "message" => "No valid guest IDs provided",
        ]);
        exit;
    }

    // Fetch guest emails and names
    $placeholders = str_repeat('?,', count($guest_ids_array) - 1) . '?';
    $stmt         = $pdo->prepare("SELECT guest_id, email, name FROM rsvp WHERE guest_id IN ($placeholders)");
    $stmt->execute($guest_ids_array);
    $guests = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($guests)) {
        echo json_encode([
            "success" => false,
            "message" => "No guests found with the provided IDs",
        ]);
        exit;
    }

    // Fetch event details
    $stmt = $pdo->prepare("SELECT event_name FROM events WHERE event_id = ?");
    $stmt->execute([$event_id]);
    $event = $stmt->fetch(PDO::FETCH_ASSOC);

    if (! $event) {
        echo json_encode([
            "success" => false,
            "message" => "Event not found",
        ]);
        exit;
    }

    $eventName = $event['event_name'];

    // === SendGrid Setup ===
    $SENDGRID_API_KEY = "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";
    $fromEmail        = "bugbusters929@gmail.com";
    $fromName         = "Eventa (no-reply)";

    $successCount = 0;
    $failedCount  = 0;
    $failedEmails = [];

    foreach ($guests as $guest) {
        $guestEmail = $guest['email'];
        $guestName  = $guest['name'];

        $emailData = [
            "personalizations" => [[
                "to"      => [["email" => $guestEmail, "name" => $guestName]],
                "subject" => "Update for {$eventName}",
            ]],
            "from"    => ["email" => $fromEmail, "name" => $fromName],
            "content" => [[
                "type"  => "text/html",
                "value" => "
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; margin: 0; }
                        .container { background: #fff; padding: 30px; border-radius: 12px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                        .header { color: #75cc54; font-size: 24px; margin-bottom: 20px; text-align: center; }
                        .message-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
                        .message-text { margin: 0; font-size: 16px; line-height: 1.6; color: #333; }
                        .button-container { text-align: center; margin: 30px 0; }
                        .view-button {
                            background: #75cc54;
                            color: white;
                            padding: 12px 30px;
                            text-decoration: none;
                            border-radius: 6px;
                            font-size: 16px;
                            font-weight: bold;
                            display: inline-block;
                            border: none;
                            cursor: pointer;
                        }
                        .view-button:hover {
                            background: #5cb85c;
                            text-decoration: none;
                            color: white;
                        }
                        .event-info { color: #666; font-size: 14px; text-align: center; margin-bottom: 20px; }
                        .footer { color: #999; font-size: 12px; text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
                    </style>
                </head>
                <body>
                    <div class='container'>
                        <h1 class='header'>Update for {$eventName}</h1>

                        <div class='message-box'>
                            <p class='message-text'>{$message}</p>
                        </div>

                        <div class='button-container'>
                            <a href='{$messageLink}' class='view-button' target='_blank'>
                                View Full Message Details
                            </a>
                        </div>

                        <p class='event-info'>
                            This message was sent to you because you are invited to <strong>{$eventName}</strong>.
                        </p>

                        <div class='footer'>
                            <p>If you have any questions, please contact the event organizer.</p>
                            <p>© " . date('Y') . " Eventa. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>",
            ]],
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "https://api.sendgrid.com/v3/mail/send");
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer $SENDGRID_API_KEY",
            "Content-Type: application/json",
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($emailData));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        $response = curl_exec($ch);
        $status   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($status == 202) {
            $successCount++;
        } else {
            $failedCount++;
            $failedEmails[] = $guestEmail;
            error_log("SendGrid error for $guestEmail: HTTP $status - $response");
        }
    }

    if ($failedCount === 0) {
        echo json_encode([
            "success" => true,
            "message" => "Message sent successfully to {$successCount} guest(s)",
            "sent_count" => $successCount,
        ]);
    } else {
        echo json_encode([
            "success" => false,
            "message" => "Message sent to {$successCount} guest(s), but failed for {$failedCount} guest(s)",
            "sent_count"    => $successCount,
            "failed_count"  => $failedCount,
            "failed_emails" => $failedEmails,
        ]);
    }

} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "Error: " . $e->getMessage(),
    ]);
}