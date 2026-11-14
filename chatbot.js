// =====================================================
// Field Helper chatbot
// Answers questions using the NASA results from script.js.
// It works with keyword rules, so it needs no AI or API key,
// and every answer comes from real data or fixed facts.
// =====================================================


// ---------- 1. Facts about each crop ----------
var cropFacts = {
    rice: "Rice needs the most water, about 1,500 mm per season in Sindh. Its fields are kept flooded, which can raise salt risk.",
    wheat: "Wheat is the main winter (Rabi) crop. It needs about 400–450 mm of water per season, and extreme heat in March–April can harm it.",
    sorghum: "Sorghum (jowar) needs much less water than rice and can be used as animal fodder, so it's a safer choice in dry years.",
    mungbean: "Mungbean (moong) is a short crop that adds nitrogen to the soil, like a natural fertiliser. It can fill the gap between wheat and rice."
};


// ---------- 2. Add a message to the chat ----------
function addMessage(text, who) {
    var msg = document.createElement("div");
    msg.className = "msg " + who;
    msg.textContent = text;   // textContent keeps it safe from typed HTML
    var box = document.getElementById("chatMessages");
    box.appendChild(msg);
    box.scrollTop = box.scrollHeight;
}


// ---------- 3. Quick-question buttons ----------
var chips = ["Should I water?", "Which crop is best?", "Salt risk?", "Where is the data from?"];

function showChips() {
    var html = "";
    for (var i = 0; i < chips.length; i++) {
        html += "<button type='button' class='chip'>" + chips[i] + "</button>";
    }
    document.getElementById("chatChips").innerHTML = html;

    var buttons = document.querySelectorAll(".chip");
    for (var j = 0; j < buttons.length; j++) {
        buttons[j].addEventListener("click", function () {
            handleQuestion(this.textContent);
        });
    }
}


// ---------- 4. Helpers ----------
function has(text, words) {
    for (var i = 0; i < words.length; i++) {
        if (text.includes(words[i])) return true;
    }
    return false;
}

function findDistrict(text) {
    return findDistrictIn(text);
}

var needData = "First tell me your district, e.g. \"Check Badin\", and I'll get the NASA data.";


// ---------- 5. Work out the answer ----------
async function getReply(question) {
    var q = question.toLowerCase();

    // A district was mentioned → get its NASA data first
    var key = findDistrict(q);
    if (key) {
        try { await loadDistrict(key); } catch (error) { lastResult = null; }

        if (!lastResult || lastResult.place.name !== districts[key].name) {
            return "Sorry, I couldn't load NASA data for " + districts[key].name + ". Check the internet and try again.";
        }
        // If they only named the district, give a summary
        if (!has(q, ["water", "irrigat", "soil", "rain", "salt", "crop", "rotation", "plant", "grow", "hot", "heat", "temp"])) {
            var r = lastResult;
            return "Here's " + r.place.name + ":\n" +
                r.advice.text + "\n" +
                "Soil wetness: " + Math.round(r.s.soil * 100) + "%\n" +
                r.salt.title + "\n" +
                "Best rotation for next season: " + bestName() + "\n\n" +
                "Ask me why, or about water, salt or crops.";
        }
    }

    var r = lastResult;

    // Greetings and thanks
    if (has(q, ["hello", "hi ", "hey", "salam", "assalam"]) || q === "hi") {
        return "Hi! I'm Field Helper. Tell me your district, e.g. \"Check Larkana\", then ask about watering, soil, salt or crops.";
    }
    if (has(q, ["thank", "shukria", "thx"])) {
        return "You're welcome! Good luck with your crops. 🌾";
    }

    // Where the data comes from
    if (has(q, ["nasa", "data", "source", "where", "satellite", "accurate", "trust"])) {
        return "Soil wetness, rainfall and temperature come from NASA POWER, which combines satellite measurements (including NASA's SMAP mission) with models. " +
            "The 3-day rain forecast comes from Open-Meteo, which isn't NASA data. " +
            "The numbers are estimates for an area about 50 km wide, not one field, so treat them as a guide.";
    }

    // How the rules work
    if (has(q, ["how do you", "how does", "rule", "decide", "calculate", "work out"])) {
        return "My rules are simple:\n" +
            "• Soil wetness 50%+ or 5 mm+ rain coming → wait\n" +
            "• 30–50% → water soon\n" +
            "• Under 30% and no rain → water now\n" +
            "• Dry soil or under 20 mm of rain in 90 days → recommend the low-water rotation (sorghum → wheat)\n" +
            "• Very wet soil (60%+) → high salt risk; 42°C+ → medium salt risk";
    }

    // Questions about one crop
    for (var crop in cropFacts) {
        if (q.includes(crop) || (crop === "sorghum" && q.includes("jowar")) || (crop === "mungbean" && (q.includes("moong") || q.includes("mung")))) {
            return cropFacts[crop];
        }
    }

    // Everything below needs NASA results
    if (!r) {
        if (has(q, ["water", "irrigat", "soil", "rain", "salt", "crop", "rotation", "plant", "grow", "hot", "heat", "temp", "should"])) {
            return needData;
        }
    }

    if (r) {
        // Watering
        if (has(q, ["water", "irrigat", "should i"])) {
            var forecast = r.rainNext === null ? "I couldn't get the forecast" : r.rainNext + " mm of rain is forecast for the next 3 days";
            return r.advice.text + ".\n\n" +
                "In " + r.place.name + ", the soil wetness is " + Math.round(r.s.soil * 100) + "%, and " + forecast + ".";
        }

        // Rotation / which crop
        if (has(q, ["rotation", "crop", "plant", "grow", "sow", "next season", "best"])) {
            return "For " + r.place.name + ", the best fit is " + bestName() + ".\n\n" +
                "Why: " + r.best.reason + "\n\n" +
                "Ask me about rice, wheat, sorghum or mungbean to learn more.";
        }

        // Salt
        if (has(q, ["salt", "saline", "salinity"])) {
            return r.salt.title + "\n" + r.salt.text;
        }

        // Soil
        if (has(q, ["soil", "moist", "wet", "dry"])) {
            var pct = Math.round(r.s.soil * 100);
            var meaning = pct >= 50 ? "wet enough for most crops" : pct >= 30 ? "starting to dry out" : "dry";
            return "The root-zone soil wetness in " + r.place.name + " is " + pct + "%, which is " + meaning + ". 0% is completely dry, and 100% is fully soaked.";
        }

        // Rain
        if (has(q, ["rain", "monsoon", "forecast"])) {
            var next = r.rainNext === null ? "The forecast isn't available right now." : "About " + r.rainNext + " mm is forecast for the next 3 days.";
            return r.place.name + " got " + r.s.rain + " mm of rain in the last 90 days. " + next;
        }

        // Heat
        if (has(q, ["hot", "heat", "temp"])) {
            return "The hottest day in " + r.place.name + " in the last 90 days reached " + r.s.hottest + "°C. Heat dries the soil faster, so crops need more water on hot days.";
        }
    }

    // Didn't understand
    return "Sorry, I didn't get that. Try asking:\n• \"Check Sukkur\"\n• \"Should I water?\"\n• \"Which crop is best?\"\n• \"What about salt?\"";
}

function bestName() {
    for (var i = 0; i < rotations.length; i++) {
        if (rotations[i].id === lastResult.best.id) return rotations[i].name;
    }
    return "";
}


// ---------- 6. When the user sends a question ----------
async function handleQuestion(question) {
    if (question.trim() === "") return;
    addMessage(question, "user");
    addMessage("...", "bot typing");

    var reply = await getReply(question);

    var typing = document.querySelector(".msg.typing");
    if (typing) typing.remove();
    addMessage(reply, "bot");
}

document.getElementById("chatForm").addEventListener("submit", function (event) {
    event.preventDefault();   // stops the page from reloading
    var input = document.getElementById("chatInput");
    handleQuestion(input.value);
    input.value = "";
});


// ---------- 7. Open and close ----------
document.getElementById("chatToggle").addEventListener("click", function () {
    document.getElementById("chatBox").classList.toggle("hidden");
    document.getElementById("chatInput").focus();
});

document.getElementById("chatClose").addEventListener("click", function () {
    document.getElementById("chatBox").classList.add("hidden");
});


// ---------- 8. Start ----------
addMessage("Hi! I'm Field Helper. 🌾 Tell me your district, e.g. \"Check Badin\", or tap a question below.", "bot");
showChips();
