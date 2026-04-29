const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const db = require("../database");

const router = express.Router();

router.get("/profile", authMiddleware, (req, res) => {
  db.get(
    "SELECT id, name, email, role FROM users WHERE id = ?",
    [req.user.id],
    (err, user) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (!user) return res.status(404).json({ message: "User not found" });

      res.json({
        message: "Profile loaded",
        user,
        accountStatus: "Verified",
        twoFA: "Enabled"
      });
    }
  );
});

router.get("/users", authMiddleware, roleMiddleware(["Admin", "Manager"]), (req, res) => {
  db.all("SELECT id, name, email, role FROM users", [], (err, users) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json({ message: "Users loaded successfully", users });
  });
});

router.get("/admin", authMiddleware, roleMiddleware(["Admin"]), (req, res) => {
  res.json({ message: "Admin access granted" });
});

router.get("/manager", authMiddleware, roleMiddleware(["Admin", "Manager"]), (req, res) => {
  res.json({ message: "Manager access granted" });
});

router.get("/user", authMiddleware, roleMiddleware(["Admin", "Manager", "User"]), (req, res) => {
  res.json({ message: "User access granted" });
});

router.patch("/users/:id/role", authMiddleware, roleMiddleware(["Admin"]), (req, res) => {
  const { role } = req.body;
  const { id } = req.params;

  if (!["Admin", "Manager", "User"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  db.run("UPDATE users SET role = ? WHERE id = ?", [role, id], function (err) {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json({ message: "Role updated successfully" });
  });
});

router.delete("/users/:id", authMiddleware, roleMiddleware(["Admin"]), (req, res) => {
  const { id } = req.params;

  if (Number(id) === req.user.id) {
    return res.status(400).json({ message: "You cannot delete yourself" });
  }

  db.run("DELETE FROM users WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json({ message: "User deleted successfully" });
  });
});

module.exports = router;