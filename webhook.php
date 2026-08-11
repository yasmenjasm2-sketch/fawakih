<?php
// webhook.php - استقبال التحديثات من متجر حمادو
header('Content-Type: application/json');

$input = file_get_contents("php://input");
$data = json_decode($input, true);

if ($data) {
    $orderId = $data['order_id'] ?? null;
    $status  = $data['status'] ?? null; // مثل: completed أو failed

    // أضف هنا الكود لتحديث حالة الطلب في قاعدة بيانات موقعك
    // Example: updateOrderStatusInDatabase($orderId, $status);

    http_response_code(200);
    echo json_encode(["status" => "success", "message" => "Callback processed"]);
} else {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid payload"]);
}
?>
