
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking PlatformPermissionDomain...');
    try {
        const platformDomains = await prisma.platformPermissionDomain.findMany();
        console.log('PlatformPermissionDomain found:', platformDomains.length);
    } catch (e) {
        console.error('Error finding PlatformPermissionDomain:', e.message);
    }

    console.log('Checking TenantPermissionDomain...');
    try {
        const tenantDomains = await prisma.tenantPermissionDomain.findMany();
        console.log('TenantPermissionDomain found:', tenantDomains.length);
    } catch (e) {
        console.error('Error finding TenantPermissionDomain:', e.message);
    }

    console.log('Checking Platform_staff...');
    try {
        const platformStaff = await prisma.platform_staff.findMany();
        console.log('Platform_staff found:', platformStaff.length);
    } catch (e) {
        console.error('Error finding Platform_staff:', e.message);
    }

    console.log('Checking PlatformRole...');
    try {
        const platformRole = await prisma.platformRole.findMany();
        console.log('PlatformRole found:', platformRole.length);
    } catch (e) {
        console.error('Error finding PlatformRole:', e.message);
    }
}

main()
    .catch(e => {
        throw e
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
