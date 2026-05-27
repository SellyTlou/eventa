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

function verifyAdminAccess($pdo, $userId)
{
    $stmt = $pdo->prepare("SELECT role FROM users WHERE user_id = ? AND status = 'active'");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    return $user && $user['role'] === 'admin';
}

$fun = $_POST['function'] ?? '';

if ($fun === "updatePackage") {
    $adminUserId = $_POST['admin_user_id'] ?? '';
    $packageId = $_POST['package_id'] ?? '';
    $packageType = $_POST['package_type'] ?? '';
    $maxGuests = $_POST['max_guests'] ?? '';
    $maxEvents = $_POST['max_events'] ?? '';
    $price = $_POST['price'] ?? '';
    $features = $_POST['features'] ?? '';

    // Log incoming request
    error_log("[updatePackage] Incoming request at " . date('Y-m-d H:i:s'));
    error_log("[updatePackage] Admin User ID: " . $adminUserId);
    error_log("[updatePackage] Package ID: " . $packageId);
    error_log("[updatePackage] Package Type: " . $packageType);
    error_log("[updatePackage] Max Guests: " . $maxGuests);
    error_log("[updatePackage] Max Events: " . $maxEvents);
    error_log("[updatePackage] Price: " . $price);
    error_log("[updatePackage] Features length: " . strlen($features));

    if (!verifyAdminAccess($pdo, $adminUserId)) {
        error_log("[updatePackage] ❌ ADMIN VERIFICATION FAILED for user: " . $adminUserId);
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required",
        ]);
        exit;
    }

    error_log("[updatePackage] ✅ Admin verification passed");

    if (!$packageId || !$packageType || $maxGuests === '' || $maxEvents === '' || $price === '') {
        error_log("[updatePackage] ❌ Missing fields - packageId: " . ($packageId ? 'OK' : 'MISSING') .
            ", packageType: " . ($packageType ? 'OK' : 'MISSING') .
            ", maxGuests: " . ($maxGuests !== '' ? 'OK' : 'MISSING') .
            ", maxEvents: " . ($maxEvents !== '' ? 'OK' : 'MISSING') .
            ", price: " . ($price !== '' ? 'OK' : 'MISSING'));
        echo json_encode(["success" => false, "message" => "Missing required fields"]);
        exit;
    }

    error_log("[updatePackage] ✅ All fields present"); 

    try {
        error_log("[updatePackage] Executing UPDATE query...");
        $stmt = $pdo->prepare("
            UPDATE packagetb
            SET package_type = :package_type, max_guests = :max_guests, max_events = :max_events, price = :price, features = :features
            WHERE package_id = :package_id
        ");

        $stmt->execute([
            ':package_type' => $packageType,
            ':max_guests' => $maxGuests,
            ':max_events' => $maxEvents,
            ':price' => $price,
            ':features' => $features,
            ':package_id' => $packageId,
        ]);

        $rowCount = $stmt->rowCount();
        error_log("[updatePackage] ✅ UPDATE executed - Rows affected: " . $rowCount);

        if ($rowCount > 0) {
            error_log("[updatePackage] ✅ SUCCESSFUL - Package " . $packageId . " updated");
            echo json_encode([
                "success" => true,
                "message" => "Package updated successfully",
                "rows_updated" => $rowCount
            ]);
        } else {
            error_log("[updatePackage] ⚠️ WARNING - No rows updated. Package ID may not exist: " . $packageId);
            echo json_encode([
                "success" => false,
                "message" => "Package not found or no changes made"
            ]);
        }

    } catch (PDOException $e) {
        error_log("[updatePackage] ❌ DATABASE ERROR: " . $e->getMessage());
        error_log("[updatePackage] SQL State: " . $e->getCode());
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
            "error_code" => $e->getCode()
        ]);
    }
    exit;
}

if ($fun === "getAllPackages") {
    try {
        $stmt = $pdo->query("SELECT * FROM packagetb ORDER BY package_type ASC");
        $packages = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(["success" => true, "packages" => $packages]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
    exit;
}

if ($fun === "getPackageById") {
    $packageId = $_POST['package_id'] ?? '';
    if (!$packageId) {
        echo json_encode(["success" => false, "message" => "Package ID required"]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT * FROM packagetb WHERE package_id = :package_id LIMIT 1");
        $stmt->execute([':package_id' => $packageId]);
        $package = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode(["success" => true, "package" => $package]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
    exit;
}

if ($fun === "getUserPackage") {
    $userId = $_POST['user_id'] ?? '';
    if (!$userId) {
        echo json_encode(["success" => false, "message" => "User ID required"]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT * FROM user_packages WHERE user_id = :user_id ORDER BY created_at DESC LIMIT 1");
        $stmt->execute([':user_id' => $userId]);
        $package = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode(["success" => true, "userPackage" => $package]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
    exit;
}

if ($fun === "getBusinessPackages") {
    try {
        $stmt = $pdo->query("SELECT * FROM business_packages ORDER BY price ASC");
        $packages = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(["success" => true, "packages" => $packages]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
    exit;
}

if ($fun === "getUserBusinessPackage") {
    $userId = $_POST['user_id'] ?? '';
    if (!$userId) {
        echo json_encode(["success" => false, "message" => "User ID required"]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT ubp.*, bp.package_type, bp.name, bp.max_guests, bp.max_events, bp.price, bp.features AS package_features
                               FROM user_business_packages ubp
                               LEFT JOIN business_packages bp ON ubp.business_package_id = bp.package_id
                               WHERE ubp.user_id = :user_id AND ubp.status = 'active'
                               ORDER BY ubp.created_at DESC LIMIT 1");
        $stmt->execute([':user_id' => $userId]);
        $package = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode(["success" => true, "userBusinessPackage" => $package]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
    exit;
}

if ($fun === "assignBusinessPackage") {
    $userId = $_POST['user_id'] ?? '';
    $businessPackageId = $_POST['business_package_id'] ?? '';

    if (!$userId || !$businessPackageId) {
        echo json_encode(["success" => false, "message" => "User ID and business package ID are required"]);
        exit;
    }

    try {
        $pdo->beginTransaction();
        $expireStmt = $pdo->prepare("UPDATE user_business_packages SET status = 'expired' WHERE user_id = :user_id AND status = 'active'");
        $expireStmt->execute([':user_id' => $userId]);

        $pkgStmt = $pdo->prepare("SELECT max_events FROM business_packages WHERE package_id = :package_id LIMIT 1");
        $pkgStmt->execute([':package_id' => $businessPackageId]);
        $package = $pkgStmt->fetch(PDO::FETCH_ASSOC);
        $eventLimit = $package ? ($package['max_events'] == 0 ? 999999 : $package['max_events']) : 0;

        $insertStmt = $pdo->prepare("INSERT INTO user_business_packages (user_id, business_package_id, event_limit, status, expiry_date) VALUES (:user_id, :business_package_id, :event_limit, 'active', :expiry_date)");
        $success = $insertStmt->execute([
            ':user_id' => $userId,
            ':business_package_id' => $businessPackageId,
            ':event_limit' => $eventLimit,
            ':expiry_date' => date('Y-m-d H:i:s', strtotime('+1 month'))
        ]);

        if ($success) {
            $pdo->commit();
            echo json_encode(["success" => true, "message" => "Business package assigned successfully"]);
        } else {
            $pdo->rollBack();
            echo json_encode(["success" => false, "message" => "Failed to assign business package"]);
        }
    } catch (PDOException $e) {
        $pdo->rollBack();
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
    exit;
}

else {
    echo json_encode(["error" => "Invalid function"]);
}

?>