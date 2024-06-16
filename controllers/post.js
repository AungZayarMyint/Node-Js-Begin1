const Post = require("../models/post");
const { post } = require("../routes/post");
const { validationResult } = require("express-validator");
const { formatISO9075 } = require("date-fns");

exports.createPost = (req, res, next) => {
  const { title, description, photo } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render("addPost", {
      title: "Post create ml",
      errorMsg: errors.array()[0].msg,
      oldFormData: { title, description, photo },
    });
  }

  Post.create({ title, description, imgUrl: photo, userId: req.user })
    .then((result) => {
      console.log(result);
      res.redirect("/");
    })
    .catch((err) => {
      console.log(err);
      const error = new Error("Something wrong bby!");
      return next(error);
    });

  //   console.log(`Title value is ${title} & description is ${description}`);
  // posts.push({
  //     id : Math.random(),
  //     title,
  //     description,
  //     photo
  // });
  // res.redirect("/");
};

exports.renderCreatePage = (req, res) => {
  // res.sendFile(path.join(__dirname, "..", "views", "addPost.html"));
  res.render("addPost", {
    title: "Post create ml",
    oldFormData: { title: "", description: "", photo: "" },
    errorMsg: "",
  });
};

exports.renderHomePage = (req, res, next) => {
  //split - array နဲ့သိမ်းပြီး ခွဲထုတ်ပေး
  // const cookie = req.get("Cookie").split("=")[1].trim() === "true";
  Post.find()
    .populate("userId", "email")
    .sort({ title: 1 })
    .then((posts) => {
      res.render("home", {
        title: "Home Page",
        postsArr: posts,
        currentUserEmail: req.session.userInfo
          ? req.session.userInfo.email
          : "",
      });
    })
    .catch((err) => {
      console.log(err);
      const error = new Error("Something wrong bby!");
      return next(error);
    });
};

exports.getPost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .populate("userId", "email")
    .then((post) =>
      res.render("details", {
        title: post.title,
        post,
        date: post.createdAt ? formatISO9075(post.createdAt) : undefined,
        currentLoginUserId: req.session.userInfo
          ? req.session.userInfo._id
          : "",
      })
    )
    .catch((err) => {
      console.log(err);
      const error = new Error("Post not found with this ID");
      return next(error);
    });
};

exports.getEditPost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        return res.redirect("/");
      }
      res.render("editPost", {
        title: post.title,
        postId: undefined,
        post,
        errorMsg: "",
        oldFormData: {
          title: undefined,
          description: undefined,
          photo: undefined,
        },
        isValidationFail: false,
      });
    })
    .catch((err) => {
      console.log(err);
      const error = new Error("Something wrong bby!");
      return next(error);
    });
};

exports.updatePost = (req, res, next) => {
  const { postId, title, description, photo } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render("editPost", {
      postId,
      title,
      errorMsg: errors.array()[0].msg,
      oldFormData: { title, description, photo },
      isValidationFail: true,
    });
  }

  Post.findById(postId)
    .then((post) => {
      if (post.userId.toString() !== req.user._id.toString()) {
        return res.redirect("/");
      }
      post.title = title;
      post.description = description;
      post.imgUrl = photo;
      return post.save().then((result) => {
        console.log("post updated");
        res.redirect("/");
      });
    })

    .catch((err) => {
      console.log(err);
      const error = new Error("Something wrong bby!");
      return next(error);
    });
};

exports.deletePost = (req, res, next) => {
  const { postId } = req.params;
  Post.deleteOne({ _id: postId, userId: req.user._id })
    .then(() => {
      console.log("post deleted");
      res.redirect("/");
    })
    .catch((err) => {
      console.log(err);
      const error = new Error("Something wrong bby!");
      return next(error);
    });
};
