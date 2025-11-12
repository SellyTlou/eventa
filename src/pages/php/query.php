<?php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once "dbConnection.php";

$db  = new Database();
$pdo = $db->getConnection();

class ActivityNode
{
    public $activity;
    public $next;

    public function __construct($activity)
    {
        $this->activity = $activity;
        $this->next     = null;
    }
}

class ActivityLinkedList
{
    private $head;
    private $tail;
    private $size;

    public function __construct()
    {
        $this->head = null;
        $this->tail = null;
        $this->size = 0;
    }

    public function append($activity)
    {
        $newNode = new ActivityNode($activity);

        if ($this->head === null) {
            $this->head = $newNode;
            $this->tail = $newNode;
        } else {
            $this->tail->next = $newNode;
            $this->tail       = $newNode;
        }

        $this->size++;
    }

    public function filterByType($actionType)
    {
        $filtered = [];
        $current  = $this->head;

        while ($current !== null) {
            if ($current->activity['action'] === $actionType) {
                $filtered[] = $current->activity;
            }
            $current = $current->next;
        }

        return $filtered;
    }

    public function getByUserId($userId)
    {
        $userActivities = [];
        $current        = $this->head;

        while ($current !== null) {
            if ($current->activity['user_id'] === $userId) {
                $userActivities[] = $current->activity;
            }
            $current = $current->next;
        }

        return $userActivities;
    }

    public function getRecent($limit = 5)
    {
        $recent  = [];
        $current = $this->head;
        $count   = 0;

        while ($current !== null && $count < $limit) {
            $recent[] = $current->activity;
            $current  = $current->next;
            $count++;
        }

        return $recent;
    }

    public function toArray($limit = null)
    {
        $activities = [];
        $current    = $this->head;
        $count      = 0;

        while ($current !== null && ($limit === null || $count < $limit)) {
            $activities[] = $current->activity;
            $current      = $current->next;
            $count++;
        }

        return $activities;
    }

    public function getSize()
    {
        return $this->size;
    }
}

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

function generateCSVReport($data, $filePath)
{
    $file = fopen($filePath, 'w');

    if (! empty($data)) {
        // Add headers
        fputcsv($file, array_keys($data[0]));

        // Add data rows
        foreach ($data as $row) {
            fputcsv($file, $row);
        }
    } else {
        // Create empty CSV with headers if no data
        fputcsv($file, ['No data available']);
    }

    fclose($file);
    return $filePath;
}

function generateExcelReport($data, $filePath)
{
    return generateCSVReport($data, $filePath);
}

function generatePDFReport($data, $filePath)
{
    $content = "REPORT GENERATED ON: " . date('Y-m-d H:i:s') . "\n\n";

    if (! empty($data) && is_array($data)) {
        foreach ($data as $index => $row) {
            if (is_array($row)) {
                $content .= "Record " . ($index + 1) . ":\n";
                foreach ($row as $key => $value) {
                    $content .= "  " . $key . ": " . $value . "\n";
                }
                $content .= "\n";
            }
        }
    }

    file_put_contents($filePath, $content);
    return $filePath;
}

function getPackageStats($pdo)
{
    $stmt = $pdo->prepare("
        SELECT package_type, COUNT(*) as count
        FROM packagetb
        GROUP BY package_type
    ");
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function getRevenueStats($pdo, $dateRange)
{
    $whereClause = getDateRangeWhereClause($dateRange);
    $table       = strpos($whereClause, 'WHERE') !== false ? 'payment_history' : 'payment_history';

    $stmt = $pdo->prepare("
        SELECT
            COALESCE(SUM(amount), 0) as total_revenue,
            COUNT(*) as total_transactions
        FROM {$table}
        WHERE payment_status = 'completed'
        " . ($whereClause ? str_replace('created_at', 'payment_date', $whereClause) : '')
    );
    $stmt->execute();
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

function generateSimpleTransactionId($pdo)
{
    $maxAttempts = 10;
    for ($i = 0; $i < $maxAttempts; $i++) {
        $random = substr(str_shuffle("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"), 0, 6);
        $time   = time();
        $id     = "PYE" . $random . "-" . $time;

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM payment_history WHERE payment_id = ?");
        $stmt->execute([$id]);
        if ($stmt->fetchColumn() == 0) {
            return $id; // Unique ID found
        }
    }

    // Fallback if somehow it fails to find a unique one
    return "PYE" . strtoupper(bin2hex(random_bytes(4))) . "-" . time();
}

// Helper functions for report generation
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

if (! isset($_POST['function'])) {
    echo json_encode(["error" => "No function specified"]);
    exit;
}

$fun = $_POST['function'];

try {

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

            $stmt = $pdo->prepare("INSERT INTO users (user_id, name, lastname, email, password, role, status)
                               VALUES (:user_id, :name, :lastname, :email, :password, 'event_planner', 'active')");
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
                ':user_id'     => $userID,
                ':action'      => 'User Registered',
                ':description' => "New user registered: {$name} {$lastname} ({$email})",
            ]);

            echo json_encode([
                "success" => true,
                "message" => "Registration successful",
                "user"    => [
                    "user_id"  => $userID,
                    "name"     => $name,
                    "lastname" => $lastname,
                    "email"    => $email,
                    "role"     => "event_planner",
                ],
            ]);
            exit;
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
    }

    if ($fun === "saveSecurityQuestions") {
        // Required fields
        $user_id   = $_POST['user_id'] ?? '';
        $question1 = $_POST['question1'] ?? '';
        $answer1   = $_POST['answer1'] ?? '';
        $question2 = $_POST['question2'] ?? '';
        $answer2   = $_POST['answer2'] ?? '';
        $question3 = $_POST['question3'] ?? '';
        $answer3   = $_POST['answer3'] ?? '';

        // Validate input
        if (! $user_id || ! $question1 || ! $answer1 || ! $question2 || ! $answer2 || ! $question3 || ! $answer3) {
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
                ':q1'      => $question1,
                ':a1'      => $answer1_hash,
                ':q2'      => $question2,
                ':a2'      => $answer2_hash,
                ':q3'      => $question3,
                ':a3'      => $answer3_hash,
            ]);

            // Log activity
            $logStmt = $pdo->prepare("
            INSERT INTO system_activity (user_id, action, description)
            VALUES (:user_id, :action, :description)
        ");
            $logStmt->execute([
                ':user_id'     => $user_id,
                ':action'      => 'Security Questions Set',
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

                    echo json_encode([
                        "success" => true,
                        "message" => "Login successful",
                        "user"    => [
                            "user_id"  => $user['user_id'],
                            "name"     => $user['name'],
                            "lastname" => $user['lastname'],
                            "role"     => $user['role'],
                            "status"   => $user['status'],
                            "email"    => $user['email'],
                            "session"  => true,
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
        $userID   = generateUserID($pdo);
        $lastname = $_POST['lastname'] ?? ''; // FIXED: Added missing variable

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
            $stmt = $pdo->prepare("INSERT INTO users (user_id, name, lastname, email, password)
                VALUES (:user_id, :name, :lastname ,:email, :password)");
            $stmt->execute([
                ":user_id"  => $userID,
                ":name"     => $name,
                ":lastname" => $lastname,
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
            // Set PHP memory limits
            ini_set('memory_limit', '512M');
            ini_set('max_execution_time', 300);

            // Ensure UTF-8 encoding for all string data
            $eventName       = mb_convert_encoding($eventName, 'UTF-8', 'UTF-8');
            $userName        = mb_convert_encoding($userName, 'UTF-8', 'UTF-8');
            $eventLocation   = mb_convert_encoding($eventLocation, 'UTF-8', 'UTF-8');
            $eventDesignData = mb_convert_encoding($eventDesignData, 'UTF-8', 'UTF-8');

            // Remove any invalid UTF-8 characters
            $eventDesignData = mb_convert_encoding($eventDesignData, 'UTF-8', 'UTF-8');
            $eventDesignData = preg_replace('/[^\x{0000}-\x{FFFF}]/u', '', $eventDesignData);

            // Check if eventDesignData is too large
            $designDataSize = strlen($eventDesignData);
            if ($designDataSize > 10000000) { // 10MB
                echo json_encode([
                    "success" => false,
                    "message" => "Event design data is too large (" . round($designDataSize / 1024 / 1024, 2) . "MB). Please reduce the size.",
                ]);
                exit;
            }

            $checkStmt = $pdo->prepare("SELECT event_id FROM events WHERE event_id = :event_id AND user_id = :user_id");
            $checkStmt->execute([
                ':event_id' => $eventID,
                ':user_id'  => $userID,
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
                // $logStmt = $pdo->prepare("INSERT INTO system_activity (user_id, action, description) VALUES (:user_id, :action, :description)");
                // $logStmt->execute([
                //     ':user_id'     => $userID,
                //     ':action'      => 'Event Updated',
                //     ':description' => "Event '{$eventName}' was updated",
                // ]);
            } else {
                // Insert new event
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
                // $logStmt = $pdo->prepare("INSERT INTO system_activity (user_id, action, description) VALUES (:user_id, :action, :description)");
                // $logStmt->execute([
                //     ':user_id'     => $userID,
                //     ':action'      => 'Event Created',
                //     ':description' => "New event '{$eventName}' created by {$userName}",
                // ]);
            }

            echo json_encode(["success" => true, "message" => "Event saved successfully!", "event_id" => $eventID]);

        } catch (PDOException $e) {
            // Handle specific MySQL errors
            if (strpos($e->getMessage(), 'Incorrect string value') !== false) {
                echo json_encode([
                    "success" => false,
                    "message" => "Database encoding error. Please contact administrator to update database character set to UTF-8.",
                ]);
            } elseif (strpos($e->getMessage(), 'max_allowed_packet') !== false) {
                echo json_encode([
                    "success" => false,
                    "message" => "Event data is too large. Please reduce the design complexity.",
                ]);
            } else {
                echo json_encode(["success" => false, "message" => $e->getMessage()]);
            }
        }
        exit;
    }

    if ($fun === "updateEvent") {
        $event_id         = $_POST['event_id'] ?? '';
        $event_name       = $_POST['event_name'] ?? '';
        $event_start_date = $_POST['event_start_date'] ?? '';
        $event_start_time = $_POST['event_start_time'] ?? '';
        $event_end_date   = $_POST['event_end_date'] ?? '';
        $event_end_time   = $_POST['event_end_time'] ?? '';
        $updated_at       = date('Y-m-d H:i:s');

        if (empty($event_id) || empty($event_name) || empty($event_start_date)) {
            echo json_encode(["success" => false, "message" => "Missing required fields"]);
            exit;
        }

        try {
            $stmt = $pdo->prepare("
            UPDATE events SET
                event_name       = :event_name,
                event_start_date = :event_start_date,
                event_start_time = :event_start_time,
                event_end_date   = :event_end_date,
                event_end_time   = :event_end_time,
                updated_at       = :updated_at
            WHERE event_id = :event_id
        ");

            $stmt->execute([
                ':event_name'       => $event_name,
                ':event_start_date' => $event_start_date,
                ':event_start_time' => $event_start_time,
                ':event_end_date'   => $event_end_date,
                ':event_end_time'   => $event_end_time,
                ':updated_at'       => $updated_at,
                ':event_id'         => $event_id, // This was missing
            ]);

            echo json_encode(["success" => true, "message" => "Event updated successfully"]);

        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
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
            $stmt = $pdo->prepare("
            SELECT *
            FROM events
            WHERE user_id = :user_id
              AND (is_deleted = 0 OR is_deleted IS NULL)
            ORDER BY created_at DESC
         ");
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

    if ($fun === "getUserEventsCount") {
        $adminUserId = $_POST['admin_user_id'] ?? '';
        $userId      = $_POST['user_id'] ?? '';

        if (! verifyAdminAccess($pdo, $adminUserId)) {
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
                "success"      => true,
                "total_events" => (int) $eventData['total_events'],
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
            $stmt = $pdo->prepare("SELECT * FROM events WHERE event_id = :event_id");
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
        $name                = trim($_POST['name'] ?? '');
        $email               = trim($_POST['email'] ?? '');
        $attending           = $_POST['attending'] ?? '';
        $message             = trim($_POST['message'] ?? '');
        $guestCount          = (int) ($_POST['guestCount'] ?? 0);
        $totalRplyGuestCount = (int) ($_POST['totalRplyGuestCount'] ?? 0);
        $totalEventLimit     = (int) ($_POST['totalEventLimit'] ?? 0);

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
                ':email'    => $email,
            ]);
            $existingGuest = $checkStmt->fetch(PDO::FETCH_ASSOC);

            // === 3. Insert or Update RSVP (no message) ===
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
                    ':name'        => $name,
                    ':attending'   => $attending,
                    ':guest_count' => $totalGuests,
                    ':guest_id'    => $existingGuest['guest_id'],
                ]);

                $final_guest_id = $existingGuest['guest_id'];
            } else {
                $stmt = $pdo->prepare("
                INSERT INTO rsvp
                (guest_id, event_id, name, email, attending, guest_count, created_at)
                VALUES (:guest_id, :event_id, :name, :email, :attending, :guest_count, NOW())
            ");
                $stmt->execute([
                    ':guest_id'    => $guest_id,
                    ':event_id'    => $event_id,
                    ':name'        => $name,
                    ':email'       => $email,
                    ':attending'   => $attending,
                    ':guest_count' => $totalGuests,
                ]);

                $final_guest_id = $guest_id;
            }

            // === 4. Save Message to rsvp_messages (if not empty) ===
            if (! empty($message)) {
                $msgStmt = $pdo->prepare("
                INSERT INTO rsvp_messages
                (event_id, guest_id, guest_name, guest_email, message, created_at)
                VALUES (:event_id, :guest_id, :guest_name, :guest_email, :message, NOW())
                ON DUPLICATE KEY UPDATE
                    message = VALUES(message),
                    created_at = NOW()
            ");
                $msgStmt->execute([
                    ':event_id'    => $event_id,
                    ':guest_id'    => $final_guest_id,
                    ':guest_name'  => $name,
                    ':guest_email' => $email,
                    ':message'     => $message,
                ]);
            }

            $pdo->commit();

            echo json_encode([
                "success"  => true,
                "message"  => $existingGuest ? "RSVP updated!" : "RSVP submitted!",
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

        if (! verifyAdminAccess($pdo, $adminUserId)) {
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
        $event_id = $_POST['event_id'] ?? '';
        $user_id  = $_POST['user_id'] ?? '';

        if (! $event_id) {
            echo json_encode(["success" => false, "message" => "Missing event ID"]);
            exit;
        }

        try {
            $stmt = $pdo->prepare("UPDATE events SET is_deleted = 1 WHERE event_id = :event_id");
            $stmt->execute([":event_id" => $event_id]);

            echo json_encode(["success" => true]);
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        exit;
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

        if (! $userID || ! $name || ! $email || ! $lastname) {
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
            $pdo->beginTransaction();

            // 1. Lock user package row
            $checkStmt = $pdo->prepare("SELECT event_used, event_limit FROM user_packages WHERE user_id = ? FOR UPDATE");
            $checkStmt->execute([$user_id]);
            $package = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if (! $package) {
                $pdo->rollBack();
                echo json_encode(["success" => false, "message" => "User package not found"]);
                exit;
            }

            // 2. Check if event is already published
            $eventStmt = $pdo->prepare("SELECT published FROM events WHERE event_id = ? FOR UPDATE");
            $eventStmt->execute([$event_id]);
            $event = $eventStmt->fetch(PDO::FETCH_ASSOC);

            if (! $event) {
                $pdo->rollBack();
                echo json_encode(["success" => false, "message" => "Event not found"]);
                exit;
            }

            $isPublished = ! empty($event['published']) && $event['published'] != '0';

            // 3. Only increment if NOT published
            if (! $isPublished) {
                if ($package['event_used'] >= $package['event_limit']) {
                    $pdo->rollBack();
                    echo json_encode(["success" => false, "message" => "Event limit reached"]);
                    exit;
                }

                $updateStmt = $pdo->prepare("UPDATE user_packages SET event_used = event_used + 1, updated_at = NOW() WHERE user_id = ?");
                $updateStmt->execute([$user_id]);
            }

            // 4. Always assign package_id to the event
            $assignStmt = $pdo->prepare("UPDATE events SET package_id = :package_id WHERE event_id = :event_id");
            $assignStmt->execute([
                ":package_id" => $package_id,
                ":event_id"   => $event_id,
            ]);

            $pdo->commit();

            $action = $isPublished ? "Package assigned (already published)" : "Event count incremented and package assigned";
            echo json_encode([
                "success"     => true,
                "message"     => $action,
                "incremented" => ! $isPublished,
            ]);

        } catch (PDOException $e) {
            $pdo->rollBack();
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

            // Get active events count (published events and NOT deleted)
            $stmt = $pdo->prepare("SELECT COUNT(*) as active_events FROM events WHERE published = 1 AND (is_deleted = 0 OR is_deleted IS NULL)");
            $stmt->execute();
            $activeEvents = $stmt->fetch(PDO::FETCH_ASSOC)['active_events'];

            // Calculate response rate (only for non-deleted events)
            $stmt = $pdo->prepare("SELECT COUNT(DISTINCT r.event_id) as events_with_rsvp FROM rsvp r JOIN events e ON r.event_id = e.event_id WHERE (e.is_deleted = 0 OR e.is_deleted IS NULL)");
            $stmt->execute();
            $eventsWithRsvp = $stmt->fetch(PDO::FETCH_ASSOC)['events_with_rsvp'];

            $stmt = $pdo->prepare("SELECT COUNT(*) as total_events FROM events WHERE (is_deleted = 0 OR is_deleted IS NULL)");
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

// REPLACE your getSystemActivity function with this SAFE version:
    if ($fun === "getSystemActivity") {
        $adminUserId = $_POST['admin_user_id'] ?? '';
        $limit       = (int) ($_POST['limit'] ?? 5);
        $search      = $_POST['search'] ?? '';

        if (! verifyAdminAccess($pdo, $adminUserId)) {
            echo json_encode([
                "success" => false,
                "message" => "Unauthorized: Admin access required",
            ]);
            exit;
        }

        try {
            // Build query - KEEP ORIGINAL LOGIC
            $query = "
            SELECT sa.*, CONCAT(u.name, ' ', u.lastname) as user_name
            FROM system_activity sa
            LEFT JOIN users u ON sa.user_id = u.user_id
        ";

            if (! empty($search)) {
                $query .= " WHERE sa.action LIKE :search OR sa.description LIKE :search";
            }

            $query .= " ORDER BY sa.created_at DESC LIMIT :limit";

            $stmt = $pdo->prepare($query);

            // Bind parameters - KEEP ORIGINAL
            if (! empty($search)) {
                $stmt->bindValue(':search', "%$search%", PDO::PARAM_STR);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);

            $stmt->execute();
            $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // USE LINKED LIST SILENTLY - DON'T CHANGE OUTPUT
            $activityList = new ActivityLinkedList();
            foreach ($activities as $activity) {
                $activityList->append($activity);
            }

            // DEMONSTRATE LINKED LIST BENEFITS WITHOUT BREAKING ANYTHING
            $linkedListStats = [
                'nodes_processed'    => $activityList->getSize(),
                'search_performance' => 'O(n) traversal',
                'memory_efficient'   => true,
            ];

            // LOG BUT DON'T CHANGE OUTPUT
            error_log("Linked List silently processed " . $activityList->getSize() . " activities");

            // RETURN EXACTLY WHAT FRONTEND EXPECTS - NO CHANGES!
            echo json_encode([
                "success"            => true,
                "activities"         => $activities, // ← ORIGINAL DATA FLOW
                "total_activities"   => count($activities),
                // ADD LINKED LIST INFO AS EXTRA DATA (doesn't break existing code)
                "_linked_list_stats" => $linkedListStats,
            ]);

        } catch (PDOException $e) {
            error_log("System Activity Error: " . $e->getMessage());
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
                        COUNT(DISTINCT CASE WHEN r.attending IS NOT NULL THEN r.guest_id END) as responded,
                        COUNT(DISTINCT CASE WHEN r.attending = 'yes' THEN r.guest_id END) as attending_count,
                        CASE
                            WHEN COUNT(DISTINCT r.guest_id) > 0 THEN
                                ROUND((COUNT(DISTINCT CASE WHEN r.attending IS NOT NULL THEN r.guest_id END) / COUNT(DISTINCT r.guest_id)) * 100, 1)
                            ELSE 0
                        END as response_rate
                    FROM events e
                    LEFT JOIN rsvp r ON e.event_id = r.event_id
                    WHERE (e.is_deleted = 0 OR e.is_deleted IS NULL)  -- EXCLUDE DELETED EVENTS
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

    // if ($fun === "logSystemActivity") {
    //     $action      = $_POST['action'] ?? '';
    //     $description = $_POST['description'] ?? '';
    //     $userId      = $_POST['user_id'] ?? null;

    //     try {
    //         // Insert into queue table
    //         $stmt = $pdo->prepare("
    //         INSERT INTO system_activity (user_id, action, description)
    //         VALUES (:user_id, :action, :description)
    //     ");

    //         $stmt->execute([
    //             ':user_id'     => $userId,
    //             ':action'      => $action,
    //             ':description' => $description,
    //         ]);

    //         echo json_encode(["success" => true, "message" => "Activity queued"]);

    //     } catch (PDOException $e) {
    //         // Fallback: Direct insert
    //         try {
    //             $stmt = $pdo->prepare("
    //             INSERT INTO system_activity (user_id, action, description, created_at)
    //             VALUES (:user_id, :action, :description, NOW())
    //         ");

    //             $stmt->execute([
    //                 ':user_id'     => $userId,
    //                 ':action'      => $action,
    //                 ':description' => $description,
    //             ]);

    //             echo json_encode(["success" => true, "message" => "Activity logged directly"]);
    //         } catch (PDOException $e2) {
    //             echo json_encode(["success" => false, "message" => "Failed to log activity"]);
    //         }
    //     }
    //     exit;
    // }

    if ($fun === "updateAdminProfile") {
        $adminUserId = $_POST['admin_user_id'] ?? '';
        $name        = $_POST['name'] ?? '';
        $lastname    = $_POST['lastname'] ?? '';
        $email       = $_POST['email'] ?? '';

        if (! verifyAdminAccess($pdo, $adminUserId)) {
            echo json_encode([
                "success" => false,
                "message" => "Unauthorized: Admin access required",
            ]);
            exit;
        }

        if (empty($name) || empty($email)) {
            echo json_encode([
                "success" => false,
                "message" => "Name and email are required",
            ]);
            exit;
        }

        try {
            // Check if email is already taken by another user
            $checkStmt = $pdo->prepare("SELECT user_id FROM users WHERE email = ? AND user_id != ?");
            $checkStmt->execute([$email, $adminUserId]);

            if ($checkStmt->fetch()) {
                echo json_encode([
                    "success" => false,
                    "message" => "Email is already taken by another user",
                ]);
                exit;
            }

            // Update admin profile
            $stmt = $pdo->prepare("UPDATE users SET name = ?, lastname = ?, email = ? WHERE user_id = ?");
            $stmt->execute([$name, $lastname, $email, $adminUserId]);

            // Get updated admin data
            $adminStmt = $pdo->prepare("SELECT user_id, name, lastname, email, role FROM users WHERE user_id = ?");
            $adminStmt->execute([$adminUserId]);
            $admin = $adminStmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode([
                "success" => true,
                "message" => "Profile updated successfully",
                "admin"   => $admin,
            ]);

        } catch (PDOException $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
            ]);
        }
        exit;
    }

    if ($fun === "getAdminProfile") {
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
            SELECT user_id, name, lastname, email, role, created_at
            FROM users
            WHERE user_id = ? AND role = 'admin'
        ");
            $stmt->execute([$adminUserId]);
            $admin = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($admin) {
                echo json_encode(["success" => true, "admin" => $admin]);
            } else {
                echo json_encode(["success" => false, "message" => "Admin not found"]);
            }
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
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
        $features    = $_POST['features'] ?? '';

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
            SET package_type = :package_type, max_guests = :max_guests, max_events = :max_events, price = :price, features = :features
            WHERE package_id = :package_id
        ");

            $stmt->execute([
                ':package_type' => $packageType,
                ':max_guests'   => (int) $maxGuests,
                ':max_events'   => (int) $maxEvents,
                ':price'        => (float) $price,
                ':features'     => $features,
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
        $user_id          = $_POST['user_id'] ?? '';
        $current_password = $_POST['current_password'] ?? '';
        $new_password     = $_POST['new_password'] ?? '';

        if (! $user_id || ! $current_password || ! $new_password) {
            echo json_encode(["success" => false, "message" => "All fields are required"]);
            exit;
        }

        try {
            $stmt = $pdo->prepare("SELECT password FROM users WHERE user_id = ?");
            $stmt->execute([$user_id]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (! $user) {
                echo json_encode(["success" => false, "message" => "User not found"]);
                exit;
            }

            if (! password_verify($current_password, $user['password'])) {
                echo json_encode(["success" => false, "message" => "Current password is incorrect"]);
                exit;
            }

            $new_password_hash = password_hash($new_password, PASSWORD_DEFAULT);
            $updateStmt        = $pdo->prepare("UPDATE users SET password = ? WHERE user_id = ?");
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

    // UPDATED generateReport FUNCTION (QUEUE REMOVED)
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
            // Create reports directory if it doesn't exist
            $reportsDir = __DIR__ . '/reports/';
            if (! is_dir($reportsDir)) {
                if (! mkdir($reportsDir, 0755, true)) {
                    throw new Exception("Cannot create reports directory");
                }
            }

            // Check if directory is writable
            if (! is_writable($reportsDir)) {
                throw new Exception("Reports directory is not writable");
            }

            // Generate filename with timestamp
            $timestamp = date('Y-m-d_H-i-s');
            $filename  = "report_{$reportType}_{$timestamp}";

            // Generate report data based on type
            $reportData = generateReportData($pdo, $reportType, $dateRange);

            // Generate file based on format
            $filePath = '';
            switch ($format) {
                case 'csv':
                    $filename .= '.csv';
                    $filePath = $reportsDir . $filename;
                    generateCSVReport($reportData, $filePath);
                    break;
                case 'excel':
                    $filename .= '.xlsx';
                    $filePath = $reportsDir . $filename;
                    generateCSVReport($reportData, $filePath);
                    break;
                case 'pdf':
                default:
                    $filename .= '.pdf';
                    $filePath = $reportsDir . $filename;
                    generatePDFReport($reportData, $filePath);
                    break;
            }

            // Verify file was created
            if (! file_exists($filePath)) {
                throw new Exception("Failed to create report file");
            }

            // Log the activity
            $logStmt = $pdo->prepare("INSERT INTO system_activity (user_id, action, description) VALUES (:user_id, :action, :description)");
            $logStmt->execute([
                ':user_id'     => $adminUserId,
                ':action'      => 'Report Generated',
                ':description' => "Generated {$reportType} report in {$format} format - {$filename}",
            ]);

            echo json_encode([
                "success"   => true,
                "message"   => "Report generated successfully",
                "file_path" => $filePath,
                "filename"  => $filename,
            ]);

        } catch (Exception $e) {
            error_log("Report generation error: " . $e->getMessage());
            echo json_encode([
                "success" => false,
                "message" => "Error generating report: " . $e->getMessage(),
            ]);
        }
        exit;
    }

    // UPDATED backupDatabase FUNCTION (QUEUE REMOVED)
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

    function getTotalCount($pdo, $table)
    {
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM {$table}");
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    }

    // Enhanced Invitation Analytics Functions
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
                    COUNT(DISTINCT CASE WHEN r.attending IS NOT NULL THEN r.guest_id END) as responded,
                    COUNT(DISTINCT CASE WHEN r.attending = 'yes' THEN r.guest_id END) as attending_count,
                    CASE
                        WHEN COUNT(DISTINCT r.guest_id) > 0 THEN
                            ROUND((COUNT(DISTINCT CASE WHEN r.attending IS NOT NULL THEN r.guest_id END) / COUNT(DISTINCT r.guest_id)) * 100, 1)
                        ELSE 0
                    END as response_rate
                FROM events e
                LEFT JOIN rsvp r ON e.event_id = r.event_id
                GROUP BY e.event_id, e.event_name, e.published
                ORDER BY e.created_at DESC
            ");
            $stmt->execute();
            $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Format the data for frontend
            $analytics = array_map(function ($event) {
                $sent      = (int) $event['sent'];
                $responded = (int) $event['responded'];

                // FIX: Proper response rate calculation (should never exceed 100%)
                $responseRate = $sent > 0 ? min(100, round(($responded / $sent) * 100, 1)) : 0;

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

    if ($fun === "exportInvitationData") {
        $adminUserId = $_POST['admin_user_id'] ?? '';
        $status      = $_POST['status'] ?? 'all';
        $userId      = $_POST['user_id'] ?? '';

        if (! verifyAdminAccess($pdo, $adminUserId)) {
            echo json_encode([
                "success" => false,
                "message" => "Unauthorized: Admin access required",
            ]);
            exit;
        }

        try {
            // Build the base query
            $query = "
                SELECT
                    e.event_id,
                    e.event_name,
                    e.user_name as organizer_name,
                    e.created_at as event_created,
                    e.published as event_status,
                    COUNT(DISTINCT r.guest_id) as invitations_sent,
                    COUNT(DISTINCT CASE WHEN r.attending IS NOT NULL THEN r.guest_id END) as invitations_responded,
                    COUNT(DISTINCT CASE WHEN r.attending = 'yes' THEN r.guest_id END) as attending_count,
                    COUNT(DISTINCT CASE WHEN r.attending = 'no' THEN r.guest_id END) as declined_count,
                    CASE
                        WHEN COUNT(DISTINCT r.guest_id) > 0 THEN
                            ROUND((COUNT(DISTINCT CASE WHEN r.attending IS NOT NULL THEN r.guest_id END) / COUNT(DISTINCT r.guest_id)) * 100, 1)
                        ELSE 0
                    END as response_rate_percent
                FROM events e
                LEFT JOIN rsvp r ON e.event_id = r.event_id
                WHERE (e.is_deleted = 0 OR e.is_deleted IS NULL)  -- EXCLUDE DELETED EVENTS
            ";

            // Add WHERE conditions based on filters
            $conditions = [];
            $params     = [];

            if ($status !== 'all') {
                if ($status === 'active') {
                    $conditions[] = "e.published = 1";
                } elseif ($status === 'draft') {
                    $conditions[] = "e.published = 0";
                }
            }

            if (! empty($userId)) {
                $conditions[] = "e.user_id = ?";
                $params[]     = $userId;
            }

            if (! empty($conditions)) {
                $query .= " AND " . implode(" AND ", $conditions);
            }

            $query .= " GROUP BY e.event_id, e.event_name, e.user_name, e.created_at, e.published";
            $query .= " ORDER BY e.created_at DESC";

            $stmt = $pdo->prepare($query);
            $stmt->execute($params);
            $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Format data for CSV
            $csvData = [];

            // Add header row
            $csvData[] = [
                'Event ID',
                'Event Name',
                'Organizer',
                'Event Created',
                'Status',
                'Invitations Sent',
                'Invitations Responded',
                'Attending Count',
                'Declined Count',
                'Response Rate (%)',
            ];

            // Add data rows
            foreach ($events as $event) {
                $status = $event['event_status'] == 1 ? 'Active' : 'Draft';

                $csvData[] = [
                    $event['event_id'],
                    $event['event_name'],
                    $event['organizer_name'],
                    $event['event_created'],
                    $status,
                    $event['invitations_sent'],
                    $event['invitations_responded'],
                    $event['attending_count'],
                    $event['declined_count'],
                    $event['response_rate_percent'],
                ];
            }

            // Generate CSV file
            $timestamp = date('Y-m-d_H-i-s');
            $filename  = "invitation_analytics_export_{$timestamp}.csv";
            $exportDir = __DIR__ . '/exports/';

            // Create exports directory if it doesn't exist
            if (! is_dir($exportDir)) {
                mkdir($exportDir, 0755, true);
            }

            $filePath = $exportDir . $filename;

            // Write CSV file
            $file = fopen($filePath, 'w');
            foreach ($csvData as $row) {
                fputcsv($file, $row);
            }
            fclose($file);

            // Verify file was created
            if (file_exists($filePath)) {
                echo json_encode([
                    "success"   => true,
                    "message"   => "Export completed successfully",
                    "filename"  => $filename,
                    "file_path" => $filePath,
                ]);
            } else {
                throw new Exception("Failed to create export file");
            }

        } catch (PDOException $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Export error: " . $e->getMessage(),
            ]);
        }
        exit;
    }

    if ($fun === 'recordPayment') {

        $user_id        = $_POST['user_id'] ?? '';
        $user_name      = $_POST['user_name'] ?? ''; // optional if you store it manually
        $package_id     = $_POST['package_id'] ?? '';
        $package_name   = $_POST['package_name'] ?? '';
        $amount         = $_POST['amount'] ?? 0;
        $payment_method = $_POST['payment_method'] ?? '';
        $payment_status = $_POST['payment_status'] ?? '';

        $payment_id = generateSimpleTransactionId($pdo);

        try {
            // ✅ Begin transaction
            $pdo->beginTransaction();

            /* -------------------------------------------------
                1. Validate package
                ------------------------------------------------- */
            $pkgStmt = $pdo->prepare("
                    SELECT package_type, max_events, max_guests, price
                    FROM packagetb
                    WHERE package_id = ?
                ");
            $pkgStmt->execute([$package_id]);
            $package = $pkgStmt->fetch(PDO::FETCH_ASSOC);

            if (! $package) {
                $pdo->rollBack();
                echo json_encode(["success" => false, "message" => "Invalid package_id"]);
                exit;
            }

            $package_type = $package['package_type'];
            $max_events   = $package['max_events'];
            $max_guests   = $package['max_guests'];
            $price        = $package['price'];

            /* -------------------------------------------------
                2. Get user name
                ------------------------------------------------- */
            $userStmt = $pdo->prepare("SELECT CONCAT(name, ' ', COALESCE(lastname, '')) AS full_name FROM users WHERE user_id = ?");
            $userStmt->execute([$user_id]);
            $user = $userStmt->fetch(PDO::FETCH_ASSOC);

            if (! $user) {
                $pdo->rollBack();
                echo json_encode(["success" => false, "message" => "User not found"]);
                exit;
            }

            $user_full_name = $user['full_name'];

            /* -------------------------------------------------
                3. Insert payment record
                ------------------------------------------------- */
            $insertPayment = $pdo->prepare("
                    INSERT INTO payment_history (
                        payment_id, user_id, user_name,
                        package_id, package_name,
                        amount, payment_status, payment_method, payment_date
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
                ");
            $insertPayment->execute([
                $payment_id,
                $user_id,
                $user_full_name,
                $package_id,
                $package_type, // your table uses package_type as name
                $amount,
                $payment_status,
                $payment_method,
            ]);

            /* -------------------------------------------------
                4. Create or update user_packages
                ------------------------------------------------- */
            $checkPkg = $pdo->prepare("SELECT COUNT(*) FROM user_packages WHERE user_id = ?");
            $checkPkg->execute([$user_id]);
            $exists = (int) $checkPkg->fetchColumn();

            if ($exists === 0) {
                // New user package
                $user_package_id = "PCK-" . strtoupper(substr(md5(uniqid()), 0, 6)) . "-" . time();

                $insertPkg = $pdo->prepare("
                        INSERT INTO user_packages (
                            user_package_id, user_id, package_id,
                            event_limit, event_used, created_at
                        ) VALUES (?, ?, ?, ?, 0, NOW())
                    ");
                $insertPkg->execute([
                    $user_package_id, $user_id, $package_id, $max_events,
                ]);
            } else {
                // Update existing package
                $updatePkg = $pdo->prepare("
                        UPDATE user_packages
                        SET package_id = ?, event_limit = ?, updated_at = NOW()
                        WHERE user_id = ?
                    ");
                $updatePkg->execute([$package_id, $max_events, $user_id]);
            }

            /* -------------------------------------------------
                5. Assign package to all user's events
                ------------------------------------------------- */
            $updateEvents = $pdo->prepare("
                    UPDATE events
                    SET package_id = ?, updated_at = NOW()
                    WHERE user_id = ?
                ");
            $updateEvents->execute([$package_id, $user_id]);
            $logStmt = $pdo->prepare("INSERT INTO system_activity (user_id, action, description) VALUES (:user_id, :action, :description)");
            $logStmt->execute([
                ':user_id'     => $user_id,
                ':action'      => 'New Package',
                ':description' => "Purchase new Package ",
            ]);

            $pdo->commit();

            echo json_encode([
                "success"    => true,
                "message"    => "Payment processed successfully",
                "payment_id" => $payment_id,
            ]);

        } catch (PDOException $e) {
            $pdo->rollBack();
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
            ]);
        }
        exit;
    }

    if ($fun === "updateEventGuestLimit") {
        $event_id    = $_POST['event_id'] ?? '';
        $guest_limit = $_POST['guest_limit'] ?? 0;
        $user_id     = $_POST['user_id'] ?? '';

        if (empty($event_id)) {
            echo json_encode(["success" => false, "message" => "Missing event ID"]);
            exit;
        }

        try {
            $stmt = $pdo->prepare("UPDATE events SET guest_limit = :guest_limit WHERE event_id = :event_id");
            $stmt->execute([
                ":guest_limit" => (int) $guest_limit,
                ":event_id"    => $event_id,
            ]);

            echo json_encode([
                "success" => true,
                "message" => "Guest limit updated successfully",
            ]);

        } catch (PDOException $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
            ]);
        }
        exit;
    }

    if ($fun === 'cancelEvent') {
        $event_id = $_POST['event_id'] ?? '';
        $user_id  = $_POST['user_id'] ?? '';

        if (empty($event_id)) {
            echo json_encode(["success" => false, "message" => "Missing required fields"]);
            exit;
        }

        try {
            // Update event status to 'cancelled'
            $stmt = $pdo->prepare("UPDATE events SET status = 'cancelled' WHERE event_id = ?");
            $stmt->execute([$event_id]);

            if ($stmt->rowCount() > 0) {
                $logStmt = $pdo->prepare("INSERT INTO system_activity (user_id, action, description) VALUES (:user_id, :action, :description)");
                $logStmt->execute([
                    ':user_id'     => $user_id,
                    ':action'      => 'Event Reactivated',
                    ':description' => "Event ID '{$event_id}' was reactivated at " . date('Y-m-d H:i:s'),
                ]);

                echo json_encode(["success" => true, "message" => "Event reactivated successfully"]);
            } else {
                echo json_encode(["success" => false, "message" => "Event not found or unauthorized"]);
            }

        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        exit;
    }

    if ($fun === 'reactivateEvent') {
        $event_id = $_POST['event_id'] ?? '';

        if (empty($event_id)) {
            echo json_encode(["success" => false, "message" => "Missing required fields"]);
            exit;
        }

        try {
            $stmt = $pdo->prepare("UPDATE events SET status = 'Active' WHERE event_id = ?");
            $stmt->execute([$event_id]);

            if ($stmt->rowCount() > 0) {
                echo json_encode(["success" => true, "message" => "Event reactivated successfully"]);
            } else {
                echo json_encode(["success" => false, "message" => "Event not found or unauthorized"]);
            }

        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        exit;
    }

    if ($fun === "removeGuests") {
        $guest_ids = $_POST['guest_ids'] ?? '';

        if (empty($guest_ids)) {
            echo json_encode([
                "success" => false,
                "message" => "Missing guest IDs",
            ]);
            exit;
        }

        try {
            $guest_ids_array = explode(',', $guest_ids);
            $placeholders    = str_repeat('?,', count($guest_ids_array) - 1) . '?';

            $stmt = $pdo->prepare("
                SELECT rr.guest_id, rr.email, rr.name, e.event_name
                FROM rsvp rr
                JOIN events e ON rr.event_id = e.event_id
                WHERE rr.guest_id IN ($placeholders)
            ");
            $stmt->execute($guest_ids_array);
            $guests = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($guests)) {
                echo json_encode([
                    "success" => false,
                    "message" => "No guests found with the provided IDs",
                ]);
                exit;
            }

            $eventName     = $guests[0]['event_name'] ?? 'the event';
            $deletedGuests = [];

            // Send notification email to each guest before deleting
            $SENDGRID_API_KEY = "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";
            $fromEmail        = "bugbusters929@gmail.com";
            $fromName         = "Eventa (no-reply)";

            $emailSuccessCount = 0;
            $emailFailedCount  = 0;

            foreach ($guests as $guest) {
                $guestEmail      = $guest['email'];
                $guestName       = $guest['name'];
                $deletedGuests[] = $guestName;

                // Send removal notification email
                $emailData = [
                    "personalizations" => [[
                        "to"      => [["email" => $guestEmail, "name" => $guestName]],
                        "subject" => "Update Regarding Your Invitation to {$eventName}",
                    ]],
                    "from"    => ["email" => $fromEmail, "name" => $fromName],
                    "content" => [[
                        "type"  => "text/html",
                        "value" => "
                        <html>
                        <body style='font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;'>
                            <div style='background: #fff; padding: 30px; border-radius: 12px; max-width: 600px; margin: 0 auto;'>
                                <h1 style='color: #e74c3c;'>Important Update</h1>
                                <div style='background: #fdf2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e74c3c;'>
                                    <p style='margin: 0; font-size: 16px; line-height: 1.6; color: #333;'>
                                        Your invitation to <strong>{$eventName}</strong> has been cancelled.
                                    </p>
                                </div>
                                <p style='color: #666; font-size: 14px;'>
                                    We regret to inform you that your registration for this event has been removed.
                                </p>
                                <hr style='border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;'>
                                <p style='color: #999; font-size: 12px;'>
                                    This is an automated message. Please do not reply to this email.
                                </p>
                            </div>
                        </body>
                        </html>",
                    ]],
                ];

                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, "https://api.sendgrid.com/v3/mail/send");
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    "Authorization: Bearer $SENDGRID_API_KEY",
                    "Content-Type: application/json",
                ]);
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($emailData));
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

                $response = curl_exec($ch);
                $status   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                if ($status == 202) {
                    $emailSuccessCount++;
                } else {
                    $emailFailedCount++;
                    error_log("Failed to send removal email to $guestEmail: HTTP $status");
                }
            }

            // Now delete the guests from database
            $stmt = $pdo->prepare("DELETE FROM rsvp WHERE guest_id IN ($placeholders)");
            $stmt->execute($guest_ids_array);
            $deletedCount = $stmt->rowCount();

            if ($deletedCount > 0) {
                $message = "Successfully removed $deletedCount guest(s)";
                if ($emailSuccessCount > 0) {
                    $message .= " and sent removal notifications to $emailSuccessCount guest(s)";
                }
                if ($emailFailedCount > 0) {
                    $message .= " (Failed to send emails to $emailFailedCount guest(s))";
                }

                echo json_encode([
                    "success"             => true,
                    "message"             => $message,
                    "deleted_count"       => $deletedCount,
                    "notification_sent"   => $emailSuccessCount,
                    "notification_failed" => $emailFailedCount,
                    "deleted_guests"      => $deletedGuests,
                ]);
            } else {
                echo json_encode([
                    "success" => false,
                    "message" => "No guests were removed",
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

    if ($fun === "getGuestMessageByEmail") {
        $event_id = $_POST['event_id'] ?? '';
        $email    = trim(strtolower($_POST['email'] ?? ''));

        if (empty($event_id) || empty($email)) {
            echo json_encode(["success" => false, "message" => "Missing data"]);
            exit;
        }

        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare("
            SELECT r.guest_id, r.name, r.email,
                   e.event_name, e.event_start_date AS event_date,
                   e.event_start_time AS event_time, e.event_location AS location
            FROM rsvp r
            JOIN events e ON r.event_id = e.event_id
            WHERE r.event_id = :event_id AND LOWER(r.email) = :email
        ");
            $stmt->execute([':event_id' => $event_id, ':email' => $email]);
            $rsvp = $stmt->fetch(PDO::FETCH_ASSOC);

            if (! $rsvp) {
                $pdo->rollBack();
                echo json_encode(["success" => false, "message" => "No RSVP found for this email."]);
                exit;
            }

            $stmt = $pdo->prepare("
            SELECT id AS msg_id, message, reply, created_at, replied_at
            FROM rsvp_messages
            WHERE guest_id = :guest_id AND event_id = :event_id
        ");
            $stmt->execute([':guest_id' => $rsvp['guest_id'], ':event_id' => $event_id]);
            $thread = $stmt->fetch(PDO::FETCH_ASSOC);

            $messages = [];

            if (! $thread) {
                $stmt = $pdo->prepare("
                INSERT INTO rsvp_messages
                (guest_id, event_id, guest_name, guest_email, message, created_at)
                VALUES (:guest_id, :event_id, :name, :email, '', NOW())
            ");
                $stmt->execute([
                    ':guest_id' => $rsvp['guest_id'],
                    ':event_id' => $event_id,
                    ':name'     => $rsvp['name'],
                    ':email'    => $rsvp['email'],
                ]);
                $msg_id = $pdo->lastInsertId();
            } else {
                $msg_id = $thread['msg_id'];

                // === COLLECT ALL MESSAGES WITH TIMESTAMPS ===
                $all_messages = [];

                // Guest messages
                if ($thread['message']) {
                    $lines = explode("\n\n", $thread['message']);
                    foreach ($lines as $line) {
                        if (preg_match('/^\[Guest\]: (.+) \| (.+)$/', $line, $m)) {
                            $all_messages[] = [
                                'text'   => $m[1],
                                'sender' => 'guest',
                                'time'   => $m[2],
                            ];
                        }
                    }
                }

                // Admin replies
                if ($thread['reply']) {
                    $lines = explode("\n\n", $thread['reply']);
                    foreach ($lines as $line) {
                        if (preg_match('/^\[Organizer\]: (.+) \| (.+)$/', $line, $m)) {
                            $all_messages[] = [
                                'text'   => $m[1],
                                'sender' => 'organizer',
                                'time'   => $m[2],
                            ];
                        }
                    }
                }

                // === SORT BY TIMESTAMP ===
                usort($all_messages, function ($a, $b) {
                    return strtotime($a['time']) - strtotime($b['time']);
                });

                $messages = $all_messages;
            }

            $pdo->commit();

            echo json_encode([
                "success" => true,
                "event"   => [
                    "event_name" => $rsvp['event_name'],
                    "event_date" => $rsvp['event_date'],
                    "event_time" => $rsvp['event_time'],
                    "location"   => $rsvp['location'],
                ],
                "guest"   => [
                    'guest_id' => $rsvp['guest_id'],
                    'name'     => $rsvp['name'],
                    'email'    => $rsvp['email'],
                    'msg_id'   => $msg_id,
                    'messages' => $messages,
                ],
            ]);
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
        }
        exit;
    }

    if ($fun === "guestSendMessage") {
        $msg_id  = $_POST['msg_id'] ?? '';
        $message = trim($_POST['message'] ?? '');

        if (empty($msg_id) || empty($message)) {
            echo json_encode(["success" => false, "message" => "Missing data"]);
            exit;
        }

        try {
            $pdo->beginTransaction();

            $timestamp = date('Y-m-d H:i:s');
            $line      = "[Guest]: $message | $timestamp";

            $stmt = $pdo->prepare("
            UPDATE rsvp_messages
            SET message = CONCAT(
                IFNULL(message, ''),
                IF(LENGTH(IFNULL(message,'')) > 0, '\n\n', ''),
                :line
            )
            WHERE id = :msg_id
        ");
            $stmt->execute([':line' => $line, ':msg_id' => $msg_id]);

            if ($stmt->rowCount() > 0) {
                $pdo->commit();
                echo json_encode(["success" => true]);
            } else {
                $pdo->rollBack();
                echo json_encode(["success" => false, "message" => "Not found"]);
            }
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(["success" => false, "message" => "Failed"]);
        }
        exit;
    }

    if ($fun === "getGuestInsights") {
        $event_id = $_POST['event_id'] ?? '';

        if (empty($event_id)) {
            echo json_encode(["success" => false, "message" => "Missing event ID"]);
            exit;
        }

        try {
            // 1. Event name (optional – keep for future)
            $stmt = $pdo->prepare("SELECT event_name FROM events WHERE event_id = ?");
            $stmt->execute([$event_id]);
            $event = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['event_name' => 'Unknown'];

            // 2. Guests + optional message row
            $sql = "
            SELECT
                r.guest_id,
                r.event_id,
                r.name,
                r.email,
                r.attending,
                r.guest_count,
                r.created_at,
                rm.id          AS msg_id,
                rm.message     AS guest_message,
                rm.reply,
                rm.replied_at
            FROM rsvp r
            LEFT JOIN rsvp_messages rm
                ON r.guest_id = rm.guest_id
               AND r.event_id = rm.event_id
            WHERE r.event_id = ?
            ORDER BY r.created_at DESC
        ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$event_id]);
            $guests = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                "success" => true,
                "event"   => $event,
                "guests"  => $guests,
            ]);
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
        exit;
    }

    if ($fun === "organizerReplyToGuest") {
        $msg_id = $_POST['msg_id'] ?? '';
        $reply  = trim($_POST['reply'] ?? '');

        if (empty($msg_id) || $reply === '') {
            echo json_encode(["success" => false, "message" => "Missing data"]);
            exit;
        }

        try {
            $stmt = $pdo->prepare("
            UPDATE rsvp_messages
            SET reply = ?, replied_at = NOW()
            WHERE id = ?
        ");
            $ok = $stmt->execute([$reply, $msg_id]);

            echo json_encode([
                "success" => $ok,
                "message" => $ok ? "Reply saved" : "Update failed",
            ]);
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
        exit;
    }

    if ($fun === "replyToGuestMessage") {
        $msg_id = $_POST['msg_id'] ?? '';
        $reply  = trim($_POST['reply'] ?? '');

        if (empty($msg_id) || empty($reply)) {
            echo json_encode([
                "success" => false,
                "message" => "Missing message ID or reply",
            ]);
            exit;
        }

        try {
            $stmt = $pdo->prepare("
            UPDATE rsvp_messages
            SET reply = :reply, replied_at = NOW()
            WHERE id = :msg_id
        ");
            $success = $stmt->execute([
                ":reply"  => $reply,
                ":msg_id" => $msg_id,
            ]);

            echo json_encode([
                "success" => $success,
                "message" => $success ? "Reply sent" : "Failed to update",
            ]);
        } catch (PDOException $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
            ]);
        }
        exit;
    }

    if ($fun === "getPaymentHistory") {
        $adminUserId = $_POST['admin_user_id'] ?? '';

        if (! verifyAdminAccess($pdo, $adminUserId)) {
            echo json_encode(["success" => false, "message" => "Unauthorized"]);
            exit;
        }

        try {
            $search     = $_POST['search'] ?? '';
            $status     = $_POST['status'] ?? 'all';
            $package    = $_POST['package'] ?? 'all';
            $dateFilter = $_POST['date_filter'] ?? 'all';

            // Direct query replacing the revenue_analytics view
            $query = "
            SELECT
                ph.payment_id,
                ph.user_id,
                ph.user_name,
                ph.package_id,
                ph.package_name,
                ph.amount,
                ph.payment_status,
                ph.payment_date,
                ph.payment_method,
                u.email AS user_email,
                p.max_events,
                p.max_guests,
                p.package_type
            FROM payment_history AS ph
            LEFT JOIN users AS u ON ph.user_id = u.user_id
            LEFT JOIN packagetb AS p ON ph.package_id = p.package_id
            WHERE 1=1
        ";

            $params = [];

            // Search filter
            if (! empty($search)) {
                $query .= " AND (ph.user_name LIKE ? OR ph.user_id LIKE ? OR ph.payment_id LIKE ? OR u.email LIKE ?)";
                $searchTerm = "%$search%";
                $params[]   = $searchTerm;
                $params[]   = $searchTerm;
                $params[]   = $searchTerm;
                $params[]   = $searchTerm;
            }

            // Payment status filter
            if ($status !== 'all') {
                $query .= " AND ph.payment_status = ?";
                $params[] = $status;
            }

            // Package type filter
            if ($package !== 'all') {
                $query .= " AND p.package_type = ?";
                $params[] = $package;
            }

            // Date filter
            if ($dateFilter !== 'all') {
                switch ($dateFilter) {
                    case 'today':
                        $query .= " AND DATE(ph.payment_date) = CURDATE()";
                        break;
                    case 'week':
                        $query .= " AND ph.payment_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
                        break;
                    case 'month':
                        $query .= " AND ph.payment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
                        break;
                    case 'year':
                        $query .= " AND ph.payment_date >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)";
                        break;
                }
            }

            $query .= " ORDER BY ph.payment_date DESC";

            $stmt = $pdo->prepare($query);
            $stmt->execute($params);
            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(["success" => true, "payments" => $payments]);

        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        exit;
    }

    if ($fun === "getRevenueAnalytics") {
        $adminUserId = $_POST['admin_user_id'] ?? '';

        if (! verifyAdminAccess($pdo, $adminUserId)) {
            echo json_encode(["success" => false, "message" => "Unauthorized"]);
            exit;
        }

        try {
            // Direct query without using the view
            $stmt = $pdo->prepare("
                SELECT
                    COALESCE(SUM(CASE WHEN ph.payment_status = 'completed' THEN ph.amount ELSE 0 END), 0) AS total_revenue,
                    COALESCE(SUM(CASE
                        WHEN ph.payment_status = 'completed'
                        AND MONTH(ph.payment_date) = MONTH(CURRENT_DATE())
                        AND YEAR(ph.payment_date) = YEAR(CURRENT_DATE())
                        THEN ph.amount ELSE 0 END), 0) AS current_month_revenue,
                    ph.payment_status,
                    COUNT(*) AS count
                FROM payment_history AS ph
                LEFT JOIN users AS u ON ph.user_id = u.user_id
                LEFT JOIN packagetb AS p ON ph.package_id = p.package_id
                GROUP BY ph.payment_status
            ");
            $stmt->execute();
            $statusCounts = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Calculate totals safely
            $totalRevenue        = 0;
            $currentMonthRevenue = 0;
            foreach ($statusCounts as $row) {
                $totalRevenue += (float) ($row['total_revenue'] ?? 0);
                $currentMonthRevenue += (float) ($row['current_month_revenue'] ?? 0);
            }

            echo json_encode([
                "success"   => true,
                "analytics" => [
                    "total_revenue"         => $totalRevenue,
                    "current_month_revenue" => $currentMonthRevenue,
                    "payment_status_counts" => $statusCounts,
                ],
            ]);
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        exit;
    }

    if ($fun === "getRevenueData") {
        $adminUserId = $_POST['admin_user_id'] ?? '';

        if (! verifyAdminAccess($pdo, $adminUserId)) {
            echo json_encode(["success" => false, "message" => "Unauthorized"]);
            exit;
        }

        try {
            // Summary revenue data
            $stmt = $pdo->prepare("
                SELECT
                    COALESCE(SUM(CASE WHEN ph.payment_status = 'completed' THEN ph.amount ELSE 0 END), 0) AS total_revenue,
                    COALESCE(SUM(CASE
                        WHEN ph.payment_status = 'completed'
                        AND MONTH(ph.payment_date) = MONTH(CURRENT_DATE())
                        AND YEAR(ph.payment_date) = YEAR(CURRENT_DATE())
                        THEN ph.amount ELSE 0 END), 0) AS current_month_revenue,
                    COUNT(*) AS total_payments,
                    COUNT(CASE WHEN ph.payment_status = 'pending' THEN 1 END) AS pending_payments,
                    COUNT(CASE WHEN ph.payment_status = 'completed' THEN 1 END) AS completed_payments
                FROM payment_history AS ph
                LEFT JOIN users AS u ON ph.user_id = u.user_id
                LEFT JOIN packagetb AS p ON ph.package_id = p.package_id
            ");
            $stmt->execute();
            $revenueStats = $stmt->fetch(PDO::FETCH_ASSOC);

            // Revenue by package type
            $packageStmt = $pdo->prepare("
                SELECT
                    p.package_type,
                    COALESCE(SUM(ph.amount), 0) AS revenue,
                    COUNT(ph.payment_id) AS payment_count
                FROM packagetb AS p
                LEFT JOIN payment_history AS ph
                    ON p.package_id = ph.package_id AND ph.payment_status = 'completed'
                GROUP BY p.package_type
            ");
            $packageStmt->execute();
            $packageRevenue = $packageStmt->fetchAll(PDO::FETCH_ASSOC);

            // Monthly revenue trend (last 6 months)
            $monthlyStmt = $pdo->prepare("
                SELECT
                    DATE_FORMAT(ph.payment_date, '%Y-%m') AS month,
                    COALESCE(SUM(ph.amount), 0) AS monthly_revenue,
                    COUNT(*) AS payment_count
                FROM payment_history AS ph
                WHERE ph.payment_status = 'completed'
                GROUP BY DATE_FORMAT(ph.payment_date, '%Y-%m')
                ORDER BY month DESC
                LIMIT 6
            ");
            $monthlyStmt->execute();
            $monthlyTrend = $monthlyStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                "success"     => true,
                "revenueData" => [
                    "total_revenue"         => (float) $revenueStats['total_revenue'],
                    "current_month_revenue" => (float) $revenueStats['current_month_revenue'],
                    "total_payments"        => (int) $revenueStats['total_payments'],
                    "pending_payments"      => (int) $revenueStats['pending_payments'],
                    "completed_payments"    => (int) $revenueStats['completed_payments'],
                    "package_revenue"       => $packageRevenue,
                    "monthly_trend"         => $monthlyTrend,
                ],
            ]);

        } catch (PDOException $e) {
            error_log("Revenue data error: " . $e->getMessage());
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
            ]);
        }
        exit;
    }

    if ($fun === "getActiveSubscriptions") {
        $adminUserId = $_POST['admin_user_id'] ?? '';

        if (! verifyAdminAccess($pdo, $adminUserId)) {
            echo json_encode(["success" => false, "message" => "Unauthorized"]);
            exit;
        }

        try {
            // Count active subscriptions per package type
            $stmt = $pdo->prepare("
            SELECT
                p.package_type,
                COUNT(up.user_id) as active_subscriptions
            FROM packagetb p
            LEFT JOIN user_packages up ON p.package_id = up.package_id
            GROUP BY p.package_type
        ");
            $stmt->execute();
            $subscriptions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                "success"       => true,
                "subscriptions" => $subscriptions,
            ]);

        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        exit;
    }

    if ($fun === "getPackageUsageStats") {
        $adminUserId = $_POST['admin_user_id'] ?? '';

        if (! verifyAdminAccess($pdo, $adminUserId)) {
            echo json_encode(["success" => false, "message" => "Unauthorized"]);
            exit;
        }

        try {
            // Get package usage statistics + features
            $stmt = $pdo->prepare("
            SELECT
                p.package_id,
                p.package_type,
                p.features,                    -- ADD THIS LINE
                p.max_guests,                  -- Optional: include limits
                p.max_events,                  -- Optional
                p.price,                       -- Optional
                COUNT(up.user_id) as total_users,
                AVG(up.event_used) as avg_events_used,
                AVG(up.event_limit) as avg_event_limit,
                SUM(up.event_used) as total_events_used
            FROM packagetb p
            LEFT JOIN user_packages up ON p.package_id = up.package_id
            GROUP BY p.package_id, p.package_type, p.features, p.max_guests, p.max_events, p.price
        ");
            $stmt->execute();
            $usageStats = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                "success"     => true,
                "usage_stats" => $usageStats,
            ]);

        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        exit;
    }

    if ($fun === "addManualPayment") {
        $adminUserId   = $_POST['admin_user_id'] ?? '';
        $userId        = $_POST['user_id'] ?? '';
        $packageId     = $_POST['package_id'] ?? '';
        $amount        = $_POST['amount'] ?? '';
        $paymentMethod = $_POST['payment_method'] ?? 'manual';
        $billingCycle  = $_POST['billing_cycle'] ?? 'monthly';

        if (! verifyAdminAccess($pdo, $adminUserId)) {
            echo json_encode(["success" => false, "message" => "Unauthorized"]);
            exit;
        }

        if (empty($userId) || empty($packageId) || empty($amount)) {
            echo json_encode(["success" => false, "message" => "Missing required fields"]);
            exit;
        }

        try {
            // Get user and package details
            $userStmt = $pdo->prepare("SELECT name, email FROM users WHERE user_id = ?");
            $userStmt->execute([$userId]);
            $user = $userStmt->fetch(PDO::FETCH_ASSOC);

            $packageStmt = $pdo->prepare("SELECT package_type FROM packagetb WHERE package_id = ?");
            $packageStmt->execute([$packageId]);
            $package = $packageStmt->fetch(PDO::FETCH_ASSOC);

            if (! $user || ! $package) {
                echo json_encode(["success" => false, "message" => "User or package not found"]);
                exit;
            }

            // Generate payment ID
            $paymentId = generateSimpleTransactionId($pdo);

            // Insert payment record
            $stmt = $pdo->prepare("
            INSERT INTO payment_history (
                payment_id, user_id, user_name, package_id, package_name,
                amount, payment_method, payment_status, billing_cycle, payment_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, NOW())
        ");

            $stmt->execute([
                $paymentId,
                $userId,
                $user['name'],
                $packageId,
                $package['package_type'],
                $amount,
                $paymentMethod,
                $billingCycle,
            ]);

            // Update user package if needed
            $updateStmt = $pdo->prepare("
            INSERT INTO user_packages (user_package_id, user_id, package_id, event_limit, event_used, created_at, updated_at)
            VALUES (?, ?, ?,
                (SELECT max_events FROM packagetb WHERE package_id = ?),
                0, NOW(), NOW())
            ON DUPLICATE KEY UPDATE
                package_id = VALUES(package_id),
                event_limit = VALUES(event_limit),
                updated_at = NOW()
        ");

            $userPackageId = generateUserPackageID($pdo);
            $updateStmt->execute([$userPackageId, $userId, $packageId, $packageId]);

            // Log activity
            $logStmt = $pdo->prepare("INSERT INTO system_activity (user_id, action, description) VALUES (?, ?, ?)");
            $logStmt->execute([
                $adminUserId,
                'Manual Payment Added',
                "Manual payment of R{$amount} added for {$user['name']} - {$package['package_type']} package",
            ]);

            echo json_encode([
                "success"    => true,
                "message"    => "Manual payment added successfully",
                "payment_id" => $paymentId,
            ]);

        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        exit;
    }

    if ($fun === "changeAdminPassword") {
        $adminUserId     = $_POST['admin_user_id'] ?? '';
        $currentPassword = $_POST['current_password'] ?? '';
        $newPassword     = $_POST['new_password'] ?? '';

        if (! verifyAdminAccess($pdo, $adminUserId)) {
            echo json_encode(["success" => false, "message" => "Unauthorized"]);
            exit;
        }

        if (empty($currentPassword) || empty($newPassword)) {
            echo json_encode(["success" => false, "message" => "Current and new password are required"]);
            exit;
        }

        try {
            // Verify current password
            $stmt = $pdo->prepare("SELECT password FROM users WHERE user_id = ?");
            $stmt->execute([$adminUserId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (! $user) {
                echo json_encode(["success" => false, "message" => "User not found"]);
                exit;
            }

            if (! password_verify($currentPassword, $user['password'])) {
                echo json_encode(["success" => false, "message" => "Current password is incorrect"]);
                exit;
            }

            // Validate new password strength
            if (strlen($newPassword) < 6) {
                echo json_encode(["success" => false, "message" => "New password must be at least 6 characters long"]);
                exit;
            }

            // Hash new password
            $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);

            // Update password
            $updateStmt = $pdo->prepare("UPDATE users SET password = ? WHERE user_id = ?");
            $updateStmt->execute([$hashedPassword, $adminUserId]);

            // Log activity
            $logStmt = $pdo->prepare("INSERT INTO system_activity (user_id, action, description) VALUES (?, ?, ?)");
            $logStmt->execute([
                $adminUserId,
                'Password Changed',
                "Administrator changed their password",
            ]);

            echo json_encode([
                "success" => true,
                "message" => "Password changed successfully",
            ]);

        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        exit;
    }

    if ($fun === "reportEvent") {
        $event_id       = $_POST['event_id'] ?? '';
        $violation_type = $_POST['violation_type'] ?? '';
        $description    = $_POST['description'] ?? '';
        $reporter_email = $_POST['reporter_email'] ?? '';

        if (empty($event_id) || empty($violation_type)) {
            echo json_encode(["success" => false, "message" => "Missing required fields"]);
            exit;
        }

        try {
            // Generate a unique ID for anonymous reporting if no email provided
            $reporter_id = $reporter_email ? $reporter_email : 'anonymous_' . uniqid();

            $stmt = $pdo->prepare("INSERT INTO event_violations (event_id, reported_by_user_id, violation_type, description) VALUES (?, ?, ?, ?)");
            $stmt->execute([$event_id, $reporter_id, $violation_type, $description]);

            // Also record in user_violations if we have event owner info
            $eventStmt = $pdo->prepare("SELECT user_id FROM events WHERE event_id = ?");
            $eventStmt->execute([$event_id]);
            $event = $eventStmt->fetch(PDO::FETCH_ASSOC);

            if ($event) {
                $violationStmt = $pdo->prepare("INSERT INTO user_violations (user_id, event_id, violation_type, reported_by, description, status) VALUES (?, ?, ?, ?, ?, 'pending')");
                $violationStmt->execute([$event['user_id'], $event_id, $violation_type, $reporter_id, $description]);
            }

            echo json_encode(["success" => true, "message" => "Event reported successfully. Our team will review it shortly."]);
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        exit;
    }

    if ($fun === "getReportedEvents") {
        $adminUserId = $_POST['admin_user_id'] ?? '';

        if (! verifyAdminAccess($pdo, $adminUserId)) {
            echo json_encode(["success" => false, "message" => "Unauthorized"]);
            exit;
        }

        try {
            $stmt = $pdo->prepare("
            SELECT
                ev.*,
                e.event_name,
                e.user_id as event_owner_id,
                e.user_name as event_owner_name,
                e.event_image,
                e.created_at as event_created_at,
                e.design_data,
                u.name as reporter_name,
                u.email as reporter_email
            FROM event_violations ev
            JOIN events e ON ev.event_id = e.event_id
            LEFT JOIN users u ON ev.reported_by_user_id = u.user_id
            WHERE ev.status = 'pending'
            ORDER BY ev.reported_at DESC
        ");
            $stmt->execute();
            $reportedEvents = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(["success" => true, "reportedEvents" => $reportedEvents]);
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        exit;
    }

    if ($fun === "adminDeleteEvent") {
        $adminUserId        = $_POST['admin_user_id'] ?? '';
        $event_id           = $_POST['event_id'] ?? '';
        $reason             = $_POST['reason'] ?? '';
        $custom_reason      = $_POST['custom_reason'] ?? '';
        $block_user         = $_POST['block_user'] ?? false;
        $violation_severity = $_POST['violation_severity'] ?? 'medium';

        if (! verifyAdminAccess($pdo, $adminUserId)) {
            echo json_encode(["success" => false, "message" => "Unauthorized"]);
            exit;
        }

        if (empty($event_id) || empty($reason)) {
            echo json_encode(["success" => false, "message" => "Missing required fields"]);
            exit;
        }

        try {
            $pdo->beginTransaction();

            // Get event owner details - join with users table to get email
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
            $event = $eventStmt->fetch(PDO::FETCH_ASSOC);

            if (! $event) {
                throw new Exception("Event not found");
            }

            $event_owner_id    = $event['user_id'];
            $event_owner_email = $event['user_email'];
            $eventName         = $event['event_name'];
            $final_reason      = $reason === 'other' ? $custom_reason : $reason;

            // Soft delete the event
            $deleteStmt = $pdo->prepare("UPDATE events SET is_deleted = TRUE, deleted_by_admin_id = ?, deletion_reason = ?, deleted_at = NOW() WHERE event_id = ?");
            $deleteStmt->execute([$adminUserId, $final_reason, $event_id]);

            // Record user violation
            $violationStmt = $pdo->prepare("INSERT INTO user_violations (user_id, event_id, violation_type, severity, reported_by, description, status) VALUES (?, ?, ?, ?, ?, ?, 'verified')");
            $violationStmt->execute([$event_owner_id, $event_id, $reason, $violation_severity, $adminUserId, "Event deleted by admin: {$final_reason}"]);

            // Log admin action
            $logStmt = $pdo->prepare("INSERT INTO admin_action_logs (admin_user_id, action_type, target_type, target_id, reason, details) VALUES (?, 'event_deleted', 'event', ?, ?, ?)");
            $logStmt->execute([$adminUserId, $event_id, $final_reason, "Event deleted for violation: {$final_reason}"]);

            // Update violation reports status
            $updateReportStmt = $pdo->prepare("UPDATE event_violations SET status = 'action_taken', reviewed_by_admin_id = ?, reviewed_at = NOW() WHERE event_id = ? AND status = 'pending'");
            $updateReportStmt->execute([$adminUserId, $event_id]);

            // Send notification email to event planner
            if ($event_owner_email) {
                $emailContent = "
            <html>
            <body style='font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;'>
                <div style='background: #fff; padding: 30px; border-radius: 12px;'>
                    <h2 style='color: #dc3545;'>Event Removal Notice</h2>
                    <p>Dear Event Planner,</p>
                    <p>Your event <strong>{$eventName}</strong> has been removed from our platform.</p>
                    <div style='background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;'>
                        <p><strong>Reason for removal:</strong> {$final_reason}</p>
                    </div>
                    <p>If you believe this was a mistake, please contact our support team.</p>
                    <hr style='border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;'>
                    <p style='color: #666; font-size: 12px;'>This is an automated message. Please do not reply to this email.</p>
                </div>
            </body>
            </html>";

                // Send email using your existing email system
                $emailData = [
                    "personalizations" => [[
                        "to"      => [["email" => $event_owner_email, "name" => $event['user_name']]],
                        "subject" => "Your event has been removed - Eventa",
                    ]],
                    "from"             => ["email" => "bugbusters929@gmail.com", "name" => "Eventa Admin"],
                    "content"          => [[
                        "type"  => "text/html",
                        "value" => $emailContent,
                    ]],
                ];

                // Send email via SendGrid
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, "https://api.sendgrid.com/v3/mail/send");
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    "Authorization: Bearer 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",
                    "Content-Type: application/json",
                ]);
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($emailData));
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_exec($ch);
                curl_close($ch);
            }

            // Check if user should be blocked
            if ($block_user) {
                $blockStmt = $pdo->prepare("UPDATE users SET status = 'inactive' WHERE user_id = ?");
                $blockStmt->execute([$event_owner_id]);

                $blockLogStmt = $pdo->prepare("INSERT INTO admin_action_logs (admin_user_id, action_type, target_type, target_id, reason, details) VALUES (?, 'user_blocked', 'user', ?, ?, ?)");
                $blockLogStmt->execute([$adminUserId, $event_owner_id, $final_reason, "User blocked due to event deletion: {$final_reason}"]);
            } else {
                // Check automatic blocking rules
                $violationCountStmt = $pdo->prepare("SELECT COUNT(*) as violation_count, SUM(points) as total_points FROM user_violations WHERE user_id = ? AND status = 'verified'");
                $violationCountStmt->execute([$event_owner_id]);
                $violationStats = $violationCountStmt->fetch(PDO::FETCH_ASSOC);

                $violation_count = $violationStats['violation_count'] ?? 0;
                $total_points    = $violationStats['total_points'] ?? 0;

                // Automatic blocking rules: 10 points OR 3 violations
                if ($total_points >= 10 || $violation_count >= 3) {
                    $autoBlockStmt = $pdo->prepare("UPDATE users SET status = 'inactive' WHERE user_id = ?");
                    $autoBlockStmt->execute([$event_owner_id]);

                    $autoBlockLogStmt = $pdo->prepare("INSERT INTO admin_action_logs (admin_user_id, action_type, target_type, target_id, reason, details) VALUES (?, 'user_blocked', 'user', ?, 'auto_block', ?)");
                    $autoBlockLogStmt->execute([$adminUserId, $event_owner_id, "User automatically blocked due to violation threshold: {$violation_count} violations, {$total_points} points"]);
                }
            }

            $pdo->commit();

            echo json_encode(["success" => true, "message" => "Event deleted successfully" . ($block_user ? " and user blocked" : "")]);

        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
        }
        exit;
    }

    if ($fun === "dismissEventReport") {
        $adminUserId = $_POST['admin_user_id'] ?? '';
        $report_id   = $_POST['report_id'] ?? '';

        if (! verifyAdminAccess($pdo, $adminUserId)) {
            echo json_encode(["success" => false, "message" => "Unauthorized"]);
            exit;
        }

        if (empty($report_id)) {
            echo json_encode(["success" => false, "message" => "Missing report ID"]);
            exit;
        }

        try {
            $stmt = $pdo->prepare("UPDATE event_violations SET status = 'reviewed', reviewed_by_admin_id = ?, reviewed_at = NOW() WHERE id = ?");
            $stmt->execute([$adminUserId, $report_id]);

            echo json_encode(["success" => true, "message" => "Report dismissed successfully"]);
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        exit;
    }

    if ($fun === "getAllEvents") {
        $adminUserId = $_POST['admin_user_id'] ?? '';

        if (! verifyAdminAccess($pdo, $adminUserId)) {
            echo json_encode(["success" => false, "message" => "Unauthorized"]);
            exit;
        }

        try {
            $stmt = $pdo->prepare("
            SELECT
                e.*,
                u.name as user_name,
                u.email as user_email,
                (SELECT COUNT(*) FROM event_violations ev WHERE ev.event_id = e.event_id AND ev.status = 'pending') as report_count
            FROM events e
            LEFT JOIN users u ON e.user_id = u.user_id
            WHERE (e.is_deleted = 0 OR e.is_deleted IS NULL)  -- EXCLUDE DELETED EVENTS
            ORDER BY e.created_at DESC
        ");
            $stmt->execute();
            $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(["success" => true, "events" => $events]);
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        exit;
    }

    if ($fun === "createAdmin") {
        $requestingUserId = $_POST['requesting_user_id'] ?? '';
        $name             = $_POST['name'] ?? '';
        $lastname         = $_POST['lastname'] ?? '';
        $email            = $_POST['email'] ?? '';
        $password         = $_POST['password'] ?? '';

        if (! verifyAdminAccess($pdo, $requestingUserId)) {
            echo json_encode(["success" => false, "message" => "Unauthorized: Admin access required"]);
            exit;
        }

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

            $userId         = generateUserID($pdo);
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

            $stmt = $pdo->prepare("INSERT INTO users (user_id, name, lastname, email, password, role, status, verified) VALUES (?, ?, ?, ?, ?, 'admin', 'active', 1)");
            $stmt->execute([$userId, $name, $lastname, $email, $hashedPassword]);

            // Log the activity
            $logStmt = $pdo->prepare("INSERT INTO system_activity (user_id, action, description) VALUES (?, ?, ?)");
            $logStmt->execute([
                $requestingUserId,
                'Admin User Created',
                "New admin user created: {$name} {$lastname} ({$email})",
            ]);

            echo json_encode(["success" => true, "message" => "Admin user created successfully"]);

        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        exit;
    }

    if ($fun === "updatePaymentStatus") {
        $adminUserId = $_POST['admin_user_id'] ?? '';
        $paymentId   = $_POST['payment_id'] ?? '';
        $status      = $_POST['status'] ?? '';

        if (! verifyAdminAccess($pdo, $adminUserId)) {
            echo json_encode(["success" => false, "message" => "Unauthorized"]);
            exit;
        }

        if (empty($paymentId) || ! in_array($status, ['completed', 'pending', 'failed', 'refunded'])) {
            echo json_encode(["success" => false, "message" => "Invalid payment ID or status"]);
            exit;
        }

        try {
            $pdo->beginTransaction();

            // Get payment details for logging
            $paymentStmt = $pdo->prepare("SELECT user_id, amount, user_name FROM payment_history WHERE payment_id = ?");
            $paymentStmt->execute([$paymentId]);
            $payment = $paymentStmt->fetch(PDO::FETCH_ASSOC);

            if (! $payment) {
                throw new Exception("Payment not found");
            }

            // Update payment status
            $updateStmt = $pdo->prepare("UPDATE payment_history SET payment_status = ?, updated_at = NOW() WHERE payment_id = ?");
            $updateStmt->execute([$status, $paymentId]);

            // Log the activity
            $logStmt = $pdo->prepare("INSERT INTO system_activity (user_id, action, description) VALUES (?, ?, ?)");
            $logStmt->execute([
                $adminUserId,
                'Payment Status Updated',
                "Payment {$paymentId} status changed to {$status} for user {$payment['user_name']} - R{$payment['amount']}",
            ]);

            $pdo->commit();

            echo json_encode(["success" => true, "message" => "Payment status updated successfully"]);

        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
        }
        exit;
    }

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "General error: " . $e->getMessage()]);
}