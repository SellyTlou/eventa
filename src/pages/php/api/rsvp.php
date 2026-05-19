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

function generateGuestID()
{
    $random = substr(str_shuffle("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@!*&^%$"), 0, 6);
    $time = time();
    return "GUEST-" . $random . "-" . $time;
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

$fun = $_POST['function'] ?? $_POST['fun'] ?? '';

if ($fun === "guestRsvp") {
    $guest_id = generateGuestID();
    $event_id = $_POST['event_id'] ?? '';
    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $phone = trim($_POST['phone'] ?? ''); // Keep this for rsvp table if it exists
    $attending = $_POST['attending'] ?? '';
    $message = trim($_POST['message'] ?? '');
    $guestCount = (int) ($_POST['guestCount'] ?? 0);
    $totalRplyGuestCount = (int) ($_POST['totalRplyGuestCount'] ?? 0);
    $totalEventLimit = (int) ($_POST['totalEventLimit'] ?? 0);

    $totalGuests = ($attending === 'yes') ? ($guestCount + 1) : 0;

    // Validation
    if (empty($event_id) || empty($name) || empty($email) || empty($attending)) {
        echo json_encode([
            "success" => false,
            "message" => "Missing required fields: event_id, name, email, or attending",
        ]);
        exit;
    }

    try {
        $pdo->beginTransaction();

        // === 1. Check capacity ===
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

        // === 2. Check if guest already RSVP'd ===
        $checkStmt = $pdo->prepare("
            SELECT guest_id FROM rsvp
            WHERE event_id = :event_id AND email = :email
        ");
        $checkStmt->execute([
            ':event_id' => $event_id,
            ':email' => $email,
        ]);
        $existingGuest = $checkStmt->fetch(PDO::FETCH_ASSOC);

        // === 3. Insert or Update RSVP ===
        if ($existingGuest) {
            $updateStmt = $pdo->prepare("
                UPDATE rsvp
                SET name = :name,
                    attending = :attending,
                    guest_count = :guest_count,
                    updated_at = NOW()
                WHERE guest_id = :guest_id
            ");
            $updateStmt->execute([
                ':name' => $name,
                ':attending' => $attending,
                ':guest_count' => $totalGuests,
                ':guest_id' => $existingGuest['guest_id'],
            ]);

            $final_guest_id = $existingGuest['guest_id'];
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO rsvp
                (guest_id, event_id, name, email, attending, guest_count, created_at)
                VALUES (:guest_id, :event_id, :name, :email, :attending, :guest_count, NOW())
            ");
            $stmt->execute([
                ':guest_id' => $guest_id,
                ':event_id' => $event_id,
                ':name' => $name,
                ':email' => $email,
                ':attending' => $attending,
                ':guest_count' => $totalGuests,
            ]);

            $final_guest_id = $guest_id;
        }

        // === 4. Save Message to rsvp_messages (if not empty) ===
        // Note: rsvp_messages table does NOT have guest_phone column
        if (!empty($message)) {
            $msgStmt = $pdo->prepare("
                INSERT INTO rsvp_messages
                (event_id, guest_id, guest_name, guest_email, message, created_at)
                VALUES (:event_id, :guest_id, :guest_name, :guest_email, :message, NOW())
                ON DUPLICATE KEY UPDATE
                    message = VALUES(message),
                    created_at = NOW()
            ");
            $msgStmt->execute([
                ':event_id' => $event_id,
                ':guest_id' => $final_guest_id,
                ':guest_name' => $name,
                ':guest_email' => $email,
                ':message' => $message,
            ]);
        }

        $pdo->commit();

        echo json_encode([
            "success" => true,
            "message" => $existingGuest ? "RSVP updated!" : "RSVP submitted!",
            "guest_id" => $final_guest_id,
        ]);

    } catch (PDOException $e) {
        $pdo->rollBack();
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
        ]);
    }
    exit;
} elseif ($fun === "getRSVPResponses") {
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
            "success" => true,
            "responses" => $responses,
            "event" => $event,
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
        ]);
    }
    exit;
} elseif ($fun === "getRsvpGuestCount") {
    $event_id = $_POST['event_id'] ?? '';

    if (empty($event_id)) {
        echo json_encode([
            "success" => false,
            "message" => "Missing event ID",
            "guestCount" => 0,
        ]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT SUM(guest_count) AS total_guests FROM rsvp WHERE event_id = :event_id AND attending = 'yes'");
        $stmt->execute([":event_id" => $event_id]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);

        $totalGuests = $data['total_guests'] ?? 0;

        echo json_encode([
            "success" => true,
            "guestCount" => (int) $totalGuests,
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
            "guestCount" => 0,
        ]);
    }
    exit;
} elseif ($fun === "getEventGuestLimit") {
    $event_id = $_POST['event_id'] ?? '';

    if (empty($event_id)) {
        echo json_encode([
            "success" => false,
            "message" => "Missing event ID",
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
                "success" => true,
                "guestLimit" => $data,
            ]);
        } else {
            echo json_encode([
                "success" => false,
                "message" => "No guest limit found for this event.",
                "guestLimit" => ["guest_limit" => 0],
            ]);
        }
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
            "guestLimit" => 0,
        ]);
    }
    exit;
} elseif ($fun === "getEventCustomQuestions") {
    $event_id = $_POST['event_id'] ?? '';

    if (empty($event_id)) {
        echo json_encode(["success" => false, "message" => "Event ID is required"]);
        exit;
    }

    try {
        echo json_encode(["success" => true, "questions" => []]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => $e->getMessage()]);
    }
    exit;
} elseif ($fun === "getInvitationStats") {
    $adminUserId = $_POST['admin_user_id'] ?? '';

    if (!verifyAdminAccess($pdo, $adminUserId)) {
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized: Admin access required",
        ]);
        exit;
    }

    try {
        // Total invitations sent (total RSVP records for non-deleted events)
        $stmt = $pdo->prepare("SELECT COUNT(*) as total_invitations FROM rsvp r JOIN events e ON r.event_id = e.event_id WHERE (e.is_deleted = 0 OR e.is_deleted IS NULL)");
        $stmt->execute();
        $totalInvitations = $stmt->fetch(PDO::FETCH_ASSOC)['total_invitations'];

        // Calculate open rate (percentage of RSVPs with any response for non-deleted events)
        $stmt = $pdo->prepare("
            SELECT
                COUNT(*) as total_rsvp,
                COUNT(CASE WHEN r.attending IS NOT NULL THEN 1 END) as responded
            FROM rsvp r
            JOIN events e ON r.event_id = e.event_id
            WHERE (e.is_deleted = 0 OR e.is_deleted IS NULL)
        ");
        $stmt->execute();
        $responseStats = $stmt->fetch(PDO::FETCH_ASSOC);

        $openRate = $responseStats['total_rsvp'] > 0 ?
            min(100, round(($responseStats['responded'] / $responseStats['total_rsvp']) * 100, 1)) : 0;

        // Calculate response rate (percentage of "yes" responses for non-deleted events)
        $stmt = $pdo->prepare("
            SELECT
                COUNT(*) as total_rsvp,
                COUNT(CASE WHEN r.attending = 'yes' THEN 1 END) as attending
            FROM rsvp r
            JOIN events e ON r.event_id = e.event_id
            WHERE (e.is_deleted = 0 OR e.is_deleted IS NULL)
        ");
        $stmt->execute();
        $attendingStats = $stmt->fetch(PDO::FETCH_ASSOC);

        $responseRate = $attendingStats['total_rsvp'] > 0 ?
            min(100, round(($attendingStats['attending'] / $attendingStats['total_rsvp']) * 100, 1)) : 0;

        echo json_encode([
            "success" => true,
            "stats" => [
                "total_invitations" => (int) $totalInvitations,
                "open_rate" => (float) $openRate,
                "response_rate" => (float) $responseRate,
            ],
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
        ]);
    }
    exit;
} else {
    echo json_encode(['error' => 'Invalid function']);
}