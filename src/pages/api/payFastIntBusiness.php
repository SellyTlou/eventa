<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once "dbConnection.php";

class BusinessPayFastITN
{
    private $pdo;
    private $BREVO_API_KEY = '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';

    // 🔥 LIVE PayFast credentials
    private $PAYFAST_MERCHANT_ID = '33426571';
    private $PAYFAST_MERCHANT_KEY = 'lkqoiy0ftb9yc';
    private $PAYFAST_PASSPHRASE = '';

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    public function handleITN()
    {
        try {
            $this->logData('=== ITN HANDLER STARTED ===', [
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

            $status = strtoupper($paymentData['payment_status'] ?? '');

            $this->logData('Payment Status Check', [
                'payment_status' => $status,
                'm_payment_id' => $paymentData['m_payment_id'] ?? 'NOT SET',
                'pf_payment_id' => $paymentData['pf_payment_id'] ?? 'NOT SET'
            ]);

            $isValid = $this->validatePayFastData($paymentData);

            $this->logData('Validation Result', [
                'is_valid' => $isValid
            ]);

            if (!$isValid) {
                $this->logData('Validation failed - skipping processing', $paymentData);
                echo "INVALID";
                return;
            }

            switch ($status) {
                case 'COMPLETE':
                    $this->logData('Processing COMPLETE payment', [
                        'm_payment_id' => $paymentData['m_payment_id']
                    ]);
                    $result = $this->processSuccessfulPayment($paymentData);
                    echo $result ? "VALID" : "INVALID";
                    break;

                case 'FAILED':
                    $this->logData('Payment FAILED', $paymentData);
                    $this->updatePaymentStatus($paymentData['m_payment_id'] ?? '', 'failed');
                    echo "VALID";
                    break;

                case 'PENDING':
                    $this->logData('Payment PENDING', $paymentData);
                    echo "VALID";
                    break;

                default:
                    $this->logData('Unknown payment status: ' . $status, $paymentData);
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

    private function validatePayFastData($paymentData)
    {
        if (!isset($paymentData['signature'])) {
            return false;
        }

        $receivedSignature = $paymentData['signature'];
        $generatedSignature = $this->localSignatureGenerator($paymentData, null);

        $this->logData('Signature Validation', [
            'generated' => $generatedSignature,
            'received' => $receivedSignature
        ]);

        return ($receivedSignature === $generatedSignature);
    }

    private function localSignatureGenerator($data, $passphrase = null)
    {
        unset($data['signature']);

        $pfOutput = '';
        foreach ($data as $key => $val) {
            $val = (string) $val;
            $pfOutput .= $key . '=' . urlencode(trim($val)) . '&';
        }

        $getString = rtrim($pfOutput, '&');

        if (!empty($passphrase)) {
            $getString .= '&passphrase=' . urlencode($passphrase);
        }

        $this->logData('ITN Signature String', [
            'string' => $getString
        ]);

        return md5($getString);
    }

private function processSuccessfulPayment($data)
{
    try {
        $m_payment_id = $data['m_payment_id'] ?? '';
        $pf_payment_id = $data['pf_payment_id'] ?? '';
        $amount_gross = $data['amount_gross'] ?? '0.00';
        $amount_fee = $data['amount_fee'] ?? '0.00';
        $amount_net = $data['amount_net'] ?? '0.00';
        
        // Get custom data from PayFast
        $user_id = $data['custom_str1'] ?? '';
        $package_id = $data['custom_str2'] ?? '';
        $package_name_from_pf = $data['custom_str3'] ?? 'Business Package';
        
        // Get customer info from PayFast
        $name_first = $data['name_first'] ?? '';
        $name_last = $data['name_last'] ?? '';
        $customer_name = trim($name_first . ' ' . $name_last);
        $email_address = $data['email_address'] ?? '';
        $cell_number = $data['cell_number'] ?? '';

        if (empty($m_payment_id)) {
            throw new Exception("Missing m_payment_id");
        }

        $this->pdo->beginTransaction();

        // Check if transaction already exists in business_package_transactions
        $checkStmt = $this->pdo->prepare("SELECT * FROM business_package_transactions WHERE transaction_id = ? OR m_payment_id = ?");
        $checkStmt->execute([$m_payment_id, $m_payment_id]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            // Get user details from database
            $user = null;
            if (!empty($user_id)) {
                $userStmt = $this->pdo->prepare("SELECT name, email, phone, business_name FROM users WHERE user_id = ?");
                $userStmt->execute([$user_id]);
                $user = $userStmt->fetch(PDO::FETCH_ASSOC);
            }
            
            // Use data from database if available, otherwise use PayFast data
            $final_customer_name = ($user['business_name'] ?? $user['name'] ?? '') ?: $customer_name;
            $final_email = ($user['email'] ?? '') ?: $email_address;
            $final_phone = ($user['phone'] ?? '') ?: $cell_number;
            
            // Get package name from database if package_id exists
            $package_name = $package_name_from_pf;
            $event_limit = 0;
            $max_guests = 0;
            
            if (!empty($package_id)) {
                $pkgStmt = $this->pdo->prepare("SELECT name, package_type, max_events, max_guests FROM business_packages WHERE package_id = ?");
                $pkgStmt->execute([$package_id]);
                $package = $pkgStmt->fetch(PDO::FETCH_ASSOC);
                if ($package) {
                    $package_name = $package['name'] ?? $package['package_type'] ?? $package_name;
                    $event_limit = $package['max_events'] ?? 0;
                    $max_guests = $package['max_guests'] ?? 0;
                }
            }
            
            // Insert new transaction with PayFast details
            $stmt = $this->pdo->prepare("
                INSERT INTO business_package_transactions 
                (user_id, customer_name, customer_email, customer_phone, business_package_id, 
                 package_name, amount, amount_fee, amount_net, payment_method, 
                 transaction_id, pf_payment_id, m_payment_id, payment_provider, 
                 status, created_at, payment_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'success', NOW(), NOW())
            ");
            
            $result = $stmt->execute([
                $user_id,
                $final_customer_name,
                $final_email,
                $final_phone,
                $package_id,
                $package_name,
                $amount_gross,
                $amount_fee,
                $amount_net,
                'payfast',
                $m_payment_id,      // transaction_id
                $pf_payment_id,
                $m_payment_id,      // m_payment_id
                'PayFast'
            ]);
            
            $this->logData("✅ Created new business package transaction", [
                'm_payment_id' => $m_payment_id,
                'user_id' => $user_id,
                'package_id' => $package_id,
                'amount' => $amount_gross
            ]);
        } else {
            // Update existing transaction with PayFast details
            $stmt = $this->pdo->prepare("
                UPDATE business_package_transactions 
                SET status = 'success',
                    amount = ?,
                    amount_fee = ?,
                    amount_net = ?,
                    pf_payment_id = ?,
                    m_payment_id = ?,
                    payment_provider = 'PayFast',
                    payment_date = NOW(),
                    updated_at = NOW()
                WHERE transaction_id = ? OR m_payment_id = ?
            ");
            
            $result = $stmt->execute([
                $amount_gross,
                $amount_fee,
                $amount_net,
                $pf_payment_id,
                $m_payment_id,
                $m_payment_id,
                $m_payment_id
            ]);
            
            $this->logData("✅ Updated existing business package transaction", [
                'm_payment_id' => $m_payment_id
            ]);
        }

        // ============ UPDATE USER BUSINESS PACKAGE ============
        // This only happens when PayFast confirms SUCCESSFUL payment
        if (!empty($user_id) && !empty($package_id)) {
            // Get package limits from business_packages table
            $pkgStmt = $this->pdo->prepare("SELECT max_events, max_guests, name, package_type, price FROM business_packages WHERE package_id = ?");
            $pkgStmt->execute([$package_id]);
            $packageDetails = $pkgStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($packageDetails) {
                $event_limit = $packageDetails['max_events'] ?? 0;
                $max_guests = $packageDetails['max_guests'] ?? 0;
                $package_price = $packageDetails['price'] ?? 0;
                $package_name_full = $packageDetails['name'] ?? $packageDetails['package_type'] ?? '';
                
                // Calculate expiry date (e.g., 1 year from now)
                $expiry_date = date('Y-m-d H:i:s', strtotime('+1 year'));
                
                // Check if user already has a business package in user_business_packages
                $checkUserPkg = $this->pdo->prepare("SELECT * FROM user_business_packages WHERE user_id = ?");
                $checkUserPkg->execute([$user_id]);
                $existingUserPkg = $checkUserPkg->fetch(PDO::FETCH_ASSOC);
                
                if (!$existingUserPkg) {
                    // Insert new user business package
                    $insertUserPkg = $this->pdo->prepare("
                        INSERT INTO user_business_packages 
                        (user_id, business_package_id, event_limit, event_used, status, 
                         purchase_date, expiry_date, auto_renew, created_at)
                        VALUES (?, ?, ?, 0, 'active', NOW(), ?, 1, NOW())
                    ");
                    $userPkgSuccess = $insertUserPkg->execute([
                        $user_id,
                        $package_id,
                        $event_limit,
                        $expiry_date
                    ]);
                    $this->logData("✅ Created new user business package", [
                        'user_id' => $user_id,
                        'business_package_id' => $package_id,
                        'event_limit' => $event_limit,
                        'expiry_date' => $expiry_date,
                        'success' => $userPkgSuccess
                    ]);
                } else {
                    // Update existing user business package
                    $updateUserPkg = $this->pdo->prepare("
                        UPDATE user_business_packages 
                        SET business_package_id = ?, 
                            event_limit = ?, 
                            status = 'active',
                            purchase_date = NOW(),
                            expiry_date = ?,
                            auto_renew = 1,
                            updated_at = NOW()
                        WHERE user_id = ?
                    ");
                    $userPkgSuccess = $updateUserPkg->execute([
                        $package_id,
                        $event_limit,
                        $expiry_date,
                        $user_id
                    ]);
                    $this->logData("✅ Updated existing user business package", [
                        'user_id' => $user_id,
                        'business_package_id' => $package_id,
                        'event_limit' => $event_limit,
                        'expiry_date' => $expiry_date,
                        'success' => $userPkgSuccess
                    ]);
                }
                
                if (!$userPkgSuccess) {
                    $this->logData("⚠️ WARNING: user_business_packages was not updated properly", [
                        'user_id' => $user_id,
                        'package_id' => $package_id
                    ]);
                }
            } else {
                $this->logData("⚠️ Package not found in business_packages", [
                    'package_id' => $package_id
                ]);
            }
        }

        $this->pdo->commit();

        $this->logData("✅ BUSINESS PACKAGE PAYMENT COMPLETED ✅", [
            "transaction_id" => $m_payment_id,
            "pf_payment_id" => $pf_payment_id,
            "user_id" => $user_id,
            "package_id" => $package_id,
            "amount" => $amount_gross
        ]);

        // Send confirmation email
        $this->sendPaymentConfirmationEmail($user_id, $package_id, $amount_gross, $m_payment_id, $customer_name, $email_address);

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

    private function updatePaymentStatus($m_payment_id, $status)
    {
        try {
            $updateStmt = $this->pdo->prepare("
                UPDATE business_package_transactions 
                SET status = ?, updated_at = NOW()
                WHERE m_payment_id = ? OR transaction_id = ?
            ");
            $updateStmt->execute([$status, $m_payment_id, $m_payment_id]);
        } catch (Exception $e) {
            $this->logData("Error updating payment status", ["error" => $e->getMessage()]);
        }
    }

private function sendPaymentConfirmationEmail($user_id, $package_id, $amount, $transaction_id, $customer_name, $email_address)
{
    try {
        // Get user email if not provided
        $user_email = $email_address;
        $user_name = $customer_name;
        
        if (empty($user_email) && !empty($user_id)) {
            $userStmt = $this->pdo->prepare("SELECT name, email, business_name FROM users WHERE user_id = ?");
            $userStmt->execute([$user_id]);
            $user = $userStmt->fetch(PDO::FETCH_ASSOC);
            if ($user) {
                $user_name = $user['business_name'] ?? $user['name'] ?? $user_name;
                $user_email = $user['email'] ?? '';
            }
        }
        
        // Get package details
        $package_name = '';
        $max_events = 0;
        $max_guests = 0;
        $expiry_date = '';
        
        if (!empty($package_id)) {
            $pkgStmt = $this->pdo->prepare("SELECT name, package_type, max_events, max_guests FROM business_packages WHERE package_id = ?");
            $pkgStmt->execute([$package_id]);
            $package = $pkgStmt->fetch(PDO::FETCH_ASSOC);
            if ($package) {
                $package_name = $package['name'] ?? $package['package_type'] ?? '';
                $max_events = $package['max_events'] ?? 0;
                $max_guests = $package['max_guests'] ?? 0;
            }
        }
        
        // Get expiry date from user_business_packages
        $expiryStmt = $this->pdo->prepare("SELECT expiry_date FROM user_business_packages WHERE user_id = ?");
        $expiryStmt->execute([$user_id]);
        $userPackage = $expiryStmt->fetch(PDO::FETCH_ASSOC);
        if ($userPackage && $userPackage['expiry_date']) {
            $expiry_date = date('F j, Y', strtotime($userPackage['expiry_date']));
        }

        if (empty($user_email)) {
            $this->logData("❌ Cannot send email - no email address found", ['user_id' => $user_id]);
            return;
        }

        $payment_date = date('Y-m-d H:i:s');
        $formattedDate = date('F j, Y H:i:s', strtotime($payment_date));
        
        $APP_URL = "https://evenditest.evendi.co.za";

        $htmlContent = "
        <html>
        <body style='font-family:Arial;background:#f9f9f9;padding:20px'>
            <div style='max-width:600px;margin:auto;background:white;padding:30px;border-radius:12px;'>
                <div style='text-align:center;margin-bottom:30px'>
                    <h2 style='color:#8b6a35'>Business Package Payment Confirmation</h2>
                </div>
                
                <p>Dear <strong>" . htmlspecialchars($user_name) . "</strong>,</p>
                
                <p>Thank you for purchasing a business package. Your payment has been completed successfully.</p>
                
                <div style='background:#f5f5f5;padding:20px;border-radius:8px;margin:20px 0'>
                    <h3 style='margin-top:0;color:#333'>Payment Details</h3>
                    <table style='width:100%'>
                        <tr>
                            <td><strong>Transaction ID:</strong></td>
                            <td>" . htmlspecialchars($transaction_id) . "</td>
                        </tr>
                        <tr>
                            <td><strong>Amount Paid:</strong></td>
                            <td>R" . number_format($amount, 2) . "</td>
                        </tr>
                        <tr>
                            <td><strong>Package:</strong></td>
                            <td>" . htmlspecialchars($package_name) . "</td>
                        </tr>
                        <tr>
                            <td><strong>Max Events:</strong></td>
                            <td>" . ($max_events > 0 ? $max_events : 'Unlimited') . "</td>
                        </tr>
                        <tr>
                            <td><strong>Max Guests per Event:</strong></td>
                            <td>" . number_format($max_guests) . "</td>
                        </tr>
                        " . (!empty($expiry_date) ? "
                        <tr>
                            <td><strong>Valid Until:</strong></td>
                            <td>{$expiry_date}</td>
                        </tr>
                        " : "") . "
                        <tr>
                            <td><strong>Payment Date:</strong></td>
                            <td>{$formattedDate}</td>
                        </tr>
                    </table>
                </div>
                
                <p>Your business account has been successfully upgraded! 🎉</p>
                
                <div style='text-align:center;margin:30px 0'>
                    <a href='{$APP_URL}/businessdashboard' 
                       style='background:#8b6a35;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold'>
                        Go to Business Dashboard
                    </a>
                </div>
                
                <p style='font-size:12px;color:#888;text-align:center'>
                    &copy; " . date('Y') . " Eventa. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        ";

        $textContent = "Dear {$user_name},\n\n" .
            "Your business package payment was successful.\n\n" .
            "Transaction ID: {$transaction_id}\n" .
            "Amount: R" . number_format($amount, 2) . "\n" .
            "Package: {$package_name}\n" .
            "Max Events: " . ($max_events > 0 ? $max_events : 'Unlimited') . "\n" .
            "Max Guests per Event: " . number_format($max_guests) . "\n" .
            (!empty($expiry_date) ? "Valid Until: {$expiry_date}\n" : "") .
            "Payment Date: {$formattedDate}\n\n" .
            "Visit your business dashboard: {$APP_URL}/businessdashboard\n\n" .
            "— Eventa Team";

        // Send email via Brevo (same as before)
        $payload = [
            "sender" => [
                "email" => "ananiasndou0@gmail.com",
                "name" => "Eventa Support"
            ],
            "to" => [
                [
                    "email" => $user_email,
                    "name" => $user_name
                ]
            ],
            "subject" => "Business Package Payment Confirmation - Eventa",
            "htmlContent" => $htmlContent,
            "textContent" => $textContent
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
            $this->logData("✅ Email sent successfully", [
                "email" => $user_email,
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

    private function logData($title, $data)
    {
        $logFile = __DIR__ . '/payfast_business_int.log';
        $timestamp = date('Y-m-d H:i:s');
        $logEntry = "[$timestamp] $title\n";
        $logEntry .= print_r($data, true) . "\n";
        $logEntry .= str_repeat('-', 80) . "\n\n";

        file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
    }
}

// Initialize and handle
try {
    $db = new Database();
    $pdo = $db->getConnection();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $itnHandler = new BusinessPayFastITN($pdo);
    $itnHandler->handleITN();

} catch (Exception $e) {
    error_log("PayFast ITN Fatal Error: " . $e->getMessage());
    file_put_contents(
        __DIR__ . '/payfast_fatal.log',
        date('Y-m-d H:i:s') . " - Fatal Error: " . $e->getMessage() . "\n",
        FILE_APPEND
    );
    echo "INVALID";
}
?>