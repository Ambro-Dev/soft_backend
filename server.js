const { instrument } = require("@socket.io/admin-ui");
require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const cors = require("cors");
const corsOptions = require("./config/corsOptions");
const { logger } = require("./middleware/logEvents");
const errorHandler = require("./middleware/errorHandler");
const verifyJWT = require("./middleware/verifyJWT");
const cookieParser = require("cookie-parser");
const credentials = require("./middleware/credentials");
const mongoose = require("mongoose");
const connectDB = require("./config/dbConn");
const User = require("./model/User");
const Conversation = require("./model/Conversation");
const http = require("http").createServer(app);
const bcrypt = require("bcrypt");
const readline = require("readline");
const imageRoutes = require("./controllers/pictureController");
const filesRoutes = require("./controllers/filesController");
const Course = require("./model/Course");
const io = require("socket.io")(http, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://future.mans.org.pl",
      "https://www.future.mans.org.pl",
      "http://localhost",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  socket: {
    path: "/socket.io",
  },
});

const PORT = process.env.PORT || 3500;
const socketIOPort = process.env.SOCKETIO_PORT || 4000;

// Connect to MongoDB
connectDB();

// custom middleware logger
app.use(logger);

// Handle options credentials check - before CORS!
// and fetch cookies credentials requirement
app.use(credentials);

// Cross Origin Resource Sharing
app.use(cors(corsOptions));

// built-in middleware to handle urlencoded form data
app.use(express.urlencoded({ extended: false }));

// built-in middleware for json
app.use(express.json());

//middleware for cookies
app.use(cookieParser());

//serve static files
app.use("/api", express.static(path.join(__dirname, "/public")));

// routes
app.use("/api", require("./routes/root"));
app.use("/api/register", require("./routes/register"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/refresh", require("./routes/refresh"));
app.use("/api/logout", require("./routes/logout"));
app.use("/api/reset-password", require("./routes/reset-password"));

app.use(verifyJWT);
app.use("/api/users", require("./routes/api/users"));
app.use("/api/courses", require("./routes/api/courses"));
app.use("/api/conversations", require("./routes/api/conversations"));
app.use("/api/events", require("./routes/api/events"));
app.use("/api/profile-picture", imageRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/admin", require("./routes/api/admin"));

app.all("*", (req, res) => {
  res.status(404);
  if (req.accepts("html")) {
    res.sendFile(path.join(__dirname, "views", "404.html"));
  } else if (req.accepts("json")) {
    res.json({ error: "404 Not Found" });
  } else {
    res.type("txt").send("404 Not Found");
  }
});
app.use(errorHandler);

const connection = mongoose.connection;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

connection.once("open", async () => {
  console.log("Connected to MongoDB");

  const admin = await User.findOne({ email: "admin@mans.org.pl" }).exec();

  if (!admin) {
    let password = "";

    while (password.length < 16 || !isStrongPassword(password)) {
      password = await new Promise((resolve) => {
        rl.question(
          "Enter admin password (min length 16 characters, at least one uppercase, one lowercase, one digit, and one special character): ",
          (answer) => {
            resolve(answer);
          }
        );
      });

      if (password.length < 16) {
        console.log(
          "Password too short. Please enter a password with at least 16 characters."
        );
      } else if (!isStrongPassword(password)) {
        console.log(
          "Password does not meet complexity requirements. Please include at least one uppercase letter, one lowercase letter, one digit, and one special character."
        );
      }
    }

    const hashedPwd = await bcrypt.hash(password, 10);

    const adminUser = await User.create({
      email: "admin@mans.org.pl",
      password: hashedPwd,
      name: "Admin",
      surname: "Admin",
      roles: { Admin: 1001 },
    });

    await adminUser.save();

    console.log("Admin user created");

    http.listen(PORT, () => {
      console.log(`HTTP server listening on port ${PORT}`);
    });
  } else {
    http.listen(PORT, () => {
      console.log(`HTTP server listening on port ${PORT}`);
    });
  }

  rl.close(); // Close the readline interface
});

function isStrongPassword(password) {
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!#%*?&])[A-Za-z\d@$#!%*?&]+$/;
  return passwordRegex.test(password);
}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  socket.on("join-call", async (data) => {
    const { eventId, userId } = data;
    console.log("User:", userId, "joins event:", eventId);

    const course = await Course.findOne({
      "events._id": eventId,
    }).exec();

    if (course) {
      const event = course.events.id(eventId);
      if (event) {
        event.inCall.push(userId);
        await course.save();
      }
    }
  });

  socket.on("leave-call", async (data) => {
    const { eventId, userId } = data;
    console.log("User:", userId, "leaves event:", eventId);

    const course = await Course.findOne({
      "events._id": eventId,
    }).exec();

    if (course) {
      const event = course.events.id(eventId);
      if (event) {
        event.inCall = event.inCall.filter((id) => id.toString() !== userId);
        await course.save();
      }
    }
  });

  socket.on("leave-all", async (data) => {
    const { userId } = data;
    console.log("User:", userId, "leaves all calls");
    await Course.updateMany(
      { "events.inCall": userId },
      { $pull: { "events.$.inCall": userId } }
    );
  });

  socket.on("user-connected", async (userId) => {
    const user = await User.findById(userId).exec();

    user.socket = socket.id;

    await user.save();
  });

  socket.on("join-conversation", async (conversationId) => {
    // Join the user to the conversation\
    if (conversationId) {
      socket.join(conversationId);
      console.log(`User joined conversation ${conversationId}`);

      const conversation = await Conversation.findById(conversationId);
      const messages = conversation.messages;
      io.to(conversationId).emit("conversation-messages", messages);
    }
  });

  socket.on("leave-conversation", ({ conversation }) => {
    // Leave the user from the conversation
    socket.leave(conversation);
    console.log(`User left conversation ${conversation}`);
  });

  socket.on("send-message", async (data) => {
    const conversation = await Conversation.findById(data.conversation);
    const message = {
      sender: data.sender,
      text: data.text,
      createdAt: Date.now(),
    };
    conversation.messages.push(message);
    const savedConversation = await conversation.save();
    const savedMessage =
      savedConversation.messages[savedConversation.messages.length - 1];
    io.to(data.conversation).emit("message", savedMessage);
  });

  socket.on("new-event", async (data) => {
    io.to(data.course).emit("event", data);
  });

  socket.on("join-course", async (course) => {
    socket.join(course);
    console.log("User joind course:", course);
  });

  socket.on("leave-course", async (course) => {
    socket.leave(course);
    console.log("User left course:", course);
  });

  socket.on("disconnect", async (socket) => {
    const user = await User.findOne({ socket: socket.id }).exec();

    if (user) {
      await Course.updateMany(
        { "events.inCall": user._id },
        { $pull: { "events.$.inCall": user._id } }
      );

      user.socket = null;

      await user.save();
    }

    console.log("A user disconnected");
  });
});

instrument(io, {
  auth: false,
  mode: "development",
});
