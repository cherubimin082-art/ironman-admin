const express = require('express');
const router  = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  getDashboard,
  getJobs,
  confirmPickup,
  confirmDelivery,
} = require('../controllers/deliveryController');

const guard = [authMiddleware, roleMiddleware('delivery')];

router.get('/dashboard',                    ...guard, getDashboard);
router.get('/jobs',                         ...guard, getJobs);
router.patch('/orders/:id/pickup-confirm',  ...guard, confirmPickup);
router.patch('/orders/:id/delivery-confirm',...guard, confirmDelivery);

module.exports = router;
