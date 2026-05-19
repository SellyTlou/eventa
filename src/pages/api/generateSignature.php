<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');
ini_set('display_errors', 1);
error_reporting(E_ALL);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// IMPORTANT:
// Use $_POST instead of json_decode
$input = $_POST;

if (empty($input)) {
    echo json_encode([
        'success' => false,
        'error' => 'No input data'
    ]);
    exit;
}

function generatePayFastSignature($data, $passphrase = null)
{
    unset($data['signature']);

    // IMPORTANT:
    // SORT ONLY FOR PAYMENT FORM GENERATION
    ksort($data);

    $pfOutput = '';

    foreach ($data as $key => $val) {

        if ($val !== '' && $val !== null) {

            $val = (string)$val;

            $pfOutput .= $key . '=' . urlencode(trim($val)) . '&';
        }
    }

    $getString = rtrim($pfOutput, '&');

    if (!empty($passphrase)) {
        $getString .= '&passphrase=' . urlencode($passphrase);
    }

    error_log("PAYFAST PAYMENT STRING: " . $getString);

    return md5($getString);
}

// No passphrase
$signature = generatePayFastSignature($input, null);

echo json_encode([
    'success' => true,
    'signature' => $signature
]);
?>