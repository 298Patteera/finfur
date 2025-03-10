const express = require("express");
const path = require("path");
const app = express();
const port = 3000;
const promptpay = require('promptpay-qr');
const QRCode = require('qrcode');
const multer = require('multer');
const bcrypt = require('bcrypt'); 

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
const { redirect } = require("next/dist/server/api-utils");
app.use(session({
    secret: "simplemakmak",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
    secure: false
}));
// ทำให้ข้อมูฅเป็น local ดึงข้อมูลไปใช้ได้ข้าม .ejs
app.use((req, res, next) => {
    res.locals.userEmail = req.session.userEmail || null;

    res.locals.orderDetail = req.session.orderDetail || null;
    res.locals.orderList = req.session.orderList || null;
    res.locals.totalPrice = req.session.totalPrice || null;
    const checkoutPages = ["/checkout", "/debit", "/prompay", "/qr", "/upload", "/checkout-create-orderList"];
    if (req.session.orderDetail && !checkoutPages.includes(req.path)) {
        console.log(`${req.path} ลบ session orderDetail`);
        req.session.orderDetail = null;
    }
    if (req.session.orderList && !checkoutPages.includes(req.path)) {
        console.log(`${req.path} ลบ session orderList`);
        req.session.orderList = null;
    }
    if (req.session.totalPrice && !checkoutPages.includes(req.path)) {
        console.log(`${req.path} ลบ session totalPrice`);
        req.session.totalPrice = null;
    }
    next();
});
// เสิร์ฟหน้า Login
app.get("/login", (req, res) => {
    res.render("login");
});
app.get("/logout", (req, res) => {
    req.session.userEmail = null;
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
    const { "email-login": email, "password-login": password } = req.body;

    const query = `SELECT email, pssword FROM userInfo WHERE email = ?`;
    const queryProvider = `SELECT email FROM providerList WHERE email = ?`;

    db.get(query, [email], (err, user) => {
        if (err) {
            console.log(err.message);
            return res.redirect("/login");
        }

        if (user) {
            bcrypt.compare(password, user.pssword, (err, isMatch) => {
                if (err) {
                    console.log(err.message);
                    return res.redirect("/login");
                }

                if (isMatch) {
                    req.session.userEmail = email;
                    console.log("เข้าสู่ระบบสำเร็จ!");

                   //เช็คว่าเป็น customer or provider
                    db.get(queryProvider, [email], (err, provider) => {
                        if (err) {
                            console.log(err.message);
                            return res.redirect("/login");
                        }

                        if (provider) {
                            req.session.isProvider = true;
                            return res.redirect("/provider-productList");
                        } else {
                            req.session.isProvider = false; // If not a provider
                            return res.redirect("/");
                        }
                    });
                } else {
                    console.log("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง!");
                    res.send('<script>alert("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง!"); window.location.href="/login";</script>');
                }
            });
        } else {
            console.log("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง!");
            res.send('<script>alert("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง!"); window.location.href="/login";</script>');
        }
    });
});

// Middleware เช็คสถานะของผู้ใช้
app.use((req, res, next) => {
    if (req.session.isProvider) {
        res.locals.isProvider = true; // เก็บสถานะใน locals
    } else {
        res.locals.isProvider = false;
    }
    next();
});
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

    bcrypt.hash(addInfo.pssword, 10, (err, hashedPassword) => {
        if (err) {
            return console.error('Error hashing password:', err.message);
        }

        let sql = `INSERT INTO userInfo (username, name, email, phone, gender, dob, pssword) 
                    VALUES ('${addInfo.username}', '${addInfo.name}', '${addInfo.email}', '${addInfo.phone}', '${addInfo.gender}', '${addInfo.dob}', '${hashedPassword}')`;

        console.log(sql);
        db.run(sql, (err) => {
            if (err) {
                return console.error('Error inserting data:', err.message);
            }
            console.log('Data inserted successfully');
            res.redirect("/");
        });
    });
});

// เสิร์ฟหน้า Sign-in(สำหรับผู้ขาย)
app.get("/signin-provider", (req, res) => {
    res.render("signin-provider");
});
// เสิร์ฟหน้า Home 💢💢💢
app.get("/", (req, res) => {
    let showSearchBar = req.query.search === "true"; // ถ้าส่งค่า ?search=true จะแสดง navbar_search
    const query = `
        SELECT * FROM ProductList;
    `;
    const userEmail = res.locals.userEmail || null;
    db.all(query, (err, rows) => {
        if (err) {
            console.log("❗" + err.message);
        }

        res.render("home", { product: rows, userEmail, showSearchBar });
    });
});
// เสิร์ฟหน้า Product Details
app.get("/product/:id", (req, res) => {
    const productId = req.params.id;
    const query = `
        SELECT 
            p.*,
            po.*
        FROM ProductList p
        LEFT JOIN productOption po ON p.productID = po.productID
        WHERE p.productID = ?;
    `;
    const rcm4randomQ = `
        SELECT 
            p.*, 
            sc.subID,
            sc.subName, 
            pc.categoryID,
            pc.categoryName,
            CASE 
                WHEN f.productID IS NOT NULL THEN 1 ELSE 0 
            END AS isFavorited
        FROM ProductList p
        JOIN subCategory sc ON p.categoryID = sc.categoryID AND p.subID = sc.subID
        JOIN productCategory pc ON sc.categoryID = pc.categoryID
        LEFT JOIN FavoriteList f ON p.productID = f.productID AND f.email = ?
        ORDER BY RANDOM()
        LIMIT 5;
    `;
    const userEmail = res.locals.userEmail || null;
    db.all(query, [productId], (err, rows) => {
        if (err) {
            console.log("❗" + err.message);
            return res.status(500).send("Internal Server Error");
        }
        if (!rows || rows.length === 0) {
            console.log("❔ ไม่พบสินค้า");
            return res.status(404).send("Product Not Found");
        }

        const product = {
            productID: productId,
            productName: rows[0].productName,
            brand: rows[0].brand,
            price: rows[0].price,
            favoritesCount: rows[0].favoritesCount,
            addedDate: rows[0].addedDate,
            description: rows[0].description,
            options: {}
        };

        rows.forEach(row => {
            if (row.optionType) {
                if (!product.options[row.optionType]) {
                    product.options[row.optionType] = [];
                }
                product.options[row.optionType].push({
                    optionID: row.optionID,
                    optionName: row.optionName,
                    addPrice: row.addPrice,
                    imgURL: row.imgURL,
                    recommendedSize: row.recommendedSize,
                    optionType: row.optionType
                });
            }
        });
        db.all(rcm4randomQ, [userEmail], (err, rows) => {
            if (err) {
                console.log("❗" + err.message);
            }
            res.render("product-detail", { product, productRcm: rows, userEmail });
        });
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
            pc.categoryName,
            CASE 
                WHEN f.productID IS NOT NULL THEN 1 ELSE 0 
            END AS isFavorited
        FROM ProductList p
        JOIN subCategory sc ON p.categoryID = sc.categoryID AND p.subID = sc.subID
        JOIN productCategory pc ON sc.categoryID = pc.categoryID
        LEFT JOIN FavoriteList f ON p.productID = f.productID AND f.email = ?;
    `;
    const userEmail = res.locals.userEmail || null;
    db.all(query, [userEmail], (err, rows) => {
        if (err) {
            console.log("❗" + err.message);
        }
        res.render("all-product", { product: rows, userEmail });
    });
});

//รวบโค้ดห้องทั้งหมด
const roomCategories = [
    { path: "bed-room", categoryID: 1 },
    { path: "living-room", categoryID: 2 },
    { path: "kitchen", categoryID: 3 },
    { path: "dining-room", categoryID: 4 },
    { path: "working-room", categoryID: 5 },
];

roomCategories.forEach(({ path, categoryID }) => {
    app.get(`/${path}/:id?`, (req, res) => {
        const subID = req.params.id || null;
        const userEmail = res.locals.userEmail || null;

        const query = `
            SELECT 
                p.*, 
                sc.subID,
                sc.subName, 
                pc.categoryID,
                pc.categoryName,
                CASE 
                    WHEN f.productID IS NOT NULL THEN 1 ELSE 0 
                END AS isFavorited
            FROM ProductList p
            JOIN subCategory sc ON p.categoryID = sc.categoryID AND p.subID = sc.subID
            JOIN productCategory pc ON sc.categoryID = pc.categoryID
            LEFT JOIN FavoriteList f ON p.productID = f.productID AND f.email = ?
            WHERE pc.categoryID = ?
            ${subID ? "AND sc.subID = ?" : ""};
        `;

        const valueQ = subID ? [userEmail, categoryID, subID] : [userEmail, categoryID];

        db.all(query, valueQ, (err, rows) => {
            if (err) {
                console.error("❗" + err.message);
                return res.status(500).send("Internal Server Error");
            }
            res.render(path, { product: rows, subID: subID, userEmail });
        });
    });
});

// เสิร์ฟหน้าตะกร้าสินค้า (Cart Page)
app.get("/cart", (req, res) => {
    const query = `
        SELECT c.*,
            p.productName,
            p.price
            FROM CustomerCart c
            JOIN ProductList p ON c.productID = p.productID
            WHERE c.email = ?;
    `;
    const userEmail = res.locals.userEmail || null;
    db.all(query, [userEmail], (err, rows) => {
        if (err) {
            console.log("❗" + err.message);
        }
        res.render("cart", { product: rows, userEmail });
    });
});
// เสิร์ฟหน้าเช็คเอาท์
app.get("/checkout", (req, res) => {
    //console.log("/checkout session data: ", req.session);

    const orderDetail = req.session.orderDetail;
    const userEmail = req.session.userEmail;

    if (!orderDetail) {
        console.log("/checkout : ไม่พบข้อมูล orderDetail");
    } else {
        const totalPrice = orderDetail.reduce((sum, item) => {return sum + Number(item.eachTotalPrice);}, 0);
        const addressQ = `
                        SELECT * FROM userAddress
                        WHERE email = ?;
                    `;
        const paymentQ = `
                        SELECT * FROM userPayment
                        WHERE email = ?;
                    `;
    db.all(addressQ, [userEmail], (err, aRows) => {
        if (err) {
            console.log("address error❗" + err.message);
        }
        db.all(paymentQ, [userEmail], (err, pRows) => {
            if (err) {
                console.log("payment error❗" + err.message);
            }
            console.log("/checkout received ss: ", orderDetail);
            res.render("checkout", { address: aRows, payment: pRows, userEmail, orderDetail, totalPrice });
        });
    });
    }

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
            last4: row.cardnum.slice(-4),
            cardnum: row.cardnum
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

//ลบ user-payment-card
app.post('/delete-card', (req, res) => {
    console.log("Received request body:", req.body);

    const cardnum = req.body.cardnum;
    const email = req.session.userEmail;

    console.log('Deleting card:', cardnum, 'for email:', email);

    const sql = `DELETE FROM userPayment WHERE cardnum = ? AND email = ?`;

    db.run(sql, [cardnum, email], function (err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ success: false, message: "Database Error: " + err.message });
        }
        console.log(`ลบบัตร ${cardnum} สำเร็จ`);
        return res.json({ success: true, message: "ลบบัตรสำเร็จ" });
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

        if (!rows || rows.length === 0 || rows.every(row => !row.name && !row.phone && !row.address)) {
            rows = [];  // เปลี่ยนเป็น [] ถ้าไม่มีข้อมูล
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

    const checkPhoneSql = `SELECT * FROM userAddress WHERE phone = ?`;

    db.get(checkPhoneSql, [addInfo.phone], (err, row) => {
        if (err) {
            console.error("Error checking phone:", err.message);
            return res.status(500).json({ success: false, message: "Error checking phone" });
        }

        if (row) {
            return res.status(400).send("เบอร์โทรซ้ำ กรุณาใช้เบอร์โทรอื่น");
        }

        let sql = `INSERT INTO userAddress (name, phone, address, email) VALUES (?, ?, ?, ?)`;
        db.run(sql, [addInfo.name, addInfo.phone, addInfo.address, email], (err) => {
            if (err) {
                console.error('Error inserting data:', err.message);
                return res.status(500).send("Error inserting data");
            }
            console.log('Data inserted successfully');
            res.redirect("/user-address");
        });
    });
});


//ลบที่อยู่
app.delete("/delete-user-address", (req, res) => {
    const phone = req.body.phone;

    const sql = `DELETE FROM userAddress WHERE phone = ?`;

    db.run(sql, [phone], (err) => {
        if (err) {
            console.error("Error deleting address:", err.message);
            return res.status(500).json({ success: false, message: "Error deleting" });
        }
        console.log("Address deleted successfully");
        res.json({ success: true });
    });
});


//แก้ไขที่อยู่
app.post("/edit-user-address", (req, res) => {
    const { phone, name, address } = req.body; 

    const sql = `UPDATE userAddress SET name = ?, address = ? WHERE phone = ?`;

    console.log(`${phone}`)
    db.run(sql, [name, address, phone], (err) => {
        if (err) {
            console.error("Error updating address:", err.message);
            return res.status(500).json({ success: false, message: "error editing" });
        }
        console.log("Address updated successfully");
        res.redirect("/user-address");
    });
});



// เสิร์ฟหน้าuser-changepass
app.get("/user-changepass", (req, res) => {
    res.render("user-changepass");
});

app.post("/user-changepass", (req, res) => {
    console.log(req.body);
    
    let change = {
        oldpass: req.body.oldpass,
        newpass: req.body.newpass,
        confirmnewpass: req.body.confirmnewpass
    };

    const email = req.session.userEmail;

    if (!change.oldpass || !change.newpass || !change.confirmnewpass) {
        return res.status(400).send('<script>alert("Please fill all fields!"); window.location.href="/change-password";</script>');
    }

    if (change.newpass !== change.confirmnewpass) {
        return res.status(400).send('<script>alert("New passwords do not match!"); window.location.href="/change-password";</script>');
    }

    let sql = `SELECT pssword FROM userInfo WHERE email = ?`;
    
    db.get(sql, [email], (err, row) => {
        if (err) {
            console.log(err.message);
            return res.status(500).send("Database Error");
        }

        if (!row) {
            return res.status(404).send('<script>alert("User not found!"); window.location.href="/change-password";</script>');
        }

        // เปรียบเทียบรหัสผ่านเก่ากับที่เก็บในฐานข้อมูล
        bcrypt.compare(change.oldpass, row.pssword, (err, isMatch) => {
            if (err) {
                console.log(err.message);
                return res.status(500).send("Error comparing passwords");
            }

            if (!isMatch) {
                return res.status(400).send('<script>alert("Invalid old password!"); window.location.href="/change-password";</script>');
            }

            // Hash รหัสผ่านใหม่
            bcrypt.hash(change.newpass, 10, (err, hashedPassword) => {
                if (err) {
                    console.log(err.message);
                    return res.status(500).send("Error hashing password");
                }

                let updateSql = `UPDATE userInfo SET pssword = ? WHERE email = ?`;
                db.run(updateSql, [hashedPassword, email], (err) => {
                    if (err) {
                        console.log(err.message);
                        return res.status(500).send("Update database error");
                    }

                    console.log("Password updated successfully");
                    return res.send('<script>alert("Password updated successfully!"); window.location.href="/";</script>');
                });
            });
        });
    });
});



//เสิร์ฟหน้าcompare
app.get("/compare", (req, res) => {
    const query = `
        SELECT 
            p.*, 
            sc.subID,
            sc.subName, 
            pc.categoryID,
            pc.categoryName,
            CASE 
                WHEN f.productID IS NOT NULL THEN 1 ELSE 0 
            END AS isFavorited
        FROM ProductList p
        JOIN FavoriteList f ON p.productID = f.productID
        JOIN subCategory sc ON p.categoryID = sc.categoryID AND p.subID = sc.subID
        JOIN productCategory pc ON sc.categoryID = pc.categoryID
        WHERE f.email = ?;
    `;
    const userEmail = res.locals.userEmail || null;
    db.all(query, [userEmail], (err, rows) => {
        if (err) {
            console.log("❗" + err.message);
        }
        res.render("compare", { product: rows, userEmail });
    });
});






// เสิร์ฟหน้าfavorites
app.get("/favorites", (req, res) => {
    const query = `
        SELECT 
            p.*, 
            sc.subID,
            sc.subName, 
            pc.categoryID,
            pc.categoryName,
            CASE 
                WHEN f.productID IS NOT NULL THEN 1 ELSE 0 
            END AS isFavorited
        FROM ProductList p
        JOIN FavoriteList f ON p.productID = f.productID
        JOIN subCategory sc ON p.categoryID = sc.categoryID AND p.subID = sc.subID
        JOIN productCategory pc ON sc.categoryID = pc.categoryID
        WHERE f.email = ?;
    `;
    const userEmail = res.locals.userEmail || null;
    db.all(query, [userEmail], (err, rows) => {
        if (err) {
            console.log("❗" + err.message);
        }
        res.render("favorites", { product: rows, userEmail });
    });
});

// เสิร์ฟหน้า ของ provider

// เสิร์ฟหน้า ของ productList
app.get("/provider-productList", (req, res) => {
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
    const categoryQuery = `
        SELECT 
            pc.categoryID, 
            pc.categoryName, 
            sc.subID, 
            sc.subName
        FROM 
            productCategory pc
        JOIN 
            subCategory sc ON pc.categoryID = sc.categoryID;
    `;

    db.all(query, (err, rows) => {
        if (err) {
            console.log("❗" + err.message);
            return;
        }

        db.all(categoryQuery, (err, categoryRows) => {
            if (err) {
                console.log("❗" + err.message);
                return;
            }

            const categories = {};
            categoryRows.forEach((row) => {
                if (!categories[row.categoryID]) {
                    categories[row.categoryID] = {
                        categoryName: row.categoryName,
                        subCategories: {}
                    };
                }
                categories[row.categoryID].subCategories[row.subID] = row.subName;
            });

            res.render("provider-productList", { product: rows, categories: categories });
        });
    });
});

// เสิร์ฟหน้า ของ addProduct
app.get("/provider-addProduct", (req, res) => {
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
    const categoryQuery = `
        SELECT 
            pc.categoryID, 
            pc.categoryName, 
            sc.subID, 
            sc.subName
        FROM 
            productCategory pc
        JOIN 
            subCategory sc ON pc.categoryID = sc.categoryID;
    `;

    db.all(query, (err, rows) => {
        if (err) {
            console.log("❗" + err.message);
            return;
        }

        db.all(categoryQuery, (err, categoryRows) => {
            if (err) {
                console.log("❗" + err.message);
                return;
            }

            const categories = {};
            categoryRows.forEach((row) => {
                if (!categories[row.categoryID]) {
                    categories[row.categoryID] = {
                        categoryName: row.categoryName,
                        subCategories: {}
                    };
                }
                categories[row.categoryID].subCategories[row.subID] = row.subName;
            });

            res.render("provider-addProduct", { product: rows, categories: categories });
        });
    });
});
// เสิร์ฟหน้า ของ addOption
app.get("/provider-addOption", (req, res) => {
    const query = `
            SELECT p.productName, o.* FROM ProductList p
            JOIN productOption o WHERE  o.productID = p.productID
            ORDER BY productID ASC, optionType ASC;
    `;
    const categoryQ = `
        SELECT 
            pc.categoryID, 
            pc.categoryName, 
            sc.subID, 
            sc.subName
        FROM 
            productCategory pc
        JOIN 
            subCategory sc ON pc.categoryID = sc.categoryID;
    `;
    const optionQ = `
        SELECT DISTINCT optionType
        FROM productOption;
    `;
    const prodIdNameQ = `
        SELECT DISTINCT productName, productID, brand
        FROM ProductList
        ORDER BY productID ASC;

    `;

    db.all(query, (err, rows) => {
        if (err) {
            console.log("❗" + err.message);
            return;
        }

        db.all(categoryQ, (err, categoryRows) => {
            if (err) {
                console.log("❗" + err.message);
                return;
            }

            const categories = {};
            categoryRows.forEach((row) => {
                if (!categories[row.categoryID]) {
                    categories[row.categoryID] = {
                        categoryName: row.categoryName,
                        subCategories: {}
                    };
                }
                categories[row.categoryID].subCategories[row.subID] = row.subName;
            });

            db.all(optionQ, (err, oRows) => {
                if (err) {
                    console.log("❗" + err.message);
                    return;
                }
    
                db.all(prodIdNameQ, (err, iRows) => {
                    if (err) {
                        console.log("❗" + err.message);
                        return;
                    }
                    res.render("provider-addOption", { product: rows, categories: categories, options: oRows, idName : iRows});
                });
            });
        });
    });
});


// เสิร์ฟหน้า ของ productHistory
app.get("/provider-productHistory", (req, res) => {
    const query = `
        SELECT 
            h.*, 
            p.productName
        FROM providerEditHistory h
        LEFT JOIN ProductList p ON h.productID = p.productID
        ORDER BY h.modifiedTimestamp DESC;

    `;
    const categoryQuery = `
        SELECT 
            pc.categoryID, 
            pc.categoryName, 
            sc.subID, 
            sc.subName
        FROM 
            productCategory pc
        JOIN 
            subCategory sc ON pc.categoryID = sc.categoryID;
    `;

    db.all(query, (err, rows) => {
        if (err) {
            console.log("❗" + err.message);
            return;
        }

        db.all(categoryQuery, (err, categoryRows) => {
            if (err) {
                console.log("❗" + err.message);
                return;
            }

            const categories = {};
            categoryRows.forEach((row) => {
                if (!categories[row.categoryID]) {
                    categories[row.categoryID] = {
                        categoryName: row.categoryName,
                        subCategories: {}
                    };
                }
                categories[row.categoryID].subCategories[row.subID] = row.subName;
            });

            res.render("provider-productHistory", { product: rows, categories: categories });
        });
    });
});

// เสิร์ฟหน้า ของ orderHistory
app.get("/provider-orderHistory", (req, res) => {
    const userEmail = req.session.userEmail;

    //ไว้เสิช
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

    const categoryQuery = `
        SELECT 
            pc.categoryID, 
            pc.categoryName, 
            sc.subID, 
            sc.subName
        FROM 
            productCategory pc
        JOIN 
            subCategory sc ON pc.categoryID = sc.categoryID;
    `;

    const userQ = 'SELECT * FROM userInfo';

    //orderList OrderDetails
    const orderQuery = `
        SELECT o.orderId, o.email, o.orderDate, o.orderStatus, 
               o.totalPrice, o.name, o.phone, o.address, o.paymentMethod, 
               u.username 
        FROM orderList o
        JOIN userInfo u ON o.email = u.email
    `;

    const detailQuery = `
        SELECT d.orderID, d.detailID, d.productID, d.productName, 
               d.customValue, d.quantities, d.eachTotalPrice
        FROM OrderDetails d
        JOIN orderList o ON d.orderID = o.orderId
    `;

    db.all(query, (err, productRows) => {
        if (err) {
            console.error("❗ Error fetching products:", err.message);
            return res.status(500).send("Database error.");
        }

        db.all(categoryQuery, (err, categoryRows) => {
            if (err) {
                console.error("❗ Error fetching categories:", err.message);
                return res.status(500).send("Database error.");
            }

            const categories = {};
            categoryRows.forEach((row) => {
                if (!categories[row.categoryID]) {
                    categories[row.categoryID] = {
                        categoryName: row.categoryName,
                        subCategories: {}
                    };
                }
                categories[row.categoryID].subCategories[row.subID] = row.subName;
            });

            db.all(userQ, (err, userRows) => {
                if (err) {
                    console.error("❗ Error fetching users:", err.message);
                    return res.status(500).send("Database error.");
                }

                db.all(orderQuery, (err, orders) => {
                    if (err) {
                        console.error("❗ Error orders:", err.message);
                        return res.status(500).send("Database error.");
                    }

                    db.all(detailQuery, (err, details) => {
                        if (err) {
                            console.error("❗ Error  orderDetails:", err.message);
                            return res.status(500).send("Database error.");
                        }

                        // orderID + details
                        const orderData = orders.map(order => ({
                            ...order,
                            details: details.filter(d => d.orderID === order.orderId)
                        }));

                        res.render("provider-orderHistory", { 
                            product: productRows, 
                            categories: categories, 
                            user: userRows,
                            orders: orderData 
                        });
                    });
                });
            });
        });
    });
});
app.post("/change-orderStatus", (req, res) => {
    const { orderId, orderStatus } = req.body;
    const updateQuery = `UPDATE orderList SET orderStatus = ? WHERE orderId = ?`;
    db.run(updateQuery, [orderStatus, orderId], function (err) {
        if (err) {
            console.log("❗ Error updating order status:", err.message);
            return res.json({ success: false });
        }
        res.json({ success: true });
    });
});


// เสิร์ฟหน้า ของ orderlist
app.get("/user-orderlist", (req, res) => {
    const userEmail = req.session.userEmail;

    const orderQ = `
        SELECT o.orderId, o.email, o.orderDate, o.orderStatus, 
               o.totalPrice, o.name, o.phone, o.address, o.paymentMethod, 
               u.username 
        FROM orderList o
        JOIN userInfo u ON o.email = u.email
        WHERE o.email = ?;
    `;

    const detailQ = `
        SELECT d.orderID, d.detailID, d.productID, d.productName, 
               d.customValue, d.quantities, d.eachTotalPrice
        FROM OrderDetails d
        JOIN orderList o ON d.orderID = o.orderId
        WHERE o.email = ?;
    `;

    db.all(orderQ, [userEmail], (err, orders) => {
        if (err) {
            console.error("❗Error ordersQ :", err.message);
            return res.status(500).send("Database error.");
        }

        db.all(detailQ, [userEmail], (err, details) => {
            if (err) {
                console.error("❗Error detailQ :", err.message);
                return res.status(500).send("Database error.");
            }

            const orderData = orders.map(order => ({
                ...order,
                details: details.filter(d => d.orderID === order.orderId)
            }));

            res.render("user-orderlist", { orders: orderData });
        });
    });
});

// เสิร์ฟหน้า ของ user-pending
app.get("/user-pending", (req, res) => {
    const userEmail = req.session.userEmail;

    const orderQ = `
        SELECT o.orderId, o.email, o.orderDate, o.orderStatus, 
               o.totalPrice, o.name, o.phone, o.address, o.paymentMethod, 
               u.username 
        FROM orderList o
        JOIN userInfo u ON o.email = u.email
        WHERE o.email = ? AND o.orderStatus = "ที่ต้องจัดส่ง";
    `;

    const detailQ = `
        SELECT d.orderID, d.detailID, d.productID, d.productName, 
               d.customValue, d.quantities, d.eachTotalPrice
        FROM OrderDetails d
        JOIN orderList o ON d.orderID = o.orderId
        WHERE o.email = ?;
    `;

    db.all(orderQ, [userEmail], (err, orders) => {
        if (err) {
            console.error("❗Error ordersQ :", err.message);
            return res.status(500).send("Database error.");
        }

        db.all(detailQ, [userEmail], (err, details) => {
            if (err) {
                console.error("❗Error detailQ :", err.message);
                return res.status(500).send("Database error.");
            }

            const orderData = orders.map(order => ({
                ...order,
                details: details.filter(d => d.orderID === order.orderId)
            }));

            res.render("user-pending", { orders: orderData });
        });
    });
});

// เสิร์ฟหน้า ของ user-shipping
app.get("/user-shipping", (req, res) => {
    const userEmail = req.session.userEmail;

    const orderQ = `
        SELECT o.orderId, o.email, o.orderDate, o.orderStatus, 
               o.totalPrice, o.name, o.phone, o.address, o.paymentMethod, 
               u.username 
        FROM orderList o
        JOIN userInfo u ON o.email = u.email
        WHERE o.email = ? AND o.orderStatus = "ที่ต้องได้รับ";
    `;

    const detailQ = `
        SELECT d.orderID, d.detailID, d.productID, d.productName, 
               d.customValue, d.quantities, d.eachTotalPrice
        FROM OrderDetails d
        JOIN orderList o ON d.orderID = o.orderId
        WHERE o.email = ?;
    `;

    db.all(orderQ, [userEmail], (err, orders) => {
        if (err) {
            console.error("❗Error ordersQ :", err.message);
            return res.status(500).send("Database error.");
        }

        db.all(detailQ, [userEmail], (err, details) => {
            if (err) {
                console.error("❗Error detailQ :", err.message);
                return res.status(500).send("Database error.");
            }

            const orderData = orders.map(order => ({
                ...order,
                details: details.filter(d => d.orderID === order.orderId)
            }));

            res.render("user-shipping", { orders: orderData });
        });
    });
});

// เสิร์ฟหน้า ของ user-completed
app.get("/user-completed", (req, res) => {
    const userEmail = req.session.userEmail;

    const orderQ = `
        SELECT o.orderId, o.email, o.orderDate, o.orderStatus, 
               o.totalPrice, o.name, o.phone, o.address, o.paymentMethod, 
               u.username 
        FROM orderList o
        JOIN userInfo u ON o.email = u.email
        WHERE o.email = ? AND o.orderStatus = "สำเร็จ";
    `;

    const detailQ = `
        SELECT d.orderID, d.detailID, d.productID, d.productName, 
               d.customValue, d.quantities, d.eachTotalPrice
        FROM OrderDetails d
        JOIN orderList o ON d.orderID = o.orderId
        WHERE o.email = ?;
    `;

    db.all(orderQ, [userEmail], (err, orders) => {
        if (err) {
            console.error("❗Error ordersQ :", err.message);
            return res.status(500).send("Database error.");
        }

        db.all(detailQ, [userEmail], (err, details) => {
            if (err) {
                console.error("❗Error detailQ :", err.message);
                return res.status(500).send("Database error.");
            }

            const orderData = orders.map(order => ({
                ...order,
                details: details.filter(d => d.orderID === order.orderId)
            }));

            res.render("user-completed", { orders: orderData });
        });
    });
});

// เสิร์ฟหน้า ของ user-canceled
app.get("/user-canceled", (req, res) => {
    const userEmail = req.session.userEmail;

    const orderQ = `
        SELECT o.orderId, o.email, o.orderDate, o.orderStatus, 
               o.totalPrice, o.name, o.phone, o.address, o.paymentMethod, 
               u.username 
        FROM orderList o
        JOIN userInfo u ON o.email = u.email
        WHERE o.email = ? AND o.orderStatus = "ยกเลิกแล้ว";
    `;

    const detailQ = `
        SELECT d.orderID, d.detailID, d.productID, d.productName, 
               d.customValue, d.quantities, d.eachTotalPrice
        FROM OrderDetails d
        JOIN orderList o ON d.orderID = o.orderId
        WHERE o.email = ?;
    `;

    db.all(orderQ, [userEmail], (err, orders) => {
        if (err) {
            console.error("❗Error ordersQ :", err.message);
            return res.status(500).send("Database error.");
        }

        db.all(detailQ, [userEmail], (err, details) => {
            if (err) {
                console.error("❗Error detailQ :", err.message);
                return res.status(500).send("Database error.");
            }

            const orderData = orders.map(order => ({
                ...order,
                details: details.filter(d => d.orderID === order.orderId)
            }));

            res.render("user-canceled", { orders: orderData });
        });
    });
});

app.post("/add-to-cart", (req, res) => {

    const userEmail = res.locals.userEmail || null;
    if (!userEmail) {
        return res.status(401).json({ success: false, message: "กรุณาเข้าสู่ระบบ" });
    }

    const { productID, selectedOptions } = req.body;
    //จากใน js
    //selectedOptions[optionType] = { optionName, addPrice };
    //selectedOptions[optionName] = { optionName, customValue, addPrice: 0 };
    if (!productID || !selectedOptions) {
        return res.status(400).json({ error: "ข้อมูลไม่ครบ" });
    }

    let totalPrice = 0;

    let selectedOptionsArray;

    try {
        selectedOptionsArray = JSON.parse(selectedOptions); // แปลงกลับเป็นอาร์เรย์
    } catch (error) {
        return res.status(400).json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" });
    }
    for (let option of selectedOptionsArray) {
        totalPrice += option.addPrice || 0;
    }

    let optionsString = JSON.stringify(selectedOptionsArray);
    for (let key in selectedOptionsArray) {
        let { customName, customValue, addPrice } = selectedOptionsArray[key];
        totalPrice += addPrice;
    }
    console.log(optionsString);
    const query = `
                    INSERT INTO CustomerCart (email, productID, customValue, quantities)
                    VALUES ( ? ,  ? ,  ? , 1)
                    ON CONFLICT(email, productID, customValue)
                    DO UPDATE SET quantities = quantities + 1;
                    `;

    db.run(query, [userEmail, productID, optionsString], function (err) {
        if (err) {
            console.log(err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, message: "เพิ่มลงตะกร้าเรียบร้อย", totalPrice });
    });
});

app.post("/add-to-fav", (req, res) => {
    const { productID, userEmail } = req.body;
    if (!userEmail) {
        return res.redirect('/login');
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
            const insertQ = `
                INSERT INTO FavoriteList (productID, email) 
                VALUES (?, ?);
            `;

            db.run(insertQ, [productID, userEmail], function (err) {
                if (err) {
                    console.log("❗ Error: " + err.message);
                } else {
                    const updateFavCountQ = `
                        UPDATE ProductList 
                        SET favoritesCount = favoritesCount + 1 
                        WHERE productID = ?;
                    `;
                    db.run(updateFavCountQ, [productID]);
                }
            });
        } else {
            const updateFavCountQ = `
                UPDATE ProductList 
                SET favoritesCount = favoritesCount - 1 
                WHERE productID = ?;
            `;
            db.run(updateFavCountQ, [productID]);
        }
    });
});

app.post("/add-to-productlist", (req, res) => {
    const { productID, productName, categoryID, subID, price, brand, description, modifiedTimestamp } = req.body;
    const userEmail = res.locals.userEmail;

    const checkProductQ = `
        SELECT * FROM ProductList WHERE productID = ?;
    `;

    db.get(checkProductQ, [productID], (err, row) => {
        if (err) {
            console.log("❗เช็คไม่สำเร็จ Error: " + err.message);
        }
        //if ถ้ามีจะเพิ่มจำนวน else ถ้าไม่มีจะ insert
        if (row) {
            const updateQ = `
                UPDATE ProductList
                SET productName = ?, categoryID = ?, price = ?, subID = ?, brand = ?, description = ?
                WHERE productID = ?;
            `;

            db.run(updateQ, [productName, categoryID, price, subID, brand, description, productID], function (err) {
                if (err) {
                    console.log("❗อัปเดตไม่สำเร็จ Error: " + err.message);
                }

                console.log(updateQ);
                insertEditHistory(productID, modifiedTimestamp, userEmail, "แก้ไขข้อมูลสินค้า");
                return res.json({ success: true, message: "✅แก้ไขข้อมูลสินค้าสำเร็จ" });
            });
        } else {
            const addedDate = new Date().toISOString();

            const insertQ = `
                INSERT INTO ProductList (productID, productName, categoryID, price, brand, description, subID, addedDate)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            `;

            db.run(insertQ, [productID, productName, categoryID, price, brand, description, subID, addedDate], function (err) {
                if (err) {
                    console.log("❗เพิ่มข้อมูลไม่สำเร็จ Error: " + err.message);
                }
                insertEditHistorySaveName(productID, productName, modifiedTimestamp, userEmail, "เพิ่มสินค้าใหม่");
                return res.json({ success: true, message: "✅เพิ่มสินค้าใหม่สำเร็จ" });
            });
        }
    });
});

app.post("/update-to-productlist", (req, res) => {
    const { productID, productName, price, brand, description, modifiedTimestamp } = req.body;
    const userEmail = res.locals.userEmail;
    const updateQ = `
                UPDATE ProductList
                SET productName = ?, price = ?, brand = ?, description = ?
                WHERE productID = ?;
            `;

    db.run(updateQ, [productName, price, brand, description, productID], function (err) {
        if (err) {
            console.log("❗อัปเดตไม่สำเร็จ Error: " + err.message);
            return res.status(500).json({ success: false, message: "❌เกิดข้อผิดพลาดในการอัปเดตข้อมูลสินค้า" });
        }

        insertEditHistorySaveName(productID, productName, modifiedTimestamp, userEmail, "แก้ไขข้อมูลสินค้า");
        return res.json({ success: true, message: "✅แก้ไขข้อมูลสินค้าสำเร็จ" });
    });
});

app.post("/del-to-productlist", (req, res) => {
    const { productID, productName, categoryID, subID, price, stockNum, modifiedTimestamp } = req.body;
    const userEmail = res.locals.userEmail;

    const checkProductQ = `SELECT * FROM ProductList WHERE productID = ?;`;

    db.get(checkProductQ, [productID], (err, row) => {
        if (err) {
            console.log("❗เช็คไม่สำเร็จ Error: " + err.message);
            return res.status(500).json({ success: false, message: "❗เช็คไม่สำเร็จ Error: " + err.message });
        }
        if (!row) {
            console.log("ไม่พบข้อมูลสินค้า");
            return res.status(500).json({ success: false, message: "❌ไม่พบข้อมูลสินค้า" });
        }
        db.serialize(() => {
            db.run(`DELETE FROM "productOption" WHERE "productID" = ?;`, [productID]);
            db.run(`DELETE FROM "orderDetails" WHERE "productID" = ?;`, [productID]);
            db.run(`DELETE FROM "productImage" WHERE "productID" = ?;`, [productID]);
            db.run(`DELETE FROM "FavoriteList" WHERE "productID" = ?;`, [productID]);
            db.run(`DELETE FROM "ProductList" WHERE "productID" = ?;`, [productID], function (err) {
                if (err) {
                    console.log("❗อัปเดตไม่สำเร็จ Error: " + err.message);
                    return res.status(500).json({ success: false, message: "❗อัปเดตไม่สำเร็จ " + err.message });
                }

                insertEditHistorySaveName(productID, productName, modifiedTimestamp, userEmail, `ลบสินค้า`);
                return res.json({ success: true, message: "✅ ลบข้อมูลสินค้าสำเร็จ" });
            });
        });
    });
});
//productOption
app.post("/provider-update-custom", async (req, res) => {
    const { modifiedTimestamp, optionData } = req.body;
    const userEmail = res.locals.userEmail;

    if (!optionData || optionData.length === 0) {
        return res.status(400).json({ success: false, message: "❗ ไม่พบข้อมูล" });
    }

    try {
        await Promise.all(optionData.map(async ({ productID, optionName, recommendedSize, optionType }) => {
            const checkOptionQ = `SELECT * FROM productOption WHERE productID = ? AND optionName = ?;`;
            
            const row = await new Promise((resolve, reject) => {
                db.get(checkOptionQ, [productID, optionName], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (row) {
                const updateQ = `UPDATE productOption SET recommendedSize = ? WHERE productID = ? AND optionName = ?;`;
                
                await new Promise((resolve, reject) => {
                    db.run(updateQ, [recommendedSize, productID, optionName], function (err) {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                await insertEditHistory(productID, modifiedTimestamp, userEmail, "แก้ไขการกำหนดขนาดสินค้า");
            } else {
                const insertQ = `
                    INSERT INTO productOption (optionType, optionName, recommendedSize, productID, addPrice)
                    VALUES (?, ?, ?, ?, 0);
                `;

                await new Promise((resolve, reject) => {
                    db.run(insertQ, [optionType, optionName, recommendedSize, productID], function (err) {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                await insertEditHistory(productID, modifiedTimestamp, userEmail, "เพิ่มการกำหนดขนาดสินค้า");
            }
        }));

        res.json({ success: true, message: "✅ อัปเดตข้อมูลสำเร็จ" });

    } catch (error) {
        console.error("❗ Error:", error);
        res.status(500).json({ success: false, message: "❗ เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
    }
});


app.post("/add-to-productOption", (req, res) => {
    const { modifiedTimestamp, optionData } = req.body;
    const userEmail = res.locals.userEmail;

    if (!optionData || optionData.length === 0) {
        return res.status(400).json({ success: false, message: "❗ ไม่พบข้อมูล" });
    }

    const insertQ = `INSERT INTO productOption (optionType, optionName, productID, addPrice) VALUES (?, ?, ?, ?);`;

    const insertPromises = optionData.map((option) => {
        return new Promise((resolve, reject) => {
            db.run(insertQ, [option.optionType, option.optionName, option.productID, option.addPrice], function (err) {
                if (err) {
                    console.log("❗ Error : " + err.message);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    });

    Promise.all(insertPromises)
        .then(() => {
            insertEditHistory(optionData[0].productID, modifiedTimestamp, userEmail, "เพิ่มตัวเลือกสินค้า");
            res.json({ success: true, message: "✅ เพิ่มตัวเลือกสินค้าสำเร็จ" });
        })
        .catch((err) => {
            res.status(500).json({ success: false, message: "❗ ไม่สามารถเพิ่มตัวเลือกสินค้าได้" });
        });
});


app.post("/del-to-productOption", (req, res) => {
    const { modifiedTimestamp, optionData } = req.body;
    const userEmail = res.locals.userEmail;

    if (!optionData || optionData.length === 0) {
        return res.status(400).json({ success: false, message: "❗ ไม่พบข้อมูล" });
    }

    const delQ = `DELETE FROM productOption WHERE productID = ? AND optionType= ? AND optionName= ? ;`;

    const deletePromises = optionData.map((option) => {
        return new Promise((resolve, reject) => {
            db.run(delQ, [option.productID, option.optionType, option.optionName], function (err) {
                if (err) {
                    console.log("❗ Error : " + err.message);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    });

    Promise.all(deletePromises)
        .then(() => {
            insertEditHistory(optionData[0].productID, modifiedTimestamp, userEmail, "ลบตัวเลือกสินค้า");
            res.json({ success: true, message: "✅ ลบตัวเลือกสินค้าสำเร็จ" });
        })
        .catch((err) => {
            res.status(500).json({ success: false, message: "❗ ไม่สามารถลบตัวเลือกสินค้าได้" });
        });
});
function insertEditHistory(productID, modifiedTimestamp, userEmail, modifiedType) {
    const historyQ = `
        INSERT INTO providerEditHistory (productID, modifiedTimestamp, email, modifiedType)
        VALUES (?, ?, ?, ?);
    `;

    db.run(historyQ, [productID, modifiedTimestamp, userEmail, modifiedType], function (err) {
        if (err) {
            console.log("❗ Error: " + err.message);
        } else {
            console.log("✅อัปเดตสินค้าและบันทึกประวัติสำเร็จ");
        }
    });
}
function insertEditHistorySaveName(productID, productName, modifiedTimestamp, userEmail, modifiedType) {
    const historyQ = `
        INSERT INTO providerEditHistory (productID, modifiedTimestamp, email, modifiedType, productDelName)
        VALUES (?, ?, ?, ?, ?);
    `;

    db.run(historyQ, [productID, modifiedTimestamp, userEmail, modifiedType, productName], function (err) {
        if (err) {
            console.log("❗ Error: " + err.message);
        } else {
            console.log("✅อัปเดตสินค้าและบันทึกประวัติสำเร็จ");
        }
    });
}

//post ตะกร้าสินค้า
app.post("/del-from-cart", (req, res) => {
    const { productID, customValue, products } = req.body;
    const customStr = JSON.stringify(customValue);
    const userEmail = res.locals.userEmail;
    if (!userEmail) {
        return res.status(401).json({ success: false, message: "กรุณาเข้าสู่ระบบ" });
    }

    if (products) {
        //ลบหลายชิ้น
        const deleteQ = "DELETE FROM CustomerCart WHERE email = ? AND productID = ? AND customValue = ?";

        db.serialize(() => {
            const qLoops = db.prepare(deleteQ);
            products.forEach(product => {
                qLoops.run(userEmail, product.productID, JSON.stringify(product.customValue));
            });
            qLoops.finalize();
        });

        return res.json({ success: true });
    }

    if (productID && customValue) {
        const deleteQuery = "DELETE FROM CustomerCart WHERE email = ? AND productID = ? AND customValue = ?";
        db.run(deleteQuery, [userEmail, productID, customStr], function (err) {
            if (err) {

                console.error("❗ Error: ", err);
                return res.status(500).json({ success: false, message: "ไม่สามารถลบสินค้าได้" });
            }
            res.json({ success: true });
        });
    } else {
        res.json({ success: false });
    }
});
app.post("/update-quantity", (req, res) => {
    const { productID, customValue, action } = req.body;
    const customStr = JSON.stringify(customValue);
    const userEmail = res.locals.userEmail;
    db.get(
        "SELECT quantities FROM CustomerCart WHERE email = ? AND productID = ? AND customValue = ?",
        [userEmail, productID, customStr],
        (err, row) => {
            if (err) {
                console.error(err);
                return res.json({ success: false });
            }
            if (!row) return res.json({ success: false, message: "สินค้าไม่พบ" });

            let newQuantity = row.quantities;
            if (action === "increase") newQuantity++;
            else if (action === "decrease") newQuantity--;

            if (newQuantity <= 0) {
                db.run(
                    "DELETE FROM CustomerCart WHERE email = ? AND productID = ? AND customValue = ?",
                    [userEmail, productID, customStr],
                    (err) => {
                        if (err) return res.json({ success: false });
                        res.json({ success: true, deleted: true });
                    }
                );
            } else {
                db.run(
                    "UPDATE CustomerCart SET quantities = ? WHERE email = ? AND productID = ? AND customValue = ?",
                    [newQuantity, userEmail, productID, customStr],
                    (err) => {
                        if (err) return res.json({ success: false });
                        res.json({ success: true, newQuantity });
                    }
                );
            }
        }
    );
});
app.post("/cart-checkout", (req, res) => {
    const { products } = req.body;
    console.log("/cart-checkout : ", products)
    //req.session.orderDetail = JSON.stringify(products);
    req.session.orderDetail = products;
    console.log("/cart-checkout session: ", req.session.orderDetail)

    const userEmail = res.locals.userEmail;
    if (!userEmail) {
        return res.status(401).json({ success: false, message: "กรุณาเข้าสู่ระบบ" });
    }
    res.json({ success: true, redirectTo: "/checkout" });
});
app.post("/checkout-create-orderList", (req, res) => {
    const orderDetail = res.locals.orderDetail;
    const userEmail = res.locals.userEmail;
    const orderList = req.body;
    console.log("orderList", orderList);
    //req.session.orderDetail = JSON.stringify(products);
    req.session.totalPrice = orderList.totalPrice;
    req.session.orderList = orderList;
    console.log("/checkout-create-orderList sessions: ", req.session.orderList, orderDetail);
    if (!userEmail) {
        return res.status(401).json({ success: false, message: "กรุณาเข้าสู่ระบบ" });
    }
    
    //paymentMethod
    if (orderList.paymentMethod === "ชำระเงินผ่าน promptpay"){
        res.json({ success: true, redirectTo: "/prompay" });
    } else {
        res.json({ success: true, redirectTo: "/debit" });
    }
});

//prompay
// หมายเลขพร้อมเพย์และจำนวนเงิน
const phoneNumber = "0655047562";
//const amount = 300.00; // จำนวนเงินที่ fix คงที่

app.get('/qr', async (req, res) => {
    const amount = parseFloat(res.locals.totalPrice);
    try {
        const qrData = promptpay(phoneNumber, amount); // สร้างข้อมูล PromptPay QR
        QRCode.toDataURL(qrData, (error, qrImage) => {
            if (error) {
                console.error("Error:", error.message);
                return res.status(500).send("❌ ไม่สามารถสร้าง QR Code ได้");
            }
            res.send(`<img src="${qrImage}" alt="PromptPay QR Code">`);
        });
    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).send("❌ ไม่สามารถสร้าง QR Code ได้");
    }
});


// กำหนดโฟลเดอร์เก็บไฟล์อัปโหลด
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, 'slip_' + Date.now() + path.extname(file.originalname)); // ตั้งชื่อไฟล์ที่อัปโหลด
    }
});
const upload = multer({ storage });

// API สำหรับอัปโหลดสลิป
app.post('/upload', upload.single('slip'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('❌ กรุณาอัปโหลดไฟล์');
    }
    //อัปลง db
    const orderDetail = req.session.orderDetail;
    const userEmail = res.locals.userEmail;
    const orderList = req.session.orderList;
    //เทสเทส
    console.log("/debit orderList: ", orderList);
    console.log("/debit orderDetail: ", orderDetail);
    console.log("/debit userEmail: ", userEmail);

    if (!userEmail) {
        return res.status(401).json({ success: false, message: "กรุณาเข้าสู่ระบบ" });
    }

    const insertOrderListQ = `
        INSERT INTO orderList (email, orderDate, orderStatus, totalPrice, name, phone, address, paymentMethod)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(insertOrderListQ, [
        userEmail,
        orderList.orderDate,
        orderList.orderStatus,
        orderList.totalPrice,
        orderList.name,
        orderList.phone,
        orderList.address,
        orderList.paymentMethod
    ], function (err) {
        if (err) {
            console.error("Error inserting orderList:", err.message);
            return res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึก orderList" });
        }

        const orderID = this.lastID;
        console.log("ID ล่าสุดของ orderList:", orderID);

        const insertOrderDetailQ = `
            INSERT INTO OrderDetails (orderID, productID, productName, customValue, quantities, eachTotalPrice)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const stmt = db.prepare(insertOrderDetailQ);
        orderDetail.forEach(item => {
            stmt.run([
                orderID,
                item.productID,
                item.productName,
                item.customValue,
                item.quantities,
                item.eachTotalPrice
            ], err => {
                if (err) {
                    console.error("Error inserting orderDetail:", err.message);
                }
            });

            const deleteQuery = `
                DELETE FROM CustomerCart 
                WHERE email = ? AND productID = ? AND customValue = ?
            `;

            db.run(deleteQuery, [userEmail, item.productID, item.customValue], function(err) {
                if (err) {
                    console.error("Error deleting from CustomerCart:", err.message);
                } else {
                    console.log(`ลบ ${item.productID} จากตะกร้าของ ${userEmail}`);
                }
            });
        });
        stmt.finalize();
        res.send('✅ อัปโหลดสลิปสำเร็จ! ไฟล์: ' + req.file.filename);
    });
});

// เสิร์ฟหน้า ของ PromptPay
app.get('/prompay', (req, res) => {
    const amount = parseFloat(res.locals.totalPrice);
    // ส่งข้อมูล amount ไปยัง EJS
    res.render('prompay', { amount }); 
});
//prompay

// เสิร์ฟหน้า ของ PromptPay
app.get('/debit', (req, res) => {
    const orderDetail = req.session.orderDetail;
    const userEmail = res.locals.userEmail;
    const orderList = req.session.orderList;
    //เทสเทส
    console.log("/debit orderList: ", orderList);
    console.log("/debit orderDetail: ", orderDetail);
    console.log("/debit userEmail: ", userEmail);

    if (!userEmail) {
        return res.status(401).json({ success: false, message: "กรุณาเข้าสู่ระบบ" });
    }

    const insertOrderListQ = `
        INSERT INTO orderList (email, orderDate, orderStatus, totalPrice, name, phone, address, paymentMethod)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(insertOrderListQ, [
        userEmail,
        orderList.orderDate,
        orderList.orderStatus,
        orderList.totalPrice,
        orderList.name,
        orderList.phone,
        orderList.address,
        orderList.paymentMethod
    ], function (err) {
        if (err) {
            console.error("Error inserting orderList:", err.message);
            return res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึก orderList" });
        }

        const orderID = this.lastID;
        console.log("ID ล่าสุดของ orderList:", orderID);

        const insertOrderDetailQ = `
            INSERT INTO OrderDetails (orderID, productID, productName, customValue, quantities, eachTotalPrice)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const stmt = db.prepare(insertOrderDetailQ);
        orderDetail.forEach(item => {
            stmt.run([
                orderID,
                item.productID,
                item.productName,
                item.customValue,
                item.quantities,
                item.eachTotalPrice
            ], err => {
                if (err) {
                    console.error("Error inserting orderDetail:", err.message);
                }
            });

            const deleteQuery = `
                DELETE FROM CustomerCart 
                WHERE email = ? AND productID = ? AND customValue = ?
            `;

            db.run(deleteQuery, [userEmail, item.productID, item.customValue], function(err) {
                if (err) {
                    console.error("Error deleting from CustomerCart:", err.message);
                } else {
                    console.log(`ลบ ${item.productID} จากตะกร้าของ ${userEmail}`);
                }
            });
        });
        stmt.finalize();
        res.render('debit');
    });
});



// เริ่มเซิร์ฟเวอร์
app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});
