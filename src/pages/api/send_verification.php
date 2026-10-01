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
$config = require_once __DIR__ . "/config.local.php";

try {
    $db  = new Database();
    $pdo = $db->getConnection();

    $email   = $_POST['email'] ?? '';
    $API_URL = $_POST['API_URL'] ?? '';
    $BREVO_API_KEY = $config['brevo_api_key'] ?? '';

    if (empty($email) || empty($API_URL)) {
        echo json_encode(["success" => false, "message" => "Missing email or API_URL"]);
        exit;
    }

    // Clean API_URL (remove /php, /api, trailing slash)
    $API_URL = rtrim(str_replace(['/php', '/api'], '', $API_URL), '/');
    if (strpos($API_URL, 'localhost') !== false) {
        $API_URL = 'http://localhost:3000';
    }

    // Find user
    $stmt = $pdo->prepare("SELECT user_id, name FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (! $user) {
        echo json_encode(["success" => false, "message" => "No account found with that email."]);
        exit;
    }

    // SIMPLE LINK — NO TOKEN!
    $verifyLink = "$API_URL/email_verify?email=" . urlencode($email);

    // Brevo Email
    $BREVO_API_KEY = $config['brevo_api_key'] ?? '';
    $fromEmail = $config['brevo_sender_email'] ?? 'testmyself012@gmail.com';
    $fromName = $config['brevo_sender_name'] ?? 'Evendi (no-reply)';
    $payload       = [
        "sender"      => ["email" => $fromEmail, "name" => $fromName],
        "to"          => [["email" => $email, "name" => $user['name']]],
        "subject"     => "Verify Your Evendi Email",
        "htmlContent" => "
            <html>
            <body style='font-family:Arial;background:#f9f9f9;padding:20px'>
                <div style='max-width:500px;margin:auto;background:white;padding:30px;border-radius:12px;text-align:center'>
                    <h2 style='color:#8b6a35'>Verify Your Email</h2>
                    <p>Hi <strong>{$user['name']}</strong>,</p>
                    <p>Click below to verify your email:</p>
                    <a href='$verifyLink' style='background:#8b6a35;color:white;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;margin:20px 0'>
                        Verify Email Now
                    </a>
                    <p style='font-size:12px;color:#888'>
                        If you didn't sign up, ignore this email.
                    </p>
                </div>
            </body>
            </html>",
        "textContent" => "Hi {$user['name']},\n\nVerify: $verifyLink\n\n— Evendi Team",
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
            "success" => true,
            "message" => "Verification email sent!",
            "link"    => $verifyLink,
        ]);
    } else {
        echo json_encode([
            "success" => false,
            "message" => "Failed to send email.",
            "debug"   => $response,
        ]);
    }

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
} 