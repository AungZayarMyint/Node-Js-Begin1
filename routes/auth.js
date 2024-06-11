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

// render reset password page
router.get("/reset-password", authController.getResetPage);

// render feedback page
router.get("/feedback", authController.getFeedbackPage);

// send reset email
router.post("/reset", authController.resetLinkSend);

// render change password page
router.get("/reset-password/:token", authController.getNewPasswordPage);

// change new password
router.post("/change-new-password", authController.changeNewPassword);

module.exports = router;
