<?php

ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_errors.log');

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

require_once "dbConnection.php";

$db  = new Database();
$pdo = $db->getConnection();

// Admin verification function
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

function generateUserID($pdo)
{
    do {
        $random = substr(str_shuffle("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"), 0, 6);
        $time   = time();
        $id     = "USER-" . $random . "-" . $time;

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE user_id = ?");
        $stmt->execute([$id]);
        $exists = $stmt->fetchColumn();
    } while ($exists > 0);

    return $id;
}

function generateUserPackageID($pdo)
{
    do {
        $random = substr(str_shuffle("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"), 0, 6);
        $time   = time();
        $id     = "PCK-" . $random . "-" . $time;

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM user_packages WHERE user_package_id = ?");
        $stmt->execute([$id]);
        $exists = $stmt->fetchColumn();
    } while ($exists > 0);

    return $id;
}

function generateGuestID()
{
    $random = substr(str_shuffle("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@!*&^%$"), 0, 6);
    $time   = time();
    return "GUEST-" . $random . "-" . $time;
}

if (! isset($_POST['function'])) {
    echo json_encode(["error" => "No function specified"]);
    exit;
}

$fun = $_POST['function'];

if ($fun === "register") {
    $name     = $_POST['name'] ?? '';
    $lastname = $_POST['lastname'] ?? '';
    $email    = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';
    $userID   = generateUserID($pdo);

    if (! $name || ! $lastname || ! $email || ! $password) {
        echo json_encode(["success" => false, "message" => "Missing required fields"]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT user_id FROM users WHERE email = :email");
        $stmt->execute([":email" => $email]);
        if ($stmt->fetch()) {
            echo json_encode(["success" => false, "message" => "Email already registered"]);
            exit;
        }

        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $pdo->prepare("INSERT INTO users (user_id, name, lastname, email, password, role)
                               VALUES (:user_id, :name, :lastname, :email, :password, 'event_planner')");
        $stmt->execute([
            ":user_id"  => $userID,
            ":name"     => $name,
            ":lastname" => $lastname,
            ":email"    => $email,
            ":password" => $hashedPassword,
        ]);

        // ✅ LOG THE ACTIVITY - User registered themselves
        $logStmt = $pdo->prepare("INSERT INTO system_activity (user_id, action, description) VALUES (:user_id, :action, :description)");
        $logStmt->execute([
            ':user_id'     => $userID, // The new user's ID
            ':action'      => 'User Registered',
            ':description' => "New user registered: {$name} {$lastname} ({$email})",
        ]);

        echo json_encode(["success" => true, "message" => "Registration successful"]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => $e->getMessage()]);
    }
}

if ($fun === "login") {
    $email    = $_POST['email'] ?? '';
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
                    "success"           => false,
                    "message"           => "Please verify your email address before logging in.",
                    "needsVerification" => true,
                ]);
                exit;
            }

            if (password_verify($password, $user['password'])) {
                $update = $pdo->prepare("UPDATE users SET session = 1 WHERE user_id = :id");
                $update->execute([":id" => $user['user_id']]);

                $logStmt = $pdo->prepare("INSERT INTO system_activity (user_id, action, description) VALUES (:user_id, :action, :description)");
                $logStmt->execute([
                    ':user_id'     => $user['user_id'],
                    ':action'      => 'User Login',
                    ':description' => "User {$user['name']} logged into the system",
                ]);

                echo json_encode([
                    "success" => true,
                    "message" => "Login successful",
                    "user"    => [
                        "user_id" => $user['user_id'],
                        "name"    => $user['name'],
                        "lastname" => $user['lastname'],
                        "role"    => $user['role'],
                        "status"  => $user['status'],
                        "email"   => $user['email'],
                        "session" => true,
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

if ($fun === "logout") {
    $id = $_POST['user_id'] ?? '';

    try {
        $stmt = $pdo->prepare("UPDATE users SET session = 0 WHERE user_id = :id");
        $stmt->execute([':id' => $id]);

        echo json_encode(["success" => true, "message" => "Logged out successfully"]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => $e->getMessage()]);
    }
}

if ($fun === "eventAccConfirm") {
    $name     = trim($_POST['name']);
    $email    = trim($_POST['email']);
    $password = $_POST['password'];
    $userID   = generateUserID();

    try {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = :email LIMIT 1");
        $stmt->execute([":email" => $email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            echo json_encode([
                "success"    => false,
                "userExists" => true,
                "message"    => "User already exists. Please log in.",
            ]);
            exit;
        }

        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        // INSERT with event_planner as default role
        $stmt = $pdo->prepare("INSERT INTO users (user_id, name, email, password, role)
                VALUES (:user_id, :name, :email, :password, 'event_planner')");
        $stmt->execute([
            ":user_id"  => $userID,
            ":name"     => $name,
            ":email"    => $email,
            ":password" => $hashedPassword,
        ]);

        // Auto-login new user
        $userStmt = $pdo->prepare("SELECT user_id, name, email, role, status FROM users WHERE user_id = :id");
        $userStmt->execute([":id" => $userID]);
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);

        $update = $pdo->prepare("UPDATE users SET session = 1 WHERE user_id = :id");
        $update->execute([":id" => $userID]);

        echo json_encode([
            "success" => true,
            "user"    => $user,
            "message" => "Account created successfully!",
        ]);

    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
        ]);
    }
    exit;
}

if ($fun === "saveEvent") {
    $userID          = $_POST['userID'] ?? '';
    $userName        = $_POST['userName'] ?? '';
    $eventID         = $_POST['eventID'] ?? '';
    $eventName       = $_POST['eventName'] ?? '';
    $eventStartDate  = $_POST['eventStartDate'] ?? '';
    $eventStartTime  = $_POST['eventStartTime'] ?? '';
    $eventEndDate    = $_POST['eventEndDate'] ?? '';
    $eventEndTime    = $_POST['eventEndTime'] ?? '';
    $eventLocation   = $_POST['eventLocation'] ?? '';
    $eventUrlImage   = $_POST['eventUrlImage'] ?? '';
    $eventDesignData = $_POST['eventDesignData'] ?? '';

    $createdAt = date('Y-m-d H:i:s');

    try {
                                                                 // Increase packet size for large design data
        $pdo->exec("SET SESSION max_allowed_packet=1073741824"); // 1GB

        $checkStmt = $pdo->prepare("SELECT event_id FROM events WHERE event_id = :event_id AND user_id = :user_id");
        $checkStmt->execute([
            ':event_id' => $eventID,
            ':user_id'  => $userID,
        ]);

        if ($checkStmt->fetch()) {
            // Update existing event - REMOVE user_name from update
            $stmt = $pdo->prepare("UPDATE events SET
                event_name = :event_name,
                event_start_date = :event_start_date,
                event_start_time = :event_start_time,
                event_end_date = :event_end_date,
                event_end_time = :event_end_time,
                event_location = :event_location,
                event_image = :event_image,
                design_data = :design_data,
                updated_at = :updated_at
                WHERE event_id = :event_id AND user_id = :user_id
            ");
            $stmt->execute([
                ':event_name'       => $eventName,
                ':event_start_date' => $eventStartDate,
                ':event_start_time' => $eventStartTime,
                ':event_end_date'   => $eventEndDate,
                ':event_end_time'   => $eventEndTime,
                ':event_location'   => $eventLocation,
                ':event_image'      => $eventUrlImage,
                ':design_data'      => $eventDesignData,
                ':updated_at'       => $createdAt,
                ':event_id'         => $eventID,
                ':user_id'          => $userID,
            ]);

            // LOG THE ACTIVITY - Event updated
            $logStmt = $pdo->prepare("INSERT INTO system_activity (user_id, action, description) VALUES (:user_id, :action, :description)");
            $logStmt->execute([
                ':user_id'     => $userID,
                ':action'      => 'Event Updated',
                ':description' => "Event '{$eventName}' was updated",
            ]);
        } else {
            // Option 1: If you want to include user_name in the insert
            $columns = "user_id, user_name, event_id, event_name, event_start_date, event_start_time,
                       event_end_date, event_end_time, event_location, event_image, design_data, created_at, updated_at";

            $values = ":user_id, :event_id, :event_name, :event_start_date, :event_start_time,
                      :event_end_date, :event_end_time, :event_location, :event_image, :design_data, :created_at, :updated_at";

            $stmt = $pdo->prepare("INSERT INTO events ({$columns}) VALUES ({$values})");
            $stmt->execute([
                ':user_id'          => $userID,
                ':user_name'        => $userName,
                ':event_id'         => $eventID,
                ':event_name'       => $eventName,
                ':event_start_date' => $eventStartDate,
                ':event_start_time' => $eventStartTime,
                ':event_end_date'   => $eventEndDate,
                ':event_end_time'   => $eventEndTime,
                ':event_location'   => $eventLocation,
                ':event_image'      => $eventUrlImage,
                ':design_data'      => $eventDesignData,
                ':created_at'       => $createdAt,
                ':updated_at'       => $createdAt,
            ]);

            // LOG THE ACTIVITY - Event created
            $logStmt = $pdo->prepare("INSERT INTO system_activity (user_id, action, description) VALUES (:user_id, :action, :description)");
            $logStmt->execute([
                ':user_id'     => $userID, // The event planner's ID
                ':action'      => 'Event Created',
                ':description' => "New event '{$eventName}' created by {$userName}",
            ]);
        }

        echo json_encode(["success" => true, "message" => "Event saved successfully!", "event_id" => $eventID]);

    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => $e->getMessage()]);
    }
    exit;
}

if ($fun === "getUserEvents") {
    $userID = $_POST['userID'] ?? '';

    if (! $userID) {
        echo json_encode([
            "success" => false,
            "message" => "Missing user ID",
        ]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT * FROM events  WHERE user_id = :user_id  ORDER BY created_at DESC ");
        $stmt->execute([":user_id" => $userID]);
        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "events"  => $events,
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
        ]);
    }
    exit;
}

if ($fun === "getEventById") {
    $event_id = $_POST['event_id'] ?? '';

    if (! $event_id) {
        echo json_encode([
            "success" => false,
            "message" => "Missing event ID",
        ]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT * FROM events  WHERE event_id = :event_id ");
        $stmt->execute([":event_id" => $event_id]);
        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "events"  => $events,
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
        ]);
    }
    exit;
}

if ($fun === "guestRsvp") {
    $guest_id            = generateGuestID();
    $event_id            = $_POST['event_id'] ?? '';
    $name                = $_POST['name'] ?? '';
    $email               = $_POST['email'] ?? '';
    $attending           = $_POST['attending'] ?? '';
    $message             = $_POST['message'] ?? '';
    $guestCount          = (int) ($_POST['guestCount'] ?? 0);
    $totalRplyGuestCount = (int) ($_POST['totalRplyGuestCount'] ?? 0);
    $totalEventLimit     = (int) ($_POST['totalEventLimit'] ?? 0);

    $totalGuests = ($attending === 'yes') ? ($guestCount + 1) : 0;

    if (empty($event_id) || empty($name) || empty($email) || empty($attending)) {
        echo json_encode([
            "success" => false,
            "message" => "Missing required fields: event_id, name, email, or attending",
        ]);
        exit;
    }

    try {
        $remainingSpots = $totalEventLimit - $totalRplyGuestCount;

        if ($remainingSpots <= 0) {
            echo json_encode([
                "success" => false,
                "message" => "Event is full — 0 guest slots left.",
            ]);
            exit;
        }

        if ($totalGuests > $remainingSpots) {
            echo json_encode([
                "success" => false,
                "message" => "Only {$remainingSpots} guest spot(s) left. Please reduce your guest count.",
            ]);
            exit;
        }

        $checkStmt = $pdo->prepare("
            SELECT guest_id FROM rsvp WHERE event_id = :event_id AND email = :email
        ");
        $checkStmt->execute([
            ':event_id' => $event_id,
            ':email'    => $email,
        ]);
        $existingGuest = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if ($existingGuest) {
            $updateStmt = $pdo->prepare("
                UPDATE rsvp
                SET name = :name,
                    attending = :attending,
                    guest_count = :guest_count,
                    message = :message,
                    updated_at = NOW()
                WHERE guest_id = :guest_id
            ");
            $updateStmt->execute([
                ':name'        => $name,
                ':attending'   => $attending,
                ':guest_count' => $totalGuests,
                ':message'     => $message,
                ':guest_id'    => $existingGuest['guest_id'],
            ]);

            echo json_encode([
                "success"  => true,
                "message"  => "RSVP updated successfully!",
                "guest_id" => $existingGuest['guest_id'],
            ]);
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO rsvp (guest_id, event_id, name, email, attending, guest_count, message, created_at)
                VALUES (:guest_id, :event_id, :name, :email, :attending, :guest_count, :message, NOW())
            ");

            $stmt->execute([
                ':guest_id'    => $guest_id,
                ':event_id'    => $event_id,
                ':name'        => $name,
                ':email'       => $email,
                ':attending'   => $attending,
                ':guest_count' => $totalGuests,
                ':message'     => $message,
            ]);

            echo json_encode([
                "success"  => true,
                "message"  => "RSVP submitted successfully!",
                "guest_id" => $guest_id,
            ]);
        }

    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
        ]);
    }

    exit;
}

if ($fun === "getRSVPResponses") {
    $event_id = $_POST['event_id'] ?? '';

    if (empty($event_id)) {
        echo json_encode([
            "success" => false,
            "message" => "Missing event ID",
        ]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT * FROM rsvp WHERE event_id = :event_id ORDER BY created_at DESC");
        $stmt->execute([":event_id" => $event_id]);
        $responses = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmtEvent = $pdo->prepare("SELECT event_name FROM events WHERE event_id = :event_id");
        $stmtEvent->execute([":event_id" => $event_id]);
        $event = $stmtEvent->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            "success"   => true,
            "responses" => $responses,
            "event"     => $event,
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
        ]);
    }
    exit;
}

if ($fun === "getInvitationStats") {
    $adminUserId = $_POST['admin_user_id'] ?? '';

    if (! verifyAdminAccessWithPermission($pdo, $adminUserId, 'view_dashboard')) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Insufficient permissions",
        ]);
        exit;
    }

    try {
        // Total invitations sent (total RSVP records)
        $stmt = $pdo->prepare("SELECT COUNT(*) as total_invitations FROM rsvp");
        $stmt->execute();
        $totalInvitations = $stmt->fetch(PDO::FETCH_ASSOC)['total_invitations'];

        // Calculate open rate (percentage of RSVPs with any response)
        $stmt = $pdo->prepare("
            SELECT
                COUNT(*) as total_rsvp,
                COUNT(CASE WHEN attending IS NOT NULL THEN 1 END) as responded
            FROM rsvp
        ");
        $stmt->execute();
        $responseStats = $stmt->fetch(PDO::FETCH_ASSOC);

        $openRate = $responseStats['total_rsvp'] > 0 ?
        round(($responseStats['responded'] / $responseStats['total_rsvp']) * 100, 1) : 0;

        // Calculate response rate (percentage of "yes" responses)
        $stmt = $pdo->prepare("
            SELECT
                COUNT(*) as total_rsvp,
                COUNT(CASE WHEN attending = 'yes' THEN 1 END) as attending
            FROM rsvp
        ");
        $stmt->execute();
        $attendingStats = $stmt->fetch(PDO::FETCH_ASSOC);

        $responseRate = $attendingStats['total_rsvp'] > 0 ?
        round(($attendingStats['attending'] / $attendingStats['total_rsvp']) * 100, 1) : 0;

        echo json_encode([
            "success" => true,
            "stats"   => [
                "total_invitations" => (int) $totalInvitations,
                "open_rate"         => (float) $openRate,
                "response_rate"     => (float) $responseRate,
            ],
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
        ]);
    }
    exit;
}

if ($fun === "deleteEvent") {
    $event_id = $_POST["event_id"] ?? '';

    if (! $event_id) {
        echo json_encode(["success" => false, "message" => "No event selected"]);
        exit;
    }

    try {
        // First, check if the event exists and belongs to the user (for security)
        $user_id   = $_POST["user_id"] ?? '';
        $checkStmt = $pdo->prepare("SELECT user_id FROM events WHERE event_id = :event_id");
        $checkStmt->execute([":event_id" => $event_id]);
        $event = $checkStmt->fetch();

        if (! $event) {
            echo json_encode(["success" => false, "message" => "Event not found"]);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM events WHERE event_id = :event_id");
        $stmt->execute([":event_id" => $event_id]);

        echo json_encode(["success" => true, "message" => "Event deleted successfully"]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
}

if ($fun === "getEventStatusByID") {
    $event_id = $_POST['event_id'] ?? '';

    if (empty($event_id)) {
        echo json_encode([
            "success" => false,
            "message" => "Missing event ID",
        ]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT published FROM events WHERE event_id = :event_id");
        $stmt->execute([":event_id" => $event_id]);
        $status = $stmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "status"  => $status,
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
        ]);
    }
    exit;
}

if ($fun === "getUserProfile") {
    $userID = $_POST['user_id'] ?? '';

    if (! $userID) {
        echo json_encode([
            "success" => false,
            "message" => "Missing user ID",
        ]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT user_id, name, email FROM users WHERE user_id = :user_id LIMIT 1");
        $stmt->execute([":user_id" => $userID]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            echo json_encode([
                "success" => true,
                "user"    => $user,
            ]);
        } else {
            echo json_encode([
                "success" => false,
                "message" => "User not found",
            ]);
        }
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
        ]);
    }
    exit;
}

if ($fun === "updateUserProfile") {
    $userID   = $_POST['user_id'] ?? '';
    $name     = $_POST['name'] ?? '';
    $lastname = $_POST['lastname'] ?? '';
    $email    = $_POST['email'] ?? '';
    $verified = $_POST['verified'] ?? '1'; 

    if (!$userID || !$name || !$email || !$lastname) {
        echo json_encode([
            "success" => false,
            "message" => "Missing required fields",
        ]);
        exit;
    }

    try {
        $checkEmail = $pdo->prepare("SELECT user_id FROM users WHERE email = ? AND user_id != ?");
        $checkEmail->execute([$email, $userID]);
        
        if ($checkEmail->rowCount() > 0) {
            echo json_encode([
                "success" => false,
                "message" => "Email already exists",
            ]);
            exit;
        }

        $stmt = $pdo->prepare("UPDATE users SET name = ?, lastname = ?, email = ?, verified = ? WHERE user_id = ?");
        $stmt->execute([$name, $lastname, $email, $verified, $userID]);

        if ($stmt->rowCount() > 0) {
            echo json_encode([
                "success" => true,
                "message" => "Profile updated successfully",
            ]);
        } else {
            echo json_encode([
                "success" => false,
                "message" => "No changes made or user not found",
            ]);
        }
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
        ]);
    }
    exit;
}

if ($fun === "getUserPackage") {
    $user_id = $_POST['user_id'] ?? '';

    if (! $user_id) {
        echo json_encode(["success" => false, "message" => "Missing user ID"]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT * FROM user_packages WHERE user_id = :user_id");
        $stmt->execute([":user_id" => $user_id]);
        $userPackage = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($userPackage) {
            echo json_encode(["success" => true, "userPackage" => $userPackage]);
        } else {
            echo json_encode(["success" => false, "message" => "No package found"]);
        }
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
    exit;
}

if ($fun === "getAllPackages") {
    $adminUserId = $_POST['admin_user_id'] ?? '';

    /* if (! verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required",
        ]);
        exit;
    }*/

    try {
        $stmt = $pdo->prepare("SELECT * FROM packagetb");
        $stmt->execute();
        $packages = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(["success" => true, "packages" => $packages]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
    exit;
}

if ($fun === "updateEventUsedCount") {
    $user_id    = $_POST['user_id'] ?? '';
    $event_id   = $_POST['event_id'] ?? '';
    $package_id = $_POST['package_id'] ?? '';

    if (! $user_id || ! $event_id || ! $package_id) {
        echo json_encode(["success" => false, "message" => "Missing required data"]);
        exit;
    }

    try {
        $pdo->beginTransaction(); // <-- START TRANSACTION

        $checkStmt = $pdo->prepare("SELECT event_used, event_limit FROM user_packages WHERE user_id = ? FOR UPDATE");
        $checkStmt->execute([$user_id]);
        $package = $checkStmt->fetch();

        if (! $package) {
            $pdo->rollBack();
            echo json_encode(["success" => false, "message" => "User package not found"]);
            exit;
        }

        if ($package['event_used'] >= $package['event_limit']) {
            $pdo->rollBack();
            echo json_encode(["success" => false, "message" => "Event limit reached"]);
            exit;
        }

        $updateStmt = $pdo->prepare("UPDATE user_packages SET event_used = event_used + 1, updated_at = NOW() WHERE user_id = ?");
        $updateStmt->execute([$user_id]);

        // Update the event with package_id in events table
        $stmt = $pdo->prepare("UPDATE events SET package_id = :package_id WHERE event_id = :event_id");
        $stmt->execute([
            ":package_id" => $package_id,
            ":event_id"   => $event_id,
        ]);

        $pdo->commit();

        echo json_encode(["success" => true, "message" => "Event count updated and package assigned to event"]);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
    exit;
}

if ($fun === "updateEventStatus") {
    $event_id    = $_POST['event_id'] ?? '';
    $published   = $_POST['published'] ?? 0;
    $guest_limit = $_POST['guest_limit'] ?? null;

    if (! $event_id) {
        echo json_encode(["success" => false, "message" => "Missing event ID"]);
        exit;
    }

    if ($guest_limit === null || (int) $guest_limit <= 0) {
        echo json_encode(["success" => false, "message" => "Guest limit must be greater than 0"]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("UPDATE events SET published = :published, guest_limit = :guest_limit WHERE event_id = :event_id");
        $stmt->execute([
            ":published"   => (int) $published,
            ":guest_limit" => (int) $guest_limit,
            ":event_id"    => $event_id,
        ]);

        echo json_encode(["success" => true, "message" => "Event status and guest limit updated"]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
    exit;
}

if ($fun === "getPackageById") {
    $package_id = $_POST['package_id'] ?? '';

    if (! $package_id) {
        echo json_encode([
            "success" => false,
            "message" => "Missing package ID",
        ]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT * FROM packagetb WHERE package_id = :package_id LIMIT 1");
        $stmt->execute([":package_id" => $package_id]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "package" => $data,
        ]);

    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
        ]);
    }
    exit;
}

if ($fun === "updateUserPackage") {
    $user_id     = $_POST['user_id'] ?? null;
    $package_id  = $_POST['package_id'] ?? null;
    $event_limit = $_POST['events_limit'] ?? 0;

    if (! $user_id || ! $package_id || $event_limit == 0) {
        echo json_encode(["success" => false, "message" => "Missing required fields"]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT * FROM user_packages WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            $stmt = $pdo->prepare("UPDATE user_packages SET package_id = ?, event_limit = ?, event_used = 0, updated_at = NOW() WHERE user_id = ?");
            $stmt->execute([$package_id, $event_limit, $user_id]);

            echo json_encode(["success" => true, "message" => "Package updated successfully"]);
        } else {
            $newId = generateUserPackageID($pdo);

            $stmt = $pdo->prepare("INSERT INTO user_packages (user_package_id, user_id, package_id, event_limit, event_used, created_at) VALUES (?, ?, ?, ?, 0, NOW()) ");
            $stmt->execute([$newId, $user_id, $package_id, $event_limit]);

            echo json_encode(["success" => true, "message" => "New package assigned successfully"]);
        }
    } catch (Exception $e) {
        echo json_encode(["success" => false, "message" => $e->getMessage()]);
    }
}

// ADMIN DASHBOARD FUNCTIONS

if ($fun === "getDashboardStats") {
    $adminUserId = $_POST['admin_user_id'] ?? '';

    if (! verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required",
        ]);
        exit;
    }

    try {
        // Get total users count
        $stmt = $pdo->prepare("SELECT COUNT(*) as total_users FROM users");
        $stmt->execute();
        $totalUsers = $stmt->fetch(PDO::FETCH_ASSOC)['total_users'];

        // Get active users count (ONLY users with status = 'active')
        $stmt = $pdo->prepare("SELECT COUNT(*) as active_users FROM users WHERE status = 'active'");
        $stmt->execute();
        $activeUsers = $stmt->fetch(PDO::FETCH_ASSOC)['active_users'];

        // Get inactive users count (ONLY users with status = 'inactive')
        $stmt = $pdo->prepare("SELECT COUNT(*) as inactive_users FROM users WHERE status = 'inactive'");
        $stmt->execute();
        $inactiveUsers = $stmt->fetch(PDO::FETCH_ASSOC)['inactive_users'];

        // Get active events count (published events)
        $stmt = $pdo->prepare("SELECT COUNT(*) as active_events FROM events WHERE published = 1");
        $stmt->execute();
        $activeEvents = $stmt->fetch(PDO::FETCH_ASSOC)['active_events'];

        // Calculate response rate
        $stmt = $pdo->prepare("SELECT COUNT(DISTINCT event_id) as events_with_rsvp FROM rsvp");
        $stmt->execute();
        $eventsWithRsvp = $stmt->fetch(PDO::FETCH_ASSOC)['events_with_rsvp'];

        $stmt = $pdo->prepare("SELECT COUNT(*) as total_events FROM events");
        $stmt->execute();
        $totalEvents = $stmt->fetch(PDO::FETCH_ASSOC)['total_events'];

        $responseRate = $totalEvents > 0 ? round(($eventsWithRsvp / $totalEvents) * 100, 1) : 0;

        echo json_encode([
            "success" => true,
            "stats"   => [
                "total_users"    => (int) $totalUsers,
                "active_users"   => (int) $activeUsers,
                "inactive_users" => (int) $inactiveUsers,
                "active_events"  => (int) $activeEvents,
                "response_rate"  => (float) $responseRate,
            ],
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
        ]);
    }
    exit;
}

if ($fun === "getSystemActivity") {
    $adminUserId = $_POST['admin_user_id'] ?? '';
    $limit       = $_POST['limit'] ?? 5;

    if (! verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required",
        ]);
        exit;
    }

    try {
        // Check if system_activity table exists
        $tableCheck = $pdo->prepare("SHOW TABLES LIKE 'system_activity'");
        $tableCheck->execute();

        if ($tableCheck->rowCount() === 0) {
            // Create the table if it doesn't exist
            $createTable = $pdo->prepare("
                CREATE TABLE IF NOT EXISTS system_activity (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id VARCHAR(50),
                    action VARCHAR(255) NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ");
            $createTable->execute();

            // Insert some sample activities
            $sampleActivities = [
                ['System', 'System Initialized', 'Admin dashboard system started'],
                ['System', 'First Admin Login', 'Administrator accessed the system'],
            ];

            $insertStmt = $pdo->prepare("INSERT INTO system_activity (user_id, action, description) VALUES (?, ?, ?)");
            foreach ($sampleActivities as $activity) {
                $insertStmt->execute($activity);
            }
        }

        $stmt = $pdo->prepare("
            SELECT sa.*, CONCAT(u.name, ' ', u.lastname) as user_name
            FROM system_activity sa
            LEFT JOIN users u ON sa.user_id = u.user_id
            ORDER BY sa.created_at DESC
            LIMIT :limit
        ");
        $stmt->bindValue(':limit', (int) $limit, PDO::PARAM_INT);
        $stmt->execute();
        $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success"    => true,
            "activities" => $activities,
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
        ]);
    }
    exit;
}

if ($fun === "getAllUsers") {
    $adminUserId = $_POST['admin_user_id'] ?? '';

    if (! verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required",
        ]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("
            SELECT
                user_id,
                CONCAT(name, ' ', lastname) as name,
                email,
                -- Ensure status is always 'active' or 'inactive'
                CASE
                    WHEN status = 'inactive' THEN 'inactive'
                    ELSE 'active'
                END as status,
                created_at,
                COALESCE(role, 'event_planner') as role
            FROM users
            ORDER BY created_at DESC
        ");
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "users"   => $users,
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
        ]);
    }
    exit;
}

if ($fun === "getInvitationAnalytics") {
    $adminUserId = $_POST['admin_user_id'] ?? '';

    if (! verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required",
        ]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("
            SELECT
                e.event_id,
                e.event_name,
                e.published as status,
                COUNT(DISTINCT r.guest_id) as sent,
                COUNT(DISTINCT r.guest_id) as opened, -- Assuming all sent are opened
                COUNT(DISTINCT CASE WHEN r.attending IS NOT NULL THEN r.guest_id END) as responded,
                CASE
                    WHEN COUNT(DISTINCT r.guest_id) > 0 THEN
                        ROUND((COUNT(DISTINCT CASE WHEN r.attending IS NOT NULL THEN r.guest_id END) / COUNT(DISTINCT r.guest_id)) * 100, 1)
                    ELSE 0
                END as responseRate
            FROM events e
            LEFT JOIN rsvp r ON e.event_id = r.event_id
            GROUP BY e.event_id, e.event_name, e.published
            ORDER BY e.created_at DESC
        ");
        $stmt->execute();
        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Format the data for frontend
        $analytics = array_map(function ($event) {
            $sent         = (int) $event['sent'];
            $responded    = (int) $event['responded'];
            $responseRate = $sent > 0 ? round(($responded / $sent) * 100, 1) : 0;

            // Map status to frontend values
            $statusMap = [
                1 => 'active',
                0 => 'draft',
            ];

            return [
                'id'           => $event['event_id'],
                'eventName'    => $event['event_name'],
                'sent'         => $sent,
                'opened'       => $sent, // Assuming all sent are opened for simplicity
                'responded'    => $responded,
                'responseRate' => $responseRate . '%',
                'status'       => $statusMap[$event['status']] ?? 'draft',
            ];
        }, $events);

        echo json_encode([
            "success"   => true,
            "analytics" => $analytics,
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
        ]);
    }
    exit;
}

if ($fun === "getRevenueData") {
    $adminUserId = $_POST['admin_user_id'] ?? '';

    if (! verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required",
        ]);
        exit;
    }

    try {
        // Get revenue data (you'll need to implement actual revenue tracking)
        // For now, returning sample data structure
        $revenueData = [
            ['month' => 'Jan', 'revenue' => 7500],
            ['month' => 'Feb', 'revenue' => 8200],
            ['month' => 'Mar', 'revenue' => 7800],
            ['month' => 'Apr', 'revenue' => 8500],
            ['month' => 'May', 'revenue' => 9200],
            ['month' => 'Jun', 'revenue' => 8800],
        ];

        echo json_encode([
            "success"     => true,
            "revenueData" => $revenueData,
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
        ]);
    }
    exit;
}

if ($fun === "logSystemActivity") {
    $action      = $_POST['action'] ?? '';
    $description = $_POST['description'] ?? '';
    $userId      = $_POST['user_id'] ?? null;

    try {
        // Insert into queue table
        $stmt = $pdo->prepare("
            INSERT INTO system_activity (user_id, action, description)
            VALUES (:user_id, :action, :description)
        ");

        $stmt->execute([
            ':user_id'     => $userId,
            ':action'      => $action,
            ':description' => $description,
        ]);

        echo json_encode(["success" => true, "message" => "Activity queued"]);

    } catch (PDOException $e) {
        // Fallback: Direct insert
        try {
            $stmt = $pdo->prepare("
                INSERT INTO system_activity (user_id, action, description, created_at)
                VALUES (:user_id, :action, :description, NOW())
            ");

            $stmt->execute([
                ':user_id'     => $userId,
                ':action'      => $action,
                ':description' => $description,
            ]);

            echo json_encode(["success" => true, "message" => "Activity logged directly"]);
        } catch (PDOException $e2) {
            echo json_encode(["success" => false, "message" => "Failed to log activity"]);
        }
    }
    exit;
}

// In your updatePackage function in query.php
if ($fun === "updatePackage") {
    $adminUserId = $_POST['admin_user_id'] ?? '';
    $packageId   = $_POST['package_id'] ?? '';
    $packageType = $_POST['package_type'] ?? '';
    $maxGuests   = $_POST['max_guests'] ?? '';
    $maxEvents   = $_POST['max_events'] ?? '';
    $price       = $_POST['price'] ?? '';

    if (! verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required",
        ]);
        exit;
    }

    if (! $packageId || ! $packageType || ! $maxGuests || ! $maxEvents || ! $price) {
        echo json_encode(["success" => false, "message" => "Missing required fields"]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("
            UPDATE packagetb
            SET package_type = :package_type, max_guests = :max_guests, max_events = :max_events, price = :price
            WHERE package_id = :package_id
        ");

        $stmt->execute([
            ':package_type' => $packageType,
            ':max_guests'   => (int) $maxGuests,
            ':max_events'   => (int) $maxEvents,
            ':price'        => (float) $price,
            ':package_id'   => $packageId,
        ]);

        echo json_encode([
            "success" => true,
            "message" => "Package updated successfully",
        ]);

    } catch (PDOException $e) {
        error_log("Package update error: " . $e->getMessage());
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
        ]);
    }
    exit;
}

if ($fun === "updateUserStatus") {
    $adminUserId = $_POST['admin_user_id'] ?? '';
    $userId      = $_POST['user_id'] ?? '';
    $status      = $_POST['status'] ?? '';

    if (! verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required",
        ]);
        exit;
    }

    if (empty($userId) || ! in_array($status, ['active', 'inactive'])) {
        echo json_encode([
            "success" => false,
            "message" => "Invalid user ID or status",
        ]);
        exit;
    }

    try {
        // First get the target user's info for logging
        $userStmt = $pdo->prepare("SELECT name, email FROM users WHERE user_id = :user_id");
        $userStmt->execute([':user_id' => $userId]);
        $targetUser = $userStmt->fetch(PDO::FETCH_ASSOC);

        if (! $targetUser) {
            echo json_encode(["success" => false, "message" => "User not found"]);
            exit;
        }

        $stmt = $pdo->prepare("UPDATE users SET status = :status WHERE user_id = :user_id");
        $stmt->execute([
            ':status'  => $status,
            ':user_id' => $userId,
        ]);

        $rowsAffected = $stmt->rowCount();

        if ($rowsAffected > 0) {
            // ✅ LOG THE ACTIVITY - Admin changed user status
            $action      = $status === 'active' ? 'User Activated' : 'User Blocked';
            $description = "User {$targetUser['name']} ({$targetUser['email']}) was " . ($status === 'active' ? 'activated' : 'blocked');

            $logStmt = $pdo->prepare("INSERT INTO system_activity (user_id, action, description) VALUES (:user_id, :action, :description)");
            $logStmt->execute([
                ':user_id'     => $adminUserId, // The admin who performed the action
                ':action'      => $action,
                ':description' => $description,
            ]);

            echo json_encode([
                "success" => true,
                "message" => "User " . ($status === 'active' ? 'activated' : 'blocked') . " successfully",
            ]);
        } else {
            echo json_encode([
                "success" => false,
                "message" => "User not found or no changes made",
            ]);
        }
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
        ]);
    }
    exit;
}

if ($fun === "getRsvpGuestCount") {
    $event_id = $_POST['event_id'] ?? '';

    if (empty($event_id)) {
        echo json_encode([
            "success"    => false,
            "message"    => "Missing event ID",
            "guestCount" => 0,
        ]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT SUM(guest_count) AS total_guests FROM rsvp WHERE event_id = :event_id AND attending ='yes' ");
        $stmt->execute([":event_id" => $event_id]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);

        $totalGuests = $data['total_guests'] ?? 0;

        echo json_encode([
            "success"    => true,
            "guestCount" => (int) $totalGuests,
        ]);

    } catch (PDOException $e) {
        echo json_encode([
            "success"    => false,
            "message"    => "Database error: " . $e->getMessage(),
            "guestCount" => 0,
        ]);
    }
    exit;
}

if ($fun === "getEventGuestLimit") {
    $event_id = $_POST['event_id'] ?? '';

    if (empty($event_id)) {
        echo json_encode([
            "success"    => false,
            "message"    => "Missing event ID",
            "guestLimit" => 0,
        ]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT guest_limit FROM events WHERE event_id = :event_id");
        $stmt->execute([":event_id" => $event_id]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($data) {
            echo json_encode([
                "success"    => true,
                "guestLimit" => $data,
            ]);
        } else {
            echo json_encode([
                "success"    => false,
                "message"    => "No guest limit found for this event.",
                "guestLimit" => ["guest_limit" => 0],
            ]);
        }
    } catch (PDOException $e) {
        echo json_encode([
            "success"    => false,
            "message"    => "Database error: " . $e->getMessage(),
            "guestLimit" => 0,
        ]);
    }
    exit;
}

if ($fun === "update_password") {
    $email        = $_POST['email'] ?? '';
    $new_password = $_POST['new_password'] ?? '';

    if (empty($email) || empty($new_password)) {
        echo json_encode(["success" => false, "message" => "Missing required fields"]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (! $user) {
            echo json_encode(["success" => false, "message" => "No account found for that email."]);
            exit;
        }

// Hash new password
        $hashedPassword = password_hash($new_password, PASSWORD_DEFAULT);

        $updateStmt = $pdo->prepare("UPDATE users SET password = ? WHERE email = ?");
        $updateStmt->execute([$hashedPassword, $email]);

        echo json_encode([
            "success" => true,
            "message" => "Password updated successfully.",
        ]);
        exit;

    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
        ]);
        exit;
    }
}

if ($fun === "changePassword") {
    $user_id = $_POST['user_id'] ?? '';
    $current_password = $_POST['current_password'] ?? '';
    $new_password = $_POST['new_password'] ?? '';

    if (!$user_id || !$current_password || !$new_password) {
        echo json_encode(["success" => false, "message" => "All fields are required"]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT password FROM users WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            echo json_encode(["success" => false, "message" => "User not found"]);
            exit;
        }

        if (!password_verify($current_password, $user['password'])) {
            echo json_encode(["success" => false, "message" => "Current password is incorrect"]);
            exit;
        }

        $new_password_hash = password_hash($new_password, PASSWORD_DEFAULT);
        $updateStmt = $pdo->prepare("UPDATE users SET password = ? WHERE user_id = ?");
        $updateStmt->execute([$new_password_hash, $user_id]);

        echo json_encode(["success" => true, "message" => "Password changed successfully"]);
        
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
    exit;
}

if ($fun === "userRegEmailVerify") {
    $email = $_POST['email'] ?? '';

    if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(["success" => false, "message" => "Invalid email format"]);
        exit;
    }

    if (empty($email)) {
        echo json_encode(["success" => false, "message" => "Missing required fields"]);
        exit;
    }

    try {
        // Check if user exists and get verification status
        $stmt = $pdo->prepare("SELECT user_id, verified FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (! $user) {
            echo json_encode(["success" => false, "message" => "Email does not exist."]);
            exit;
        }

        // If already verified, return success
        if ($user['verified'] == 1) {
            echo json_encode([
                "success" => true,
                "message" => "Email was already verified.",
            ]);
            exit;
        }

        $updateStmt = $pdo->prepare("UPDATE users SET verified = 1 WHERE email = ?");
        $updateStmt->execute([$email]);

        if ($updateStmt->rowCount() > 0) {
            echo json_encode([
                "success" => true,
                "message" => "Email verified successfully!",
                "user_id" => $user['user_id'],
            ]);
        } else {
            echo json_encode([
                "success" => false,
                "message" => "Failed to verify email.",
            ]);
        }
        exit;
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
        ]);
        exit;
    }
}

// Report Generation Functions
if ($fun === "generateReport") {
    $adminUserId = $_POST['admin_user_id'] ?? '';
    $reportType  = $_POST['report_type'] ?? '';
    $dateRange   = $_POST['date_range'] ?? 'all';
    $format      = $_POST['format'] ?? 'pdf';

    if (! verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required",
        ]);
        exit;
    }

    try {
        // Generate filename with timestamp
        $timestamp = date('Y-m-d_H-i-s');
        $filename  = "report_{$reportType}_{$timestamp}";

        // Generate report data based on type
        $reportData = generateReportData($pdo, $reportType, $dateRange);

        // Create reports directory if it doesn't exist
        $reportsDir = __DIR__ . '/reports/';
        if (! is_dir($reportsDir)) {
            mkdir($reportsDir, 0755, true);
        }

        // Generate file based on format
        $filePath = '';
        switch ($format) {
            case 'csv':
                $filePath = generateCSVReport($reportData, $reportsDir . $filename . '.csv');
                break;
            case 'excel':
                $filePath = generateExcelReport($reportData, $reportsDir . $filename . '.xlsx');
                break;
            case 'pdf':
            default:
                $filePath = generatePDFReport($reportData, $reportsDir . $filename . '.pdf');
                break;
        }

        // Log the activity
        $logStmt = $pdo->prepare("INSERT INTO system_activity (user_id, action, description) VALUES (:user_id, :action, :description)");
        $logStmt->execute([
            ':user_id'     => $adminUserId,
            ':action'      => 'Report Generated',
            ':description' => "Generated {$reportType} report in {$format} format",
        ]);

        echo json_encode([
            "success"   => true,
            "message"   => "Report generated successfully",
            "file_path" => $filePath,
            "filename"  => basename($filePath),
        ]);
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Error generating report: " . $e->getMessage(),
        ]);
    }
    exit;
}

// Helper function to generate report data
function generateReportData($pdo, $reportType, $dateRange)
{
    $whereClause = getDateRangeWhereClause($dateRange);

    switch ($reportType) {
        case 'users':
            $stmt = $pdo->prepare("
                SELECT
                    user_id,
                    CONCAT(name, ' ', lastname) as name,
                    email,
                    role,
                    status,
                    created_at,
                    (SELECT COUNT(*) FROM events WHERE user_id = users.user_id) as total_events
                FROM users
                {$whereClause}
                ORDER BY created_at DESC
            ");
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);

        case 'revenue':
            $stmt = $pdo->prepare("
                SELECT
                    ph.*,
                    u.name as user_name,
                    u.email as user_email,
                    p.package_type,
                    p.price as package_price
                FROM payment_history ph
                LEFT JOIN users u ON ph.user_id = u.user_id
                LEFT JOIN packagetb p ON ph.package_id = p.package_id
                {$whereClause}
                ORDER BY ph.payment_date DESC
            ");
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);

        case 'events':
            $stmt = $pdo->prepare("
                SELECT
                    e.*,
                    (SELECT COUNT(*) FROM rsvp WHERE event_id = e.event_id) as total_rsvp,
                    (SELECT COUNT(*) FROM rsvp WHERE event_id = e.event_id AND attending = 'yes') as attending_count
                FROM events e
                {$whereClause}
                ORDER BY e.created_at DESC
            ");
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);

        case 'system':
            return [
                'total_users'     => getTotalCount($pdo, 'users'),
                'total_events'    => getTotalCount($pdo, 'events'),
                'total_payments'  => getTotalCount($pdo, 'payment_history'),
                'active_packages' => getPackageStats($pdo),
                'revenue_stats'   => getRevenueStats($pdo, $dateRange),
            ];
    }
}

// Database Backup Function
if ($fun === "backupDatabase") {
    $adminUserId = $_POST['admin_user_id'] ?? '';

    if (! verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required",
        ]);
        exit;
    }

    try {
        // Get database configuration
        $host   = 'localhost';
        $user   = 'root';
        $pass   = '';
        $dbname = 'eventa';

        // Create backup directory
        $backupDir = __DIR__ . '/backups/';
        if (! is_dir($backupDir)) {
            mkdir($backupDir, 0755, true);
        }

        // Generate backup filename
        $timestamp  = date('Y-m-d_H-i-s');
        $backupFile = $backupDir . "backup_{$timestamp}.sql";

        // Create backup using mysqldump
        $command = "mysqldump --host={$host} --user={$user} --password={$pass} {$dbname} > {$backupFile}";
        system($command, $output);

        if ($output === 0 && file_exists($backupFile)) {
            // Log the activity
            $logStmt = $pdo->prepare("INSERT INTO system_activity (user_id, action, description) VALUES (:user_id, :action, :description)");
            $logStmt->execute([
                ':user_id'     => $adminUserId,
                ':action'      => 'Database Backup',
                ':description' => "Database backup created: " . basename($backupFile),
            ]);

            echo json_encode([
                "success"   => true,
                "message"   => "Database backup created successfully",
                "file_path" => $backupFile,
                "filename"  => basename($backupFile),
            ]);
        } else {
            throw new Exception("Failed to create database backup");
        }
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Error creating backup: " . $e->getMessage(),
        ]);
    }
    exit;
}

// Helper functions
function getDateRangeWhereClause($dateRange)
{
    $now = new DateTime();

    switch ($dateRange) {
        case 'today':
            $startDate = $now->format('Y-m-d 00:00:00');
            return "WHERE created_at >= '{$startDate}'";
        case 'week':
            $startDate = $now->modify('-7 days')->format('Y-m-d 00:00:00');
            return "WHERE created_at >= '{$startDate}'";
        case 'month':
            $startDate = $now->modify('-30 days')->format('Y-m-d 00:00:00');
            return "WHERE created_at >= '{$startDate}'";
        case 'year':
            $startDate = $now->modify('-365 days')->format('Y-m-d 00:00:00');
            return "WHERE created_at >= '{$startDate}'";
        default:
            return "";
    }
}

function getTotalCount($pdo, $table)
{
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM {$table}");
    $stmt->execute();
    return $stmt->fetch(PDO::FETCH_ASSOC)['count'];
}

// Enhanced Invitation Analytics Functions
if ($fun === "getEnhancedInvitationAnalytics") {
    $adminUserId = $_POST['admin_user_id'] ?? '';

    if (! verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required",
        ]);
        exit;
    }

    try {
        // Get event types and statuses for filters
        $eventTypesStmt = $pdo->prepare("
            SELECT DISTINCT event_type
            FROM events
            WHERE event_type IS NOT NULL AND event_type != ''
        ");
        $eventTypesStmt->execute();
        $eventTypes = $eventTypesStmt->fetchAll(PDO::FETCH_COLUMN);

        // Get monthly trends for charts
        $monthlyTrendsStmt = $pdo->prepare("
            SELECT
                DATE_FORMAT(e.created_at, '%Y-%m') as month,
                COUNT(DISTINCT e.event_id) as total_events,
                COUNT(DISTINCT r.guest_id) as total_invitations,
                COUNT(DISTINCT CASE WHEN r.attending IS NOT NULL THEN r.guest_id END) as total_responses,
                COUNT(DISTINCT CASE WHEN r.attending = 'yes' THEN r.guest_id END) as total_attending
            FROM events e
            LEFT JOIN rsvp r ON e.event_id = r.event_id
            WHERE e.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(e.created_at, '%Y-%m')
            ORDER BY month DESC
            LIMIT 6
        ");
        $monthlyTrendsStmt->execute();
        $monthlyTrends = $monthlyTrendsStmt->fetchAll(PDO::FETCH_ASSOC);

        // Get event type comparison
        $eventTypeStatsStmt = $pdo->prepare("
            SELECT
                COALESCE(e.event_type, 'Other') as event_type,
                COUNT(DISTINCT e.event_id) as event_count,
                COUNT(DISTINCT r.guest_id) as total_invitations,
                COUNT(DISTINCT CASE WHEN r.attending IS NOT NULL THEN r.guest_id END) as total_responses,
                COUNT(DISTINCT CASE WHEN r.attending = 'yes' THEN r.guest_id END) as total_attending
            FROM events e
            LEFT JOIN rsvp r ON e.event_id = r.event_id
            GROUP BY COALESCE(e.event_type, 'Other')
        ");
        $eventTypeStatsStmt->execute();
        $eventTypeStats = $eventTypeStatsStmt->fetchAll(PDO::FETCH_ASSOC);

        // Get top performing events (response rate > 70%)
        $topEventsStmt = $pdo->prepare("
            SELECT
                e.event_id,
                e.event_name,
                e.event_type,
                e.published as status,
                COUNT(DISTINCT r.guest_id) as sent,
                COUNT(DISTINCT CASE WHEN r.attending IS NOT NULL THEN r.guest_id END) as responded,
                COUNT(DISTINCT CASE WHEN r.attending = 'yes' THEN r.guest_id END) as attending_count,
                CASE
                    WHEN COUNT(DISTINCT r.guest_id) > 0 THEN
                        ROUND((COUNT(DISTINCT CASE WHEN r.attending IS NOT NULL THEN r.guest_id END) / COUNT(DISTINCT r.guest_id)) * 100, 1)
                    ELSE 0
                END as response_rate
            FROM events e
            LEFT JOIN rsvp r ON e.event_id = r.event_id
            GROUP BY e.event_id, e.event_name, e.event_type, e.published
            HAVING response_rate > 70 AND sent > 0
            ORDER BY response_rate DESC, sent DESC
            LIMIT 10
        ");
        $topEventsStmt->execute();
        $topEvents = $topEventsStmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success"   => true,
            "analytics" => [
                "event_types"      => $eventTypes,
                "monthly_trends"   => $monthlyTrends,
                "event_type_stats" => $eventTypeStats,
                "top_events"       => $topEvents,
            ],
        ]);
    } catch (PDOException $e) {
        // More detailed error logging
        error_log("Database error in userRegEmailVerify: " . $e->getMessage());
        error_log("Email: " . $email);
        error_log("Error Code: " . $e->getCode());

        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required",
        ]);
        exit;
    }

    try {
        // Build query based on filters
        $whereConditions = [];
        $params          = [];

        if ($eventId) {
            $whereConditions[] = "e.event_id = ?";
            $params[]          = $eventId;
        }

        if ($userId) {
            $whereConditions[] = "e.user_id = ?";
            $params[]          = $userId;
        }

        if ($eventType && $eventType !== 'all') {
            $whereConditions[] = "e.event_type = ?";
            $params[]          = $eventType;
        }

        if ($status && $status !== 'all') {
            $whereConditions[] = "e.published = ?";
            $params[]          = ($status === 'active' ? 1 : 0);
        }

        $whereClause = $whereConditions ? "WHERE " . implode(" AND ", $whereConditions) : "";

        $exportStmt = $pdo->prepare("
            SELECT
                e.event_id,
                e.event_name,
                e.event_type,
                CASE e.published
                    WHEN 1 THEN 'active'
                    WHEN 0 THEN 'draft'
                    ELSE 'unknown'
                END as status,
                u.name as organizer_name,
                u.email as organizer_email,
                COUNT(DISTINCT r.guest_id) as invitations_sent,
                COUNT(DISTINCT CASE WHEN r.attending IS NOT NULL THEN r.guest_id END) as responses_received,
                COUNT(DISTINCT CASE WHEN r.attending = 'yes' THEN r.guest_id END) as attending_count,
                CASE
                    WHEN COUNT(DISTINCT r.guest_id) > 0 THEN
                        ROUND((COUNT(DISTINCT CASE WHEN r.attending IS NOT NULL THEN r.guest_id END) / COUNT(DISTINCT r.guest_id)) * 100, 1)
                    ELSE 0
                END as response_rate,
                e.created_at as event_created
            FROM events e
            LEFT JOIN users u ON e.user_id = u.user_id
            LEFT JOIN rsvp r ON e.event_id = r.event_id
            {$whereClause}
            GROUP BY e.event_id, e.event_name, e.event_type, e.published, u.name, u.email, e.created_at
            ORDER BY e.created_at DESC
        ");

        $exportStmt->execute($params);
        $exportData = $exportStmt->fetchAll(PDO::FETCH_ASSOC);

        // Create export directory
        $exportDir = __DIR__ . '/exports/';
        if (! is_dir($exportDir)) {
            mkdir($exportDir, 0755, true);
        }

        // Generate filename
        $timestamp = date('Y-m-d_H-i-s');
        $filename  = "invitation_export_{$timestamp}.csv";
        $filePath  = $exportDir . $filename;

        // Create CSV file
        $file = fopen($filePath, 'w');

        if (! empty($exportData)) {
            // Add headers
            fputcsv($file, array_keys($exportData[0]));

            // Add data rows
            foreach ($exportData as $row) {
                fputcsv($file, $row);
            }
        } else {
            fputcsv($file, ['No data available for export']);
        }

        fclose($file);

        echo json_encode([
            "success"   => true,
            "message"   => "Export generated successfully",
            "file_path" => $filePath,
            "filename"  => $filename,
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Export error: " . $e->getMessage(),
        ]);
    }
    exit;
}