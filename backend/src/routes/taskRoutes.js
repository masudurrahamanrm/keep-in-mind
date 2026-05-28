const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Task = require('../models/Task');

// GET all tasks for user
router.get('/', protect, async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    console.error('[Task Routes GET Error]', error);
    res.status(500).json({ message: 'Server error retrieving tasks' });
  }
});

// POST add a new task
router.post('/', protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Task text is required' });
    }

    const newTask = new Task({
      user: req.user._id,
      text: text.trim(),
      completed: false
    });

    await newTask.save();
    res.status(201).json(newTask);
  } catch (error) {
    console.error('[Task Routes POST Error]', error);
    res.status(500).json({ message: 'Server error creating task' });
  }
});

// PATCH toggle or update a task
router.patch('/:id', protect, async (req, res) => {
  try {
    const { completed, text } = req.body;
    const updateData = {};
    if (completed !== undefined) updateData.completed = completed;
    if (text !== undefined) updateData.text = text;

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updateData,
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('[Task Routes PATCH Error]', error);
    res.status(500).json({ message: 'Server error updating task' });
  }
});

// DELETE a task
router.delete('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('[Task Routes DELETE Error]', error);
    res.status(500).json({ message: 'Server error deleting task' });
  }
});

module.exports = router;
