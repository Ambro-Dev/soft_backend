// the code currently active in the demo,
// sends back the id of the uploaded image, so the front-end can
// display the uploaded image and a link to open it in a new tab
const mongoose = require("mongoose");
const { GridFsStorage } = require("multer-gridfs-storage");
const router = require("express").Router();
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const Course = require("../model/Course");
require("dotenv").config();

const mongoURI = process.env.DATABASE_URI;
const conn = mongoose.createConnection(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: process.env.DB_NAME,
});

let gfs;
conn.once("open", () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "courseFiles",
  });
});

const storage = new GridFsStorage({
  url: mongoURI,
  options: {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    dbName: process.env.DB_NAME,
  },
  file: (req, file) => {
    // this function runs every time a new file is created
    return new Promise((resolve, reject) => {
      // use the crypto package to generate some random hex bytes
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        // turn the random bytes into a string and add the file extention at the end of it (.png or .jpg)
        // this way our file names will not collide if someone uploads the same file twice
        const filename = buf.toString("hex") + path.extname(file.originalname);
        const originalFilename = decodeURIComponent(escape(file.originalname));
        const fileInfo = {
          filename: filename,
          bucketName: "courseFiles",
          metadata: {
            originalFilename: originalFilename, // add original filename as metadata
          },
        };
        // resolve these properties so they will be added to the new file document
        resolve(fileInfo);
      });
    });
  },
});

function checkFileType(file, cb) {
  // define a regex that includes the file types we accept
  const filetypes = /doc|docx|pdf|xlsx|xls|csv|odt|zip|jpg|png|jpeg/;
  //check the file extention
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // more importantly, check the mimetype
  const mimetype = filetypes.test(file.mimetype);
  // if both are good then continue
  if (mimetype && extname) return cb(null, true);
  // otherwise, return error message
  cb("filetype");
}

// set up our multer to use the gridfs storage defined above
const store = multer({
  storage,
  // limit the size to 20mb for any files coming in
  limits: { fileSize: 20000000 },
  // filer out invalid filetypes
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

const uploadMiddleware = (req, res, next) => {
  const upload = store.single("file");
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).send("File too large");
    } else if (err) {
      // check if our filetype error occurred
      if (err === "filetype") return res.status(400).send("Invalid file type");
      // An unknown error occurred when uploading.
      return res.sendStatus(500);
    }
    // all good, proceed
    next();
  });
};

router.post("/:courseId/upload", uploadMiddleware, async (req, res) => {
  try {
    const { file } = req;
    if (file.size > 1000000) {
      // 1mb
      // if the file is too large, delete it and send an error
      return res.status(400).send("file may not exceed 1mb");
    }
    const course = await Course.findByIdAndUpdate(
      req.params.courseId,
      { $push: { files: file.id } }, // store the file ID instead of file._id
      { new: true }
    );
    if (!course) {
      return res.status(404).send("Course not found");
    }
    res.status(200).json({
      message: "File uploaded successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

router.get("/:courseId", async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const fileIds = course.files;
    const files = [];
    for (const fileId of fileIds) {
      const file = await gfs.find({ _id: fileId }).toArray();
      if (file.length === 0) {
        return res.status(404).json({ message: "Files not found" });
      }
      files.push({
        id: file[0]._id,
        filename: file[0].filename,
        originalname: file[0].metadata.originalFilename, // retrieve original filename from metadata
      });
    }
    res.json(files);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

router.get("/", async (req, res) => {
  try {
    const files = await gfs.find().toArray();

    if (files.length === 0) {
      return res.status(404).json({ message: "No files found" });
    }

    let totalDiskSpace = 0;
    const filesData = [];

    for (const file of files) {
      const fileSizeKB = Math.round(file.length / 1024);
      filesData.push({
        filename: file.filename,
        originalname: file.metadata.originalFilename,
        fileSize: fileSizeKB,
      });

      totalDiskSpace += fileSizeKB;
    }

    res.json({
      files: filesData,
      totalDiskSpace,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

router.get("/users/picture", async (req, res) => {
  try {
    const user = await Course.findById(req.params.userId);
    if (!user || !user.picture) {
      return res.status(404).send("Picture not found");
    }
    gfs.find({ filename: user.picture }).toArray((err, file) => {
      if (!file || file.length === 0) {
        return res.status(404).send("Picture not found");
      }
      const readstream = gfs.openDownloadStreamByName(user.picture);
      readstream.pipe(res);
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

router.delete("/:id/delete", (req, res) => {
  const { id } = req.params; // Extract the id from req.params
  if (!id || id === "undefined")
    return res.status(400).json({ error: "no file id" });

  const _id = new mongoose.Types.ObjectId(id);
  gfs.delete(_id, (err) => {
    if (err) return res.status(500).json({ error: "File deletion error" });

    // Delete the file reference from the Course model
    Course.updateMany({ files: _id }, { $pull: { files: _id } }, (err) => {
      if (err) return res.status(500).json({ error: "File deletion error" });

      res.status(200).json({ message: "File deleted successfully" });
    });
  });
});

router.get("/file/:filename", (req, res) => {
  gfs.find({ filename: req.params.filename }).toArray((err, files) => {
    if (err) {
      return res.status(500).json({
        message: "Error retrieving file",
      });
    }

    if (!files || files.length === 0) {
      return res.status(404).json({
        message: "File not found",
      });
    }

    const readstream = gfs.openDownloadStreamByName(req.params.filename);
    res.set("Content-Type", files[0].contentType);
    res.set(
      "Content-Disposition",
      'attachment; filename="' + files[0].filename + '"'
    );
    readstream.pipe(res);
  });
});

module.exports = router;
