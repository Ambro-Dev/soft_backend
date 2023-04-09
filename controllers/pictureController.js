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
    bucketName: 'images',
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
          bucketName: 'images',
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
  const filetypes = /jpeg|jpg|png|gif/;
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
  const upload = store.single("picture");
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).send('File too large');
    } else if (err) {
      // check if our filetype error occurred
      if (err === 'filetype') return res.status(400).send('Image files only');
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

router.post('/users/:userId/picture', uploadMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).send('User not found');
    }
    const { file } = req;
    if (file.size > 1000000) {
      // if the file is too large, delete it and send an error
      return res.status(400).send('file may not exceed 1mb');
    }
    user.picture = req.file.filename;
    await user.save();
    res.send('Picture uploaded');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

// this route will be accessed by any img tags on the front end which have
// src tags like
// <img src="/api/image/123456789" alt="example"/>
// <img src={`/api/image/${user.profilePic}`} alt="example"/>
router.get('/users/:userId/picture', async ({ params: { userId } }, res) => {
  // if no id return error
  if (!userId || userId === 'undefined') return res.status(400).send('no user id');
  const user = await User.findById(userId);
    if (!user || !user.picture) {
      return res.status(404).send('Picture not found');
    }
  // if there is an id string, cast it to mongoose's objectId type
  // search for the image by id
  gfs.find({ filename: user.picture }).toArray((err, file) => {
    if (!file || file.length === 0)
      return res.status(400).send('no files exist');
    // if a file exists, send the data
    console.log(file);
    gfs.openDownloadStream(file[0]._id).pipe(res);
  });
});

router.get('/users/picture', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
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

module.exports = router;
