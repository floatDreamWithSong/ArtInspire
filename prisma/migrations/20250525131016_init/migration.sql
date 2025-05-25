-- CreateTable
CREATE TABLE "User" (
    "uid" SERIAL NOT NULL,
    "openId" TEXT NOT NULL,
    "gender" INTEGER NOT NULL DEFAULT 0,
    "phone" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatar" TEXT,
    "userType" INTEGER NOT NULL DEFAULT 0,
    "register_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("uid")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_openId_key" ON "User"("openId");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
