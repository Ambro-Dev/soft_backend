// the code currently active in the demo,
// sends back the id of the uploaded image, so the front-end can
// display the uploaded image and a link to open it in a new tab
const mongoose = require('mongoose');
const { GridFsStorage } = require('multer-gridfs-storage');
const router = require('express').Router();
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const User = require('../model/User');
const Course = require('../model/Course');
require('dotenv').config();

const mongoURI = process.env.DATABASE_URI;
const conn = mongoose.createConnection(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: process.env.DB_NAME
});

let gfs;
conn.once('open', () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: 'courseFiles',
  });
});

const storage = new GridFsStorage({
  url: mongoURI,
  options: { useUnifiedTopology: true, dbName: process.env.DB_NAME },
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
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'courseFiles',
          metadata: {
            originalFilename: file.originalname // add original filename as metadata
          }
        };
        // resolve these properties so they will be added to the new file document
        resolve(fileInfo);
      });
    });
  },
});

function checkFileType(file, cb) {
  // https://youtu.be/9Qzmri1WaaE?t=1515
  // define a regex that includes the file types we accept
  const filetypes = /doc|docx|pdf|xlsx|xls|csv|odt|zip|jpg|png|jpeg/;
  //check the file extention
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // more importantly, check the mimetype
  const mimetype = filetypes.test(file.mimetype);
  // if both are good then continue
  if (mimetype && extname) return cb(null, true);
  // otherwise, return error message
  cb('filetype');
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
      return res.status(400).send('File too large');
    } else if (err) {
      // check if our filetype error occurred
      if (err === 'filetype') return res.status(400).send('Invalid file type');
      // An unknown error occurred when uploading.
      return res.sendStatus(500);
    }
    // all good, proceed
    next();
  });
};


const deleteImage = (id) => {
  if (!id || id === 'undefined') return res.status(400).send('no image id');
  const _id = new mongoose.Types.ObjectId(id);
  gfs.delete(_id, (err) => {
    if (err) return res.status(500).send('image deletion error');
  });
};

router.post('/:courseId/upload', uploadMiddleware, async (req, res) => {
  try {
    const { file } = req;
    console.log(req.params.courseId);
    if (file.size > 1000000) { // 1mb
      // if the file is too large, delete it and send an error
      return res.status(400).send('file may not exceed 1mb');
    }
    const course = await Course.findByIdAndUpdate(
      req.params.courseId,
      { $push: { files: file.id } }, // store the file ID instead of file._id
      { new: true }
    );
    if (!course) {
      return res.status(404).send('Course not found');
    }
    res.status(200).json({
      message: 'File uploaded successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});


// this route will be accessed by any img tags on the front end which have
// src tags like
// <img src="/api/image/123456789" alt="example"/>
// <img src={`/api/image/${user.profilePic}`} alt="example"/>
router.get('/:courseId', async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const fileIds = course.files;
    const files = [];
    for (const fileId of fileIds) {
      const file = await gfs.find({ _id: fileId }).toArray();
      if (file.length === 0) {
        return res.status(404).json({ message: 'File not found' });
      }
      files.push({
        filename: file[0].filename,
        originalname: file[0].metadata.originalFilename // retrieve original filename from metadata
      });
    }
    res.json(files);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});


router.get('/users/picture', async (req, res) => {
  try {
    const user = await Course.findById(req.params.userId);
    if (!user || !user.picture) {
      return res.status(404).send('Picture not found');
    }
    gfs.find({ filename: user.picture }).toArray((err, file) => {
      if (!file || file.length === 0) {
        return res.status(404).send('Picture not found');
      }
      const readstream = gfs.openDownloadStreamByName(user.picture);
      readstream.pipe(res);
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

router.get('/file/:filename', (req, res) => {
  gfs.find({ filename: req.params.filename })
    .toArray((err, files) => {
      if (err) {
        return res.status(500).json({
          message: 'Error retrieving file',
        });
      }

      if (!files || files.length === 0) {
        return res.status(404).json({
          message: 'File not found',
        });
      }

      const readstream = gfs.openDownloadStreamByName(req.params.filename);
      res.set('Content-Type', files[0].contentType);
      res.set('Content-Disposition', 'attachment; filename="' + files[0].filename + '"');
      readstream.pipe(res);
    });
});

module.exports = router;
