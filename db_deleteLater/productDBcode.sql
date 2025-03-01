BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "CustomerCart" (
	"productID"	TEXT NOT NULL,
	"email"	TEXT NOT NULL,
	"quantities"	INT NOT NULL CHECK("quantities" > 0),
	"optionID"	INT DEFAULT 0,
	PRIMARY KEY("email","productID","optionID"),
	FOREIGN KEY("email") REFERENCES "CustomerInfo"("email") ON DELETE CASCADE,
	FOREIGN KEY("optionID") REFERENCES "productOption"("optionID") ON DELETE CASCADE,
	FOREIGN KEY("productID") REFERENCES "ProductList"("productID") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "CustomerInfo" (
	"phone"	TEXT,
	"email"	TEXT NOT NULL,
	"psword"	text NOT NULL,
	PRIMARY KEY("phone")
);
CREATE TABLE IF NOT EXISTS "FavoriteList" (
	"productID"	TEXT NOT NULL,
	"email"	TEXT NOT NULL,
	PRIMARY KEY("productID","email"),
	FOREIGN KEY("email") REFERENCES "CustomerInfo"("email") ON DELETE CASCADE,
	FOREIGN KEY("productID") REFERENCES "ProductList"("productID") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "OrderDetails" (
	"orderID"	INTEGER,
	"productID"	TEXT NOT NULL,
	"optionID"	INT DEFAULT 0,
	"quantities"	INT NOT NULL CHECK("quantities" > 0),
	"price"	INT NOT NULL,
	PRIMARY KEY("orderID" AUTOINCREMENT),
	FOREIGN KEY("optionID") REFERENCES "productOption"("optionID") ON DELETE CASCADE,
	FOREIGN KEY("productID") REFERENCES "ProductList"("productID") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "ProductList" (
	"productID"	TEXT,
	"productName"	TEXT NOT NULL,
	"categoryID"	INTEGER NOT NULL,
	"brand"	TEXT,
	"price"	REAL NOT NULL,
	"stockNum"	INTEGER NOT NULL DEFAULT 0,
	"favoritesCount"	INTEGER NOT NULL DEFAULT 0,
	"addedDate"	TEXT,
	"subID"	INTEGER NOT NULL,
	"description"	TEXT,
	PRIMARY KEY("productID"),
	FOREIGN KEY("categoryID","subID") REFERENCES "subCategory"("categoryID","subID") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "orderList" (
	"orderId"	INTEGER,
	"email"	TEXT NOT NULL,
	"orderDate"	TEXT NOT NULL,
	"orderStatus"	TEXT NOT NULL,
	PRIMARY KEY("orderId" AUTOINCREMENT),
	FOREIGN KEY("email") REFERENCES "CustomerInfo"("email") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "productCategory" (
	"categoryID"	INTEGER,
	"categoryName"	TEXT NOT NULL,
	PRIMARY KEY("categoryID")
);
CREATE TABLE IF NOT EXISTS "productImage" (
	"productID"	TEXT NOT NULL,
	"imgURL"	TEXT NOT NULL,
	FOREIGN KEY("productID") REFERENCES "ProductList"("productID") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "productOption" (
	"optionID"	INTEGER,
	"optionType"	TEXT NOT NULL,
	"optionName"	TEXT NOT NULL,
	"addPrice"	REAL NOT NULL DEFAULT 0,
	"productID"	TEXT NOT NULL,
	"imgURL"	TEXT,
	PRIMARY KEY("optionID" AUTOINCREMENT),
	FOREIGN KEY("productID") REFERENCES "ProductList"("productID") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "selectedOption" (
	"optionID"	INT NOT NULL,
	"email"	TEXT NOT NULL,
	"productID"	TEXT NOT NULL,
	PRIMARY KEY("optionID","email","productID"),
	FOREIGN KEY("email") REFERENCES "CustomerInfo"("email") ON DELETE CASCADE,
	FOREIGN KEY("productID","optionID") REFERENCES "productOption"("productID","optionID") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "subCategory" (
	"categoryID"	INTEGER NOT NULL,
	"subID"	INTEGER NOT NULL,
	"subName"	TEXT NOT NULL,
	CONSTRAINT "mainSubID" PRIMARY KEY("categoryID","subID"),
	FOREIGN KEY("categoryID") REFERENCES "productCategory"("categoryID") ON DELETE CASCADE
);
INSERT INTO "CustomerInfo" VALUES ('0998887745','shetest@gmail.com','sheserve');
INSERT INTO "CustomerInfo" VALUES ('0123456789','test2@example.com','222222');
INSERT INTO "FavoriteList" VALUES ('11098','shetest@gmail.com');
INSERT INTO "ProductList" VALUES ('11098','testP1',1,'plengja',5000.0,0,0,'2025-02-27',1,'for testing');
INSERT INTO "ProductList" VALUES ('13001','โต๊ะวางถาด',1,'GLADOM',399.0,0,0,'2025-02-28',3,'ให้คุณมีที่สำหรับวางของ ไม่ว่านั่งมุมไหนของบ้าน โต๊ะน้ำหนักเบา เคลื่อนย้ายง่าย ท็อปโต๊ะถอดใช้เป็นถาดเสิร์ฟขนมได้ และที่สำคัญ ราคาย่อมเยา ที่เมื่อคุณเห็นแล้วต้องอดใจไม่ไหว ซื้อไปใช้ที่บ้านสักอันสองอัน');
INSERT INTO "productCategory" VALUES (1,'ห้องนอน');
INSERT INTO "productCategory" VALUES (2,'ห้องนั่งเล่น');
INSERT INTO "productCategory" VALUES (3,'ห้องครัว');
INSERT INTO "productCategory" VALUES (4,'ห้องรับประทานอาหาร');
INSERT INTO "productCategory" VALUES (5,'ห้องทำงาน');
INSERT INTO "productOption" VALUES (1,'สี','ขาว',0.0,'13001',NULL);
INSERT INTO "productOption" VALUES (2,'สี','เขียว',0.0,'13001',NULL);
INSERT INTO "productOption" VALUES (3,'สี','ดำ',0.0,'13001',NULL);
INSERT INTO "productOption" VALUES (4,'สี','น้ำตาล',0.0,'13001',NULL);
INSERT INTO "productOption" VALUES (5,'วัสดุตัวถาด','พลาสติก',0.0,'13001',NULL);
INSERT INTO "productOption" VALUES (6,'วัสดุตัวถาด','เหล็ก',150.0,'13001',NULL);
INSERT INTO "subCategory" VALUES (1,1,'เตียงนอน');
INSERT INTO "subCategory" VALUES (1,2,'ตู้เสื้อผ้า');
INSERT INTO "subCategory" VALUES (1,3,'โต๊ะข้างเตียง');
INSERT INTO "subCategory" VALUES (1,4,'เก้าอี้อำนวยความสะดวก');
INSERT INTO "subCategory" VALUES (1,5,'โคมไฟนอน');
INSERT INTO "subCategory" VALUES (2,1,'โซฟา');
INSERT INTO "subCategory" VALUES (2,2,'โต๊ะกาแฟ');
INSERT INTO "subCategory" VALUES (2,3,'ชั้นวางทีวี');
INSERT INTO "subCategory" VALUES (2,4,'โคมไฟตั้งพื้น');
INSERT INTO "subCategory" VALUES (2,5,'เก้าอี้เอนหลัง');
INSERT INTO "subCategory" VALUES (3,1,'เตาแก๊ส');
INSERT INTO "subCategory" VALUES (3,2,'ซิงค์ล้างจาน');
INSERT INTO "subCategory" VALUES (3,3,'ตู้เย็น');
INSERT INTO "subCategory" VALUES (3,4,'ไมโครเวฟ');
INSERT INTO "subCategory" VALUES (3,5,'เครื่องดูดควัน');
INSERT INTO "subCategory" VALUES (4,1,'โต๊ะรับประทานอาหาร');
INSERT INTO "subCategory" VALUES (4,2,'เก้าอี้รับประทานอาหาร');
INSERT INTO "subCategory" VALUES (4,3,'ตู้เก็บของ');
INSERT INTO "subCategory" VALUES (4,4,'โคมไฟห้องอาหาร');
INSERT INTO "subCategory" VALUES (4,5,'ชั้นวางไวน์');
INSERT INTO "subCategory" VALUES (5,1,'โต๊ะทำงาน');
INSERT INTO "subCategory" VALUES (5,2,'เก้าอี้ทำงาน');
INSERT INTO "subCategory" VALUES (5,3,'ชั้นวางเอกสาร');
INSERT INTO "subCategory" VALUES (5,4,'ตู้เก็บเอกสาร');
INSERT INTO "subCategory" VALUES (5,5,'โคมไฟทำงาน');
COMMIT;
