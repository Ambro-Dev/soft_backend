const User = require('../model/User');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator')

const handleNewUser = 
(body('email').isEmail(),
// password must be at least 5 chars long
body('password').isLength({ min: 6 }), 
async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
    const { email, password, name, surname, studentNumber, roles, } = req.body;
    if (!email || !password) return res.status(400).json({ 'message': 'Username and password are required.' });

    // username must be an email
    

    // check for duplicate usernames in the db
    const duplicate = await User.findOne({ email: email }).exec();
    if (duplicate) return res.sendStatus(409); //Conflict 

    try {
        //encrypt the password
        const hashedPwd = await bcrypt.hash(password, 10);

        //create and store the new user
        const result = await User.create({
            "email": email,
            "password": hashedPwd,
            "name": name,
            "surname": surname,
            "studentNumber": studentNumber,
            "roles": roles
        });

        console.log(result);

        res.status(201).json({ 'success': `New user ${email} created!` });
    } catch (err) {
        res.status(500).json({ 'message': err.message });
    }
})

module.exports = { handleNewUser };