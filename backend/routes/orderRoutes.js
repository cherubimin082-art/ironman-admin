const express = require('express');
const router  = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { createOrder, getMyOrders, getOrderById } = require('../controllers/orderController');

router.post('/create',    authMiddleware, roleMiddleware('customer'), createOrder);
router.get('/my-orders',  authMiddleware, roleMiddleware('customer'), getMyOrders);
router.get('/:id',        authMiddleware, getOrderById);

module.exports = router;
