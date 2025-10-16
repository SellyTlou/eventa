<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

require_once "dbConnection.php";

$db  = new Database();
$pdo = $db->getConnection(); 

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
        $stmt           = $pdo->prepare("INSERT INTO users (user_id, name,lastname, email, password)
                               VALUES (:user_id, :name, :lastname, :email, :password)");
        $stmt->execute([
            ":user_id"  => $userID,
            ":name"     => $name,
            ":lastname" => $lastname,
            ":email"    => $email,
            ":password" => $hashedPassword,
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
        $stmt           = $pdo->prepare("INSERT INTO users (user_id, name, email, password)
                VALUES (:user_id, :name, :email, :password)");
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
            // Update existing
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
        } else {
            // Insert new
            $stmt = $pdo->prepare("INSERT INTO events
                (user_id, user_name, event_id, event_name, event_start_date, event_start_time,
                 event_end_date, event_end_time, event_location, event_image, design_data, created_at, updated_at)
                VALUES
                (:user_id, :user_name, :event_id, :event_name, :event_start_date, :event_start_time,
                 :event_end_date, :event_end_time, :event_location, :event_image, :design_data, :created_at, :updated_at)
            ");
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
        $stmt = $pdo->prepare("SELECT SUM(guest_count) AS total_guests FROM rsvp WHERE event_id = :event_id AND attending = 'yes' ");
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
            "success" => false,
            "message" => "Missing event ID",
            "guestCount" => 0
        ]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT guest_limit FROM events WHERE event_id = :event_id ");
        $stmt->execute([":event_id" => $event_id]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($data) {
            echo json_encode([
                "success" => true,
                "geustLimit" => $data
            ]);
        } else {
            echo json_encode([
                "success" => false,
                 "message" => "cant get guest limit: " . $e->getMessage(),
                "geustLimit" => ["guest_count" => 0]
            ]);
        }
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
            "geustLimit" => 0
        ]);
    }
    exit;
}

if ($fun === "update_password") {
    $email = $_POST['email'] ?? '';
    $new_password = $_POST['new_password'] ?? '';

    if (empty($email) || empty($new_password)) {
        echo json_encode(["success" => false, "message" => "Missing required fields"]);
        exit;
    }

    try {
        // Check if user exists
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
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