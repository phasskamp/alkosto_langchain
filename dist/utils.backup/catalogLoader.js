import fs from "fs";
import path from "path";
import Papa from "papaparse";
// Die Funktion, die den Katalog lädt und aufbereitet
export function loadAndParseProducts() {
    // Wir nehmen den Pfad aus dem Vorschlag deines Kollegen, der ist sauber.
    // Annahme: Die CSV liegt im Projekt-Hauptverzeichnis.
    const csvPath = path.resolve(process.cwd(), "final_merged_all_categories_updated.csv");
    if (!fs.existsSync(csvPath)) {
        console.error("❌ CSV-Datei nicht im Hauptverzeichnis gefunden:", csvPath);
        return [];
    }
    const fileContent = fs.readFileSync(csvPath, "utf8");
    const parsed = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        // Dies ist der entscheidende Teil: Wir wandeln den Preis in eine Zahl um.
        transform: (value, header) => {
            if (header === 'sale_price') {
                return parseFloat(value) || 0; // Wenn Umwandlung fehlschlägt, wird es 0
            }
            return value;
        }
    });
    return parsed.data;
}
