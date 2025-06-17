# Graduated Search Readiness Agent – Dokumentation

## 🌟 Ziel

Ein intelligenter Verkaufsagent für Alkosto, der frühzeitig relevante Produktempfehlungen geben kann, ohne unnötig viele Fragen zu stellen. Basierend auf dem Prinzip:

> *Früh loslegen, wenn genug Information vorliegt – aber nur dann!*

---

## 🔄 Grundprinzip: Graduated Search Logic

### 🔹 Drei Stufen der "Suchbereitschaft":

- ⚫ **INSUFFICIENT**: Noch zu wenig Kontext für eine sinnvolle Produktsuche. Nachfrage erforderlich.
- 🟡 **VIABLE**: Es fehlen noch optionale Infos, aber eine Basisempfehlung ist möglich.
- 🟢 **READY**: Alle kritischen Kriterien sind vorhanden. Produktsuche wird durchgeführt.

### 🔎 Dynamisches Kriterienschema (Beispiel: Televisor):

- **Essentiell**: `tamaño_pantalla`, `resolución`, `precio`
- **Optional**: `marca`, `tipo_panel`, `sistema_operativo`

---

## 🤝 Vorteile gegenüber anderen Agenten

| Variante            | Vorteil                                                                     | Limitation                                                    |
| ------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Graduated Agent** | Hohe Nutzerfreundlichkeit, vermeidet Overprompting, gibt frühe Empfehlungen | Erfordert gute Kategoriedefinition (Essentials vs. Optionals) |
| Dynamic Agent       | Völlig generisch, adaptiv für neue Kategorien                               | Zögert lange mit Empfehlungen                                 |
| Sophisticated Agent | Tiefe Logik pro Kategorie                                                   | Schwer skalierbar                                             |

---

## 💡 Beispielablauf

### 🔢 Eingang:

> "Busco un televisor"

### 🌐 Extraktion:

```json
{
  "kategorie": "televisor"
}
```

### 🌐 Status:

> ⚫ INSUFFICIENT ➔ Nachfrage nach `presupuesto`, `resolución`, `tamaño`

### 🔢 Folgeeingabe:

> "Para gaming, presupuesto 1.5 millones"

### 🌐 Status:

> 🟢 READY ➔ Produktsuche wird gestartet

---

## 🚀 Features (Implementiert)

-

---

## 🚧 Verbesserungspotenzial

-

---

## 🏠 Integration im Projekt

Pfad: `src/alkosto-graduated-search-agent.ts`

Starten:

```bash
pnpm tsx src/alkosto-graduated-search-agent.ts
```

Benutzt:

- `extractContextGraduated()`
- `isSearchReady()`
- `EnhancedTool`
- `recommendationPrompt`

---

## 🔧 Deployment-Status

> ✅ Ready for Production Testing

Falls du ein Frontend (z. B. mit React) integrieren willst: einfach den `context` überreichen und `respuesta` + `confidence` ausgeben.

