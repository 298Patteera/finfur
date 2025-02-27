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
	"price"	INT NOT NULL,
	"stockNum"	INTEGER DEFAULT 0,
	"favoritesCount"	INTEGER DEFAULT 0,
	"addedDate"	TEXT NOT NULL,
	"subID"	INTEGER NOT NULL,
	PRIMARY KEY("productID"),
	FOREIGN KEY("categoryID") REFERENCES "subCategory"("categoryID") ON DELETE CASCADE,
	FOREIGN KEY("subID") REFERENCES ""
);
CREATE TABLE IF NOT EXISTS "custInfo" (
	"phone"	TEXT,
	"email"	TEXT NOT NULL,
	"psword"	text NOT NULL,
	PRIMARY KEY("phone")
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
	"addPrice"	INT NOT NULL,
	"productID"	TEXT NOT NULL,
	PRIMARY KEY("optionID" AUTOINCREMENT),
	FOREIGN KEY("productID") REFERENCES "ProductList"("productID") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "selectedOption" (
	"optionID"	INT NOT NULL,
	"email"	TEXT NOT NULL,
	"productID"	TEXT NOT NULL,
	PRIMARY KEY("optionID","email","productID"),
	FOREIGN KEY("email") REFERENCES "CustomerInfo"("email") ON DELETE CASCADE,
	FOREIGN KEY("optionID") REFERENCES "productOption"("optionID") ON DELETE CASCADE,
	FOREIGN KEY("productID") REFERENCES "ProductList"("productID") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "subCategory" (
	"categoryID"	INTEGER NOT NULL,
	"subID"	INTEGER NOT NULL,
	"subName"	TEXT NOT NULL,
	CONSTRAINT "mainSubID" PRIMARY KEY("categoryID","subID"),
	FOREIGN KEY("categoryID") REFERENCES "productCategory"("categoryID") ON DELETE CASCADE
);
INSERT INTO "custInfo" VALUES ('0998887745','shetest@gmail.com','sheserve');
INSERT INTO "custInfo" VALUES ('0123456789','test2@example.com','222222');
COMMIT;
