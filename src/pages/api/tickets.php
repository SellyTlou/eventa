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

if ($fun === "getEventTickets") {
    $event_id = $_POST['event_id'] ?? '';
    
    if (empty($event_id)) {
        echo json_encode([
            "success" => false,
            "message" => "Event ID is required"
        ]);
        exit;
    }
    
    try {
        // Query the events table to get ticket data
        $stmt = $pdo->prepare("
            SELECT 
                event_id,
                event_info,
                earlybird_price,
                early_bird_quantity,
                general_price,
                general_quantity,
                vip_price,
                vip_quantity,
                vvip_price,
                vvip_quantity,
                ticket_config,
                guest_limit
            FROM ticket_events 
            WHERE event_id = :event_id
        ");
        
        $stmt->execute([':event_id' => $event_id]);
        $event = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$event) {
            echo json_encode([
                "success" => false,
                "message" => "Event not found"
            ]);
            exit;
        }
        
        // Check if it's a ticket event
        if ($event['has_tickets'] != 1) {
            echo json_encode([
                "success" => false,
                "message" => "This is not a ticket event"
            ]);
            exit;
        }
        
        // Prepare tickets array based on your save structure
        $tickets = [];
        
        // Early Bird Ticket
        if (!empty($event['earlybird_price']) && $event['early_bird_quantity'] > 0) {
            $tickets[] = [
                'ticket_type' => 'Early Bird',
                'price' => floatval($event['earlybird_price']),
                'quantity_available' => intval($event['early_bird_quantity']),
                'description' => 'Limited early bird tickets',
                'type_key' => 'earlyBird'
            ];
        }
        
        // General Admission Ticket
        if (!empty($event['general_price']) && $event['general_quantity'] > 0) {
            $tickets[] = [
                'ticket_type' => 'General Admission',
                'price' => floatval($event['general_price']),
                'quantity_available' => intval($event['general_quantity']),
                'description' => 'Standard admission ticket',
                'type_key' => 'general'
            ];
        }
        
        // VIP Ticket
        if (!empty($event['vip_price']) && $event['vip_quantity'] > 0) {
            $tickets[] = [
                'ticket_type' => 'VIP',
                'price' => floatval($event['vip_price']),
                'quantity_available' => intval($event['vip_quantity']),
                'description' => 'VIP experience with perks',
                'type_key' => 'vip'
            ];
        }
        
        // VVIP Ticket
        if (!empty($event['vvip_price']) && $event['vvip_quantity'] > 0) {
            $tickets[] = [
                'ticket_type' => 'VVIP',
                'price' => floatval($event['vvip_price']),
                'quantity_available' => intval($event['vvip_quantity']),
                'description' => 'Exclusive VVIP experience',
                'type_key' => 'vvip'
            ];
        }
        
        // Also check for ticket_config JSON if available
        $ticketConfig = [];
        if (!empty($event['ticket_config']) && $event['ticket_config'] != '{}') {
            try {
                $config = json_decode($event['ticket_config'], true);
                if (is_array($config)) {
                    $ticketConfig = $config;
                }
            } catch (Exception $e) {
                error_log("Error parsing ticket_config JSON: " . $e->getMessage());
            }
        }
        
        // If no individual ticket columns but we have ticket_config JSON
        if (empty($tickets) && !empty($ticketConfig)) {
            foreach ($ticketConfig as $typeKey => $config) {
                if (!empty($config['price']) && !empty($config['quantity'])) {
                    $tickets[] = [
                        'ticket_type' => $config['name'] ?? ucfirst($typeKey),
                        'price' => floatval($config['price']),
                        'quantity_available' => intval($config['quantity']),
                        'description' => $config['description'] ?? '',
                        'type_key' => $typeKey
                    ];
                }
            }
        }
        
        echo json_encode([
            "success" => true,
            "tickets" => $tickets,
            "event_info" => $event['event_info'] ?? '',
            "guest_limit" => $event['guest_limit'] ?? 0,
            "has_tickets" => $event['has_tickets']
        ]);
        
    } catch (PDOException $e) {
        error_log("getEventTickets PDO Exception: " . $e->getMessage());
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
    exit;
} elseif ($fun === "saveTicketConfiguration") {
    $event_id = $_POST['event_id'] ?? '';
    $has_tickets = isset($_POST['has_tickets']) ? intval($_POST['has_tickets']) : 0;
    $event_info = $_POST['event_info'] ?? '';
    
    // Individual ticket fields
    $earlybird_price = isset($_POST['earlybird_price']) ? floatval($_POST['earlybird_price']) : 0.00;
    $early_bird_quantity = isset($_POST['early_bird_quantity']) ? intval($_POST['early_bird_quantity']) : 0;
    $general_price = isset($_POST['general_price']) ? floatval($_POST['general_price']) : 0.00;
    $general_quantity = isset($_POST['general_quantity']) ? intval($_POST['general_quantity']) : 0;
    $vip_price = isset($_POST['vip_price']) ? floatval($_POST['vip_price']) : 0.00;
    $vip_quantity = isset($_POST['vip_quantity']) ? intval($_POST['vip_quantity']) : 0;
    $vvip_price = isset($_POST['vvip_price']) ? floatval($_POST['vvip_price']) : 0.00;
    $vvip_quantity = isset($_POST['vvip_quantity']) ? intval($_POST['vvip_quantity']) : 0;
    
    $ticket_config = $_POST['ticket_config'] ?? '{}';
    
    if (empty($event_id)) {
        echo json_encode([
            "success" => false,
            "message" => "Event ID is required"
        ]);
        exit;
    }
    
    try {
        // Update event with ticket configuration
        $stmt = $pdo->prepare("
            UPDATE events SET
                has_tickets = :has_tickets,
                event_info = :event_info,
                earlybird_price = :earlybird_price,
                early_bird_quantity = :early_bird_quantity,
                general_price = :general_price,
                general_quantity = :general_quantity,
                vip_price = :vip_price,
                vip_quantity = :vip_quantity,
                vvip_price = :vvip_price,
                vvip_quantity = :vvip_quantity,
                ticket_config = :ticket_config,
                updated_at = NOW()
            WHERE event_id = :event_id
        ");
        
        $stmt->execute([
            ':has_tickets' => $has_tickets,
            ':event_info' => $event_info,
            ':earlybird_price' => $earlybird_price,
            ':early_bird_quantity' => $early_bird_quantity,
            ':general_price' => $general_price,
            ':general_quantity' => $general_quantity,
            ':vip_price' => $vip_price,
            ':vip_quantity' => $vip_quantity,
            ':vvip_price' => $vvip_price,
            ':vvip_quantity' => $vvip_quantity,
            ':ticket_config' => $ticket_config,
            ':event_id' => $event_id
        ]);
        
        // mark configure_tickets checklist item completed if present
        try {
            $upd = $pdo->prepare("UPDATE event_checklist_items SET completed = 1, completed_at = NOW() WHERE event_id = ? AND item_key = 'configure_tickets'");
            $upd->execute([$event_id]);
        } catch (PDOException $ie) {
            // ignore
        }

        echo json_encode([
            "success" => true,
            "message" => "Ticket configuration saved successfully"
        ]);
        
    } catch (PDOException $e) {
        error_log("saveTicketConfiguration PDO Exception: " . $e->getMessage());
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
    exit;
} elseif ($fun === "getTicketSalesStats") {
    $event_id = $_POST['event_id'] ?? '';

    if (empty($event_id)) {
        echo json_encode(["success" => false, "message" => "Event ID required"]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("
            SELECT 
                ticket_type_label,
                SUM(quantity) as tickets_sold,
                SUM(total_amount) as total_revenue
            FROM bookings 
            WHERE event_id = :event_id 
            AND payment_status = 'completed'
            GROUP BY ticket_type_label
            ORDER BY ticket_type_label
        ");

        $stmt->execute([':event_id' => $event_id]);
        $stats = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Also get total tickets available from ticket_events
        $totalStmt = $pdo->prepare("
            SELECT 
                earlybird_quantity,
                general_quantity,
                vip_quantity
            FROM ticket_events 
            WHERE event_id = :event_id
        ");
        
        $totalStmt->execute([':event_id' => $event_id]);
        $quantities = $totalStmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "ticket_stats" => $stats,
            "total_available" => $quantities ? [
                'earlybird' => (int)($quantities['earlybird_quantity'] ?? 0),
                'general' => (int)($quantities['general_quantity'] ?? 0),
                'vip' => (int)($quantities['vip_quantity'] ?? 0)
            ] : null
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
    exit;
} elseif ($fun === "getUserTicketEvents") {
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
            SELECT 
                e.*,
                u.name AS organizer_name,
                u.email AS organizer_email,
                1 AS has_tickets,
                'ticket' AS event_type_category
            FROM ticket_events e
            LEFT JOIN users u ON e.user_id = u.user_id COLLATE utf8mb4_unicode_ci
            WHERE e.user_id = :user_id
            ORDER BY COALESCE(e.event_start_date, e.created_at) DESC
        ");
        
        $stmt->execute([':user_id' => $userID]);
        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Process events
        foreach ($events as &$event) {
            $event['has_tickets'] = 1;
            $event['earlybird_price'] = (float) ($event['earlybird_price'] ?? 0);
            $event['general_price'] = (float) ($event['general_price'] ?? 0);
            $event['vip_price'] = (float) ($event['vip_price'] ?? 0);
            
            $event['earlybird_quantity'] = (int) ($event['earlybird_quantity'] ?? 0);
            $event['general_quantity'] = (int) ($event['general_quantity'] ?? 0);
            $event['vip_quantity'] = (int) ($event['vip_quantity'] ?? 0);
            
            $event['status'] = strtolower($event['status'] ?? 'published');
            $event['event_start_date'] = $event['event_start_date'] ?? null;
            $event['event_end_date'] = $event['event_end_date'] ?? null;
            $event['event_start_time'] = $event['event_start_time'] ?? null;
            $event['event_end_time'] = $event['event_end_time'] ?? null;
            $event['event_location'] = $event['address'] ?? null;
            $event['event_name'] = $event['event_name'] ?? 'Untitled Event';
            $event['event_image'] = $event['event_image'] ?? '/images/default-event.jpg';
        }

        echo json_encode([
            "success" => true,
            "events" => $events,
            "count" => count($events)
        ]);
        
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
    exit;
} elseif ($fun === "getTicketEventById") {
    $event_id = $_POST['event_id'] ?? '';

    if (!$event_id) {
        echo json_encode([
            "success" => false,
            "message" => "Missing event ID",
        ]);
        exit;
    }

    try {
        // Query the ticket_events table with the correct column names
        $stmt = $pdo->prepare("
            SELECT 
                e.*,
                u.name AS organizer_name,
                u.email AS organizer_email
            FROM ticket_events e
            LEFT JOIN users u ON e.user_id = u.user_id COLLATE utf8mb4_unicode_ci
            WHERE e.event_id = :event_id
        ");

        $stmt->execute([":event_id" => $event_id]);
        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Process the event data with correct column names
        if (!empty($events)) {
            foreach ($events as &$event) {
                // Handle price fields with correct column names
                $event['earlybird_price'] = (float) ($event['earlybird_price'] ?? 0);
                $event['general_price'] = (float) ($event['general_price'] ?? 0);
                $event['vip_price'] = (float) ($event['vip_price'] ?? 0);
                
                // Handle quantities
                $event['earlybird_quantity'] = (int) ($event['earlybird_quantity'] ?? 0);
                $event['general_quantity'] = (int) ($event['general_quantity'] ?? 0);
                $event['vip_quantity'] = (int) ($event['vip_quantity'] ?? 0);
                
                // Handle status (if it exists, otherwise default)
                $event['status'] = strtolower($event['status'] ?? 'published');
                
                // Handle has_tickets (check if any tickets are available)
                $hasTickets = (
                    ($event['general_quantity'] > 0 && $event['general_price'] > 0) ||
                    ($event['earlybird_quantity'] > 0 && $event['earlybird_price'] > 0) ||
                    ($event['vip_quantity'] > 0 && $event['vip_price'] > 0)
                );
                $event['has_tickets'] = $hasTickets ? 1 : 0;
                
                // Handle event name
                $event['event_name'] = $event['event_name'] ?? 'Untitled Event';
                
                // Handle event image
                $event['event_image'] = $event['event_image'] ?? '/images/default-event.jpg';
                
                // Handle dates
                $event['event_start_date'] = $event['event_start_date'] ?? null;
                $event['event_start_time'] = $event['event_start_time'] ?? null;
                $event['event_end_time'] = $event['event_end_time'] ?? null;
                
                // Handle location
                $event['event_location'] = $event['address'] ?? null;
                $event['province'] = $event['province'] ?? null;
                $event['city'] = $event['city'] ?? null;
                
                // Handle description
                $event['event_info'] = $event['more_info'] ?? 'No event description available.';
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
} else {
    echo json_encode(['error' => 'Invalid function']);
}