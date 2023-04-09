const express = require('express');
const router = express.Router();
const ROLES_LIST = require('../../config/roles_list');
const conversationsController = require('../../controllers/conversationsController');
const verifyRoles = require('../../middleware/verifyRoles');

router.route('/')
    .post(conversationsController.createConversation)
    .get(conversationsController.getAllConversations);

router.route('/:id')
    .get(conversationsController.getUserConversation);

module.exports = router;
