const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const User = require("../model/User");
const csvtojson = require("csvtojson");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const { handleNewUser } = require("./registerController");
const { createCourseAdmin } = require("./coursesController");
const Course = require("../model/Course");
const LoginCount = require("../model/LoginCount");
require("dotenv").config();
const { validationResult } = require("express-validator");
const validator = require("validator");

const getStudentCsv = async (req, res) => {
  try {
    const csvWriter = createCsvWriter({
      path: "student-schema.csv",
      header: [
        { id: "name", title: "name" },
        { id: "surname", title: "surname" },
        { id: "email", title: "email" },
        { id: "password", title: "password" },
        { id: "studentNumber", title: "studentNumber" },
      ],
    });
    await csvWriter.writeRecords([]);
    res.download("student-schema.csv");
  } catch (error) {
    res.status(400).send(error.message);
  }
};

const getCourseCsv = async (req, res) => {
  try {
    const csvWriter = createCsvWriter({
      path: "course-schema.csv",
      header: [
        { id: "name", title: "name" },
        { id: "teacherEmail", title: "teacherEmail" },
      ],
    });
    await csvWriter.writeRecords([]);
    res.download("course-schema.csv");
  } catch (error) {
    res.status(400).send(error.message);
  }
};

const getTeacherCsv = async (req, res) => {
  try {
    const csvWriter = createCsvWriter({
      path: "teacher-schema.csv",
      header: [
        { id: "name", title: "name" },
        { id: "surname", title: "surname" },
        { id: "email", title: "email" },
        { id: "password", title: "password" },
      ],
    });
    await csvWriter.writeRecords([]);
    res.download("teacher-schema.csv");
  } catch (error) {
    res.status(400).send(error.message);
  }
};

const getImportMembersCsv = async (req, res) => {
  try {
    const csvWriter = createCsvWriter({
      path: "import-members.csv",
      header: [{ id: "studentNumber", title: "studentNumber" }],
    });
    await csvWriter.writeRecords([]);
    res.download("import-members.csv");
  } catch (error) {
    res.status(400).send(error.message);
  }
};

const getCourses = async (req, res) => {
  const userId = req.params.id;

  // Find all the groups that the student is in
  const user = await User.findById(userId);

  const courses = await Course.find({
    members: { $nin: user._id },
  })
    .populate("teacherId", "_id name surname")
    .populate({
      path: "members",
      select: "_id name surname studentNumber",
    })
    .select("_id name teacherId");
  if (!courses) return res.status(204).json({ message: "No courses found." });
  res.json(courses);
};

const importStudents = async (req, res) => {
  try {
    const file = req.file;
    const jsonArray = await csvtojson().fromFile(req.file.path);
    const results = [];
    const errors = [];
    for (let i = 0; i < jsonArray.length; i++) {
      try {
        const { name, surname, email, password, studentNumber } = jsonArray[i];
        const roles = { Student: 1984 };
        const { status, message } = await handleNewUser({
          body: { name, surname, email, password, studentNumber, roles },
        });
        console.log(message);
        if (status && status === 201) {
          results.push(jsonArray[i]);
        } else {
          errors.push({ line: i + 1, error: message });
        }
      } catch (err) {
        console.log(err);
        errors.push({ line: i + 1, error: err.message });
      }
    }
    res.json({ results, errors });
    const filePath = path.join(".", "public", "imports", file.filename);
    fs.unlinkSync(filePath);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const addCourseMembers = async (req, res) => {
  try {
    const courseId = req.body.id;
    const userId = req.body.user;

    const course = await Course.findById(courseId);

    if (course.members.includes(userId)) {
      return { status: 409, message: "User is already a member of the course" };
    }

    // Add the specified member to the course's members array
    course.members.push(userId);

    await course.save();

    return { status: 201, message: "Member added to the course" };
  } catch (err) {
    console.error(err);
    return { status: 500, message: "Server error" };
  }
};

const importMembers = async (req, res) => {
  try {
    const course = req.params.id;
    if (!course) {
      return { status: 409, message: "No course ID" };
    }
    const file = req.file;
    const jsonArray = await csvtojson().fromFile(req.file.path);
    const results = [];
    const errors = [];
    for (let i = 0; i < jsonArray.length; i++) {
      try {
        const { studentNumber } = jsonArray[i];
        const user = await User.findOne({
          studentNumber: studentNumber,
        }).exec();
        const { status, message } = await addCourseMembers({
          body: { id: course, user: user._id },
        });
        console.log(message);
        if (status && status === 201) {
          results.push(jsonArray[i]);
        } else {
          errors.push({ line: i + 1, error: message });
        }
      } catch (err) {
        console.log(err);
        errors.push({ line: i + 1, error: err.message });
      }
    }
    res.json({ results, errors });
    const filePath = path.join(".", "public", "imports", file.filename);
    fs.unlinkSync(filePath);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const importCourses = async (req, res) => {
  try {
    const file = req.file;
    const jsonArray = await csvtojson().fromFile(req.file.path);
    const results = [];
    const errors = [];
    for (let i = 0; i < jsonArray.length; i++) {
      try {
        const { name, teacherEmail } = jsonArray[i];
        console.log(name, teacherEmail);
        const teacher = await User.findOne({ email: teacherEmail }).exec();
        console.log(teacher);
        const { status, message } = await createCourseAdmin({
          body: { name, teacherId: teacher._id },
        });
        console.log(message);
        if (status && status === 201) {
          results.push(jsonArray[i]);
        } else {
          errors.push({ line: i + 1, error: message });
        }
      } catch (err) {
        console.log(err);
        errors.push({ line: i + 1, error: err.message });
      }
    }
    res.json({ results, errors });
    const filePath = path.join(".", "public", "imports", file.filename);
    fs.unlinkSync(filePath);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const importTeachers = async (req, res) => {
  try {
    const file = req.file;
    const jsonArray = await csvtojson().fromFile(req.file.path);
    const results = [];
    const errors = [];
    for (let i = 0; i < jsonArray.length; i++) {
      try {
        const { name, surname, email, password } = jsonArray[i];
        const roles = { Teacher: 5150 };
        const { status, message } = await handleNewUser({
          body: { name, surname, email, password, roles },
        });
        console.log(message);
        if (status && status === 201) {
          results.push(jsonArray[i]);
        } else {
          errors.push({ line: i + 1, error: message });
        }
      } catch (err) {
        console.log(err);
        errors.push({ line: i + 1, error: err.message });
      }
    }
    res.json({ results, errors });
    const filePath = path.join(".", "public", "imports", file.filename);
    fs.unlinkSync(filePath);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const removeUserFromCourses = async (req, res) => {
  try {
    const userId = req.params.id;
    const courses = req.body.courses;

    await Course.updateMany(
      { _id: { $in: courses } },
      { $pull: { members: userId } }
    );

    res.status(200).json({ message: "User removed from courses" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const addUserToCourses = async (req, res) => {
  try {
    const userId = req.params.id;
    const courses = req.body.courses;

    await Course.updateMany(
      { _id: { $in: courses } },
      { $addToSet: { members: userId } }
    );

    res.status(200).json({ message: "User added to courses" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const passwordChange = async (req, res) => {
  const { id, newPassword } = req.body;

  try {
    // Find the user by email
    const user = await User.findById(id).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const passwordMatch = await bcrypt.compare(newPassword, user.password);
    if (passwordMatch) {
      return res.status(401).json({ message: "Current password is the same" });
    }
    // Encrypt the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    user.password = hashedNewPassword;
    await user.save();

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const blockUser = async (req, res) => {
  if (!req?.params?.id)
    return res.status(400).json({ message: "User ID required" });

  const user = await User.findOne({ _id: req.params.id }).exec();

  if (!user) {
    return res
      .status(204)
      .json({ message: `User ID ${req.params.id} not found` });
  }

  // Check the user's current role and update it accordingly
  if (user.roles.Student) {
    user.roles = { Blocked: 4004, Student: user.roles.Student };
  } else if (user.roles.Teacher) {
    user.roles = { Blocked: 4004, Teacher: user.roles.Teacher };
  } else if (user.roles.Admin) {
    user.roles = { Blocked: 4004, Teacher: user.roles.Admin };
  }
  await user.save();

  console.log(user);

  return res.status(200).json({ message: "User blocked successfully" });
};

const unblockUser = async (req, res) => {
  if (!req?.params?.id)
    return res.status(400).json({ message: "User ID required" });

  const user = await User.findOne({ _id: req.params.id }).exec();

  if (!user) {
    return res
      .status(204)
      .json({ message: `User ID ${req.params.id} not found` });
  }

  // Check the user's current role and update it accordingly
  if (user.roles.Student) {
    user.roles = { User: 2001, Student: user.roles.Student };
  } else if (user.roles.Teacher) {
    user.roles = { User: 2001, Teacher: user.roles.Teacher };
  } else if (user.roles.Admin) {
    user.roles = { User: 2001, Teacher: user.roles.Admin };
  }
  await user.save();

  console.log(user);

  return res.status(200).json({ message: "User unblocked successfully" });
};

const handleUserUpdate = async (req, res) => {
  console.log(req.body);
  const { id, email, name, surname, studentNumber } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array() });
  }

  try {
    const user = await User.findOne({ _id: id }).exec();

    if (!user) {
      return res.status(404).json({ message: `User with ID ${id} not found` });
    }

    // Update user properties if provided
    if (email) {
      const duplicateEmail = await User.findOne({ email: email }).exec();
      if (duplicateEmail && duplicateEmail._id.toString() !== id) {
        return res.status(409).json({ message: "Email already exists" });
      }
      if (!validator.isEmail(email)) {
        return res.status(400).json({ message: "Invalid email address" });
      }
      user.email = email;
    }

    if (name) {
      user.name = name;
    }

    if (surname) {
      user.surname = surname;
    }

    if (studentNumber) {
      user.studentNumber = studentNumber;
    }

    await user.save();

    return res.status(200).json({
      message: `User ${user.name} ${user.surname} updated successfully`,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const handleCourseUpdate = async (req, res) => {
  console.log(req.body);
  const { id, name, description, teacherId } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array() });
  }

  try {
    const course = await Course.findOne({ _id: id }).exec();

    if (!course) {
      return res
        .status(404)
        .json({ message: `Course with ID ${id} not found` });
    }

    // Update course properties if provided

    if (name) {
      course.name = name;
    }

    if (description) {
      course.description = description;
    }

    if (teacherId) {
      course.teacherId = teacherId;
    }

    await course.save();

    return res
      .status(200)
      .json({ message: `Course ${course.name} updated successfully` });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const countLogins = async (req, res) => {
  try {
    const logins = await LoginCount.find()
      .sort({ _id: -1 }) // Sort in descending order based on the _id field
      .limit(7)
      .exec(); // Limit the number of results to 7
    return res.json(logins);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = {
  importTeachers,
  importStudents,
  getTeacherCsv,
  getStudentCsv,
  getCourseCsv,
  importCourses,
  getCourses,
  getImportMembersCsv,
  importMembers,
  passwordChange,
  removeUserFromCourses,
  addUserToCourses,
  blockUser,
  unblockUser,
  handleUserUpdate,
  handleCourseUpdate,
  countLogins,
};
