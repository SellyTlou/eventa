<?php
require_once "dbConnection.php";

$db = new Database();
$pdo = $db->getConnection();

try {
    $stmt = $pdo->prepare("
        SELECT * FROM system_activity_queue 
        WHERE status = 'pending' 
        ORDER BY created_at ASC 
        LIMIT 100
    ");
    $stmt->execute();
    $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $processed = 0;
    
    foreach ($activities as $activity) {
        try {
            $insertStmt = $pdo->prepare("
                INSERT INTO system_activity (user_id, action, description, created_at) 
                VALUES (:user_id, :action, :description, :created_at)
            ");
            
            $insertStmt->execute([
                ':user_id' => $activity['user_id'],
                ':action' => $activity['action'],
                ':description' => $activity['description'],
                ':created_at' => $activity['created_at']
            ]);

            $updateStmt = $pdo->prepare("
                UPDATE system_activity_queue 
                SET status = 'completed', processed_at = NOW() 
                WHERE id = :id
            ");
            
            $updateStmt->execute([':id' => $activity['id']]);
            $processed++;
            
        } catch (Exception $e) {
            continue;
        }
    }

    $cleanupStmt = $pdo->prepare("
        DELETE FROM system_activity_queue 
        WHERE status = 'completed' AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
    ");
    $cleanupStmt->execute();
    exit;

} catch (Exception $e) {
    exit;
}
?>