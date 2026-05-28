const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Note = require('../models/Note');

// GET all active notes for user (not trashed)
router.get('/', protect, async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user._id, trashed: false }).sort({ date: -1 });
    res.json(notes);
  } catch (error) {
    console.error('[Note Routes GET Error]', error);
    res.status(500).json({ message: 'Server error retrieving notes' });
  }
});

// GET all trashed notes
router.get('/trash', protect, async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user._id, trashed: true }).sort({ date: -1 });
    res.json(notes);
  } catch (error) {
    console.error('[Note Routes GET Trash Error]', error);
    res.status(500).json({ message: 'Server error retrieving trashed notes' });
  }
});

// GET a specific note by ID
router.get('/:id', protect, async (req, res) => {
  try {
    // Attempt to find by MongoDB _id first, then fallback to custom id if passed
    let note;
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      note = await Note.findOne({ _id: req.params.id, user: req.user._id });
    }
    if (!note) {
      note = await Note.findOne({ id: req.params.id, user: req.user._id });
    }

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    res.json(note);
  } catch (error) {
    console.error('[Note Routes GET Specific Error]', error);
    res.status(500).json({ message: 'Server error retrieving note' });
  }
});

// POST add a new note
router.post('/', protect, async (req, res) => {
  try {
    const { id, title, content, color, textColor, category, pinned, archived, trashed, type, date } = req.body;

    const newNote = new Note({
      user: req.user._id,
      id: id || Date.now(),
      title: title || '',
      content: content || '',
      color: color || 'bg-surface',
      textColor: textColor || 'text-on-surface',
      category: category || 'Personal',
      pinned: pinned || false,
      archived: archived || false,
      trashed: trashed || false,
      type: type || 'text',
      date: date ? new Date(date) : Date.now()
    });

    await newNote.save();
    res.status(201).json(newNote);
  } catch (error) {
    console.error('[Note Routes POST Error]', error);
    res.status(500).json({ message: 'Server error creating note' });
  }
});

// PATCH update a note
router.patch('/:id', protect, async (req, res) => {
  try {
    const updates = req.body;
    
    let note;
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      note = await Note.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        updates,
        { new: true }
      );
    }
    if (!note) {
      note = await Note.findOneAndUpdate(
        { id: req.params.id, user: req.user._id },
        updates,
        { new: true }
      );
    }

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.json(note);
  } catch (error) {
    console.error('[Note Routes PATCH Error]', error);
    res.status(500).json({ message: 'Server error updating note' });
  }
});

// DELETE a note permanently
router.delete('/:id', protect, async (req, res) => {
  try {
    let note;
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    }
    if (!note) {
      note = await Note.findOneAndDelete({ id: req.params.id, user: req.user._id });
    }

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('[Note Routes DELETE Error]', error);
    res.status(500).json({ message: 'Server error deleting note' });
  }
});

module.exports = router;
