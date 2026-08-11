-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "sc_master";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "sc_network";

-- CreateTable
CREATE TABLE "sc_master"."User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sc_network"."MasterType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasterType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sc_network"."Device" (
    "id" SERIAL NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "remark" TEXT NOT NULL,
    "xPos" DOUBLE PRECISION NOT NULL,
    "yPos" DOUBLE PRECISION NOT NULL,
    "typeId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "sc_master"."User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "MasterType_name_key" ON "sc_network"."MasterType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Device_ipAddress_key" ON "sc_network"."Device"("ipAddress");

-- AddForeignKey
ALTER TABLE "sc_network"."Device" ADD CONSTRAINT "Device_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "sc_network"."MasterType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
