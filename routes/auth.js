const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth");

// render register page
router.get("/register", authController.getRegisterPage);

// handle register page
router.post("/register", authController.registerAccount);

// render login page
router.get("/login", authController.getLoginPage);

// handle login page
router.post("/login", authController.postLoginData);

// render logout page
router.post("/logout", authController.logout);

module.exports = router;
