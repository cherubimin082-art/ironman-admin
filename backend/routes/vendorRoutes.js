const express = require('express');
const router  = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  getDashboard,
  getVendorOrders,
  updateOrderStatus,
  getCapacity,
  updateCapacity,
} = require('../controllers/vendorController');

const guard = [authMiddleware, roleMiddleware('vendor')];

router.get('/dashboard',               ...guard, getDashboard);
router.get('/orders',                  ...guard, getVendorOrders);
router.patch('/orders/:id/status',     ...guard, updateOrderStatus);
router.get('/capacity',                ...guard, getCapacity);
router.patch('/capacity',              ...guard, updateCapacity);

module.exports = router;
