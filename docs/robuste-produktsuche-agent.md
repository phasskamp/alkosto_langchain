# 🧠 Robuste Produktsuche mit LangChain DynamicTool

## 📦 Ziel
Dieses Modul implementiert ein robustes und fehlertolerantes Produktsuche-Tool für den AI Sales Agent. Es kann strukturierte und unstrukturierte Nutzereingaben verarbeiten und nutzt den CSV-Katalog, um semantisch passende Produkte zu finden.

---

## 📁 Struktur & Dateien

| Datei                          | Zweck                                                                 |
|--------------------------------|-----------------------------------------------------------------------|
| `src/tools/enhanced-product-search-tool.ts` | LangChain-kompatibles Tool mit intelligenter Query-Extraktion und Produktsuche |
| `src/utils/json-utils.ts`      | Sicheres Parsing von JSON-Strings (z. B. `{ input: "…" }`) mit Fallback-Strategien |
| `src/utils/product-loader.ts`  | Lädt, cached und parsed den Produktkatalog aus CSV                   |

---

## ⚙️ Funktionsweise

### 1. Tool-Definition (`enhanced-product-search-tool.ts`)
```ts
const enhancedProductSearchTool = new DynamicTool({
  name: "enhanced_product_search",
  description: "Busca productos relevantes según criterios del usuario...",
  func: async (input: string): Promise<string> => {
    const parsed = safeJsonParse<Record<string, unknown>>(input, {}, "enhanced-product-search-tool");
    const userQuery = typeof parsed === "string" ? parsed : Object.values(parsed).join(" ");
    ...
  }
});
```

**Besonderheiten**:
- Erkennt automatisch den eigentlichen Suchbegriff aus strukturierten Objekten
- Sucht auf Feldern wie `nombre`, `descripcion`, `marca`, `resolucion` etc.
- Gibt eine sprachlich formulierte Antwort oder `❌ No encontré productos…`

---

### 2. JSON Utility (`json-utils.ts`)
```ts
export function safeJsonParse<T>(
  input: string,
  fallback: T,
  context: string
): T {
  try {
    const parsed = JSON.parse(input);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return fallback;
    return parsed as T;
  } catch (e) {
    return fallback;
  }
}
```

**Vorteile**:
- Akzeptiert nur echte Objekte
- Crash-sicher auch bei `null`, Arrays oder kaputtem JSON
- Rückfall auf Fallbackwert für stabilen Agentenbetrieb

---

### 3. Produktdaten-Lader (`product-loader.ts`)
```ts
let cachedProducts: Product[] | null = null;

export async function loadAndParseProducts(): Promise<Product[]> {
  if (cachedProducts) return cachedProducts;
  const raw = await fs.promises.readFile(...);
  const parsed = parse(raw.toString(), { columns: true });
  cachedProducts = parsed as Product[];
  return cachedProducts;
}
```

**Caching**:
- Einmal geladen, werden die Produkte im RAM behalten
- Reduziert Latenz drastisch bei Folgesuchen

---

## 🧪 Tests & Validierung

Die Implementierung wurde erfolgreich getestet mit:

- `tsx src/alkosto-graduated-search-agent.ts`
- Inputs wie `"televisor"`, `{"input":"TV LG"}`, kaputtes JSON etc.
- Responses: korrektes Fallback, keine Crashes, hohe Präzision

---

## 🚧 Erweiterungsideen

| Feature                      | Ort                          | Idee                                                                |
|-----------------------------|-------------------------------|----------------------------------------------------------------------|
| Budget-Filter               | `enhanced-product-search-tool.ts` | In `toolInput.presupuesto_max` prüfen und Produkte filtern           |
| Produkt-Score Ranking       | `enhanced-product-search-tool.ts` | Scoring-Mechanismus z. B. nach Preis-Leistung einbauen               |
| Multi-CSV Unterstützung     | `product-loader.ts`           | Lade weitere CSVs je nach Kategorie                                 |
| Logging & Monitoring        | `json-utils.ts`               | Logs über winston oder console.debug für Monitoring                  |

---

## 📌 Empfehlungen

- ❗ Wenn du Änderungen am Tool machst, stets über `tsx src/test-agent.ts` testen.
- ✅ Nutze das Tool **nur** in Kombination mit strukturierter `context.category_analysis`.
- 🔍 Für Performance-Analyse kannst du die Ladezeit mit `console.time` messen.