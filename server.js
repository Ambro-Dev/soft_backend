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
const { createEvent } = require("./controllers/eventsController");
const http = require("http").createServer(app);
const imageRoutes = require("./controllers/pictureController");
const filesRoutes = require("./controllers/filesController");
const io = require("socket.io")(http, {
  cors: {
    origin: ["http://localhost:3000", "https://admin.socket.io"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});
const crypto = require("crypto");
const { GridFsStorage } = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const methodOverride = require("method-override");
const multer = require("multer");

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
app.use("/", express.static(path.join(__dirname, "/public")));

// routes
app.use("/", require("./routes/root"));
app.use("/register", require("./routes/register"));
app.use("/auth", require("./routes/auth"));
app.use("/refresh", require("./routes/refresh"));
app.use("/logout", require("./routes/logout"));

app.use(verifyJWT);
app.use("/users", require("./routes/api/users"));
app.use("/courses", require("./routes/api/courses"));
app.use("/conversations", require("./routes/api/conversations"));
app.use("/events", require("./routes/api/events"));
app.use("/profile-picture", imageRoutes);
app.use("/files", filesRoutes);

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

connection.once("open", () => {
  console.log("Connected to MongoDB");
  http.listen(PORT, () => {
    console.log(`HTTP server listening on port ${PORT}`);
  });
  const gfs = Grid(connection.db, mongoose.mongo);
  gfs.collection = "uploads";
  module.exports.gfs = gfs;
});

const users = {};

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  socket.on("register", (userId) => {
    users[userId] = socket.id;

    for (const otherUserId in users) {
      if (otherUserId !== userId) {
        io.to(socket.id).emit("otherUserRegistered", otherUserId);
      }
    }

    for (const otherUserId in users) {
      if (otherUserId !== userId) {
        io.to(users[otherUserId]).emit("otherUserRegistered", userId);
      }
    }
  });

  socket.on("join-conversation", async (conversationId) => {
    // Join the user to the conversation\
    socket.join(conversationId);
    console.log(`User joined conversation ${conversationId}`);

    const conversation = await Conversation.findById(conversationId);
    const messages = conversation.messages;
    io.to(conversationId).emit("conversation-messages", messages);
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

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

instrument(io, {
  auth: false,
  mode: "development",
});
