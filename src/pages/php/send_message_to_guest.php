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
$message = $_POST['message'] ?? '';
$event_id = $_POST['event_id'] ?? '';

// Debug: Log what we received
error_log("Received guest_ids: " . $guest_ids);
error_log("Received message: " . $message);
error_log("Received event_id: " . $event_id);

if (empty($guest_ids) || empty($message) || empty($event_id)) {
    echo json_encode([
        "success" => false,
        "message" => "Missing required fields: guest_ids, message, and event_id are required",
        "debug" => [
            "guest_ids_received" => $guest_ids,
            "message_received" => $message,
            "event_id_received" => $event_id
        ]
    ]);
    exit;
}

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
    $stmt = $pdo->prepare("SELECT guest_id, email, name FROM rsvp WHERE guest_id IN ($placeholders)");
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

    if (!$event) {
        echo json_encode([
            "success" => false,
            "message" => "Event not found",
        ]);
        exit;
    }

    $eventName = $event['event_name'];

    // === SendGrid Setup ===
    $SENDGRID_API_KEY = "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"; 
    $fromEmail = "bugbusters929@gmail.com";          
    $fromName  = "Eventa (no-reply)";

    $successCount = 0;
    $failedCount = 0;
    $failedEmails = [];

    foreach ($guests as $guest) {
        $guestEmail = $guest['email'];
        $guestName = $guest['name'];

        $emailData = [
            "personalizations" => [[
                "to" => [["email" => $guestEmail, "name" => $guestName]],
                "subject" => "Update for {$eventName}",
            ]],
            "from" => ["email" => $fromEmail, "name" => $fromName],
            "content" => [[
                "type" => "text/html",
                "value" => "
                <html>
                <body style='font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;'>
                    <div style='background: #fff; padding: 30px; border-radius: 12px; max-width: 600px; margin: 0 auto;'>
                        <h1 style='color: #75cc54;'>Update for {$eventName}</h1>
                        <div style='background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;'>
                            <p style='margin: 0; font-size: 16px; line-height: 1.6; color: #333;'>{$message}</p>
                        </div>
                        <p style='color: #666; font-size: 14px;'>
                            This message was sent to you because you are invited to <strong>{$eventName}</strong>.
                        </p>
                        <hr style='border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;'>
                        <p style='color: #999; font-size: 12px;'>
                            If you have any questions, please contact the event organizer.
                        </p>
                    </div>
                </body>
                </html>"
            ]]
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "https://api.sendgrid.com/v3/mail/send");
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer $SENDGRID_API_KEY",
            "Content-Type: application/json"
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($emailData));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        $response = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
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
            "sent_count" => $successCount
        ]);
    } else {
        echo json_encode([
            "success" => false,
            "message" => "Message sent to {$successCount} guest(s), but failed for {$failedCount} guest(s)",
            "sent_count" => $successCount,
            "failed_count" => $failedCount,
            "failed_emails" => $failedEmails
        ]);
    }

} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "Error: " . $e->getMessage(),
    ]);
}
?>