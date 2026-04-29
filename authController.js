const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Simulasi database (sementara)
const users = [];

// Generate token
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        process.env.JWT_SECRET || "secret123",
        {
            expiresIn: process.env.JWT_EXPIRE || "1d"
        }
    );
};

// ================= REGISTER =================
exports.register = async (req, res) => {
    try {
        const { name, email, password, confirmPassword, role } = req.body;

        // Validasi input
        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Semua field wajib diisi"
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

        // Cek user sudah ada
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Email sudah terdaftar"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Buat user baru (TANPA UUID)
        const newUser = {
            id: users.length + 1,
            name,
            email,
            password: hashedPassword,
            role: role || "user"
        };

        users.push(newUser);

        // Token
        const token = generateToken(newUser);

        res.status(201).json({
            success: true,
            message: "Register berhasil",
            data: {
                user: {
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role
                },
                token
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Register gagal",
            error: error.message
        });
    }
};

// ================= LOGIN =================
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email dan password wajib diisi"
            });
        }

        const user = users.find(u => u.email === email);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Email atau password salah"
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Email atau password salah"
            });
        }

        const token = generateToken(user);

        res.status(200).json({
            success: true,
            message: "Login berhasil",
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                token
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Login gagal",
            error: error.message
        });
    }
};

// ================= GET PROFILE =================
exports.getMe = (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const user = users.find(u => u.id === req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User tidak ditemukan"
            });
        }

        res.status(200).json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Gagal ambil data user"
        });
    }
};

// ================= LOGOUT =================
exports.logout = (req, res) => {
    res.status(200).json({
        success: true,
        message: "Logout berhasil"
    });
};