import prisma from "../../../../../core/config/db.js";

/**
 * 📝 Create Examination
 */
export const createExamination = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { name, examType, academicYear, term, startDate, endDate, description } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: "Examination name is required" });
        }

        const examination = await prisma.examination.create({
            data: {
                tenantId,
                name,
                examType,
                academicYear,
                term,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                description,
            },
        });

        res.status(201).json({
            success: true,
            message: "Examination created successfully",
            examination,
        });
    } catch (error) {
        console.error("CREATE EXAMINATION ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 📝 List All Examinations
 */
export const listExaminations = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const examinations = await prisma.examination.findMany({
            where: { tenantId },
            include: { schedules: true },
            orderBy: { createdAt: "desc" },
        });

        res.json({
            success: true,
            examinations,
        });
    } catch (error) {
        console.error("LIST EXAMINATIONS ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to fetch examinations" });
    }
};

/**
 * 📝 Create Exam Schedule (Datesheet Entry)
 */
export const createExamSchedule = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { examinationId, subject, examDate, startTime, endTime, className, roomNumber } = req.body;

        if (!examinationId || !subject || !examDate) {
            return res.status(400).json({
                success: false,
                message: "Examination ID, Subject and Exam Date are required",
            });
        }

        const schedule = await prisma.examSchedule.create({
            data: {
                tenantId,
                examinationId,
                subject,
                examDate: new Date(examDate),
                startTime,
                endTime,
                className,
                roomNumber,
            },
        });

        res.status(201).json({
            success: true,
            message: "Exam schedule added successfully",
            schedule,
        });
    } catch (error) {
        console.error("CREATE EXAM SCHEDULE ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 📝 Get Examination Datesheet (Class-wise)
 */
export const getDatesheet = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { examinationId } = req.params;
        const { className } = req.query;

        const where = { examinationId, tenantId };
        if (className) {
            where.className = className;
        }

        const schedules = await prisma.examSchedule.findMany({
            where,
            orderBy: { examDate: "asc" },
        });

        res.json({
            success: true,
            schedules,
        });
    } catch (error) {
        console.error("GET DATESHEET ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to fetch datesheet" });
    }
};

/**
 * 📝 Update Examination
 */
export const updateExamination = async (req, res) => {
    try {
        const { id } = req.params;
        const { tenantId } = req.user;
        const data = req.body;

        const existing = await prisma.examination.findFirst({
            where: { id, tenantId }
        });

        if (!existing) {
            return res.status(404).json({ success: false, message: "Examination not found" });
        }

        delete data.tenantId;
        delete data.id;

        if (data.startDate) data.startDate = new Date(data.startDate);
        if (data.endDate) data.endDate = new Date(data.endDate);

        const examination = await prisma.examination.update({
            where: { id },
            data,
        });

        res.json({
            success: true,
            message: "Examination updated successfully",
            examination,
        });
    } catch (error) {
        console.error("UPDATE EXAMINATION ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to update examination" });
    }
};

/**
 * 📝 Delete Examination
 */
export const deleteExamination = async (req, res) => {
    try {
        const { id } = req.params;
        const { tenantId } = req.user;

        const result = await prisma.examination.deleteMany({
            where: { id, tenantId }
        });

        if (result.count === 0) {
            return res.status(404).json({ success: false, message: "Examination not found or already deleted" });
        }

        res.json({ success: true, message: "Examination deleted successfully" });
    } catch (error) {
        console.error("DELETE EXAMINATION ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to delete examination" });
    }
};

export const updateExamSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const { tenantId } = req.user;
        const data = req.body;

        const existing = await prisma.examSchedule.findFirst({
            where: { id, tenantId }
        });

        if (!existing) {
            return res.status(404).json({ success: false, message: "Exam schedule not found" });
        }

        delete data.tenantId;
        delete data.id;

        if (data.examDate) data.examDate = new Date(data.examDate);

        const schedule = await prisma.examSchedule.update({
            where: { id },
            data,
        });

        res.json({
            success: true,
            message: "Exam schedule updated successfully",
            schedule,
        });
    } catch (error) {
        console.error("UPDATE EXAM SCHEDULE ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to update exam schedule" });
    }
};


