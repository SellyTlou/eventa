<?php
class Database
{
     
    private $host   = "localhost";
    private $user   = "root";
    private $pass   = "";
    private $dbname = "eventa";
    private $port   = 3306;
    private $pdo;

    /*private $host   = "mysql8001.site4now.net";
    private $user   = "ac172e_mfanafu";
    private $pass   = "@Magcaba0203";
    private $dbname = "db_ac172e_mfanafu";
    private $port   = 3306;
    private $pdo;*/

    public function __construct()
    {
        try {
            $dsn       = "mysql:host={$this->host};port={$this->port};dbname={$this->dbname};charset=utf8";
            $this->pdo = new PDO($dsn, $this->user, $this->pass);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Connection failed: " . $e->getMessage()]);
            exit;
        }
    }

    public function getConnection()
    {
        return $this->pdo;
    }
}