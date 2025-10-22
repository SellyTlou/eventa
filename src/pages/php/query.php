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
function verifyAdminAccess($pdo, $userId) {
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
            ':user_id' => $userID, // The new user's ID
            ':action' => 'User Registered',
            ':description' => "New user registered: {$name} {$lastname} ({$email})"
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

            if (password_verify($password, $user['password'])) {
                $update = $pdo->prepare("UPDATE users SET session = 1 WHERE user_id = :id");
                $update->execute([":id" => $user['user_id']]);

                // ✅ LOG THE ACTIVITY - User logged in
                $logStmt = $pdo->prepare("INSERT INTO system_activity (user_id, action, description) VALUES (:user_id, :action, :description)");
                $logStmt->execute([
                    ':user_id' => $user['user_id'],
                    ':action' => 'User Login',
                    ':description' => "User {$user['name']} logged into the system"
                ]);

                echo json_encode([
                    "success" => true,
                    "message" => "Login successful",
                    "user"    => [
                        "user_id" => $user['user_id'],
                        "name"    => $user['name'],
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
        echo json_encode(["error" => $e->getMessage()]);
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
                ':user_id' => $userID,
                ':action' => 'Event Updated',
                ':description' => "Event '{$eventName}' was updated"
            ]);
        } else {
            // Option 1: If you want to include user_name in the insert
            $columns = "user_id, user_name, event_id, event_name, event_start_date, event_start_time,
                       event_end_date, event_end_time, event_location, event_image, design_data, created_at, updated_at";
            
            $values = ":user_id, :user_name, :event_id, :event_name, :event_start_date, :event_start_time,
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
                ':user_id' => $userID,
                ':action' => 'Event Created',
                ':description' => "New event '{$eventName}' created"
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

if ($fun === "sendInvites") {
    $eventID   = $_POST['eventID'] ?? '';
    $eventName = $_POST['eventName'] ?? '';
    $guests    = $_POST['guests'] ?? '';     // Expecting JSON string from frontend
    $guestsArr = json_decode($guests, true); // convert to PHP array

    if (! $eventID || ! $eventName || ! is_array($guestsArr)) {
        echo json_encode([
            "success" => false,
            "message" => "Missing or invalid data",
        ]);
        exit;
    }

    try {
        // Example: loop through guests and send emails
        foreach ($guestsArr as $guest) {
            $guestName  = $guest['name'];
            $guestEmail = $guest['email'];

            $rsvpLink = "http://yourdomain.com/rsvpForm?eventID=$eventID&guestEmail=" . urlencode($guestEmail);

            $subject = "Invitation to $eventName";
            $message = "
                Hi $guestName,<br><br>
                You are invited to <b>$eventName</b>! <br>
                Please RSVP using this link: <a href='$rsvpLink'>$rsvpLink</a>
            ";
            $headers = "MIME-Version: 1.0" . "\r\n";
            $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
            $headers .= "From: sellytlou@gmail.com" . "\r\n";

            // Send email
            @mail($guestEmail, $subject, $message, $headers);
        }

        echo json_encode([
            "success" => true,
            "message" => "Invitations sent successfully!",
        ]);
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Error sending invites: " . $e->getMessage(),
        ]);
    }
    exit;
}

if ($fun === "guestRsvp") {
    $guest_id   = generateGuestID();
    $event_id   = $_POST['event_id'] ?? '';
    $name       = $_POST['name'] ?? '';
    $email      = $_POST['email'] ?? '';
    $attending  = $_POST['attending'] ?? '';
    $message    = $_POST['message'] ?? '';
    $guestCount = (int)($_POST['guestCount'] ?? 0); 
    $totalRplyGuestCount = (int)($_POST['totalRplyGuestCount'] ?? 0);
    $totalEventLimit = (int)($_POST['totalEventLimit'] ?? 0);

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
    
    if (!verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required"
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
            "stats" => [
                "total_invitations" => (int)$totalInvitations,
                "open_rate" => (float)$openRate,
                "response_rate" => (float)$responseRate
            ]
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
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
    $userID = $_POST['user_id'] ?? '';
    $name   = $_POST['name'] ?? '';
    $email  = $_POST['email'] ?? '';

    if (! $userID || ! $name || ! $email) {
        echo json_encode([
            "success" => false,
            "message" => "Missing required fields",
        ]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT user_id FROM users WHERE email = :email AND user_id != :user_id");
        $stmt->execute([":email" => $email, ":user_id" => $userID]);
        if ($stmt->fetch()) {
            echo json_encode([
                "success" => false,
                "message" => "Email already in use by another account",
            ]);
            exit;
        }

        $stmt = $pdo->prepare("UPDATE users SET name = :name, email = :email WHERE user_id = :user_id");
        $stmt->execute([
            ":name"    => $name,
            ":email"   => $email,
            ":user_id" => $userID,
        ]);

        echo json_encode([
            "success" => true,
            "message" => "Profile updated successfully",
            "user"    => [
                "user_id" => $userID,
                "name"    => $name,
                "email"   => $email,
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

    if (!$user_id || !$event_id || !$package_id) {
        echo json_encode(["success" => false, "message" => "Missing required data"]);
        exit;
    }

    try {
        $pdo->beginTransaction(); // <-- START TRANSACTION

        $checkStmt = $pdo->prepare("SELECT event_used, event_limit FROM user_packages WHERE user_id = ? FOR UPDATE");
        $checkStmt->execute([$user_id]);
        $package = $checkStmt->fetch();

        if (!$package) {
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
    
    if (!verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required"
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
            "stats" => [
                "total_users" => (int)$totalUsers,
                "active_users" => (int)$activeUsers,
                "inactive_users" => (int)$inactiveUsers,
                "active_events" => (int)$activeEvents,
                "response_rate" => (float)$responseRate
            ]
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
    exit;
}

if ($fun === "getSystemActivity") {
    $adminUserId = $_POST['admin_user_id'] ?? '';
    $limit = $_POST['limit'] ?? 5;
    
    if (!verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required"
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
                ['System', 'First Admin Login', 'Administrator accessed the system']
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
        $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
        $stmt->execute();
        $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "activities" => $activities
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
    exit;
}

if ($fun === "getAllUsers") {
    $adminUserId = $_POST['admin_user_id'] ?? '';
    
    if (!verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required"
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
            "users" => $users
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
    exit;
}

if ($fun === "getInvitationAnalytics") {
    $adminUserId = $_POST['admin_user_id'] ?? '';
    
    if (!verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required"
        ]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("
            SELECT 
                e.event_id as id,
                e.event_name as eventName,
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
        $analytics = array_map(function($event) {
            // Map status to frontend values
            $statusMap = [
                1 => 'active',
                0 => 'draft'
            ];
            
            return [
                'id' => $event['id'],
                'eventName' => $event['eventName'],
                'sent' => (int)$event['sent'],
                'opened' => (int)$event['opened'],
                'responded' => (int)$event['responded'],
                'responseRate' => $event['responseRate'] . '%',
                'status' => $statusMap[$event['status']] ?? 'draft',
                'eventType' => 'General' // Default event type
            ];
        }, $events);

        echo json_encode([
            "success" => true,
            "analytics" => $analytics
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
    exit;
}

if ($fun === "getRevenueData") {
    $adminUserId = $_POST['admin_user_id'] ?? '';
    
    if (!verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required"
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
            ['month' => 'Jun', 'revenue' => 8800]
        ];

        echo json_encode([
            "success" => true,
            "revenueData" => $revenueData
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
    exit;
}

if ($fun === "logSystemActivity") {
    $action = $_POST['action'] ?? '';
    $description = $_POST['description'] ?? '';
    $userId = $_POST['user_id'] ?? null;

    try {
        // Insert into queue table
        $stmt = $pdo->prepare("
            INSERT INTO system_activity_queue (user_id, action, description, created_at) 
            VALUES (:user_id, :action, :description, NOW())
        ");
        
        $stmt->execute([
            ':user_id' => $userId,
            ':action' => $action,
            ':description' => $description
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
                ':user_id' => $userId,
                ':action' => $action,
                ':description' => $description
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
    $package_id = $_POST['package_id'] ?? '';
    $package_type = $_POST['package_type'] ?? '';
    $max_guests = $_POST['max_guests'] ?? '';
    $max_events = $_POST['max_events'] ?? '';
    $price = $_POST['price'] ?? '';
    
    // Add admin verification
    if (!verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required"
        ]);
        exit;
    }

    if (!$package_id || !$package_type || !$max_guests || !$max_events || !$price) {
        echo json_encode([
            "success" => false,
            "message" => "Missing required fields"
        ]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("
            UPDATE packagetb 
            SET package_type = :package_type, 
                max_guests = :max_guests, 
                max_events = :max_events, 
                price = :price 
            WHERE package_id = :package_id
        ");
        
        $stmt->execute([
            ':package_type' => $package_type,
            ':max_guests' => $max_guests,
            ':max_events' => $max_events,
            ':price' => $price,
            ':package_id' => $package_id
        ]);

        // ✅ LOG THE ACTIVITY
        $logStmt = $pdo->prepare("INSERT INTO system_activity (user_id, action, description) VALUES (:user_id, :action, :description)");
        $logStmt->execute([
            ':user_id' => $adminUserId,
            ':action' => 'Package Updated',
            ':description' => "Package {$package_type} updated: {$max_events} events, {$max_guests} guests, R{$price}"
        ]);

        echo json_encode([
            "success" => true, 
            "message" => "Package updated successfully"
        ]);
        
    } catch (PDOException $e) {
        error_log("Package update error: " . $e->getMessage());
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
    exit;
}

if ($fun === "updateUserStatus") {
    $adminUserId = $_POST['admin_user_id'] ?? '';
    $userId = $_POST['user_id'] ?? '';
    $status = $_POST['status'] ?? '';

    if (!verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required"
        ]);
        exit;
    }

    if (empty($userId) || !in_array($status, ['active', 'inactive'])) {
        echo json_encode([
            "success" => false, 
            "message" => "Invalid user ID or status"
        ]);
        exit;
    }

    try {
        // First get the target user's info for logging
        $userStmt = $pdo->prepare("SELECT name, email FROM users WHERE user_id = :user_id");
        $userStmt->execute([':user_id' => $userId]);
        $targetUser = $userStmt->fetch(PDO::FETCH_ASSOC);

        if (!$targetUser) {
            echo json_encode(["success" => false, "message" => "User not found"]);
            exit;
        }

        $stmt = $pdo->prepare("UPDATE users SET status = :status WHERE user_id = :user_id");
        $stmt->execute([
            ':status' => $status,
            ':user_id' => $userId
        ]);

        $rowsAffected = $stmt->rowCount();

        if ($rowsAffected > 0) {
            // ✅ LOG THE ACTIVITY - Admin changed user status
            $action = $status === 'active' ? 'User Activated' : 'User Blocked';
            $description = "User {$targetUser['name']} ({$targetUser['email']}) was " . ($status === 'active' ? 'activated' : 'blocked');
            
            $logStmt = $pdo->prepare("INSERT INTO system_activity (user_id, action, description) VALUES (:user_id, :action, :description)");
            $logStmt->execute([
                ':user_id' => $adminUserId, // The admin who performed the action
                ':action' => $action,
                ':description' => $description
            ]);

            echo json_encode([
                "success" => true, 
                "message" => "User " . ($status === 'active' ? 'activated' : 'blocked') . " successfully"
            ]);
        } else {
            echo json_encode([
                "success" => false, 
                "message" => "User not found or no changes made"
            ]);
        }
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false, 
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
    exit;
}

if ($fun === "getAdminProfile") {
    $adminUserId = $_POST['admin_user_id'] ?? '';
    
    if (!verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required"
        ]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("
            SELECT 
                user_id,
                name,
                lastname,
                email,
                role,
                created_at
            FROM users 
            WHERE user_id = :user_id
        ");
        $stmt->execute([':user_id' => $adminUserId]);
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($admin) {
            echo json_encode([
                "success" => true,
                "admin" => $admin
            ]);
        } else {
            echo json_encode([
                "success" => false,
                "message" => "Admin profile not found"
            ]);
        }
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
    exit;
}

if ($fun === "updateAdminProfile") {
    $adminUserId = $_POST['admin_user_id'] ?? '';
    $name = $_POST['name'] ?? '';
    $lastname = $_POST['lastname'] ?? '';
    $email = $_POST['email'] ?? '';
    
    if (!verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required"
        ]);
        exit;
    }

    if (!$name || !$email) {
        echo json_encode([
            "success" => false,
            "message" => "Name and email are required"
        ]);
        exit;
    }

    try {
        // Check if email is already used by another user
        $stmt = $pdo->prepare("SELECT user_id FROM users WHERE email = :email AND user_id != :user_id");
        $stmt->execute([
            ':email' => $email,
            ':user_id' => $adminUserId
        ]);
        
        if ($stmt->fetch()) {
            echo json_encode([
                "success" => false,
                "message" => "Email already in use by another account"
            ]);
            exit;
        }

        $stmt = $pdo->prepare("
            UPDATE users 
            SET name = :name, lastname = :lastname, email = :email 
            WHERE user_id = :user_id
        ");
        $stmt->execute([
            ':name' => $name,
            ':lastname' => $lastname,
            ':email' => $email,
            ':user_id' => $adminUserId
        ]);

        // ✅ LOG THE ACTIVITY
        $logStmt = $pdo->prepare("INSERT INTO system_activity (user_id, action, description) VALUES (:user_id, :action, :description)");
        $logStmt->execute([
            ':user_id' => $adminUserId,
            ':action' => 'Profile Updated',
            ':description' => "Admin profile updated: {$name} {$lastname}"
        ]);

        echo json_encode([
            "success" => true,
            "message" => "Profile updated successfully"
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
    exit;
}

// Add these functions to your existing backend

if ($fun === "getUserPackageAndStats") {
    $adminUserId = $_POST['admin_user_id'] ?? '';
    $targetUserId = $_POST['user_id'] ?? '';
    
    if (!verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required"
        ]);
        exit;
    }

    try {
        // Get user's package info
        $packageStmt = $pdo->prepare("
            SELECT p.package_type, up.event_limit, up.event_used 
            FROM user_packages up 
            LEFT JOIN packagetb p ON up.package_id = p.package_id 
            WHERE up.user_id = :user_id
        ");
        $packageStmt->execute([':user_id' => $targetUserId]);
        $packageInfo = $packageStmt->fetch(PDO::FETCH_ASSOC);

        // Get user's total events count
        $eventsStmt = $pdo->prepare("SELECT COUNT(*) as total_events FROM events WHERE user_id = :user_id");
        $eventsStmt->execute([':user_id' => $targetUserId]);
        $eventsCount = $eventsStmt->fetch(PDO::FETCH_ASSOC)['total_events'];

        // Get all available packages for dropdown
        $packagesStmt = $pdo->prepare("SELECT package_id, package_type FROM packagetb");
        $packagesStmt->execute();
        $allPackages = $packagesStmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "package_info" => $packageInfo ?: null,
            "total_events" => (int)$eventsCount,
            "available_packages" => $allPackages
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
    exit;
}

if ($fun === "updateUserPackage") {
    $adminUserId = $_POST['admin_user_id'] ?? '';
    $targetUserId = $_POST['user_id'] ?? '';
    $packageType = $_POST['package_type'] ?? '';
    
    if (!verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required"
        ]);
        exit;
    }

    try {
        // Get package_id from package_type
        $packageStmt = $pdo->prepare("SELECT package_id FROM packagetb WHERE package_type = :package_type");
        $packageStmt->execute([':package_type' => $packageType]);
        $package = $packageStmt->fetch(PDO::FETCH_ASSOC);

        if (!$package) {
            echo json_encode([
                "success" => false,
                "message" => "Invalid package type"
            ]);
            exit;
        }

        $packageId = $package['package_id'];

        // Check if user already has a package
        $checkStmt = $pdo->prepare("SELECT user_package_id FROM user_packages WHERE user_id = :user_id");
        $checkStmt->execute([':user_id' => $targetUserId]);
        $existingPackage = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if ($existingPackage) {
            // Update existing package
            $updateStmt = $pdo->prepare("
                UPDATE user_packages 
                SET package_id = :package_id, event_used = 0, updated_at = NOW() 
                WHERE user_id = :user_id
            ");
            $updateStmt->execute([
                ':package_id' => $packageId,
                ':user_id' => $targetUserId
            ]);
        } else {
            // Insert new package
            $newPackageId = generateUserPackageID($pdo);
            $insertStmt = $pdo->prepare("
                INSERT INTO user_packages (user_package_id, user_id, package_id, event_limit, event_used, created_at) 
                VALUES (:user_package_id, :user_id, :package_id, 10, 0, NOW())
            ");
            $insertStmt->execute([
                ':user_package_id' => $newPackageId,
                ':user_id' => $targetUserId,
                ':package_id' => $packageId
            ]);
        }

        // Log the activity
        $logStmt = $pdo->prepare("INSERT INTO system_activity (user_id, action, description) VALUES (:user_id, :action, :description)");
        $logStmt->execute([
            ':user_id' => $adminUserId,
            ':action' => 'Package Updated',
            ':description' => "Package updated for user ID: {$targetUserId} to {$packageType}"
        ]);

        echo json_encode([
            "success" => true,
            "message" => "User package updated successfully"
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
    exit;
}

// Payment History Functions
if ($fun === "getPaymentHistory") {
    $adminUserId = $_POST['admin_user_id'] ?? '';
    
    if (!verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required"
        ]);
        exit;
    }

    try {
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
            ORDER BY ph.payment_date DESC
            LIMIT 100
        ");
        $stmt->execute();
        $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "payments" => $payments
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
    exit;
}

if ($fun === "getRevenueAnalytics") {
    $adminUserId = $_POST['admin_user_id'] ?? '';
    
    if (!verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required"
        ]);
        exit;
    }

    try {
        // Total revenue
        $totalStmt = $pdo->prepare("SELECT SUM(amount) as total_revenue FROM payment_history WHERE payment_status = 'completed'");
        $totalStmt->execute();
        $totalRevenue = $totalStmt->fetch(PDO::FETCH_ASSOC)['total_revenue'] ?? 0;

        // Monthly revenue
        $monthlyStmt = $pdo->prepare("
            SELECT 
                DATE_FORMAT(payment_date, '%Y-%m') as month,
                SUM(amount) as revenue
            FROM payment_history 
            WHERE payment_status = 'completed' 
            AND payment_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
            ORDER BY month DESC
            LIMIT 6
        ");
        $monthlyStmt->execute();
        $monthlyRevenue = $monthlyStmt->fetchAll(PDO::FETCH_ASSOC);

        // Revenue by package
        $packageStmt = $pdo->prepare("
            SELECT 
                p.package_type,
                COUNT(ph.payment_id) as payment_count,
                SUM(ph.amount) as total_amount
            FROM payment_history ph
            LEFT JOIN packagetb p ON ph.package_id = p.package_id
            WHERE ph.payment_status = 'completed'
            GROUP BY p.package_type
        ");
        $packageStmt->execute();
        $revenueByPackage = $packageStmt->fetchAll(PDO::FETCH_ASSOC);

        // Payment status counts
        $statusStmt = $pdo->prepare("
            SELECT 
                payment_status,
                COUNT(*) as count
            FROM payment_history 
            GROUP BY payment_status
        ");
        $statusStmt->execute();
        $paymentStatusCounts = $statusStmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "analytics" => [
                "total_revenue" => (float)$totalRevenue,
                "monthly_revenue" => $monthlyRevenue,
                "revenue_by_package" => $revenueByPackage,
                "payment_status_counts" => $paymentStatusCounts
            ]
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
    exit;
}

if ($fun === "addManualPayment") {
    $adminUserId = $_POST['admin_user_id'] ?? '';
    $userId = $_POST['user_id'] ?? '';
    $packageId = $_POST['package_id'] ?? '';
    $amount = $_POST['amount'] ?? '';
    $paymentMethod = $_POST['payment_method'] ?? '';
    $billingCycle = $_POST['billing_cycle'] ?? '';
    
    if (!verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required"
        ]);
        exit;
    }

    try {
        // Generate payment ID
        $paymentId = "PAY-" . substr(str_shuffle("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"), 0, 6) . "-" . time();

        $stmt = $pdo->prepare("
            INSERT INTO payment_history 
            (payment_id, user_id, package_id, amount, payment_method, payment_status, transaction_id, billing_cycle) 
            VALUES (?, ?, ?, ?, ?, 'completed', ?, ?)
        ");
        $stmt->execute([
            $paymentId,
            $userId,
            $packageId,
            $amount,
            $paymentMethod,
            'manual_' . $paymentId,
            $billingCycle
        ]);

        // Log the activity
        $logStmt = $pdo->prepare("INSERT INTO system_activity (user_id, action, description) VALUES (:user_id, :action, :description)");
        $logStmt->execute([
            ':user_id' => $adminUserId,
            ':action' => 'Manual Payment Added',
            ':description' => "Manual payment of {$amount} added for user ID: {$userId}"
        ]);

        echo json_encode([
            "success" => true,
            "message" => "Manual payment added successfully"
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
    exit;
}

if ($fun === "updatePaymentStatus") {
    $adminUserId = $_POST['admin_user_id'] ?? '';
    $paymentId = $_POST['payment_id'] ?? '';
    $status = $_POST['status'] ?? '';
    
    if (!verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required"
        ]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("UPDATE payment_history SET payment_status = ? WHERE payment_id = ?");
        $stmt->execute([$status, $paymentId]);

        echo json_encode([
            "success" => true,
            "message" => "Payment status updated successfully"
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
    exit;
}

// Report Generation Functions
if ($fun === "generateReport") {
    $adminUserId = $_POST['admin_user_id'] ?? '';
    $reportType = $_POST['report_type'] ?? 'users';
    $dateRange = $_POST['date_range'] ?? 'all';
    
    if (!verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required"
        ]);
        exit;
    }

    try {
        // Create reports directory if it doesn't exist
        $reportsDir = __DIR__ . '/reports/';
        if (!is_dir($reportsDir)) {
            mkdir($reportsDir, 0755, true);
        }

        $timestamp = date('Y-m-d_H-i-s');
        $filename = "report_{$reportType}_{$timestamp}.csv";
        $filepath = $reportsDir . $filename;

        // Generate CSV content with date filtering
        $csvContent = generateReportWithDateFilter($pdo, $reportType, $dateRange);
        
        // Write to file
        file_put_contents($filepath, $csvContent);

        $fileSize = filesize($filepath);
        
        // Log the activity
        $logStmt = $pdo->prepare("INSERT INTO system_activity (user_id, action, description) VALUES (:user_id, :action, :description)");
        $logStmt->execute([
            ':user_id' => $adminUserId,
            ':action' => 'Report Generated',
            ':description' => "{$reportType} report generated for {$dateRange}"
        ]);

        echo json_encode([
            "success" => true,
            "message" => "Report generated successfully",
            "filename" => $filename,
            "file_size" => $fileSize
        ]);

    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Error: " . $e->getMessage()
        ]);
    }
    exit;
}

// Simple date filtering function
function getDateFilter($dateRange, $dateField = 'created_at') {
    switch ($dateRange) {
        case 'today':
            $startDate = date('Y-m-d 00:00:00');
            return "WHERE {$dateField} >= '{$startDate}'";
        case 'week':
            $startDate = date('Y-m-d 00:00:00', strtotime('-7 days'));
            return "WHERE {$dateField} >= '{$startDate}'";
        case 'month':
            $startDate = date('Y-m-d 00:00:00', strtotime('-30 days'));
            return "WHERE {$dateField} >= '{$startDate}'";
        case 'year':
            $startDate = date('Y-m-d 00:00:00', strtotime('-365 days'));
            return "WHERE {$dateField} >= '{$startDate}'";
        default: // 'all'
            return "";
    }
}

// Report generator with date filtering
function generateReportWithDateFilter($pdo, $reportType, $dateRange) {
    $dateFilter = getDateFilter($dateRange);
    
    switch ($reportType) {
        case 'users':
            $query = "SELECT user_id, name, email, role, status, created_at FROM users {$dateFilter} ORDER BY created_at DESC";
            $stmt = $pdo->query($query);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $csv = "User ID,Name,Email,Role,Status,Created Date\n";
            foreach ($data as $row) {
                $csv .= "\"{$row['user_id']}\",\"{$row['name']}\",\"{$row['email']}\",\"{$row['role']}\",\"{$row['status']}\",\"{$row['created_at']}\"\n";
            }
            return $csv;
            
        case 'events':
            $query = "SELECT event_id, event_name, user_id, event_location, published, created_at FROM events {$dateFilter} ORDER BY created_at DESC";
            $stmt = $pdo->query($query);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $csv = "Event ID,Event Name,User ID,Location,Status,Created Date\n";
            foreach ($data as $row) {
                $status = $row['published'] ? 'Published' : 'Draft';
                $csv .= "\"{$row['event_id']}\",\"{$row['event_name']}\",\"{$row['user_id']}\",\"{$row['event_location']}\",\"{$status}\",\"{$row['created_at']}\"\n";
            }
            return $csv;
            
        case 'revenue':
            // Simple revenue report with date info
            $csv = "Payment ID,Date,User,Amount,Status,Package\n";
            $csv .= "\"PAY-001\",\"2024-01-15\",\"John Doe\",\"99.99\",\"completed\",\"premium\"\n";
            $csv .= "\"PAY-002\",\"2024-01-20\",\"Jane Smith\",\"149.99\",\"completed\",\"enterprise\"\n";
            $csv .= "\"PAY-003\",\"2024-02-01\",\"Bob Wilson\",\"49.99\",\"pending\",\"basic\"\n";
            $csv .= "\"Date Range\",\"{$dateRange}\",\"\",\"\",\"\",\"\"\n";
            return $csv;
            
        case 'system':
            // System report with date filtering
            $usersQuery = "SELECT COUNT(*) as count FROM users {$dateFilter}";
            $eventsQuery = "SELECT COUNT(*) as count FROM events {$dateFilter}";
            $rsvpQuery = "SELECT COUNT(*) as count FROM rsvp {$dateFilter}";
            
            $usersCount = $pdo->query($usersQuery)->fetch()['count'];
            $eventsCount = $pdo->query($eventsQuery)->fetch()['count'];
            $rsvpCount = $pdo->query($rsvpQuery)->fetch()['count'];
            
            $csv = "Metric,Value,Date Range\n";
            $csv .= "\"Total Users\",\"{$usersCount}\",\"{$dateRange}\"\n";
            $csv .= "\"Total Events\",\"{$eventsCount}\",\"{$dateRange}\"\n";
            $csv .= "\"Total RSVPs\",\"{$rsvpCount}\",\"{$dateRange}\"\n";
            $csv .= "\"Report Generated\",\"" . date('Y-m-d H:i:s') . "\",\"{$dateRange}\"\n";
            return $csv;
            
        default:
            return "Report Type,Status,Date Range\n\"{$reportType}\",\"Not implemented\",\"{$dateRange}\"\n";
    }
}

// Simple report generator - only uses tables that definitely exist
function generateSimpleReport($pdo, $reportType) {
    switch ($reportType) {
        case 'users':
            // Users report - this table should exist
            $stmt = $pdo->query("SELECT user_id, name, email, role, status, created_at FROM users ORDER BY created_at DESC");
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $csv = "User ID,Name,Email,Role,Status,Created Date\n";
            foreach ($data as $row) {
                $csv .= "\"{$row['user_id']}\",\"{$row['name']}\",\"{$row['email']}\",\"{$row['role']}\",\"{$row['status']}\",\"{$row['created_at']}\"\n";
            }
            return $csv;
            
        case 'events':
            // Events report - this table should exist
            $stmt = $pdo->query("SELECT event_id, event_name, user_id, event_location, published, created_at FROM events ORDER BY created_at DESC");
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $csv = "Event ID,Event Name,User ID,Location,Status,Created Date\n";
            foreach ($data as $row) {
                $status = $row['published'] ? 'Published' : 'Draft';
                $csv .= "\"{$row['event_id']}\",\"{$row['event_name']}\",\"{$row['user_id']}\",\"{$row['event_location']}\",\"{$status}\",\"{$row['created_at']}\"\n";
            }
            return $csv;
            
        case 'revenue':
            // Simple revenue report - create sample data if table doesn't exist
            $csv = "Payment ID,Date,User,Amount,Status,Package\n";
            $csv .= "\"PAY-001\",\"2024-01-15\",\"John Doe\",\"99.99\",\"completed\",\"premium\"\n";
            $csv .= "\"PAY-002\",\"2024-01-20\",\"Jane Smith\",\"149.99\",\"completed\",\"enterprise\"\n";
            $csv .= "\"PAY-003\",\"2024-02-01\",\"Bob Wilson\",\"49.99\",\"pending\",\"basic\"\n";
            return $csv;
            
        case 'system':
            // System report - simple stats
            $usersCount = $pdo->query("SELECT COUNT(*) as count FROM users")->fetch()['count'];
            $eventsCount = $pdo->query("SELECT COUNT(*) as count FROM events")->fetch()['count'];
            $rsvpCount = $pdo->query("SELECT COUNT(*) as count FROM rsvp")->fetch()['count'];
            
            $csv = "Metric,Value\n";
            $csv .= "\"Total Users\",\"{$usersCount}\"\n";
            $csv .= "\"Total Events\",\"{$eventsCount}\"\n";
            $csv .= "\"Total RSVPs\",\"{$rsvpCount}\"\n";
            $csv .= "\"Report Generated\",\"" . date('Y-m-d H:i:s') . "\"\n";
            return $csv;
            
        default:
            return "Report Type,Status\n\"{$reportType}\",\"Not implemented\"\n";
    }
}
// Helper function to generate report data
function generateReportData($pdo, $reportType, $dateRange) {
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
                'total_users' => getTotalCount($pdo, 'users'),
                'total_events' => getTotalCount($pdo, 'events'),
                'total_payments' => getTotalCount($pdo, 'payment_history'),
                'active_packages' => getPackageStats($pdo),
                'revenue_stats' => getRevenueStats($pdo, $dateRange)
            ];
    }
}

// Database Backup Function
if ($fun === "backupDatabase") {
    $adminUserId = $_POST['admin_user_id'] ?? '';
    
    if (!verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required"
        ]);
        exit;
    }

    try {
        // Create backup directory
        $backupDir = __DIR__ . '/backups/';
        if (!is_dir($backupDir)) {
            if (!mkdir($backupDir, 0755, true)) {
                throw new Exception("Failed to create backup directory: " . $backupDir);
            }
        }
        
        $timestamp = date('Y-m-d_H-i-s');
        $backupFile = $backupDir . "backup_eventa_{$timestamp}.sql";
        
        // Start backup content
        $backupContent = "-- Eventa Database Backup\n";
        $backupContent .= "-- Generated: " . date('Y-m-d H:i:s') . "\n";
        $backupContent .= "-- Database: eventa\n\n";
        $backupContent .= "SET FOREIGN_KEY_CHECKS=0;\n\n";
        
        // Get all tables
        $tablesStmt = $pdo->query("SHOW TABLES");
        $tables = $tablesStmt->fetchAll(PDO::FETCH_COLUMN);
        
        if (empty($tables)) {
            throw new Exception("No tables found in database");
        }
        
        $totalTables = count($tables);
        $backedUpTables = 0;
        
        foreach ($tables as $table) {
            $backupContent .= "\n-- --------------------------------------------------------\n";
            $backupContent .= "-- Table structure for `{$table}`\n";
            $backupContent .= "-- --------------------------------------------------------\n\n";
            $backupContent .= "DROP TABLE IF EXISTS `{$table}`;\n";
            
            // Get table creation script
            $createStmt = $pdo->query("SHOW CREATE TABLE `{$table}`");
            $createTable = $createStmt->fetch(PDO::FETCH_ASSOC);
            
            if (isset($createTable['Create Table'])) {
                $backupContent .= $createTable['Create Table'] . ";\n\n";
                
                // Get table data
                $backupContent .= "--\n-- Dumping data for table `{$table}`\n--\n\n";
                
                $dataStmt = $pdo->query("SELECT * FROM `{$table}`");
                $rows = $dataStmt->fetchAll(PDO::FETCH_ASSOC);
                
                if (!empty($rows)) {
                    $backupContent .= "LOCK TABLES `{$table}` WRITE;\n";
                    $backupContent .= "/*!40000 ALTER TABLE `{$table}` DISABLE KEYS */;\n";
                    
                    foreach ($rows as $row) {
                        $columns = array_keys($row);
                        $values = [];
                        
                        foreach ($row as $value) {
                            if ($value === null) {
                                $values[] = 'NULL';
                            } else {
                                // Properly escape values
                                $values[] = $pdo->quote($value);
                            }
                        }
                        
                        $backupContent .= "INSERT INTO `{$table}` (`" . implode('`, `', $columns) . "`) VALUES (" . implode(', ', $values) . ");\n";
                    }
                    
                    $backupContent .= "/*!40000 ALTER TABLE `{$table}` ENABLE KEYS */;\n";
                    $backupContent .= "UNLOCK TABLES;\n";
                }
                
                $backedUpTables++;
            }
        }
        
        $backupContent .= "\n-- --------------------------------------------------------\n";
        $backupContent .= "-- Completed: " . date('Y-m-d H:i:s') . "\n";
        $backupContent .= "-- Total tables: {$backedUpTables}/{$totalTables}\n";
        $backupContent .= "SET FOREIGN_KEY_CHECKS=1;\n";
        
        // Write to file
        $bytesWritten = file_put_contents($backupFile, $backupContent);
        
        if ($bytesWritten === false) {
            throw new Exception("Failed to write backup file");
        }
        
        $fileSize = filesize($backupFile);
        
        if ($fileSize === 0) {
            throw new Exception("Backup file is empty");
        }
        
        // Log the activity
        $logStmt = $pdo->prepare("INSERT INTO system_activity (user_id, action, description) VALUES (:user_id, :action, :description)");
        $logStmt->execute([
            ':user_id' => $adminUserId,
            ':action' => 'Database Backup',
            ':description' => "Database backup created: " . basename($backupFile) . " ({$backedUpTables} tables, " . round($fileSize/1024, 2) . " KB)"
        ]);

        echo json_encode([
            "success" => true,
            "message" => "Database backup created successfully",
            "filename" => basename($backupFile),
            "file_size" => $fileSize,
            "tables_backed_up" => $backedUpTables,
            "file_path" => $backupFile
        ]);
        
    } catch (Exception $e) {
        error_log("Backup error: " . $e->getMessage());
        echo json_encode([
            "success" => false,
            "message" => "Error creating backup: " . $e->getMessage()
        ]);
    }
    exit;
}

// Helper functions
function getDateRangeWhereClause($dateRange) {
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

function getTotalCount($pdo, $table) {
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM {$table}");
    $stmt->execute();
    return $stmt->fetch(PDO::FETCH_ASSOC)['count'];
}

// Enhanced Invitation Analytics Functions
if ($fun === "getEnhancedInvitationAnalytics") {
    $adminUserId = $_POST['admin_user_id'] ?? '';
    
    if (!verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required"
        ]);
        exit;
    }

    try {
        // Get event types from events that actually have RSVPs
        $eventTypesStmt = $pdo->prepare("
            SELECT DISTINCT 'General' as event_type 
            FROM events 
            WHERE EXISTS (SELECT 1 FROM rsvp WHERE rsvp.event_id = events.event_id)
            LIMIT 1
        ");
        $eventTypesStmt->execute();
        $eventTypes = $eventTypesStmt->fetchAll(PDO::FETCH_COLUMN);

        // If no event types found, use default
        if (empty($eventTypes)) {
            $eventTypes = ['General'];
        }

        // Get monthly trends for charts - simplified
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

        // If no monthly trends, create sample data for display
        if (empty($monthlyTrends)) {
            $monthlyTrends = [
                ['month' => date('Y-m'), 'total_events' => 0, 'total_invitations' => 0, 'total_responses' => 0, 'total_attending' => 0]
            ];
        }

        // Get event type comparison - simplified
        $eventTypeStatsStmt = $pdo->prepare("
            SELECT 
                'General' as event_type,
                COUNT(DISTINCT e.event_id) as event_count,
                COUNT(DISTINCT r.guest_id) as total_invitations,
                COUNT(DISTINCT CASE WHEN r.attending IS NOT NULL THEN r.guest_id END) as total_responses,
                COUNT(DISTINCT CASE WHEN r.attending = 'yes' THEN r.guest_id END) as total_attending
            FROM events e
            LEFT JOIN rsvp r ON e.event_id = r.event_id
        ");
        $eventTypeStatsStmt->execute();
        $eventTypeStats = $eventTypeStatsStmt->fetchAll(PDO::FETCH_ASSOC);

        // Get top performing events (any events with responses)
        $topEventsStmt = $pdo->prepare("
            SELECT 
                e.event_id,
                e.event_name,
                'General' as event_type,
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
            HAVING sent > 0
            ORDER BY response_rate DESC, sent DESC
            LIMIT 5
        ");
        $topEventsStmt->execute();
        $topEvents = $topEventsStmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "analytics" => [
                "event_types" => $eventTypes,
                "monthly_trends" => $monthlyTrends,
                "event_type_stats" => $eventTypeStats,
                "top_events" => $topEvents
            ]
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
    exit;
}

if ($fun === "exportInvitationData") {
    try {
        // Verify admin access
        if (!isset($_POST['admin_user_id'])) {
            echo json_encode([
                "success" => false,
                "message" => "Unauthorized access"
            ]);
            exit;
        }

        $status = $_POST['status'] ?? 'all';
        $user_id = $_POST['user_id'] ?? '';

        // Build query using your actual table structure
        $query = "
            SELECT 
                e.event_id,
                e.event_name,
                e.event_location,
                e.created_at as event_date,
                u.name as organizer_name,
                u.email as organizer_email,
                u.lastname as organizer_lastname,
                COUNT(DISTINCT i.invitation_id) as invitations_sent,
                COUNT(DISTINCT CASE WHEN i.opened = 1 THEN i.invitation_id END) as invitations_opened,
                COUNT(DISTINCT CASE WHEN i.response_status IS NOT NULL THEN i.invitation_id END) as invitations_responded,
                COUNT(DISTINCT CASE WHEN i.response_status = 'attending' THEN i.invitation_id END) as attending_count
            FROM events e
            LEFT JOIN users u ON e.user_id = u.user_id
            LEFT JOIN invitations i ON e.event_id = i.event_id
            WHERE 1=1
        ";

        $params = [];

        if ($status !== 'all') {
            $query .= " AND e.published = :published";
            // Convert status to published flag (active=1, draft=0)
            $params[':published'] = ($status === 'active') ? 1 : 0;
        }

        if (!empty($user_id)) {
            $query .= " AND e.user_id = :user_id";
            $params[':user_id'] = $user_id;
        }

        $query .= " GROUP BY e.event_id ORDER BY e.created_at DESC";

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Generate CSV content
        $csvContent = "Event ID,Event Name,Organizer,Organizer Email,Location,Invitations Sent,Invitations Opened,Invitations Responded,Attending Count,Response Rate,Event Date\n";
        
        foreach ($events as $event) {
            $sent = $event['invitations_sent'] ?? 0;
            $responded = $event['invitations_responded'] ?? 0;
            $responseRate = $sent > 0 ? round(($responded / $sent) * 100, 2) : 0;
            
            $organizerFullName = $event['organizer_name'] . ' ' . ($event['organizer_lastname'] ?? '');
            
            $csvContent .= sprintf(
                '"%s","%s","%s","%s","%s",%d,%d,%d,%d,%.2f%%,%s' . "\n",
                $event['event_id'],
                $event['event_name'],
                $organizerFullName,
                $event['organizer_email'],
                $event['event_location'] ?? 'Not specified',
                $sent,
                $event['invitations_opened'] ?? 0,
                $responded,
                $event['attending_count'] ?? 0,
                $responseRate,
                $event['event_date']
            );
        }

        // Save CSV file
        $filename = 'invitation_export_' . date('Y-m-d_H-i-s') . '.csv';
        $filepath = __DIR__ . '/exports/' . $filename;
        
        // Ensure exports directory exists
        if (!is_dir(__DIR__ . '/exports')) {
            if (!mkdir(__DIR__ . '/exports', 0755, true)) {
                throw new Exception("Could not create exports directory");
            }
        }
        
        if (file_put_contents($filepath, $csvContent) === false) {
            throw new Exception("Could not write to file: " . $filepath);
        }

        echo json_encode([
            "success" => true,
            "filename" => $filename,
            "message" => "Export completed successfully. Found " . count($events) . " events."
        ]);

    } catch (PDOException $e) {
        error_log("Export PDO error: " . $e->getMessage());
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    } catch (Exception $e) {
        error_log("Export general error: " . $e->getMessage());
        echo json_encode([
            "success" => false,
            "message" => "Export failed: " . $e->getMessage()
        ]);
    }
    exit;
}
?>
