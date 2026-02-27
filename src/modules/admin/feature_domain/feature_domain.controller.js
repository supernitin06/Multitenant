import prisma from "../../../core/config/db.js";

/**
 * CREATE DOMAIN
 * POST /domains
 */
export const createDomain = async (req, res) => {
  try {
    const { domain_name, price, description, dependencies } = req.body;

    const upperDomainName = domain_name.trim().toUpperCase();

    // 🔍 Case-insensitive and Space-insensitive Check
    const normalizedNewName = upperDomainName.replace(/\s+/g, '').toLowerCase();

    const existingDomains = await prisma.tenantFeatureDomain.findMany({
      select: { domain_name: true }
    });

    const isDuplicate = existingDomains.some(d =>
      d.domain_name.replace(/\s+/g, '').toLowerCase() === normalizedNewName
    );

    if (isDuplicate) {
      return res.status(409).json({ message: `Domain with name '${upperDomainName}' already exists` });
    }

    const domain = await prisma.tenantFeatureDomain.create({
      data: {
        domain_name: upperDomainName,
        price,
        description,
        dependencies: dependencies && Array.isArray(dependencies) ? {
          create: dependencies.map(depId => ({
            requiresId: depId
          }))
        } : undefined
      },
      include: {
        features: { include: { feature: true } },
        dependencies: { include: { requires: true } }
      }
    });

    const flattenedDomain = {
      ...domain,
      features: domain.features.map(f => ({ ...f.feature, assignmentId: f.id })),
      dependencies: domain.dependencies.map(d => ({ ...d.requires, dependencyId: d.id }))
    };

    res.status(201).json({
      success: true,
      message: "Domain created successfully",
      domain: flattenedDomain
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Domain already exists" });
    }
    res.status(500).json({ message: "Failed to create domain", error: error.message });
  }
};

/**
 * ADD DOMAIN DEPENDENCY
 */
export const addDomainDependency = async (req, res) => {
  try {
    const { domainId, requiresId } = req.body;

    if (!domainId || !requiresId) {
      return res.status(400).json({ message: "domainId and requiresId are required" });
    }

    const dependency = await prisma.domainDependency.create({
      data: { domainId, requiresId },
      include: { requires: true }
    });

    res.status(201).json({
      success: true,
      message: "Dependency added successfully",
      dependency: {
        ...dependency.requires,
        dependencyId: dependency.id
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to add dependency", error: error.message });
  }
};

/**
 * REMOVE DOMAIN DEPENDENCY
 */
export const removeDomainDependency = async (req, res) => {
  try {
    const { domainId, requiresId } = req.body;

    await prisma.domainDependency.delete({
      where: {
        domainId_requiresId: { domainId, requiresId }
      }
    });

    res.json({ success: true, message: "Dependency removed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove dependency", error: error.message });
  }
};

/**
 * GET ALL DOMAINS
 * GET /domains
 */
export const getAllDomains = async (req, res) => {
  try {
    // 1. Fetch all domains with their assigned features
    const rawDomains = await prisma.tenantFeatureDomain.findMany({
      include: {
        features: {
          include: {
            feature: true
          }
        },
        dependencies: {
          include: {
            requires: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // 2. Fetch all available features to allow assignments in the UI
    const allFeatures = await prisma.feature.findMany({
      orderBy: { feature_name: "asc" }
    });

    // 3. Transform data to be flatter and easier for the frontend
    const domains = rawDomains.map(domain => ({
      ...domain,
      features: domain.features.map(f => ({
        ...f.feature,
        assignmentId: f.id // include the join table ID if needed for removal
      })),
      dependencies: domain.dependencies.map(d => ({
        ...d.requires,
        dependencyId: d.id
      }))
    }));

    res.json({
      success: true,
      domains: domains,
      allFeatures // Optionally include this if the frontend needs it, though it wasn't used before
    });
  } catch (error) {
    console.error("GET ALL DOMAINS ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to fetch domains", error: error.message });
  }
};

/**
 * GET DOMAIN BY ID
 * GET /domains/:id
 */
export const getDomainById = async (req, res) => {
  try {
    const { id } = req.params;

    const domain = await prisma.tenantFeatureDomain.findUnique({
      where: { id },
      include: {
        features: {
          include: {
            feature: true
          }
        },
        dependencies: {
          include: {
            requires: true
          }
        }
      }
    });
    if (!domain) {
      return res.status(404).json({ message: "Domain not found" });
    }

    // 🔍 Flatten features and dependencies for the frontend
    const flattenedDomain = {
      ...domain,
      features: domain.features.map(f => ({
        ...f.feature,
        assignmentId: f.id
      })),
      dependencies: domain.dependencies.map(d => ({
        ...d.requires,
        dependencyId: d.id
      }))
    };

    res.json({
      success: true,
      domain: flattenedDomain
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch domain", error });
  }
};

/**
 * UPDATE DOMAIN
 * PUT /domains/:id
 */
export const updateDomain = async (req, res) => {
  try {
    const { id } = req.params;
    const { domain_name, price, description, dependencies, isActive } = req.body;

    // 1. Check if domain exists
    const domainExists = await prisma.tenantFeatureDomain.findUnique({ where: { id } });
    if (!domainExists) {
      return res.status(404).json({ message: "Domain not found" });
    }

    // 2. Uniqueness Check for Domain Name
    if (domain_name) {
      const upperName = domain_name.trim().toUpperCase();
      const existingDomain = await prisma.tenantFeatureDomain.findFirst({
        where: {
          domain_name: {
            equals: upperName,
            mode: 'insensitive'
          },
          id: { not: id }
        }
      });

      if (existingDomain) {
        return res.status(409).json({ message: `Another domain with name '${upperName}' already exists` });
      }
    }

    // 3. Update the Domain
    const domain = await prisma.tenantFeatureDomain.update({
      where: { id },
      data: {
        domain_name: domain_name ? domain_name.trim().toUpperCase() : undefined,
        price: price !== undefined ? parseFloat(price) : undefined,
        description,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        dependencies: (dependencies && Array.isArray(dependencies)) ? {
          deleteMany: {}, // Clear existing dependencies
          create: dependencies.map(depId => ({
            requiresId: depId
          }))
        } : undefined
      },
      include: {
        features: { include: { feature: true } },
        dependencies: { include: { requires: true } }
      }
    });

    // 4. Flatten the response for the frontend
    const flattenedDomain = {
      ...domain,
      features: domain.features.map(f => ({ ...f.feature, assignmentId: f.id })),
      dependencies: domain.dependencies.map(d => ({ ...d.requires, dependencyId: d.id }))
    };

    res.json({
      success: true,
      message: "Domain updated successfully",
      domain: flattenedDomain
    });
  } catch (error) {
    console.error("UPDATE DOMAIN ERROR:", error);
    res.status(500).json({ message: "Failed to update domain", error: error.message });
  }
};

/**
 * DELETE DOMAIN
 * DELETE /domains/:id
 */
export const deleteDomain = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.tenantFeatureDomain.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: "Domain deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete domain", error });
  }
};





export const assignFeatureToDomain = async (req, res) => {
  try {
    const { featureId, domainId } = req.body;

    if (!featureId || !domainId) {
      return res.status(400).json({
        success: false,
        message: "featureId and domainId are required",
      });
    }
    const checkFeatureDomain = await prisma.tenanFeaturedDomain_assign_features.findFirst({
      where: {
        featureId,
        domainId,
      },
    });
    if (checkFeatureDomain) {
      return res.status(409).json({
        success: false,
        message: "Feature already assigned to domain",
      });
    }

    const feature = await prisma.feature.findUnique({
      where: { id: featureId },
    });

    if (!feature) {
      return res.status(404).json({
        success: false,
        message: "Feature not found",
      });
    }

    const domain = await prisma.tenantFeatureDomain.findUnique({
      where: { id: domainId },
    });

    if (!domain) {
      return res.status(404).json({
        success: false,
        message: "Domain not found",
      });
    }

    const featureDomain = await prisma.tenanFeaturedDomain_assign_features.create({
      data: {
        featureId,
        domainId,
        domain_name: domain.domain_name,
        feature_name: feature.feature_name,
      },
    });

    res.status(201).json({
      success: true,
      message: "Feature assigned to domain successfully",
      featureDomain,
    });
  } catch (error) {
    console.error("ASSIGN FEATURE TO DOMAIN ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};



export const unassignFeatureFromDomain = async (req, res) => {
  try {
    const { featureId, domainId } = req.body;

    if (!featureId || !domainId) {
      return res.status(400).json({
        success: false,
        message: "featureId and domainId are required",
      });
    }
    const checkFeatureDomain = await prisma.tenanFeaturedDomain_assign_features.findFirst({
      where: {
        featureId,
        domainId,
      },
    });
    if (!checkFeatureDomain) {
      return res.status(404).json({
        success: false,
        message: "Feature not assigned to domain",
      });
    }

    const featureDomain = await prisma.tenanFeaturedDomain_assign_features.delete({
      where: {
        id: checkFeatureDomain.id,
      },
    });

    res.status(200).json({
      success: true,
      message: "Feature unassigned from domain successfully",
      featureDomain,
    });
  } catch (error) {
    console.error("UNASSIGN FEATURE FROM DOMAIN ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


export const getAssignedFeatureByDomain = async (req, res) => {
  try {
    const { domainId } = req.params;

    const featureDomain = await prisma.tenanFeaturedDomain_assign_features.findMany({
      where: { domainId },
      include: {
        feature: true
      }
    });

    // 🔍 Flatten results
    const features = featureDomain.map(fd => ({
      ...fd.feature,
      assignmentId: fd.id,
      domain_name: fd.domain_name
    }));

    res.json({
      success: true,
      features,
    });
  } catch (error) {
    console.error("GET FEATURE BY DOMAIN ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};



