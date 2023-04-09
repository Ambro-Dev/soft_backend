const Course = require("../model/Course");
const User = require("../model/User");
const fs = require("fs");
const path = require("path");

const getAllCourses = async (req, res) => {
  const courses = await Course.find();
  if (!courses) return res.status(204).json({ message: "No courses found." });
  res.json(courses);
};

const createNewCourse = async (req, res) => {
  if (!req?.body?.name || !req?.body?.teacherId || !req?.body?.description) {
    return res
      .status(400)
      .json({ message: "Name of the course and teacher are required" });
  }
  const teacher = await User.findById(req.body.teacherId);
  if (!teacher) {
    res
      .status(400)
      .json({
        message: "No such teacher or provided id does not belong to teacher",
      });
  }

  try {
    const { name, teacherId, description, pic } = req.body;
    // Create the course in the database
    const course = await Course.create({ name, teacherId, description, pic });

    res.json(course);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getCourse = async (req, res) => {
  if (!req?.params?.id)
    return res.status(400).json({ message: "Course ID required." });

  const course = await Course.findOne({ _id: req.params.id }).exec();
  if (!course) {
    return res
      .status(204)
      .json({ message: `No course matches ID ${req.params.id}.` });
  }
  res.json(course);
};

const getCourseForEvent = async (req, res) => {
  if (!req?.params?.id)
    return res.status(400).json({ message: "Event ID required." });

    const eventId = req.params.id;
    const course = await Course.findOne({
      events: { $elemMatch: { _id: eventId } }
    }).exec();
    
    if (!course) {
      return res.status(204).json({ message: `No course found for event ID ${eventId}` });
    }
  res.json(course);
};

const getCourseTeacher = async (req, res) => {
  if (!req?.params?.id)
    return res.status(400).json({ message: "Course ID required." });

  const course = await Course.findById(req.params.id);
  const teacher = await User.findById(course.teacherId);
  const teacherInfo = {
    _id: teacher.id,
    name: teacher.name,
    surname: teacher.surname,
    picture: teacher.picture,
  };
  if (!course) {
    return res
      .status(204)
      .json({ message: `No course matches ID ${req.params.id}.` });
  }
  res.json(teacherInfo);
};

const getAllUserCourses = async (req, res) => {
  try {
    const userId = req.params.id;

    // Find all the groups that the student is in
    const user = await User.findById(userId);

    // Get all courses associated with those groups
    const courses = await Course.find({
      members: { $in: user._id },
    })
      .populate("teacherId", "_id name surname picture")
      .populate({
        path: "members",
        select: "_id name surname studentNumber picture",
      })
      .select("_id name teacherId pic");

    res.json(courses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAllTeacherCourses = async (req, res) => {
  try {
    const userId = req.params.id;

    // Find all the groups that the student is in
    const user = await User.findById(userId);

    // Get all courses associated with those groups
    const courses = await Course.find({
      teacherId: { $in: user._id },
    })
      .populate("teacherId", "_id name surname picture")
      .populate({
        path: "members",
        select: "_id name surname studentNumber picture",
      })
      .select("_id name teacherId pic");

    res.json(courses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAllCourseMembers = async (req, res) => {
  try {
    const courseId = req.params.id;
    const course = await Course.findById(courseId).populate(
      "members",
      "_id name surname studentNumber picture"
    );
    const members = course.members.map((member) => ({
      _id: member._id,
      name: member.name,
      surname: member.surname,
      studentNumber: member.studentNumber,
      picture: member.picture,
    }));
    res.json(members);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getAllCourses,
  createNewCourse,
  getCourse,
  getAllUserCourses,
  getAllCourseMembers,
  getCourseTeacher,
  getAllTeacherCourses,
  getCourseForEvent
};
