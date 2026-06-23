<?php
require_once "dbConnection.php";

$db = new Database();
$pdo = $db->getConnection();

$bookingId = $_GET['booking_id'] ?? '';

if (empty($bookingId)) {
    die("<h2 style='color:red;text-align:center;'>Invalid Ticket Link</h2>");
}

$stmt = $pdo->prepare("
    SELECT b.*, te.event_name, te.event_start_date, te.event_start_time, te.address, te.city, te.province
    FROM bookings b
    LEFT JOIN ticket_events te ON b.event_id = te.event_id
    WHERE b.bookingId = ?
");
$stmt->execute([$bookingId]);
$ticket = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$ticket) {
    die("<h2 style='color:red;text-align:center;'>Ticket Not Found</h2>");
}

$status = strtolower($ticket['payment_status'] ?? '');

$isValid = $status === 'completed';
$isPending = $status === 'pending';
$isFailed = $status === 'failed';

function statusColor($status) {
    if ($status === 'completed') return '#00c853'; // green
    if ($status === 'pending') return '#ffab00';   // orange
    return '#d50000'; // red
}

function statusText($status) {
    if ($status === 'completed') return 'VALID TICKET';
    if ($status === 'pending') return 'PENDING PAYMENT';
    return 'EXPIRED / INVALID TICKET';
}

$color = statusColor($status);
$text = statusText($status);
?>

<!DOCTYPE html>
<html>
<head>
    <title>Ticket</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #f4f4f4;
            margin: 0;
            padding: 0;
        }

        .ticket {
            max-width: 600px;
            margin: 40px auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }

        .status {
            background: <?= $color ?>;
            color: white;
            text-align: center;
            padding: 30px 10px;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 2px;
        }

        .content {
            padding: 20px;
        }

        .big {
            font-size: 18px;
            margin: 10px 0;
        }

        .label {
            font-weight: bold;
        }

        .event {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .footer {
            text-align: center;
            padding: 15px;
            font-size: 12px;
            color: #888;
        }
    </style>
</head>

<body>

<div class="ticket">

    <!-- BIG STATUS HEADER -->
    <div class="status">
        <?= $text ?>
    </div>

    <div class="content">

        <div class="event"><?= $ticket['event_name'] ?></div>

        <div class="big">
            <span class="label">Booking ID:</span> <?= $ticket['bookingId'] ?>
        </div>

        <div class="big">
            <span class="label">Name:</span>
            <?= $ticket['customer_first_name'] . " " . $ticket['customer_last_name'] ?>
        </div>

        <div class="big">
            <span class="label">Date:</span>
            <?= date("F j, Y", strtotime($ticket['event_start_date'])) ?>
        </div>

        <div class="big">
            <span class="label">Time:</span>
            <?= $ticket['event_start_time'] ?>
        </div>

        <div class="big">
            <span class="label">Location:</span>
            <?= $ticket['address'] . ", " . $ticket['city'] . ", " . $ticket['province'] ?>
        </div>

        <hr>

        <div class="big">
            <span class="label">Ticket Type:</span> <?= ucfirst($ticket['ticket_type']) ?>
        </div>

        <div class="big">
            <span class="label">Quantity:</span> <?= $ticket['quantity'] ?>
        </div>

        <div class="big">
            <span class="label">Payment Status:</span> <?= strtoupper($ticket['payment_status']) ?>
        </div>

    </div>

    <div class="footer">
        Scan at entrance • Keep this ticket safe
    </div>

</div>

</body>
</html>