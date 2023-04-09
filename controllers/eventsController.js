const Course = require("../model/Course");
const Exam = require("../model/Exam");

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
  const examResults = await Promise.all(exams.map(async (exam) => {
    const course = await Course.findOne({ events: { $elemMatch: { _id: exam.eventId } } });
    const examResult = {
      courseName: course.name,
      examId: exam._id,
      examTitle: exam.title,
      results: exam.results
    };
    exam.results.forEach((result) => {
      if (result.userId === userId) {
        examResult.results.push(result.json.totalScore);
      }
    });
    return examResult;
  }));
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

  const courses = await Course.find({ members: req.params.id }).exec();

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
};
