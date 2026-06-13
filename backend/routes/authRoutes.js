const express = require('express');
const router  = express.Router();
const { sendOTP, verifyOTP, staffLogin } = require('../controllers/authController');

// Customer OTP flow
router.post('/customer/send-otp',   sendOTP);
router.post('/customer/verify-otp', verifyOTP);

// Staff (vendor / delivery / admin) password login
router.post('/staff/login', staffLogin);

module.exports = router;
