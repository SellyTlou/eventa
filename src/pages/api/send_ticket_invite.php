<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once "dbConnection.php";

try {
    $db  = new Database();
    $pdo = $db->getConnection();

    /* ---------- INPUT VALIDATION ---------- */
    // Check if POST data is received
    if (empty($_POST)) {
        echo json_encode(["success" => false, "message" => "No data received"]);
        exit;
    }

    $guestEmail = isset($_POST['email']) ? trim($_POST['email']) : '';
    $guestName  = isset($_POST['name']) ? trim($_POST['name']) : '';
    $eventId    = isset($_POST['event']) ? trim($_POST['event']) : '';
    $API_URL    = isset($_POST['API_URL']) ? trim($_POST['API_URL']) : '';
    $user_email = isset($_POST['user_email']) ? trim($_POST['user_email']) : '';
    $eventImage = isset($_POST['event_image']) ? trim($_POST['event_image']) : '';
    $eventNameFromForm = isset($_POST['event_name']) ? trim($_POST['event_name']) : '';

    // Validate required fields
    if (empty($guestEmail) || empty($eventId) || empty($API_URL) || empty($user_email)) {
        echo json_encode(["success" => false, "message" => "Missing required fields"]);
        exit;
    }

    // Validate email format
    if (!filter_var($guestEmail, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(["success" => false, "message" => "Invalid email format"]);
        exit;
    }

    /* ---------- CLEAN API_URL ---------- */
    $API_URL = rtrim(str_replace(['/php', '/api'], '', $API_URL), '/');
    if (strpos($API_URL, 'localhost') !== false) {
        $API_URL = 'http://localhost:3000';
    }

    /* ---------- EVENT DETAILS ---------- */
    $stmt = $pdo->prepare("SELECT 
        event_name, 
        event_start_date, 
        event_location, 
        event_image,
        event_info,
        event_start_time,
        event_end_date,
        event_end_time
        FROM events WHERE event_id = ?");
    $stmt->execute([$eventId]);
    $event = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$event) {
        echo json_encode(["success" => false, "message" => "Event not found"]);
        exit;
    }

    // Use event name from form if provided, otherwise from database
    $eventName = !empty($eventNameFromForm) ? $eventNameFromForm : $event['event_name'];
    $eventDate = $event['event_start_date'];
    $eventLocation = $event['event_location'];
    
    /* ---------- IMAGE URL CONSTRUCTION ---------- */
    // Use image from form if provided, otherwise from database
    $eventImageUrl = $event['event_image'];
    
    // Process the image URL to ensure it's a full, accessible URL
    if (!empty($eventImageUrl)) {
        // Check if it's already a full URL
        if (strpos($eventImageUrl, 'http://') === 0 || strpos($eventImageUrl, 'https://') === 0) {
            // Already a full URL, use as-is
            // Just clean it up
            $eventImageUrl = filter_var($eventImageUrl, FILTER_SANITIZE_URL);
        } else {
            // It's not a full URL - extract filename and construct full URL
            $filename = basename($eventImageUrl);
            
            // Your specific uploads directory structure
            $uploadsPath = '/eventa/src/pages/php/uploads/events/';
            
            // Determine base URL based on API_URL
            $parsedUrl = parse_url($API_URL);
            $baseUrl = '';
            
            if (strpos($API_URL, 'localhost') !== false) {
                // Local development - use localhost with port 80
                $baseUrl = 'http://localhost';
            } else {
                // Production - get base from API_URL
                $baseUrl = $parsedUrl['scheme'] . '://' . $parsedUrl['host'];
                if (isset($parsedUrl['port'])) {
                    // Only include port if it's not standard (80 for http, 443 for https)
                    if (!(($parsedUrl['scheme'] === 'http' && $parsedUrl['port'] == 80) || 
                          ($parsedUrl['scheme'] === 'https' && $parsedUrl['port'] == 443))) {
                        $baseUrl .= ':' . $parsedUrl['port'];
                    }
                }
            }
            
            // Construct the full URL
            $eventImageUrl = $baseUrl . $uploadsPath . $filename;
        }
        
        // Clean and encode the URL for HTML use
        $eventImageUrl = htmlspecialchars($eventImageUrl, ENT_QUOTES, 'UTF-8');
    }
    
    // Format event details
    $formattedDate = date('F j, Y', strtotime($eventDate));
    $startTime = !empty($event['event_start_time']) ? date('g:i A', strtotime($event['event_start_time'])) : '';
    $endTime = !empty($event['event_end_time']) ? date('g:i A', strtotime($event['event_end_time'])) : '';
    
    // Build ticket page URL
    $ticketPageLink = "$API_URL/ticketEvent_details?id=" . urlencode($eventId);
    $reportLink = "$API_URL/report-event?event_id=" . urlencode($eventId);

    /* ---------- BREVO API ---------- */
$BREVO_API_KEY = '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';

    // Prepare HTML content with event image if available
    $imageHtml = '';
    $textImageNote = '';
    
    if (!empty($eventImageUrl)) {
        // HTML version with image
        $imageHtml = "
        <div style='margin: 20px 0; text-align: center;'>
            <img src='{$eventImageUrl}' 
                 alt='{$eventName}' 
                 width='560' 
                 height='315'
                 style='max-width: 100%; max-height: 315px; width: auto; height: auto; border-radius: 8px; border: 1px solid #ddd; display: block; margin: 0 auto;'
                 border='0'>
            <div style='font-size: 12px; color: #666; margin-top: 5px;'>
                Event: {$eventName}
            </div>
        </div>";
        
        // Plain text version note
        $textImageNote = "\n\n📸 Event image available at: {$eventImageUrl}\n";
    } else {
        // Fallback when no image is available
        $imageHtml = "
        <div style='margin: 20px 0; text-align: center; background: linear-gradient(135deg, #8b6a35 0%, #b08d57 100%); padding: 40px; border-radius: 8px; color: white;'>
            <div style='font-size: 48px; margin-bottom: 10px;'>🎟️</div>
            <h3 style='margin: 0; color: white;'>{$eventName}</h3>
            <p style='color: rgba(255,255,255,0.9); margin-top: 5px;'>Ticket Event</p>
        </div>";
    }

    // Prepare time display
    $timeDisplay = '';
    if (!empty($startTime)) {
        $timeDisplay = "<p><strong>Time:</strong> {$startTime}";
        if (!empty($endTime)) {
            $timeDisplay .= " to {$endTime}";
        }
        $timeDisplay .= "</p>";
    }

    $payload = [
        "sender" => ["email" => "support@evendi.co.za", "name" => "Evendi (no-reply)"],
        "to" => [["email" => $guestEmail, "name" => $guestName]],
        "subject" => "🎟️ You're Invited to Purchase Tickets for $eventName",
        "htmlContent" => "
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset='UTF-8'>
                <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                <title>Ticket Invitation: {$eventName}</title>
            </head>
            <body style='font-family: Arial, sans-serif; background: #f9f9f9; padding: 20px; margin: 0;'>
                <div style='max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; text-align: center;'>
                    <h2 style='color: #8b6a35; margin-bottom: 20px; border-bottom: 2px solid #f0f0f0; padding-bottom: 15px;'>
                        🎟️ You're Invited to a Ticket Event!
                    </h2>
                    
                    <p style='font-size: 16px; line-height: 1.6; color: #555;'>
                        Hi <strong style='color: #333;'>{$guestName}</strong>,
                    </p>
                    
                    <p style='font-size: 16px; line-height: 1.6; color: #555;'>
                        You're invited to purchase tickets for:
                    </p>
                    
                    <h3 style='color: #333; margin: 20px 0; font-size: 24px;'>
                        {$eventName}
                    </h3>
                    
                    {$imageHtml}
                    
                    <div style='text-align: left; background: #f8f5f0; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #8b6a35;'>
                        <h4 style='color: #8b6a35; margin-top: 0; margin-bottom: 15px;'>📅 Event Details</h4>
                        <p style='margin: 8px 0; color: #555;'><strong>Date:</strong> {$formattedDate}</p>
                        {$timeDisplay}
                        <p style='margin: 8px 0; color: #555;'><strong>Location:</strong> {$eventLocation}</p>
                    </div>
                    
                    <p style='margin: 25px 0; font-size: 16px; line-height: 1.6; color: #555;'>
                        Click the button below to view event details and purchase tickets:
                    </p>
                    
                    <a href='{$ticketPageLink}'
                       style='background: linear-gradient(135deg, #8b6a35 0%, #b08d57 100%); color: white; padding: 16px 36px; 
                              text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; 
                              margin: 15px 0; font-size: 16px; border: none; cursor: pointer; box-shadow: 0 4px 6px rgba(139, 106, 53, 0.2);'>
                        🎫 View Event & Purchase Tickets
                    </a>
                    
                    <div style='margin-top: 35px; padding: 20px; background: #f0f7ff; border-radius: 8px; text-align: left; border: 1px solid #d0e7ff;'>
                        <h4 style='color: #2c5282; margin-top: 0; margin-bottom: 15px;'>📋 What to Expect:</h4>
                        <ul style='color: #555; margin-left: 20px; padding-left: 0;'>
                            <li style='margin-bottom: 8px;'>View detailed event information</li>
                            <li style='margin-bottom: 8px;'>Select from available ticket types</li>
                            <li style='margin-bottom: 8px;'>Secure online ticket purchase</li>
                            <li style='margin-bottom: 8px;'>Instant digital ticket delivery</li>
                            <li>Easy event access with your ticket</li>
                        </ul>
                    </div>
                    
                    <div style='margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;'>
                        <p style='font-size: 12px; color: #888; line-height: 1.5;'>
                            If you believe this event contains inappropriate content,
                            <a href='{$reportLink}' style='color: #8B0000; text-decoration: underline;'>report it here</a>.
                        </p>
                        
                        <p style='font-size: 14px; color: #666; margin-top: 15px;'>
                            <strong>Need help?</strong> Contact the event organizer at: 
                            <a href='mailto:{$user_email}' style='color: #8b6a35; text-decoration: none;'>
                                {$user_email}
                            </a>
                        </p>
                        
                        <p style='font-size: 12px; color: #999; margin-top: 20px; padding: 10px; background: #f9f9f9; border-radius: 4px;'>
                            If the images aren't displaying, please ensure your email client allows images from external sources.
                        </p>
                    </div>
                </div>
            </body>
            </html>",
        "textContent" => "Hi {$guestName},

YOU'RE INVITED TO PURCHASE TICKETS FOR:
========================================
{$eventName}
========================================

{$textImageNote}
📅 DATE: {$formattedDate}
📍 LOCATION: {$eventLocation}"
 . (!empty($startTime) ? "\n⏰ TIME: {$startTime}" . (!empty($endTime) ? " to {$endTime}" : "") : "") . "

🎟️ PURCHASE TICKETS:
{$ticketPageLink}

WHAT TO EXPECT:
• View detailed event information
• Select from available ticket types
• Secure online ticket purchase
• Instant digital ticket delivery
• Easy event access with your ticket

NEED HELP?
Contact the event organizer at: {$user_email}

REPORT INAPPROPRIATE CONTENT:
{$reportLink}

— Evendi Team
================================"
    ];

    /* ---------- cURL ---------- */
    $ch = curl_init("https://api.brevo.com/v3/smtp/email");
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            "api-key: $BREVO_API_KEY",
            "Content-Type: application/json",
            "Accept: application/json",
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);

    $response = curl_exec($ch);
    $curlError = curl_error($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    /* ---------- RESPONSE ---------- */
    if ($curlError) {
        error_log("cURL Error: " . $curlError);
        echo json_encode([
            "success" => false,
            "message" => "cURL error: " . $curlError,
        ]);
        exit;
    }

    if ($status === 201) {
        echo json_encode([
            "success" => true,
            "message" => "Ticket invitation sent successfully!",
            "ticketLink" => $ticketPageLink,
            "imageUrl" => $eventImageUrl,
        ]);
    } else {
        error_log("Brevo API Error - Status: $status, Response: " . $response);
        $debugInfo = json_decode($response, true) ?: $response;
        echo json_encode([
            "success" => false,
            "message" => "Failed to send ticket invitation. API returned status: $status",
            "debug" => $debugInfo,
            "constructedImageUrl" => $eventImageUrl,
        ]);
    }

} catch (Exception $e) {
    error_log("Ticket invitation error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
    echo json_encode([
        "success" => false, 
        "message" => "Server error: " . $e->getMessage(),
        "trace" => $e->getTraceAsString()
    ]);
}