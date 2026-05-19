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

if ($fun === "updateAdminProfile") {
    requireAdminAuth($pdo);
    $adminUserId = $_POST['admin_user_id'] ?? '';
    $name = $_POST['name'] ?? '';
    $lastname = $_POST['lastname'] ?? '';
    $email = $_POST['email'] ?? '';

    try {
        $stmt = $pdo->prepare("UPDATE users SET name = ?, lastname = ?, email = ? WHERE user_id = ? AND role = 'admin'");
        $stmt->execute([$name, $lastname, $email, $adminUserId]);

        echo json_encode([
            "success" => true,
            "message" => "Admin profile updated successfully",
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
        ]);
    }
}

elseif ($fun === "getAdminProfile") {
    requireAdminAuth($pdo);
    $adminUserId = $_POST['admin_user_id'] ?? '';

    try {
        $stmt = $pdo->prepare("
            SELECT user_id, name, lastname, email, role, created_at
            FROM users
            WHERE user_id = ? AND role = 'admin'
        ");
        $stmt->execute([$adminUserId]);
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($admin) {
            echo json_encode([
                "success" => true,
                "admin" => $admin,
            ]);
        } else {
            echo json_encode([
                "success" => false,
                "message" => "Admin not found",
            ]);
        }
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
        ]);
    }
}

elseif ($fun === "changeAdminPassword") {
    requireAdminAuth($pdo);
    $adminUserId = $_POST['admin_user_id'] ?? '';
    $currentPassword = $_POST['current_password'] ?? '';
    $newPassword = $_POST['new_password'] ?? '';

    if (empty($currentPassword) || empty($newPassword)) {
        echo json_encode(["success" => false, "message" => "Current and new password are required"]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT password FROM users WHERE user_id = ?");
        $stmt->execute([$adminUserId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            echo json_encode(["success" => false, "message" => "User not found"]);
            exit;
        }

        if (!password_verify($currentPassword, $user['password'])) {
            echo json_encode(["success" => false, "message" => "Current password is incorrect"]);
            exit;
        }

        $hashedNewPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        $updateStmt = $pdo->prepare("UPDATE users SET password = ? WHERE user_id = ?");
        $updateStmt->execute([$hashedNewPassword, $adminUserId]);

        echo json_encode(["success" => true, "message" => "Password changed successfully"]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
}

elseif ($fun === "adminDeleteEvent") {
    requireAdminAuth($pdo);
    $adminUserId = $_POST['admin_user_id'] ?? '';
    $event_id = $_POST['event_id'] ?? '';
    $reason = $_POST['reason'] ?? '';
    $custom_reason = $_POST['custom_reason'] ?? '';
    $block_user = $_POST['block_user'] ?? false;
    $violation_severity = $_POST['violation_severity'] ?? 'medium';

    if (empty($event_id) || empty($reason)) {
        echo json_encode(["success" => false, "message" => "Missing required fields"]);
        exit;
    }

    try {
        $pdo->beginTransaction();

        // Get event owner details
        $eventStmt = $pdo->prepare("
            SELECT
                e.user_id,
                e.user_name,
                u.email as user_email,
                e.event_name
            FROM events e
            LEFT JOIN users u ON e.user_id = u.user_id
            WHERE e.event_id = ?
        ");
        $eventStmt->execute([$event_id]);
        $eventData = $eventStmt->fetch(PDO::FETCH_ASSOC);

        if (!$eventData) {
            echo json_encode(["success" => false, "message" => "Event not found"]);
            exit;
        }

        // Delete the event
        $deleteStmt = $pdo->prepare("DELETE FROM events WHERE event_id = ?");
        $deleteStmt->execute([$event_id]);

        // Block user if requested
        if ($block_user) {
            $blockStmt = $pdo->prepare("UPDATE users SET status = 'blocked' WHERE user_id = ?");
            $blockStmt->execute([$eventData['user_id']]);
        }

        // Log the admin action
        $logStmt = $pdo->prepare("INSERT INTO admin_actions (admin_user_id, action_type, target_type, target_id, reason, custom_reason, violation_severity, created_at) VALUES (?, 'delete_event', 'event', ?, ?, ?, ?, NOW())");
        $logStmt->execute([$adminUserId, $event_id, $reason, $custom_reason, $violation_severity]);

        $pdo->commit();

        echo json_encode([
            "success" => true,
            "message" => "Event deleted successfully" . ($block_user ? " and user blocked" : ""),
        ]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
}

elseif ($fun === "createAdmin") {
    requireAdminAuth($pdo);
    $requestingUserId = $_POST['requesting_user_id'] ?? '';
    $name = $_POST['name'] ?? '';
    $lastname = $_POST['lastname'] ?? '';
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';

    if (empty($name) || empty($lastname) || empty($email) || empty($password)) {
        echo json_encode(["success" => false, "message" => "All fields are required"]);
        exit;
    }

    try {
        // Check if email already exists
        $checkStmt = $pdo->prepare("SELECT user_id FROM users WHERE email = ?");
        $checkStmt->execute([$email]);

        if ($checkStmt->fetch()) {
            echo json_encode(["success" => false, "message" => "Email already exists"]);
            exit;
        }

        $userId = generateUserID($pdo);
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $pdo->prepare("INSERT INTO users (user_id, name, lastname, email, password, role, status, verified) VALUES (?, ?, ?, ?, ?, 'admin', 'active', 1)");
        $stmt->execute([$userId, $name, $lastname, $email, $hashedPassword]);

        echo json_encode([
            "success" => true,
            "message" => "Admin user created successfully",
            "user_id" => $userId,
        ]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
}
elseif ($fun === "geteventcount") {

    try {
        $stmt = $pdo->query("SELECT COUNT(*) AS total FROM events");
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