-- AddForeignKey
ALTER TABLE "ShipmentStatusEvent" ADD CONSTRAINT "ShipmentStatusEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChainOfCustodyEvent" ADD CONSTRAINT "ChainOfCustodyEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
