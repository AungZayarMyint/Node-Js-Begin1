const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const User = require("../models/user");

const authController = require("../controllers/auth");

// render register page
router.get("/register", authController.getRegisterPage);

// handle register page
router.post(
  "/register",
  body("email")
    .isEmail()
    .withMessage("Please enter a valid email address, Bby!")
    .custom((value, { req }) => {
      // async validatio start
      return User.findOne({ email: value }).then((user) => {
        if (user) {
          return Promise.reject("Email's already exist! Try again bby.");
        }
      });
    }),
  body("password")
    .isLength({ min: 4 })
    .trim()
    .withMessage("Password must contain 4 characters!"),
  // async validation end
  authController.registerAccount
);

// render login page
router.get("/login", authController.getLoginPage);

// handle login page
router.post(
  "/login",
  body("email").isEmail().withMessage("Enter a valid email address"),
  body("password")
    .isLength({ min: 4 })
    .trim()
    .withMessage("Password must valid"),
  authController.postLoginData
);

// render logout page
router.post("/logout", authController.logout);

// render reset password page
router.get("/reset-password", authController.getResetPage);

// render feedback page
router.get("/feedback", authController.getFeedbackPage);

// send reset email
router.post(
  "/reset",
  body("email").isEmail().withMessage("Please enter an valid email address."),
  authController.resetLinkSend
);

// render change password page
router.get("/reset-password/:token", authController.getNewPasswordPage);

// change new password
router.post(
  "/change-new-password",
  body("password")
    .isLength({ min: 4 })
    .trim()
    .withMessage("Password must have 4 characters."),
  body("confirm_password")
    .trim()
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Password must match!!");
      }
      return true;
    }),
  authController.changeNewPassword
);

module.exports = router;
