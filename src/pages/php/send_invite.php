<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require __DIR__ . '/../../../vendor/autoload.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

$guestEmail = $_POST['email'] ?? '';
$guestName  = $_POST['name'] ?? '';
$eventId    = $_POST['event'] ?? '';

// Validate input
if (empty($guestEmail) || empty($eventId)) {
    echo json_encode([
        "success" => false,
        "message" => "Missing required fields",
    ]);
    exit;
}

$host     = "localhost";
$dbname   = "eventa";
$username = "root";
$password = "";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Get event details
    $stmt = $pdo->prepare("SELECT event_name, event_start_date, event_location FROM events WHERE event_id = ?");
    $stmt->execute([$eventId]);
    $event = $stmt->fetch(PDO::FETCH_ASSOC);

    if (! $event) {
        echo json_encode([
            "success" => false,
            "message" => "Event not found",
        ]);
        exit;
    }

    $eventName     = $event['event_name'];
    $eventDate     = $event['event_start_date'];
    $eventLocation = $event['event_location'];

    // Create RSVP link
    $API_URL  = process.env.REACT_APP_API_URL;
    $rsvpLink = "https://eventa.xo.je/rsvpForm?event_id=" . urlencode($eventId);

    // Create PHPMailer instance
    $mail = new PHPMailer(true);

    // Server settings
    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = 'sellytlou@gmail.com';
    $mail->Password   = 'dnoj pskx ewho pmzr';
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;

    // Recipients
    $mail->setFrom('sellytlou@gmail.com', 'Eventa (no -repy)');
    $mail->addAddress($guestEmail, $guestName);

    // Content
    $mail->isHTML(true);
    $mail->Subject = "Invitation to $eventName";

    $mail->Body = "
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #75CC54; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #8B6A35;
                     color: white; text-decoration: none; border-radius: 4px; margin: 15px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>You're Invited!</h1>
            </div>
            <div class='content'>
                <h2>Hi $guestName,</h2>
                <p>You are invited to <strong>$eventName</strong>!</p>

                <p><strong>Event Details:</strong></p>
                <ul>
                    <li><strong>Date:</strong> " . date('F j, Y', strtotime($eventDate)) . "</li>
                    <li><strong>Location:</strong> $eventLocation</li>
                </ul>

                <p>Please RSVP by clicking the button below:</p>
                <p>
                    <a href='$rsvpLink' class='button'>RSVP Now</a>
                </p>
            </div>
            <div class='footer'>
                <p>This invitation was sent via Eventa</p>
            </div>
        </div>
    </body>
    </html>
    ";

    $mail->AltBody = "Hi $guestName,\n\nYou are invited to $eventName!\n\nDate: $eventDate\nLocation: $eventLocation\n\nPlease RSVP here: $rsvpLink";

    $mail->send();

    echo json_encode([
        "success" => true,
        "message" => "Invitation sent successfully to $guestEmail",
    ]);

} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "Mailer Error: {$mail->ErrorInfo}",
    ]);
}