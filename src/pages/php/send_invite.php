<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require __DIR__ . '/../../../vendor/autoload.php';
require_once "dbConnection.php";

$db  = new Database();
$pdo = $db->getConnection();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

$guestEmail = $_POST['email'] ?? '';
$guestName  = $_POST['name'] ?? '';
$eventId    = $_POST['event'] ?? '';
$API_URL    = $_POST['API_URL'] ?? '';

if (empty($guestEmail) || empty($eventId) || empty($API_URL)) {
    echo json_encode([
        "success" => false,
        "message" => "Missing required fields",
    ]);
    exit;
}

$API_URL = str_replace(['/php', '/api'], '', $API_URL);

if (strpos($API_URL, 'localhost') !== false) {
    $API_URL = 'http://localhost:3000';
}

try {
    
    $stmt = $pdo->prepare("SELECT event_name, event_start_date, event_location FROM events WHERE event_id = ?");
    $stmt->execute([$eventId]);
    $event = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$event) {
        echo json_encode([
            "success" => false,
            "message" => "Event not found",
        ]);
        exit;
    }

    $eventName     = $event['event_name'];
    $eventDate     = $event['event_start_date'];
    $eventLocation = $event['event_location'];

    $rsvpLink = "$API_URL/rsvpForm?event_id=" . urlencode($eventId);

    // Send email
    $mail = new PHPMailer(true);

    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = 'sellytlou@gmail.com';
    $mail->Password   = 'dnojpskxewhopmzr'; // ⚠️ consider storing securely
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;

    $mail->setFrom('sellytlou@gmail.com', 'Eventa (no-reply)');
    $mail->addAddress($guestEmail, $guestName);

    $mail->isHTML(true);
    $mail->Subject = "Invitation to $eventName";

    $mail->Body = "
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
        .rsvp-card {
          background: #fff;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          text-align: center;
          max-width: 500px;
          margin: auto;
        }
        .rsvp-card h1 { color: #75cc54; }
        .rsvp-card h2 { margin: 15px 0; font-size: 20px; }
        .rsvp-btn {
          margin-top: 20px;
          display: inline-block;
          padding: 12px 24px;
          background: #8b6a35;
          color: white !important;
          text-decoration: none;
          border-radius: 6px;
        }
      </style>
    </head>
    <body>
      <div class='rsvp-card'>
        <h1>You're Invited 🎉</h1>
        <h2>{$eventName}</h2>
        <p><strong>Date:</strong> " . date('F j, Y', strtotime($eventDate)) . "</p>
        <p><strong>Location:</strong> {$eventLocation}</p>
        <a href='{$rsvpLink}' class='rsvp-btn'>RSVP Now</a>
      </div>
    </body>
    </html>";

    $mail->AltBody = "Hi $guestName,\n\nYou are invited to $eventName!\n\nDate: $eventDate\nLocation: $eventLocation\n\nPlease RSVP here: $rsvpLink";

    $mail->send();

    echo json_encode([
        "success" => true,
        "message" => "Invitation sent successfully to $guestEmail",
        "rsvpLink" => $rsvpLink // for debugging
    ]);

} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "Mailer Error: {$mail->ErrorInfo}",
    ]);
}