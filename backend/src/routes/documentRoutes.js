const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const { 
  uploadDocument, 
  getDocumentsByCategory,
  deleteDocument,
  renameDocument,
  streamDocument,
  getDocumentCounts
} = require('../controllers/documentController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

router.post('/upload', protect, upload.single('file'), uploadDocument);
router.get('/metrics/counts', protect, getDocumentCounts);
router.get('/:category', protect, getDocumentsByCategory);
router.delete('/:id', protect, deleteDocument);
router.patch('/:id/rename', protect, renameDocument);
router.get('/stream/:fileId', protect, streamDocument);

module.exports = router;
