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

/* ---------- INPUT ---------- */
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

/* ---------- USER LOOKUP ---------- */
try {
    $db  = new Database();
    $pdo = $db->getConnection();

    $stmt = $pdo->prepare("SELECT user_id, name FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (! $user) {
        echo json_encode(["success" => false, "message" => "No account found with that email."]);
        exit;
    }

    $forgotLink = "$API_URL/forgot_password?email=" . urlencode($email);

    /* ---------- BREVO CONFIG ---------- */
    // <<<---  REPLACE THIS WITH YOUR NEW v3 KEY  --->>>
    $BREVO_API_KEY = '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';
    // <<<----------------------------------------->>>

    $fromEmail = "ananiasndou0@gmail.com"; // must be verified in Brevo
    $fromName  = "Eventa Support";

    $payload = [
        "sender"      => ["email" => $fromEmail, "name" => $fromName],
        "to"          => [["email" => $email, "name" => $user['name']]],
        "subject"     => "Reset Your Eventa Password",
        "htmlContent" => "
            <html>
                <body style='font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; margin: 0;'>
                    <div style='max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);'>
                        <div style='text-align: center; margin-bottom: 30px;'>
                            <h2 style='color: #333; margin-bottom: 10px;'>Password Reset Request</h2>
                            <div style='width: 50px; height: 50px; background: #8b6a35; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px;'>
                                🔒
                            </div>
                        </div>

                        <p style='color: #555; font-size: 16px; line-height: 1.5;'>Hi <strong>{$user['name']}</strong>,</p>

                        <p style='color: #555; font-size: 16px; line-height: 1.5;'>We received a request to reset your Eventa account password.</p>

                        <p style='color: #555; font-size: 16px; line-height: 1.5;'>Click the button below to securely reset your password:</p>

                        <div style='text-align: center; margin: 30px 0;'>
                            <button href='{$forgotLink}' style='display: inline-block; padding: 14px 32px; background: #8b6a35; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; border: none; cursor: pointer;'>
                                Reset Your Password
                            </button>
                        </div>

                        <p style='color: #777; font-size: 14px; line-height: 1.5;'>
                            Or copy and paste this link in your browser:<br>
                            <span style='color: #8b6a35; word-break: break-all;'>{$forgotLink}</span>
                        </p>

                        <div style='margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;'>
                            <p style='color: #999; font-size: 12px; line-height: 1.4;'>
                                If you didn't request this password reset, please ignore this email.<br>
                                This link will expire in 24 hours for security reasons.
                            </p>
                        </div>
                    </div>
                </body>
            </html>",
        "textContent" => "Hi {$user['name']},

We received a request to reset your Eventa account password.

Click here to reset your password: {$forgotLink}

If you didn't request this password reset, please ignore this email.

This link will expire in 24 hours for security reasons.

Thank you,
Eventa Support Team",
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
    $curlErr  = curl_error($ch);
    curl_close($ch);

    // ---- DEBUG LOG (remove in production) ----
    error_log("Brevo status: $status | response: $response | curl error: $curlErr");

    if ($status === 201) {
        echo json_encode(["success" => true, "message" => "Reset link sent to $email"]);
    } else {
        $err = json_decode($response, true)['message'] ?? $response;
        echo json_encode([
            "success" => false,
            "message" => "Failed to send reset email. Please try again.",
            "debug"   => "Brevo Error (HTTP $status): $err",
        ]);
    }

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
}