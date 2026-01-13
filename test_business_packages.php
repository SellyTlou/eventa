<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once "dbConnection.php";

$db = new Database();
$pdo = $db->getConnection();

try {
    // Check if business_packages table exists
    $stmt = $pdo->prepare("SHOW TABLES LIKE 'business_packages'");
    $stmt->execute();
    $tableExists = $stmt->fetch();

    if ($tableExists) {
        echo "Business packages table exists!\n";

        // Check if it has data
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM business_packages");
        $stmt->execute();
        $count = $stmt->fetch()['count'];
        echo "Records in table: $count\n";

        if ($count > 0) {
            // Show the data
            $stmt = $pdo->prepare("SELECT * FROM business_packages");
            $stmt->execute();
            $packages = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo "Packages:\n";
            foreach ($packages as $pkg) {
                echo "- {$pkg['name']}: R{$pkg['price']}\n";
            }
        }
    } else {
        echo "Business packages table does NOT exist!\n";
        echo "Creating table...\n";

        $pdo->exec('CREATE TABLE business_packages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            package_type ENUM("starter", "intermediate", "advance", "advance_plus") NOT NULL,
            name VARCHAR(50) NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            max_guests INT NOT NULL,
            max_events INT DEFAULT NULL,
            features TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_package_type (package_type)
        )');

        echo "Table created. Inserting data...\n";

        $pdo->exec('INSERT INTO business_packages (package_type, name, price, max_guests, max_events, features) VALUES
        ("starter", "STARTER PLAN", 649.00, 200, NULL, \'["Up to 200 guests", "Event management tools", "RSVP tracking", "Create and send invitations", "Priority support"]\'),
        ("intermediate", "INTERMEDIATE PLAN", 2149.00, 750, NULL, \'["Up to 750 guests", "Event management tools", "RSVP tracking", "Event Check-In", "Custom branding options", "Priority support"]\'),
        ("advance", "ADVANCE PLAN", 6999.00, 2000, NULL, \'["Up to 2000 guests", "Event management tools", "RSVP tracking", "Dedicated account manager", "Custom integrations", "Team collaboration tools", "Event Check-In"]\'),
        ("advance_plus", "ADVANCE PLUS PLAN", 0.00, 99999, NULL, \'["Manage large-scale events", "Your brand, ad-free", "Custom data fields", "Custom fonts", "Email whitelabeling", "Self check-in kiosk", "Single sign-on (SSO)", "Priority support", "Dedicated Account Manager"]\')');

        echo "Data inserted successfully!\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>