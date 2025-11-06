<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once "dbConnection.php";

try {
    $db  = new Database();
    $pdo = $db->getConnection();

    /* ---------- INPUT ---------- */
    $guestEmail = $_POST['email'] ?? '';
    $guestName  = $_POST['name'] ?? '';
    $eventId    = $_POST['event'] ?? '';
    $API_URL    = $_POST['API_URL'] ?? '';
    $user_email = $_POST['user_email'] ?? '';

    if (empty($guestEmail) || empty($eventId) || empty($API_URL) || empty($user_email)) {
        echo json_encode(["success" => false, "message" => "Missing required fields"]);
        exit;
    }

    /* ---------- CLEAN API_URL (same as verification script) ---------- */
    $API_URL = rtrim(str_replace(['/php', '/api'], '', $API_URL), '/');
    if (strpos($API_URL, 'localhost') !== false) {
        $API_URL = 'http://localhost:3000';
    }

    /* ---------- EVENT DETAILS ---------- */
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

    /* ---------- BREVO – EXACT COPY OF YOUR VERIFICATION SCRIPT ---------- */
    $BREVO_API_KEY = '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';

    $payload = [
        "sender"      => ["email" => "ananiasndou0@gmail.com", "name" => "Eventa Support"],
        "to"          => [["email" => $guestEmail, "name" => $guestName]],
        "subject"     => "Invitation to $eventName",
        "htmlContent" => "
            <html>
            <body style='font-family:Arial;background:#f9f9f9;padding:20px'>
                <div style='max-width:500px;margin:auto;background:white;padding:30px;border-radius:12px;text-align:center'>
                    <h2 style='color:#8b6a35'>You're Invited!</h2>
                    <p>Hi <strong>{$guestName}</strong>,</p>
                    <p>Join us for:</p>
                    <h3>{$eventName}</h3>
                    <p><strong>Date:</strong> " . date('F j, Y', strtotime($eventDate)) . "<br>
                       <strong>Location:</strong> {$eventLocation}</p>

                    <a href='{$messageLink}'
                       style='background:#75cc54;color:white;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;margin:10px'>
                        Message Now
                    </a>

                    <a href='{$rsvpLink}'
                       style='background:#8b6a35;color:white;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;margin:10px'>
                        RSVP Now
                    </a>

                    <p style='font-size:12px;color:#888;margin-top:30px'>
                        If you believe this event contains inappropriate content,
                        <a href='{$reportLink}' style='color:#888;text-decoration:underline'>report it</a>.
                    </p>
                </div>
            </body>
            </html>",
        "textContent" => "Hi {$guestName},\n\nYou're invited to {$eventName} on " .
        date('F j, Y', strtotime($eventDate)) .
        " at {$eventLocation}.\n\nMessage: {$messageLink}\nRSVP: {$rsvpLink}\nReport: {$reportLink}\n\n— Eventa Team",
    ];

    /* ---------- cURL – IDENTICAL TO VERIFICATION SCRIPT ---------- */
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

    /* ---------- RESPONSE – SAME FORMAT AS VERIFICATION ---------- */
    if ($status === 201) {
        echo json_encode([
            "success"  => true,
            "message"  => "Invitation sent successfully!",
            "rsvpLink" => $rsvpLink,
        ]);
    } else {
        echo json_encode([
            "success" => false,
            "message" => "Failed to send invitation.",
            "debug"   => $response,
        ]);
    }

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
}