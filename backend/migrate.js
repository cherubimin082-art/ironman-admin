require("dotenv").config();
const pool = require("./db");

async function run() {
  // 1. Create categories table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("categories table OK");

  // 2. Seed default categories if empty
  const [[{ catCount }]] = await pool.query("SELECT COUNT(*) AS catCount FROM categories");
  let menId, womenId, houseId;
  if (catCount === 0) {
    const [r1] = await pool.query("INSERT INTO categories (name) VALUES (?)", ["Men's Wear"]);
    const [r2] = await pool.query("INSERT INTO categories (name) VALUES (?)", ["Women's Wear"]);
    const [r3] = await pool.query("INSERT INTO categories (name) VALUES (?)", ["Household Items"]);
    menId = r1.insertId; womenId = r2.insertId; houseId = r3.insertId;
    console.log("Categories seeded: Men's Wear, Women's Wear, Household Items");
  } else {
    const [[men]]   = await pool.query("SELECT id FROM categories WHERE name = \"Men's Wear\"");
    const [[women]] = await pool.query("SELECT id FROM categories WHERE name = \"Women's Wear\"");
    const [[house]] = await pool.query("SELECT id FROM categories WHERE name = 'Household Items'");
    menId = men?.id; womenId = women?.id; houseId = house?.id;
    console.log("Categories already exist:", { menId, womenId, houseId });
  }

  // 3. Add category_id column to garments if missing
  const [cols] = await pool.query("DESCRIBE garments");
  const hasCatId = cols.some(c => c.Field === "category_id");
  if (!hasCatId) {
    await pool.query("ALTER TABLE garments ADD COLUMN category_id INT NULL AFTER id");
    console.log("Added category_id column to garments");

    // Map old category enum to new category_id
    const mapping = {
      Tops: menId, Bottoms: menId, Formal: menId, Outerwear: menId,
      Ethnic: womenId, Linen: houseId,
    };
    for (const [enumVal, catId] of Object.entries(mapping)) {
      if (catId) {
        const [r] = await pool.query(
          "UPDATE garments SET category_id = ? WHERE `category` = ?",
          [catId, enumVal]
        );
        if (r.affectedRows) console.log(`  Mapped ${enumVal} → category ${catId} (${r.affectedRows} rows)`);
      }
    }
  } else {
    console.log("category_id column already exists on garments");
  }

  // 4. Add FK if not present
  const [constraints] = await pool.query(
    "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_NAME='garments' AND COLUMN_NAME='category_id' AND TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME='categories'"
  );
  if (constraints.length === 0 && hasCatId === false) {
    try {
      await pool.query("ALTER TABLE garments ADD CONSTRAINT fk_garment_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL");
      console.log("FK fk_garment_category added");
    } catch (e) {
      console.log("FK add skipped:", e.message);
    }
  }

  // 5. Add cancellation columns to orders if missing
  const [orderCols] = await pool.query("DESCRIBE orders");
  const hasReason     = orderCols.some(c => c.Field === "cancellation_reason");
  const hasCancelledBy = orderCols.some(c => c.Field === "cancelled_by");
  if (!hasReason) {
    await pool.query("ALTER TABLE orders ADD COLUMN cancellation_reason VARCHAR(255) DEFAULT NULL");
    console.log("Added cancellation_reason to orders");
  } else {
    console.log("cancellation_reason already exists");
  }
  if (!hasCancelledBy) {
    await pool.query("ALTER TABLE orders ADD COLUMN cancelled_by ENUM('customer','vendor') DEFAULT NULL");
    console.log("Added cancelled_by to orders");
  } else {
    console.log("cancelled_by already exists");
  }

  // 6. Create ratings table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ratings (
      id                INT AUTO_INCREMENT PRIMARY KEY,
      order_id          INT NOT NULL UNIQUE,
      customer_id       INT NOT NULL,
      vendor_id         INT DEFAULT NULL,
      delivery_agent_id INT DEFAULT NULL,
      vendor_rating     INT DEFAULT NULL,
      delivery_rating   INT DEFAULT NULL,
      vendor_review     TEXT DEFAULT NULL,
      delivery_review   TEXT DEFAULT NULL,
      created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id)          REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id)       REFERENCES users(id),
      FOREIGN KEY (vendor_id)         REFERENCES users(id),
      FOREIGN KEY (delivery_agent_id) REFERENCES users(id)
    )
  `);
  console.log("ratings table OK");

  console.log("Migration complete");
  process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
