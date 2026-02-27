import prisma from "../../../core/config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { writeAuditLog } from "../../../platform/audit/audit.helper.js";
import logger from "../../../core/utils/logger.js";

/**
 * Register Global Platform Management Staff (Superadmin level)
 */
export const registerPlatformStaff = async (req, res) => {
    try {
        const { email, password, name, roleId } = req.body;
        const actorUserId = req.user.id;
        const actorType = req.user.type;
        const actorPower = parseInt(req.user.power || "0");

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }
        const role = await prisma.platformRole.findUnique({ where: { id: roleId } });
        if (!role) {
            return res.status(404).json({ success: false, message: "Role not found" });
        }
        // 1. Power Level Validation: Creator must have power level >= target power
        const targetPower = parseInt(role.power);
        if (actorType !== "SUPER_ADMIN" && actorPower <= targetPower) {
            return res.status(403).json({
                success: false,
                message: `Insufficient power level. Your power (${actorPower}) is lower than the target power (${targetPower}).`
            });
        }

        const existing = await prisma.platformStaff.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ success: false, message: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const staff = await prisma.platformStaff.create({
            data: {
                email,
                password: hashedPassword,
                name,
                roleId,
                power: targetPower,
                isActive: true
            },
            include: { role: true }
        });


        await writeAuditLog({
            actorType: actorType === "SUPER_ADMIN" ? "SUPER_ADMIN" : "PLATFORM_MANAGEMENT",
            [actorType === "SUPER_ADMIN" ? "superAdminId" : "platformManagementId"]: actorUserId,
            action: "PLATFORM_MANAGEMENT_CREATED",
            entity: "PLATFORM_MANAGEMENT",
            entityId: staff.id,
            meta: { name: staff.name, email: staff.email, roleId, power: targetPower },
            req,
        });

        res.status(201).json({
            success: true,
            message: "Platform  Management Staff created successfully",
            staff: {
                id: staff.id,
                name: staff.name,
                email: staff.email,
                role: staff.role,
                power: staff.power
            }
        });
    } catch (error) {
        logger.error("Register Platform Management Error:", error);
        res.status(500).json({ success: false, message: "Failed to create platform management staff" });
    }
};

/**
 * List Global Platform Management Staff
 */
export const listPlatformStaff = async (req, res) => {
    try {
        const staff = await prisma.platformStaff.findMany({
            include: {
                role: {
                    select: { id: true, name: true, power: true }
                }
            },
            orderBy: { createdAt: "desc" },
        });

        res.json({
            success: true,
            staff,
        });
    } catch (error) {
        logger.error("List Platform Management Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch platform management staff" });
    }
};

/**
 * Update Global Platform Staff
 */
export const updatePlatformStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, isActive, password, roleId, power } = req.body;
        const actorUserId = req.user.id;
        const actorType = req.user.type;

        const staff = await prisma.platformStaff.findUnique({
            where: { id }
        });

        if (!staff) {
            return res.status(404).json({ success: false, message: "Platform management staff not found" });
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }
        if (roleId !== undefined) updateData.roleId = roleId;
        if (power !== undefined) updateData.power = parseInt(power);

        const updatedStaff = await prisma.platformStaff.update({
            where: { id },
            data: updateData,
            include: { role: true }
        });

        await writeAuditLog({
            actorType: actorType === "SUPER_ADMIN" ? "SUPER_ADMIN" : "PLATFORM_MANAGEMENT",
            [actorType === "SUPER_ADMIN" ? "superAdminId" : "platformManagementId"]: actorUserId,
            action: "PLATFORM_MANAGEMENT_UPDATED",
            entity: "PLATFORM_MANAGEMENT",
            entityId: id,
            meta: { updates: Object.keys(updateData) },
            req,
        });

        res.json({ success: true, message: "Platform management staff updated", staff: updatedStaff });

    } catch (error) {
        logger.error("Update Platform Management Error:", error);
        res.status(500).json({ success: false, message: "Failed to update platform management staff" });
    }
}

/**
 * Delete Global Platform Staff
 */
export const deletePlatformStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const actorUserId = req.user.id;
        const actorType = req.user.type;

        const staff = await prisma.platformStaff.findUnique({
            where: { id }
        });

        if (!staff) {
            return res.status(404).json({ success: false, message: "Platform management staff not found" });
        }

        await prisma.platformStaff.delete({
            where: { id }
        });

        await writeAuditLog({
            actorType: actorType === "SUPER_ADMIN" ? "SUPER_ADMIN" : "PLATFORM_MANAGEMENT",
            [actorType === "SUPER_ADMIN" ? "superAdminId" : "platformManagementId"]: actorUserId,
            action: "PLATFORM_MANAGEMENT_DELETED",
            entity: "PLATFORM_MANAGEMENT",
            entityId: id,
            req,
        });

        res.json({ success: true, message: "Platform management staff deleted successfully" });

    } catch (error) {
        logger.error("Delete Platform Management Error:", error);
        res.status(500).json({ success: false, message: "Failed to delete platform management staff" });
    }
}

/**
 * Login Global Platform Staff
 */
export const loginPlatformStaff = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        const staff = await prisma.platformStaff.findUnique({
            where: { email },
            include: { role: true }
        });

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
                email: staff.email,
                role: staff.role?.name || "STAFF",
                roleId: staff.roleId,
                type: "PLATFORM_STAFF",
                power: staff.power
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
            message: "Platform Management Staff login successful",
            token,
            user: {
                id: staff.id,
                email: staff.email,
                name: staff.name,
                role: staff.role,
                power: staff.power,
                roleId: staff.roleId,
                type: "PLATFORM_STAFF"
            }
        });

    } catch (error) {
        logger.error("Platform Management Login Error:", error);
        res.status(500).json({ success: false, message: "Login failed" });
    }
};

