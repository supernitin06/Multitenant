
import prisma from './src/core/config/db.js';

async function main() {
    try {
        console.log("Fetching all plans...");
        const plans = await prisma.subscription_Plan.findMany();
        console.log("All Plans:", JSON.stringify(plans, null, 2));

        if (plans.length > 0) {
            const firstId = plans[0].id;
            console.log(`Trying to find plan by ID: ${firstId}`);
            const found = await prisma.subscription_Plan.findUnique({
                where: { id: firstId }
            });
            console.log("Found plan:", found ? "YES" : "NO");
        }
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
