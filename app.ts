type UnitSystem = "metric" | "imperial";

type PresetKey = "endurance" | "gravel" | "mountain";

interface ResultElements {
    gearRatioValue: HTMLElement;
    gearRatioNote: HTMLElement;
    gearInchesValue: HTMLElement;
    speedValue: HTMLElement;
    speedMphValue: HTMLElement;
    powerValue: HTMLElement;
    powerDeltaValue: HTMLElement;
    gravityForceValue: HTMLElement;
    rollingForceValue: HTMLElement;
    dragForceValue: HTMLElement;
    totalForceValue: HTMLElement;
    insightText: HTMLElement;
    gearTableBody: HTMLElement;
    cadenceChart: SVGSVGElement;
    cadenceChartSummary: HTMLElement;
    gradeChart: SVGSVGElement;
    gradeChartSummary: HTMLElement;
    riderWeightUnit: HTMLElement;
    bikeWeightUnit: HTMLElement;
    wheelDiameterUnit: HTMLElement;
}

interface PresetValues {
    chainring: number;
    cog: number;
    wheelDiameter: number;
    cadence: number;
    riderWeight: number;
    bikeWeight: number;
    grade: number;
    powerBudget: number;
    chainringSet: string;
    cassette: string;
}

interface MetricInputs {
    chainring: number;
    cog: number;
    wheelDiameterInches: number;
    cadence: number;
    riderWeightKg: number;
    bikeWeightKg: number;
    grade: number;
    powerBudget: number;
    chainringSet: number[];
    cassette: number[];
}

interface GearMetrics {
    chainring: number;
    cog: number;
    totalMass: number;
    gearRatio: number;
    gearInches: number;
    rolloutMeters: number;
    speedMetersPerSecond: number;
    speedKph: number;
    speedMph: number;
    gravityForce: number;
    rollingForce: number;
    dragForce: number;
    totalForce: number;
    powerWatts: number;
    powerDelta: number;
    powerBudget: number;
    grade: number;
}

interface StatusPill {
    label: string;
    tone: string;
}

interface ChartPoint {
    x: number;
    y: number;
    label: string;
}

interface PlottedChartPoint extends ChartPoint {
    plotX: number;
    plotY: number;
}

interface ChartData {
    yMax: number;
    points: PlottedChartPoint[];
}

interface ChartOptions {
    lineClass: string;
    pointClass: string;
    yLabel: string;
}

function getRequiredElement<T extends Element>(id: string): T {
    const element = document.getElementById(id);

    if (!element) {
        throw new Error(`Missing required element: ${id}`);
    }

    return element as unknown as T;
}

function getRequiredFormControl(name: string): HTMLInputElement {
    const field = form.elements.namedItem(name);

    if (!(field instanceof HTMLInputElement)) {
        throw new Error(`Missing required form control: ${name}`);
    }

    return field;
}

const form = getRequiredElement<HTMLFormElement>("calculator-form");

const resultElements: ResultElements = {
    gearRatioValue: getRequiredElement("gearRatioValue"),
    gearRatioNote: getRequiredElement("gearRatioNote"),
    gearInchesValue: getRequiredElement("gearInchesValue"),
    speedValue: getRequiredElement("speedValue"),
    speedMphValue: getRequiredElement("speedMphValue"),
    powerValue: getRequiredElement("powerValue"),
    powerDeltaValue: getRequiredElement("powerDeltaValue"),
    gravityForceValue: getRequiredElement("gravityForceValue"),
    rollingForceValue: getRequiredElement("rollingForceValue"),
    dragForceValue: getRequiredElement("dragForceValue"),
    totalForceValue: getRequiredElement("totalForceValue"),
    insightText: getRequiredElement("insightText"),
    gearTableBody: getRequiredElement("gearTableBody"),
    cadenceChart: getRequiredElement<SVGSVGElement>("cadenceChart"),
    cadenceChartSummary: getRequiredElement("cadenceChartSummary"),
    gradeChart: getRequiredElement<SVGSVGElement>("gradeChart"),
    gradeChartSummary: getRequiredElement("gradeChartSummary"),
    riderWeightUnit: getRequiredElement("riderWeightUnit"),
    bikeWeightUnit: getRequiredElement("bikeWeightUnit"),
    wheelDiameterUnit: getRequiredElement("wheelDiameterUnit")
};

const unitButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".unit-button"));

const presets: Record<PresetKey, PresetValues> = {
    endurance: {
        chainring: 34,
        cog: 34,
        wheelDiameter: 27.8,
        cadence: 85,
        riderWeight: 72,
        bikeWeight: 8.4,
        grade: 7,
        powerBudget: 235,
        chainringSet: "34, 50",
        cassette: "11, 13, 15, 17, 19, 21, 24, 28, 34"
    },
    gravel: {
        chainring: 40,
        cog: 44,
        wheelDiameter: 28.2,
        cadence: 72,
        riderWeight: 78,
        bikeWeight: 11.5,
        grade: 9,
        powerBudget: 255,
        chainringSet: "30, 40",
        cassette: "10, 12, 14, 16, 18, 21, 24, 28, 32, 38, 44"
    },
    mountain: {
        chainring: 30,
        cog: 52,
        wheelDiameter: 29,
        cadence: 68,
        riderWeight: 82,
        bikeWeight: 14.1,
        grade: 14,
        powerBudget: 285,
        chainringSet: "30, 32",
        cassette: "10, 12, 14, 16, 18, 21, 24, 28, 32, 38, 45, 52"
    }
};

const constants = {
    gravity: 9.80665,
    rollingCoefficient: 0.005,
    airDensity: 1.225,
    dragArea: 0.36,
    poundsPerKilogram: 2.2046226218,
    millimetersPerInch: 25.4,
    feetPerMeter: 3.28084
} as const;

let currentUnitSystem: UnitSystem = "metric";

function readNumber(name: string): number {
    return Number(getRequiredFormControl(name).value);
}

function writeValue(name: string, value: string): void {
    getRequiredFormControl(name).value = value;
}

function formatNumber(value: number, digits = 1): string {
    return value.toFixed(digits);
}

function parseToothList(value: string, fallback: number): number[] {
    const parsed = value
        .split(",")
        .map((part) => Number(part.trim()))
        .filter((item) => Number.isFinite(item) && item > 0);

    if (parsed.length === 0) {
        return [fallback];
    }

    return Array.from(new Set(parsed)).sort((left, right) => left - right);
}

function getMetricInputs(): MetricInputs {
    const wheelDiameterInput = readNumber("wheelDiameter");
    const riderWeightInput = readNumber("riderWeight");
    const bikeWeightInput = readNumber("bikeWeight");

    return {
        chainring: readNumber("chainring"),
        cog: readNumber("cog"),
        wheelDiameterInches: currentUnitSystem === "metric"
            ? wheelDiameterInput / constants.millimetersPerInch
            : wheelDiameterInput,
        cadence: readNumber("cadence"),
        riderWeightKg: currentUnitSystem === "metric"
            ? riderWeightInput
            : riderWeightInput / constants.poundsPerKilogram,
        bikeWeightKg: currentUnitSystem === "metric"
            ? bikeWeightInput
            : bikeWeightInput / constants.poundsPerKilogram,
        grade: readNumber("grade"),
        powerBudget: readNumber("powerBudget"),
        chainringSet: parseToothList(getRequiredFormControl("chainringSet").value, readNumber("chainring")),
        cassette: parseToothList(getRequiredFormControl("cassette").value, readNumber("cog"))
    };
}

function computeGearMetrics(input: Omit<MetricInputs, "chainringSet" | "cassette">): GearMetrics {
    const totalMass = input.riderWeightKg + input.bikeWeightKg;
    const gearRatio = input.chainring / input.cog;
    const gearInches = gearRatio * input.wheelDiameterInches;
    const wheelCircumferenceMeters = Math.PI * input.wheelDiameterInches * 0.0254;
    const rolloutMeters = gearRatio * wheelCircumferenceMeters;
    const speedMetersPerSecond = rolloutMeters * input.cadence / 60;
    const speedKph = speedMetersPerSecond * 3.6;
    const speedMph = speedKph * 0.621371;
    const slopeRatio = input.grade / 100;
    const theta = Math.atan(slopeRatio);
    const gravityForce = totalMass * constants.gravity * Math.sin(theta);
    const rollingForce = totalMass * constants.gravity * Math.cos(theta) * constants.rollingCoefficient;
    const dragForce = 0.5 * constants.airDensity * constants.dragArea * speedMetersPerSecond * speedMetersPerSecond;
    const totalForce = gravityForce + rollingForce + dragForce;
    const powerWatts = totalForce * speedMetersPerSecond;

    return {
        chainring: input.chainring,
        cog: input.cog,
        totalMass,
        gearRatio,
        gearInches,
        rolloutMeters,
        speedMetersPerSecond,
        speedKph,
        speedMph,
        gravityForce,
        rollingForce,
        dragForce,
        totalForce,
        powerWatts,
        powerDelta: powerWatts - input.powerBudget,
        powerBudget: input.powerBudget,
        grade: input.grade
    };
}

function describeGear(gearInches: number, grade: number, powerDelta: number): string {
    if (grade >= 12 && gearInches > 35) {
        return "Tall for a steep climb. Expect grinding unless you can hold high power.";
    }

    if (grade >= 8 && gearInches < 25) {
        return "Very climb-friendly gearing. You should be able to stay seated and spin.";
    }

    if (powerDelta > 35) {
        return "This setup asks for more power than the target budget. Consider an easier cog or slower cadence.";
    }

    if (powerDelta < -40 && gearInches < 32) {
        return "Comfortably inside the power budget. You may have room for a slightly taller gear.";
    }

    return "Balanced gearing for sustained climbing at a steady cadence.";
}

function buildInsight(metrics: GearMetrics): string {
    const massValue = currentUnitSystem === "metric"
        ? `${formatNumber(metrics.totalMass, 1)} kg system mass`
        : `${formatNumber(metrics.totalMass * constants.poundsPerKilogram, 1)} lb system mass`;
    const speedText = currentUnitSystem === "metric"
        ? `${formatNumber(metrics.speedKph, 1)} km/h`
        : `${formatNumber(metrics.speedMph, 1)} mph`;
    const ratioText = `${formatNumber(metrics.gearRatio, 2)}:1`;

    if (metrics.powerDelta > 40) {
        return `At ${metrics.grade}% grade, ${ratioText} gearing pushes ${massValue} uphill at about ${speedText}, but the estimated ${formatNumber(metrics.powerWatts, 0)} W demand is well above the target budget.`;
    }

    if (metrics.gearInches <= 24 && metrics.grade >= 10) {
        return `This is a low climbing gear. For ${massValue} on a ${metrics.grade}% slope, it trades speed for cadence and keeps the effort closer to manageable.`;
    }

    if (metrics.speedKph > 18 && metrics.grade >= 7) {
        return `The selected gear is relatively tall for climbing. Holding ${speedText} on a ${metrics.grade}% ramp will likely require strong legs or a short-duration effort.`;
    }

    return `This setup looks coherent for a steady climb: ${ratioText} gearing, ${massValue}, and an estimated ${formatNumber(metrics.powerWatts, 0)} W to sustain ${speedText} on the hill.`;
}

function getDisplayDistance(metrics: GearMetrics): string {
    return currentUnitSystem === "metric"
        ? `${formatNumber(metrics.speedKph, 1)} km/h`
        : `${formatNumber(metrics.speedMph, 1)} mph`;
}

function getDisplayRange(gearInches: number): string {
    if (currentUnitSystem === "metric") {
        return `${formatNumber(gearInches * constants.millimetersPerInch, 0)} mm gear`;
    }

    return `${formatNumber(gearInches, 1)} in gear`;
}

function getStatus(powerDelta: number): StatusPill {
    if (powerDelta > 30) {
        return { label: "Over budget", tone: "is-hard" };
    }

    if (powerDelta < -35) {
        return { label: "Comfortable", tone: "is-good" };
    }

    return { label: "On target", tone: "is-steady" };
}

function renderSummary(metrics: GearMetrics): void {
    resultElements.gearRatioValue.textContent = formatNumber(metrics.gearRatio, 2);
    resultElements.gearRatioNote.textContent = describeGear(metrics.gearInches, metrics.grade, metrics.powerDelta);
    resultElements.gearInchesValue.textContent = currentUnitSystem === "metric"
        ? `${formatNumber(metrics.gearInches * constants.millimetersPerInch, 0)} mm`
        : formatNumber(metrics.gearInches, 1);
    resultElements.speedValue.textContent = getDisplayDistance(metrics);
    resultElements.speedMphValue.textContent = currentUnitSystem === "metric"
        ? `${formatNumber(metrics.speedMph, 1)} mph · ${formatNumber(metrics.rolloutMeters, 2)} m rollout`
        : `${formatNumber(metrics.speedKph, 1)} km/h · ${formatNumber(metrics.rolloutMeters * constants.feetPerMeter, 1)} ft rollout`;
    resultElements.powerValue.textContent = `${formatNumber(metrics.powerWatts, 0)} W`;
    resultElements.powerDeltaValue.textContent = metrics.powerDelta > 0
        ? `${formatNumber(metrics.powerDelta, 0)} W above target budget`
        : `${formatNumber(Math.abs(metrics.powerDelta), 0)} W below target budget`;
    resultElements.gravityForceValue.textContent = `${formatNumber(metrics.gravityForce, 1)} N`;
    resultElements.rollingForceValue.textContent = `${formatNumber(metrics.rollingForce, 1)} N`;
    resultElements.dragForceValue.textContent = `${formatNumber(metrics.dragForce, 1)} N`;
    resultElements.totalForceValue.textContent = `${formatNumber(metrics.totalForce, 1)} N`;
    resultElements.insightText.textContent = buildInsight(metrics);
}

function renderGearTable(baseInputs: MetricInputs): void {
    const combinations: GearMetrics[] = [];

    baseInputs.chainringSet.forEach((chainring) => {
        baseInputs.cassette.forEach((cog) => {
            combinations.push(computeGearMetrics({
                chainring,
                cog,
                wheelDiameterInches: baseInputs.wheelDiameterInches,
                cadence: baseInputs.cadence,
                riderWeightKg: baseInputs.riderWeightKg,
                bikeWeightKg: baseInputs.bikeWeightKg,
                grade: baseInputs.grade,
                powerBudget: baseInputs.powerBudget
            }));
        });
    });

    combinations.sort((left, right) => left.gearRatio - right.gearRatio);

    resultElements.gearTableBody.innerHTML = combinations.map((metrics) => {
        const isSelected = metrics.chainring === baseInputs.chainring && metrics.cog === baseInputs.cog;
        const status = getStatus(metrics.powerDelta);

        return `
            <tr class="${isSelected ? "is-selected" : ""}">
                <td>${metrics.chainring} x ${metrics.cog}</td>
                <td>${formatNumber(metrics.gearRatio, 2)}</td>
                <td>${getDisplayRange(metrics.gearInches)}</td>
                <td>${getDisplayDistance(metrics)}</td>
                <td>${formatNumber(metrics.powerWatts, 0)} W</td>
                <td><span class="status-pill ${status.tone}">${status.label}</span></td>
            </tr>
        `;
    }).join("");
}

function buildLinePath(points: ChartPoint[], width: number, height: number, padding: { top: number; right: number; bottom: number; left: number }): ChartData {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = 0;
    const yMax = Math.max(...ys) * 1.1 || 1;
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const mapX = (value: number) => padding.left + ((value - xMin) / Math.max(xMax - xMin, 1)) * plotWidth;
    const mapY = (value: number) => height - padding.bottom - ((value - yMin) / Math.max(yMax - yMin, 1)) * plotHeight;

    return {
        yMax,
        points: points.map((point) => ({
            ...point,
            plotX: mapX(point.x),
            plotY: mapY(point.y)
        }))
    };
}

function renderChart(svg: SVGSVGElement, points: ChartPoint[], options: ChartOptions): void {
    const width = 360;
    const height = 180;
    const padding = { top: 16, right: 16, bottom: 28, left: 38 };
    const chartData = buildLinePath(points, width, height, padding);
    const linePath = chartData.points
        .map((point, index) => `${index === 0 ? "M" : "L"}${point.plotX} ${point.plotY}`)
        .join(" ");
    const gridValues = [0.25, 0.5, 0.75, 1];

    svg.innerHTML = `
        ${gridValues.map((value) => {
            const y = height - padding.bottom - value * (height - padding.top - padding.bottom);
            return `<line class="chart-grid-line" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"></line>`;
        }).join("")}
        <line class="chart-axis" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}"></line>
        <line class="chart-axis" x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}"></line>
        <path class="chart-line ${options.lineClass}" d="${linePath}"></path>
        ${chartData.points.map((point) => `
            <circle class="chart-point ${options.pointClass}" cx="${point.plotX}" cy="${point.plotY}" r="4"></circle>
            <text class="chart-label" x="${point.plotX}" y="${height - 8}" text-anchor="middle">${point.label}</text>
        `).join("")}
        <text class="chart-label" x="8" y="20">${options.yLabel} 0-${formatNumber(chartData.yMax, 0)}</text>
    `;
}

function renderCharts(baseInputs: MetricInputs): void {
    const cadencePoints: ChartPoint[] = [50, 60, 70, 80, 90, 100].map((cadence) => {
        const metrics = computeGearMetrics({
            chainring: baseInputs.chainring,
            cog: baseInputs.cog,
            wheelDiameterInches: baseInputs.wheelDiameterInches,
            cadence,
            riderWeightKg: baseInputs.riderWeightKg,
            bikeWeightKg: baseInputs.bikeWeightKg,
            grade: baseInputs.grade,
            powerBudget: baseInputs.powerBudget
        });

        return {
            x: cadence,
            y: currentUnitSystem === "metric" ? metrics.speedKph : metrics.speedMph,
            label: `${cadence}`
        };
    });

    const gradePoints: ChartPoint[] = [0, 3, 6, 9, 12, 15].map((grade) => {
        const metrics = computeGearMetrics({
            chainring: baseInputs.chainring,
            cog: baseInputs.cog,
            wheelDiameterInches: baseInputs.wheelDiameterInches,
            cadence: baseInputs.cadence,
            riderWeightKg: baseInputs.riderWeightKg,
            bikeWeightKg: baseInputs.bikeWeightKg,
            grade,
            powerBudget: baseInputs.powerBudget
        });

        return {
            x: grade,
            y: metrics.powerWatts,
            label: `${grade}%`
        };
    });

    renderChart(resultElements.cadenceChart, cadencePoints, {
        lineClass: "chart-line-speed",
        pointClass: "chart-point-speed",
        yLabel: currentUnitSystem === "metric" ? "km/h" : "mph"
    });

    renderChart(resultElements.gradeChart, gradePoints, {
        lineClass: "chart-line-power",
        pointClass: "chart-point-power",
        yLabel: "W"
    });

    resultElements.cadenceChartSummary.textContent = currentUnitSystem === "metric"
        ? "Higher cadence scales speed almost linearly for the selected gear in km/h."
        : "Higher cadence scales speed almost linearly for the selected gear in mph.";
    resultElements.gradeChartSummary.textContent = "Power rises sharply as grade increases because gravity dominates the resisting force.";
}

function updateUnitLabels(): void {
    if (currentUnitSystem === "metric") {
        resultElements.riderWeightUnit.textContent = "kg";
        resultElements.bikeWeightUnit.textContent = "kg";
        resultElements.wheelDiameterUnit.textContent = "mm";
        return;
    }

    resultElements.riderWeightUnit.textContent = "lb";
    resultElements.bikeWeightUnit.textContent = "lb";
    resultElements.wheelDiameterUnit.textContent = "in";
}

function setUnitButtonState(): void {
    unitButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.unit === currentUnitSystem);
    });
}

function convertDisplayedInputs(nextUnitSystem: UnitSystem): void {
    if (nextUnitSystem === currentUnitSystem) {
        return;
    }

    const convertValue = (fieldName: string, convertedValue: number, digits: number) => {
        writeValue(fieldName, formatNumber(convertedValue, digits));
    };

    if (nextUnitSystem === "imperial") {
        convertValue("riderWeight", readNumber("riderWeight") * constants.poundsPerKilogram, 1);
        convertValue("bikeWeight", readNumber("bikeWeight") * constants.poundsPerKilogram, 1);
        convertValue("wheelDiameter", readNumber("wheelDiameter") / constants.millimetersPerInch, 1);
    } else {
        convertValue("riderWeight", readNumber("riderWeight") / constants.poundsPerKilogram, 1);
        convertValue("bikeWeight", readNumber("bikeWeight") / constants.poundsPerKilogram, 1);
        convertValue("wheelDiameter", readNumber("wheelDiameter") * constants.millimetersPerInch, 0);
    }

    currentUnitSystem = nextUnitSystem;
    updateUnitLabels();
    setUnitButtonState();
}

function applyPreset(presetValues: PresetValues): void {
    writeValue("chainring", String(presetValues.chainring));
    writeValue("cog", String(presetValues.cog));
    writeValue("cadence", String(presetValues.cadence));
    writeValue("grade", String(presetValues.grade));
    writeValue("powerBudget", String(presetValues.powerBudget));
    writeValue("chainringSet", presetValues.chainringSet);
    writeValue("cassette", presetValues.cassette);

    if (currentUnitSystem === "metric") {
        writeValue("riderWeight", String(presetValues.riderWeight));
        writeValue("bikeWeight", String(presetValues.bikeWeight));
        writeValue("wheelDiameter", formatNumber(presetValues.wheelDiameter * constants.millimetersPerInch, 0));
    } else {
        writeValue("riderWeight", formatNumber(presetValues.riderWeight * constants.poundsPerKilogram, 1));
        writeValue("bikeWeight", formatNumber(presetValues.bikeWeight * constants.poundsPerKilogram, 1));
        writeValue("wheelDiameter", String(presetValues.wheelDiameter));
    }
}

function calculate(): void {
    const metricInputs = getMetricInputs();
    const selectedMetrics = computeGearMetrics({
        chainring: metricInputs.chainring,
        cog: metricInputs.cog,
        wheelDiameterInches: metricInputs.wheelDiameterInches,
        cadence: metricInputs.cadence,
        riderWeightKg: metricInputs.riderWeightKg,
        bikeWeightKg: metricInputs.bikeWeightKg,
        grade: metricInputs.grade,
        powerBudget: metricInputs.powerBudget
    });

    renderSummary(selectedMetrics);
    renderGearTable(metricInputs);
    renderCharts(metricInputs);
}

form.addEventListener("input", calculate);

unitButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const nextUnit = button.dataset.unit;

        if (nextUnit === "metric" || nextUnit === "imperial") {
            convertDisplayedInputs(nextUnit);
            calculate();
        }
    });
});

document.querySelectorAll<HTMLButtonElement>(".preset-button").forEach((button) => {
    button.addEventListener("click", () => {
        const presetKey = button.dataset.preset as PresetKey | undefined;

        if (presetKey && presetKey in presets) {
            applyPreset(presets[presetKey]);
            calculate();
        }
    });
});

writeValue("chainringSet", presets.endurance.chainringSet);
writeValue("cassette", presets.endurance.cassette);
writeValue("wheelDiameter", formatNumber(readNumber("wheelDiameter") * constants.millimetersPerInch, 0));
updateUnitLabels();
setUnitButtonState();
calculate();
