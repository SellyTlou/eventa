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

class PayFastITN {
    private $pdo;
    private $BREVO_API_KEY = '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';
    
    // PayFast configuration
    private $PAYFAST_MERCHANT_ID = '33426571';
    private $PAYFAST_MERCHANT_KEY = 'lkqoiy0ftb9yc';
    private $PAYFAST_PASSPHRASE = '';
    private $PAYFAST_SANDBOX = true;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    public function handleITN() {
        try {
            // Log incoming data
            $this->logData('ITN Received', $_POST);
            
            // Get raw POST data
            $paymentData = $_POST;
            
            // Validate that we have data
            if (empty($paymentData)) {
                throw new Exception('No POST data received');
            }
            
            // Validate the ITN with PayFast
            if (!$this->validatePayFastData($paymentData)) {
                throw new Exception('PayFast validation failed');
            }
            
            // Process based on payment status
            if ($paymentData['payment_status'] === 'COMPLETE') {
                $this->processSuccessfulPayment($paymentData);
            } else {
                $this->logData('Payment not complete', [
                    'status' => $paymentData['payment_status'],
                    'data' => $paymentData
                ]);
            }
            
            // Always respond with 200 OK
            http_response_code(200);
            echo "OK";
            
        } catch (Exception $e) {
            $this->logData('ITN Error', ['error' => $e->getMessage()]);
            http_response_code(200); // Still return 200 to acknowledge receipt
            echo "OK";
        }
    }
    
    private function validatePayFastData($data) {
        $validationUrl = $this->PAYFAST_SANDBOX 
            ? 'https://sandbox.payfast.co.za/eng/query/validate'
            : 'https://www.payfast.co.za/eng/query/validate';
        
        $queryString = http_build_query($data);
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $validationUrl,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $queryString,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => false,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_TIMEOUT => 30
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        $this->logData('Validation Response', [
            'code' => $httpCode,
            'response' => $response
        ]);
        
        return ($httpCode == 200 && trim($response) == 'VALID');
    }
    
    private function processSuccessfulPayment($data) {
        try {
            // Extract data from PayFast response
            $user_id = $data['custom_str1'] ?? '';
            $package_id = $data['custom_str2'] ?? '';
            $package_name = $data['custom_str3'] ?? '';
            $amount = $data['amount_gross'] ?? 0;
            $pf_payment_id = $data['pf_payment_id'] ?? '';
            $m_payment_id = $data['m_payment_id'] ?? '';
            $email = $data['email_address'] ?? '';
            $name_first = $data['name_first'] ?? '';
            $name_last = $data['name_last'] ?? '';
            
            if (empty($user_id) || empty($package_id)) {
                $this->logData('Missing required fields', $data);
                return;
            }
            
            // Begin transaction
            $this->pdo->beginTransaction();
            
            // Check if payment was already processed (prevent duplicates)
            $checkStmt = $this->pdo->prepare("SELECT id FROM payment_history WHERE pf_payment_id = ?");
            $checkStmt->execute([$pf_payment_id]);
            
            if ($checkStmt->rowCount() > 0) {
                $this->logData('Duplicate payment', ['pf_payment_id' => $pf_payment_id]);
                $this->pdo->rollBack();
                return;
            }
            
            // Get user details
            $userStmt = $this->pdo->prepare("SELECT name, lastname, email FROM users WHERE user_id = ?");
            $userStmt->execute([$user_id]);
            $user = $userStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user) {
                throw new Exception("User not found: $user_id");
            }
            
            $user_full_name = $user['name'] . ' ' . ($user['lastname'] ?? '');
            $user_email = $user['email'];
            
            // Get package details
            $pkgStmt = $this->pdo->prepare("
                SELECT package_type, max_events, max_guests, price 
                FROM packagetb 
                WHERE package_id = ?
            ");
            $pkgStmt->execute([$package_id]);
            $package = $pkgStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$package) {
                throw new Exception("Package not found: $package_id");
            }
            
            $package_type = $package['package_type'];
            $max_events = $package['max_events'];
            
            // Generate payment ID for our system
            $payment_id = $this->generateTransactionId();
            
            // Insert payment record as completed
            $insertPayment = $this->pdo->prepare("
                INSERT INTO payment_history (
                    payment_id, user_id, user_name,
                    package_id, package_name,
                    amount, payment_status, payment_method, payment_date,
                    transaction_id, pf_payment_id
                ) VALUES (?, ?, ?, ?, ?, ?, 'completed', 'payfast', NOW(), ?, ?)
            ");
            
            $insertPayment->execute([
                $payment_id,
                $user_id,
                $user_full_name,
                $package_id,
                $package_type,
                $amount,
                $m_payment_id,
                $pf_payment_id
            ]);
            
            // Update or create user_packages
            $checkPkg = $this->pdo->prepare("SELECT COUNT(*) FROM user_packages WHERE user_id = ?");
            $checkPkg->execute([$user_id]);
            $exists = (int) $checkPkg->fetchColumn();
            
            if ($exists === 0) {
                $user_package_id = "PCK-" . strtoupper(substr(md5(uniqid()), 0, 6)) . "-" . time();
                $insertPkg = $this->pdo->prepare("
                    INSERT INTO user_packages (
                        user_package_id, user_id, package_id,
                        event_limit, event_used, created_at
                    ) VALUES (?, ?, ?, ?, 0, NOW())
                ");
                $insertPkg->execute([$user_package_id, $user_id, $package_id, $max_events]);
            } else {
                $updatePkg = $this->pdo->prepare("
                    UPDATE user_packages
                    SET package_id = ?, event_limit = ?, updated_at = NOW()
                    WHERE user_id = ?
                ");
                $updatePkg->execute([$package_id, $max_events, $user_id]);
            }
            
            // Update all user's events with this package
            $updateEvents = $this->pdo->prepare("
                UPDATE events
                SET package_id = ?, updated_at = NOW()
                WHERE user_id = ?
            ");
            $updateEvents->execute([$package_id, $user_id]);
            
            // Log activity
            $logStmt = $this->pdo->prepare("
                INSERT INTO system_activity (user_id, action, description, created_at) 
                VALUES (?, 'PayFast Payment', ?, NOW())
            ");
            $logStmt->execute([$user_id, "Payment completed via PayFast: R$amount"]);
            
            $this->pdo->commit();
            
            // Send email receipt using your Brevo configuration
            $this->sendPaymentReceiptEmail(
                $user_email,
                $user_full_name,
                $pf_payment_id,
                $amount,
                $package_type
            );
            
            $this->logData('Payment processed successfully', [
                'payment_id' => $payment_id,
                'user_id' => $user_id,
                'amount' => $amount
            ]);
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            $this->logData('Payment processing error', ['error' => $e->getMessage()]);
            throw $e;
        }
    }
    
    private function sendPaymentReceiptEmail($email, $name, $transactionId, $amount, $packageName) {
        try {
            // Using your exact Brevo configuration
            $payload = [
                "sender" => [
                    "email" => "ananiasndou0@gmail.com",
                    "name" => "Eventa Support"
                ],
                "to" => [
                    [
                        "email" => $email,
                        "name" => $name
                    ]
                ],
                "subject" => "Payment Confirmation - Eventa",
                "htmlContent" => $this->getPaymentEmailHTML($name, $transactionId, $amount, $packageName),
                "textContent" => $this->getPaymentEmailText($name, $transactionId, $amount, $packageName)
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
            
            $this->logData('Email sending result', [
                'status' => $status,
                'response' => $response,
                'email' => $email
            ]);
            
        } catch (Exception $e) {
            $this->logData('Email sending failed', ['error' => $e->getMessage()]);
        }
    }
    
    private function getPaymentEmailHTML($name, $transactionId, $amount, $packageName) {
        $date = date('F j, Y H:i:s');
        
        return "
            <html>
            <body style='font-family:Arial;background:#f9f9f9;padding:20px'>
                <div style='max-width:600px;margin:auto;background:white;padding:30px;border-radius:12px;'>
                    <div style='text-align:center;margin-bottom:30px'>
                        <h2 style='color:#8b6a35'>Payment Confirmation</h2>
                    </div>
                    
                    <p>Dear <strong>{$name}</strong>,</p>
                    
                    <p>Thank you for your payment. Your transaction has been completed successfully.</p>
                    
                    <div style='background:#f5f5f5;padding:20px;border-radius:8px;margin:20px 0'>
                        <h3 style='margin-top:0;color:#333'>Payment Details</h3>
                        <table style='width:100%'>
                            <tr>
                                <td style='padding:8px 0'><strong>Transaction ID:</strong></td>
                                <td style='padding:8px 0'>{$transactionId}</td>
                            </tr>
                            <tr>
                                <td style='padding:8px 0'><strong>Amount:</strong></td>
                                <td style='padding:8px 0'>R{$amount}</td>
                            </tr>
                            <tr>
                                <td style='padding:8px 0'><strong>Package:</strong></td>
                                <td style='padding:8px 0'>{$packageName}</td>
                            </tr>
                            <tr>
                                <td style='padding:8px 0'><strong>Date:</strong></td>
                                <td style='padding:8px 0'>{$date}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p>Your package has been successfully upgraded. You can now enjoy all the features of your new package.</p>
                    
                    <div style='text-align:center;margin:30px 0'>
                        <a href='https://evenditest.evendi.co.za/eventsDashboard' 
                           style='background:#8b6a35;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold'>
                            Go to Dashboard
                        </a>
                    </div>
                    
                    <p style='font-size:12px;color:#888;margin-top:30px;text-align:center'>
                        If you have any questions, please contact our support team.<br>
                        &copy; " . date('Y') . " Eventa. All rights reserved.
                    </p>
                </div>
            </body>
            </html>
        ";
    }
    
    private function getPaymentEmailText($name, $transactionId, $amount, $packageName) {
        return "Dear $name,\n\n" .
               "Thank you for your payment. Your transaction has been completed successfully.\n\n" .
               "Payment Details:\n" .
               "Transaction ID: $transactionId\n" .
               "Amount: R$amount\n" .
               "Package: $packageName\n" .
               "Date: " . date('F j, Y H:i:s') . "\n\n" .
               "Your package has been successfully upgraded. You can now enjoy all the features of your new package.\n\n" .
               "Visit your dashboard: https://evenditest.evendi.co.za/eventsDashboard\n\n" .
               "If you have any questions, please contact our support team.\n\n" .
               "— Eventa Team";
    }
    
    private function generateTransactionId() {
        $id = 'PAY-' . strtoupper(substr(md5(uniqid()), 0, 8)) . '-' . time();
        
        // Check if exists
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM payment_history WHERE payment_id = ?");
        $stmt->execute([$id]);
        if ($stmt->fetchColumn() > 0) {
            return $this->generateTransactionId(); // Recursive if duplicate
        }
        
        return $id;
    }
    
    private function logData($title, $data) {
        $logEntry = date('Y-m-d H:i:s') . " - $title:\n";
        $logEntry .= print_r($data, true);
        $logEntry .= "----------------------------------------\n";
        file_put_contents('payfast_itn.log', $logEntry, FILE_APPEND);
    }
}

// Initialize and handle the ITN
try {
    $db = new Database();
    $pdo = $db->getConnection();
    
    $itnHandler = new PayFastITN($pdo);
    $itnHandler->handleITN();
    
} catch (Exception $e) {
    error_log("ITN Initialization Error: " . $e->getMessage());
    http_response_code(200);
    echo "OK";
}
?>