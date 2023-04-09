const express = require('express');
const router = express.Router();
const usersController = require('../../controllers/usersController');
const ROLES_LIST = require('../../config/roles_list');
const verifyRoles = require('../../middleware/verifyRoles');
const coursesController = require('../../controllers/coursesController');

router.route('/')
    .get(verifyRoles(ROLES_LIST.User), usersController.getAllUsers)
    .delete(verifyRoles(ROLES_LIST.User), usersController.deleteUser);

router.route('/teachers')
    .get(verifyRoles(ROLES_LIST.User), usersController.getAllTeachers)

router.route('/students')
    .get(verifyRoles(ROLES_LIST.User), usersController.getAllStudents)

router.route('/:id')
    .get(verifyRoles(ROLES_LIST.User), usersController.getUser);

router.route('/updateall')
    .put(verifyRoles(ROLES_LIST.User), usersController.updateAllPicture);

router.route('/:id/profile-picture')
    .post(verifyRoles(ROLES_LIST.User), usersController.uploadProfilePicture);

router.route('/:id/courses')
    .get(verifyRoles(ROLES_LIST.Teacher, ROLES_LIST.Student), coursesController.getAllUserCourses);

router.route('/teacher/:id/courses')
    .get(verifyRoles(ROLES_LIST.Teacher, ROLES_LIST.User), coursesController.getAllTeacherCourses)

module.exports = router;