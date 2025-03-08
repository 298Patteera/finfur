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
    saveUninitialized: true,
    cookie: { secure: false },
    secure: false
}));
// ทำให้ email เป็น local ดึงข้อมูลไปใช้ได้ทุก .ejs
app.use((req, res, next) => {
    res.locals.userEmail = req.session.userEmail || null;
    res.locals.orderDetail = req.session.orderDetail || null;
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
    const queryProvider = `SELECT email FROM providerList WHERE email = ?`;

    db.get(query, [email, pssword], (err, user) => {
        if (err) {
            console.log(err.message);
            return res.redirect("/login");
        }

        if (user) {
            req.session.userEmail = email;
            console.log("เข้าสู่ระบบสำเร็จ!");
            //เช็คว่าเป็น customer or provider
            db.get(queryProvider, [email], (err, provider) => {
                if (err) {
                    console.log(err.message);
                    return res.redirect("/login");
                }

                // if (provider) {
                //     return res.redirect("/provider-productList");
                // } else {
                //     return res.redirect("/");
                // }
                if (provider) {
                    req.session.isProvider = true;
                    return res.redirect("/provider-productList");
                } else {
                    req.session.isProvider = false; // ถ้าไม่ใช่ provider
                    return res.redirect("/");
                }
            });
        } else {
            console.log("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง!");
            return res.redirect("/login");
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
            po.*
        FROM ProductList p
        LEFT JOIN productOption po ON p.productID = po.productID
        WHERE p.productID = ?;
    `;

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
            stockNum: rows[0].stockNum,
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
        console.log(product);
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
    db.all(query,[userEmail], (err, rows) => {
        if (err) {
            console.log("❗" + err.message);
        }
        res.render("all-product", { product: rows, userEmail });
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
            pc.categoryName,
            CASE 
                WHEN f.productID IS NOT NULL THEN 1 ELSE 0 
            END AS isFavorited
        FROM ProductList p
        JOIN subCategory sc ON p.categoryID = sc.categoryID AND p.subID = sc.subID
        JOIN productCategory pc ON sc.categoryID = pc.categoryID
        LEFT JOIN FavoriteList f ON p.productID = f.productID AND f.email = ?
        WHERE pc.categoryID = 1;
    `;
    const userEmail = res.locals.userEmail || null;
    db.all(query,[userEmail], (err, rows) => {
        if (err) {
            console.log("❗" + err.message);
        }
        res.render("bed-room", { product: rows, userEmail });
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
            pc.categoryName,
            CASE 
                WHEN f.productID IS NOT NULL THEN 1 ELSE 0 
            END AS isFavorited
        FROM ProductList p
        JOIN subCategory sc ON p.categoryID = sc.categoryID AND p.subID = sc.subID
        JOIN productCategory pc ON sc.categoryID = pc.categoryID
        LEFT JOIN FavoriteList f ON p.productID = f.productID AND f.email = ?
        WHERE pc.categoryID = 2;
    `;
    const userEmail = res.locals.userEmail || null;
    db.all(query,[userEmail], (err, rows) => {
        if (err) {
            console.log("❗" + err.message);
        }
        res.render("living-room", { product: rows, userEmail });
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
            pc.categoryName,
            CASE 
                WHEN f.productID IS NOT NULL THEN 1 ELSE 0 
            END AS isFavorited
        FROM ProductList p
        JOIN subCategory sc ON p.categoryID = sc.categoryID AND p.subID = sc.subID
        JOIN productCategory pc ON sc.categoryID = pc.categoryID
        LEFT JOIN FavoriteList f ON p.productID = f.productID AND f.email = ?
        WHERE pc.categoryID = 3;
    `;
    const userEmail = res.locals.userEmail || null;
    db.all(query,[userEmail], (err, rows) => {
        if (err) {
            console.log("❗" + err.message);
        }
        res.render("kitchen", { product: rows, userEmail });
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
            pc.categoryName,
            CASE 
                WHEN f.productID IS NOT NULL THEN 1 ELSE 0 
            END AS isFavorited
        FROM ProductList p
        JOIN subCategory sc ON p.categoryID = sc.categoryID AND p.subID = sc.subID
        JOIN productCategory pc ON sc.categoryID = pc.categoryID
        LEFT JOIN FavoriteList f ON p.productID = f.productID AND f.email = ?
        WHERE pc.categoryID = 4;
    `;
    const userEmail = res.locals.userEmail || null;
    db.all(query,[userEmail], (err, rows) => {
        if (err) {
            console.log("❗" + err.message);
        }
        res.render("dining-room", { product: rows, userEmail });
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
            pc.categoryName,
            CASE 
                WHEN f.productID IS NOT NULL THEN 1 ELSE 0 
            END AS isFavorited
        FROM ProductList p
        JOIN subCategory sc ON p.categoryID = sc.categoryID AND p.subID = sc.subID
        JOIN productCategory pc ON sc.categoryID = pc.categoryID
        LEFT JOIN FavoriteList f ON p.productID = f.productID AND f.email = ?
        WHERE pc.categoryID = 5;
    `;
    const userEmail = res.locals.userEmail || null;
    db.all(query,[userEmail], (err, rows) => {
        if (err) {
            console.log("❗" + err.message);
        }
        res.render("working-room", { product: rows, userEmail });
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
    db.all(query,[userEmail], (err, rows) => {
        if (err) {
            console.log("❗" + err.message);
        }
        res.render("cart", { product: rows, userEmail });
    });
});
// เสิร์ฟหน้าเช็คเอาท์
app.get("/checkout", (req, res) => {
    console.log("/checkout session data: ", req.session);

    const orderDetail = req.session.orderDetail;
    const userEmail = req.session.userEmail;

    if (!orderDetail) {
        console.log("/checkout : ไม่พบข้อมูล orderDetail");
    } else {
        const totalPrice = orderDetail.reduce((sum, item) => {return sum + Number(item.eachTotalPrice);}, 0);
        const query = `
        SELECT * FROM userAddress
        WHERE email = ?;
    `;
    db.all(query, [userEmail], (err, rows) => {
        if (err) {
            console.log("❗" + err.message);
        }
        console.log("/checkout : ", orderDetail);
        res.render("checkout", { userData: rows, userEmail, orderDetail, totalPrice });
    });
    }
    
    //console.log("/checkout session: ", req.session);

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
    console.log(req.body);
    let change = {
        oldpass: req.body.oldpass,
        newpass: req.body.newpass,
        confirmnewpass: req.body.confirmnewpass
    };

    const email = req.session.userEmail;

    let sql = `SELECT pssword FROM userInfo WHERE email = ?`;
    db.get(sql, [email], (err, row) => {
        if (err) {
            console.log(err.message);
            return res.status(500).send("Database Error");
        }

        if (!row) {
            return res.status(404).send("user not found");
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
    db.all(query,[userEmail], (err, rows) => {
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

            res.render("provider-productList", { product: rows, categories: categories});
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


// เสิร์ฟหน้า ของ productHistory
app.get("/provider-productHistory", (req, res) => {
    const query = `
        SELECT 
            h.*,
            p.productName
        FROM providerEditHistory h
        INNER JOIN ProductList p ON h.productID = p.productID;
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

            res.render("provider-productHistory", { product: rows, categories: categories});
        });
    });
});

// เสิร์ฟหน้า ของ orderHistory
app.get("/provider-orderHistory", (req, res) => {
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
    ;

    const userQ = 'SELECT * FROM userInfo';
    
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
            db.all(userQ, (err, userRows) => {
                if (err) {
                    console.log("❗" + err.message);
                    return;
                }

                res.render("provider-orderHistory", { product: rows, categories: categories, user: userRows});
            });
        });
    });
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
    // for (let key in selectedOptions) {
    //     let { optionName, customValue, addPrice } = selectedOptions[key];
    //     totalPrice += addPrice;
        
    //     //แปลงปุ่มกด จาก optionType, optionName -> customName, customValue
    //     let selectedOptionName = customValue ? optionName : optionName;
    //     let selectedCustomValue = customValue || optionName;
    
    //     values.push(`('${userEmail}', '${productID}', '${selectedOptionName}', '${selectedCustomValue}', ${addPrice})`);
     }
    console.log(optionsString);
    // const query = `
    //             INSERT INTO CustomerCart (email, productID, customName, customValue, addPrice, quantities)
    //             VALUES ${values.map(v => v.replace(/\)$/, ", 1)")).join(", ")}
    //             ON CONFLICT(email, productID, customName, customValue)
    //             DO UPDATE SET quantities = quantities + 1;
    //             `;
    const query = `
                    INSERT INTO CustomerCart (email, productID, customValue, quantities)
                    VALUES ( ? ,  ? ,  ? , 1)
                    ON CONFLICT(email, productID, customValue)
                    DO UPDATE SET quantities = quantities + 1;
                    `;

    db.run(query, [userEmail, productID, optionsString] , function (err) {
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
            
            db.run(updateQ, [productName, categoryID, price, subID, brand, description,  productID], function (err) {
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
                insertEditHistory(productID, modifiedTimestamp, userEmail, "เพิ่มสินค้าใหม่");
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
            
            db.run(updateQ, [productName, price, brand, description,  productID], function (err) {
                if (err) {
                    console.log("❗อัปเดตไม่สำเร็จ Error: " + err.message);
                    return res.status(500).json({ success: false, message: "❌เกิดข้อผิดพลาดในการอัปเดตข้อมูลสินค้า" });
                }

                console.log(updateQ);
                insertEditHistory(productID, modifiedTimestamp, userEmail, "แก้ไขข้อมูลสินค้า");
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
            return res.status(500).json({ success: false, message: "❗เช็คไม่สำเร็จ Error: " + err.message});
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
        
                insertEditHistory(productID, modifiedTimestamp, userEmail, `ลบสินค้า`);
                return res.json({ success: true, message: "✅ ลบข้อมูลสินค้าสำเร็จ" });
            });
        });
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
    console.log("/cart-checkout : ",products)
    //req.session.orderDetail = JSON.stringify(products);
    req.session.orderDetail = products;
    console.log("/cart-checkout session: ",req.session.orderDetail)
    
    const userEmail = res.locals.userEmail;
    if (!userEmail) {
        return res.status(401).json({ success: false, message: "กรุณาเข้าสู่ระบบ" });
    }
    res.redirect("/checkout");
});
app.post("/checkout-address", (req, res) => {
    const { products } = req.body;
    console.log("/checkout-address : ",products)
    //req.session.orderDetail = JSON.stringify(products);
    req.session.orderDetail = products;
    console.log("/cart-checkout session: ",req.session.orderDetail)
    
    const userEmail = res.locals.userEmail;
    if (!userEmail) {
        return res.status(401).json({ success: false, message: "กรุณาเข้าสู่ระบบ" });
    }
    //ไปไหนต่อล่ะเนี่ย
    //res.redirect("/checkout");

    //ไว้ใช้ตรงหน้าจ่ายเงินเสร็จ
    // if (products) {
    //     //ลบหลายชิ้น
    //     const deleteQ = "DELETE FROM CustomerCart WHERE email = ? AND productID = ? AND customValue = ?";

    //     db.serialize(() => {
    //         const qLoops = db.prepare(deleteQ);
    //         products.forEach(product => {
    //             qLoops.run(userEmail, product.productID, JSON.stringify(product.customValue));
    //         });
    //         qLoops.finalize();
    //     });

    //     return res.json({ success: true });
    // }

});

// เริ่มเซิร์ฟเวอร์
app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});
