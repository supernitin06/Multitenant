
export const checkSuperAdmin = async (req, res, next) => {
      const role = req.user.role;
      const type = req.user.type;

    try {
        if (role === "SUPER_ADMIN" && type === "SUPER_ADMIN") {
           next();
        }
        else{
            return res.status(403).json({ message: "Unauthorized User" });
        }
    } catch (err) {
        console.error("Auth Middleware Error:", err);
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};