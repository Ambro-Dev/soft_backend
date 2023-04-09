const express = require('express');
const router = express.Router();
const ROLES_LIST = require('../../config/roles_list');
const eventsController = require('../../controllers/eventsController');

const verifyRoles = require('../../middleware/verifyRoles');

router.route('/create')
    .post(verifyRoles(ROLES_LIST.User), eventsController.createEvent);

router.route('/:id')
    .get(verifyRoles(ROLES_LIST.User), eventsController.getCourseEvents);

router.route('/:id/update')
    .put(verifyRoles(ROLES_LIST.User), eventsController.setEventUrl);

router.route('/user/:id')
    .get(verifyRoles(ROLES_LIST.User), eventsController.getUserEvents);

router.route('/exam/create')
    .post(verifyRoles(ROLES_LIST.User), eventsController.createExam);

router.route('/exam/:id')
    .put(verifyRoles(ROLES_LIST.User), eventsController.updateExam);

router.route('/exam/:event')
    .get(verifyRoles(ROLES_LIST.User), eventsController.getExam);

router.route('/exam/:id/results')
    .put(verifyRoles(ROLES_LIST.User), eventsController.saveExamResults);

router.route('/exam/:id/results')
    .get(verifyRoles(ROLES_LIST.User), eventsController.getAllExamResultsForUser);

module.exports = router;
