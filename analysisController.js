const suitabilityEngine = require('../utils/suitabilityEngine');

// Store analysis history (in production, use database)
const analysisHistory = [];

// Analyze land suitability based on geospatial data
const analyzeLand = async (req, res) => {
    try {
        const {
            elevation,
            slope,
            rainfall,
            temperature,
            soilType,
            locationName,
            coordinates
        } = req.body;

        // Validate required fields
        if (elevation === undefined || slope === undefined || 
            rainfall === undefined || temperature === undefined || !soilType) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters: elevation, slope, rainfall, temperature, soilType'
            });
        }

        // Validate numeric ranges
        if (elevation < 0 || elevation > 5000) {
            return res.status(400).json({
                success: false,
                message: 'Elevation must be between 0 and 5000 meters'
            });
        }

        if (slope < 0 || slope > 90) {
            return res.status(400).json({
                success: false,
                message: 'Slope must be between 0 and 90 degrees'
            });
        }

        if (rainfall < 0 || rainfall > 5000) {
            return res.status(400).json({
                success: false,
                message: 'Rainfall must be between 0 and 5000 mm/year'
            });
        }

        if (temperature < -10 || temperature > 50) {
            return res.status(400).json({
                success: false,
                message: 'Temperature must be between -10 and 50 degrees Celsius'
            });
        }

        // Perform analysis
        const analysisResult = suitabilityEngine.analyzeSuitability({
            elevation: parseFloat(elevation),
            slope: parseFloat(slope),
            rainfall: parseFloat(rainfall),
            temperature: parseFloat(temperature),
            soilType: soilType
        });

        if (!analysisResult.success) {
            return res.status(400).json(analysisResult);
        }

        // Save to history if user is authenticated
        const analysisRecord = {
            id: analysisHistory.length + 1,
            userId: req.user?.id || null,
            locationName: locationName || 'Unknown Location',
            coordinates: coordinates || null,
            inputData: analysisResult.inputData,
            results: analysisResult.results,
            bestCrop: analysisResult.bestCrop,
            summary: analysisResult.summary,
            timestamp: analysisResult.timestamp
        };
        
        analysisHistory.push(analysisRecord);

        res.status(200).json({
            success: true,
            message: 'Analysis completed successfully',
            data: {
                analysisId: analysisRecord.id,
                inputData: analysisResult.inputData,
                results: analysisResult.results,
                recommendations: analysisResult.recommendations,
                bestCrop: analysisResult.bestCrop,
                summary: analysisResult.summary,
                timestamp: analysisResult.timestamp
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Analysis failed',
            error: error.message
        });
    }
};

// Get analysis by ID
const getAnalysisById = async (req, res) => {
    try {
        const { id } = req.params;
        const analysis = analysisHistory.find(a => a.id === parseInt(id));
        
        if (!analysis) {
            return res.status(404).json({
                success: false,
                message: 'Analysis not found'
            });
        }
        
        // Check authorization (only owner or admin can view)
        if (analysis.userId && req.user && (req.user.id !== analysis.userId && req.user.role !== 'admin')) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        res.status(200).json({
            success: true,
            data: analysis
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve analysis',
            error: error.message
        });
    }
};

// Get user's analysis history
const getUserHistory = async (req, res) => {
    try {
        const userAnalyses = analysisHistory.filter(a => a.userId === req.user.id);
        
        res.status(200).json({
            success: true,
            count: userAnalyses.length,
            data: userAnalyses
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve history',
            error: error.message
        });
    }
};

// Get all crops information
const getAllCrops = async (req, res) => {
    try {
        const crops = suitabilityEngine.getAllCrops();
        res.status(200).json({
            success: true,
            count: crops.length,
            data: crops
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve crops data',
            error: error.message
        });
    }
};

// Get specific crop information
const getCropInfo = async (req, res) => {
    try {
        const { cropKey } = req.params;
        const crop = suitabilityEngine.getCropInfo(cropKey);
        
        if (!crop) {
            return res.status(404).json({
                success: false,
                message: `Crop '${cropKey}' not found`
            });
        }
        
        res.status(200).json({
            success: true,
            data: {
                key: cropKey,
                name: crop.name,
                scientificName: crop.scientificName,
                parameters: crop.parameters,
                parameterWeights: crop.parameterWeights
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve crop information',
            error: error.message
        });
    }
};

// Batch analysis for multiple locations
const batchAnalyze = async (req, res) => {
    try {
        const { locations } = req.body;
        
        if (!locations || !Array.isArray(locations) || locations.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of locations to analyze'
            });
        }
        
        const results = [];
        for (const location of locations) {
            const analysis = suitabilityEngine.analyzeSuitability({
                elevation: location.elevation,
                slope: location.slope,
                rainfall: location.rainfall,
                temperature: location.temperature,
                soilType: location.soilType
            });
            
            results.push({
                locationName: location.locationName,
                coordinates: location.coordinates,
                analysis
            });
        }
        
        res.status(200).json({
            success: true,
            count: results.length,
            data: results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Batch analysis failed',
            error: error.message
        });
    }
};

// Export analysis report
const exportReport = async (req, res) => {
    try {
        const { analysisId } = req.params;
        const analysis = analysisHistory.find(a => a.id === parseInt(analysisId));
        
        if (!analysis) {
            return res.status(404).json({
                success: false,
                message: 'Analysis not found'
            });
        }
        
        // Create report object
        const report = {
            reportTitle: 'Laporan Analisis Kesesuaian Lahan',
            generatedAt: new Date().toISOString(),
            analysisDetails: analysis,
            systemInfo: {
                name: 'Sistem Cerdas Rekomendasi Tanaman Berbasis Informasi Geospasial',
                version: '1.0.0',
                institution: 'Institut Teknologi Sumatera'
            }
        };
        
        res.status(200).json({
            success: true,
            message: 'Report generated successfully',
            data: report
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to generate report',
            error: error.message
        });
    }
};

module.exports = {
    analyzeLand,
    getAnalysisById,
    getUserHistory,
    getAllCrops,
    getCropInfo,
    batchAnalyze,
    exportReport
};