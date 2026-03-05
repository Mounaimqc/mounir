const wilayasData = [
    { id: "DZ-01", name: "Adrar", duration: "3-5 days", homePrice: 1000, deskPrice: 800 },
    { id: "DZ-02", name: "Chlef", duration: "1-2 days", homePrice: 500, deskPrice: 300 },
    { id: "DZ-03", name: "Laghouat", duration: "2-3 days", homePrice: 600, deskPrice: 400 },
    { id: "DZ-04", name: "Oum El Bouaghi", duration: "2-3 days", homePrice: 600, deskPrice: 400 },
    { id: "DZ-05", name: "Batna", duration: "2-3 days", homePrice: 600, deskPrice: 400 },
    { id: "DZ-06", name: "Béjaïa", duration: "1-2 days", homePrice: 500, deskPrice: 300 },
    { id: "DZ-07", name: "Biskra", duration: "2-3 days", homePrice: 600, deskPrice: 400 },
    { id: "DZ-08", name: "Béchar", duration: "3-5 days", homePrice: 1000, deskPrice: 800 },
    { id: "DZ-09", name: "Blida", duration: "1-2 days", homePrice: 400, deskPrice: 200 },
    { id: "DZ-10", name: "Bouira", duration: "1-2 days", homePrice: 500, deskPrice: 300 },
    { id: "DZ-11", name: "Tamanrasset", duration: "5-7 days", homePrice: 1500, deskPrice: 1200 },
    { id: "DZ-12", name: "Tébessa", duration: "2-3 days", homePrice: 600, deskPrice: 400 },
    { id: "DZ-13", name: "Tlemcen", duration: "2-3 days", homePrice: 700, deskPrice: 500 },
    { id: "DZ-14", name: "Tiaret", duration: "2-3 days", homePrice: 600, deskPrice: 400 },
    { id: "DZ-15", name: "Tizi Ouzou", duration: "1-2 days", homePrice: 500, deskPrice: 300 },
    { id: "DZ-16", name: "Algiers", duration: "1 day", homePrice: 300, deskPrice: 100 },
    { id: "DZ-17", name: "Djelfa", duration: "2-3 days", homePrice: 600, deskPrice: 400 },
    { id: "DZ-18", name: "Jijel", duration: "1-2 days", homePrice: 600, deskPrice: 400 },
    { id: "DZ-19", name: "Sétif", duration: "1-2 days", homePrice: 600, deskPrice: 400 },
    { id: "DZ-20", name: "Saïda", duration: "2-3 days", homePrice: 700, deskPrice: 500 },
    { id: "DZ-21", name: "Skikda", duration: "2-3 days", homePrice: 600, deskPrice: 400 },
    { id: "DZ-22", name: "Sidi Bel Abbès", duration: "2-3 days", homePrice: 700, deskPrice: 500 },
    { id: "DZ-23", name: "Annaba", duration: "1-2 days", homePrice: 600, deskPrice: 400 },
    { id: "DZ-24", name: "Guelma", duration: "2-3 days", homePrice: 600, deskPrice: 400 },
    { id: "DZ-25", name: "Constantine", duration: "1-2 days", homePrice: 600, deskPrice: 400 },
    { id: "DZ-26", name: "Médéa", duration: "1-2 days", homePrice: 500, deskPrice: 300 },
    { id: "DZ-27", name: "Mostaganem", duration: "2-3 days", homePrice: 600, deskPrice: 400 },
    { id: "DZ-28", name: "M'Sila", duration: "2-3 days", homePrice: 600, deskPrice: 400 },
    { id: "DZ-29", name: "Mascara", duration: "2-3 days", homePrice: 700, deskPrice: 500 },
    { id: "DZ-30", name: "Ouargla", duration: "3-5 days", homePrice: 900, deskPrice: 700 },
    { id: "DZ-31", name: "Oran", duration: "1-2 days", homePrice: 500, deskPrice: 300 },
    { id: "DZ-32", name: "El Bayadh", duration: "3-5 days", homePrice: 800, deskPrice: 600 },
    { id: "DZ-33", name: "Illizi", duration: "5-7 days", homePrice: 1500, deskPrice: 1200 },
    { id: "DZ-34", name: "Bordj Bou Arréridj", duration: "1-2 days", homePrice: 600, deskPrice: 400 },
    { id: "DZ-35", name: "Boumerdès", duration: "1-2 days", homePrice: 400, deskPrice: 200 },
    { id: "DZ-36", name: "El Tarf", duration: "2-3 days", homePrice: 700, deskPrice: 500 },
    { id: "DZ-37", name: "Tindouf", duration: "5-7 days", homePrice: 1500, deskPrice: 1200 },
    { id: "DZ-38", name: "Tissemsilt", duration: "2-3 days", homePrice: 600, deskPrice: 400 },
    { id: "DZ-39", name: "El Oued", duration: "3-5 days", homePrice: 800, deskPrice: 600 },
    { id: "DZ-40", name: "Khenchela", duration: "2-3 days", homePrice: 600, deskPrice: 400 },
    { id: "DZ-41", name: "Souk Ahras", duration: "2-3 days", homePrice: 700, deskPrice: 500 },
    { id: "DZ-42", name: "Tipaza", duration: "1-2 days", homePrice: 500, deskPrice: 300 },
    { id: "DZ-43", name: "Mila", duration: "2-3 days", homePrice: 600, deskPrice: 400 },
    { id: "DZ-44", name: "Aïn Defla", duration: "2-3 days", homePrice: 500, deskPrice: 300 },
    { id: "DZ-45", name: "Naâma", duration: "3-5 days", homePrice: 800, deskPrice: 600 },
    { id: "DZ-46", name: "Aïn Témouchent", duration: "2-3 days", homePrice: 700, deskPrice: 500 },
    { id: "DZ-47", name: "Ghardaïa", duration: "3-5 days", homePrice: 800, deskPrice: 600 },
    { id: "DZ-48", name: "Relizane", duration: "2-3 days", homePrice: 600, deskPrice: 400 },
    { id: "DZ-49", name: "Timimoun", duration: "3-5 days", homePrice: 1000, deskPrice: 800 },
    { id: "DZ-50", name: "Bordj Badji Mokhtar", duration: "5-7 days", homePrice: 1500, deskPrice: 1200 },
    { id: "DZ-51", name: "Ouled Djellal", duration: "3-5 days", homePrice: 700, deskPrice: 500 },
    { id: "DZ-52", name: "Béni Abbès", duration: "3-5 days", homePrice: 1000, deskPrice: 800 },
    { id: "DZ-53", name: "In Salah", duration: "5-7 days", homePrice: 1200, deskPrice: 1000 },
    { id: "DZ-54", name: "In Guezzam", duration: "5-7 days", homePrice: 1500, deskPrice: 1200 },
    { id: "DZ-55", name: "Touggourt", duration: "3-5 days", homePrice: 800, deskPrice: 600 },
    { id: "DZ-56", name: "Djanet", duration: "5-7 days", homePrice: 1500, deskPrice: 1200 },
    { id: "DZ-57", name: "El M'Ghair", duration: "3-5 days", homePrice: 700, deskPrice: 500 },
    { id: "DZ-58", name: "El Menia", duration: "3-5 days", homePrice: 800, deskPrice: 600 }
];

let geoJsonData = null;

async function loadMapData() {
    try {
        const response = await fetch('algeria_data.js');
        const text = await response.text();

        // Robust extraction: find the start of the FeatureCollection object
        let geoData = null;
        const startStr = '{"type":"FeatureCollection"';
        const startIndex = text.indexOf(startStr);

        if (startIndex !== -1) {
            // Find the end of the object by matching braces or finding the common amCharts end pattern
            // The object ends with "}]}" followed by some amCharts boilerplate
            const endStr = '}]}]'; // amCharts multi-polygon end or similar
            let endIndex = text.lastIndexOf('}]}');

            if (endIndex !== -1) {
                const jsonStr = text.substring(startIndex, endIndex + 3);
                try {
                    geoData = JSON.parse(jsonStr);
                } catch (e) {
                    console.warn("JSON parse failed, trying alternative extraction");
                    // Try to find the first valid JSON block
                    const match = text.match(/\{"type":"FeatureCollection".*?\}\]\}/);
                    if (match) geoData = JSON.parse(match[0]);
                }
            }
        }

        if (geoData) {
            geoJsonData = geoData;
            renderMap(geoJsonData);
        } else {
            console.error("Failed to parse map data from file.");
            showError("Could not extract map data. Please ensure algeria_data.js is correct.");
        }
    } catch (error) {
        console.error("Error fetching map data:", error);
        showError("Error loading map data. Please check connection and file availability.");
    }
}

function showError(msg) {
    document.getElementById('map-container').innerHTML = `<div class="error-msg">${msg}</div>`;
}

function renderMap(geoData) {
    const container = document.getElementById('map-container');
    container.innerHTML = ''; // Clear loader

    const width = container.clientWidth - 40;
    const height = 600;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 800 600");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    // Simple bounds calculation
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    geoData.features.forEach(feature => {
        const coords = feature.geometry.coordinates;
        coords.forEach(polygon => {
            const points = feature.geometry.type === "MultiPolygon" ? polygon[0] : polygon;
            points.forEach(p => {
                if (p[0] < minX) minX = p[0];
                if (p[0] > maxX) maxX = p[0];
                if (p[1] < minY) minY = p[1];
                if (p[1] > maxY) maxY = p[1];
            });
        });
    });

    const scaleX = 750 / (maxX - minX);
    const scaleY = 550 / (maxY - minY);
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (800 - (maxX - minX) * scale) / 2 - minX * scale;
    const offsetY = (600 - (maxY - minY) * scale) / 2 - minY * scale;

    geoData.features.forEach(feature => {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        let d = "";

        const processPolygon = (polygon) => {
            let pathData = "";
            polygon.forEach((ring, i) => {
                ring.forEach((p, j) => {
                    const x = p[0] * scale + offsetX;
                    const y = 600 - (p[1] * scale + offsetY); // Invert Y for SVG coordinates
                    pathData += (j === 0 ? "M" : "L") + x.toFixed(2) + "," + y.toFixed(2);
                });
                pathData += "Z";
            });
            return pathData;
        };

        if (feature.geometry.type === "Polygon") {
            d = processPolygon(feature.geometry.coordinates);
        } else if (feature.geometry.type === "MultiPolygon") {
            feature.geometry.coordinates.forEach(poly => {
                d += processPolygon(poly);
            });
        }

        path.setAttribute("d", d);
        path.setAttribute("id", feature.id);
        path.setAttribute("data-name", feature.properties.name);

        path.addEventListener('mouseenter', (e) => handleHover(e, feature));
        path.addEventListener('mouseleave', handleLeave);
        path.addEventListener('mousemove', handleMove);
        path.addEventListener('click', () => selectWilaya(feature));

        svg.appendChild(path);
    });

    container.appendChild(svg);
}

const tooltip = document.getElementById('tooltip');
const wilayaInfo = document.getElementById('wilaya-info');

function handleHover(e, feature) {
    const data = wilayasData.find(w => w.id === feature.id) || {
        name: feature.properties.name,
        duration: "N/A",
        homePrice: "N/A",
        deskPrice: "N/A"
    };

    tooltip.innerHTML = `<strong>${data.name}</strong><br>Home: ${data.homePrice} DA<br>Desk: ${data.deskPrice} DA`;
    tooltip.classList.remove('hidden');

    updateWilayaDetails(data);
}

function handleMove(e) {
    tooltip.style.left = (e.clientX + 10) + 'px';
    tooltip.style.top = (e.clientY + 10) + 'px';
}

function handleLeave() {
    tooltip.classList.add('hidden');
}

function updateWilayaDetails(data) {
    wilayaInfo.innerHTML = `
        <div class="wilaya-detail-row"><span>Wilaya:</span> <span>${data.name}</span></div>
        <div class="wilaya-detail-row"><span>Duration:</span> <span>${data.duration}</span></div>
        <div class="wilaya-detail-row"><span>Home Price:</span> <span>${data.homePrice} DA</span></div>
        <div class="wilaya-detail-row"><span>Desk Price:</span> <span>${data.deskPrice} DA</span></div>
    `;
}

function selectWilaya(feature) {
    // Optional: add active state or open modal
    console.log("Selected Wilaya:", feature.properties.name);
}

// Global customization
document.getElementById('save-settings').addEventListener('click', () => {
    const defaultHome = document.getElementById('default-price-home').value;
    const defaultDesk = document.getElementById('default-price-desk').value;

    wilayasData.forEach(w => {
        w.homePrice = defaultHome;
        w.deskPrice = defaultDesk;
    });

    alert('Settings applied to all wilayas!');
});

window.onload = loadMapData;
