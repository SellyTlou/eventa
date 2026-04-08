<?php

file_put_contents(__DIR__ . '/payfast_debug.log', 
    date('Y-m-d H:i:s') . " - payFastInt.php accessed\n" . 
    "REQUEST_METHOD: " . $_SERVER['REQUEST_METHOD'] . "\n" .
    "REMOTE_ADDR: " . $_SERVER['REMOTE_ADDR'] . "\n" .
    "POST data: " . print_r($_POST, true) . "\n" .
    "GET data: " . print_r($_GET, true) . "\n" .
    str_repeat('=', 80) . "\n\n", 
    FILE_APPEND
);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once "dbConnection.php";

class PayFastITN {
    private $pdo;
    private $BREVO_API_KEY = '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';
    
    // 🔥 LIVE PayFast credentials
    private $PAYFAST_MERCHANT_ID = '33426571';
    private $PAYFAST_MERCHANT_KEY = 'lkqoiy0ftb9yc';
    private $PAYFAST_PASSPHRASE = '';
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    public function handleITN() {
        try {
            $this->logData('=== ITN HANDLER STARTED (LIVE MODE) ===', [
                'timestamp' => date('Y-m-d H:i:s'),
                'post_data' => $_POST,
                'server' => [
                    'remote_addr' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
                    'request_uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
                    'http_user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
                ]
            ]);
            
            $paymentData = $_POST;
            
            if (empty($paymentData)) {
                $this->logData('No POST data received', []);
                echo "OK";
                return;
            }
            
            // Log the payment status immediately
            $this->logData('Payment Status Check', [
                'payment_status' => $paymentData['payment_status'] ?? 'NOT SET',
                'm_payment_id' => $paymentData['m_payment_id'] ?? 'NOT SET',
                'pf_payment_id' => $paymentData['pf_payment_id'] ?? 'NOT SET'
            ]);
            
            // Validate with PayFast LIVE
            $isValid = $this->validatePayFastData($paymentData);
            $this->logData('Validation Result', ['is_valid' => $isValid]);
            
            if (!$isValid) {
                $this->logData('Validation failed - skipping processing', $paymentData);
                echo "INVALID";
                return;
            }
            
            // Process based on payment status
            if (isset($paymentData['payment_status'])) {
                switch ($paymentData['payment_status']) {
                    case 'COMPLETE':
                        $this->logData('Processing COMPLETE payment', ['m_payment_id' => $paymentData['m_payment_id']]);
                        $result = $this->processSuccessfulPayment($paymentData);
                        if ($result) {
                            echo "VALID";
                        } else {
                            echo "INVALID";
                        }
                        break;
                    case 'FAILED':
                        $this->logData('Payment failed', $paymentData);
                        echo "VALID";
                        break;
                    case 'PENDING':
                        $this->logData('Payment pending', $paymentData);
                        echo "VALID";
                        break;
                    default:
                        $this->logData('Unknown payment status: ' . $paymentData['payment_status'], $paymentData);
                        echo "INVALID";
                }
            } else {
                $this->logData('No payment status in data', $paymentData);
                echo "INVALID";
            }
            
        } catch (Exception $e) {
            $this->logData('ITN Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            echo "INVALID";
        }
    }
    
    private function validatePayFastData($data) {
        // Remove the signature from the data to validate
        $dataToValidate = $data;
        if (isset($dataToValidate['signature'])) {
            unset($dataToValidate['signature']);
        }
        
        // Generate query string
        $queryString = http_build_query($dataToValidate);
        
        // 🔥 LIVE validation URL
        $validationUrl = 'https://www.payfast.co.za/eng/query/validate';
        
        $this->logData('Validation Request (LIVE)', [
            'url' => $validationUrl,
            'query_string' => $queryString
        ]);
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $validationUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $queryString,
            CURLOPT_SSL_VERIFYPEER => true, // Enable SSL verification for LIVE
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/x-www-form-urlencoded',
                'Content-Length: ' . strlen($queryString)
            ]
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        
        $this->logData('Validation Response (LIVE)', [
            'http_code' => $httpCode,
            'response' => $response,
            'curl_error' => $curlError
        ]);
        
        // PayFast returns "VALID" or "INVALID" in the response body
        return ($httpCode == 200 && strpos($response, 'VALID') !== false);
    }
    
    private function processSuccessfulPayment($data) {
        try {
            $m_payment_id = $data['m_payment_id'] ?? '';
            $pf_payment_id = $data['pf_payment_id'] ?? '';
            
            if (empty($m_payment_id)) {
                throw new Exception("Missing m_payment_id");
            }

            // Check if payment exists
            $checkStmt = $this->pdo->prepare("SELECT * FROM payment_history WHERE transaction_id = ?");
            $checkStmt->execute([$m_payment_id]);
            $existingPayment = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if (!$existingPayment) {
                $this->logData("No payment found with transaction_id: $m_payment_id", []);
                return false;
            }

            // If already completed, skip
            if ($existingPayment['payment_status'] === 'completed') {
                $this->logData("Payment already completed for transaction: $m_payment_id", []);
                return true;
            }

            $this->pdo->beginTransaction();

            // Update payment status to completed
            $updateStmt = $this->pdo->prepare("
                UPDATE payment_history 
                SET payment_status = 'completed',
                    pf_payment_id = ?,
                    payment_date = NOW(),
                    updated_at = NOW()
                WHERE transaction_id = ?
            ");
            $updateStmt->execute([$pf_payment_id, $m_payment_id]);
            if ($updateStmt->rowCount() === 0) {
                $this->pdo->rollBack();
                $this->logData("No rows updated for transaction_id: $m_payment_id", []);
                return false;
            }

            $user_id = $existingPayment['user_id'];
            $package_id = $existingPayment['package_id'] ?? ($data['custom_str2'] ?? null);

            // Fetch package details
            $pkgStmt = $this->pdo->prepare("SELECT package_type, max_events, max_guests FROM packagetb WHERE package_id = ?");
            $pkgStmt->execute([$package_id]);
            $package = $pkgStmt->fetch(PDO::FETCH_ASSOC);

            if ($package) {
                // Check if user already has a package
                $checkPkg = $this->pdo->prepare("SELECT * FROM user_packages WHERE user_id = ?");
                $checkPkg->execute([$user_id]);
                $existingPackage = $checkPkg->fetch(PDO::FETCH_ASSOC);

                if (!$existingPackage) {
                    // Insert new package
                    $user_package_id = "PKG-" . strtoupper(substr(md5(uniqid()), 0, 8)) . "-" . time();
                    $insertPkg = $this->pdo->prepare("
                        INSERT INTO user_packages 
                        (user_package_id, user_id, package_id, event_limit, event_used, created_at)
                        VALUES (?, ?, ?, ?, 0, NOW())
                    ");
                    $insertPkg->execute([
                        $user_package_id,
                        $user_id,
                        $package_id,
                        $package['max_events']
                    ]);
                    $this->logData("Inserted new user package", [
                        'user_package_id' => $user_package_id,
                        'user_id' => $user_id,
                        'package_id' => $package_id
                    ]);
                } else {
                    // Update existing package
                    $updatePkg = $this->pdo->prepare("
                        UPDATE user_packages 
                        SET package_id = ?, 
                            event_limit = ?, 
                            updated_at = NOW()
                        WHERE user_id = ?
                    ");
                    $updatePkg->execute([
                        $package_id,
                        $package['max_events'],
                        $user_id
                    ]);
                    $this->logData("Updated existing user package", [
                        'user_id' => $user_id,
                        'package_id' => $package_id
                    ]);
                }
            }

            $this->pdo->commit();

            $this->logData("✅ PAYMENT COMPLETED (LIVE) ✅", [
                "transaction_id" => $m_payment_id,
                "pf_payment_id" => $pf_payment_id,
                "user_id" => $user_id,
                "package_id" => $package_id
            ]);

            // Send email
            $this->sendPaymentConfirmationEmail($user_id, $package, $data);

            return true;

        } catch (Exception $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            $this->logData("❌ ITN processing error", [
                "error" => $e->getMessage(),
                "trace" => $e->getTraceAsString()
            ]);
            return false;
        }
    }
    
    private function sendPaymentConfirmationEmail($user_id, $package, $paymentData) {
        try {
            // 1. Get user details
            $userStmt = $this->pdo->prepare("
                SELECT name, email FROM users WHERE user_id = ?
            ");
            $userStmt->execute([$user_id]);
            $user = $userStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user || empty($user['email'])) {
                $this->logData("❌ Cannot send email - user not found", ['user_id' => $user_id]);
                return;
            }

            // 2. Extract payment data
            $transaction_id = $paymentData['m_payment_id'] ?? '';
            $amount = $paymentData['amount_gross'] ?? $paymentData['amount'] ?? '0.00';
            $package_name = $package['package_type'] ?? 'Package';
            $payment_date = date('Y-m-d H:i:s');

            $formattedDate = date('F j, Y H:i:s', strtotime($payment_date));

            // 🔥 Your LIVE domain
            $APP_URL = "https://evenditest.evendi.co.za";

            // 3. Brevo API Key
            $BREVO_API_KEY = $this->BREVO_API_KEY;

            // 4. Email HTML
            $htmlContent = "
            <html>
            <body style='font-family:Arial;background:#f9f9f9;padding:20px'>
                <div style='max-width:600px;margin:auto;background:white;padding:30px;border-radius:12px;'>
                    <div style='text-align:center;margin-bottom:30px'>
                        <h2 style='color:#8b6a35'>Payment Receipt</h2>
                    </div>
                    
                    <p>Dear <strong>{$user['name']}</strong>,</p>
                    
                    <p>Thank you for your payment. Your transaction has been completed successfully.</p>
                    
                    <div style='background:#f5f5f5;padding:20px;border-radius:8px;margin:20px 0'>
                        <h3 style='margin-top:0;color:#333'>Payment Details</h3>
                        <table style='width:100%'>
                             <tr>
                                 <td><strong>Transaction ID:</strong></td>
                                 <td>{$transaction_id}</td>
                             </tr>
                             <tr>
                                 <td><strong>Amount:</strong></td>
                                 <td>R{$amount}</td>
                             </tr>
                             <tr>
                                 <td><strong>Package:</strong></td>
                                 <td>{$package_name}</td>
                             </tr>
                             <tr>
                                 <td><strong>Date:</strong></td>
                                 <td>{$formattedDate}</td>
                             </tr>
                         </table>
                    </div>
                    
                    <p>Your package has been successfully upgraded 🎉</p>
                    
                    <div style='text-align:center;margin:30px 0'>
                        <a href='{$APP_URL}/eventsDashboard' 
                           style='background:#8b6a35;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold'>
                            Go to Dashboard
                        </a>
                    </div>
                    
                    <p style='font-size:12px;color:#888;text-align:center'>
                        &copy; " . date('Y') . " Eventa. All rights reserved.
                    </p>
                </div>
            </body>
            </html>
            ";

            // 5. Text version
            $textContent = "Dear {$user['name']},\n\n" .
                           "Your payment was successful.\n\n" .
                           "Transaction ID: {$transaction_id}\n" .
                           "Amount: R{$amount}\n" .
                           "Package: {$package_name}\n" .
                           "Date: {$formattedDate}\n\n" .
                           "Visit your dashboard: {$APP_URL}/eventsDashboard\n\n" .
                           "— Eventa Team";

            // 6. Brevo payload
            $payload = [
                "sender" => [
                    "email" => "ananiasndou0@gmail.com",
                    "name" => "Eventa Support"
                ],
                "to" => [
                    [
                        "email" => $user['email'],
                        "name" => $user['name']
                    ]
                ],
                "subject" => "Payment Confirmation - Eventa",
                "htmlContent" => $htmlContent,
                "textContent" => $textContent
            ];

            // 7. Send request
            $ch = curl_init("https://api.brevo.com/v3/smtp/email");
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => [
                    "api-key: $BREVO_API_KEY",
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

            // 8. Logging
            if ($status === 201) {
                $this->logData("✅ Email sent successfully", [
                    "email" => $user['email'],
                    "transaction_id" => $transaction_id
                ]);
            } else {
                $this->logData("❌ Email failed", [
                    "status" => $status,
                    "response" => $response
                ]);
            }

        } catch (Exception $e) {
            $this->logData("❌ Email error", [
                "error" => $e->getMessage()
            ]);
        }
    }
    
    private function logData($title, $data) {
        $logFile = __DIR__ . '/payfast_itn.log';
        $timestamp = date('Y-m-d H:i:s');
        $logEntry = "[$timestamp] $title\n";
        $logEntry .= print_r($data, true) . "\n";
        $logEntry .= str_repeat('-', 80) . "\n\n";
        
        file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
        error_log("PayFast ITN - $title: " . json_encode($data));
    }
}

// Initialize and handle
try {
    $db = new Database();
    $pdo = $db->getConnection();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $itnHandler = new PayFastITN($pdo);
    $itnHandler->handleITN();
    
} catch (Exception $e) {
    error_log("PayFast ITN Fatal Error: " . $e->getMessage());
    file_put_contents(__DIR__ . '/payfast_fatal.log', 
        date('Y-m-d H:i:s') . " - Fatal Error: " . $e->getMessage() . "\n", 
        FILE_APPEND
    );
    echo "INVALID";
}
?>