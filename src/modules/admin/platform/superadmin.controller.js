import prisma from "../../../core/config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";


/**
 * Create a new Super Admin (Authenticated)
 */
export const createSuperAdmin = async (req, res) => {
    try {
        const { email, password, name, role } = req.body;


        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        const existing = await prisma.superAdmin.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ success: false, message: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newAdmin = await prisma.superAdmin.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: role || "SUPER_ADMIN",
            },
        });
        // Audit
        // assuming writeAuditLog handles SUPER_ADMIN actor correctly
        // If writeAuditLog is not available or path is wrong, I'll fix it later. 
        // Usually it accepts { actorType: 'SUPER_ADMIN', superAdminId: ... }

        res.status(201).json({
            success: true,
            message: "Super Admin created successfully",
            data: {
                id: newAdmin.id,
                email: newAdmin.email,
                name: newAdmin.name,
                role: newAdmin.role
            }
        });

    } catch (error) {
        console.error("Create SuperAdmin Error:", error);
        res.status(500).json({ success: false, message: "Failed to create super admin" });
    }
};

/**
 * List all Super Admins
 */
export const listSuperAdmins = async (req, res) => {
    try {
        const admins = await prisma.superAdmin.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
        });

        res.json({
            success: true,
            admins,
        });
    } catch (error) {
        console.error("List SuperAdmins Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch super admins" });
    }
};

/**
 * Super Admin Login
 */
export const loginSuperAdmin = async (req, res) => {

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        const user = await prisma.superAdmin.findUnique({ where: { email } });

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }


        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        // Generate Token
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role,
                type: "SUPER_ADMIN"
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" } // or your config
        );


        // Set Cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: true,        // HTTP allowed
            sameSite: "none",      // ✅ REQUIRED
            maxAge: 24 * 60 * 60 * 1000,
            path: "/",            // good practice
        });

        res.json({
            success: true,
            message: "Login successful",
            token, // Token included for cross-IP dev capability
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            }
        });

    } catch (error) {
        console.error("Super Admin Login Error:", error);
        res.status(500).json({ success: false, message: "Login failed" });
    }
};

/**
 * Update Super Admin
 */
export const updateSuperAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, role, password } = req.body;

        // Prevent self-deactivation if wanted, or handle gracefully
        // if (id === req.user.id && isActive === false) ...

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (role !== undefined) updateData.role = role;
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const updatedAdmin = await prisma.superAdmin.update({
            where: { id },
            data: updateData,
        });

        res.json({
            success: true,
            message: "Super Admin updated",
            admin: {
                id: updatedAdmin.id,
                email: updatedAdmin.email,
                name: updatedAdmin.name,
                role: updatedAdmin.role,
            }
        });

    } catch (error) {
        console.error("Update SuperAdmin Error:", error);
        res.status(500).json({ success: false, message: "Failed to update super admin" });
    }
};

/**
 * Delete Super Admin
 */
export const deleteSuperAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        if (id === req.user.id) {
            return res.status(400).json({ success: false, message: "Cannot delete yourself" });
        }

        await prisma.superAdmin.delete({
            where: { id }
        });

        res.json({ success: true, message: "Super Admin deleted successfully" });
    } catch (error) {
        console.error("Delete SuperAdmin Error:", error);
        res.status(500).json({ success: false, message: "Failed to delete super admin" });
    }
}
