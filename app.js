//imports from packages
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const dotenv = require("dotenv").config();
const session = require("express-session");
const mongoStore = require("connect-mongodb-session")(session);

const app = express();

// engine
app.set("view engine", "ejs");
app.set("views", "views");

// routes
const postRoutes = require("./routes/post");
const adminRoutes = require("./routes/admin");
const authRoutes = require("./routes/auth");

const store = new mongoStore({
  uri: process.env.MONGODB_URI,
  collection: "sessions",
});

// models
const User = require("./models/user");
const user = require("./models/user");

// const { mongodbConnector } = require("./utils/database");

// middlewares
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  session({
    secret: process.env.SESSION_KEY,
    resave: false,
    saveUninitialized: false,
    store,
  })
);

// custom middlewares
// app.use((req, res, next) => {
//   User.findById("6665ba2a0d6a027912a9f3ef").then((user) => {
//     req.user = user;
//     next();
//   });
// });

// connect routes
app.use("/admin", adminRoutes);
app.use(postRoutes);
app.use(authRoutes);

// connect database
mongoose.connect(process.env.MONGODB_URL).then((_) => {
  app.listen(8080);
  console.log("connected to server");
});
