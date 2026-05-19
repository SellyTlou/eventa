<?php
// Add at the very top
ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

ini_set('display_errors', 0);
error_reporting(E_ALL);

// Function to send clean JSON response
function sendJsonResponse($success, $message) {
    ob_clean(); // Clear any accidental output
    echo json_encode([
        'success' => $success,
        'message' => $message
    ]);
    exit;
}

try {
    // Collect POST data
    $email = $_POST['customer_email'] ?? '';
    $firstName = $_POST['customer_first_name'] ?? '';
    $lastName = $_POST['customer_last_name'] ?? '';
    $eventName = $_POST['event_name'] ?? '';
    $eventDate = $_POST['event_date'] ?? '';
    $eventTime = $_POST['event_time'] ?? '';
    $event_image = $_POST['event_image'] ?? '';
    $eventLocation = $_POST['event_location'] ?? '';
    $ticketType = $_POST['ticket_type_label'] ?? '';
    $quantity = intval($_POST['quantity'] ?? 1);
    $unitPrice = floatval($_POST['unit_price'] ?? 0);
    $totalAmount = floatval($_POST['total_amount'] ?? 0);
    $transactionId = $_POST['transaction_id'] ?? '';
    $paymentMethod = $_POST['payment_method'] ?? '';

    // Required fields validation
    if (empty($email) || empty($eventName) || empty($transactionId)) {
        sendJsonResponse(false, "Missing required fields");
    }

    // -------------------- CREATE PDF WITH HTML CONTENT --------------------
    $pdfString = '';
    
    if (class_exists('TCPDF')) {
        require_once('tcpdf/tcpdf.php');
        
        $pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);
        $pdf->SetCreator('Eventa Tickets');
        $pdf->SetAuthor('Eventa');
        $pdf->SetTitle('Ticket for ' . $eventName);
        $pdf->SetSubject('Event Ticket');
        $pdf->SetKeywords('Ticket, Event, ' . $eventName);
        
        // Remove default header/footer
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);
        
        // Add a page
        $pdf->AddPage();
        
        // Colors matching HTML
        $headerColor = array(41, 128, 185); // Blue header #2980b9
        $ticketBorderColor = array(41, 128, 185); // Blue border #2980b9
        $highlightBoxColor = array(232, 244, 252); // Light blue highlight #e8f4fc
        $footerColor = array(127, 140, 141); // Gray footer #7f8c8d
        $successColor = array(39, 174, 96); // Green for total #27ae60
        $ticketNumberBg = array(44, 62, 80); // Dark blue-gray #2c3e50
        
        // ---------- HEADER SECTION ----------
        // Blue header background
        $pdf->SetFillColor($headerColor[0], $headerColor[1], $headerColor[2]);
        $pdf->Rect(0, 0, 210, 50, 'F');
        
        // Header content
        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetFont('helvetica', 'B', 24);
        $pdf->SetY(15);
        $pdf->Cell(0, 10, '🎟️ Your Ticket is Ready!', 0, 1, 'C');
        
        $pdf->SetFont('helvetica', '', 14);
        $pdf->SetTextColor(255, 255, 255, 0.9);
        $pdf->Cell(0, 8, $eventName, 0, 1, 'C');
        
        // ---------- GREETING SECTION ----------
        $pdf->SetY(60);
        $pdf->SetTextColor(51, 51, 51); // #333
        $pdf->SetFont('helvetica', '', 12);
        $pdf->Cell(0, 8, 'Hi ' . $firstName . ',', 0, 1, 'L');
        $pdf->Ln(5);
        
        $pdf->MultiCell(0, 8, 'Thank you for booking your ticket to ' . $eventName . '. Your booking has been confirmed!', 0, 'L');
        $pdf->Ln(10);
        
        // ---------- TICKET CARD SECTION ----------
        // Ticket card with blue border
        $pdf->SetDrawColor($ticketBorderColor[0], $ticketBorderColor[1], $ticketBorderColor[2]);
        $pdf->SetLineWidth(4);
        $ticketCardY = $pdf->GetY();
        $pdf->Rect(10, $ticketCardY, 190, 160, 'D'); // Outer border
        
        // Ticket header
        $pdf->SetY($ticketCardY + 10);
        $pdf->SetX(15);
        $pdf->SetFont('helvetica', 'B', 18);
        $pdf->SetTextColor(52, 152, 219); // #3498db
        $pdf->Cell(0, 10, '📋 Booking Summary', 0, 1, 'L');
        
        $pdf->SetTextColor(51, 51, 51);
        $pdf->SetFont('helvetica', '', 12);
        
        // Booking details - Event
        $pdf->SetY($ticketCardY + 30);
        $pdf->SetX(15);
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->SetTextColor(44, 62, 80); // #2c3e50
        $pdf->Cell(40, 8, 'Event:', 0, 0, 'L');
        $pdf->SetFont('helvetica', '', 12);
        $pdf->SetTextColor(52, 73, 94); // #34495e
        $pdf->Cell(0, 8, $eventName, 0, 1, 'L');
        
        // Date & Time
        $formattedDate = !empty($eventDate) ? date("F j, Y", strtotime($eventDate)) : 'Date TBA';
        $pdf->SetY($pdf->GetY());
        $pdf->SetX(15);
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->SetTextColor(44, 62, 80);
        $pdf->Cell(40, 8, 'Date & Time:', 0, 0, 'L');
        $pdf->SetFont('helvetica', '', 12);
        $pdf->SetTextColor(52, 73, 94);
        $pdf->Cell(0, 8, $formattedDate . ' at ' . $eventTime, 0, 1, 'L');
        
        // Venue
        $pdf->SetY($pdf->GetY());
        $pdf->SetX(15);
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->SetTextColor(44, 62, 80);
        $pdf->Cell(40, 8, 'Venue:', 0, 0, 'L');
        $pdf->SetFont('helvetica', '', 12);
        $pdf->SetTextColor(52, 73, 94);
        $pdf->Cell(0, 8, $eventLocation, 0, 1, 'L');
        
        // Attendee
        $pdf->SetY($pdf->GetY());
        $pdf->SetX(15);
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->SetTextColor(44, 62, 80);
        $pdf->Cell(40, 8, 'Attendee:', 0, 0, 'L');
        $pdf->SetFont('helvetica', '', 12);
        $pdf->SetTextColor(52, 73, 94);
        $pdf->Cell(0, 8, $firstName . ' ' . $lastName, 0, 1, 'L');
        
        // Ticket Type
        $pdf->SetY($pdf->GetY());
        $pdf->SetX(15);
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->SetTextColor(44, 62, 80);
        $pdf->Cell(40, 8, 'Ticket Type:', 0, 0, 'L');
        $pdf->SetFont('helvetica', '', 12);
        $pdf->SetTextColor(52, 73, 94);
        $pdf->Cell(0, 8, $ticketType, 0, 1, 'L');
        
        // Quantity
        $pdf->SetY($pdf->GetY());
        $pdf->SetX(15);
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->SetTextColor(44, 62, 80);
        $pdf->Cell(40, 8, 'Quantity:', 0, 0, 'L');
        $pdf->SetFont('helvetica', '', 12);
        $pdf->SetTextColor(52, 73, 94);
        $pdf->Cell(0, 8, $quantity . ' ticket(s)', 0, 1, 'L');
        
        // Total Paid
        $pdf->SetY($pdf->GetY());
        $pdf->SetX(15);
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->SetTextColor(44, 62, 80);
        $pdf->Cell(40, 8, 'Total Paid:', 0, 0, 'L');
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->SetTextColor($successColor[0], $successColor[1], $successColor[2]);
        $pdf->Cell(0, 8, 'R ' . number_format($totalAmount, 2), 0, 1, 'L');
        
        // ---------- TICKET NUMBER SECTION ----------
        $pdf->SetY($ticketCardY + 130);
        $pdf->SetX(15);
        $pdf->SetFillColor($ticketNumberBg[0], $ticketNumberBg[1], $ticketNumberBg[2]);
        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetFont('courier', 'B', 18);
        
        $ticketNumber = 'EVT-' . strtoupper(substr($eventName, 0, 3)) . '-' . str_pad($transactionId, 8, '0', STR_PAD_LEFT);
        $pdf->Cell(180, 20, 'TICKET: ' . $ticketNumber, 0, 1, 'C', true);
        
        // Transaction ID
        $pdf->SetY($pdf->GetY() + 5);
        $pdf->SetX(15);
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->SetTextColor(44, 62, 80);
        $pdf->Cell(40, 8, 'Transaction ID:', 0, 0, 'L');
        $pdf->SetFont('courier', '', 12);
        $pdf->SetTextColor(231, 76, 60); // #e74c3c
        $pdf->Cell(0, 8, $transactionId, 0, 1, 'L');
        
        // ---------- HIGHLIGHT BOX SECTION ----------
        $pdf->SetY($pdf->GetY() + 15);
        $pdf->SetFillColor($highlightBoxColor[0], $highlightBoxColor[1], $highlightBoxColor[2]);
        $pdf->SetDrawColor($ticketBorderColor[0], $ticketBorderColor[1], $ticketBorderColor[2]);
        $pdf->SetLineWidth(1);
        $pdf->Rect(10, $pdf->GetY(), 190, 35, 'DF');
        
        $pdf->SetY($pdf->GetY() + 5);
        $pdf->SetX(15);
        $pdf->SetFont('helvetica', 'B', 14);
        $pdf->SetTextColor(41, 128, 185);
        $pdf->Cell(0, 8, '📎 Your Ticket PDF is Attached', 0, 1, 'L');
        
        $pdf->SetY($pdf->GetY());
        $pdf->SetX(15);
        $pdf->SetFont('helvetica', '', 12);
        $pdf->SetTextColor(51, 51, 51);
        $pdf->MultiCell(180, 6, 'Please print the attached PDF ticket or show it on your mobile device at the event entrance.', 0, 'L');
        
        // ---------- IMPORTANT INFORMATION SECTION ----------
        $pdf->SetY($pdf->GetY() + 10);
        $pdf->SetX(15);
        $pdf->SetFont('helvetica', 'B', 14);
        $pdf->SetTextColor(51, 51, 51);
        $pdf->Cell(0, 8, 'Important Information:', 0, 1, 'L');
        
        $pdf->SetY($pdf->GetY());
        $pdf->SetX(20);
        $pdf->SetFont('helvetica', '', 12);
        
        // Bullet points
        $bullet = "• ";
        $pdf->Cell(10, 8, $bullet, 0, 0, 'L');
        $pdf->MultiCell(170, 8, 'Please arrive at least 30 minutes before the event starts', 0, 'L');
        
        $pdf->SetX(20);
        $pdf->Cell(10, 8, $bullet, 0, 0, 'L');
        $pdf->MultiCell(170, 8, 'Bring a valid ID matching the attendee name', 0, 'L');
        
        $pdf->SetX(20);
        $pdf->Cell(10, 8, $bullet, 0, 0, 'L');
        $pdf->MultiCell(170, 8, 'Tickets are non-transferable and non-refundable', 0, 'L');
        
        $pdf->SetX(20);
        $pdf->Cell(10, 8, $bullet, 0, 0, 'L');
        $pdf->MultiCell(170, 8, 'For any questions, reply to this email', 0, 'L');
        
        $pdf->Ln(10);
        
        // Closing message
        $pdf->SetX(15);
        $pdf->SetFont('helvetica', '', 12);
        $pdf->Cell(0, 8, 'We look forward to seeing you at the event!', 0, 1, 'L');
        
        // ---------- FOOTER SECTION ----------
        $pdf->SetY(250);
        $pdf->SetLineWidth(0.5);
        $pdf->SetDrawColor(238, 238, 238); // #eee
        $pdf->Line(10, $pdf->GetY(), 200, $pdf->GetY());
        
        $pdf->SetY($pdf->GetY() + 5);
        $pdf->SetX(15);
        $pdf->SetFont('helvetica', '', 12);
        $pdf->SetTextColor($footerColor[0], $footerColor[1], $footerColor[2]);
        
        $pdf->Cell(0, 8, 'Best regards,', 0, 1, 'L');
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->Cell(0, 8, 'Eventa Team', 0, 1, 'L');
        
        $pdf->SetFont('helvetica', '', 12);
        $pdf->SetTextColor(41, 128, 185); // Blue link color
        $pdf->Cell(0, 8, 'support@eventa.com', 0, 1, 'L');
        
        // Copyright
        $pdf->SetY($pdf->GetY() + 5);
        $pdf->SetX(15);
        $pdf->SetFont('helvetica', '', 10);
        $pdf->SetTextColor($footerColor[0], $footerColor[1], $footerColor[2]);
        $pdf->Cell(0, 8, '© ' . date("Y") . ' Eventa. All rights reserved.', 0, 1, 'L');
        
        // Email sent to
        $pdf->SetX(15);
        $pdf->SetFont('helvetica', 'I', 10);
        $pdf->Cell(0, 8, 'This email was sent to ' . $email, 0, 1, 'L');
        
        // Output PDF as string
        $pdfString = $pdf->Output('', 'S');
        
    } elseif (class_exists('FPDF')) {
        // FPDF fallback version (simplified)
        require_once('fpdf/fpdf.php');
        
        class PDF extends FPDF {
            function Header() {}
            function Footer() {}
        }
        
        $pdf = new PDF('P', 'mm', 'A4');
        $pdf->AddPage();
        
        // Header
        $pdf->SetFillColor(41, 128, 185);
        $pdf->Rect(0, 0, 210, 50, 'F');
        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetFont('Arial', 'B', 24);
        $pdf->SetY(15);
        $pdf->Cell(0, 10, 'Your Ticket is Ready!', 0, 1, 'C');
        $pdf->SetFont('Arial', '', 14);
        $pdf->Cell(0, 8, $eventName, 0, 1, 'C');
        
        // Content
        $pdf->SetY(60);
        $pdf->SetTextColor(0, 0, 0);
        $pdf->SetFont('Arial', '', 12);
        $pdf->Cell(0, 8, 'Hi ' . $firstName . ',', 0, 1, 'L');
        $pdf->Ln(5);
        $pdf->MultiCell(0, 8, 'Thank you for booking your ticket to ' . $eventName . '. Your booking has been confirmed!', 0, 'L');
        $pdf->Ln(10);
        
        // Ticket card
        $pdf->SetDrawColor(41, 128, 185);
        $pdf->SetLineWidth(4);
        $pdf->Rect(10, $pdf->GetY(), 190, 100);
        
        $pdf->SetY($pdf->GetY() + 10);
        $pdf->SetX(15);
        $pdf->SetFont('Arial', 'B', 18);
        $pdf->SetTextColor(52, 152, 219);
        $pdf->Cell(0, 10, 'Booking Summary', 0, 1, 'L');
        
        $pdf->SetTextColor(0, 0, 0);
        $formattedDate = !empty($eventDate) ? date("F j, Y", strtotime($eventDate)) : 'Date TBA';
        
        // Details
        $details = array(
            'Event:' => $eventName,
            'Date & Time:' => $formattedDate . ' at ' . $eventTime,
            'Venue:' => $eventLocation,
            'Attendee:' => $firstName . ' ' . $lastName,
            'Ticket Type:' => $ticketType,
            'Quantity:' => $quantity . ' ticket(s)',
            'Total Paid:' => 'R ' . number_format($totalAmount, 2),
            'Transaction ID:' => $transactionId
        );
        
        $pdf->SetY($pdf->GetY() + 5);
        foreach ($details as $label => $value) {
            $pdf->SetX(15);
            $pdf->SetFont('Arial', 'B', 12);
            $pdf->Cell(50, 8, $label, 0, 0, 'L');
            $pdf->SetFont('Arial', '', 12);
            $pdf->Cell(0, 8, $value, 0, 1, 'L');
        }
        
        // Ticket number
        $pdf->SetY($pdf->GetY() + 10);
        $pdf->SetFillColor(44, 62, 80);
        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetFont('Courier', 'B', 16);
        $ticketNumber = 'EVT-' . strtoupper(substr($eventName, 0, 3)) . '-' . str_pad($transactionId, 8, '0', STR_PAD_LEFT);
        $pdf->Cell(180, 15, 'TICKET: ' . $ticketNumber, 0, 1, 'C', true);
        
        // Important notes
        $pdf->SetY($pdf->GetY() + 15);
        $pdf->SetTextColor(0, 0, 0);
        $pdf->SetFont('Arial', 'B', 14);
        $pdf->Cell(0, 10, 'Important Information:', 0, 1, 'L');
        
        $notes = array(
            '• Please arrive at least 30 minutes before the event starts',
            '• Bring a valid ID matching the attendee name',
            '• Tickets are non-transferable and non-refundable',
            '• For any questions, reply to this email'
        );
        
        $pdf->SetFont('Arial', '', 12);
        foreach ($notes as $note) {
            $pdf->SetX(20);
            $pdf->Cell(0, 8, $note, 0, 1, 'L');
        }
        
        $pdf->Ln(10);
        $pdf->Cell(0, 8, 'We look forward to seeing you at the event!', 0, 1, 'L');
        
        // Footer
        $pdf->SetY(250);
        $pdf->SetFont('Arial', '', 12);
        $pdf->Cell(0, 8, 'Best regards,', 0, 1, 'L');
        $pdf->SetFont('Arial', 'B', 12);
        $pdf->Cell(0, 8, 'Eventa Team', 0, 1, 'L');
        $pdf->SetFont('Arial', '', 12);
        $pdf->Cell(0, 8, 'support@eventa.com', 0, 1, 'L');
        
        $pdf->SetFont('Arial', '', 10);
        $pdf->Cell(0, 8, '© ' . date("Y") . ' Eventa. All rights reserved.', 0, 1, 'L');
        $pdf->Cell(0, 8, 'This email was sent to ' . $email, 0, 1, 'L');
        
        $pdfString = $pdf->Output('S');
        
    } else {
        // Basic fallback PDF
        $pdfContent = "%PDF-1.4\n";
        $pdfContent .= "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
        $pdfContent .= "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
        $pdfContent .= "3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /MediaBox [0 0 612 792] /Contents 6 0 R >>\nendobj\n";
        $pdfContent .= "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n";
        $pdfContent .= "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";
        
        $formattedDate = !empty($eventDate) ? date("F j, Y", strtotime($eventDate)) : 'Date TBA';
        $ticketNumber = 'EVT-' . strtoupper(substr($eventName, 0, 3)) . '-' . str_pad($transactionId, 8, '0', STR_PAD_LEFT);
        
        $text = "================================================================\n";
        $text .= "                     YOUR TICKET IS READY!                        \n";
        $text .= "                     " . $eventName . "                          \n";
        $text .= "================================================================\n\n";
        
        $text .= "Hi " . $firstName . ",\n\n";
        $text .= "Thank you for booking your ticket to " . $eventName . ". Your booking has been confirmed!\n\n";
        $text .= "BOOKING SUMMARY:\n";
        $text .= "================\n";
        $text .= "Event: " . $eventName . "\n";
        $text .= "Date & Time: " . $formattedDate . " at " . $eventTime . "\n";
        $text .= "Venue: " . $eventLocation . "\n";
        $text .= "Attendee: " . $firstName . " " . $lastName . "\n";
        $text .= "Ticket Type: " . $ticketType . "\n";
        $text .= "Quantity: " . $quantity . " ticket(s)\n";
        $text .= "Total Paid: R " . number_format($totalAmount, 2) . "\n";
        $text .= "Transaction ID: " . $transactionId . "\n";
        $text .= "Ticket Number: " . $ticketNumber . "\n\n";
        
        $text .= "IMPORTANT INFORMATION:\n";
        $text .= "====================\n";
        $text .= "• Please arrive at least 30 minutes before the event starts\n";
        $text .= "• Bring a valid ID matching the attendee name\n";
        $text .= "• Tickets are non-transferable and non-refundable\n";
        $text .= "• For any questions, reply to this email\n\n";
        
        $text .= "We look forward to seeing you at the event!\n\n";
        $text .= "Best regards,\n";
        $text .= "Eventa Team\n";
        $text .= "support@eventa.com\n\n";
        $text .= "© " . date("Y") . " Eventa. All rights reserved.\n";
        $text .= "This email was sent to " . $email . "\n";
        $text .= "================================================================\n";
        
        $content = "BT\n";
        $content .= "/F1 24 Tf\n";
        $content .= "72 750 Td\n";
        $content .= "(YOUR TICKET IS READY!) Tj\n";
        $content .= "/F2 12 Tf\n";
        $content .= "72 720 Td\n";
        $content .= "(" . str_replace("\n", ") Tj\nT*\n(", $text) . ") Tj\n";
        $content .= "ET\n";
        
        $pdfContent .= "6 0 obj\n<< /Length " . strlen($content) . " >>\nstream\n" . $content . "\nendstream\nendobj\n";
        $pdfContent .= "xref\n0 7\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000106 00000 n \n0000000227 00000 n \n0000000284 00000 n \n0000000350 00000 n \n";
        $pdfContent .= "trailer\n<< /Size 7 /Root 1 0 R >>\n";
        $pdfContent .= "startxref\n" . (strlen($pdfContent) - 100) . "\n%%EOF";
        
        $pdfString = $pdfContent;
    }

    if (empty($pdfString)) {
        throw new Exception("PDF generation failed - empty output");
    }

    // -------------------- SEND EMAIL VIA BREVO --------------------
    $BREVO_API_KEY = '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';

    $htmlContent = '<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Ticket for ' . htmlspecialchars($eventName) . '</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2980b9; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 25px; border-radius: 0 0 8px 8px; border: 1px solid #dee2e6; border-top: none; }
            .ticket-card { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #2980b9; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .ticket-header { color: #3498db; font-size: 18px; font-weight: bold; margin-top: 0; }
            .info-row { margin-bottom: 12px; }
            .label { font-weight: bold; color: #2c3e50; display: inline-block; width: 120px; }
            .value { color: #34495e; }
            .highlight-box { background: #e8f4fc; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #3498db; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #7f8c8d; font-size: 12px; }
            .ticket-number { background: #2c3e50; color: white; padding: 10px; text-align: center; font-family: monospace; font-size: 18px; border-radius: 4px; letter-spacing: 2px; margin: 15px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1 style="margin: 0; font-size: 24px;">🎟️ Your Ticket is Ready!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">' . htmlspecialchars($eventName) . '</p>
        </div>
        
        <div class="content">
            <p>Hi <strong>' . htmlspecialchars($firstName) . '</strong>,</p>
            <p>Thank you for booking your ticket to <strong>' . htmlspecialchars($eventName) . '</strong>. Your booking has been confirmed!</p>
            
            <div class="ticket-card">
                <h3 class="ticket-header">📋 Booking Summary</h3>
                
                <div class="info-row">
                    <span class="label">Event:</span>
                    <span class="value">' . htmlspecialchars($eventName) . '</span>
                </div>
                
                <div class="info-row">
                    <span class="label">Date & Time:</span>
                    <span class="value">' . htmlspecialchars(date("F j, Y", strtotime($eventDate))) . ' at ' . htmlspecialchars($eventTime) . '</span>
                </div>
                
                <div class="info-row">
                    <span class="label">Venue:</span>
                    <span class="value">' . htmlspecialchars($eventLocation) . '</span>
                </div>
                
                <div class="info-row">
                    <span class="label">Attendee:</span>
                    <span class="value">' . htmlspecialchars($firstName . ' ' . $lastName) . '</span>
                </div>
                
                <div class="info-row">
                    <span class="label">Ticket Type:</span>
                    <span class="value">' . htmlspecialchars($ticketType) . '</span>
                </div>
                
                <div class="info-row">
                    <span class="label">Quantity:</span>
                    <span class="value">' . htmlspecialchars($quantity) . ' ticket(s)</span>
                </div>
                
                <div class="info-row">
                    <span class="label">Total Paid:</span>
                    <span class="value" style="color: #27ae60; font-weight: bold;">R ' . number_format($totalAmount, 2) . '</span>
                </div>
                
                <div class="ticket-number">
                    TICKET: EVT-' . strtoupper(substr($eventName, 0, 3)) . '-' . str_pad($transactionId, 8, '0', STR_PAD_LEFT) . '
                </div>
                
                <div class="info-row">
                    <span class="label">Transaction ID:</span>
                    <span class="value" style="font-family: monospace; color: #e74c3c;">' . htmlspecialchars($transactionId) . '</span>
                </div>
            </div>
            
            <div class="highlight-box">
                <p style="margin: 0; font-weight: bold;">📎 Your Ticket PDF is Attached</p>
                <p style="margin: 5px 0 0 0; font-size: 14px;">
                    Please print the attached PDF ticket or show it on your mobile device at the event entrance.
                </p>
            </div>
            
            <p><strong>Important Information:</strong></p>
            <ul style="margin-top: 5px;">
                <li>Please arrive at least 30 minutes before the event starts</li>
                <li>Bring a valid ID matching the attendee name</li>
                <li>Tickets are non-transferable and non-refundable</li>
                <li>For any questions, reply to this email</li>
            </ul>
            
            <p>We look forward to seeing you at the event!</p>
            
            <div class="footer">
                <p style="margin: 0;">
                    Best regards,<br>
                    <strong>Eventa Team</strong><br>
                    <a href="mailto:support@eventa.com" style="color: #2980b9;">support@eventa.com</a>
                </p>
                <p style="margin: 10px 0 0 0; font-size: 11px;">
                    © ' . date("Y") . ' Eventa. All rights reserved.<br>
                    This email was sent to ' . htmlspecialchars($email) . '
                </p>
            </div>
        </div>
    </body>
    </html>';

    // Plain text version for email clients that don't support HTML
    $textContent = "Your Ticket for $eventName\n\n";
    $textContent .= "Hi $firstName,\n\n";
    $textContent .= "Thank you for booking your ticket to $eventName. Your booking has been confirmed!\n\n";
    $textContent .= "📋 BOOKING SUMMARY:\n";
    $textContent .= "===================\n";
    $textContent .= "Event: $eventName\n";
    $textContent .= "Date: " . date("F j, Y", strtotime($eventDate)) . "\n";
    $textContent .= "Time: $eventTime\n";
    $textContent .= "Venue: $eventLocation\n";
    $textContent .= "Attendee: $firstName $lastName\n";
    $textContent .= "Email: $email\n";
    $textContent .= "Ticket Type: $ticketType\n";
    $textContent .= "Quantity: $quantity ticket(s)\n";
    $textContent .= "Total Paid: R " . number_format($totalAmount, 2) . "\n";
    $textContent .= "Transaction ID: $transactionId\n";
    $textContent .= "Ticket Number: EVT-" . strtoupper(substr($eventName, 0, 3)) . "-" . str_pad($transactionId, 8, '0', STR_PAD_LEFT) . "\n\n";
    $textContent .= "📎 Your ticket PDF is attached to this email.\n";
    $textContent .= "Please print it or show it on your mobile device at the event entrance.\n\n";
    $textContent .= "Important Information:\n";
    $textContent .= "- Please arrive at least 30 minutes before the event starts\n";
    $textContent .= "- Bring a valid ID matching the attendee name\n";
    $textContent .= "- Tickets are non-transferable and non-refundable\n";
    $textContent .= "- For any questions, reply to this email\n\n";
    $textContent .= "We look forward to seeing you at the event!\n\n";
    $textContent .= "Best regards,\n";
    $textContent .= "Eventa Team\n";
    $textContent .= "support@eventa.com\n\n";
    $textContent .= "© " . date("Y") . " Eventa. All rights reserved.\n";
    $textContent .= "This email was sent to $email";

    $payload = [
        "sender" => [
            "email" => "ananiasndou0@gmail.com",
            "name" => "Eventa Tickets"
        ],
        "to" => [[
            "email" => $email,
            "name" => "$firstName $lastName"
        ]],
        "subject" => "Your Ticket for $eventName",
        "htmlContent" => $htmlContent,
        "textContent" => $textContent,
        "attachment" => [[
            "content" => base64_encode($pdfString),
            "name" => "Ticket_" . preg_replace('/[^A-Za-z0-9_-]/', '_', $eventName) . ".pdf",
            "type" => "application/pdf"
        ]]
    ];

    $ch = curl_init("https://api.brevo.com/v3/smtp/email");
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            "api-key: $BREVO_API_KEY",
            "Content-Type: application/json",
            "Accept: application/json"
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
    ]);

    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($status === 201) {
        sendJsonResponse(true, "Ticket sent to $email");
    } else {
        error_log("Brevo API Error: Status $status, Response: $response");
        sendJsonResponse(false, "Could not send email. Please save your transaction ID: $transactionId");
    }

} catch (Exception $e) {
    error_log("PHP Error: " . $e->getMessage());
    sendJsonResponse(false, "Error: " . $e->getMessage());
}

ob_end_flush();
?>