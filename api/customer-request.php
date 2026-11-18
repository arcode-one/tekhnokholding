<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $status): never
{
    http_response_code($status);
    echo json_encode(['ok' => $status === 200]);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405);
}

$contentType = explode(';', $_SERVER['CONTENT_TYPE'] ?? '', 2)[0];
if (strtolower(trim($contentType)) !== 'application/json') {
    respond(415);
}

$maxBytes = 8192;
$raw = file_get_contents('php://input', false, null, 0, $maxBytes + 1);
if ($raw === false || strlen($raw) > $maxBytes) {
    respond(413);
}

$payload = json_decode($raw, true);
if (!is_array($payload) || ($payload['consent'] ?? false) !== true || ($payload['website'] ?? '') !== '') {
    respond(422);
}

$limits = ['name' => 80, 'phone' => 32, 'email' => 254, 'project' => 160, 'message' => 1500];
$fields = [];
foreach ($limits as $key => $limit) {
    $value = $payload[$key] ?? '';
    if (!is_string($value) || preg_match_all('/./us', $value) > $limit) {
        respond(422);
    }
    $value = preg_replace('/^\s+|\s+$/u', '', $value);
    if ($key !== 'message' && preg_match('/[\r\n]/', $value)) {
        respond(422);
    }
    $fields[$key] = $value;
}

['name' => $name, 'phone' => $phone, 'email' => $email, 'project' => $project, 'message' => $message] = $fields;
if ($name === '' || $message === '' || ($phone === '' && $email === '')) {
    respond(422);
}

$digits = strlen(preg_replace('/\D/', '', $phone));
if ($phone !== '' && (!preg_match('/\A\+?[0-9(). -]+\z/', $phone) || $digits < 7 || $digits > 15)) {
    respond(422);
}
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(422);
}

$sender = getenv('THLD_MAIL_FROM') ?: 'info@thld.su';
if (!function_exists('mail') || !filter_var($sender, FILTER_VALIDATE_EMAIL)) {
    respond(503);
}

$body = ["Имя: $name"];
if ($phone !== '') {
    $body[] = "Телефон: $phone";
}
if ($email !== '') {
    $body[] = "Электронная почта: $email";
}
if ($project !== '') {
    $body[] = "Объект или город: $project";
}
$body[] = '';
$body[] = 'Задача:';
$body[] = str_replace(["\r\n", "\r", "\n"], "\n", $message);
$body[] = '';
$body[] = 'Согласие на обработку персональных данных получено через форму на сайте.';

$headers = [
    'From' => $sender,
    'MIME-Version' => '1.0',
    'Content-Type' => 'text/plain; charset=UTF-8',
    'Content-Transfer-Encoding' => 'base64',
];
if ($email !== '') {
    $headers['Reply-To'] = $email;
}

$subject = '=?UTF-8?B?' . base64_encode('Заявка с сайта ') . '?= '
    . '=?UTF-8?B?' . base64_encode('Технохолдинг') . '?=';
$text = str_replace("\n", "\r\n", implode("\n", $body));
$accepted = @mail('pto@thld.su', $subject, chunk_split(base64_encode($text)), $headers);
respond($accepted ? 200 : 503);
