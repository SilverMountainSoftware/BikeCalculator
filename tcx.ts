interface TcxSummary {
    totalTimeSeconds: number;
    distanceMeters: number;
    maximumSpeed: number;
    calories: number;
    avgHeartRate: number;
    maxHeartRate: number;
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

    function parseTcx(xmlString: string) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "application/xml");

        // Simple check to ensure we have a TCX file
        const activities = xmlDoc.getElementsByTagName("Activity");
        if (activities.length === 0) {
            alert("Could not find any activities in the TCX file. Is it valid?");
            return;
        }

        let totalTimeSeconds = 0;
        let distanceMeters = 0;
        let maximumSpeed = 0;
        let calories = 0;
        
        let hrSum = 0;
        let hrCount = 0;
        let maxHeartRate = 0;

        // Note: For a strict summation, we aggregate laps, or trackpoints.
        // We'll read the <Lap> summaries if available, and also traverse <Trackpoint> for heart rate avg/max if it's not present.
        const laps = xmlDoc.getElementsByTagName("Lap");
        
        for (let i = 0; i < laps.length; i++) {
            const lap = laps[i];
            
            const timeEl = lap.getElementsByTagName("TotalTimeSeconds")[0];
            if (timeEl && timeEl.textContent) totalTimeSeconds += parseFloat(timeEl.textContent);
            
            const distEl = lap.getElementsByTagName("DistanceMeters")[0];
            if (distEl && distEl.textContent) distanceMeters += parseFloat(distEl.textContent);
            
            const maxSpdEl = lap.getElementsByTagName("MaximumSpeed")[0];
            if (maxSpdEl && maxSpdEl.textContent) {
                const spd = parseFloat(maxSpdEl.textContent);
                if (spd > maximumSpeed) maximumSpeed = spd;
            }
            
            const calEl = lap.getElementsByTagName("Calories")[0];
            if (calEl && calEl.textContent) calories += parseInt(calEl.textContent, 10);
            
            // Try to get HR from lap summary first, but it's often more accurate from trackpoints
            // for calculating true average. Let's traverse trackpoints.
        }

        const trackpoints = xmlDoc.getElementsByTagName("Trackpoint");
        for (let i = 0; i < trackpoints.length; i++) {
            const tp = trackpoints[i];
            const hrEl = tp.getElementsByTagName("HeartRateBpm")[0];
            if (hrEl) {
                const valEl = hrEl.getElementsByTagName("Value")[0];
                if (valEl && valEl.textContent) {
                    const hr = parseInt(valEl.textContent, 10);
                    hrSum += hr;
                    hrCount++;
                    if (hr > maxHeartRate) {
                        maxHeartRate = hr;
                    }
                }
            }
        }

        const avgHeartRate = hrCount > 0 ? Math.round(hrSum / hrCount) : 0;

        const summary: TcxSummary = {
            totalTimeSeconds,
            distanceMeters,
            maximumSpeed,
            calories,
            avgHeartRate,
            maxHeartRate
        };

        renderResults(summary);
    }

    function renderResults(summary: TcxSummary) {
        // Show results section
        resultsSection.style.display = "block";

        const distanceKm = (summary.distanceMeters / 1000).toFixed(2);
        const distanceMi = (summary.distanceMeters / 1609.34).toFixed(2);
        
        const hrs = Math.floor(summary.totalTimeSeconds / 3600);
        const mins = Math.floor((summary.totalTimeSeconds % 3600) / 60);
        const secs = Math.floor(summary.totalTimeSeconds % 60);
        const timeFormatted = `${hrs > 0 ? hrs + 'h ' : ''}${mins}m ${secs}s`;

        const avgSpeedKph = summary.totalTimeSeconds > 0 ? (summary.distanceMeters / 1000) / (summary.totalTimeSeconds / 3600) : 0;

        statsContainer.innerHTML = `
            <article class="metric-card accent-sky">
                <p class="metric-label">Distance</p>
                <p class="metric-value">${distanceKm} km</p>
                <p class="metric-note">${distanceMi} mi</p>
            </article>

            <article class="metric-card accent-sand">
                <p class="metric-label">Total Time</p>
                <p class="metric-value">${timeFormatted}</p>
                <p class="metric-note">Moving + Paused</p>
            </article>

            <article class="metric-card accent-mint">
                <p class="metric-label">Avg Speed</p>
                <p class="metric-value">${avgSpeedKph.toFixed(1)} km/h</p>
                <p class="metric-note">${(avgSpeedKph * 0.621371).toFixed(1)} mph</p>
            </article>
            
            <article class="metric-card accent-rose">
                <p class="metric-label">Heart Rate</p>
                <p class="metric-value">${summary.avgHeartRate > 0 ? summary.avgHeartRate + ' bpm' : '--'} avg</p>
                <p class="metric-note">${summary.maxHeartRate > 0 ? summary.maxHeartRate + ' bpm' : '--'} max</p>
            </article>
        `;

        rawSummaryTableBody.innerHTML = `
            <tr><td>Total Time (s)</td><td>${summary.totalTimeSeconds.toFixed(1)}</td></tr>
            <tr><td>Distance (m)</td><td>${summary.distanceMeters.toFixed(1)}</td></tr>
            <tr><td>Max Speed (m/s)</td><td>${summary.maximumSpeed.toFixed(2)}</td></tr>
            <tr><td>Calories</td><td>${summary.calories} kcal</td></tr>
            <tr><td>Avg HR</td><td>${summary.avgHeartRate || 'N/A'} bpm</td></tr>
            <tr><td>Max HR</td><td>${summary.maxHeartRate || 'N/A'} bpm</td></tr>
        `;
    }
});
