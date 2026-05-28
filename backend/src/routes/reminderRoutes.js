const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Reminder = require('../models/Reminder');

// GET all reminders for user
router.get('/', protect, async (req, res) => {
  try {
    const reminders = await Reminder.find({ user: req.user._id }).sort({ time: 1 });
    res.json(reminders);
  } catch (error) {
    console.error('[Reminder Routes GET Error]', error);
    res.status(500).json({ message: 'Server error retrieving reminders' });
  }
});

// POST add a new reminder
router.post('/', protect, async (req, res) => {
  try {
    const { text, time, category, priority, repeat } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Reminder text is required' });
    }
    if (!time) {
      return res.status(400).json({ message: 'Reminder time is required' });
    }

    const newReminder = new Reminder({
      user: req.user._id,
      text: text.trim(),
      time: new Date(time),
      category: category || 'Other',
      priority: priority || 'Normal',
      repeat: repeat || 'Does not repeat',
      completed: false
    });

    await newReminder.save();
    res.status(201).json(newReminder);
  } catch (error) {
    console.error('[Reminder Routes POST Error]', error);
    res.status(500).json({ message: 'Server error creating reminder' });
  }
});

// PATCH update a reminder
router.patch('/:id', protect, async (req, res) => {
  try {
    const { completed, text, time, category, priority, repeat, snoozedUntil } = req.body;
    const updateData = {};
    if (completed !== undefined) updateData.completed = completed;
    if (text !== undefined) updateData.text = text;
    if (time !== undefined) updateData.time = new Date(time);
    if (category !== undefined) updateData.category = category;
    if (priority !== undefined) updateData.priority = priority;
    if (repeat !== undefined) updateData.repeat = repeat;
    if (snoozedUntil !== undefined) updateData.snoozedUntil = snoozedUntil ? new Date(snoozedUntil) : null;

    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updateData,
      { new: true }
    );

    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    res.json(reminder);
  } catch (error) {
    console.error('[Reminder Routes PATCH Error]', error);
    res.status(500).json({ message: 'Server error updating reminder' });
  }
});

// DELETE a reminder
router.delete('/:id', protect, async (req, res) => {
  try {
    const reminder = await Reminder.findOneAndDelete({ _id: req.params.id, user: req.user._id });

    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    res.json({ message: 'Reminder deleted successfully' });
  } catch (error) {
    console.error('[Reminder Routes DELETE Error]', error);
    res.status(500).json({ message: 'Server error deleting reminder' });
  }
});

module.exports = router;
