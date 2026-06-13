-- ============================================================
--  Smart Iron — MySQL Database Schema
--  File    : database/schema.sql
--  Version : 1.0
--  Date    : 2026-06-11
-- ============================================================

-- ------------------------------------------------------------
-- 1. CREATE & SELECT DATABASE
-- ------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS smart_iron
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE smart_iron;

-- ------------------------------------------------------------
-- Drop tables in reverse dependency order (safe re-run)
-- ------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS ratings;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS user_subscriptions;
DROP TABLE IF EXISTS subscription_plans;
DROP TABLE IF EXISTS order_status_history;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS garment_types;
DROP TABLE IF EXISTS delivery_partners;
DROP TABLE IF EXISTS vendors;
DROP TABLE IF EXISTS addresses;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- TABLE 1 — users
-- ============================================================
CREATE TABLE users (
    id          INT           NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100)  NOT NULL,
    phone       VARCHAR(15)   NOT NULL,
    email       VARCHAR(100)  DEFAULT NULL,
    password    VARCHAR(255)  DEFAULT NULL,
    role        ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
    is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_users_phone (phone),
    KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE 2 — addresses
-- ============================================================
CREATE TABLE addresses (
    id            INT           NOT NULL AUTO_INCREMENT,
    user_id       INT           NOT NULL,
    label         VARCHAR(50)   DEFAULT NULL   COMMENT 'e.g. Home, Office, Other',
    address_line  VARCHAR(255)  NOT NULL,
    area          VARCHAR(100)  DEFAULT NULL,
    city          VARCHAR(100)  NOT NULL DEFAULT 'Chennai',
    pincode       VARCHAR(10)   DEFAULT NULL,
    landmark      VARCHAR(100)  DEFAULT NULL,
    is_default    BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_addresses_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    KEY idx_addresses_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE 3 — vendors
-- ============================================================
CREATE TABLE vendors (
    id               INT            NOT NULL AUTO_INCREMENT,
    name             VARCHAR(100)   NOT NULL,
    owner_name       VARCHAR(100)   DEFAULT NULL,
    phone            VARCHAR(15)    NOT NULL,
    password         VARCHAR(255)   DEFAULT NULL,
    address          VARCHAR(255)   DEFAULT NULL,
    area             VARCHAR(100)   DEFAULT NULL,
    city             VARCHAR(100)   NOT NULL DEFAULT 'Chennai',
    pincode          VARCHAR(10)    DEFAULT NULL,
    max_capacity     INT            NOT NULL DEFAULT 600,
    current_capacity INT            NOT NULL DEFAULT 0,
    iron_count       INT            NOT NULL DEFAULT 3,
    staff_count      INT            NOT NULL DEFAULT 4,
    rating           DECIMAL(3,2)   NOT NULL DEFAULT 0.00,
    is_active        BOOLEAN        NOT NULL DEFAULT TRUE,
    opening_time     TIME           NOT NULL DEFAULT '08:00:00',
    closing_time     TIME           NOT NULL DEFAULT '20:00:00',
    created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_vendors_phone (phone),
    KEY idx_vendors_area (area),
    KEY idx_vendors_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE 4 — delivery_partners
-- ============================================================
CREATE TABLE delivery_partners (
    id                INT           NOT NULL AUTO_INCREMENT,
    name              VARCHAR(100)  NOT NULL,
    phone             VARCHAR(15)   NOT NULL,
    password          VARCHAR(255)  DEFAULT NULL,
    vehicle_type      VARCHAR(50)   DEFAULT NULL,
    vehicle_number    VARCHAR(20)   DEFAULT NULL,
    area              VARCHAR(100)  DEFAULT NULL,
    is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
    is_available      BOOLEAN       NOT NULL DEFAULT TRUE,
    rating            DECIMAL(3,2)  NOT NULL DEFAULT 0.00,
    total_deliveries  INT           NOT NULL DEFAULT 0,
    created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_dp_phone (phone),
    KEY idx_dp_area (area),
    KEY idx_dp_available (is_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE 5 — garment_types
-- ============================================================
CREATE TABLE garment_types (
    id         INT            NOT NULL AUTO_INCREMENT,
    name       VARCHAR(100)   NOT NULL,
    price      DECIMAL(10,2)  NOT NULL,
    icon       VARCHAR(50)    DEFAULT NULL,
    is_active  BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_garment_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE 6 — orders
-- ============================================================
CREATE TABLE orders (
    id                   INT            NOT NULL AUTO_INCREMENT,
    order_number         VARCHAR(20)    NOT NULL,
    user_id              INT            NOT NULL,
    vendor_id            INT            DEFAULT NULL,
    delivery_partner_id  INT            DEFAULT NULL,
    status               ENUM(
                             'Order Placed',
                             'Pickup Scheduled',
                             'Clothes Collected',
                             'Ironing In Progress',
                             'Ironing Completed',
                             'Out for Delivery',
                             'Delivered',
                             'Cancelled'
                         ) NOT NULL DEFAULT 'Order Placed',
    total_garments       INT            NOT NULL DEFAULT 0,
    total_amount         DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    pickup_address_id    INT            DEFAULT NULL,
    pickup_date          DATE           DEFAULT NULL,
    pickup_slot          VARCHAR(50)    DEFAULT NULL,
    delivery_date        DATE           DEFAULT NULL,
    delivery_slot        VARCHAR(50)    DEFAULT NULL,
    payment_method       ENUM('UPI', 'Card', 'Wallet', 'Cash') NOT NULL DEFAULT 'UPI',
    payment_status       ENUM('Pending', 'Paid', 'Failed', 'Refunded') NOT NULL DEFAULT 'Pending',
    special_instructions TEXT           DEFAULT NULL,
    otp                  VARCHAR(10)    DEFAULT NULL,
    created_at           TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_order_number (order_number),
    CONSTRAINT fk_orders_user
        FOREIGN KEY (user_id)             REFERENCES users (id),
    CONSTRAINT fk_orders_vendor
        FOREIGN KEY (vendor_id)           REFERENCES vendors (id),
    CONSTRAINT fk_orders_delivery
        FOREIGN KEY (delivery_partner_id) REFERENCES delivery_partners (id),
    CONSTRAINT fk_orders_address
        FOREIGN KEY (pickup_address_id)   REFERENCES addresses (id),
    KEY idx_orders_user   (user_id),
    KEY idx_orders_vendor (vendor_id),
    KEY idx_orders_status (status),
    KEY idx_orders_pickup_date (pickup_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE 7 — order_items
-- ============================================================
CREATE TABLE order_items (
    id               INT            NOT NULL AUTO_INCREMENT,
    order_id         INT            NOT NULL,
    garment_type_id  INT            NOT NULL,
    quantity         INT            NOT NULL,
    price_per_unit   DECIMAL(10,2)  NOT NULL,
    total_price      DECIMAL(10,2)  NOT NULL,

    PRIMARY KEY (id),
    CONSTRAINT fk_items_order
        FOREIGN KEY (order_id)        REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_items_garment
        FOREIGN KEY (garment_type_id) REFERENCES garment_types (id),
    KEY idx_items_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE 8 — order_status_history
-- ============================================================
CREATE TABLE order_status_history (
    id              INT           NOT NULL AUTO_INCREMENT,
    order_id        INT           NOT NULL,
    status          VARCHAR(100)  NOT NULL,
    updated_by_role ENUM('system', 'vendor', 'delivery', 'admin', 'customer') NOT NULL DEFAULT 'system',
    updated_by_id   INT           DEFAULT NULL   COMMENT 'ID from the relevant role table',
    notes           TEXT          DEFAULT NULL,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_history_order
        FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    KEY idx_history_order (order_id),
    KEY idx_history_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE 9 — subscription_plans
-- ============================================================
CREATE TABLE subscription_plans (
    id             INT            NOT NULL AUTO_INCREMENT,
    name           VARCHAR(100)   NOT NULL,
    price          DECIMAL(10,2)  NOT NULL,
    garment_limit  INT            NOT NULL,
    duration_days  INT            NOT NULL DEFAULT 30,
    is_active      BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_plans_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE 10 — user_subscriptions
-- ============================================================
CREATE TABLE user_subscriptions (
    id                 INT      NOT NULL AUTO_INCREMENT,
    user_id            INT      NOT NULL,
    plan_id            INT      NOT NULL,
    start_date         DATE     NOT NULL,
    end_date           DATE     NOT NULL,
    garments_used      INT      NOT NULL DEFAULT 0,
    garments_remaining INT      DEFAULT NULL COMMENT 'Computed on purchase; decremented per order',
    is_active          BOOLEAN  NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_usub_user
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_usub_plan
        FOREIGN KEY (plan_id) REFERENCES subscription_plans (id),
    KEY idx_usub_user   (user_id),
    KEY idx_usub_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE 11 — payments
-- ============================================================
CREATE TABLE payments (
    id              INT            NOT NULL AUTO_INCREMENT,
    order_id        INT            NOT NULL,
    user_id         INT            NOT NULL,
    amount          DECIMAL(10,2)  NOT NULL,
    payment_method  ENUM('UPI', 'Card', 'Wallet', 'Cash') NOT NULL,
    payment_status  ENUM('Pending', 'Paid', 'Failed', 'Refunded') NOT NULL DEFAULT 'Pending',
    transaction_id  VARCHAR(100)   DEFAULT NULL,
    paid_at         TIMESTAMP      DEFAULT NULL,
    created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_payments_order
        FOREIGN KEY (order_id) REFERENCES orders (id),
    CONSTRAINT fk_payments_user
        FOREIGN KEY (user_id)  REFERENCES users (id),
    KEY idx_payments_order  (order_id),
    KEY idx_payments_user   (user_id),
    KEY idx_payments_status (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE 12 — ratings
-- ============================================================
CREATE TABLE ratings (
    id                  INT      NOT NULL AUTO_INCREMENT,
    order_id            INT      NOT NULL,
    user_id             INT      NOT NULL,
    vendor_id           INT      DEFAULT NULL,
    delivery_partner_id INT      DEFAULT NULL,
    ironing_rating      INT      DEFAULT NULL,
    delivery_rating     INT      DEFAULT NULL,
    review              TEXT     DEFAULT NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_ratings_order
        FOREIGN KEY (order_id)            REFERENCES orders (id),
    CONSTRAINT fk_ratings_user
        FOREIGN KEY (user_id)             REFERENCES users (id),
    CONSTRAINT fk_ratings_vendor
        FOREIGN KEY (vendor_id)           REFERENCES vendors (id),
    CONSTRAINT fk_ratings_delivery
        FOREIGN KEY (delivery_partner_id) REFERENCES delivery_partners (id),
    CONSTRAINT chk_ironing_rating
        CHECK (ironing_rating  BETWEEN 1 AND 5),
    CONSTRAINT chk_delivery_rating
        CHECK (delivery_rating BETWEEN 1 AND 5),
    KEY idx_ratings_order  (order_id),
    KEY idx_ratings_vendor (vendor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- DUMMY DATA
-- ============================================================

-- ------------------------------------------------------------
-- Garment Types
-- NOTE: Prices are in INR (₹)
-- ------------------------------------------------------------
INSERT INTO garment_types (name, price, icon) VALUES
    ('Shirt',     15.00, 'shirt'),
    ('Pant',      20.00, 'pant'),
    ('Saree',     40.00, 'saree'),
    ('Kurta',     20.00, 'kurta'),
    ('T-Shirt',   12.00, 'tshirt'),
    ('Bedsheet',  50.00, 'bedsheet'),
    ('Towel',     10.00, 'towel'),
    ('Jacket',    35.00, 'jacket');

-- ------------------------------------------------------------
-- Subscription Plans
-- ------------------------------------------------------------
INSERT INTO subscription_plans (name, price, garment_limit, duration_days) VALUES
    ('Basic Plan',    499.00,   60, 30),
    ('Standard Plan', 799.00,  100, 30),
    ('Premium Plan',  1199.00, 160, 30);

-- ------------------------------------------------------------
-- Vendors
-- Passwords stored as plain text here — hash with bcrypt in production.
-- ------------------------------------------------------------
INSERT INTO vendors (name, owner_name, phone, password, address, area, city, pincode, max_capacity, iron_count, staff_count, opening_time, closing_time) VALUES
    ('Sri Murugan Irons', 'Murugan K', '9876543210', 'vendor123',
     '14, Velachery Main Road', 'Velachery', 'Chennai', '600042', 600, 5, 6, '08:00:00', '21:00:00'),

    ('Lakshmi Irons',     'Lakshmi D', '9876543211', 'vendor123',
     '32, T Nagar North Usman Road', 'T Nagar', 'Chennai', '600017', 400, 3, 4, '08:30:00', '20:30:00'),

    ('Chennai Irons',     'Senthil R', '9876543212', 'vendor123',
     '7, Adyar Canal Road', 'Adyar', 'Chennai', '600020', 500, 4, 5, '07:30:00', '20:00:00');

-- ------------------------------------------------------------
-- Delivery Partners
-- ------------------------------------------------------------
INSERT INTO delivery_partners (name, phone, password, vehicle_type, vehicle_number, area) VALUES
    ('Ravi Kumar', '9123456789', 'delivery123', 'Bike', 'TN 22 AB 1234', 'Velachery'),
    ('Suresh M',   '9123456788', 'delivery123', 'Bike', 'TN 22 CD 5678', 'T Nagar'),
    ('Vijay S',    '9123456787', 'delivery123', 'Bike', 'TN 22 EF 9012', 'Adyar');

-- ------------------------------------------------------------
-- Users (Customers + Admin)
-- Passwords stored as plain text here — hash with bcrypt in production.
-- ------------------------------------------------------------
INSERT INTO users (name, phone, email, password, role) VALUES
    ('Ravi Kumar',  '9999999999', 'ravi@gmail.com',          'customer123', 'customer'),
    ('Priya S',     '9999999998', 'priya@gmail.com',          'customer123', 'customer'),
    ('Karthik R',   '9999999997', 'karthik@gmail.com',        'customer123', 'customer'),
    ('Admin User',  '9000000000', 'admin@smartiron.com',      'admin123',    'admin');

-- ------------------------------------------------------------
-- Sample Addresses (for customer users — ids 1, 2, 3)
-- ------------------------------------------------------------
INSERT INTO addresses (user_id, label, address_line, area, city, pincode, landmark, is_default) VALUES
    (1, 'Home',   '24, 3rd Cross Street, Velachery',    'Velachery', 'Chennai', '600042', 'Near Phoenix Mall',      TRUE),
    (1, 'Office', '100, Anna Salai',                     'Guindy',    'Chennai', '600032', 'DLF IT Park',            FALSE),
    (2, 'Home',   '8, South Usman Road, T Nagar',        'T Nagar',   'Chennai', '600017', 'Opposite Saravana Store', TRUE),
    (3, 'Home',   '15, Gandhi Nagar, Adyar',             'Adyar',     'Chennai', '600020', 'Near Adyar Signal',      TRUE);

-- ------------------------------------------------------------
-- Sample Orders
-- ------------------------------------------------------------
INSERT INTO orders (
    order_number, user_id, vendor_id, delivery_partner_id,
    status, total_garments, total_amount,
    pickup_address_id, pickup_date, pickup_slot,
    delivery_date, delivery_slot,
    payment_method, payment_status, otp
) VALUES
    ('SI-2026-0001', 1, 1, 1,
     'Delivered',          8,  185.00,
     1, '2026-06-08', '10:00 AM - 12:00 PM',
        '2026-06-09', '06:00 PM - 08:00 PM',
     'UPI',  'Paid',    '4821'),

    ('SI-2026-0002', 2, 2, 2,
     'Ironing In Progress', 5, 110.00,
     3, '2026-06-10', '02:00 PM - 04:00 PM',
        '2026-06-11', '06:00 PM - 08:00 PM',
     'UPI',  'Paid',    '7364'),

    ('SI-2026-0003', 3, 3, NULL,
     'Order Placed',       3,   55.00,
     4, '2026-06-12', '10:00 AM - 12:00 PM',
        NULL, NULL,
     'Cash', 'Pending', '9157'),

    ('SI-2026-0004', 1, 1, 1,
     'Out for Delivery',   6,  140.00,
     1, '2026-06-10', '08:00 AM - 10:00 AM',
        '2026-06-11', '04:00 PM - 06:00 PM',
     'Card', 'Paid',    '3382');

-- ------------------------------------------------------------
-- Order Items
-- ------------------------------------------------------------
-- Order SI-2026-0001 (8 garments)
INSERT INTO order_items (order_id, garment_type_id, quantity, price_per_unit, total_price) VALUES
    (1, 1, 3, 15.00,  45.00),   -- 3 Shirts
    (1, 2, 2, 20.00,  40.00),   -- 2 Pants
    (1, 3, 1, 40.00,  40.00),   -- 1 Saree
    (1, 7, 2, 10.00,  20.00);   -- 2 Towels
                                -- Total: 145.00 (order has 185.00 with delivery)

-- Order SI-2026-0002 (5 garments)
INSERT INTO order_items (order_id, garment_type_id, quantity, price_per_unit, total_price) VALUES
    (2, 4, 2, 20.00, 40.00),    -- 2 Kurtas
    (2, 5, 3, 12.00, 36.00);    -- 3 T-Shirts

-- Order SI-2026-0003 (3 garments)
INSERT INTO order_items (order_id, garment_type_id, quantity, price_per_unit, total_price) VALUES
    (3, 1, 2, 15.00, 30.00),    -- 2 Shirts
    (3, 2, 1, 20.00, 20.00);    -- 1 Pant

-- Order SI-2026-0004 (6 garments)
INSERT INTO order_items (order_id, garment_type_id, quantity, price_per_unit, total_price) VALUES
    (4, 1, 2, 15.00,  30.00),   -- 2 Shirts
    (4, 2, 2, 20.00,  40.00),   -- 2 Pants
    (4, 8, 1, 35.00,  35.00),   -- 1 Jacket
    (4, 7, 1, 10.00,  10.00);   -- 1 Towel

-- ------------------------------------------------------------
-- Order Status History
-- ------------------------------------------------------------
INSERT INTO order_status_history (order_id, status, updated_by_role, updated_by_id, notes) VALUES
    (1, 'Order Placed',       'customer',  1,    'Order created via app'),
    (1, 'Pickup Scheduled',   'system',    NULL, 'Auto-assigned to Sri Murugan Irons'),
    (1, 'Clothes Collected',  'delivery',  1,    'Collected from customer'),
    (1, 'Ironing In Progress','vendor',    1,    'Processing started'),
    (1, 'Ironing Completed',  'vendor',    1,    'All items ironed and packed'),
    (1, 'Out for Delivery',   'delivery',  1,    'Picked up from vendor'),
    (1, 'Delivered',          'delivery',  1,    'Delivered successfully, OTP verified'),

    (2, 'Order Placed',       'customer',  2,    'Order created via app'),
    (2, 'Pickup Scheduled',   'system',    NULL, 'Auto-assigned to Lakshmi Irons'),
    (2, 'Clothes Collected',  'delivery',  2,    'Collected from customer'),
    (2, 'Ironing In Progress','vendor',    2,    'Processing started'),

    (3, 'Order Placed',       'customer',  3,    'Order created via app'),

    (4, 'Order Placed',       'customer',  1,    'Order created via app'),
    (4, 'Pickup Scheduled',   'system',    NULL, 'Auto-assigned to Sri Murugan Irons'),
    (4, 'Clothes Collected',  'delivery',  1,    'Collected from customer'),
    (4, 'Ironing In Progress','vendor',    1,    'Processing started'),
    (4, 'Ironing Completed',  'vendor',    1,    'All items ironed and packed'),
    (4, 'Out for Delivery',   'delivery',  1,    'En route to customer');

-- ------------------------------------------------------------
-- Payments
-- ------------------------------------------------------------
INSERT INTO payments (order_id, user_id, amount, payment_method, payment_status, transaction_id, paid_at) VALUES
    (1, 1, 185.00, 'UPI',  'Paid',    'TXN20260608001', '2026-06-08 09:45:00'),
    (2, 2, 110.00, 'UPI',  'Paid',    'TXN20260610007', '2026-06-10 13:55:00'),
    (3, 3,  55.00, 'Cash', 'Pending', NULL,              NULL),
    (4, 1, 140.00, 'Card', 'Paid',    'TXN20260610021', '2026-06-10 07:38:00');

-- ------------------------------------------------------------
-- Ratings (only for delivered order)
-- ------------------------------------------------------------
INSERT INTO ratings (order_id, user_id, vendor_id, delivery_partner_id, ironing_rating, delivery_rating, review) VALUES
    (1, 1, 1, 1, 5, 5, 'Excellent ironing quality! Clothes were neatly packed and delivered on time. Highly recommend.');

-- ============================================================
-- END OF SCHEMA
-- ============================================================
