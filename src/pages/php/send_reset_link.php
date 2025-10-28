<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once "dbConnection.php";

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $db  = new Database();
    $pdo = $db->getConnection();

    $email   = $_POST['email'] ?? '';
    $API_URL = $_POST['API_URL'] ?? '';

    if (empty($email) || empty($API_URL)) {
        echo json_encode(["success" => false, "message" => "Missing Values"]);
        exit;
    }

    $API_URL = str_replace(['/php', '/api'], '', $API_URL);
    if (strpos($API_URL, 'localhost') !== false) {
        $API_URL = 'http://localhost:3000';
    }

    $stmt = $pdo->prepare("SELECT user_id, name FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode(["success" => false, "message" => "No account found with that email."]);
        exit;
    }

    $forgotLink = "$API_URL/forgot_password?email=" . urlencode($email);

    $SENDGRID_API_KEY = "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";
    $fromEmail        = "bugbusters929@gmail.com";
    $fromName         = "Eventa Support";

    $emailData = [
        "personalizations" => [[
            "to" => [["email" => $email, "name" => $user['name']]],
            "subject" => "Reset Your Eventa Password",
        ]],
        "from" => ["email" => $fromEmail, "name" => $fromName],
        "content" => [[
            "type" => "text/html",
            "value" => "
                <html>
                <body style='font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;'>
                    <div style='background: #fff; padding: 30px; border-radius: 12px; text-align: center;'>
                        <h2>Password Reset Request 🔐</h2>
                        <p>Hi {$user['name']},</p>
                        <p>We received a request to reset your Eventa password.</p>
                        <p>Click below to continue:</p>
                        <a href='{$forgotLink}' style='display:inline-block;margin-top:20px;padding:12px 24px;background:#8b6a35;color:#fff;text-decoration:none;border-radius:6px;'>Go to Reset Page</a>
                        <p style='margin-top:20px;font-size:12px;color:#666;'>If you didn’t request this, ignore this email.</p>
                    </div>
                </body>
                </html>"
        ]]
    ];

    // Send request to SendGrid API
    $ch = curl_init("https://api.sendgrid.com/v3/mail/send");
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
        echo json_encode(["success" => true, "message" => "Reset link sent to $email"]);
    } else {
        echo json_encode(["success" => false, "message" => "SendGrid Error (HTTP $status): $response"]);
    }

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
}