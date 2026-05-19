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

// Start PHP session for authentication
session_start();

require_once "../dbConnection.php";

$db = new Database();
$pdo = $db->getConnection();

$fun = $_POST['function'] ?? $_POST['fun'] ?? '';

function requireAuth()
{
    if (!isset($_SESSION['user_id']) || !isset($_SESSION['user_email'])) {
        echo json_encode(["success" => false, "message" => "Authentication required"]);
        exit;
    }
    return $_SESSION['user_id'];
}

function getCurrentUserProfile($pdo, $userId)
{
    $stmt = $pdo->prepare("SELECT user_id, name, email, role, status, created_at FROM users WHERE user_id = ? LIMIT 1");
    $stmt->execute([$userId]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

if ($fun === "updateUserBusinessPackage") {
    $user_id = $_POST['user_id'] ?? '';
    $business_package_id = $_POST['business_package_id'] ?? '';
    
    if (empty($user_id) || empty($business_package_id)) {
        echo json_encode(["success" => false, "message" => "User ID and Package ID required"]);
        exit;
    }
    
    try {
        error_log("updateUserBusinessPackage called: user_id={$user_id}, business_package_id={$business_package_id}");
        $pdo->beginTransaction();
        
        // First, expire any existing active package
        $stmt = $pdo->prepare("UPDATE user_business_packages SET status = 'expired' 
                               WHERE user_id = :user_id AND status = 'active'");
        $stmt->execute([':user_id' => $user_id]);
        
        // Get package details to set event_limit
        $stmt = $pdo->prepare("SELECT max_events FROM business_packages WHERE package_id = :package_id");
        $stmt->execute([':package_id' => $business_package_id]);
        $package = $stmt->fetch(PDO::FETCH_ASSOC);
        error_log("updateUserBusinessPackage package details: " . json_encode($package));
        
        // Insert new package (custom plan might have unlimited events)
        $event_limit = ($package && $package['max_events'] == 0) ? 999999 : ($package['max_events'] ?? 0);
        $expiry_date = date('Y-m-d H:i:s', strtotime('+1 month'));
        
        $stmt = $pdo->prepare("INSERT INTO user_business_packages 
                               (user_id, business_package_id, event_limit, expiry_date, status) 
                               VALUES (:user_id, :business_package_id, :event_limit, :expiry_date, 'active')");
        
        $success = $stmt->execute([
            ':user_id' => $user_id,
            ':business_package_id' => $business_package_id,
            ':event_limit' => $event_limit,
            ':expiry_date' => $expiry_date
        ]);
        
        if ($success) {
            error_log("updateUserBusinessPackage success for user_id={$user_id}, business_package_id={$business_package_id}");
            $pdo->commit();
            echo json_encode(["success" => true, "message" => "Business package updated successfully"]);
        } else {
            error_log("updateUserBusinessPackage failed to insert new row");
            $pdo->rollBack();
            echo json_encode(["success" => false, "message" => "Failed to update business package"]);
        }
    } catch (PDOException $e) {
        $pdo->rollBack();
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
    exit;
} elseif ($fun === "saveSecurityQuestions") {
    // Required fields
    $user_id = $_POST['user_id'] ?? '';
    $question1 = $_POST['question1'] ?? '';
    $answer1 = $_POST['answer1'] ?? '';
    $question2 = $_POST['question2'] ?? '';
    $answer2 = $_POST['answer2'] ?? '';
    $question3 = $_POST['question3'] ?? '';
    $answer3 = $_POST['answer3'] ?? '';

    // Validate input
    if (!$user_id || !$question1 || !$answer1 || !$question2 || !$answer2 || !$question3 || !$answer3) {
        echo json_encode([
            "success" => false,
            "message" => "All fields are required",
        ]);
        exit;
    }
    try {
        // Hash answers (same as passwords)
        $answer1_hash = password_hash($answer1, PASSWORD_DEFAULT);
        $answer2_hash = password_hash($answer2, PASSWORD_DEFAULT);
        $answer3_hash = password_hash($answer3, PASSWORD_DEFAULT);

        // Insert into DB
        $stmt = $pdo->prepare("
            INSERT INTO user_security_questions
            (user_id, question1, answer1_hash, question2, answer2_hash, question3, answer3_hash)
            VALUES
            (:user_id, :q1, :a1, :q2, :a2, :q3, :a3)
        ");

        $stmt->execute([
            ':user_id' => $user_id,
            ':q1' => $question1,
            ':a1' => $answer1_hash,
            ':q2' => $question2,
            ':a2' => $answer2_hash,
            ':q3' => $question3,
            ':a3' => $answer3_hash,
        ]);

        // Log activity
        $logStmt = $pdo->prepare("
            INSERT INTO system_activity (user_id, action, description)
            VALUES (:user_id, :action, :description)
        ");
        $logStmt->execute([
            ':user_id' => $user_id,
            ':action' => 'Security Questions Set',
            ':description' => "User $user_id set up security questions",
        ]);

        echo json_encode([
            "success" => true,
            "message" => "Security questions saved successfully",
        ]);

    } catch (PDOException $e) {
        // Log error (optional: write to file)
        error_log("saveSecurityQuestions Error: " . $e->getMessage());

        // Check for duplicate entry (if user already has questions)
        if ($e->getCode() == 23000) {
            echo json_encode([
                "success" => false,
                "message" => "Security questions already exist for this user",
            ]);
        } else {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
            ]);
        }
    }
    exit;
} elseif ($fun === "getusercount") {

    try {
        $stmt = $pdo->query("SELECT COUNT(*) AS total FROM users");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "count" => intval($result['total'])
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => $e->getMessage()
        ]);
    }

    exit;
}

if ($fun === "getUserProfile") {
    $userId = requireAuth();

    try {
        $profile = getCurrentUserProfile($pdo, $userId);
        echo json_encode(["success" => true, "profile" => $profile]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
    exit;
}

if ($fun === "updateUserProfile") {
    $userId = requireAuth();
    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');

    if (!$name || !$email) {
        echo json_encode(["success" => false, "message" => "Name and email are required"]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("UPDATE users SET name = :name, email = :email, updated_at = NOW() WHERE user_id = :user_id");
        $stmt->execute([
            ':name' => $name,
            ':email' => $email,
            ':user_id' => $userId
        ]);

        echo json_encode(["success" => true, "message" => "Profile updated successfully"]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
    exit;
}

if ($fun === "changePassword") {
    $userId = requireAuth();
    $currentPassword = $_POST['current_password'] ?? '';
    $newPassword = $_POST['new_password'] ?? '';

    if (!$currentPassword || !$newPassword) {
        echo json_encode(["success" => false, "message" => "Current and new passwords are required"]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT password FROM users WHERE user_id = ? LIMIT 1");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || !password_verify($currentPassword, $user['password'])) {
            echo json_encode(["success" => false, "message" => "Current password is incorrect"]);
            exit;
        }

        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        $updateStmt = $pdo->prepare("UPDATE users SET password = :password, updated_at = NOW() WHERE user_id = :user_id");
        $updateStmt->execute([':password' => $hashedPassword, ':user_id' => $userId]);

        echo json_encode(["success" => true, "message" => "Password changed successfully"]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
    exit;
}

else {
    echo json_encode(['error' => 'Invalid function']);
}