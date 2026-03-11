-- CreateTable
CREATE TABLE "DemandForecast" (
    "id" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "forecastHour" TIMESTAMP(3) NOT NULL,
    "predictedRides" DOUBLE PRECISION NOT NULL,
    "confidenceLow" DOUBLE PRECISION NOT NULL,
    "confidenceHigh" DOUBLE PRECISION NOT NULL,
    "actualRides" INTEGER,
    "forecastAccuracy" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandForecast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DemandForecast_zone_forecastHour_key" ON "DemandForecast"("zone", "forecastHour");

-- CreateIndex
CREATE INDEX "DemandForecast_zone_idx" ON "DemandForecast"("zone");

-- CreateIndex
CREATE INDEX "DemandForecast_forecastHour_idx" ON "DemandForecast"("forecastHour");
