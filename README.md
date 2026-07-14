# Wohnungsplaner

Ein maßstabsgetreuer Wohnungsplaner im Browser – inspiriert vom Baumodus aus *Die Sims*.
Wände und Möbel lassen sich **auf den Zentimeter genau** planen, einfärben und anschließend
in einer **First-Person-Ansicht** begehen.

## Features

- **2D-Draufsicht (Editor)**
  - Wände zeichnen per Klicken & Ziehen, mit Raster-Einrasten (1 / 5 / 10 / 25 cm)
  - Jede Wand einzeln anpassbar: Länge, Dicke, Höhe, Farbe – zentimetergenau über das Eigenschaften-Panel
  - Wände verschieben und Endpunkte per Griff nachträglich ziehen
  - Wände und Möbel per Klick oder **Strg+D** duplizieren (versetzt um das Raster)
  - **Türen** aus dem Katalog: Zimmertür (80 cm), Wohnungstür (90 cm), breite und Doppeltüren – schneiden automatisch Wandöffnungen frei
  - Möbel per Klick aus dem Katalog platzieren, verschieben und drehen (blauer Griff ziehen, `R` oder Buttons im Panel)
  - Alle Möbelmaße (Breite × Tiefe × Höhe) und Farben frei einstellbar
  - Maßstabsleiste, Live-Cursor-Position in Metern und dynamische Maßstabsanzeige
- **Möbelkatalog mit realen Standardmaßen**
  - Wohnen: Sofa, **Übereck-Sofa**, Sessel, Esstisch, Couchtisch, Stuhl, Regal, Kommode, Teppich, Pflanze
  - Schlafen: Doppelbett (160×200), Einzelbett (90×200), Kleiderschrank
  - Technik: Schreibtisch, **Monitor**, **PC-Tower**, **Fernseher**, TV-Lowboard
  - Lampen: **Stehlampe**, Tischlampe, **Deckenlampe (Pendel)**, flache Deckenleuchte – alle leuchten in 3D echt
  - Küche & Bad: Küchenzeile, **Unterschränke, Oberschränke, Spüle, Kochfeld, Backofen, Geschirrspüler, Dunstabzugshaube, Kücheninsel**, Kühlschrank, Gefrierschrank, Mikrowelle, Waschmaschine, Trockner, Weinkühlschrank
  - Bad: Badewanne, Dusche, Waschbecken, WC
- **3D-First-Person-Ansicht**
  - Frei durch die Wohnung laufen: `WASD` + Maus, `Shift` = rennen, Augenhöhe 1,60 m
  - Decken inklusive – Deckenlampen hängen von der Decke und beleuchten die Räume
  - Kollision mit Wänden (man läuft nicht hindurch – Türöffnungen freilassen!)
  - Tageslicht mit Schatten + warme Innenbeleuchtung
- **Speichern**: automatisch im Browser (localStorage) sowie Export/Import als JSON-Datei

## Starten

Direkt im Browser öffnen: [https://spassigxD.github.io/wohnungsplaner/](https://spassigxD.github.io/wohnungsplaner/)

Lokal entwickeln:

```bash
npm install
npm run dev
```

## Bedienung

| Aktion | Bedienung |
| --- | --- |
| Wand zeichnen | Werkzeug „Wand zeichnen“, dann klicken & ziehen (`Shift` = freier Winkel) |
| Auswählen / verschieben | Werkzeug „Auswählen“, Element anklicken und ziehen |
| Duplizieren | `Strg+D` / `Cmd+D` oder Button im Eigenschaften-Panel |
| Tür platzieren | Wand auswählen, dann Tür im Katalog wählen – sie wird in dieser Wand platziert |
| Möbel drehen | Blauen Griff ziehen, `R` (+15°), `Shift+R` (−15°), Buttons oder Gradzahl im Panel |
| Löschen | `Entf` / `Backspace` |
| Ansicht verschieben | Rechte Maustaste ziehen oder `Leertaste` + ziehen |
| Zoomen | `Strg`/`Cmd` + Scrollen (oder Pinch), Buttons `+`/`−` |
| 3D begehen | Button „3D begehen“, dann klicken → `WASD` + Maus, `Esc` gibt die Maus frei |

**Tipp Türen:** Türen aus dem Katalog an eine Wand ziehen – sie richten sich automatisch aus
und schneiden die Öffnung frei (üblich: 80 cm Zimmertür, 90 cm Wohnungstür).

## Maßstab – was bedeutet das hier und was ist sinnvoll?

**Intern arbeitet die App immer im Maßstab 1:1**: Alle Maße werden in echten Zentimetern
gespeichert, die 3D-Ansicht rechnet 1 Einheit = 1 Meter. Dadurch ist alles automatisch
maßstabsgetreu – ein 2,60 m hoher Raum wirkt in der First-Person-Ansicht (Augenhöhe 1,60 m)
genauso wie in echt.

Auf dem Bildschirm ist der Maßstab dynamisch (Zoom); die Statusleiste zeigt den ungefähren
aktuellen Bildschirm-Maßstab an. Relevant wird ein fester Maßstab erst, wenn man den Plan
**druckt oder zeichnet**. Die in der Bauplanung üblichen Maßstäbe:

| Maßstab | 1 cm auf dem Plan = | Typische Verwendung | Empfehlung |
| --- | --- | --- | --- |
| **1:50** | 50 cm real | **Wohnungsgrundriss mit Möblierung** – der Standard für Werkpläne und Einrichtungsplanung. Eine 8×6-m-Wohnung wird zu handlichen 16×12 cm auf Papier, und 1 cm Planraster entspricht praktischen 50 cm. | ✅ **Beste Wahl für diese App** |
| 1:100 | 1 m real | Ganze Geschosse/Gebäude, Bauantrag. Für Möbelplanung zu grob (ein Stuhl ist nur ~4,5 mm groß). | Nur für Übersichten |
| 1:20 | 20 cm real | Detailplanung einzelner Räume, z. B. Küche oder Bad mit exakten Anschlussmaßen. | Gut für einzelne Räume |
| 1:10 | 10 cm real | Möbel-/Einbaudetails (Schreinerpläne, einzelne Schränke). Eine ganze Wohnung passt damit auf kein normales Blatt (8 m → 80 cm!). | Nur für Möbeldetails |

**Kurz-Empfehlung:**

- **1:50** für den kompletten Wohnungsgrundriss – Industriestandard, ideale Balance aus
  Übersicht und Detailgenauigkeit.
- **1:20** wenn du einen einzelnen Raum (Küche, Bad, Arbeitszimmer) im Detail planst.
- **1:10** nur für einzelne Möbelstücke oder Einbaudetails.
- 1:100 nur als Übersicht für sehr große Wohnungen/ganze Etagen.

Faustregel: reale Länge ÷ Maßstabszahl = Länge auf dem Papier.
Beispiel 1:50 → 4 m Wand ÷ 50 = 8 cm auf dem Plan.

## Technik

- [Vite](https://vitejs.dev/) + TypeScript
- 2D-Editor: HTML-Canvas (eigener Renderer mit Zoom/Pan/Snapping)
- 3D-Ansicht: [Three.js](https://threejs.org/) mit PointerLock-Steuerung
- Keine Backend-Abhängigkeit – alles läuft lokal im Browser

## Projektstruktur

```
src/
  model.ts        Datenmodell (Wände, Möbel, cm-genau) + Beispielwohnung + Speicherung
  catalog.ts      Möbelkatalog mit realen Standardmaßen
  editor2d.ts     2D-Draufsicht: Rendern + Interaktion (Zeichnen, Ziehen, Snapping)
  furniture3d.ts  Parametrische 3D-Modelle für alle Möbeltypen
  view3d.ts       First-Person-3D-Ansicht (Three.js, Kollision, Beleuchtung)
  ui.ts           Toolbar, Katalog- und Eigenschaften-Panel
  main.ts         Einstiegspunkt
```
