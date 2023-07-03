const User = require("../model/User");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const getAllUsers = async (req, res) => {
  const users = await User.find({ "roles.Admin": { $exists: false } }).select(
    "_id name surname studentNumber roles"
  );
  if (!users) return res.status(204).json({ message: "No users found" });
  res.json(users);
};

const getAllTeachers = async (req, res) => {
  const users = await User.find({ "roles.Teacher": { $exists: true } }).select(
    "_id name surname"
  );
  if (!users) return res.status(204).json({ message: "No users found" });
  res.json(users);
};

const getAllUsersforAdmin = async (req, res) => {
  const users = await User.find({}).select(
    "_id name surname email studentNumber roles"
  );
  if (!users) return res.status(204).json({ message: "No users found" });
  res.json(users);
};
const getAllStudents = async (req, res) => {
  const users = await User.find({ "roles.Student": { $exists: true } }).select(
    "_id name surname studentNumber"
  );
  if (!users) return res.status(204).json({ message: "No users found" });
  res.json(users);
};

const updateAllPicture = async (req, res) => {
  User.updateMany(
    {},
    { $set: { picture: "45e93869513476b265929a75b4455052.png" } }
  )
    .then((result) => {
      console.log(`${result.nModified} users updated`);
    })
    .catch((err) => {
      console.error(err);
    });
};

const deleteUser = async (req, res) => {
  if (!req?.body?.id)
    return res.status(400).json({ message: "User ID required" });
  const user = await User.findOne({ _id: req.body.id }).exec();
  if (!user) {
    return res
      .status(204)
      .json({ message: `User ID ${req.body.id} not found` });
  }
  const result = await user.deleteOne({ _id: req.body.id });
  res.json(result);
};

const getUser = async (req, res) => {
  if (!req?.params?.id)
    return res.status(400).json({ message: "User ID required" });
  const user = await User.findOne({ _id: req.params.id }).exec();
  if (!user) {
    return res
      .status(204)
      .json({ message: `User ID ${req.params.id} not found` });
  }
  res.json(user);
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = req.params.id;
    const userStoragePath = path.join(
      process.env.STORAGE_PATH,
      "user_storage",
      userId
    );

    if (!fs.existsSync(userStoragePath)) {
      fs.mkdirSync(userStoragePath);
    }
    cb(null, userStoragePath);
  },
  filename: function (req, file, cb) {
    cb(null, `profile_picture.${file.mimetype.split("/")[1]}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only images are allowed"));
  }

  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024, // 1 MB
  },
}).single("profilePicture");

const uploadProfilePicture = async (req, res, err) => {
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).send({ error: err.message });
    } else if (err) {
      return res.status(400).send({ error: err.message });
    }
    try {
      const userId = req.params.id;
      const profilePicture = req.file;

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ msg: "User not found" });
      }

      user.picture = `storage/user_storage/${user.id}/${profilePicture.filename}`;
      await user.save();

      res.send(user.picture);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  });
};

const passwordChange = async (req, res) => {
  const { id, currentPassword, newPassword } = req.body;

  try {
    // Find the user by email
    const user = await User.findById(id).exec();
    if (!user) {
      return res.send({ status: 404, message: "User not found." });
    }

    // Compare the current password with the one stored in the database
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.send({ status: 401, message: "Incorrect current password." });
    }

    // Encrypt the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    user.password = hashedNewPassword;
    await user.save();

    return res.send({ status: 200, message: "Password changed successfully." });
  } catch (err) {
    return res.status(500).send(err.message);
  }
};

module.exports = {
  getAllUsers,
  deleteUser,
  getUser,
  uploadProfilePicture,
  getAllStudents,
  getAllTeachers,
  updateAllPicture,
  getAllUsersforAdmin,
  passwordChange,
};
