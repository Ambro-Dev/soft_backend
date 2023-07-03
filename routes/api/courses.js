const express = require("express");
const router = express.Router();
const ROLES_LIST = require("../../config/roles_list");
const coursesController = require("../../controllers/coursesController");
const foldersController = require("../../controllers/foldersController");
const verifyRoles = require("../../middleware/verifyRoles");

router
  .route("/")
  .get(verifyRoles(ROLES_LIST.User), coursesController.getAllCourses)
  .post(verifyRoles(ROLES_LIST.User), coursesController.createNewCourse);

router
  .route("/edit-course")
  .put(verifyRoles(ROLES_LIST.Teacher), coursesController.editCourse);

router.route("/:id").get(coursesController.getCourse);

router
  .route("/:id/members")
  .get(
    verifyRoles(ROLES_LIST.Teacher, ROLES_LIST.User, ROLES_LIST.Student),
    coursesController.getAllCourseMembers
  );

router
  .route("/:id/teacher")
  .get(verifyRoles(ROLES_LIST.User), coursesController.getCourseTeacher);

router
  .route("/:id/filetree")
  .get(verifyRoles(ROLES_LIST.User), foldersController.getTree);

router
  .route("/:id/event")
  .get(verifyRoles(ROLES_LIST.User), coursesController.getCourseForEvent);

module.exports = router;
