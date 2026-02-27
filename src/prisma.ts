import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SOFT_DELETE_MODELS = [
  "Module",
  "Tenant",
  "User",
  "Plan",
];

prisma.$use(async (params, next) => {
  const { model, action } = params;

  if (!model || !SOFT_DELETE_MODELS.includes(model)) {
    return next(params);
  }

  // Super Admin override
  if (params.args?.skipSoftDelete) {
    delete params.args.skipSoftDelete;
    return next(params);
  }

  // READ OPERATIONS
  if (
    action === "findMany" ||
    action === "findFirst" ||
    action === "count"
  ) {
    params.args = params.args ?? {};
    params.args.where = {
      ...params.args.where,
      isDeleted: false,
    };
  }

  // findUnique must be converted
  if (action === "findUnique") {
    params.action = "findFirst";
    params.args.where = {
      ...params.args.where,
      isDeleted: false,
    };
  }

  // UPDATE protection
  if (action === "update" || action === "updateMany") {
    params.args.where = {
      ...params.args.where,
      isDeleted: false,
    };
  }

  // BLOCK hard deletes
  if (action === "delete" || action === "deleteMany") {
    throw new Error(
      `Hard delete is disabled for ${model}. Use archive instead.`
    );
  }

  return next(params);
});

export default prisma;
