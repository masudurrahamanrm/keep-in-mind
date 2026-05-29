const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  pushSync,
  pullSync,
  backupToDrive,
  listBackups,
  restoreFromBackup
} = require('../controllers/syncController');

const router = express.Router();

router.use(protect);

router.post('/push', pushSync);
router.get('/pull', pullSync);
router.post('/backup', backupToDrive);
router.get('/backups', listBackups);
router.post('/restore/:fileId', restoreFromBackup);

module.exports = router;
