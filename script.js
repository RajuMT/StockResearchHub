
let stocks = [];

// -------------------------------
// NAVIGATION
// -------------------------------
document.querySelectorAll(".menu button").forEach(button => {
    button.addEventListener("click", function () {
        document.querySelectorAll(".menu button").forEach(b =>
            b.classList.remove("active")
        );

        document.querySelectorAll(".page").forEach(page =>
            page.classList.remove("active")
        );

        this.classList.add("active");

        const page = document.getElementById(this.dataset.page);
        if (page) page.classList.add("active");
    });
});

// -------------------------------
// DATE
// -------------------------------
const today = document.getElementById("today");

if (today) {
    today.textContent = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

// -------------------------------
// CSV PARSER
// Supports commas inside quoted fields
// -------------------------------
function parseCSV(text) {
    text = text.replace(/^\uFEFF/, "");

    const rows = [];
    let row = [];
    let field = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];

        if (char === '"' && insideQuotes && next === '"') {
            field += '"';
            i++;
        } else if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === "," && !insideQuotes) {
            row.push(field.trim());
            field = "";
        } else if ((char === "\n" || char === "\r") && !insideQuotes) {
            if (char === "\r" && next === "\n") i++;

            row.push(field.trim());

            if (row.some(value => value !== "")) {
                rows.push(row);
            }

            row = [];
            field = "";
        } else {
            field += char;
        }
    }

    row.push(field.trim());

    if (row.some(value => value !== "")) {
        rows.push(row);
    }

    return rows;
}

// -------------------------------
// SAFE HTML DISPLAY
// -------------------------------
function safe(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// -------------------------------
// CSV IMPORT
// -------------------------------
const csvFile = document.getElementById("csvFile");

if (!csvFile) {
    console.error("CSV control not found. Check index.html for id='csvFile'.");
} else {
    csvFile.addEventListener("change", function (event) {
        const file = event.target.files[0];

        if (!file) {
            alert("Please select a CSV file.");
            return;
        }

        if (!file.name.toLowerCase().endsWith(".csv")) {
            alert("Please select a .csv file.");
            return;
        }

        const reader = new FileReader();

        reader.onload = function (e) {
            try {
                const rows = parseCSV(e.target.result);

                if (rows.length < 2) {
                    throw new Error("CSV file is empty or has no company records.");
                }

                const headers = rows[0].map(h =>
                    h.replace(/^\uFEFF/, "").trim()
                );

                const required = [
                    "Symbol",
                    "Company Name",
                    "Sector",
                    "Themes",
                    "Market Capitalization"
                ];

                const indexes = {};

                required.forEach(name => {
                    indexes[name] = headers.indexOf(name);
                });

                const missing = required.filter(name =>
                    indexes[name] === -1
                );

                if (missing.length > 0) {
                    throw new Error(
                        "Missing CSV columns: " + missing.join(", ") +
                        ". Please check the CSV header row."
                    );
                }

                stocks = rows.slice(1)
                    .filter(row => row.some(value => value.trim() !== ""))
                    .map(row => ({
                        symbol: row[indexes["Symbol"]] || "",
                        name: row[indexes["Company Name"]] || "",
                        sector: row[indexes["Sector"]] || "",
                        theme: row[indexes["Themes"]] || "",
                        marketCap: row[indexes["Market Capitalization"]] || ""
                    }))
                    .filter(stock => stock.symbol !== "");

                if (stocks.length === 0) {
                    throw new Error("No valid company records found.");
                }

                populateFilters();
                renderStocks();

                alert("Successfully imported " + stocks.length + " companies!");

            } catch (error) {
                console.error("CSV import error:", error);
                alert("CSV import failed: " + error.message);
            }
        };

        reader.onerror = function () {
            alert("Unable to read the CSV file. Please try again.");
        };

        reader.readAsText(file);
    });
}

// -------------------------------
// POPULATE SECTOR AND THEME FILTERS
// -------------------------------
function populateFilters() {
    const sectorFilter = document.getElementById("sectorFilter");
    const themeFilter = document.getElementById("themeFilter");

    if (!sectorFilter || !themeFilter) return;

    const sectors = [...new Set(
        stocks.map(s => s.sector).filter(Boolean)
    )].sort();

    const themes = [...new Set(
        stocks.map(s => s.theme).filter(Boolean)
    )].sort();

    sectorFilter.innerHTML =
        '<option value="All">All Sectors</option>';

    themeFilter.innerHTML =
        '<option value="All">All Themes</option>';

    sectors.forEach(value => {
        sectorFilter.innerHTML +=
            `<option value="${safe(value)}">${safe(value)}</option>`;
    });

    themes.forEach(value => {
        themeFilter.innerHTML +=
            `<option value="${safe(value)}">${safe(value)}</option>`;
    });
}

// -------------------------------
// RENDER STOCK TABLE
// -------------------------------
function renderStocks() {
    const table = document.getElementById("stockTable");
    const count = document.getElementById("stockCount");

    if (!table) {
        console.error("Cannot find stockTable in index.html.");
        return;
    }

    const search = (
        document.getElementById("searchInput")?.value || ""
    ).toLowerCase();

    const sector = document.getElementById("sectorFilter")?.value || "All";
    const theme = document.getElementById("themeFilter")?.value || "All";
    const cap = document.getElementById("capFilter")?.value || "All";
    const sort = document.getElementById("sortCap")?.value || "Default";

    let filtered = stocks.filter(stock => {
        const matchesSearch =
            stock.symbol.toLowerCase().includes(search) ||
            stock.name.toLowerCase().includes(search);

        const matchesSector =
            sector === "All" || stock.sector === sector;

        const matchesTheme =
            theme === "All" || stock.theme === theme;

        const matchesCap =
            cap === "All" || stock.marketCap === cap;

        return matchesSearch &&
            matchesSector &&
            matchesTheme &&
            matchesCap;
    });

    const capOrder = {
        "Large Cap": 1,
        "Mid Cap": 2,
        "Small Cap": 3
    };

    if (sort === "Large") {
        filtered.sort((a, b) =>
            (capOrder[a.marketCap] || 99) -
            (capOrder[b.marketCap] || 99)
        );
    } else if (sort === "Small") {
        filtered.sort((a, b) =>
            (capOrder[b.marketCap] || 0) -
            (capOrder[a.marketCap] || 0)
        );
    }

    table.innerHTML = filtered.map((stock, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${safe(stock.symbol)}</td>
            <td>${safe(stock.name)}</td>
            <td>${safe(stock.sector)}</td>
            <td>${safe(stock.theme)}</td>
            <td>${safe(stock.marketCap)}</td>
        </tr>
    `).join("");

    if (count) {
        count.textContent =
            `Showing ${filtered.length} of ${stocks.length} companies`;
    }
}

// -------------------------------
// FILTER EVENT LISTENERS
// -------------------------------
["searchInput", "sectorFilter", "themeFilter", "capFilter", "sortCap"]
    .forEach(id => {
        const element = document.getElementById(id);

        if (element) {
            element.addEventListener("input", renderStocks);
            element.addEventListener("change", renderStocks);
        }
    });

// -------------------------------

// -------------------------------
// AUTOMATIC CSV DATABASE LOADING
// -------------------------------

async function loadCompanyDatabase() {
    const stockTable = document.getElementById("stockTable");
    const stockCount = document.getElementById("stockCount");

    if (stockTable) {
        stockTable.innerHTML = `
            <tr>
                <td colspan="6">Loading company database...</td>
            </tr>
        `;
    }

    try {
        const response = await fetch("companies.csv");

        if (!response.ok) {
            throw new Error("Could not find companies.csv");
        }

        const csvText = await response.text();
        const rows = parseCSV(csvText);

        if (rows.length < 2) {
            throw new Error("Company database is empty.");
        }

        const headers = rows[0].map(h =>
            h.replace(/^\uFEFF/, "").trim()
        );

        const required = [
            "Symbol",
            "Company Name",
            "Sector",
            "Themes",
            "Market Capitalization"
        ];

        const indexes = {};

        required.forEach(name => {
            indexes[name] = headers.indexOf(name);
        });

        const missing = required.filter(name =>
            indexes[name] === -1
        );

        if (missing.length > 0) {
            throw new Error("Missing columns: " + missing.join(", "));
        }

        stocks = rows.slice(1)
            .filter(row => row.some(value => value.trim() !== ""))
            .map(row => ({
                symbol: row[indexes["Symbol"]] || "",
                name: row[indexes["Company Name"]] || "",
                sector: row[indexes["Sector"]] || "",
                theme: row[indexes["Themes"]] || "",
                marketCap: row[indexes["Market Capitalization"]] || ""
            }))
            .filter(stock => stock.symbol !== "");

        if (stocks.length === 0) {
            throw new Error("No company records found.");
        }

        populateFilters();
        renderStocks();

        console.log("Company database loaded:", stocks.length);

    } catch (error) {
        console.error("Automatic database loading failed:", error);

        if (stockTable) {
            stockTable.innerHTML = `
                <tr>
                    <td colspan="6">
                        Automatic loading failed.
                        Please use the CSV file selection control.
                    </td>
                </tr>
            `;
        }

        if (stockCount) {
            stockCount.textContent = error.message;
        }
    }
}

// Start automatic loading when the page opens
loadCompanyDatabase();


// ==========================================
// DONCHIAN SCANNER - AUTOMATIC CSV LOADING
// ==========================================

let donchianData = [];

function parseDonchianCSV(text) {
    const rows = [];
    let row = [];
    let field = "";
    let insideQuotes = false;

    text = text.replace(/^\uFEFF/, "");

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (ch === '"') {
            if (insideQuotes && text[i + 1] === '"') {
                field += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (ch === "," && !insideQuotes) {
            row.push(field);
            field = "";
        } else if ((ch === "\n" || ch === "\r") && !insideQuotes) {
            if (ch === "\r" && text[i + 1] === "\n") i++;
            row.push(field);
            if (row.some(value => value.trim() !== "")) rows.push(row);
            row = [];
            field = "";
        } else {
            field += ch;
        }
    }

    row.push(field);
    if (row.some(value => value.trim() !== "")) rows.push(row);

    if (rows.length < 2) return [];

    const headers = rows[0].map(h => h.trim());

    return rows.slice(1).map(values => {
        const item = {};
        headers.forEach((header, index) => {
            item[header] = (values[index] || "").trim();
        });
        return item;
    });
}

function dcValue(item, column) {
    return item[column] ?? "";
}

function dcEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function dcNumber(value) {
    if (value === "" || value === null || value === undefined) return "-";
    const number = Number(String(value).replace(/,/g, ""));
    return Number.isFinite(number)
        ? number.toLocaleString("en-IN", { maximumFractionDigits: 2 })
        : dcEscape(value);
}

function dcSignal(item) {
    return String(dcValue(item, "DC Signal")).trim().toUpperCase();
}

function renderDonchian() {
    const search = document.getElementById("dcSearch");
    const signalFilter = document.getElementById("dcSignalFilter");
    const results = document.getElementById("donchianResults");
    const status = document.getElementById("dcStatus");

    if (!results || !status) return;

    const searchText = (search?.value || "").toLowerCase();
    const selectedSignal = signalFilter?.value || "";
    const sectorSelector = document.getElementById("dcSectorFilter");

const selectedSectors = sectorSelector
    ? Array.from(sectorSelector.selectedOptions)
        .map(option => option.value)
        .filter(value => value !== "")
    : [];

const dailyChoice = document.getElementById("dcDailyFilter")?.value || "";
const weeklyChoice = document.getElementById("dcWeeklyFilter")?.value || "";
const monthlyChoice = document.getElementById("dcMonthlyFilter")?.value || "";

function dcMatchesYesNo(item, column, choice) {
    if (!choice) return true;

    const value = String(dcValue(item, column)).trim().toLowerCase();

    const isYes = ["true", "1", "yes", "y"].includes(value);

    return choice === "YES" ? isYes : !isYes;
}


    
const filtered = donchianData.filter(item => {
    const symbol = dcValue(item, "Symbol").toLowerCase();
    const company = dcValue(item, "Company Name").toLowerCase();

    const matchesSearch =
        symbol.includes(searchText) || company.includes(searchText);

    const matchesSignal =
        !selectedSignal || dcSignal(item) === selectedSignal;
        const matchesSector =
    selectedSectors.length === 0 ||
    selectedSectors.includes(dcValue(item, "Sector").trim());

    const matchesDaily =
        dcMatchesYesNo(item, "DC New High D", dailyChoice);

    const matchesWeekly =
        dcMatchesYesNo(item, "DC New High W", weeklyChoice);

    const matchesMonthly =
        dcMatchesYesNo(item, "DC New High M", monthlyChoice);

    return matchesSearch && matchesSignal && matchesSector &&
       matchesDaily && matchesWeekly && matchesMonthly;
});


// Sort scanner results
const sortOption = document.getElementById("dcSort")?.value || "default";

const signalOrder = {
    BUY: 1,
    HOLD: 2,
    TRIM: 3,
    SELL: 4
};

if (sortOption === "bull") {
    filtered.sort((a, b) =>
        (Number(dcValue(b, "Total Bull")) || 0) -
        (Number(dcValue(a, "Total Bull")) || 0)
    );
} else if (sortOption === "symbol") {
    filtered.sort((a, b) =>
        dcValue(a, "Company Name").localeCompare(dcValue(b, "Company Name"))
    );
} else if (sortOption === "buy") {
    filtered.sort((a, b) =>
        (signalOrder[dcSignal(a)] || 5) -
        (signalOrder[dcSignal(b)] || 5)
    );
}


// Apply selected table-column sorting
if (dcCurrentSort) {
    filtered.sort((a, b) => {
        let valueA = dcValue(a, dcCurrentSort);
        let valueB = dcValue(b, dcCurrentSort);

        if (dcCurrentSort === "serial") {
            valueA = 0;
            valueB = 0;
        } else if (
            ["LTP", "DC Chan %", "Months BUY",
             "Months SELL", "Total Bull"].includes(dcCurrentSort)
        ) {
            valueA = Number(valueA) || 0;
            valueB = Number(valueB) || 0;
        } else if (dcCurrentSort.startsWith("DC New High")) {
            valueA = ["true", "1", "yes", "y"].includes(
                String(valueA).toLowerCase()
            ) ? 1 : 0;

            valueB = ["true", "1", "yes", "y"].includes(
                String(valueB).toLowerCase()
            ) ? 1 : 0;
        } else {
            valueA = String(valueA).toLowerCase();
            valueB = String(valueB).toLowerCase();
        }

        let result = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;

        return dcSortAscending ? result : -result;
    });
}

    const buy = donchianData.filter(item => dcSignal(item) === "BUY").length;
    const hold = donchianData.filter(item => dcSignal(item) === "HOLD").length;
    const sell = donchianData.filter(item => dcSignal(item) === "SELL").length;
    const trim = donchianData.filter(item => dcSignal(item) === "TRIM").length;

    document.getElementById("dcTotalStocks").textContent = donchianData.length;
    document.getElementById("dcBuyCount").textContent = buy;
    document.getElementById("dcHoldCount").textContent = hold;
    document.getElementById("dcSellCount").textContent = sell;
    document.getElementById("dcTrimCount").textContent = trim;

    status.textContent =
        `Showing ${filtered.length} of ${donchianData.length} scanner records`;

    if (filtered.length === 0) {
        results.innerHTML =
            '<tr><td colspan="13">No matching scanner records found.</td></tr>';
        return;
    }

    results.innerHTML = filtered.map((item, index) => {
        const signal = dcSignal(item);
        const signalClass = ["BUY", "HOLD", "TRIM", "SELL"].includes(signal)
            ? signal.toLowerCase()
            : "";

        return `
            <tr>
                <td>${index + 1}</td>
                <td>${dcEscape(dcValue(item, "Symbol"))}</td>
                <td>${dcEscape(dcValue(item, "Company Name"))}</td>
                <td>${dcEscape(dcValue(item, "Sector"))}</td>
                <td>${dcNumber(dcValue(item, "LTP"))}</td>
                <td><span class="dc-signal ${signalClass}">${dcEscape(signal || "-")}</span></td>
                <td>${dcNumber(dcValue(item, "DC Chan %"))}</td>
                <td>${dcNumber(dcValue(item, "Months BUY"))}</td>
                <td>${dcNumber(dcValue(item, "Months SELL"))}</td>
                <td>${dcEscape(dcValue(item, "DC New High D") || "-")}</td>
                <td>${dcEscape(dcValue(item, "DC New High W") || "-")}</td>
                <td>${dcEscape(dcValue(item, "DC New High M") || "-")}</td>
                <td>${dcNumber(dcValue(item, "Total Bull"))}</td>
            </tr>
        `;
    }).join("");
}

async function loadDonchianCSV() {
    const status = document.getElementById("dcStatus");

    if (!status) return;

    try {
        status.textContent = "Loading Donchian scanner data...";

        const response = await fetch("donchian_dashboard.csv");

        if (!response.ok) {
            throw new Error("CSV file not found. Check the website folder.");
        }

        const csvText = await response.text();
        donchianData = parseDonchianCSV(csvText);
        populateDonchianSectors();

        if (donchianData.length === 0) {
            throw new Error("The CSV file contains no scanner records.");
        }

        renderDonchian();

        status.textContent =
            `Successfully loaded ${donchianData.length} scanner records.`;

    } catch (error) {
        status.textContent = "Donchian loading error: " + error.message;
        console.error("Donchian CSV error:", error);
    }
}

document.getElementById("dcSearch")?.addEventListener("input", renderDonchian);
document.getElementById("dcSignalFilter")?.addEventListener("change", renderDonchian);

loadDonchianCSV();

// Sorting dropdown
document.getElementById("dcSort")?.addEventListener("change", renderDonchian);

// Download currently filtered scanner results
document.getElementById("dcDownload")?.addEventListener("click", function () {
    const searchText = (document.getElementById("dcSearch")?.value || "").toLowerCase();
    const selectedSignal = document.getElementById("dcSignalFilter")?.value || "";

    const filtered = donchianData.filter(item => {
        const matchesSearch =
            dcValue(item, "Symbol").toLowerCase().includes(searchText) ||
            dcValue(item, "Company Name").toLowerCase().includes(searchText);

        const matchesSignal =
            !selectedSignal || dcSignal(item) === selectedSignal;

        return matchesSearch && matchesSignal;
    });

    if (filtered.length === 0) {
        alert("No records available to download.");
        return;
    }

    const headers = Object.keys(filtered[0]);
    const csv = [
        headers.join(","),
        ...filtered.map(item =>
            headers.map(header =>
                '"' + String(item[header] ?? "").replace(/"/g, '""') + '"'
            ).join(",")
        )
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Donchian_Filtered_Results.csv";
    link.click();
    URL.revokeObjectURL(url);
});
document.getElementById("dcDailyFilter")
    ?.addEventListener("change", renderDonchian);

document.getElementById("dcWeeklyFilter")
    ?.addEventListener("change", renderDonchian);

document.getElementById("dcMonthlyFilter")
    ?.addEventListener("change", renderDonchian);

// ==========================================
// CLICK TABLE HEADINGS TO SORT
// ==========================================

let dcCurrentSort = "";
let dcSortAscending = true;

document.querySelectorAll("#donchian th[data-sort]").forEach(header => {
    header.style.cursor = "pointer";

    header.addEventListener("click", function () {
        const column = this.dataset.sort;

        if (dcCurrentSort === column) {
            dcSortAscending = !dcSortAscending;
        } else {
            dcCurrentSort = column;
            dcSortAscending = true;
        }

        document.querySelectorAll("#donchian th[data-sort]").forEach(th => {
            th.textContent = th.textContent.replace(/[▲▼↕]/g, "").trim();
        });

        this.textContent += dcSortAscending ? " ▲" : " ▼";

        renderDonchian();
    });
});

// ==========================================
// DONCHIAN SECTOR FILTER
// ==========================================

function populateDonchianSectors() {
    const selector = document.getElementById("dcSectorFilter");
    if (!selector) return;

    const sectors = [...new Set(
        donchianData
            .map(item => dcValue(item, "Sector").trim())
            .filter(sector => sector !== "")
    )].sort();

    selector.innerHTML =
        '<option value="">All Sectors</option>' +
        sectors.map(sector =>
            `<option value="${dcEscape(sector)}">${dcEscape(sector)}</option>`
        ).join("");
}

document.getElementById("dcSectorFilter")
    ?.addEventListener("change", renderDonchian);
