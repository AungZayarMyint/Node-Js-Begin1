const bcrypt = require("bcrypt");
const User = require("../models/user");
const user = require("../models/user");

const nodemailer = require("nodemailer");
const dotenv = require("dotenv").config();

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
  });
};

// handle register page
exports.registerAccount = (req, res) => {
  const { email, password } = req.body;
  User.findOne({ email })
    .then((user) => {
      if (user) {
        req.flash("error", "Email is already exist.");
        return res.redirect("/register");
      }
      return bcrypt
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
    })
    .catch((err) => console.log(err));
};

// render login page
exports.getLoginPage = (req, res) => {
  res.render("auth/login", { title: "Login", errorMsg: req.flash("error") });
};

// handle login
exports.postLoginData = (req, res) => {
  // req.session.isLogin = true;
  // res.redirect("/");
  const { email, password } = req.body;
  User.findOne({ email })
    .then((user) => {
      if (!user) {
        req.flash("error", "Check your info and try again bby!");
        return res.redirect("/login");
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
        res.redirect("/login");
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
