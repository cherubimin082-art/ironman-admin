# Smart Iron — Database Setup Guide

## How to Run `schema.sql`

### Option A — MySQL Workbench (Recommended for beginners)

1. Open **MySQL Workbench** and connect to your local server.
2. Click **File → Open SQL Script** and select `database/schema.sql`.
3. Click the **lightning bolt ⚡** icon (or press `Ctrl + Shift + Enter`) to run the entire script.
4. In the left panel under **Schemas**, right-click and choose **Refresh All** — you should see `smart_iron` appear.

### Option B — MySQL Command Line

```bash
# Log in to MySQL
mysql -u root -p

# Run the schema file directly
mysql -u root -p < database/schema.sql
```

### Option C — TablePlus / DBeaver

1. Open a connection to your local MySQL server.
2. Open a new query tab.
3. Paste the contents of `schema.sql` or use **File → Import SQL**.
4. Execute all.

---

## Database Overview

**Database name:** `smart_iron`  
**Character set:** `utf8mb4` (supports emoji & all Indian scripts)  
**Engine:** InnoDB (full foreign key + transaction support)

---

## Table Descriptions

| # | Table | Description |
|---|-------|-------------|
| 1 | `users` | App customers and admin accounts |
| 2 | `addresses` | Saved delivery/pickup addresses per user |
| 3 | `vendors` | Ironing shops — capacity, timing, rating |
| 4 | `delivery_partners` | Bike delivery agents — availability, rating |
| 5 | `garment_types` | Item catalogue with ironing prices |
| 6 | `orders` | Master order table — links user, vendor, delivery |
| 7 | `order_items` | Individual garments within an order |
| 8 | `order_status_history` | Full audit trail of every status change |
| 9 | `subscription_plans` | Monthly garment subscription packages |
| 10 | `user_subscriptions` | Active subscriptions per user |
| 11 | `payments` | Payment records linked to orders |
| 12 | `ratings` | Customer ratings for vendor + delivery per order |

---

## Order Status Flow

```
Order Placed
    └─► Pickup Scheduled
            └─► Clothes Collected
                    └─► Ironing In Progress
                                └─► Ironing Completed
                                            └─► Out for Delivery
                                                        └─► Delivered
                                                  (or)  └─► Cancelled
```

---

## Garment Prices

| Garment | Price (₹) |
|---------|-----------|
| Shirt | ₹15 |
| Pant | ₹20 |
| Saree | ₹40 |
| Kurta | ₹20 |
| T-Shirt | ₹12 |
| Bedsheet | ₹50 |
| Towel | ₹10 |
| Jacket | ₹35 |

---

## Subscription Plans

| Plan | Price | Garments | Validity |
|------|-------|----------|---------|
| Basic Plan | ₹499 | 60 garments | 30 days |
| Standard Plan | ₹799 | 100 garments | 30 days |
| Premium Plan | ₹1,199 | 160 garments | 30 days |

---

## Dummy Login Credentials

> ⚠️ These are plain-text passwords for development only.  
> In production, always store passwords hashed with **bcrypt** (cost factor ≥ 12).

### Customers

| Name | Phone | Email | Password | Role |
|------|-------|-------|----------|------|
| Ravi Kumar | 9999999999 | ravi@gmail.com | customer123 | customer |
| Priya S | 9999999998 | priya@gmail.com | customer123 | customer |
| Karthik R | 9999999997 | karthik@gmail.com | customer123 | customer |

### Admin

| Name | Phone | Email | Password | Role |
|------|-------|-------|----------|------|
| Admin User | 9000000000 | admin@smartiron.com | admin123 | admin |

### Vendors (login via vendor portal)

| Shop Name | Owner | Phone | Password | Area |
|-----------|-------|-------|----------|------|
| Sri Murugan Irons | Murugan K | 9876543210 | vendor123 | Velachery |
| Lakshmi Irons | Lakshmi D | 9876543211 | vendor123 | T Nagar |
| Chennai Irons | Senthil R | 9876543212 | vendor123 | Adyar |

### Delivery Partners (login via delivery portal)

| Name | Phone | Password | Vehicle | Area |
|------|-------|----------|---------|------|
| Ravi Kumar | 9123456789 | delivery123 | Bike — TN 22 AB 1234 | Velachery |
| Suresh M | 9123456788 | delivery123 | Bike — TN 22 CD 5678 | T Nagar |
| Vijay S | 9123456787 | delivery123 | Bike — TN 22 EF 9012 | Adyar |

---

## Sample Orders in Database

| Order No. | Customer | Vendor | Status | Amount |
|-----------|----------|--------|--------|--------|
| SI-2026-0001 | Ravi Kumar | Sri Murugan Irons | Delivered | ₹185 |
| SI-2026-0002 | Priya S | Lakshmi Irons | Ironing In Progress | ₹110 |
| SI-2026-0003 | Karthik R | Chennai Irons | Order Placed | ₹55 |
| SI-2026-0004 | Ravi Kumar | Sri Murugan Irons | Out for Delivery | ₹140 |

---

## Foreign Key Map

```
users ──────────────────── addresses (user_id)
users ──────────────────── orders (user_id)
users ──────────────────── user_subscriptions (user_id)
users ──────────────────── payments (user_id)
users ──────────────────── ratings (user_id)

vendors ────────────────── orders (vendor_id)
vendors ────────────────── ratings (vendor_id)

delivery_partners ─────── orders (delivery_partner_id)
delivery_partners ─────── ratings (delivery_partner_id)

garment_types ─────────── order_items (garment_type_id)

orders ─────────────────── order_items (order_id)  [CASCADE DELETE]
orders ─────────────────── order_status_history (order_id)  [CASCADE DELETE]
orders ─────────────────── payments (order_id)
orders ─────────────────── ratings (order_id)

subscription_plans ─────── user_subscriptions (plan_id)
```

---

## Notes

- **CASCADE DELETE** is set on `order_items` and `order_status_history` — deleting an order removes its items and history automatically.
- `garments_remaining` in `user_subscriptions` should be computed as `garment_limit - garments_used` and decremented via application logic or a trigger.
- `order_number` follows the format `SI-YYYY-NNNN` — generate this in your backend before inserting.
- The `otp` column in `orders` stores a 4–6 digit code used to confirm delivery handoff.
