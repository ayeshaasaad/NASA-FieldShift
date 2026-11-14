// ===== Field Shift Sindh: NASA POWER watering, salt and rotation advice =====

// 1. Districts (main town coordinates)
var districts = {
    jacobabad:         { name: "Jacobabad",           lat: 28.28, lon: 68.44 },
    kashmore:          { name: "Kashmore",            lat: 28.24, lon: 69.18 },
    shikarpur:         { name: "Shikarpur",           lat: 27.96, lon: 68.64 },
    ghotki:            { name: "Ghotki",              lat: 28.01, lon: 69.32 },
    sukkur:            { name: "Sukkur",              lat: 27.70, lon: 68.86 },
    larkana:           { name: "Larkana",             lat: 27.56, lon: 68.21 },
    qambar:            { name: "Qambar Shahdadkot",   lat: 27.59, lon: 68.00 },
    khairpur:          { name: "Khairpur",            lat: 27.53, lon: 68.76 },
    dadu:              { name: "Dadu",                lat: 26.73, lon: 67.78 },
    naushahroferoze:   { name: "Naushahro Feroze",    lat: 26.84, lon: 68.12 },
    nawabshah:         { name: "Shaheed Benazirabad", lat: 26.24, lon: 68.41 },
    sanghar:           { name: "Sanghar",             lat: 26.05, lon: 68.95 },
    matiari:           { name: "Matiari",             lat: 25.60, lon: 68.45 },
    jamshoro:          { name: "Jamshoro",            lat: 25.43, lon: 68.28 },
    hyderabad:         { name: "Hyderabad",           lat: 25.39, lon: 68.37 },
    tandoallahyar:     { name: "Tando Allahyar",      lat: 25.46, lon: 68.72 },
    tandomuhammadkhan: { name: "Tando Muhammad Khan", lat: 25.12, lon: 68.54 },
    mirpurkhas:        { name: "Mirpur Khas",         lat: 25.53, lon: 69.01 },
    umerkot:           { name: "Umerkot",             lat: 25.36, lon: 69.74 },
    tharparkar:        { name: "Tharparkar",          lat: 24.74, lon: 69.80 },
    badin:             { name: "Badin",               lat: 24.66, lon: 68.84 },
    thatta:            { name: "Thatta",              lat: 24.75, lon: 67.92 },
    sujawal:           { name: "Sujawal",             lat: 24.61, lon: 68.07 },
    malir:             { name: "Malir",               lat: 24.95, lon: 67.20 }
};

// 2. The 3 rotations
var rotations = [
    { id: "current",  name: "Rice → Wheat",            tag: "Your current rotation",
      water: "🔴 Very high water", soil: "No soil benefit", salt: "Higher salt risk (flooded fields)" },
    { id: "mungbean", name: "Rice → Wheat → Mungbean", tag: "Option A",
      water: "🔴 High water", soil: "🟢 Mungbean adds nitrogen to the soil", salt: "Higher salt risk (flooded fields)" },
    { id: "sorghum",  name: "Sorghum → Wheat",         tag: "Option B",
      water: "🟢 Low water", soil: "Some soil benefit", salt: "🟢 Lower salt risk" }
];

var lastResult = null;   // used by the chatbot

// 3. Helpers
function makeDate(date) {
    return date.toISOString().slice(0, 10).replaceAll("-", "");   // "20261114"
}

function findDistrictIn(text) {   // used by the chatbot
    for (var key in districts) {
        if (text.includes(key) || text.includes(districts[key].name.toLowerCase())) return key;
    }
    return null;
}

// 4. NASA POWER: last 90 days of soil wetness, rain and max temperature
async function getNasa(place) {
    var start = new Date();
    start.setDate(start.getDate() - 90);

    var url = "https://power.larc.nasa.gov/api/temporal/daily/point" +
        "?parameters=GWETROOT,PRECTOTCORR,T2M_MAX&community=AG" +
        "&latitude=" + place.lat + "&longitude=" + place.lon +
        "&start=" + makeDate(start) + "&end=" + makeDate(new Date()) + "&format=JSON";

    var data = await (await fetch(url)).json();
    return data.properties.parameter;
}

// 5. Open-Meteo: rain forecast for the next 3 days (null if it fails)
async function getForecast(place) {
    try {
        var url = "https://api.open-meteo.com/v1/forecast?latitude=" + place.lat +
            "&longitude=" + place.lon + "&daily=precipitation_sum&timezone=Asia/Karachi";
        var data = await (await fetch(url)).json();
        var days = data.daily.precipitation_sum.slice(0, 3);
        return Math.round(days[0] + days[1] + days[2]);
    } catch (error) {
        return null;
    }
}

// 6. Turn 90 days into 4 numbers (NASA uses -999 for missing days)
function summarise(p) {
    var s = { soil: -1, soilDate: "", rain: 0, hottest: -100 };

    for (var date in p.GWETROOT) {
        if (p.GWETROOT[date] >= 0) { s.soil = p.GWETROOT[date]; s.soilDate = date; }
        if (p.PRECTOTCORR[date] >= 0) s.rain += p.PRECTOTCORR[date];
        if (p.T2M_MAX[date] > s.hottest) s.hottest = p.T2M_MAX[date];
    }

    s.rain = Math.round(s.rain);
    s.hottest = Math.round(s.hottest);
    return s;
}

// 7. Rules
function wateringAdvice(soil, rainNext) {
    if (soil >= 0.5 || rainNext >= 5)
        return { text: "🟢 Wait — the soil is wet enough or rain is coming", color: "var(--green)" };
    if (soil >= 0.3)
        return { text: "🟠 Water soon — the soil is drying", color: "var(--orange)" };
    return { text: "🔴 Water now — the soil is dry and no rain is expected", color: "var(--red)" };
}

function saltRisk(soil, hottest) {
    if (soil >= 0.6)
        return { title: "🧂 Salt risk: High", text: "The soil is very wet. Waterlogged fields can pull salt up to the surface. Avoid extra watering." };
    if (hottest >= 42)
        return { title: "🧂 Salt risk: Medium", text: "Extreme heat (" + hottest + "°C) speeds up evaporation, which can leave salt behind in the soil." };
    return { title: "🧂 Salt risk: Low", text: "Current soil wetness and heat are not raising salt risk." };
}

function bestRotation(soil, rain) {
    if (soil < 0.3 || rain < 20)
        return { id: "sorghum", reason: "The soil is dry and little rain has fallen, so a low-water rotation is safer." };
    return { id: "mungbean", reason: "There is enough moisture for rice, and adding mungbean improves the soil." };
}

// 8. Get and work out everything for one district (saved, so it's only fetched once)
var cache = {};

async function loadDistrict(key) {
    if (!cache[key]) {
        var place = districts[key];
        var s = summarise(await getNasa(place));
        if (s.soil < 0) return null;
        var rainNext = await getForecast(place);
        cache[key] = {
            place: place, s: s, rainNext: rainNext,
            advice: wateringAdvice(s.soil, rainNext),
            salt: saltRisk(s.soil, s.hottest),
            best: bestRotation(s.soil, s.rain)
        };
    }
    lastResult = cache[key];
    return cache[key];
}

function niceDate(d) {
    return "Latest NASA data: " + d.slice(6, 8) + "/" + d.slice(4, 6) + "/" + d.slice(0, 4) +
        ". Simple rules for exploring options, not final advice.";
}

function setText(id, text) {
    document.getElementById(id).textContent = text;
}

// 9. Water section
function showWater(r) {
    setText("waterAnswer", r.advice.text);
    document.getElementById("waterAnswerBox").style.borderLeftColor = r.advice.color;
    setText("wSoil", Math.round(r.s.soil * 100) + "%");
    setText("wRainPast", r.s.rain + " mm");
    setText("wRainNext", r.rainNext === null ? "n/a" : r.rainNext + " mm");
    setText("waterDate", niceDate(r.s.soilDate));
    document.getElementById("waterResults").classList.remove("hidden");
}

// 10. Soil section
function showSoil(r) {
    setText("sSoil", Math.round(r.s.soil * 100) + "%");
    setText("sTemp", r.s.hottest + "°C");
    setText("sRainPast", r.s.rain + " mm");
    setText("saltTitle", r.salt.title);
    setText("saltText", r.salt.text);

    var html = "";
    for (var i = 0; i < rotations.length; i++) {
        var rot = rotations[i];
        var isBest = rot.id === r.best.id;
        html += "<div class='rotation" + (isBest ? " best" : "") + "'>" +
            "<span class='tag'>" + (isBest ? "✅ Best fit · " : "") + rot.tag + "</span>" +
            "<h4>" + rot.name + "</h4><p>" + rot.water + "</p><p>" + rot.soil + "</p><p>" + rot.salt + "</p>" +
            (isBest ? "<p><strong>Why: </strong>" + r.best.reason + "</p>" : "") + "</div>";
    }
    document.getElementById("rotations").innerHTML = html;

    setText("soilDate", niceDate(r.s.soilDate));
    document.getElementById("soilResults").classList.remove("hidden");
}

// 11. Runs when a button is clicked
async function runCheck(selectId, statusId, show) {
    var key = document.getElementById(selectId).value;
    setText(statusId, "Getting NASA data for " + districts[key].name + "...");

    try {
        var r = await loadDistrict(key);
        if (!r) {
            setText(statusId, "NASA data isn't available for these dates yet. Please try again later.");
            return;
        }
        show(r);
        setText(statusId, "Results for " + r.place.name);
    } catch (error) {
        setText(statusId, "Couldn't load NASA data. Check your internet and try again.");
        console.error(error);
    }
}

// Copy the district list from the water section into the soil section
document.getElementById("soilDistrict").innerHTML = document.getElementById("waterDistrict").innerHTML;

document.getElementById("waterBtn").addEventListener("click", function () {
    runCheck("waterDistrict", "waterStatus", showWater);
});

document.getElementById("soilBtn").addEventListener("click", function () {
    runCheck("soilDistrict", "soilStatus", showSoil);
});
