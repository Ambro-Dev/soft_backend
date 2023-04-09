const Group = require('../model/Group');

const getAllGroups = async (req, res) => {
    const groups = await Group.find();
    if (!groups) return res.status(204).json({ 'message': 'No groups found.' });
    res.json(groups);
}

const createNewGroup = async (req, res) => {
    if (!req?.body?.name) {
        return res.status(400).json({ 'message': 'Names is required' });
    }

    try {
        const result = await Group.create({
            name: req.body.name
        });

        res.status(201).json(result);
    } catch (err) {
        console.error(err);
    }
}

const getGroup = async (req, res) => {
    if (!req?.params?.id) return res.status(400).json({ 'message': 'Group ID required.' });

    const group = await Group.findOne({ _id: req.params.id }).exec();
    if (!group) {
        return res.status(204).json({ "message": `No group matches ID ${req.params.id}.` });
    }
    res.json(group);
}

const getAllGroupUsers = async (req, res) => {
    try {
      const userId = req.params.id;
  
      // Find all the groups that the student is in
      const groups = await Group.find({ studentIds: userId });
  
      // Get all courses associated with those groups
      const courses = await Course.find({
        groupIds: { $in: groups.map((g) => g._id) },
      })
        .populate("teacherId", "-_id name surname picture")
        .populate({
          path: "groupIds",
          select: "-_id studentIds",
          populate: {
            path: "studentIds",
            select: "-_id name surname studentNumber picture",
          },
        })
        .select("-_id name teacherId groupIds");
  
      res.json(courses);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  };

module.exports = {
    getAllGroups,
    createNewGroup,
    getGroup,
    getAllGroupUsers
}