import prisma from "../../../../../core/config/db.js";

/**
 * 👩‍🏫 Create Teacher
 */
export const createTeacher = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const {
            teacherId,
            firstName,
            lastName,
            email,
            phone,
            gender,
            dateOfBirth,
            address,
            qualification,
            experience,
            joiningDate
        } = req.body;

        if (!firstName || !lastName) {
            return res.status(400).json({
                success: false,
                message: "First name and last name are required",
            });
        }

        // Check if teacherId or email already exists for this tenant
        if (teacherId) {
            const existingById = await prisma.teacher.findFirst({
                where: { tenantId, teacherId }
            });
            if (existingById) {
                return res.status(409).json({
                    success: false,
                    message: `Teacher with ID ${teacherId} already exists`,
                });
            }
        }

        if (email) {
            const existingByEmail = await prisma.teacher.findFirst({
                where: { tenantId, email }
            });
            if (existingByEmail) {
                return res.status(409).json({
                    success: false,
                    message: `Teacher with email ${email} already exists`,
                });
            }
        }

        const teacher = await prisma.teacher.create({
            data: {
                tenantId,
                teacherId,
                firstName,
                lastName,
                email,
                phone,
                gender,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                address,
                qualification,
                experience,
                joiningDate: joiningDate ? new Date(joiningDate) : null,
            },
        });

        res.status(201).json({
            success: true,
            message: "Teacher created successfully",
            teacher,
        });
    } catch (error) {
        console.error("CREATE TEACHER ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 👩‍🏫 List All Teachers
 */
export const listTeachers = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const teachers = await prisma.teacher.findMany({
            where: { tenantId },
            orderBy: { createdAt: "desc" },
        });

        res.json({
            success: true,
            teachers,
        });
    } catch (error) {
        console.error("LIST TEACHERS ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to fetch teachers" });
    }
};

/**
 * 👩‍🏫 Get Teacher Details
 */
export const getTeacherDetails = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;

        const teacher = await prisma.teacher.findFirst({
            where: { id, tenantId }
        });

        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: "Teacher not found",
            });
        }

        res.json({
            success: true,
            teacher,
        });
    } catch (error) {
        console.error("GET TEACHER DETAILS ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to fetch teacher details" });
    }
};

/**
 * 👩‍🏫 Update Teacher
 */
export const updateTeacher = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        const data = req.body;

        // Security: Ensure teacher belongs to tenant
        const existingTeacher = await prisma.teacher.findFirst({
            where: { id, tenantId }
        });

        if (!existingTeacher) {
            return res.status(404).json({ success: false, message: "Teacher not found" });
        }

        // Prevent updating tenantId or id
        delete data.tenantId;
        delete data.id;

        if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth);
        if (data.joiningDate) data.joiningDate = new Date(data.joiningDate);

        const teacher = await prisma.teacher.update({
            where: { id },
            data: {
                ...data
            },
        });

        res.json({
            success: true,
            message: "Teacher updated successfully",
            teacher,
        });
    } catch (error) {
        console.error("UPDATE TEACHER ERROR:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to update teacher" });
    }
};

/**
 * 👩‍🏫 Delete Teacher
 */
export const deleteTeacher = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;

        const result = await prisma.teacher.deleteMany({
            where: { id, tenantId },
        });

        if (result.count === 0) {
            return res.status(404).json({ success: false, message: "Teacher not found or already deleted" });
        }

        res.json({
            success: true,
            message: "Teacher deleted successfully",
        });
    } catch (error) {
        console.error("DELETE TEACHER ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to delete teacher" });
    }
};
