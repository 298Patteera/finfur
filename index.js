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

// เชื่อม database
//ใช้ npm install sqlite3
const sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('finfurdB.db', (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('📂database has been connected');
});

//หมวด login
// ใช้ npm install express-session
// ทำ session
const session = require("express-session");
const { name } = require("ejs");
app.use(session({
    secret: "simplemakmak",
    resave: false,
    saveUninitialized: true
}));
// ทำให้ email เป็น local ดึงข้อมูลไปใช้ได้ทุก .ejs
app.use((req, res, next) => {
    res.locals.userEmail = req.session.userEmail || null;
    next();
});
// เสิร์ฟหน้า Login
app.get("/login", (req, res) => {
    res.render("login");
});
// ตรวจสอบการเข้าสู่ระบบ
// app.post("/login", (req, res) => {
//     const { username, password } = req.body;

//     // เช็ค Username และ Password (ตัวอย่าง)
//     if (username === "test@example.com" && password === "1234") {
//         res.send("✅ เข้าสู่ระบบสำเร็จ!");
//     } else {
//         res.send("❌ ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง!");
//     }
// });
app.post("/login", (req, res) => {
    const { "email-login": email, "password-login": pssword } = req.body;

    const query = `SELECT email, pssword FROM userInfo WHERE email = ? AND pssword = ?`;

    db.get(query, [email, pssword], (err, user) => {
        if (err) {
            console.log(err.message);
            return res.redirect("/login");
        }

        if (user) {
            req.session.userEmail = email;
            console.log("เข้าสู่ระบบสำเร็จ!");
            return res.redirect("/");
        } else {
            console.log("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง!");
            return res.redirect("/login");
        }
    });
});

// เสิร์ฟหน้า Sign-in(ลูกค้า)
app.get("/signin-customer", (req, res) => {
    res.render("signin-customer");
});

app.post("/signin-customer", (req, res) => {
    let addInfo = {
        username: req.body.username,
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        gender: req.body.gender,
        dob: req.body.dob,
        pssword: req.body.pssword
    };

    let sql = `INSERT INTO userInfo (username, name, email, phone, gender, dob, pssword) VALUES ('${addInfo.username}', '${addInfo.name}', '${addInfo.email}', '${addInfo.phone}', '${addInfo.gender}', '${addInfo.dob}', '${addInfo.pssword}')`;
    console.log(sql);
    db.run(sql, (err) => {
        if (err) {
            return console.error('Error inserting data:', err.message);
        }
        console.log('Data inserted successful');
        res.redirect("/");
    });
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
// เสิร์ฟหน้า Product Details
app.get("/product/:id", (req, res) => {
    const productId = req.params.id;
    const query = `
        SELECT 
            p.*,
            po.optionType, 
            po.optionName, 
            po.addPrice,
			po.imgURL
        FROM ProductList p
        LEFT JOIN productOption po ON p.productID = po.productID
		WHERE p.productID = ${productId};
    `;
    db.all(query, (err, rows) => {
        if (err) {
            console.log("❗" + err.message);
        }
        if (!rows || rows.length === 0) {
            console.log("❔ไม่พบสินค้า");
        }
        //console.log(row);
        //ตัดหมวดหมู่ออก
        const product = {
            productID: rows[0].productID,
            productName: rows[0].productName,
            brand: rows[0].brand,
            price: rows[0].price,
            stockNum: rows[0].stockNum,
            favoritesCount: rows[0].favoritesCount,
            addedDate: rows[0].addedDate,
            description: rows[0].description,
            options: []
        };
        let hasOptions = false;
        //ทำ obj array ไว้ใช้สร้างปุ่มตามหมวดหมู่ optionType
        rows.forEach(row => {
            if (row.optionType) {
                if (!product.options[row.optionType]) {
                    product.options[row.optionType] = [];
                }
                product.options[row.optionType].push({
                    optionName: row.optionName,
                    addPrice: row.addPrice,
                    imgURL: row.imgURL
                });
                hasOptions = true;
            }
        });
        if (!hasOptions) {
            product.options = null;
        }

        // rows.forEach(row => {
        //     if (row.optionID) {
        //         product.options.push({
        //             optionID: row.optionID,
        //             optionType: row.optionType,
        //             optionName: row.optionName,
        //             addPrice: row.addPrice,
        //             addPrice: row.imgURL
        //         });
        //     }
        // });

        res.render("product-detail", { product });
    });
});
// เสิร์ฟหน้า สินค้าทั้งหมด
app.get("/all-product", (req, res) => {
    const query = `
        SELECT 
            p.*, 
			sc.subID,
            sc.subName, 
			pc.categoryID,
            pc.categoryName 
        FROM ProductList p
        JOIN subCategory sc ON p.categoryID = sc.categoryID AND p.subID = sc.subID
        JOIN productCategory pc ON sc.categoryID = pc.categoryID;
    `;
    db.all(query, (err, rows) => {
        if (err) {
            console.log("❗" + err.message);
        }
        res.render("all-product", { product: rows });
    });
});
// เสิร์ฟหน้า ห้องนอน
app.get("/bed-room", (req, res) => {
    const query = `
        SELECT 
            p.*, 
			sc.subID,
            sc.subName, 
			pc.categoryID,
            pc.categoryName 
        FROM ProductList p
        JOIN subCategory sc ON p.categoryID = sc.categoryID AND p.subID = sc.subID
        JOIN productCategory pc ON sc.categoryID = pc.categoryID
        WHERE pc.categoryID = 1;
    `;
    db.all(query, (err, rows) => {
        if (err) {
            console.log("❗" + err.message);
        }
        res.render("bed-room", { product: rows });
    });
});
// เสิร์ฟหน้า ห้องนั่งเล่น
app.get("/living-room", (req, res) => {
    const query = `
        SELECT 
            p.*, 
			sc.subID,
            sc.subName, 
			pc.categoryID,
            pc.categoryName 
        FROM ProductList p
        JOIN subCategory sc ON p.categoryID = sc.categoryID AND p.subID = sc.subID
        JOIN productCategory pc ON sc.categoryID = pc.categoryID
        WHERE pc.categoryID = 2;
    `;
    db.all(query, (err, rows) => {
        if (err) {
            console.log("❗" + err.message);
        }
        res.render("living-room", { product: rows });
    });
});
// เสิร์ฟหน้า ห้องครัว
app.get("/kitchen", (req, res) => {
    const query = `
        SELECT 
            p.*, 
			sc.subID,
            sc.subName, 
			pc.categoryID,
            pc.categoryName 
        FROM ProductList p
        JOIN subCategory sc ON p.categoryID = sc.categoryID AND p.subID = sc.subID
        JOIN productCategory pc ON sc.categoryID = pc.categoryID
        WHERE pc.categoryID = 3;
    `;
    db.all(query, (err, rows) => {
        if (err) {
            console.log("❗" + err.message);
        }
        res.render("kitchen", { product: rows });
    });
});
// เสิร์ฟหน้า ห้องรับประทานอาหาร
app.get("/dining-room", (req, res) => {
    const query = `
        SELECT 
            p.*, 
			sc.subID,
            sc.subName, 
			pc.categoryID,
            pc.categoryName 
        FROM ProductList p
        JOIN subCategory sc ON p.categoryID = sc.categoryID AND p.subID = sc.subID
        JOIN productCategory pc ON sc.categoryID = pc.categoryID
        WHERE pc.categoryID = 4;
    `;
    db.all(query, (err, rows) => {
        if (err) {
            console.log("❗" + err.message);
        }
        res.render("dining-room", { product: rows });
    });
});
// เสิร์ฟหน้า ห้องทำงาน
app.get("/working-room", (req, res) => {
    const query = `
        SELECT 
            p.*, 
			sc.subID,
            sc.subName, 
			pc.categoryID,
            pc.categoryName 
        FROM ProductList p
        JOIN subCategory sc ON p.categoryID = sc.categoryID AND p.subID = sc.subID
        JOIN productCategory pc ON sc.categoryID = pc.categoryID
        WHERE pc.categoryID = 5;
    `;
    db.all(query, (err, rows) => {
        if (err) {
            console.log("❗" + err.message);
        }
        res.render("working-room", { product: rows });
    });
});
// เสิร์ฟหน้าตะกร้าสินค้า (Cart Page)
app.get("/cart", (req, res) => {
    res.render("cart");
});
// เสิร์ฟหน้าเช็คเอาท์
app.get("/checkout", (req, res) => {
    res.render("checkout");
});

// เสิร์ฟหน้าuser-profile
app.get("/user-profile", (req, res) => {
    const email = req.session.userEmail;

    const query = 'SELECT * FROM userInfo WHERE email = ?';

    db.get(query, [email], (err, row) => {
        if (err) {
            console.log(err.message);
        }
        console.log(row);
        res.render('user-profile', { data: row });
    });
});
// เสิร์ฟหน้าuser-payment
app.get("/user-payment", (req, res) => {
    const email = req.session.userEmail;

    const query = `
        SELECT 
            up.cardname, up.cardnum
        FROM 
            userPayment up
        LEFT JOIN 
            userInfo ui
        ON 
            ui.email = up.email
        WHERE 
            ui.email = ?`;

    db.all(query, [email], (err, rows) => {
        if (err) {
            console.log(err.message);
            return res.status(500).send("Database Error");
        }
        const cards = rows.map(row => ({
            name: row.cardname,
            last4: row.cardnum.slice(-4)
        }));

        console.log('Cards:', cards);
        res.render('user-payment', { cards });
    });
});

app.post("/add-user-payment", (req, res) => {
    let addInfo = {
        cardname: req.body.cardname,
        cardnum: req.body.cardnum,
        cvv: req.body.cvv,
        cardExpire: req.body.cardExpire
    };

    const email = req.session.userEmail;

    let sql = `INSERT INTO userPayment (cardname, cardnum, cvv, cardExpire, email) VALUES ('${addInfo.cardname}', '${addInfo.cardnum}', '${addInfo.cvv}', '${addInfo.cardExpire}', '${email}')`;
    console.log(sql);
    db.run(sql, (err) => {
        if (err) {
            return console.error('Error inserting data:', err.message);
        }
        console.log('Data inserted successful');
        res.redirect("/user-payment");
    });
});

// เสิร์ฟหน้าuser-address
app.get("/user-address", (req, res) => {
    const email = req.session.userEmail;

    const query = `
        SELECT 
            ua.name, ua.phone, ua.address 
        FROM 
            userInfo ui
        LEFT JOIN 
            userAddress ua
        ON 
            ui.email = ua.email
        WHERE 
            ui.email = ?`;

    db.all(query, [email], (err, rows) => {
        if (err) {
            console.log(err.message);
            return res.status(500).send("Database Error");
        }

        console.log('Rows:', rows);
        res.render('user-address', { data: rows });
    });

});

//เพิ่มที่อยู่
app.post("/add-user-address", (req, res) => {
    let addInfo = {
        name: req.body.name,
        phone: req.body.phone,
        address: req.body.address
    };

    const email = req.session.userEmail;

    let sql = `INSERT INTO userAddress (name, phone, address, email) VALUES ('${addInfo.name}', '${addInfo.phone}', '${addInfo.address}', '${email}')`;
    console.log(sql);
    db.run(sql, (err) => {
        if (err) {
            return console.error('Error inserting data:', err.message);
        }
        console.log('Data inserted successful');
        res.redirect("/user-address");
    });
});

// เสิร์ฟหน้าuser-changepass
app.get("/user-changepass", (req, res) => {
    res.render("user-changepass");
});

app.post("/user-changepass", (req, res) => {
    let change = {
        oldpass: req.body.oldpass,
        newpass: req.body.newpass
    };

    const email = req.session.userEmail;

    let sql = `SELECT pssword FROM userInfo WHERE email = ?`;
    db.get(sql, [email], (err, row) => {
        if (err) {
            console.log(err.message);
            return res.status(500).send("Database Error");
        }

        if (!row) {
            return res.status(404).send("ีuser not found");
        }

        if (row.pssword !== change.oldpass) { 
            return res.status(400).send("invalid password");
        }

        let updateSql = `UPDATE userInfo SET pssword = ? WHERE email = ?`; 
        db.run(updateSql, [change.newpass, email], (err) => {
            if (err) {
                console.log(err.message);
                return res.status(500).send("update database error");
            }
            console.log('Data updated successfully');
            res.redirect("/user-changepass");
        });
    });
});



// เสิร์ฟหน้าcompare
app.get("/compare", (req, res) => {
    res.render("compare");
});
// เสิร์ฟหน้าfavorites
app.get("/favorites", (req, res) => {
    const query = `
        SELECT 
            p.*, 
            sc.subID,
            sc.subName, 
            pc.categoryID,
            pc.categoryName 
        FROM ProductList p
        JOIN FavoriteList f ON p.productID = f.productID
        JOIN subCategory sc ON p.categoryID = sc.categoryID AND p.subID = sc.subID
        JOIN productCategory pc ON sc.categoryID = pc.categoryID
        WHERE f.email = ?;
    `;
    db.all(query, [res.locals.userEmail], (err, rows) => {
        if (err) {
            console.log("❗" + err.message);
        }
        res.render("favorites", { product: rows });
    });
});

// เสิร์ฟหน้า ของ provider

// เสิร์ฟหน้า ของ productList
app.get("/provider-productList", (req, res) => {
    res.render("provider-productList");
});

// เสิร์ฟหน้า ของ addProduct
app.get("/provider-addProduct", (req, res) => {
    res.render("provider-addProduct");
});

// เสิร์ฟหน้า ของ productHistory
app.get("/provider-productHistory", (req, res) => {
    res.render("provider-productHistory");
});

// เสิร์ฟหน้า ของ orderHistory
app.get("/provider-orderHistory", (req, res) => {
    res.render("provider-orderHistory");
});

// เสิร์ฟหน้า ของ orderlist
app.get("/user-orderlist", (req, res) => {
    res.render("user-orderlist");
});

// เสิร์ฟหน้า ของ user-pending
app.get("/user-pending", (req, res) => {
    res.render("user-pending");
});

// เสิร์ฟหน้า ของ user-shipping
app.get("/user-shipping", (req, res) => {
    res.render("user-shipping");
});

// เสิร์ฟหน้า ของ user-completed
app.get("/user-completed", (req, res) => {
    res.render("user-completed");
});

// เสิร์ฟหน้า ของ user-canceled
app.get("/user-canceled", (req, res) => {
    res.render("user-canceled");
});

app.post("/add-to-cart", (req, res) => {
    const { productID, email } = req.body;
    if (!email) {
        return res.json({ message: "❌ กรุณาเข้าสู่ระบบก่อน" });
    }
    const query = `
                INSERT INTO CustomerCart (productID, email, quantities) 
                VALUES (?, ?, 1) 
                ON CONFLICT(email, productID) 
                DO UPDATE SET quantities = quantities + 1;
                `;
    db.run(query, [productID, email], function (err) {
        if (err) {
            console.log("❗ Error: " + err.message);
        }
        res.json({ message: "✅ เพิ่มสินค้าในตะกร้าสำเร็จ!" });
    });
});
app.post("/add-to-fav", (req, res) => {
    const { productID, userEmail } = req.body;
    if (!userEmail) {
        return res.redirect('/login'); // หรือหน้าอื่นที่คุณต้องการให้ไปถ้าผู้ใช้ยังไม่ล็อกอิน
    }

    // ถ้าเคยเฟบแล้วจะลบออก
    const deleteQ = `
        DELETE FROM FavoriteList WHERE productID = ? AND email = ?;
    `;

    db.run(deleteQ, [productID, userEmail], function (err) {
        if (err) {
            console.log("❗ Error: " + err.message);
        }
        if (this.changes === 0) {
            //ถ้าไม่เคยเฟบจะเพิ่มไปในรายการโปรด
            const insertQ = `
                INSERT INTO FavoriteList (productID, email) 
                VALUES (?, ?);
            `;

            db.run(insertQ, [productID, userEmail], function (err) {
                if (err) {
                    console.log("❗ Error: " + err.message);
                }
            });
        }
    });
});

// เริ่มเซิร์ฟเวอร์
app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});
