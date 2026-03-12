<?php
/**
 * csrf.php — Issues a CSRF token into the PHP session
 * Called once on page load by the JS before form submission.
 *
 * Usage: fetch('csrf.php') → returns { token: "..." }
 */

session_start();

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store, no-cache, must-revalidate');

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

echo json_encode(['token' => $_SESSION['csrf_token']]);