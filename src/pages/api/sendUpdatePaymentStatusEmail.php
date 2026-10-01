<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
$config = require_once __DIR__ . "/config.local.php";
$BREVO_API_KEY = $config['brevo_api_key'] ?? '';
require_once "dbConnection.php";
class PaymentEmailService {

    private $pdo;
  
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function sendUpdatePaymentStatusEmail($payment_id, $user_id, $new_status, $payment_type) {

        try {

            if ($new_status !== 'completed') {
                return [
                    "success" => true,
                    "message" => "Email not sent (status not completed)"
                ];
            }

            // ==============================
            // BUSINESS PAYMENT EMAIL
            // ==============================
            if ($payment_type === 'business') {

                $stmt = $this->pdo->prepare("
                    SELECT * FROM business_package_transactions 
                    WHERE id = ?
                ");
                $stmt->execute([$payment_id]);
                $payment = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$payment) {
                    return ["success" => false, "message" => "Payment not found"];
                }

                $userStmt = $this->pdo->prepare("SELECT name, email FROM users WHERE user_id = ?");
                $userStmt->execute([$payment['user_id']]);
                $user = $userStmt->fetch(PDO::FETCH_ASSOC);

                if (!$user || empty($user['email'])) {
                    return ["success" => false, "message" => "User email not found"];
                }

                $packageStmt = $this->pdo->prepare("SELECT name FROM business_packages WHERE package_id = ?");
                $packageStmt->execute([$payment['business_package_id']]);
                $package = $packageStmt->fetch(PDO::FETCH_ASSOC);

                $package_name = $package['name'] ?? 'Business Package';

                $subject = "Business Package Activated - Eventa";

                $html = "
                <h2>Business Package Activated</h2>
                <p>Hello {$user['name']},</p>
                <p>Your business package has been activated successfully.</p>
                <p><b>Package:</b> {$package_name}</p>
                <p><b>Amount:</b> R{$payment['amount']}</p>
                <p>Thank you for your purchase.</p>
                ";

                return $this->sendEmail($user['email'], $user['name'], $subject, $html);
            }

            // ==============================
            // NORMAL PAYMENT EMAIL
            // ==============================
            else {

                $stmt = $this->pdo->prepare("
                    SELECT * FROM payment_history 
                    WHERE payment_id = ?
                ");
                $stmt->execute([$payment_id]);
                $payment = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$payment) {
                    return ["success" => false, "message" => "Payment not found"];
                }

                $userStmt = $this->pdo->prepare("SELECT name, email FROM users WHERE user_id = ?");
                $userStmt->execute([$payment['user_id']]);
                $user = $userStmt->fetch(PDO::FETCH_ASSOC);

                if (!$user || empty($user['email'])) {
                    return ["success" => false, "message" => "User email not found"];
                }

                $subject = "Payment Confirmation - Eventa";

                $html = "
                <h2>Payment Successful</h2>
                <p>Hello {$user['name']},</p>
                <p>Your payment has been successfully processed.</p>
                <p><b>Package:</b> {$payment['package_name']}</p>
                <p><b>Amount:</b> R{$payment['amount']}</p>
                <p>Thank you for your payment.</p>
                ";

                return $this->sendEmail($user['email'], $user['name'], $subject, $html);
            }

        } catch (Exception $e) {
            return [
                "success" => false,
                "message" => $e->getMessage()
            ];
        }
    }

    // ==============================
    // SEND EMAIL VIA BREVO API
    // ==============================
    private function sendEmail($email, $name, $subject, $htmlContent) {

        $payload = [
            "sender" => [
                "email" => $config['brevo_sender_email'] ?? 'testmyself012@gmail.com',
                "name" => $config['brevo_sender_name'] ?? 'Evendi Support'
            ],
            "to" => [
                [
                    "email" => $email,
                    "name" => $name
                ]
            ],
            "subject" => $subject,
            "htmlContent" => $htmlContent
        ];

        $ch = curl_init("https://api.brevo.com/v3/smtp/email");

        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                "api-key: {$this->BREVO_API_KEY}",
                "Content-Type: application/json",
                "Accept: application/json",
            ],
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
        ]);

        $response = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($status === 201) {
            return ["success" => true, "message" => "Email sent"];
        }

        return [
            "success" => false,
            "message" => "Email failed with status: " . $status,
            "response" => $response
        ];
    }
}

// ==============================
// MAIN EXECUTION
// ==============================
try {
    // Initialize database connection
    $db = new Database();
    $pdo = $db->getConnection();

    // Get POST data
    $payment_id = $_POST['payment_id'] ?? '';
    $user_id = $_POST['user_id'] ?? '';
    $new_status = $_POST['new_status'] ?? '';
    $payment_type = $_POST['payment_type'] ?? '';

    // Validate required fields
    if (empty($payment_id)) {
        echo json_encode([
            "success" => false, 
            "message" => "Payment ID is required"
        ]);
        exit;
    }

    if (empty($new_status)) {
        echo json_encode([
            "success" => false, 
            "message" => "New status is required"
        ]);
        exit;
    }

    if (empty($payment_type)) {
        echo json_encode([
            "success" => false, 
            "message" => "Payment type is required"
        ]);
        exit;
    }

    // Create service instance and send email
    $service = new PaymentEmailService($pdo);
    $result = $service->sendUpdatePaymentStatusEmail(
        $payment_id,
        $user_id,
        $new_status,
        $payment_type
    );

    // Return JSON response
    echo json_encode($result);

} catch (Exception $e) {
    echo json_encode([
        "success" => false, 
        "message" => "Server error: " . $e->getMessage()
    ]);
}
?>