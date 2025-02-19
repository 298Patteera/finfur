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

// เสิร์ฟหน้า Sign-in(ลูกค้า)
app.get("/signin-customer", (req, res) => {
    res.render("signin-customer");
});
// เสิร์ฟหน้า Sign-in(สำหรับผู้ขาย)
app.get("/signin-provider", (req, res) => {
    res.render("signin-provider");
});
// เสิร์ฟหน้า home
app.get("/", (req, res) => {
    res.render("home");
});
// เสิร์ฟหน้า สินค้าทั้งหมด
app.get("/all-product", (req, res) => {
    res.send("🛍 หน้ากลุ่มสินค้าทั้งหมด");
});
// เสิร์ฟหน้า ห้องนอน
app.get("/bed-room", (req, res) => {
    res.send("🛏 หน้าห้องนอน");
});
// เสิร์ฟหน้า ห้องนั่งเล่น
app.get("/living-room", (req, res) => {
    res.send("🛋 หน้าห้องนั่งเล่น");
});
// เสิร์ฟหน้า ห้องครัว
app.get("/kitchen", (req, res) => {
    res.send("🍳 หน้าห้องครัว");
});
// เสิร์ฟหน้า ห้องรับประทานอาหาร
app.get("/dining-room", (req, res) => {
    res.send("🍽 หน้าห้องรับประทานอาหาร");
});
// เสิร์ฟหน้า ห้องทำงาน
app.get("/working-room", (req, res) => {
    res.send("💻 หน้าห้องทำงาน");
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
