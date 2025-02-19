const express = require("express");
const path = require("path");
const app = express();
const port = 3000;

// ตั้งค่า View Engine เป็น EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
console.log("Views Directory:", path.join(__dirname, "views"));

// Middleware อ่านค่าจาก Form
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// เสิร์ฟ Static Files เช่น CSS และโลโก้
app.use(express.static(path.join(__dirname, "public")));

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
// เสิร์ฟหน้า Home 💢💢💢
app.get("/", (req, res) => {
    let showSearchBar = req.query.search === "true"; // ถ้าส่งค่า ?search=true จะแสดง navbar_search
    res.render("home", { showSearchBar });
});
// เสิร์ฟหน้า สินค้าทั้งหมด
app.get("/all-product", (req, res) => {
    res.render("all-product");
});
// เสิร์ฟหน้า ห้องนอน
app.get("/bed-room", (req, res) => {
    res.render("bed-room");
});
// เสิร์ฟหน้า ห้องนั่งเล่น
app.get("/living-room", (req, res) => {
    res.render("living-room");
});
// เสิร์ฟหน้า ห้องครัว
app.get("/kitchen", (req, res) => {
    res.render("kitchen");
});
// เสิร์ฟหน้า ห้องรับประทานอาหาร
app.get("/dining-room", (req, res) => {
    res.render("dining-room");
});
// เสิร์ฟหน้า ห้องทำงาน
app.get("/working-room", (req, res) => {
    res.render("working-room");
});
// เสิร์ฟหน้าตะกร้าสินค้า (Cart Page)
app.get("/cart", (req, res) => {
    res.render("cart");
});
// เสิร์ฟหน้าuser-profile
app.get("/user-profile", (req, res) => {
    res.render("user-profile");
});
// เสิร์ฟหน้าuser-payment
app.get("/user-payment", (req, res) => {
    res.render("user-payment");
});
// เสิร์ฟหน้าuser-address
app.get("/user-address", (req, res) => {
    res.render("user-address");
});
// เสิร์ฟหน้าuser-changepass
app.get("/user-changepass", (req, res) => {
    res.render("user-changepass");
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
