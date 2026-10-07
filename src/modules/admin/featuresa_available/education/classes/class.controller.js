import prisma from "../../../../../core/config/db.js";
import { writeAuditLog, auditActor } from "../../../../../platform/audit/audit.helper.js";

/**
 * Class management (e.g. "Class 10 – A – 2024-25") for school tenants.
 * Every query is scoped to req.user.tenantId.
 */

const classInclude = {
    _count: { select: { students: true, examinations: true, schedules: true } },
};

const clean = (v) => (typeof v === "string" ? v.trim() || null : v ?? null);

const pickClassData = (body) => {
    const data = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.section !== undefined) data.section = clean(body.section);
    if (body.academicYear !== undefined) data.academicYear = clean(body.academicYear);
    if (body.description !== undefined) data.description = clean(body.description);
    if (body.isActive !== undefined) data.isActive = body.isActive === true || body.isActive === "true";
    return data;
};

const duplicateMessage = (d) =>
    `Class "${[d.name, d.section, d.academicYear].filter(Boolean).join(" – ")}" already exists`;

/** GET /classes */
export const listClasses = async (req, res) => {
    try {
        const classes = await prisma.class.findMany({
            where: { tenantId: req.user.tenantId },
            include: classInclude,
            orderBy: [{ academicYear: "desc" }, { name: "asc" }, { section: "asc" }],
        });
        res.json({ success: true, count: classes.length, classes });
    } catch (error) {
        console.error("LIST CLASSES ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to fetch classes" });
    }
};

/** GET /classes/:id */
export const getClassDetails = async (req, res) => {
    try {
        const cls = await prisma.class.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId },
            include: {
                ...classInclude,
                students: {
                    select: { id: true, studentId: true, firstName: true, lastName: true, isActive: true },
                    orderBy: { firstName: "asc" },
                },
            },
        });
        if (!cls) return res.status(404).json({ success: false, message: "Class not found" });
        res.json({ success: true, class: cls });
    } catch (error) {
        console.error("GET CLASS ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to fetch class" });
    }
};

/** POST /classes  Body: { name, section?, academicYear?, description? } */
export const createClass = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const data = pickClassData(req.body);

        if (!data.name) {
            return res.status(400).json({ success: false, message: "Class name is required" });
        }

        const duplicate = await prisma.class.findFirst({
            where: { tenantId, name: data.name, section: data.section ?? null, academicYear: data.academicYear ?? null },
        });
        if (duplicate) return res.status(409).json({ success: false, message: duplicateMessage(data) });

        const cls = await prisma.class.create({
            data: { ...data, tenantId },
            include: classInclude,
        });

        await writeAuditLog({
            ...auditActor(req.user),
            action: "CLASS_CREATED",
            entity: "CLASS",
            entityId: cls.id,
            meta: { name: cls.name, section: cls.section, academicYear: cls.academicYear },
            req,
        });

        res.status(201).json({ success: true, message: "Class created", class: cls });
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({ success: false, message: duplicateMessage(pickClassData(req.body)) });
        }
        console.error("CREATE CLASS ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to create class" });
    }
};

/** PUT /classes/:id */
export const updateClass = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const existing = await prisma.class.findFirst({ where: { id: req.params.id, tenantId } });
        if (!existing) return res.status(404).json({ success: false, message: "Class not found" });

        const data = pickClassData(req.body);
        if (data.name === "") {
            return res.status(400).json({ success: false, message: "Class name cannot be empty" });
        }

        const next = { ...existing, ...data };
        const duplicate = await prisma.class.findFirst({
            where: {
                tenantId,
                name: next.name,
                section: next.section ?? null,
                academicYear: next.academicYear ?? null,
                id: { not: existing.id },
            },
        });
        if (duplicate) return res.status(409).json({ success: false, message: duplicateMessage(next) });

        const cls = await prisma.class.update({
            where: { id: existing.id },
            data,
            include: classInclude,
        });

        await writeAuditLog({
            ...auditActor(req.user),
            action: "CLASS_UPDATED",
            entity: "CLASS",
            entityId: cls.id,
            meta: { updates: Object.keys(data) },
            req,
        });

        res.json({ success: true, message: "Class updated", class: cls });
    } catch (error) {
        console.error("UPDATE CLASS ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to update class" });
    }
};

/**
 * DELETE /classes/:id
 * Refused while students are in the class: the database would delete those
 * students together with the class.
 */
export const deleteClass = async (req, res) => {
    try {
        const cls = await prisma.class.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId },
            include: classInclude,
        });
        if (!cls) return res.status(404).json({ success: false, message: "Class not found" });

        if (cls._count.students > 0) {
            return res.status(409).json({
                success: false,
                message: `Move the ${cls._count.students} student(s) of "${cls.name}" to another class before deleting it.`,
            });
        }

        await prisma.class.delete({ where: { id: cls.id } });

        await writeAuditLog({
            ...auditActor(req.user),
            action: "CLASS_DELETED",
            entity: "CLASS",
            entityId: cls.id,
            meta: { name: cls.name, section: cls.section, academicYear: cls.academicYear },
            req,
        });

        res.json({ success: true, message: "Class deleted" });
    } catch (error) {
        console.error("DELETE CLASS ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to delete class" });
    }
};
