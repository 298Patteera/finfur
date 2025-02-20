const express = require("express");
const path = require("path");

const app = express();
const port = 3000;

// ตั้งค่า View Engine เป็น EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
console.log("Views Directory:", path.join(__dirname, "views"));


// เสิร์ฟ Static Files
app.use(express.static(path.join(__dirname, "public")));

// เสิร์ฟหน้า Home 💢💢💢
app.get("/home", (req, res) => {
    let showSearchBar = req.query.search === "true"; // ถ้าส่งค่า ?search=true จะแสดง navbar_search
    res.render("home", { showSearchBar });
});

// เริ่มเซิร์ฟเวอร์
app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});

