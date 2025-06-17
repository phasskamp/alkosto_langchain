# 🧠 Hybrid-basierter KI-Verkaufsagent – Alkosto

## 📅 Datum
2025-06-16

## 🔍 Zielsetzung
Ein KI-gestützter Verkaufsagent für Alkosto, der:
1. Kundenbedürfnisse dynamisch versteht,
2. relevante Produkte im Katalog (CSV) findet,
3. Empfehlungen klar begründet,
4. ehrlich mitteilt, wenn kein passendes Produkt verfügbar ist,
5. dynamisch und kontextsensitiv Rückfragen stellt.

---

## 🤖 Warum der Hybrid-Ansatz ideal ist

| Rolle | Aufgabe |
|-------|---------|
| 🧠 **LLM (z. B. GPT)** | Versteht das Kundenbedürfnis, führt Dialog, stellt intelligente Rückfragen |
| 🛠️ **Tool (z. B. CSV-Suche)** | Findet passende Produkte im echten Katalog |
| 🧠 ➕ 🛠️ **Hybrid** | Kombiniert beide: LLM fragt, Tool liefert echte Ergebnisse |

---

## 🔁 Ablauf im Gespräch (Beispiel)

1. **User:** „Hola“
2. **LLM:** „¡Hola! ¿Qué producto estás buscando hoy?“
3. **User:** „Un televisor para mi mamá“
4. **LLM analysiert:** Kategorie = *televisor*, Budget/Marke fehlen
5. **LLM fragt:** „¿Tienes un presupuesto aproximado o una marca preferida?“
6. **User:** „Samsung, menos de 2 millones“
7. **LLM ruft Tool auf:** `buscar_productos({ kategorie: 'televisor', presupuesto_max: 2000000, marca: 'samsung' })`
8. **Tool liefert Produkte zurück**
9. **LLM präsentiert Empfehlung + Begründung**
10. **Falls keine Produkte:** LLM schlägt Alternativen vor

---

## ✅ Vorteile

- **LLM fragt nur bei Unklarheit nach**  
- **Tool liefert verlässliche, reale Produktempfehlungen**
- **LLM ist ehrlich, wenn keine Ergebnisse vorliegen**
- **Dynamisches Verhalten: keine starren Fragen**
- **Klarer, effizienter Gesprächsverlauf**

---

## 🛠️ Tool-Signatur

```ts
buscar_productos({
  kategorie: string,
  presupuesto_max?: number,
  marca?: string,
  mostrar_alternativas?: boolean
})
```

Das LLM entscheidet dynamisch, ob alle Infos für einen Tool-Call ausreichen.

---

## 🔜 Nächster Schritt

> Implementiere `alkosto-dynamic-agent.ts` mit:
> - dynamischem Gesprächsfluss
> - Memory (z. B. ConversationSummaryBufferMemory)
> - Tool-Call erst bei vollständigem Bedarf
> - Spanischem Verkaufsstil

