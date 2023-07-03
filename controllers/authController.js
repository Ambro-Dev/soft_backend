const User = require("../model/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const LoginCount = require("../model/LoginCount");

const handleLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res
      .status(400)
      .json({ message: "Email and password are required." });

  const foundUser = await User.findOne({ email: email }).exec();
  if (!foundUser) return res.sendStatus(401); //Unauthorized
  // evaluate password
  const match = await bcrypt.compare(password, foundUser.password);
  if (match) {
    const roles = Object.values(foundUser.roles).filter(Boolean);
    const id = foundUser.id;
    const name = foundUser.name;
    const surname = foundUser.surname;
    const picture = foundUser.picture;
    // create JWTs
    const accessToken = jwt.sign(
      {
        UserInfo: {
          email: foundUser.email,
          roles: roles,
        },
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "10m" }
    );
    const refreshToken = jwt.sign(
      { email: foundUser.email },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "1d" }
    );
    // Saving refreshToken with current user
    foundUser.refreshToken = refreshToken;
    await foundUser.save();

    // Creates Secure Cookie with refresh token
    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 24 * 60 * 60 * 1000,
    });

    const currentDate = new Date();
    const truncatedDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      8,
      0,
      0,
      0
    );

    LoginCount.findOneAndUpdate(
      { date: truncatedDate },
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    )
      .then((countDoc) => {
        console.log(
          `Updated login count for ${countDoc.date}: ${countDoc.count}`
        );
      })
      .catch((err) => console.log(err));

    // Send authorization roles and access token to user
    res.json({ id, name, surname, roles, accessToken, picture });
  } else {
    res.sendStatus(401);
  }
};

module.exports = { handleLogin };
