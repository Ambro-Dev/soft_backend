const express = require("express");
const router = express.Router();
const ROLES_LIST = require("../../config/roles_list");
const adminController = require("../../controllers/adminController");
const coursesController = require("../../controllers/coursesController");
const usersController = require("../../controllers/usersController");
const multer = require("multer");

const verifyRoles = require("../../middleware/verifyRoles");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/imports");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const uploads = multer({ storage: storage });

router
  .route("/import-teachers")
  .post(
    verifyRoles(ROLES_LIST.Admin),
    uploads.single("file"),
    adminController.importTeachers
  );

router
  .route("/import-students")
  .post(
    verifyRoles(ROLES_LIST.Admin),
    uploads.single("file"),
    adminController.importStudents
  );

router
  .route("/import-courses")
  .post(
    verifyRoles(ROLES_LIST.Admin),
    uploads.single("file"),
    adminController.importCourses
  );

router
  .route("/teacher-schema")
  .get(verifyRoles(ROLES_LIST.Admin), adminController.getTeacherCsv);

router
  .route("/:id/courses")
  .get(verifyRoles(ROLES_LIST.Admin), adminController.getCourses);

router
  .route("/courses-schema")
  .get(verifyRoles(ROLES_LIST.Admin), adminController.getCourseCsv);

router
  .route("/student-schema")
  .get(verifyRoles(ROLES_LIST.Admin), adminController.getStudentCsv);

router
  .route("/users")
  .get(verifyRoles(ROLES_LIST.Admin), usersController.getAllUsersforAdmin);

router
  .route("/users/change-user")
  .put(verifyRoles(ROLES_LIST.Admin), adminController.handleUserUpdate);

router
  .route("/courses/change-course")
  .put(verifyRoles(ROLES_LIST.Admin), adminController.handleCourseUpdate);

router
  .route("/:id/members")
  .put(verifyRoles(ROLES_LIST.Admin), coursesController.addCourseMembers)
  .post(verifyRoles(ROLES_LIST.Admin), coursesController.removeCourseMembers);

router
  .route("/delete-course/:id")
  .delete(verifyRoles(ROLES_LIST.Admin), coursesController.deleteCourse);

router
  .route("/import-members/schema")
  .get(verifyRoles(ROLES_LIST.Admin), adminController.getImportMembersCsv);

router
  .route("/students")
  .get(verifyRoles(ROLES_LIST.Admin), usersController.getAllStudents);

router
  .route("/change-password")
  .post(verifyRoles(ROLES_LIST.Admin), adminController.passwordChange);

router
  .route("/:id/remove-courses")
  .put(verifyRoles(ROLES_LIST.Admin), adminController.removeUserFromCourses);

router
  .route("/:id/block-user")
  .put(verifyRoles(ROLES_LIST.Admin), adminController.blockUser);

router
  .route("/:id/unblock-user")
  .put(verifyRoles(ROLES_LIST.Admin), adminController.unblockUser);

router
  .route("/courses/all")
  .get(verifyRoles(ROLES_LIST.Admin), coursesController.getCourses);

router
  .route("/login-count")
  .get(verifyRoles(ROLES_LIST.Admin), adminController.countLogins);

router
  .route("/:id/add-courses")
  .put(verifyRoles(ROLES_LIST.Admin), adminController.addUserToCourses);

router
  .route("/import-members/:id")
  .post(
    verifyRoles(ROLES_LIST.Admin),
    uploads.single("file"),
    adminController.importMembers
  );

module.exports = router;
