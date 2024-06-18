const Post = require("../models/post");
const { post } = require("../routes/post");
const { validationResult } = require("express-validator");
const { formatISO9075 } = require("date-fns");
const pdf = require("pdf-creator-node");

const fs = require("fs");
const expath = require("path");

const fileDelete = require("../utils/fileDelete");
const path = require("path");
const { type } = require("os");

exports.createPost = (req, res, next) => {
  const { title, description } = req.body;
  const errors = validationResult(req);
  const image = req.file;

  if (image === undefined) {
    return res.status(422).render("addPost", {
      title: "Post create ml",
      errorMsg: "Image extension must be jpg, jpeg, png.",
      oldFormData: { title, description },
    });
  }

  if (!errors.isEmpty()) {
    return res.status(422).render("addPost", {
      title: "Post create ml",
      errorMsg: errors.array()[0].msg,
      oldFormData: { title, description },
    });
  }

  Post.create({ title, description, imgUrl: image.path, userId: req.user })
    .then((result) => {
      console.log(result);
      res.redirect("/");
    })
    .catch((err) => {
      console.log(err);
      const error = new Error("Something wrong bby!");
      return next(error);
    });
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
  const { postId, title, description } = req.body;
  const errors = validationResult(req);
  const image = req.file;

  // if (image === undefined) {
  //   return res.status(422).render("editPost", {
  //     postId,
  //     title,
  //     isValidationFail: true,
  //     title: "Post create ml",
  //     errorMsg: "Image extension must be jpg, jpeg, png.",
  //     oldFormData: { title, description },
  //   });
  // }

  if (!errors.isEmpty()) {
    return res.status(422).render("editPost", {
      postId,
      title,
      errorMsg: errors.array()[0].msg,
      oldFormData: { title, description },
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
      if (image) {
        fileDelete(post.imgUrl);
        post.imgUrl = image.path;
      }
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
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        return res.redirect("/");
      }
      fileDelete(post.imgUrl);
      return Post.deleteOne({ _id: postId, userId: req.user._id });
    })
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

exports.savePostAsPdf = (req, res, next) => {
  const { id } = req.params;
  const templateUrl = `${expath.join(
    __dirname,
    "../views/template/template.html"
  )}`;
  const html = fs.readFileSync(templateUrl, "utf8");

  const options = {
    format: "A3",
    orientation: "portrait",
    border: "10mm",
    header: {
      height: "45mm",
      contents:
        '<h3 style="text-align: center;">PDF Download From Blog.io</h3>',
    },
    footer: {
      height: "28mm",
      contents: {
        first: "Cover page",
        contents:
          '<span style="color: #444; text-align: center;">@johathan.mm</span>',
      },
    },
  };

  Post.findById(id)
    .populate("userId", "email")
    .lean()
    .then((post) => {
      const date = new Date();
      const pdfSaveUrl = `${expath.join(
        __dirname,
        "../public/pdf",
        date.getTime() + ".pdf"
      )}`;
      const document = {
        html,
        data: {
          post,
        },
        path: pdfSaveUrl,
        type: "",
      };
      pdf
        .create(document, options)
        .then((result) => {
          console.log(result);
          res.download(pdfSaveUrl, (err) => {
            if (err) throw err;
            fileDelete(pdfSaveUrl);
          });
        })
        .catch((error) => {
          console.error(error);
        });
    })
    .catch((err) => {
      console.log(err);
      const error = new Error("Something Wrong Bby");
      return next(error);
    });
};
