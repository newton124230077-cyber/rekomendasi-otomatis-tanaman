const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== DATABASE SIMULASI ====================
// Catatan: ini masih database sementara.
// Kalau server restart, data user dan history akan hilang.
const users = [];
const analysisHistory = [];

// Secret key JWT
// Kalau nanti mau lebih aman, masukkan JWT_SECRET ke Railway Variables.
const JWT_SECRET = process.env.JWT_SECRET || "login2026_secret_key_sistem_tanaman";

// ==================== ROUTE UTAMA UNTUK CEK BACKEND ====================
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Backend rekomendasi tanaman berhasil jalan",
        status: "online",
        endpoints: {
            health: "/api/health",
            crops: "/api/crops",
            register: "/api/auth/register",
            login: "/api/auth/login",
            profile: "/api/auth/me",
            analyze: "/api/analyze",
            history: "/api/history"
        }
    });
});

// ==================== FUNGSI PEMBANTU ====================
const generateToken = (userId, email, name) => {
    return jwt.sign(
        { id: userId, email, name },
        JWT_SECRET,
        { expiresIn: "7d" }
    );
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Token tidak ditemukan"
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: "Token tidak valid"
            });
        }

        req.user = user;
        next();
    });
};

// ==================== FUNGSI ANALISIS KESESUAIAN LAHAN ====================
const analyzeSuitability = (elevation, slope, rainfall, temperature, soilType) => {
    elevation = Number(elevation);
    slope = Number(slope);
    rainfall = Number(rainfall);
    temperature = Number(temperature);

    // Skor untuk PADI
    let padiScore = 0;

    if (elevation >= 0 && elevation <= 200) padiScore += 30;
    else if (elevation > 200 && elevation <= 650) padiScore += 20;
    else if (elevation > 650) padiScore += 5;

    if (slope >= 0 && slope <= 3) padiScore += 25;
    else if (slope > 3 && slope <= 8) padiScore += 20;
    else if (slope > 8 && slope <= 15) padiScore += 10;

    if (rainfall >= 2000 && rainfall <= 3000) padiScore += 25;
    else if (rainfall >= 1500 && rainfall < 2000) padiScore += 15;
    else if (rainfall > 3000 && rainfall <= 3500) padiScore += 10;

    if (temperature >= 25 && temperature <= 30) padiScore += 20;
    else if (temperature >= 22 && temperature < 25) padiScore += 15;
    else if (temperature > 30 && temperature <= 32) padiScore += 10;

    // Skor untuk JAGUNG
    let jagungScore = 0;

    if (elevation >= 0 && elevation <= 400) jagungScore += 30;
    else if (elevation > 400 && elevation <= 800) jagungScore += 20;
    else if (elevation > 800 && elevation <= 1200) jagungScore += 10;

    if (slope >= 0 && slope <= 8) jagungScore += 25;
    else if (slope > 8 && slope <= 15) jagungScore += 15;
    else if (slope > 15 && slope <= 30) jagungScore += 5;

    if (rainfall >= 1500 && rainfall <= 2000) jagungScore += 25;
    else if (rainfall >= 1000 && rainfall < 1500) jagungScore += 15;
    else if (rainfall > 2000 && rainfall <= 2500) jagungScore += 10;

    if (temperature >= 23 && temperature <= 30) jagungScore += 20;
    else if (temperature >= 20 && temperature < 23) jagungScore += 15;
    else if (temperature > 30 && temperature <= 33) jagungScore += 10;

    // Skor untuk KOPI
    let kopiScore = 0;

    if (elevation >= 500 && elevation <= 800) kopiScore += 35;
    else if (elevation >= 400 && elevation < 500) kopiScore += 25;
    else if (elevation > 800 && elevation <= 1000) kopiScore += 15;

    if (slope >= 8 && slope <= 25) kopiScore += 25;
    else if (slope >= 3 && slope < 8) kopiScore += 15;
    else if (slope > 25 && slope <= 30) kopiScore += 10;

    if (rainfall >= 2000 && rainfall <= 2500) kopiScore += 25;
    else if (rainfall >= 1500 && rainfall < 2000) kopiScore += 15;
    else if (rainfall > 2500 && rainfall <= 3000) kopiScore += 10;

    if (temperature >= 22 && temperature <= 26) kopiScore += 15;
    else if (temperature >= 20 && temperature < 22) kopiScore += 10;
    else if (temperature > 26 && temperature <= 28) kopiScore += 5;

    const getClass = (score) => {
        if (score >= 80) {
            return {
                class: "S1",
                description: "Sangat Sesuai",
                color: "#28a745"
            };
        }

        if (score >= 60) {
            return {
                class: "S2",
                description: "Cukup Sesuai",
                color: "#ffc107"
            };
        }

        if (score >= 40) {
            return {
                class: "S3",
                description: "Sesuai Marginal",
                color: "#fd7e14"
            };
        }

        return {
            class: "N",
            description: "Tidak Sesuai",
            color: "#dc3545"
        };
    };

    return {
        padi: {
            key: "padi",
            name: "Padi Sawah",
            score: padiScore,
            ...getClass(padiScore)
        },
        jagung: {
            key: "jagung",
            name: "Jagung",
            score: jagungScore,
            ...getClass(jagungScore)
        },
        kopi: {
            key: "kopi",
            name: "Kopi Robusta",
            score: kopiScore,
            ...getClass(kopiScore)
        }
    };
};

// ==================== API ENDPOINTS ====================

// HEALTH CHECK
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        status: "OK",
        message: "Sistem Cerdas Rekomendasi Tanaman Berbasis Informasi Geospasial",
        version: "1.0.0"
    });
});

// REGISTER
app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Semua field harus diisi"
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Password tidak cocok"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password minimal 6 karakter"
            });
        }

        const existingUser = users.find((user) => user.email === email);

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Email sudah terdaftar"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            id: users.length + 1,
            name,
            email,
            password: hashedPassword,
            createdAt: new Date()
        };

        users.push(newUser);

        const token = generateToken(newUser.id, newUser.email, newUser.name);

        res.json({
            success: true,
            message: "Registrasi berhasil",
            data: {
                user: {
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email
                },
                token
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// LOGIN
app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email dan password harus diisi"
            });
        }

        const user = users.find((user) => user.email === email);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Email atau password salah"
            });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: "Email atau password salah"
            });
        }

        const token = generateToken(user.id, user.email, user.name);

        res.json({
            success: true,
            message: "Login berhasil",
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                },
                token
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET PROFILE USER LOGIN
app.get("/api/auth/me", authenticateToken, (req, res) => {
    const user = users.find((user) => user.id === req.user.id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User tidak ditemukan"
        });
    }

    res.json({
        success: true,
        data: {
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        }
    });
});

// ANALISIS LAHAN
app.post("/api/analyze", authenticateToken, (req, res) => {
    try {
        const {
            elevation,
            slope,
            rainfall,
            temperature,
            soilType,
            locationName
        } = req.body;

        if (
            elevation === undefined ||
            slope === undefined ||
            rainfall === undefined ||
            temperature === undefined ||
            !soilType
        ) {
            return res.status(400).json({
                success: false,
                message: "Harap lengkapi semua data geospasial"
            });
        }

        const numberElevation = Number(elevation);
        const numberSlope = Number(slope);
        const numberRainfall = Number(rainfall);
        const numberTemperature = Number(temperature);

        if (
            Number.isNaN(numberElevation) ||
            Number.isNaN(numberSlope) ||
            Number.isNaN(numberRainfall) ||
            Number.isNaN(numberTemperature)
        ) {
            return res.status(400).json({
                success: false,
                message: "Data angka tidak valid"
            });
        }

        const results = analyzeSuitability(
            numberElevation,
            numberSlope,
            numberRainfall,
            numberTemperature,
            soilType
        );

        const crops = [results.padi, results.jagung, results.kopi];

        const bestCrop = crops.reduce((best, current) => {
            return current.score > best.score ? current : best;
        });

        let summary = `Berdasarkan analisis data geospasial `;
        summary += `(Ketinggian: ${numberElevation} m, Kemiringan: ${numberSlope}°, `;
        summary += `Curah Hujan: ${numberRainfall} mm/tahun, Suhu: ${numberTemperature}°C, `;
        summary += `Jenis Tanah: ${soilType}), `;
        summary += `maka rekomendasi terbaik adalah ${bestCrop.name} `;
        summary += `dengan skor kesesuaian ${bestCrop.score}/100 `;
        summary += `dan termasuk kategori ${bestCrop.description}.`;

        const analysisRecord = {
            id: analysisHistory.length + 1,
            userId: req.user.id,
            locationName: locationName || "Lokasi Tidak Diketahui",
            inputData: {
                elevation: numberElevation,
                slope: numberSlope,
                rainfall: numberRainfall,
                temperature: numberTemperature,
                soilType
            },
            results,
            bestCrop,
            summary,
            timestamp: new Date()
        };

        analysisHistory.push(analysisRecord);

        res.json({
            success: true,
            message: "Analisis berhasil",
            data: {
                analysisId: analysisRecord.id,
                locationName: analysisRecord.locationName,
                inputData: analysisRecord.inputData,
                results,
                bestCrop,
                summary,
                timestamp: analysisRecord.timestamp
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET HISTORY USER LOGIN
app.get("/api/history", authenticateToken, (req, res) => {
    const userHistory = analysisHistory.filter((history) => {
        return history.userId === req.user.id;
    });

    res.json({
        success: true,
        count: userHistory.length,
        data: userHistory
    });
});

// GET ALL CROPS
app.get("/api/crops", (req, res) => {
    res.json({
        success: true,
        data: [
            {
                key: "padi",
                name: "Padi Sawah",
                scientificName: "Oryza sativa"
            },
            {
                key: "jagung",
                name: "Jagung",
                scientificName: "Zea mays"
            },
            {
                key: "kopi",
                name: "Kopi Robusta",
                scientificName: "Coffea canephora"
            }
        ]
    });
});

// ==================== ROUTE TIDAK DITEMUKAN ====================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Endpoint tidak ditemukan",
        path: req.originalUrl,
        availableEndpoints: {
            root: "/",
            health: "/api/health",
            crops: "/api/crops",
            register: "/api/auth/register",
            login: "/api/auth/login",
            profile: "/api/auth/me",
            analyze: "/api/analyze",
            history: "/api/history"
        }
    });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5500;

app.listen(PORT, "0.0.0.0", () => {
    console.log("\n========================================");
    console.log("🚀 SERVER BERHASIL DIJALANKAN!");
    console.log("========================================");
    console.log(`📱 Backend berjalan di port: ${PORT}`);
    console.log("🔗 Root Endpoint: /");
    console.log("💚 Health Check: /api/health");
    console.log("🔑 API Login: /api/auth/login");
    console.log("📝 API Register: /api/auth/register");
    console.log("🌾 API Analysis: /api/analyze");
    console.log("========================================\n");
});
