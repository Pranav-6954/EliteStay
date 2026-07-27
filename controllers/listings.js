const Listing = require("../models/listing.js");
const axios = require("axios");

//Index Route
module.exports.index = async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index.ejs", { allListings });
};

// Crate New Route Form
module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

// Show Route
module.exports.showListings = async (req, res) => {
    let { id } = req.params;

    const listing = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: {
                path: "author",
            },
        })
        .populate("owner");

    res.render("listings/show.ejs", { listing });
};

// Helper for robust Geocoding
// Smart Progressive Geocoder (handles detailed addresses, prefixes, PO boxes, PIN codes)
async function getGeocodeCoordinates(location, country) {
    let loc = (location || "").trim();
    let cntr = (country || "").trim();
    let fullRaw = [loc, cntr].filter(Boolean).join(", ");
    if (!fullRaw) return null;

    // Clean up title prefixes (e.g., "Marari Villas:"), "PO", PIN codes, and Kokan spelling
    let cleaned = fullRaw
        .replace(/^[^\:]+\:\s*/, "")
        .replace(/\b(PO|P\.O\.|P\.O|Post Office)\b/gi, "")
        .replace(/\-\s*\d{5,6}|\b\d{5,6}\b/g, "")
        .replace(/\bKokan\b/gi, "Konkan");

    let parts = cleaned.split(",").map(p => p.trim()).filter(Boolean);

    // Try full query, then drop specific leftmost house/locality parts until match is found
    for (let i = 0; i < parts.length; i++) {
        let query = parts.slice(i).join(", ");
        if (!query) continue;

        try {
            const response = await axios.get("https://nominatim.openstreetmap.org/search", {
                params: { q: query, format: "json", limit: 1 },
                headers: { "User-Agent": "EliteStayApp/1.0" }
            });

            if (response.data && response.data.length > 0) {
                return {
                    lat: parseFloat(response.data[0].lat),
                    lng: parseFloat(response.data[0].lon)
                };
            }
        } catch (err) {
            console.error(`Geocoding error for "${query}":`, err.message);
        }
    }
    return null;
}

//Create Route
module.exports.createListing = async (req, res) => {
    let url = req.file ? req.file.path : "";
    let filename = req.file ? req.file.filename : "";

    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    if (url) newListing.image = { url, filename };

    const coords = await getGeocodeCoordinates(req.body.listing.location, req.body.listing.country);
    if (coords) {
        newListing.geometry = coords;
    }

    await newListing.save();

    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
};

// Edit Render Page Route
module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }
  let originalImageUrl = listing.image ? listing.image.url : "";
  if (originalImageUrl) {
      originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");
  }

  res.render("listings/edit.ejs", { listing, originalImageUrl });
};

//Update Route
module.exports.updateListings = async (req, res) => {
    const { id } = req.params;
    let listing = await Listing.findById(id);

    listing.title = req.body.listing.title;
    listing.description = req.body.listing.description;
    listing.price = req.body.listing.price;
    listing.location = req.body.listing.location;
    listing.country = req.body.listing.country;

    if (req.file) {
        listing.image = {
            url: req.file.path,
            filename: req.file.filename,
        };
    }

    const coords = await getGeocodeCoordinates(listing.location, listing.country);
    if (coords) {
        listing.geometry = coords;
    }

    await listing.save();

    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
};

//Delete Route
module.exports.destroyListings = async (req, res) => {
  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  // console.log(deletedListing);
  req.flash("success", "Listing Deleted");
  res.redirect("/listings");
};