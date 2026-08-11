<?php
header('Content-Type: application/json');

// استلام البيانات من الواجهة الأمامية لموقعك
$data = json_decode(file_get_contents("php://input"), true);
$playerId = $data['player_id'] ?? '';
$serviceId = $data['service_id'] ?? '';

// رابط الـ API الخاص بالمبرمج (قم بتعديل /create-order حسب الموجود في التوثيق)
$apiUrl = "https://api.hamado-sy.com/api/create-order"; 
$token = "253606ee036d68a4ec4f322a12e75db996b30cd38042917a";

// البيانات التي سيتم إرسالها للـ API
$postData = [
    'player_id' => $playerId,
    'service_id' => $serviceId
];

$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));

// إضافة التوكن في الـ Headers
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $token",
    "Content-Type: application/json",
    "Accept: application/json"
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// إعادة الرد إلى موقعك
http_response_code($httpCode);
echo $response;
?>
