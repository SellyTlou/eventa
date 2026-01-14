-- Create the support_tickets table
CREATE TABLE support_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    message TEXT NOT NULL,
    attachment_path VARCHAR(500) NULL,
    status ENUM('Open', 'In Progress', 'Resolved') DEFAULT 'Open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Index for performance
CREATE INDEX idx_status ON support_tickets(status);
CREATE INDEX idx_department ON support_tickets(department);
CREATE INDEX idx_created_at ON support_tickets(created_at);