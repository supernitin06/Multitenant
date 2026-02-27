import prisma from "../../../../core/config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { writeAuditLog } from "../../../../platform/audit/audit.helper.js";
import logger from "../../../../core/utils/logger.js";

/**
 * Register Tenant-Specific Staff
 */
export const registerTenantStaff = async (req, res) => {
    try {
        const { email, password, name, role_name } = req.body;
        const actorUserId = req.user.id;
        const tenantId = req.user.tenantId;
        const actorType = req.user.type;

        // Tenant Admin (TENANT type) has implicit power level 100
        const actorPower = actorType === "TENANT" ? 100 : parseInt(req.user.power || "0");

        if (!tenantId) {
            return res.status(400).json({ success: false, message: "Tenant context required" });
        }

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        // Fetch power level for the target role
        let targetPower = 0;
        if (role_name) {
            const level = await prisma.levelPower.findFirst({
                where: { role_name, tenantId }
            });
            if (level) {
                targetPower = parseInt(level.power || "0");
            }
        }

        // Power Level Validation: Creator power must be >= target role power
        if (actorType !== "TENANT" && actorPower < targetPower) {
            return res.status(403).json({
                success: false,
                message: `Insufficient power level. Your power (${actorPower}) is lower than the required power for role '${role_name}' (${targetPower}).`
            });
        }

        const existing = await prisma.tenantStaff.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ success: false, message: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const staff = await prisma.tenantStaff.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role_name,
                power: targetPower.toString(),
                tenantId,
                role: "STAFF"
            },
        });

        await writeAuditLog({
            actorType: actorType === "TENANT" ? "TENANT_ADMIN" : "TENANT_STAFF",
            [actorType === "TENANT" ? "userId" : "staffId"]: actorUserId,
            tenantId,
            action: "TENANT_STAFF_CREATED",
            entity: "TENANT_STAFF",
            entityId: staff.id,
            meta: { name: staff.name, email: staff.email, role_name, power: targetPower },
            req,
        });

        res.status(201).json({
            success: true,
            message: "Tenant Staff created successfully",
            staff: {
                id: staff.id,
                name: staff.name,
                email: staff.email,
                role_name: staff.role_name,
                power: staff.power
            }
        });
    } catch (error) {
        logger.error("Register Tenant Staff Error:", error);
        res.status(500).json({ success: false, message: "Failed to create tenant staff" });
    }
};

/**
 * List Tenant-Specific Staff
 */
export const listTenantStaff = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        if (!tenantId) {
            return res.status(400).json({ success: false, message: "Tenant context required" });
        }

        const staff = await prisma.tenantStaff.findMany({
            where: { tenantId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                role_name: true,
                power: true,
                isActive: true,
                lastLogin: true,
                createdAt: true
            },
            orderBy: { createdAt: "desc" },
        });

        res.json({
            success: true,
            staff,
        });
    } catch (error) {
        logger.error("List Tenant Staff Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch tenant staff" });
    }
};

/**
 * Update Tenant-Specific Staff
 */
export const updateTenantStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, isActive, password, role_name } = req.body;
        const tenantId = req.user.tenantId;
        const actorUserId = req.user.id;

        const staff = await prisma.tenantStaff.findFirst({
            where: { id, tenantId }
        });

        if (!staff) {
            return res.status(404).json({ success: false, message: "Tenant staff not found" });
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        if (role_name !== undefined) {
            updateData.role_name = role_name;
            const level = await prisma.levelPower.findFirst({
                where: { role_name, tenantId }
            });
            if (level) {
                updateData.power = level.power;
            }
        }

        const updatedStaff = await prisma.tenantStaff.update({
            where: { id },
            data: updateData
        });

        await writeAuditLog({
            actorType: "TENANT_USER",
            userId: actorUserId,
            tenantId,
            action: "TENANT_STAFF_UPDATED",
            entity: "TENANT_STAFF",
            entityId: id,
            meta: { updates: Object.keys(updateData) },
            req,
        });

        res.json({ success: true, message: "Tenant staff updated", staff: updatedStaff });

    } catch (error) {
        logger.error("Update Tenant Staff Error:", error);
        res.status(500).json({ success: false, message: "Failed to update tenant staff" });
    }
}

/**
 * Delete Tenant-Specific Staff
 */
export const deleteTenantStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;
        const actorUserId = req.user.id;

        const staff = await prisma.tenantStaff.findFirst({
            where: { id, tenantId }
        });

        if (!staff) {
            return res.status(404).json({ success: false, message: "Tenant staff not found" });
        }

        await prisma.tenantStaff.delete({
            where: { id }
        });

        await writeAuditLog({
            actorType: "TENANT_USER",
            userId: actorUserId,
            tenantId,
            action: "TENANT_STAFF_DELETED",
            entity: "TENANT_STAFF",
            entityId: id,
            req,
        });

        res.json({ success: true, message: "Tenant staff deleted successfully" });

    } catch (error) {
        logger.error("Delete Tenant Staff Error:", error);
        res.status(500).json({ success: false, message: "Failed to delete tenant staff" });
    }
}

/**
 * Login Tenant-Specific Staff
 */
export const loginTenantStaff = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        const staff = await prisma.tenantStaff.findUnique({ where: { email } });

        if (!staff) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        if (!staff.isActive) {
            return res.status(403).json({ success: false, message: "Account is disabled" });
        }

        const isMatch = await bcrypt.compare(password, staff.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const token = jwt.sign(
            {
                userId: staff.id,
                tenantId: staff.tenantId,
                email: staff.email,
                role: staff.role,
                type: "TENANT_STAFF"
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 24 * 60 * 60 * 1000,
        });

        res.json({
            success: true,
            message: "Tenant Staff login successful",
            user: {
                id: staff.id,
                tenantId: staff.tenantId,
                email: staff.email,
                name: staff.name,
                role: staff.role,
                role_name: staff.role_name,
                power: staff.power
            }
        });

    } catch (error) {
        logger.error("Tenant Staff Login Error:", error);
        res.status(500).json({ success: false, message: "Login failed" });
    }
};
