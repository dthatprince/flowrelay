<?php
/**
 * Flow Relay— Demo Request Form Handler
 * File: submit.php
 *
 * Security layers:
 *  1. AJAX-only check (X-Requested-With header)
 *  2. POST method enforcement
 *  3. CSRF token validation (session-based)
 *  4. Honeypot field check
 *  5. Google reCAPTCHA v3 verification (score threshold)
 *  6. IP-based rate limiting (5 submissions per hour)
 *  7. Input sanitization & validation
 *  8. Email header injection prevention
 *  9. Content-Security headers on every response
 */

// ── CONFIG — edit these values ──────────────────────────────────
define('RECAPTCHA_SECRET',  'xxxxxxx');       // From Google reCAPTCHA admin
define('RECAPTCHA_THRESHOLD', 0.5);                   // 0.0 (bot) to 1.0 (human) — 0.5 is a good default
define('TO_EMAIL',          'xxxxxxx');    // Where demo requests are sent
define('FROM_EMAIL',        'xxxxxxx'); // Sending address (must match your domain)
define('RATE_LIMIT_MAX',    5);                       // Max submissions per window
define('RATE_LIMIT_WINDOW', 3600);                    // Window in seconds (3600 = 1 hour)
define('RATE_LIMIT_FILE',   sys_get_temp_dir() . '/flowrelay_rl.json'); // Rate limit store
// ───────────────────────────────────────────────────────────────

session_start();

// ── Security headers ────────────────────────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');

// ── Helper: send JSON response and exit ────────────────────────
function respond(bool $success, string $message, int $http = 200): void {
    http_response_code($http);
    echo json_encode(['success' => $success, 'message' => $message]);
    exit;
}

// 1. AJAX-only
if (empty($_SERVER['HTTP_X_REQUESTED_WITH']) ||
    strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) !== 'xmlhttprequest') {
    respond(false, 'Invalid request.', 403);
}

// 2. POST only
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'Method not allowed.', 405);
}

// 3. CSRF validation
$submitted_token = trim($_POST['csrf_token'] ?? '');
$session_token   = $_SESSION['csrf_token'] ?? '';

// If session token doesn't exist yet, we initialise it — first visit via JS sets it.
// On actual submission we compare. If session is fresh (JS hadn't set one) we reject.
if (empty($session_token) || empty($submitted_token) ||
    !hash_equals($session_token, $submitted_token)) {
    // Regenerate for next attempt
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    respond(false, 'Security token invalid. Please refresh the page and try again.', 403);
}

// Rotate CSRF after successful validation
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));

// 4. Honeypot — if filled in, silently pretend success (don't reveal detection)
$honeypot = trim($_POST['website'] ?? '');
if ($honeypot !== '') {
    respond(true, 'Thank you! We\'ll be in touch shortly.');
}

// 5. reCAPTCHA v3
$recaptcha_token = trim($_POST['recaptcha_token'] ?? '');
if (empty($recaptcha_token)) {
    respond(false, 'CAPTCHA verification failed. Please try again.', 400);
}

$rc_response = file_get_contents('https://www.google.com/recaptcha/api/siteverify?' . http_build_query([
    'secret'   => RECAPTCHA_SECRET,
    'response' => $recaptcha_token,
    'remoteip' => $_SERVER['REMOTE_ADDR'] ?? '',
]));

$rc_data = json_decode($rc_response, true);

if (empty($rc_data['success']) || ($rc_data['score'] ?? 0) < RECAPTCHA_THRESHOLD) {
    respond(false, 'Automated submission detected. Please try again.', 403);
}

// 6. Rate limiting — per IP, stored in a temp JSON file
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$ip_hash = hash('sha256', $ip); // Don't store raw IPs
$now     = time();

$rl_data = [];
if (file_exists(RATE_LIMIT_FILE)) {
    $raw = file_get_contents(RATE_LIMIT_FILE);
    $rl_data = json_decode($raw, true) ?: [];
}

// Prune expired entries
foreach ($rl_data as $key => $entry) {
    if ($now - $entry['first'] > RATE_LIMIT_WINDOW) {
        unset($rl_data[$key]);
    }
}

if (!isset($rl_data[$ip_hash])) {
    $rl_data[$ip_hash] = ['first' => $now, 'count' => 0];
}

$rl_data[$ip_hash]['count']++;

file_put_contents(RATE_LIMIT_FILE, json_encode($rl_data), LOCK_EX);

if ($rl_data[$ip_hash]['count'] > RATE_LIMIT_MAX) {
    respond(false, 'Too many submissions. Please try again later.', 429);
}

// 7. Sanitize & validate inputs ─────────────────────────────────
function clean(string $value, int $maxlen = 255): string {
    return htmlspecialchars(strip_tags(trim(substr($value, 0, $maxlen))), ENT_QUOTES, 'UTF-8');
}

$first_name  = clean($_POST['first_name']  ?? '');
$last_name   = clean($_POST['last_name']   ?? '');
$agency      = clean($_POST['agency']      ?? '');
$email       = filter_var(trim($_POST['email'] ?? ''), FILTER_SANITIZE_EMAIL);
$phone       = clean($_POST['phone']       ?? '');
$agency_type = clean($_POST['agency_type'] ?? '');
$message     = clean($_POST['message']     ?? '', 2000);

// Required field checks
if (empty($first_name) || empty($last_name) || empty($agency) || empty($email)) {
    respond(false, 'Please fill in all required fields.', 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(false, 'Please enter a valid email address.', 400);
}

// 8. Build and send email ─────────────────────────────────────────
$subject = 'New Demo Request — ' . $first_name . ' ' . $last_name . ' (' . $agency . ')';

$body  = "New demo request received from flowrelay.com\n";
$body .= str_repeat('─', 50) . "\n\n";
$body .= "Name:         {$first_name} {$last_name}\n";
$body .= "Agency:       {$agency}\n";
$body .= "Agency Type:  {$agency_type}\n";
$body .= "Email:        {$email}\n";
$body .= "Phone:        " . ($phone ?: '—') . "\n\n";
$body .= "Message:\n" . ($message ?: '(none)') . "\n\n";
$body .= str_repeat('─', 50) . "\n";
$body .= "Submitted:    " . date('Y-m-d H:i:s T') . "\n";
$body .= "reCAPTCHA:    " . round(($rc_data['score'] ?? 0), 2) . " / 1.0\n";

// 9. Headers — prevent injection by using pre-validated values only
$headers  = "From: Flow RelayForms <" . FROM_EMAIL . ">\r\n";
$headers .= "Reply-To: {$first_name} {$last_name} <{$email}>\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "X-Mailer: PHP/" . PHP_VERSION . "\r\n";

$sent = mail(TO_EMAIL, $subject, $body, $headers);

if ($sent) {
    respond(true, "Thank you! We'll be in touch shortly to schedule your demo.");
} else {
    // Log server-side but don't expose detail to client
    error_log('[Flow Relay] mail() failed for: ' . $email);
    respond(false, 'There was a problem sending your request. Please email us directly at info@flowrelay.com', 500);
}