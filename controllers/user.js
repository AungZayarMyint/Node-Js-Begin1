const { validationResult } = require("express-validator");
const stripe = require("stripe")(
  "sk_test_51PThfSRwsb1EVCM4KJskTVY7zL3QJVjVIs7kw0jXbFho96m64z7C8ePyniKkysyh8W0zaPT5jGnjFhWllXNzYdcj00gLCclyM1"
);

const Post = require("../models/post");
const User = require("../models/user");
const user = require("../models/user");
const session = require("express-session");
const { use } = require("../routes/post");
const POST_PER_PAGE = 6;

exports.getProfile = (req, res, next) => {
  const pageNumber = +req.query.page || 1;
  let totalPostNumber;
  Post.find({ userId: req.user._id })
    .countDocuments()
    .then((totalPostCount) => {
      totalPostNumber = totalPostCount;
      return Post.find({ userId: req.user._id })
        .populate("userId", "email username isPremium profile_imgUrl")
        .skip((pageNumber - 1) * POST_PER_PAGE)
        .limit(POST_PER_PAGE)
        .sort({ createdAt: -1 });
    })
    .then((posts) => {
      if (!posts.length && pageNumber > 1) {
        return res.status(500).render("error/500", {
          title: "Something went wrong.",
          message: "No post in this page query.",
        });
      } else {
        return res.render("user/profile", {
          title: req.session.userInfo.email,
          postsArr: posts,
          currentPage: pageNumber,
          hasNextPage: POST_PER_PAGE * pageNumber < totalPostNumber,
          hasPreviousPage: pageNumber > 1,
          nextPage: pageNumber + 1,
          previousPage: pageNumber - 1,
          currentUserEmail: req.session.userInfo
            ? req.session.userInfo.email
            : "",
        });
      }
    })
    .catch((err) => {
      console.log(err);
      const error = new Error("Something wrong bby!");
      return next(error);
    });
};

exports.getPublicProfile = (req, res, next) => {
  const { id } = req.params;
  const pageNumber = +req.query.page || 1;
  let totalPostNumber;
  Post.find({ userId: id })
    .countDocuments()
    .then((totalPostCount) => {
      totalPostNumber = totalPostCount;
      return Post.find({ userId: id })
        .populate("userId", "email username isPremium profile_imgUrl")
        .skip((pageNumber - 1) * POST_PER_PAGE)
        .limit(POST_PER_PAGE)
        .sort({ createdAt: -1 });
    })
    .then((posts) => {
      if (posts.length > 0) {
        return res.render("user/public-profile", {
          title: posts[0].userId.email,
          postsArr: posts,
          currentPage: pageNumber,
          hasNextPage: POST_PER_PAGE * pageNumber < totalPostNumber,
          hasPreviousPage: pageNumber > 1,
          nextPage: pageNumber + 1,
          previousPage: pageNumber - 1,
          currentUserEmail: posts[0].userId.email,
        });
      } else {
        return res.status(500).render("error/500", {
          title: "Something Went Wrong",
          message: "No post in this page query!",
        });
      }
    })
    .catch((err) => {
      console.log(err);
      const error = new Error("Something wrong bby!");
      return next(error);
    });
};

exports.renderUsernamePage = (req, res) => {
  res.render("user/username", {
    title: "Set Username",
    errorMsg: req.flash("error"),
    oldFormData: { username: "" },
  });
};

exports.setUsername = (req, res) => {
  const { username } = req.body;
  const Updateusername = username.replace("@", "");

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("user/username", {
      title: "Reset Password",
      errorMsg: errors.array()[0].msg,
      oldFormData: { username },
    });
  }
  User.findById(req.user._id)
    .then((user) => {
      user.username = `@${Updateusername}`;
      return user.save();
    })
    .then(() => {
      console.log("Username Set");
      res.redirect("/admin/profile");
    })
    .catch((err) => {
      console.log(err);
      const error = new Error("User not found with this ID");
      return next(error);
    });
};

exports.renderPremiumPage = (req, res, next) => {
  stripe.checkout.sessions
    .create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: "price_1PTihYRwsb1EVCM4g9vWeTvm",
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.protocol}://${req.get(
        "host"
      )}/admin/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get(
        "host"
      )}/admin/subscription-cancel`,
    })
    .then((stripe_session) => {
      res.render("user/premium", {
        title: "Buy premium",
        session_id: stripe_session.id,
      });
    })
    .catch((err) => {
      console.log(err);
      const error = new Error("Something went wrong.");
      return next(error);
    });
};

exports.getSuccessPage = (req, res) => {
  const session_id = req.query.session_id;
  if (!session_id || !session_id.includes("cs_test")) {
    return res.redirect("/admin/profile");
  }
  User.findById(req.user._id)
    .then((user) => {
      user.isPremium = true;
      user.payment_session_key = session_id;
      return user.save();
    })
    .then(() => {
      res.render("user/subscription-success", {
        title: "Subscription Success",
      });
    })
    .catch((err) => {
      console.log(err);
      const error = new Error("Something went wrong.");
      return next(error);
    });
};

exports.getPremiumDetails = (req, res, next) => {
  User.findById(req.user._id)
    .then((user) => {
      return stripe.checkout.sessions.retrieve(user.payment_session_key);
    })
    .then((stripe_session) => {
      res.render("user/premium-details", {
        title: "Status",
        customer_id: stripe_session.customer,
        country: stripe_session.customer_details.address.country,
        postal_code: stripe_session.customer_details.address.postal_code,
        email: stripe_session.customer_details.email,
        name: stripe_session.customer_details.name,
        invoice_id: stripe_session.invoice,
        status: stripe_session.payment_status,
      });
    })
    .catch((err) => {
      console.log(err);
      const error = new Error("Something went wrong.");
      return next(error);
    });
};

exports.getProfileUploadPage = (req, res) => {
  res.render("user/profile-upload", { title: "Profile Upload", errorMsg: "" });
};

exports.setProfileImage = (req, res) => {
  const photo = req.file;
  const errors = validationResult(req);

  if (photo === undefined) {
    return res.status(422).render("user/profile-upload", {
      title: "Profile Upload",
      errorMsg: "Image extension must be jpg, jpeg, png.",
    });
  }

  if (!errors.isEmpty()) {
    return res.status(422).render("user/profile-upload", {
      title: "Profile Upload",
      errorMsg: errors.array()[0].msg,
    });
  }

  User.findById(req.user._id)
    .then((user) => {
      user.profile_imgUrl = photo.path;
      return user.save();
    })
    .then((_) => {
      res.redirect("/admin/profile");
    })
    .catch((err) => {
      console.log(err);
      const error = new Error("Something went wrong.");
      return next(error);
    });
};
