const Post = require("../models/post");
const { post } = require("../routes/post");
const { validationResult } = require("express-validator");
const { formatISO9075 } = require("date-fns");
const pdf = require("pdf-creator-node");

const fs = require("fs");
const expath = require("path");

const fileDelete = require("../utils/fileDelete");

const POST_PER_PAGE = 6;

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

  const pageNumber = +req.query.page || 1;
  let totalPostNumber;

  // page => 1 -1 = 0
  // per page = 3 x 0 = 0

  // page => 2 -1 = 1
  // per page = 3 x 1 = 3

  // page => 3 -1 = 2
  // per page = 3 x 2 = 6

  // page => 4 -1 = 3
  // per page = 3 x 3 = 9

  Post.find()
    .countDocuments()
    .then((totalPostCount) => {
      totalPostNumber = totalPostCount;
      return Post.find()
        .select("title description imgUrl")
        .populate("userId", "email isPremium username profile_imgUrl")
        .skip((pageNumber - 1) * POST_PER_PAGE)
        .limit(POST_PER_PAGE)
        .sort({ createdAt: -1 });
    })
    .then((posts) => {
      if (posts.length > 0) {
        return res.render("home", {
          title: "Home Page",
          postsArr: posts,
          // currentUserEmail: req.session.userInfo
          //   ? req.session.userInfo.email
          //   : "",
          currentPage: pageNumber,
          hasNextPage: POST_PER_PAGE * pageNumber < totalPostNumber,
          hasPreviousPage: pageNumber > 1,
          nextPage: pageNumber + 1,
          previousPage: pageNumber - 1,
          currentUserId: req.session.userInfo ? req.session.userInfo._id : "",
        });
      } else {
        return res.status(500).render("error/500", {
          title: "Something Went Wrong",
          message: "no post in this page query!",
        });
      }
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
    .populate("userId", "email isPremium")
    .then((post) =>
      res.render("details", {
        title: post.title,
        post,
        date: post.createdAt ? formatISO9075(post.createdAt) : undefined,
        currentLoginUserId: req.session.userInfo
          ? req.session.userInfo._id
          : "",
        currentLoginUserStatus: req.session.userInfo
          ? req.session.userInfo.isPremium
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
    format: "A4",
    orientation: "portrait",
    border: "10mm",
    header: {
      height: "20mm",
      contents:
        '<h2 style="text-align: center;">PDF Download From Blog.io</h2>',
    },
    footer: {
      height: "15mm",
      contents: '<p style="color: #444; text-align: center;">@johathan.mm</p>',
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
