const mongoose = require("mongoose");
const Listing = require("../models/listing.js");
const axios = require("axios");

const MONGO_URL = "mongodb://127.0.0.1:27017/EliteStay";

async function geocodeLocation(address) {
    try {
        // Clean address query
        const query = address.replace(/,/g, " ").replace(/\s+/g, " ").trim();
        console.log(`Geocoding query: "${query}"`);

        const response = await axios.get("https://nominatim.openstreetmap.org/search", {
            params: {
                q: query,
                format: "json",
                limit: 1
            },
            headers: {
                "User-Agent": "EliteStayApp/1.0"
            }
        });

        if (response.data && response.data.length > 0) {
            return {
                lat: parseFloat(response.data[0].lat),
                lng: parseFloat(response.data[0].lon)
            };
        }

        // Try searching with individual words if exact full string fails
        const locationPart = address.split(",")[0].trim();
        console.log(`Trying fallback location part: "${locationPart}"`);
        const fallbackResp = await axios.get("https://nominatim.openstreetmap.org/search", {
            params: {
                q: locationPart,
                format: "json",
                limit: 1
            },
            headers: {
                "User-Agent": "EliteStayApp/1.0"
            }
        });

        if (fallbackResp.data && fallbackResp.data.length > 0) {
            return {
                lat: parseFloat(fallbackResp.data[0].lat),
                lng: parseFloat(fallbackResp.data[0].lon)
            };
        }
    } catch (err) {
        console.error(`Geocoding error for "${address}":`, err.message);
    }

    return null;
}

async function geocodeAllListings() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB");

        const listings = await Listing.find({});
        console.log(`Processing ${listings.length} listings in DB...`);

        for (let listing of listings) {
            const loc = listing.location || "";
            const country = listing.country || "";
            const address = `${loc}, ${country}`.trim();

            console.log(`\nProcessing: "${listing.title}" | Location: "${address}"`);
            
            // Fetch live coordinates from Nominatim
            const coords = await geocodeLocation(address);

            if (coords) {
                listing.geometry = coords;
                await listing.save();
                console.log(`✅ Updated ${listing.title} -> Lat: ${coords.lat}, Lng: ${coords.lng}`);
            } else {
                console.log(`⚠️ Could not geocode "${address}". Left as is.`);
            }

            // Sleep 1 second between requests to respect Nominatim rate limit
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        console.log("\n✨ All listings geocoded and saved to MongoDB!");
        mongoose.connection.close();
    } catch (err) {
        console.error("Error:", err);
    }
}

geocodeAllListings();
