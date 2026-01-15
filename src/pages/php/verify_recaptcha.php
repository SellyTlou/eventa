<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");



if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Your secret key from Google reCAPTCHA
$secretKey = "6LdQzUgsAAAAAEKAwBDIoLmTSxMRPSikQKAWwNVN";  

// Get the reCAPTCHA response token from the POST data
$recaptchaResponse = $_POST['g-recaptcha-response'] ?? '';

if (empty($recaptchaResponse)) {
    echo json_encode([
        "success" => false,
        "message" => "reCAPTCHA verification failed: No token provided"
    ]); 
    exit();
}

// Verify with Google reCAPTCHA API
$url = 'https://www.google.com/recaptcha/api/siteverify';
$data = [
    'secret' => $secretKey,
    'response' => $recaptchaResponse,
    'remoteip' => $_SERVER['REMOTE_ADDR'] ?? ''
];

$options = [
    'http' => [
        'header' => "Content-type: application/x-www-form-urlencoded\r\n",
        'method' => 'POST',
        'content' => http_build_query($data)
    ]
];

$context = stream_context_create($options);
$response = file_get_contents($url, false, $context);

if ($response === FALSE) {
    echo json_encode([
        "success" => false,
        "message" => "Failed to contact reCAPTCHA service"
    ]);
    exit();
}

$responseData = json_decode($response, true);

// Check if verification was successful
if ($responseData['success'] === true) {
    echo json_encode([
        "success" => true,
        "message" => "reCAPTCHA verification successful"
    ]);
} else {
    $errorCodes = $responseData['error-codes'] ?? ['unknown-error'];
    echo json_encode([
        "success" => false,
        "message" => "reCAPTCHA verification failed",
        "errors" => $errorCodes
    ]);
}
?>