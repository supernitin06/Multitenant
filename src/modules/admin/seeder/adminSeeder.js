import prisma from "../../../core/config/db.js";

/**
 * 👑 Admin Seeder
 * Seed default Features and Feature Domains
 */
const seedAdminData = async () => {
    try {
        console.log("🚀 Starting Admin Seeding...");

        // 1. Create Default Features
        const features = [
            { name: "Student Management", code: "STUDENT_MGMT", desc: "Manage student profiles and enrollment" },
            { name: "Teacher Management", code: "TEACHER_MGMT", desc: "Manage teacher profiles and education" },
            { name: "Examination Portal", code: "EXAM_PORTAL", desc: "Manage exams and datesheets" },
        ];

        console.log("🔹 Seeding Features...");
        const createdFeatures = [];
        for (const f of features) {
            const feature = await prisma.feature.upsert({
                where: { feature_code: f.code },
                update: {},
                create: {
                    feature_name: f.name,
                    feature_code: f.code,
                    description: f.desc,
                    isActive: true,
                },
            });
            createdFeatures.push(feature);
        }
        console.log(`✅ ${createdFeatures.length} Features seeded.`);

        // 2. Create Feature Domains
        const domains = [

        ];

        console.log("🔹 Seeding Feature Domains...");
        const createdDomains = [];
        for (const d of domains) {
            const domain = await prisma.tenantFeatureDomain.upsert({
                where: { domain_name: d.name },
                update: {},
                create: {
                    domain_name: d.name,
                    price: d.price,
                    description: d.desc,
                    isActive: true,
                },
            });
            createdDomains.push(domain);
        }
        console.log(`✅ ${createdDomains.length} Feature Domains seeded.`);

        // 3. Assign Features to Domains
        console.log("🔹 Mapping Features to Domains...");

        const academicDomain = createdDomains.find(d => d.domain_name === "Academic");
        const financeDomain = createdDomains.find(d => d.domain_name === "Finance");
        const opsDomain = createdDomains.find(d => d.domain_name === "Operations");

        const mappings = [
            // Academic
            { domainId: academicDomain.id, domainName: academicDomain.domain_name, featureCode: "STUDENT_MGMT" },
            { domainId: academicDomain.id, domainName: academicDomain.domain_name, featureCode: "TEACHER_MGMT" },
            { domainId: academicDomain.id, domainName: academicDomain.domain_name, featureCode: "EXAM_PORTAL" },

            // Finance
            { domainId: financeDomain.id, domainName: financeDomain.domain_name, featureCode: "FEE_MGMT" },

            // Operations
            { domainId: opsDomain.id, domainName: opsDomain.domain_name, featureCode: "ATTENDANCE_SYS" },
            { domainId: opsDomain.id, domainName: opsDomain.domain_name, featureCode: "LIBRARY_MGMT" },
        ];

        for (const m of mappings) {
            const feature = createdFeatures.find(f => f.feature_code === m.featureCode);
            if (feature) {
                await prisma.tenanFeaturedDomain_assign_features.upsert({
                    where: {
                        domainId_featureId: {
                            domainId: m.domainId,
                            featureId: feature.id,
                        },
                    },
                    update: {},
                    create: {
                        domainId: m.domainId,
                        featureId: feature.id,
                        domain_name: m.domainName,
                        feature_name: feature.feature_name,
                    },
                });
            }
        }
        console.log("✅ Feature-Domain mappings completed.");

        console.log("✨ Admin Seeding Finished Successfully!");
    } catch (error) {
        console.error("❌ Seeding Error:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
};

// Execute if run directly
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1].endsWith('adminSeeder.js')) {
    seedAdminData();
}

export default seedAdminData;
