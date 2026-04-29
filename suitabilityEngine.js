/**
 * Suitability Engine for Plant Recommendation System
 * Based on FAO land suitability classification
 */

// Crop requirements based on literature
const cropRequirements = {
    padi: {
        name: 'Padi Sawah',
        scientificName: 'Oryza sativa',
        parameters: {
            elevation: {
                min: 0,
                max: 650,
                optimal: [0, 200],
                weights: {
                    S1: [0, 100],    // Very Suitable
                    S2: [100, 300],  // Moderately Suitable
                    S3: [300, 650],  // Marginally Suitable
                    N: [650, Infinity] // Not Suitable
                }
            },
            slope: {
                min: 0,
                max: 15,
                optimal: [0, 3],
                weights: {
                    S1: [0, 3],
                    S2: [3, 8],
                    S3: [8, 15],
                    N: [15, Infinity]
                }
            },
            rainfall: {
                min: 1500,
                max: 3500,
                optimal: [2000, 3000],
                weights: {
                    S1: [2000, 3000],
                    S2: [1500, 2000],
                    S3: [3000, 3500],
                    N: [0, 1500]
                }
            },
            temperature: {
                min: 22,
                max: 32,
                optimal: [25, 30],
                weights: {
                    S1: [25, 30],
                    S2: [22, 25],
                    S3: [30, 32],
                    N: [0, 22]
                }
            },
            soilType: {
                suitable: ['Alluvial', 'Latosol', 'Regosol', 'Gleysol', 'Andosol'],
                moderately: ['Podzolik', 'Grumusol'],
                notSuitable: ['Ultisol', 'Oxisol', 'Aridisol']
            }
        },
        parameterWeights: {
            elevation: 0.20,
            slope: 0.20,
            rainfall: 0.25,
            temperature: 0.20,
            soilType: 0.15
        }
    },
    jagung: {
        name: 'Jagung',
        scientificName: 'Zea mays',
        parameters: {
            elevation: {
                min: 0,
                max: 1200,
                optimal: [0, 600],
                weights: {
                    S1: [0, 400],
                    S2: [400, 800],
                    S3: [800, 1200],
                    N: [1200, Infinity]
                }
            },
            slope: {
                min: 0,
                max: 30,
                optimal: [0, 8],
                weights: {
                    S1: [0, 8],
                    S2: [8, 15],
                    S3: [15, 30],
                    N: [30, Infinity]
                }
            },
            rainfall: {
                min: 1000,
                max: 2500,
                optimal: [1500, 2000],
                weights: {
                    S1: [1500, 2000],
                    S2: [1000, 1500],
                    S3: [2000, 2500],
                    N: [0, 1000]
                }
            },
            temperature: {
                min: 20,
                max: 33,
                optimal: [23, 30],
                weights: {
                    S1: [23, 30],
                    S2: [20, 23],
                    S3: [30, 33],
                    N: [0, 20]
                }
            },
            soilType: {
                suitable: ['Andosol', 'Latosol', 'Regosol', 'Alluvial'],
                moderately: ['Podzolik', 'Grumusol', 'Ultisol'],
                notSuitable: ['Oxisol', 'Aridisol']
            }
        },
        parameterWeights: {
            elevation: 0.15,
            slope: 0.20,
            rainfall: 0.25,
            temperature: 0.20,
            soilType: 0.20
        }
    },
    kopi: {
        name: 'Kopi Robusta',
        scientificName: 'Coffea canephora',
        parameters: {
            elevation: {
                min: 400,
                max: 1000,
                optimal: [500, 800],
                weights: {
                    S1: [500, 800],
                    S2: [400, 500],
                    S3: [800, 1000],
                    N: [0, 400]
                }
            },
            slope: {
                min: 3,
                max: 30,
                optimal: [8, 25],
                weights: {
                    S1: [8, 25],
                    S2: [3, 8],
                    S3: [25, 30],
                    N: [0, 3]
                }
            },
            rainfall: {
                min: 1500,
                max: 3000,
                optimal: [2000, 2500],
                weights: {
                    S1: [2000, 2500],
                    S2: [1500, 2000],
                    S3: [2500, 3000],
                    N: [0, 1500]
                }
            },
            temperature: {
                min: 18,
                max: 28,
                optimal: [22, 26],
                weights: {
                    S1: [22, 26],
                    S2: [20, 22],
                    S3: [26, 28],
                    N: [0, 18]
                }
            },
            soilType: {
                suitable: ['Andosol', 'Latosol', 'Regosol', 'Ultisol'],
                moderately: ['Podzolik', 'Alluvial'],
                notSuitable: ['Oxisol', 'Gleysol', 'Aridisol']
            }
        },
        parameterWeights: {
            elevation: 0.25,
            slope: 0.20,
            rainfall: 0.25,
            temperature: 0.20,
            soilType: 0.10
        }
    }
};

// Get suitability class for a numeric parameter
const getSuitabilityClass = (value, weights) => {
    if (value >= weights.S1[0] && value <= weights.S1[1]) return 'S1';
    if (value >= weights.S2[0] && value <= weights.S2[1]) return 'S2';
    if (value >= weights.S3[0] && value <= weights.S3[1]) return 'S3';
    return 'N';
};

// Get score for a parameter based on suitability class
const getParameterScore = (suitabilityClass) => {
    const scores = {
        'S1': 100,  // Very Suitable
        'S2': 70,   // Moderately Suitable
        'S3': 40,   // Marginally Suitable
        'N': 0      // Not Suitable
    };
    return scores[suitabilityClass] || 0;
};

// Check soil type suitability
const checkSoilSuitability = (soilType, cropData) => {
    const soilParams = cropData.parameters.soilType;
    
    if (soilParams.suitable.includes(soilType)) return 'S1';
    if (soilParams.moderately.includes(soilType)) return 'S2';
    if (soilParams.notSuitable.includes(soilType)) return 'N';
    return 'S3'; // Unknown soil type treated as marginally suitable
};

// Calculate overall suitability for a single crop
const calculateCropSuitability = (cropKey, parameters) => {
    const crop = cropRequirements[cropKey];
    if (!crop) return null;

    const results = {};
    let totalScore = 0;
    let totalWeight = 0;

    // Evaluate each parameter
    for (const [param, value] of Object.entries(parameters)) {
        if (crop.parameters[param] && value !== undefined && value !== null) {
            let suitabilityClass;
            
            if (param === 'soilType') {
                suitabilityClass = checkSoilSuitability(value, crop);
            } else {
                const paramConfig = crop.parameters[param];
                if (typeof value === 'number') {
                    suitabilityClass = getSuitabilityClass(value, paramConfig.weights);
                } else {
                    suitabilityClass = 'S3';
                }
            }
            
            const score = getParameterScore(suitabilityClass);
            const weight = crop.parameterWeights[param];
            
            results[param] = {
                value,
                suitabilityClass,
                score,
                weight
            };
            
            totalScore += score * weight;
            totalWeight += weight;
        }
    }

    // Calculate final score (0-100)
    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    
    // Determine final suitability class
    let finalClass;
    if (finalScore >= 80) finalClass = 'S1';
    else if (finalScore >= 60) finalClass = 'S2';
    else if (finalScore >= 35) finalClass = 'S3';
    else finalClass = 'N';
    
    // Get class description
    const classDescriptions = {
        'S1': 'Sangat Sesuai (Very Suitable)',
        'S2': 'Cukup Sesuai (Moderately Suitable)',
        'S3': 'Sesuai Marginal (Marginally Suitable)',
        'N': 'Tidak Sesuai (Not Suitable)'
    };
    
    return {
        cropName: crop.name,
        cropKey,
        scientificName: crop.scientificName,
        finalScore: Math.round(finalScore),
        finalClass,
        classDescription: classDescriptions[finalClass],
        parameters: results,
        recommendation: finalClass === 'S1' ? 'Sangat direkomendasikan untuk ditanam' :
                      finalClass === 'S2' ? 'Cukup direkomendasikan dengan beberapa perbaikan' :
                      finalClass === 'S3' ? 'Dapat ditanam dengan pengelolaan intensif' :
                      'Tidak direkomendasikan untuk ditanam'
    };
};

// Main function to analyze all crops
const analyzeSuitability = (geospatialData) => {
    const {
        elevation,    // meters above sea level
        slope,        // degrees
        rainfall,     // mm/year
        temperature,  // celsius
        soilType      // soil type name
    } = geospatialData;
    
    // Validate input
    const requiredParams = ['elevation', 'slope', 'rainfall', 'temperature', 'soilType'];
    const missingParams = requiredParams.filter(param => geospatialData[param] === undefined || geospatialData[param] === null);
    
    if (missingParams.length > 0) {
        return {
            success: false,
            message: `Missing required parameters: ${missingParams.join(', ')}`
        };
    }
    
    const parameters = { elevation, slope, rainfall, temperature, soilType };
    
    // Calculate for each crop
    const results = {};
    for (const crop of Object.keys(cropRequirements)) {
        results[crop] = calculateCropSuitability(crop, parameters);
    }
    
    // Generate recommendations sorted by score
    const recommendations = Object.values(results)
        .sort((a, b) => b.finalScore - a.finalScore);
    
    const bestCrop = recommendations[0];
    
    return {
        success: true,
        timestamp: new Date().toISOString(),
        inputData: parameters,
        results,
        recommendations,
        bestCrop: {
            name: bestCrop.cropName,
            score: bestCrop.finalScore,
            class: bestCrop.finalClass,
            description: bestCrop.classDescription
        },
        summary: generateSummary(results, parameters)
    };
};

// Generate summary text
const generateSummary = (results, parameters) => {
    const suitableCrops = Object.values(results).filter(r => r.finalClass === 'S1');
    const moderatelySuitable = Object.values(results).filter(r => r.finalClass === 'S2');
    
    let summary = `Berdasarkan analisis data geospasial dengan ketinggian ${parameters.elevation} m, `;
    summary += `kemiringan ${parameters.slope}°, curah hujan ${parameters.rainfall} mm/tahun, `;
    summary += `suhu ${parameters.temperature}°C, dan jenis tanah ${parameters.soilType}, `;
    
    if (suitableCrops.length > 0) {
        summary += `lahan ini SANGAT SESUAI untuk tanaman ${suitableCrops.map(c => c.cropName).join(', ')}. `;
    }
    
    if (moderatelySuitable.length > 0) {
        summary += `Lahan ini CUKUP SESUAI untuk tanaman ${moderatelySuitable.map(c => c.cropName).join(', ')}. `;
    }
    
    summary += `Rekomendasi terbaik adalah ${results[Object.keys(results).sort((a,b) => results[b].finalScore - results[a].finalScore)[0]].cropName}.`;
    
    return summary;
};

// Get crop information
const getCropInfo = (cropKey) => {
    return cropRequirements[cropKey] || null;
};

// Get all crops
const getAllCrops = () => {
    return Object.keys(cropRequirements).map(key => ({
        key,
        name: cropRequirements[key].name,
        scientificName: cropRequirements[key].scientificName
    }));
};

module.exports = {
    analyzeSuitability,
    getCropInfo,
    getAllCrops,
    cropRequirements
};