const express = require("express");
const path = require("path");
const app = express();
const port = 3000;

// ตั้งค่า View Engine เป็น EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware อ่านค่าจาก Form
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// เสิร์ฟ Static Files เช่น CSS และโลโก้
app.use(express.static("public"));

// เสิร์ฟหน้า Login
app.get("/login", (req, res) => {
    res.render("login");
});

// ตรวจสอบการเข้าสู่ระบบ
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    // เช็ค Username และ Password (ตัวอย่าง)
    if (username === "test@example.com" && password === "1234") {
        res.send("✅ เข้าสู่ระบบสำเร็จ!");
    } else {
        res.send("❌ ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง!");
    }
});

// เริ่มเซิร์ฟเวอร์
app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});
