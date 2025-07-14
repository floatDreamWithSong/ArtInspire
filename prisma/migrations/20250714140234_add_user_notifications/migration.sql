-- CreateTable
CREATE TABLE "user_notifications" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receiver_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "reply_id" INTEGER,
    "diary_id" INTEGER NOT NULL,

    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_notifications_receiver_id_isRead_idx" ON "user_notifications"("receiver_id", "isRead");

-- CreateIndex
CREATE INDEX "user_notifications_receiver_id_created_at_idx" ON "user_notifications"("receiver_id", "created_at");

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "diary_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_diary_id_fkey" FOREIGN KEY ("diary_id") REFERENCES "diaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
