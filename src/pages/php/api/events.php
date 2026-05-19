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

$fun = $_POST['function'] ?? '';

if ($fun === "saveEvent") {
    requireAuth();
    $userID = $_POST['userID'] ?? '';
    $userName = $_POST['userName'] ?? '';
    $eventID = $_POST['eventID'] ?? '';
    $eventName = $_POST['eventName'] ?? '';
    $eventStartDate = $_POST['eventStartDate'] ?? '';
    $eventStartTime = $_POST['eventStartTime'] ?? '';
    $eventEndDate = $_POST['eventEndDate'] ?? '';
    $eventEndTime = $_POST['eventEndTime'] ?? '';
    $eventLocation = $_POST['eventLocation'] ?? '';
    $eventType = $_POST['event_type'] ?? '';
    $eventCity = $_POST['eventCity'] ?? '';
    $eventProvince = $_POST['eventProvince'] ?? '';
    $eventUrlImage = $_POST['eventUrlImage'] ?? '';
    $eventDesignData = $_POST['eventDesignData'] ?? '';
    $hasTickets = isset($_POST['hasTickets']) ? intval($_POST['hasTickets']) : 0;
    $eventInfo = $_POST['eventInfo'] ?? '';
    $createdAt = date('Y-m-d H:i:s');

    try {
        ini_set('memory_limit', '512M');
        ini_set('max_execution_time', 300);

        $eventName = mb_convert_encoding($eventName, 'UTF-8', 'UTF-8');
        $userName = mb_convert_encoding($userName, 'UTF-8', 'UTF-8');
        $eventLocation = mb_convert_encoding($eventLocation, 'UTF-8', 'UTF-8');
        $eventType = mb_convert_encoding($eventType, 'UTF-8', 'UTF-8');
        $eventCity = mb_convert_encoding($eventCity, 'UTF-8', 'UTF-8');
        $eventProvince = mb_convert_encoding($eventProvince, 'UTF-8', 'UTF-8');
        $eventDesignData = mb_convert_encoding($eventDesignData, 'UTF-8', 'UTF-8');
        $eventInfo = mb_convert_encoding($eventInfo, 'UTF-8', 'UTF-8');
        $eventDesignData = preg_replace('/[^\x{0000}-\x{FFFF}]/u', '', $eventDesignData);

        $designDataSize = strlen($eventDesignData);
        if ($designDataSize > 10000000) {
            echo json_encode([
                "success" => false,
                "message" => "Event design data is too large (" . round($designDataSize / 1024 / 1024, 2) . "MB). Please reduce the size.",
            ]);
            exit;
        }

        $checkStmt = $pdo->prepare("SELECT event_id FROM events WHERE event_id = :event_id AND user_id = :user_id");
        $checkStmt->execute([
            ':event_id' => $eventID,
            ':user_id' => $userID,
        ]);

        if ($checkStmt->fetch()) {
            // Update existing event
            $stmt = $pdo->prepare("UPDATE events SET
                event_name = :event_name,
                event_start_date = :event_start_date,
                event_start_time = :event_start_time,
                event_end_date = :event_end_date,
                event_end_time = :event_end_time,
                event_location = :event_location,
                event_type = :event_type,
                city = :city,
                province = :province,
                event_image = :event_image,
                design_data = :design_data,
                event_info = :event_info,
                updated_at = :updated_at
                WHERE event_id = :event_id AND user_id = :user_id
            ");

            $eventImageToSave = $eventUrlImage;
            try {
                if (!empty($eventUrlImage) && (strlen($eventUrlImage) > 50000 || preg_match('/^data:image\/(png|jpeg|jpg|gif);base64,/', $eventUrlImage))) {
                    $uploadDir = __DIR__ . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'events';
                    if (!is_dir($uploadDir)) {
                        mkdir($uploadDir, 0755, true);
                    }

                    if (preg_match('/^data:(image\/(png|jpeg|jpg|gif));base64,(.*)$/', $eventUrlImage, $imgMatches)) {
                        $mime = $imgMatches[1];
                        $base64data = $imgMatches[3];
                    } else {
                        $base64data = $eventUrlImage;
                        $mime = 'image/png';
                    }

                    $ext = 'png';
                    if (strpos($mime, 'jpeg') !== false || strpos($mime, 'jpg') !== false)
                        $ext = 'jpg';
                    if (strpos($mime, 'gif') !== false)
                        $ext = 'gif';

                    $filename = $eventID . '_' . time() . '.' . $ext;
                    $filePath = $uploadDir . DIRECTORY_SEPARATOR . $filename;
                    $decoded = base64_decode($base64data);
                    if ($decoded !== false && @file_put_contents($filePath, $decoded) !== false) {
                        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
                        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
                        $scriptDir = dirname($_SERVER['SCRIPT_NAME']);
                        $fileUrl = rtrim($protocol . '://' . $host . $scriptDir, '/') . '/uploads/events/' . $filename;
                        $eventImageToSave = $fileUrl;
                        error_log("saveEvent(update) - saved image to file: " . $filePath . " -> " . $fileUrl);
                    } else {
                        error_log("saveEvent(update) - failed to write image file for event " . $eventID);
                    }
                }
            } catch (Exception $e) {
                error_log('saveEvent(update) - Exception when saving image file: ' . $e->getMessage());
            }

            $stmt->execute([
                ':event_name' => $eventName,
                ':event_start_date' => $eventStartDate,
                ':event_start_time' => $eventStartTime,
                ':event_end_date' => $eventEndDate,
                ':event_end_time' => $eventEndTime,
                ':event_location' => $eventLocation,
                ':event_type' => $eventType,
                ':city' => $eventCity,
                ':province' => $eventProvince,
                ':event_image' => $eventImageToSave,
                ':design_data' => $eventDesignData,
                ':event_info' => $eventInfo,
                ':updated_at' => $createdAt,
                ':event_id' => $eventID,
                ':user_id' => $userID,
            ]);

            echo json_encode(["success" => true, "message" => "Event updated successfully!", "event_id" => $eventID]);

        } else {
            // Insert new event
            $columns = "user_id, user_name, event_id, event_name, event_start_date, event_start_time,
                   event_end_date, event_end_time, event_location, event_type,
                   city, province, event_image, design_data, event_info, created_at, updated_at";

            $values = ":user_id, :user_name, :event_id, :event_name, :event_start_date, :event_start_time,
                  :event_end_date, :event_end_time, :event_location, :event_type,
                  :city, :province, :event_image, :design_data, :event_info, :created_at, :updated_at";

            $stmt = $pdo->prepare("INSERT INTO events ({$columns}) VALUES ({$values})");

            $stmt->execute([
                ':user_id' => $userID,
                ':user_name' => $userName,
                ':event_id' => $eventID,
                ':event_name' => $eventName,
                ':event_start_date' => $eventStartDate,
                ':event_start_time' => $eventStartTime,
                ':event_end_date' => $eventEndDate,
                ':event_end_time' => $eventEndTime,
                ':event_location' => $eventLocation,
                ':event_type' => $eventType,
                ':city' => $eventCity,
                ':province' => $eventProvince,
                ':event_image' => $eventUrlImage,
                ':design_data' => $eventDesignData,
                ':event_info' => $eventInfo,
                ':created_at' => $createdAt,
                ':updated_at' => $createdAt,
            ]);

            echo json_encode(["success" => true, "message" => "Event created successfully!", "event_id" => $eventID]);
        }
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
}

elseif ($fun === "eventAccConfirm") {
    $name = trim($_POST['name']);
    $email = trim($_POST['email']);
    $password = $_POST['password'];
    $userID = generateUserID($pdo);
    $lastname = $_POST['lastname'] ?? '';

    try {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = :email LIMIT 1");
        $stmt->execute([":email" => $email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            echo json_encode([
                "success" => false,
                "userExists" => true,
                "message" => "User already exists. Please log in.",
            ]);
            exit;
        }

        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $pdo->prepare("INSERT INTO users (user_id, name, lastname, email, password)
                VALUES (:user_id, :name, :lastname ,:email, :password)");
        $stmt->execute([
            ":user_id" => $userID,
            ":name" => $name,
            ":lastname" => $lastname,
            ":email" => $email,
            ":password" => $hashedPassword,
        ]);

        $userStmt = $pdo->prepare("SELECT user_id, name, email, role, status FROM users WHERE user_id = :id");
        $userStmt->execute([":id" => $userID]);
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);

        $update = $pdo->prepare("UPDATE users SET session = 1 WHERE user_id = :id");
        $update->execute([":id" => $userID]);

        echo json_encode([
            "success" => true,
            "user" => $user,
            "message" => "Account created successfully!",
        ]);

    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
        ]);
    }
}

elseif ($fun === "updateEvent") {    requireAuth();    $event_id = $_POST['event_id'] ?? '';
    $user_id = $_POST['user_id'] ?? '';
    $event_name = $_POST['event_name'] ?? '';
    $event_location = $_POST['event_location'] ?? '';
    $event_start_date = $_POST['event_start_date'] ?? '';
    $event_start_time = $_POST['event_start_time'] ?? '';
    $event_end_date = $_POST['event_end_date'] ?? '';
    $event_end_time = $_POST['event_end_time'] ?? '';

    if (!$event_id || !$user_id) {
        echo json_encode([
            "success" => false,
            "message" => "Missing required fields"
        ]);
        exit;
    }

    try {
        // First check if this is a ticket event or regular event
        $checkTicketStmt = $pdo->prepare("SELECT event_id FROM ticket_events WHERE event_id = ? AND user_id = ?");
        $checkTicketStmt->execute([$event_id, $user_id]);
        $isTicketEvent = $checkTicketStmt->fetch() ? true : false;

        if ($isTicketEvent) {
            // Update ticket_events table
            $stmt = $pdo->prepare("
                UPDATE ticket_events SET
                    event_name = :event_name,
                    address = :event_location,
                    event_start_date = :event_start_date,
                    event_start_time = :event_start_time,
                    event_end_date = :event_end_date,
                    event_end_time = :event_end_time,
                    updated_at = NOW()
                WHERE event_id = :event_id AND user_id = :user_id
            ");
        } else {
            // Update regular events table
            $stmt = $pdo->prepare("
                UPDATE events SET
                    event_name = :event_name,
                    event_location = :event_location,
                    event_start_date = :event_start_date,
                    event_start_time = :event_start_time,
                    event_end_date = :event_end_date,
                    event_end_time = :event_end_time,
                    updated_at = NOW()
                WHERE event_id = :event_id AND user_id = :user_id
            ");
        }

        $stmt->execute([
            ':event_name' => $event_name,
            ':event_location' => $event_location,
            ':event_start_date' => $event_start_date,
            ':event_start_time' => $event_start_time,
            ':event_end_date' => $event_end_date,
            ':event_end_time' => $event_end_time,
            ':event_id' => $event_id,
            ':user_id' => $user_id
        ]);

        // Log the activity
        $logStmt = $pdo->prepare("INSERT INTO system_activity (user_id, action, description) VALUES (:user_id, :action, :description)");
        $logStmt->execute([
            ':user_id' => $user_id,
            ':action' => 'Event Updated',
            ':description' => "Event '{$event_name}' was updated at " . date('Y-m-d H:i:s'),
        ]);

        echo json_encode([
            "success" => true,
            "message" => "Event updated successfully!"
        ]);

    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
    exit;
} elseif ($fun === "getUserEvents") {
    requireAuth();
    $userID = $_POST['userID'] ?? '';

    if (!$userID) {
        echo json_encode([
            "success" => false,
            "message" => "Missing user ID",
        ]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("
                        SELECT *
                        FROM events
                        WHERE user_id = :user_id
                        AND (is_deleted = 0 OR is_deleted IS NULL)
                        ORDER BY created_at DESC
                    ");
        $stmt->execute([":user_id" => $userID]);
        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // ADD DEBUG LOGGING
        error_log("User Events Debug - User: " . $userID . ", Count: " . count($events));
        if (count($events) > 0) {
            $firstEvent = $events[0];
            error_log("First Event Fields: " . implode(', ', array_keys($firstEvent)));
            error_log("Has event_image: " . (isset($firstEvent['event_image']) ? 'YES' : 'NO'));
            if (isset($firstEvent['event_image'])) {
                error_log("event_image type: " . gettype($firstEvent['event_image']));
                error_log("event_image length: " . strlen($firstEvent['event_image']));
                error_log("event_image first 80 chars: " . substr($firstEvent['event_image'], 0, 80));
            }
        }

        echo json_encode([
            "success" => true,
            "events" => $events,
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
        ]);
    }
    exit;
} elseif ($fun === "getUserEventsCount") {
    $adminUserId = $_POST['admin_user_id'] ?? '';
    $userId = $_POST['user_id'] ?? '';

    if (!verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode(["success" => false, "message" => "Unauthorized"]);
        exit;
    }

    if (empty($userId)) {
        echo json_encode(["success" => false, "message" => "Missing user ID"]);
        exit;
    }

    try {
        // Count user's events
        $stmt = $pdo->prepare("SELECT COUNT(*) as total_events FROM events WHERE user_id = ?");
        $stmt->execute([$userId]);
        $eventData = $stmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "total_events" => (int) $eventData['total_events'],
        ]);

    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
        ]);
    }
    exit;
} elseif ($fun === "getEventById") {
    requireAuth();
    $event_id = $_POST['event_id'] ?? '';

    if (!$event_id) {
        echo json_encode([
            "success" => false,
            "message" => "Missing event ID",
        ]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT * FROM events WHERE event_id = :event_id");
        $stmt->execute([":event_id" => $event_id]);
        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "events" => $events,
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
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

function verifyAdminAccess($pdo, $userId)
{
    if (empty($userId)) {
        return false;
    }

    try {
        $stmt = $pdo->prepare("SELECT role FROM users WHERE user_id = ? AND status = 'active'");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        return ($user && $user['role'] === 'admin');
    } catch (PDOException $e) {
        error_log("Admin verification error: " . $e->getMessage());
        return false;
    }
}

?>