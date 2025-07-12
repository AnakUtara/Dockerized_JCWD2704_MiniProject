-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('customer', 'promotor');

-- CreateEnum
CREATE TYPE "Venue_type" AS ENUM ('indoor', 'outdoor');

-- CreateEnum
CREATE TYPE "Status_event" AS ENUM ('published', 'finished');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('Acoustic', 'Rock', 'Punk', 'Metal', 'Pop', 'Electronic', 'Experimental');

-- CreateEnum
CREATE TYPE "Status_transaction" AS ENUM ('unpaid', 'pending', 'success', 'cancelled');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(55) NOT NULL,
    "fullname" VARCHAR(85) NOT NULL,
    "email" VARCHAR(85) NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'customer',
    "phone_no" VARCHAR(25) NOT NULL,
    "id_card" VARCHAR(16) NOT NULL,
    "gender" "Gender",
    "address" VARCHAR(255),
    "date_of_birth" TIMESTAMP(3),
    "avatar" TEXT,
    "referral_code" TEXT NOT NULL,
    "reference_code" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "points_expiry_date" TIMESTAMP(3),
    "bank_acc_no" VARCHAR(75),
    "reset_token" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "location" TEXT NOT NULL,
    "city" VARCHAR(55) NOT NULL,
    "zip_code" INTEGER NOT NULL,
    "venue_type" "Venue_type" NOT NULL,
    "details" TEXT NOT NULL,
    "roster" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "status" "Status_event" NOT NULL DEFAULT 'published',
    "category" "Category" NOT NULL,
    "discount_amount" INTEGER,
    "ticket_price" DOUBLE PRECISION NOT NULL,
    "ticket_amount" INTEGER NOT NULL,
    "assigned_pic" TEXT,
    "pic_phone_no" VARCHAR(25),
    "user_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "review" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("user_id","event_id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "invoice_code" TEXT NOT NULL,
    "ticket_bought" INTEGER NOT NULL,
    "points_used" INTEGER,
    "total_price" DOUBLE PRECISION NOT NULL,
    "ticket_discount" INTEGER,
    "transfer_proof" TEXT,
    "status" "Status_transaction" NOT NULL DEFAULT 'unpaid',
    "user_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "voucher_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vouchers" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "is_valid" BOOLEAN NOT NULL DEFAULT true,
    "user_id" TEXT NOT NULL,
    "used_at" TIMESTAMP(3),

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_id_card_key" ON "users"("id_card");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- CreateIndex
CREATE INDEX "users_username_fullname_email_role_idx" ON "users"("username", "fullname", "email", "role");

-- CreateIndex
CREATE INDEX "events_title_location_scheduled_at_status_venue_type_city_idx" ON "events"("title", "location", "scheduled_at", "status", "venue_type", "city");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_voucher_id_key" ON "transactions"("voucher_id");

-- CreateIndex
CREATE INDEX "transactions_invoice_code_status_user_id_event_id_idx" ON "transactions"("invoice_code", "status", "user_id", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_user_id_key" ON "vouchers"("user_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
