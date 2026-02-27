
import prisma from './src/core/config/db.js';

async function main() {
    try {
        const admins = await prisma.superAdmin.findMany({
            select: { id: true, email: true, isActive: true }
        });
        console.log(JSON.stringify(admins, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
