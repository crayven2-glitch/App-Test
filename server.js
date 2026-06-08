// Devotion – Dom/Sub Rollen-Test: minimaler statischer Server für Glitch
const express = require("express");
const app = express();

// Alle Dateien im Projektordner statisch ausliefern (index.html etc.)
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Devotion Test läuft auf Port " + PORT));
