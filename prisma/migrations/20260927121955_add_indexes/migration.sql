-- CreateIndex
CREATE INDEX "Friendship_addresseeId_status_idx" ON "Friendship"("addresseeId", "status");

-- CreateIndex
CREATE INDEX "LocationShare_sharerId_status_idx" ON "LocationShare"("sharerId", "status");

-- CreateIndex
CREATE INDEX "LocationShare_requesterId_status_idx" ON "LocationShare"("requesterId", "status");
