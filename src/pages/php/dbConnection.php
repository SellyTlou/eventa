<?php


class Database {

    private $host = "localhost";
    private $user = "root";
    private $pass = "";
    private $dbname = "eventa";

    private $pdo;

    public function __construct() {
        try {
            $this->pdo = new PDO(
                "mysql:host={$this->host};dbname={$this->dbname};charset=utf8",
                $this->user,
                $this->pass
            );
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Connection failed: " . $e->getMessage()]);
            exit;
        }
    }

    public function getConnection() {
        return $this->pdo;
    }
}

?>
