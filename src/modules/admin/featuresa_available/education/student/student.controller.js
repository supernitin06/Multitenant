import prisma from "../../../../../core/config/db.js";

/**
 * 👑 Create Student
 */
export const createStudent = async (req, res) => {
    try {
        const { studentId, firstName, lastName, email, phone, gender, dateOfBirth, address, parentName, parentPhone, classId, sectionId  } = req.body;
        const { tenantId } = req.user;

        if (!firstName || !lastName) {
            return res.status(400).json({ success: false, message: "First name and Last name are required" });
        }

        const student = await prisma.student.create({
            data: {
                studentId,
                firstName,
                lastName,
                email,
                classId,
                sectionId,
                phone,
                gender,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                address,
                parentName,
                parentPhone,
                tenantId
            }
        });

        res.status(201).json({ success: true, message: "Student created successfully", student });
    } catch (error) {
        console.error("CREATE STUDENT ERROR:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to create student" });
    }
};

/**
 * 👑 List All Students
 */
export const listStudents = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const students = await prisma.student.findMany({
            where: { tenantId },
            orderBy: { createdAt: "desc" }
        });

        res.json({ success: true, count: students.length, students });
    } catch (error) {
        console.error("LIST STUDENTS ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to fetch students" });
    }
};

/**
 * 👑 Get Student Details
 */
export const getStudentDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { tenantId } = req.user;

        const student = await prisma.student.findFirst({
            where: { id, tenantId }
        });

        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        res.json({ success: true, student });
    } catch (error) {
        console.error("GET STUDENT DETAILS ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to fetch student details" });
    }
};

/**
 * 👑 Update Student
 */
export const updateStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const { tenantId } = req.user;
        const data = req.body;

        // Security: Ensure student belongs to tenant
        const existingStudent = await prisma.student.findFirst({
            where: { id, tenantId }
        });

        if (!existingStudent) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        // Prevent modification of sensitive fields
        delete data.id;
        delete data.tenantId;

        if (data.dateOfBirth) {
            data.dateOfBirth = new Date(data.dateOfBirth);
        }

        const student = await prisma.student.update({
            where: { id },
            data
        });

        res.json({ success: true, message: "Student updated successfully", student });
    } catch (error) {
        console.error("UPDATE STUDENT ERROR:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to update student" });
    }
};

/**
 * 👑 Delete Student
 */
export const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const { tenantId } = req.user;

        // deleteMany allows using non-unique fields in where
        const result = await prisma.student.deleteMany({
            where: { id, tenantId }
        });

        if (result.count === 0) {
            return res.status(404).json({ success: false, message: "Student not found or already deleted" });
        }

        res.json({ success: true, message: "Student deleted successfully" });
    } catch (error) {
        console.error("DELETE STUDENT ERROR:", error);
        res.status(500).json({ success: false, message: "Failed to delete student" });
    }
};
