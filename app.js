const app = require("express")();
const cors = require("cors");
const puppeteer = require("puppeteer");
const axios = require("axios");
const FormData = require("form-data"); // Import form-data package
const vision = require("@google-cloud/vision");
const urlExists = require("url-exists");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { parse } = require("tldts");
const sharp = require("sharp");
const fs = require("fs");

const client = new vision.ImageAnnotatorClient({
  keyFilename: "./VisionKey.json",
});
app.use(cors());

let host;
const uploadToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append("file", file, { filename: "screenshot.png" }); // Add filename for the file
  formData.append("upload_preset", "t5ol8gen");
  const response = await axios.post(
    "https://api.cloudinary.com/v1_1/dam4ty6ys/image/upload",
    formData,
    { headers: formData.getHeaders() } // Add necessary headers for the form-data
  );
  console.log(response.data.secure_url);
  return response.data.secure_url;
};

async function detectSafeSearch(urlImage) {
  const [result] = await client.safeSearchDetection(urlImage);
  const detections = result.safeSearchAnnotation;
  console.log(`Adult: ${detections.adult}`);
  console.log(`Spoof: ${detections.spoof}`);
  console.log(`Medical: ${detections.medical}`);
  console.log(`Violence: ${detections.violence}`);
  if (detections.adult !== "VERY_UNLIKELY") {
    return false;
  }
  return true;
}

const findDomain = async (domain) => {
  host = parse(domain).domain;
  let foundDomain = await prisma.website.findUnique({
    where: {
      domain: host,
    },
  });
  return foundDomain;
};

const blacklistDomain = async (domain) => {
  let blackListDomain = await prisma.website.findUnique({
    where: {
      domain: domain,
    },
  });
  if (!blackListDomain) {
    const addedDomain = await prisma.website.create({
      data: {
        domain: domain,
        isAdult: true,
        type: "content",
      },
    });
    console.log(addedDomain);
  }
};

const whiteListDomain = async (domain) => {
  let whiteListDomain = await prisma.website.findUnique({
    where: {
      domain: domain,
    },
  });
  if (!whiteListDomain) {
    const addedDomain = await prisma.website.create({
      data: {
        domain: domain,
        isAdult: false,
        type: "content",
      },
    });
    console.log(addedDomain);
  }
};

app.get("/", async (req, res) => {
  //Check if domain exsists in the db or not if it exsists then we can just skip the pupetter part and return asap //
  //filter out the url instead of the whole doman and path to set zero in hosts//
  let url = req.query.url;
  const foundDomain = await findDomain(url);
  if (foundDomain && foundDomain.isAdult) {
    console.log("It's a Adult website we are returning right now");
    return res.status(301).send("NSFW");
  }
  let domain = url;
  let screenshot;

  let isURLInHosts = urlExists(url, function (err, exists) {});
  if (!isURLInHosts) {
    try {
      console.log(domain);
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(domain, { waitUntil: "networkidle0" });

      // Delete the head of the document
      await page.evaluate(() => {
        const head = document.head;
      });

      // Take a full page screenshot
      let bigScreenshot = await page.screenshot({
        fullPage: true, // Capture the full page
        omitBackground: true,
        encoding: "binary",
      });

      await browser.close();
      const compressedScreenshot = await sharp(bigScreenshot)
        .jpeg({ quality: 80 }) // Adjust the quality as needed
        .toBuffer();

      // Write the compressed image to a temporary file to check its size
      const tempFilePath = "temp_screenshot.jpg";
      await fs.promises.writeFile(tempFilePath, bigScreenshot);

      // Get file size in bytes
      const stats = fs.statSync(tempFilePath);
      console.log(`Compressed file size: ${stats.size} bytes`);

      screenshot = compressedScreenshot;
      // Optionally, delete the temporary file after use
      fs.unlinkSync(tempFilePath);
    } catch (error) {
      console.log(error);
      return res.status(301).send("NSFW");
    }
  }

  const cloudinarURL = await uploadToCloudinary(screenshot);

  const safe = await detectSafeSearch(cloudinarURL);
  if (!safe) {
    const NSFWDOMAIN = await blacklistDomain(host);
    return res.status(301).send("NSFW");
  } else {
    /*If its a safe URL according to Google then first return a render 
    then call another function that check that same image with GPT -V fucntions with options true , false , content site 
    if it returns false we give another response to crash the browser and add it to hostlist 

    If it returns true we add it to whitelist domains simple which will be a db or a redis db 
    We will see about that as we dont need to check all domains again and again 
    */
    const SFWDOMAIN = await whiteListDomain(host);
    return res.status(200).send("ok");
  }
});

app.listen("3000", () => {
  console.log("Server Started");
});
