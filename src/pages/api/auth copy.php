<?php

header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode(["success" => true, "message" => "API reachable"]);
    exit();
}

// Start PHP session for authentication
session_start();

require_once "../dbConnection.php";

$db = new Database();
$pdo = $db->getConnection();

// Session-based authentication check
function requireAuth()
{
    if (!isset($_SESSION['user_id']) || !isset($_SESSION['user_email'])) {
        echo json_encode(["success" => false, "message" => "Authentication required"]);
        exit;
    }
    return $_SESSION['user_id'];
}

// Admin auth check
function requireAdminAuth($pdo)
{
    $userId = requireAuth();
    $stmt = $pdo->prepare("SELECT role FROM users WHERE user_id = ? AND status = 'active'");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || $user['role'] !== 'admin') {
        echo json_encode(["success" => false, "message" => "Admin access required"]);
        exit;
    }
    return $userId;
}

$fun = $_POST['function'] ?? '';

if ($fun === "login") {
    $recaptchaToken = $_POST['recaptcha_token'] ?? '';
    $recaptchaSecret = "6LdQzUgsAAAAAEKAwBDIoLmTSxMRPSikQKAWwNVN";

    // Verify reCAPTCHA (commented out for now)
    // $recaptchaResult = verifyRecaptcha($recaptchaSecret, $recaptchaToken);
    // if (!$recaptchaResult['success']) {
    //     echo json_encode(["success" => false, "message" => "reCAPTCHA verification failed. Please complete the 'I'm not a robot' checkbox."]);
    //     exit;
    // }

    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';

    try {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = :email LIMIT 1");
        $stmt->execute([":email" => $email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            if ($user['status'] !== 'active') {
                echo json_encode(["success" => false, "message" => "Account is blocked."]);
                exit;
            }

            if ($user['verified'] != 1) {
                echo json_encode([
                    "success" => false,
                    "message" => "Please verify your email address before logging in.",
                    "needsVerification" => true,
                ]);
                exit;
            }

            if (password_verify($password, $user['password'])) {
                $update = $pdo->prepare("UPDATE users SET session = 1 WHERE user_id = :id");
                $update->execute([":id" => $user['user_id']]);

                // Set PHP session variables for authentication
                $_SESSION['user_id'] = $user['user_id'];
                $_SESSION['user_email'] = $user['email'];
                $_SESSION['user_role'] = $user['role'];
                $_SESSION['user_name'] = $user['name'];

                echo json_encode([
                    "success" => true,
                    "message" => "Login successful",
                    "user" => [
                        "user_id" => $user['user_id'],
                        "name" => $user['name'],
                        "lastname" => $user['lastname'],
                        "email" => $user['email'],
                        "role" => $user['role'],
                        "account_type" => $user['account_type'] ?? 'personal',
                        "business_name" => $user['business_name'] ?? '',
                        "business_type" => $user['business_type'] ?? '',
                        "phone" => $user['phone'] ?? '',
                        "address" => $user['address'] ?? '',
                        "verified" => $user['verified'] ?? 0,
                        "status" => $user['status'],
                        "created_at" => $user['created_at']
                    ],
                ]);

            } else {
                echo json_encode(["success" => false, "message" => "Invalid credentials"]);
            }
        } else {
            echo json_encode(["success" => false, "message" => "Invalid credentials"]);
        }
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
}

elseif ($fun === "logout") {
    $id = $_POST['user_id'] ?? '';

    try {
        $stmt = $pdo->prepare("UPDATE users SET session = 0 WHERE user_id = :id");
        $stmt->execute([':id' => $id]);

        // Clear PHP session
        session_unset();
        session_destroy();

        echo json_encode(["success" => true, "message" => "Logged out successfully"]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => $e->getMessage()]);
    }
}

elseif ($fun === "register") {
    $accountType = $_POST['account_type'] ?? 'personal';
    $name = $_POST['name'] ?? '';
    $lastname = $_POST['lastname'] ?? '';
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';
    $userID = generateUserID($pdo);

    // Business-specific fields
    $businessName = $_POST['business_name'] ?? '';
    $businessType = $_POST['business_type'] ?? '';
    $phone = $_POST['phone'] ?? '';
    $address = $_POST['address'] ?? '';

    // Validate required fields based on account type
    if ($accountType === 'personal') {
        if (!$name || !$lastname || !$email || !$password) {
            echo json_encode(["success" => false, "message" => "Missing required fields for personal account"]);
            exit;
        }
    } else if ($accountType === 'business') {
        if (!$businessName || !$businessType || !$email || !$password || !$phone || !$address) {
            echo json_encode(["success" => false, "message" => "Missing required fields for business account"]);
            exit;
        }
        $name = $businessName;
        $lastname = '';
    } else {
        echo json_encode(["success" => false, "message" => "Invalid account type"]);
        exit;
    }

    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(["success" => false, "message" => "Invalid email format"]);
        exit;
    }

    // Validate password strength
    if (strlen($password) < 6) {
        echo json_encode(["success" => false, "message" => "Password must be at least 6 characters long"]);
        exit;
    }

    try {
        // Check if email already exists
        $stmt = $pdo->prepare("SELECT user_id FROM users WHERE email = :email");
        $stmt->execute([":email" => $email]);
        if ($stmt->fetch()) {
            echo json_encode(["success" => false, "message" => "Email already registered"]);
            exit;
        }

        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        $userRole = ($accountType === 'business') ? 'business_owner' : 'event_planner';

        $stmt = $pdo->prepare("INSERT INTO users (user_id, name, lastname, email, password, role, account_type, business_name, business_type, phone, address, status, verified, created_at)
                           VALUES (:user_id, :name, :lastname, :email, :password, :role, :account_type, :business_name, :business_type, :phone, :address, 'active', 1, NOW())");

        $stmt->execute([
            ":user_id" => $userID,
            ":name" => $name,
            ":lastname" => $lastname,
            ":email" => $email,
            ":password" => $hashedPassword,
            ":role" => $userRole,
            ":account_type" => $accountType,
            ":business_name" => $businessName,
            ":business_type" => $businessType,
            ":phone" => $phone,
            ":address" => $address,
        ]);

        // Log activity
        $description = ($accountType === 'business')
            ? "New business account registered: {$businessName} ({$email}) - {$businessType}"
            : "New personal account registered: {$name} {$lastname} ({$email})";

        $logStmt = $pdo->prepare("INSERT INTO system_activity (user_id, action, description) VALUES (:user_id, :action, :description)");
        $logStmt->execute([
            ':user_id' => $userID,
            ':action' => 'User Registered',
            ':description' => $description,
        ]);

        echo json_encode([
            "success" => true,
            "message" => ucfirst($accountType) . " account registration successful",
            "user" => [
                "user_id" => $userID,
                "name" => $name,
                "lastname" => $lastname,
                "email" => $email,
                "role" => $userRole,
                "account_type" => $accountType,
                "business_name" => $businessName,
                "business_type" => $businessType,
                "phone" => $phone,
                "address" => $address,
            ],
        ]);
    } catch (PDOException $e) {
        error_log("Registration error: " . $e->getMessage());
        echo json_encode(["success" => false, "message" => "Registration failed. Please try again later."]);
    }
}

else {
    echo json_encode(["error" => "Invalid function"]);
}

// Helper function
function generateUserID($pdo)
{
    do {
        $random = substr(str_shuffle("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"), 0, 6);
        $time = time();
        $id = "USER-" . $random . "-" . $time;

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE user_id = ?");
        $stmt->execute([$id]);
        $exists = $stmt->fetchColumn();
    } while ($exists > 0);

    return $id;
}

?>