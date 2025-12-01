const express = require("express");
const router = express.Router();
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// ---------------- POST /api/suitability/run ----------------
router.post("/run", async (req, res) => {
  try {
    const scriptPath = path.join(__dirname, "../scripts/run_suitability.py");

    // Use spawn to run the Python script
    const pythonProcess = spawn("python", [scriptPath]);

    pythonProcess.stdout.on("data", (data) => {
      console.log(`🐍 Python: ${data.toString()}`);
    });

    pythonProcess.stderr.on("data", (data) => {
      console.error(`❌ Python Error: ${data.toString()}`);
    });

    pythonProcess.on("close", (code) => {
      if (code === 0) {
        // Script finished successfully, now read the outputs
        const geojsonPath = path.join(__dirname, "../output/predicted_polygons.geojson");
        const heatmapPath = "/output/suitability_map.png"; // frontend fetchable static route

        fs.readFile(geojsonPath, "utf8", (err, data) => {
          if (err) {
            console.error("❌ Failed to read GeoJSON:", err);
            return res.status(500).json({ error: "Failed to read GeoJSON output" });
          }

          const geojson = JSON.parse(data);
          const features = geojson.features;

          // Compute summary stats
          const suitabilityScores = features.map(f => f.properties.suitability);
          const summary = {
            mean_score: suitabilityScores.reduce((a,b) => a+b, 0) / suitabilityScores.length,
            max_score: Math.max(...suitabilityScores),
            min_score: Math.min(...suitabilityScores)
          };

          res.json({
            message: "Suitability analysis complete",
            summary,
            heatmap: heatmapPath
          });
        });

      } else {
        console.error(`❌ Python script exited with code ${code}`);
        res.status(500).json({ error: "Python script failed" });
      }
    });

  } catch (err) {
    console.error("❌ Route error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/save", (req, res) => {
  const { heatmap, summary, timestamp } = req.body;
  console.log("Saving suitability result:", { heatmap, summary, timestamp });
  res.json({ message: "Saved successfully" });
});

module.exports = router;  