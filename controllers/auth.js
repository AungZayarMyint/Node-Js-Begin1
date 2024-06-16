const bcrypt = require("bcrypt");
const User = require("../models/user");
const user = require("../models/user");
const crypto = require("crypto");

const nodemailer = require("nodemailer");
const dotenv = require("dotenv").config();

const { validationResult } = require("express-validator");
const { time } = require("console");
const { title } = require("process");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SENDER_MAIL,
    pass: process.env.MAIL_PASSWORD,
  },
});

// render register page
exports.getRegisterPage = (req, res) => {
  res.render("auth/register", {
    title: "Register",
    errorMsg: req.flash("error"),
    oldFormData: { email: "", password: "" },
  });
};

// handle register page
exports.registerAccount = (req, res) => {
  const { email, password } = req.body;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/register", {
      title: "Register",
      errorMsg: errors.array()[0].msg,
      oldFormData: { email, password },
    });
  }
  bcrypt
    .hash(password, 10)
    .then((hashedPassword) => {
      return User.create({ email, password: hashedPassword });
    })
    .then((newUser) => {
      // Send mail after the user is created
      transporter.sendMail(
        {
          from: process.env.SENDER_MAIL,
          to: email,
          subject: "Register Account Successful",
          html: "<h1>Register account is successful!</h1><p>Created an account by using this email address in blog.io</p>",
        },
        (err) => {
          if (err) {
            console.log("Error sending email: ", err);
          } else {
            console.log("Email sent successfully");
          }
        }
      );
      res.redirect("/login");
    });
};

// render login page
exports.getLoginPage = (req, res) => {
  res.render("auth/login", {
    title: "Login",
    errorMsg: req.flash("error"),
    oldFormData: { email: "", password: "" },
  });
};

// handle login
exports.postLoginData = (req, res) => {
  // req.session.isLogin = true;
  // res.redirect("/");
  const { email, password } = req.body;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).render("auth/login", {
      title: "Login",
      errorMsg: errors.array()[0].msg,
      oldFormData: { email, password },
    });
  }

  User.findOne({ email })
    .then((user) => {
      if (!user) {
        return res.status(422).render("auth/login", {
          title: "Login",
          errorMsg: "Please enter valid mail & password!",
          oldFormData: { email, password },
        });
      }
      bcrypt.compare(password, user.password).then((isMatch) => {
        if (isMatch) {
          req.session.isLogin = true;
          req.session.userInfo = user;
          return req.session.save((err) => {
            res.redirect("/");
            console.log(err);
          });
        }
        res.status(422).render("auth/login", {
          title: "Login",
          errorMsg: "Please enter valid mail & password!",
          oldFormData: { email, password },
        });
      });
    })
    .catch((err) => console.log(err));
};

// handle logout
exports.logout = (req, res) => {
  req.session.destroy((_) => {
    res.redirect("/");
  });
};

// render reset password page
exports.getResetPage = (req, res) => {
  res.render("auth/reset", {
    title: "Reset Password",
    errorMsg: req.flash("error"),
  });
};

// render for feedback page
exports.getFeedbackPage = (req, res) => {
  res.render("auth/feedback", {
    title: "Success.",
  });
};

// reset password link sent
exports.resetLinkSend = (req, res) => {
  const { email } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/reset", {
      title: "Reset Password",
      errorMsg: errors.array()[0].msg,
      oldFormData: { email },
    });
  }

  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect("/reset-password");
    }
    const token = buffer.toString("hex");
    User.findOne({ email }).then((user) => {
      if (!user) {
        return res.status(422).render("auth/reset", {
          title: "Reset Password",
          errorMsg: "No account exist with this email address.",
          oldFormData: { email },
        });
      } else {
        res.redirect("/feedback");
        transporter.sendMail(
          {
            from: process.env.SENDER_MAIL,
            to: email,
            subject: "Reset password successful.",
            html: `<h1>Reset Password.</h1><p>Change u r acc password by clicking this link below</p><a href="http://localhost:8080/reset-password/${token}" target="_blank">Click Me Bby</a>`,
          },
          (err) => {
            console.log(err);
          }
        );
      }
      user.resetToken = token;
      user.tokenExpiration = Date.now() + 1800000;
      return user.save();
    });
  });
};

// render new password
exports.getNewPasswordPage = (req, res) => {
  const { token } = req.params;
  console.log(token);
  User.findOne({ resetToken: token, tokenExpiration: { $gt: Date.now() } })
    .then((user) => {
      res.render("auth/new-password", {
        title: "Change password",
        errorMsg: req.flash("error"),
        resetToken: token,
        user_id: user._id.toString(),
        oldFormData: { password: "", confirm_password: "" },
      });
    })
    .catch((err) => console.log(err));
};

exports.changeNewPassword = (req, res) => {
  const { password, confirm_password, user_id, resetToken } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/new-password", {
      resetToken,
      user_id,
      title: "Login",
      errorMsg: errors.array()[0].msg,
      oldFormData: { password, confirm_password },
    });
  }

  let resultUser;
  User.findOne({
    resetToken,
    tokenExpiration: { $gt: Date.now() },
    _id: user_id,
  })
    .then((user) => {
      if (password === confirm_password) {
        resultUser = user;
        return bcrypt.hash(password, 10);
      }
    })
    .then((hashedPassword) => {
      resultUser.password = hashedPassword;
      resultUser.resetToken = undefined;
      resultUser.tokenExpiration = undefined;
      return resultUser.save();
    })
    .then((_) => {
      return res.redirect("/login");
    })
    .catch((err) => console.log(err));
};
