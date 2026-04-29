const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const analysisController = require('../controller/analysisController');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Validation middleware
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    next();
};

// Analysis validation
const analysisValidation = [
    body('elevation').isFloat({ min: 0, max: 5000 }).withMessage('Elevation must be between 0 and 5000'),
    body('slope').isFloat({ min: 0, max: 90 }).withMessage('Slope must be between 0 and 90'),
    body('rainfall').isFloat({ min: 0, max: 5000 }).withMessage('Rainfall must be between 0 and 5000'),
    body('temperature').isFloat({ min: -10, max: 50 }).withMessage('Temperature must be between -10 and 50'),
    body('soilType').notEmpty().withMessage('Soil type is required')
];

// Batch analysis validation
const batchAnalysisValidation = [
    body('locations').isArray({ min: 1 }).withMessage('Locations must be a non-empty array')
];

// Routes
router.post('/analyze', optionalAuth, analysisValidation, validate, analysisController.analyzeLand);
router.get('/crops', analysisController.getAllCrops);
router.get('/crops/:cropKey', analysisController.getCropInfo);
router.get('/history', authenticate, analysisController.getUserHistory);
router.get('/:id', authenticate, analysisController.getAnalysisById);
router.post('/batch', optionalAuth, batchAnalysisValidation, validate, analysisController.batchAnalyze);
router.get('/export/:analysisId', authenticate, analysisController.exportReport);

module.exports = router;