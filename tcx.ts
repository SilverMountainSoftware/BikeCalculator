interface TcxSummary {
    heartRates: number[];
    cadences: number[];
    powers: number[];
    speeds: number[];
    times: Date[];
    distances: number[];
    altitudes: number[];
}

document.addEventListener("DOMContentLoaded", () => {
    const dropZone = document.getElementById("dropZone") as HTMLDivElement;
    const fileInput = document.getElementById("tcxFileInput") as HTMLInputElement;
    const resultsSection = document.getElementById("resultsSection") as HTMLElement;
    const statsContainer = document.getElementById("statsContainer") as HTMLDivElement;
    const rawSummaryTableBody = document.getElementById("rawSummaryTableBody") as HTMLTableSectionElement;

    if (!dropZone || !fileInput) return;

    // Handle file dialog
    dropZone.addEventListener("click", () => {
        fileInput.click();
    });

    fileInput.addEventListener("change", (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
            handleFile(file);
        }
    });

    // Handle drag and drop
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("drag-over");
    });

    dropZone.addEventListener("dragleave", (e) => {
        e.preventDefault();
        dropZone.classList.remove("drag-over");
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("drag-over");
        const file = e.dataTransfer?.files?.[0];
        if (file && (file.name.endsWith(".tcx") || file.type.includes("tcx"))) {
            handleFile(file);
        } else {
            alert("Please drop a valid .tcx file.");
        }
    });

    function handleFile(file: File) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (content) {
                parseTcx(content);
            }
        };
        reader.readAsText(file);
    }

    function stdDev(values: number[]): number {
        if (values.length === 0) return 0;
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
        const sumSq = values.reduce((sum, v) => sum + (v - avg) * (v - avg), 0);
        return Math.sqrt(sumSq / values.length);
    }

    function metersPerSecondToMph(mps: number): number {
        return mps * 2.2369362920544;
    }

    function calculateAverageSpeed(times: Date[], distances: number[]): number {
        if (times.length < 2 || distances.length < 2) return 0.0;

        const totalTimeSeconds = (times[times.length - 1].getTime() - times[0].getTime()) / 1000;
        const totalDistanceMeters = distances[distances.length - 1] - distances[0];

        if (totalTimeSeconds <= 0 || totalDistanceMeters <= 0) return 0.0;

        const avgSpeedMs = totalDistanceMeters / totalTimeSeconds;
        return metersPerSecondToMph(avgSpeedMs);
    }

    function calculateSegmentSpeeds(times: Date[], distances: number[], minSpeedMph = 5.0): number[] {
        const segmentSpeeds: number[] = [];
        if (times.length < 2 || distances.length < 2) return segmentSpeeds;

        for (let i = 1; i < times.length; i++) {
            const segmentDistance = distances[i] - distances[i - 1]; // meters
            const segmentTime = (times[i].getTime() - times[i - 1].getTime()) / 1000; // seconds

            if (segmentTime > 0 && segmentDistance >= 0) {
                const segmentSpeedMps = segmentDistance / segmentTime;
                const segmentSpeedMph = metersPerSecondToMph(segmentSpeedMps);
                if (segmentSpeedMph >= minSpeedMph) {
                    segmentSpeeds.push(segmentSpeedMph);
                }
            }
        }
        return segmentSpeeds;
    }

    function calculateTotalElevationChangeInFeet(altitudes: number[]): number {
        if (!altitudes || altitudes.length < 2) return 0.0;

        let totalChangeMeters = 0.0;
        for (let i = 1; i < altitudes.length; i++) {
            totalChangeMeters += Math.abs(altitudes[i] - altitudes[i - 1]);
        }
        return totalChangeMeters * 3.28084;
    }

    function calculatePowerGroupTimes(times: Date[], powers: number[]): Record<string, number> {
        const groupTimes: Record<string, number> = {};
        if (times.length < 2 || powers.length < 2) return groupTimes;

        const maxPower = Math.max(...powers);
        const groupRanges: { min: number; max: number }[] = [];
        for (let min = 0, max = 50; min <= maxPower; min = max + 1, max += 50) {
            groupRanges.push({ min, max });
        }

        const len = Math.min(times.length, powers.length);
        for (let i = 1; i < len; i++) {
            const p = powers[i];
            const segmentTime = (times[i].getTime() - times[i - 1].getTime()) / 1000;
            if (segmentTime <= 0) continue;

            for (const { min, max } of groupRanges) {
                if (p >= min && p <= max) {
                    const label = `${min}-${max}`;
                    if (!groupTimes[label]) groupTimes[label] = 0;
                    groupTimes[label] += segmentTime;
                    break;
                }
            }
        }
        return groupTimes;
    }

    function parseTcx(xmlString: string) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlString, "application/xml");

        const heartRates: number[] = [];
        const cadences: number[] = [];
        const powers: number[] = [];
        const speeds: number[] = [];
        const times: Date[] = [];
        const distances: number[] = [];
        const altitudes: number[] = [];

        const trackpoints = doc.getElementsByTagName("Trackpoint");

        // Simple check to ensure we have a TCX file
        if (trackpoints.length === 0) {
            alert("Could not find any Trackpoints in the TCX file. Is it valid?");
            return;
        }

        for (let i = 0; i < trackpoints.length; i++) {
            const tp = trackpoints[i];

            // Heart Rate
            const hrElem = tp.getElementsByTagName("HeartRateBpm")[0]?.getElementsByTagName("Value")[0];
            if (hrElem && hrElem.textContent) {
                heartRates.push(parseFloat(hrElem.textContent));
            }

            // Cadence
            const cadenceElem = tp.getElementsByTagName("Cadence")[0];
            if (cadenceElem && cadenceElem.textContent) {
                cadences.push(parseFloat(cadenceElem.textContent));
            }

            // Extensions for Power and Speed
            const extElem = tp.getElementsByTagName("Extensions")[0];
            if (extElem) {
                const tpxElems = extElem.getElementsByTagNameNS("http://www.garmin.com/xmlschemas/ActivityExtension/v2", "TPX");
                const tpx = tpxElems.length > 0 ? tpxElems[0] : extElem.getElementsByTagName("TPX")[0];
                
                if (tpx) {
                    const wattsElem = tpx.getElementsByTagNameNS("http://www.garmin.com/xmlschemas/ActivityExtension/v2", "Watts")[0] || tpx.getElementsByTagName("Watts")[0];
                    if (wattsElem && wattsElem.textContent) {
                        powers.push(parseFloat(wattsElem.textContent));
                    }

                    const speedElem = tpx.getElementsByTagNameNS("http://www.garmin.com/xmlschemas/ActivityExtension/v2", "Speed")[0] || tpx.getElementsByTagName("Speed")[0];
                    if (speedElem && speedElem.textContent) {
                        speeds.push(metersPerSecondToMph(parseFloat(speedElem.textContent)));
                    }
                }
            }

            // Time
            const timeElem = tp.getElementsByTagName("Time")[0];
            if (timeElem && timeElem.textContent) {
                times.push(new Date(timeElem.textContent));
            }

            // Distance
            const distElem = tp.getElementsByTagName("DistanceMeters")[0];
            if (distElem && distElem.textContent) {
                distances.push(parseFloat(distElem.textContent));
            }

            // Altitude
            const altElem = tp.getElementsByTagName("AltitudeMeters")[0];
            if (altElem && altElem.textContent) {
                altitudes.push(parseFloat(altElem.textContent));
            }
        }

        renderResults({ heartRates, cadences, powers, speeds, times, distances, altitudes });
    }

    function formatTime(seconds: number) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hrs > 0 ? hrs + 'h ' : ''}${mins}m ${secs}s`;
    }

    function getAverage(values: number[]) {
        if (values.length === 0) return 0;
        return values.reduce((sum, v) => sum + v, 0) / values.length;
    }

    function renderResults(summary: TcxSummary) {
        resultsSection.style.display = "block";

        const { heartRates, cadences, powers, times, distances, altitudes } = summary;

        const avgSpeed = calculateAverageSpeed(times, distances);
        const segmentSpeeds = calculateSegmentSpeeds(times, distances, 5.0);
        const totalElevationFeet = calculateTotalElevationChangeInFeet(altitudes);

        const avgHr = getAverage(heartRates);
        const avgCadence = getAverage(cadences);
        const avgPower = getAverage(powers);

        const hrStdDev = stdDev(heartRates);
        const cadenceStdDev = stdDev(cadences);
        const powerStdDev = stdDev(powers);
        const speedStdDev = stdDev(segmentSpeeds);
        const segAvg = getAverage(segmentSpeeds);

        // Distance in mph
        const totalDistanceMeters = distances.length > 0 ? distances[distances.length - 1] - distances[0] : 0;
        const totalDistanceMi = (totalDistanceMeters / 1609.34).toFixed(2);
        
        const totalTimeSeconds = times.length > 0 ? (times[times.length - 1].getTime() - times[0].getTime()) / 1000 : 0;
        const timeFormatted = formatTime(totalTimeSeconds);

        statsContainer.innerHTML = \`
            <article class="metric-card accent-sky">
                <p class="metric-label">Distance</p>
                <p class="metric-value">\${totalDistanceMi} mi</p>
                <p class="metric-note">\${(totalDistanceMeters / 1000).toFixed(2)} km</p>
            </article>

            <article class="metric-card accent-sand">
                <p class="metric-label">Total Time</p>
                <p class="metric-value">\${timeFormatted}</p>
                <p class="metric-note">Moving + Paused</p>
            </article>

            <article class="metric-card accent-mint">
                <p class="metric-label">Avg Speed</p>
                <p class="metric-value">\${avgSpeed.toFixed(2)} mph</p>
                <p class="metric-note">Seg Avg: \${segAvg.toFixed(2)} mph (n=\${segmentSpeeds.length})</p>
            </article>
            
            <article class="metric-card accent-rose">
                <p class="metric-label">Elevation Change</p>
                <p class="metric-value">\${totalElevationFeet.toFixed(2)} ft</p>
                <p class="metric-note">Sum of all pos & neg</p>
            </article>
        \`;

        let powerGroupsHtml = '';
        const powerGroups = calculatePowerGroupTimes(times, powers);
        for (const [group, seconds] of Object.entries(powerGroups)) {
            powerGroupsHtml += \`<tr><td>\${group} W</td><td>\${formatTime(seconds)}</td></tr>\`;
        }

        rawSummaryTableBody.innerHTML = \`
            <tr><td>Heart Rate</td><td>Avg: \${avgHr.toFixed(2)} bpm, StdDev: \${hrStdDev.toFixed(2)} (n=\${heartRates.length})</td></tr>
            <tr><td>Cadence</td><td>Avg: \${avgCadence.toFixed(2)} rpm, StdDev: \${cadenceStdDev.toFixed(2)} (n=\${cadences.length})</td></tr>
            <tr><td>Power</td><td>Avg: \${avgPower.toFixed(2)} W, StdDev: \${powerStdDev.toFixed(2)} (n=\${powers.length})</td></tr>
            <tr><td>Overall Speed</td><td>Avg: \${avgSpeed.toFixed(2)} mph</td></tr>
            <tr><td>Segment Speed (≥5mph)</td><td>Avg: \${segAvg.toFixed(2)} mph, StdDev: \${speedStdDev.toFixed(2)}, Min: \${segmentSpeeds.length > 0 ? Math.min(...segmentSpeeds).toFixed(2) : 0} mph, Max: \${segmentSpeeds.length > 0 ? Math.max(...segmentSpeeds).toFixed(2) : 0} mph</td></tr>
            <tr><td>Elevation Change</td><td>\${totalElevationFeet.toFixed(2)} feet</td></tr>
            <tr><td colspan="2" style="font-weight:bold; padding-top: 1rem;">Power Groups</td></tr>
            \${powerGroupsHtml}
        \`;
    }
});