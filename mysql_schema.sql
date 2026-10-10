-- Tea Shop Order Simulator Database Schema
CREATE DATABASE IF NOT EXISTS tea_shop_db;
USE tea_shop_db;

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(50) NOT NULL,
    tea_type VARCHAR(30) NOT NULL,
    prep_time INT NOT NULL,
    simulate_failure TINYINT(1) NOT NULL DEFAULT 0,
    status ENUM('Preparing', 'Ready', 'Failed') NOT NULL DEFAULT 'Preparing',
    failure_reason VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
