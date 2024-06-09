const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const dotenv = require("dotenv").config();

const app = express();

app.set("view engine", "ejs");
app.set("views", "views");

const postRoutes = require("./routes/post");
const adminRoutes = require("./routes/admin");

const User = require("./models/user");
const user = require("./models/user");

// const { mongodbConnector } = require("./utils/database");

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: false }));

app.use((req, res, next) => {
  User.findById("6665ba2a0d6a027912a9f3ef").then((user) => {
    req.user = user;
    next();
  });
});

app.use("/admin", adminRoutes);
app.use(postRoutes);

mongoose
  .connect(process.env.MONGODB_URL)
  .then((result) => {
    app.listen(8080);
    console.log("connected to server");

    return User.findOne().then((user) => {
      if (!user) {
        User.create({
          username: "Leo",
          email: "leo@gmail.com",
          password: "abcd",
        });
      }
      return user;
    });
  })
  .then((result) => console.log(result))
  .catch((err) => console.log(err));
