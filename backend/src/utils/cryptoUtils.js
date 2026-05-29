const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
// In production, this should be a 32-byte hex string set in the environment
const ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

// Note: If using the fallback random string, backups created in one server session 
// cannot be decrypted in another unless the key is persisted in .env

/**
 * Encrypts a string (e.g., JSON stringified notes)
 * @param {string} text - The text to encrypt
 * @returns {string} - Base64 encoded payload containing iv, auth tag, and encrypted data
 */
const encrypt = (text) => {
  const iv = crypto.randomBytes(12); // GCM standard IV length is 12 bytes
  // Ensure the key is 32 bytes (256 bits)
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  if (key.length !== 32) {
    throw new Error('Invalid BACKUP_ENCRYPTION_KEY length. Must be exactly 32 bytes (64 hex characters).');
  }

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  // Pack IV, AuthTag, and Encrypted Data together
  return JSON.stringify({
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    data: encrypted
  });
};

/**
 * Decrypts a previously encrypted payload
 * @param {string} encryptedPayload - The JSON stringified payload containing iv, auth tag, and encrypted data
 * @returns {string} - Decrypted text
 */
const decrypt = (encryptedPayload) => {
  try {
    const { iv, authTag, data } = JSON.parse(encryptedPayload);
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    
    if (key.length !== 32) {
      throw new Error('Invalid BACKUP_ENCRYPTION_KEY length. Must be exactly 32 bytes (64 hex characters).');
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));
    
    let decrypted = decipher.update(data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error.message);
    throw new Error('Decryption failed. The encryption key may be incorrect or the data corrupted.');
  }
};

module.exports = {
  encrypt,
  decrypt,
  generateKey: () => crypto.randomBytes(32).toString('hex')
};
