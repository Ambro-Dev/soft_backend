const Course = require("../model/Course");
const Exam = require("../model/Exam");
const User = require("../model/User");

const createEvent = async (req, res) => {
  try {
    const courseId = await Course.findById(req.body.course);
    const event = {
      title: req.body.title,
      description: req.body.description,
      url: req.body.url,
      start: req.body.start,
      end: req.body.end,
      className: req.body.className,
    };
    courseId.events.push(event);

    const savedCourse = await courseId.save();
    const savedEvent = savedCourse.events[savedCourse.events.length - 1]; // Get the last event in the array, which should be the one just added

    res.json(savedEvent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while saving the event" });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const courseId = req.body.courseId;
    const eventId = req.body.eventId;

    // Find the course by ID
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Find the index of the event to be deleted
    const eventIndex = course.events.findIndex(
      (event) => event._id.toString() === eventId
    );

    if (eventIndex === -1) {
      return res.status(404).json({ error: "Event not found" });
    }

    const exam = await Exam.findOne({ eventId: eventId });

    if (exam) {
      await exam.remove();
    }

    // Remove the event from the events array
    course.events.splice(eventIndex, 1);

    await course.save();

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while deleting the event" });
  }
};

const getCourseEvents = async (req, res) => {
  if (!req?.params?.id)
    return res.status(400).json({ message: "Course ID required" });
  const course = await Course.findOne({ _id: req.params.id }).exec();
  if (!course) {
    return res
      .status(204)
      .json({ message: `Course ID ${req.params.id} not found` });
  }
  res.json(course.events);
};

const createExam = async (req, res) => {
  console.log(req.body);
  if (!req?.body?.json)
    return res.status(400).json({ message: "Json is required" });

  const surveyData = {
    title: req.body.title,
    json: req.body.json,
    eventId: req.body.event,
    teacherId: req.body.teacher,
  };

  const newSurvey = new Exam(surveyData);
  console.log(newSurvey);
  newSurvey.save(function (error, savedSurvey) {
    if (error) {
      console.error(error);
      res.status(500).send(error);
    } else {
      console.log("Survey saved successfully!");
      res.json(savedSurvey);
    }
  });
};

const getExam = async (req, res) => {
  const event = req.params.event;

  Exam.findOne({ eventId: event })
    .then((foundSurvey) => {
      res.json(foundSurvey);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("An error occurred while updating the survey");
    });
};

const updateExam = async (req, res) => {
  const surveyId = req.params.id;
  const { title, json } = req.body;

  Exam.findByIdAndUpdate(surveyId, { title, json }, { new: true })
    .then((updatedSurvey) => {
      res.json(updatedSurvey);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("An error occurred while updating the survey");
    });
};

const getAllExamResultsForUser = async (req, res) => {
  const userId = req.params.id;
  const exams = await Exam.find({ "results.userId": userId });
  const examResults = {};
  await Promise.all(
    exams.map(async (exam) => {
      const course = await Course.findOne({
        events: { $elemMatch: { _id: exam.eventId } },
      });
      const userResults = exam.results.filter((result) => {
        return result.userId.toString() === userId.toString();
      });
      const examResult = {
        examId: exam._id,
        examTitle: exam.title,
        results: userResults,
      };
      if (course.name in examResults) {
        examResults[course.name].push(examResult);
      } else {
        examResults[course.name] = [examResult];
      }
    })
  );
  return res.json(examResults);
};

const getAllExamResultsForTeacher = async (req, res) => {
  const teacherId = req.params.id;
  const exams = await Exam.find({ teacherId: teacherId });
  const examResults = await Promise.all(
    exams.map(async (exam) => {
      const course = await Course.findOne({
        events: { $elemMatch: { _id: exam.eventId } },
      });
      const examResult = {
        courseName: course.name,
        examId: exam._id,
        examTitle: exam.title,
        results: [],
      };
      const resultPromises = exam.results.map(async (result) => {
        const user = await User.findOne({ _id: result.userId });
        const userResult = {
          userId: user._id,
          userName: user.name,
          userSurname: user.surname,
          totalScore: result.json.totalScore,
          maxScore: result.json.maxScore,
        };
        examResult.results.push(userResult);
      });
      await Promise.all(resultPromises);
      return examResult;
    })
  );
  return res.json(examResults);
};

const saveExamResults = async (req, res) => {
  const surveyId = req.params.id;
  const { userId, json } = req.body;
  const results = { userId, json };

  Exam.findOneAndUpdate(
    { _id: surveyId, "results.userId": userId },
    { $set: { "results.$.json": json } },
    { new: true }
  )
    .then((updatedSurvey) => {
      if (!updatedSurvey) {
        Exam.findByIdAndUpdate(surveyId, { $push: { results } }, { new: true })
          .then((updatedSurvey) => {
            res.json(updatedSurvey);
          })
          .catch((error) => {
            console.error(error);
            res.status(500).send("An error occurred while updating the survey");
          });
      } else {
        res.json(updatedSurvey);
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("An error occurred while updating the survey");
    });
};

const getUserEvents = async (req, res) => {
  if (!req?.params?.id)
    return res.status(400).json({ message: "User ID required" });

  const user = await User.findById(req.params.id).exec();

  let courses;

  if (user.roles.Teacher) {
    courses = await Course.find({ teacherId: req.params.id }).exec();
  } else {
    courses = await Course.find({ members: req.params.id }).exec();
  }

  if (!courses.length) {
    return res.status(204).json({
      message: `User ID ${req.params.id} is not a member of any courses`,
    });
  }

  const events = courses
    .map((course) => course.events)
    .flat()
    .map((event) => {
      const { _id, title, start, end, url, className, description } = event;
      return { _id, title, start, end, url, className, description };
    });

  res.json(events);
};

const setEventUrl = async (req, res) => {
  console.log(req.body);
  try {
    const course = req.params.id;
    const { event, url } = req.body;
    Course.findOneAndUpdate(
      { _id: course, "events._id": event },
      { $set: { "events.$.url": url } },
      { new: true },
      (err) => {
        if (err) {
          console.log("Error updating event:", err);
        }
      }
    );
    res.json({ message: "Updated" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while updating the event" });
  }
};

module.exports = {
  createEvent,
  getCourseEvents,
  setEventUrl,
  getUserEvents,
  createExam,
  updateExam,
  getExam,
  saveExamResults,
  getAllExamResultsForUser,
  getAllExamResultsForTeacher,
  deleteEvent,
};
