const express = require('express');
const router  = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  getDashboard,
  getAllOrders,
  getAllVendors,
  getAllDeliveryPartners,
} = require('../controllers/adminController');

const guard = [authMiddleware, roleMiddleware('admin')];

router.get('/dashboard',          ...guard, getDashboard);
router.get('/orders',             ...guard, getAllOrders);
router.get('/vendors',            ...guard, getAllVendors);
router.get('/delivery-partners',  ...guard, getAllDeliveryPartners);

module.exports = router;
