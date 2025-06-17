import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { fileURLToPath } from "url";
// 🚀 In-Memory Cache für bessere Performance
let cachedProducts = null;
let cacheTimestamp = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 Minuten Cache
export function loadAndParseProducts() {
    const now = Date.now();
    // ✅ Verwende Cache wenn noch gültig
    if (cachedProducts && (now - cacheTimestamp) < CACHE_DURATION_MS) {
        console.log(`📦 Products loaded from cache (${cachedProducts.length} products)`);
        return cachedProducts;
    }
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const csvPath = path.resolve(__dirname, "../../final_merged_all_categories_updated.csv");
    if (!fs.existsSync(csvPath)) {
        console.error("❌ CSV-Datei nicht im Projektverzeichnis gefunden:", csvPath);
        return [];
    }
    console.log("🔄 Loading products from CSV...");
    const startTime = Date.now();
    const fileContent = fs.readFileSync(csvPath, "utf8");
    const parsed = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        transform: (value, header) => {
            if (header === "sale_price") {
                // 🔧 Robustere Preis-Verarbeitung
                const numValue = parseFloat(value?.toString().replace(/[^\d.-]/g, '') || '0');
                return numValue || 0;
            }
            // 🔧 Trimme Leerzeichen von allen String-Werten
            return value?.toString().trim() || "";
        },
    });
    // 🔧 Filtere ungültige Produkte raus
    const validProducts = parsed.data.filter(p => {
        return (p.title &&
            p.title.trim().length > 0 &&
            p.sale_price > 0 &&
            p.product_type &&
            p.product_type.trim().length > 0);
    });
    // 🚀 Füge berechnete Felder hinzu für bessere Performance
    const enrichedProducts = validProducts.map(p => ({
        ...p,
        // Für schnellere Suche: alle Suchfelder in Kleinbuchstaben
        _searchTitle: p.title.toLowerCase(),
        _searchType: (p.product_type || "").toLowerCase(),
        _searchBrand: (p.brand || "").toLowerCase(),
        _searchFeatures: (p.Key_features || "").toLowerCase(),
        // Extrahiere Bildschirmgröße einmalig
        _screenSize: extractScreenSize(p.title),
        // Kategorie für bessere Filterung
        _category: categorizeProduct(p.product_type || "", p.title || "")
    }));
    // 🚀 Cache aktualisieren
    cachedProducts = enrichedProducts;
    cacheTimestamp = now;
    const loadTime = Date.now() - startTime;
    console.log(`✅ ${validProducts.length} products loaded and cached in ${loadTime}ms`);
    console.log(`📊 Categories found: ${getCategoryStats(enrichedProducts)}`);
    return cachedProducts;
}
// 🔧 Hilfsfunktion: Bildschirmgröße extrahieren
function extractScreenSize(title) {
    const sizeMatch = title.match(/(\d+)["'']/);
    return sizeMatch ? sizeMatch[1] + '"' : 'N/A';
}
// 🔧 Hilfsfunktion: Produkt kategorisieren
function categorizeProduct(productType, title) {
    const text = (productType + " " + title).toLowerCase();
    if (text.includes('tv') || text.includes('televisor') || text.includes('television')) {
        return 'televisor';
    }
    if (text.includes('nevera') || text.includes('refrigerador') || text.includes('frigorifico')) {
        return 'nevera';
    }
    if (text.includes('lavadora') || text.includes('washing')) {
        return 'lavadora';
    }
    if (text.includes('celular') || text.includes('smartphone') || text.includes('telefono')) {
        return 'celular';
    }
    if (text.includes('computador') || text.includes('laptop') || text.includes('pc')) {
        return 'computador';
    }
    if (text.includes('tablet') || text.includes('ipad')) {
        return 'tablet';
    }
    if (text.includes('parlante') || text.includes('speaker') || text.includes('altavoz')) {
        return 'parlante';
    }
    if (text.includes('auricular') || text.includes('headphone') || text.includes('earphone')) {
        return 'auriculares';
    }
    if (text.includes('microondas') || text.includes('microwave')) {
        return 'microondas';
    }
    if (text.includes('aire') && text.includes('acondicionado')) {
        return 'aire_acondicionado';
    }
    return 'otros';
}
// 🔧 Hilfsfunktion: Kategorie-Statistiken
function getCategoryStats(products) {
    const categories = products.reduce((acc, p) => {
        const cat = p._category || 'otros';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
    }, {});
    return Object.entries(categories)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([cat, count]) => `${cat}(${count})`)
        .join(', ');
}
// 🔧 Cache-Management Funktionen
export function clearProductCache() {
    cachedProducts = null;
    cacheTimestamp = 0;
    console.log("🗑️ Product cache cleared");
}
export function getCacheInfo() {
    const now = Date.now();
    return {
        isCached: cachedProducts !== null,
        age: now - cacheTimestamp,
        count: cachedProducts?.length || 0
    };
}
