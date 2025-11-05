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

/* ---------- INPUT ---------- */
$guestEmail = $_POST['email'] ?? '';
$guestName  = $_POST['name'] ?? '';
$eventId    = $_POST['event'] ?? '';
$API_URL    = $_POST['API_URL'] ?? '';
$user_email = $_POST['user_email'] ?? '';

if (empty($guestEmail) || empty($eventId) || empty($API_URL)) {
    echo json_encode(["success" => false, "message" => "Missing required fields"]);
    exit;
}

$API_URL = str_replace(['/php', '/api'], '', $API_URL);
if (strpos($API_URL, 'localhost') !== false) {
    $API_URL = 'http://localhost:3000';
}

/* ---------- EVENT DETAILS ---------- */
try {
    $stmt = $pdo->prepare("SELECT event_name, event_start_date, event_location FROM events WHERE event_id = ?");
    $stmt->execute([$eventId]);
    $event = $stmt->fetch(PDO::FETCH_ASSOC);

    if (! $event) {
        echo json_encode(["success" => false, "message" => "Event not found"]);
        exit;
    }

    $eventName     = $event['event_name'];
    $eventDate     = $event['event_start_date'];
    $eventLocation = $event['event_location'];

    $rsvpLink    = "$API_URL/rsvpForm?event_id=" . urlencode($eventId) . "&user_email=" . urlencode($user_email);
    $messageLink = "$API_URL/guestMessageView?event_id=" . urlencode($eventId);
    $reportLink  = "$API_URL/report-event?event_id=" . urlencode($eventId);

    /* ---------- BREVO CONFIG ---------- */
$BREVO_API_KEY = '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';
    $fromEmail     = "ananiasndou0@gmail.com";
    $fromName      = "Eventa (no-reply)";

    $payload = [
        "sender"      => ["email" => $fromEmail, "name" => $fromName],
        "to"          => [["email" => $guestEmail, "name" => $guestName]],
        "subject"     => "Invitation to $eventName",
        "htmlContent" => "
            <html><body style='font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;'>
                <div style='background:#fff;padding:30px;border-radius:12px;text-align:center;'>
                    <h1 style='color:#75cc54;'>You're Invited (party popper)</h1>
                    <h2>{$eventName}</h2>
                    <p><strong>Date:</strong> " . date('F j, Y', strtotime($eventDate)) . "</p>
                    <p><strong>Location:</strong> {$eventLocation}</p>
                    <a href='{$messageLink}' style='display:inline-block;margin:10px;padding:12px 24px;background:#75cc54;color:#fff;text-decoration:none;border-radius:6px;'>Message Now</a>
                    <a href='{$rsvpLink}' style='display:inline-block;margin:10px;padding:12px 24px;background:#8b6a35;color:#fff;text-decoration:none;border-radius:6px;'>RSVP Now</a>

                    <div style='margin-top:30px;padding-top:20px;border-top:1px solid #e0e0e0;'>
                        <p style='font-size:12px;color:#888;'>
                            If you believe this event contains inappropriate content, you can
                            <a href='{$reportLink}' style='color:#888;text-decoration:underline;'>report this event</a>.
                        </p>
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
        echo json_encode([
            "success"  => true,
            "message"  => "Invitation sent successfully to $guestEmail",
            "rsvpLink" => $rsvpLink,
        ]);
    } else {
        $err = json_decode($response, true)['message'] ?? $response;
        echo json_encode(["success" => false, "message" => "Brevo Error (HTTP $status): $err"]);
    }

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}