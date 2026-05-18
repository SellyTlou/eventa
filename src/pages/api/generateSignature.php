<?php
function generatePayFastSignature($data, $passphrase = null) {

    unset($data['signature']);

    $data = array_filter($data, function($value) {
        return $value !== null && $value !== '';
    });


    ksort($data);

    $pairs = [];

    foreach ($data as $key => $value) {
        $pairs[] = $key . '=' . rawurlencode((string)$value);
    }

    $pfString = implode('&', $pairs);

    if (!empty($passphrase)) {
        $pfString .= '&passphrase=' . rawurlencode($passphrase);
    }

    return md5($pfString);
}
?>