const app = require("express")();
const cors = require("cors");
const puppeteer = require("puppeteer");
const axios = require("axios");
const FormData = require("form-data"); // Import form-data package
const vision = require("@google-cloud/vision");
const hostile = require("hostile");

const client = new vision.ImageAnnotatorClient({
  keyFilename: "./VisionKey.json",
});
app.use(cors());

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

app.get("/", async (req, res) => {
  //filter out the url instead of the whole doman and path to set zero in hosts//
  let domain = req.query.url;
  let screenshot;
  // add a try catch block at pupetter to know this domain if its not connectable then it might be in host file return a custom error//
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(domain, { waitUntil: "networkidle0" });
    page.on("dialog", async (dialog) => {
      //on event listener trigger
      console.log(
        `Found dialog. Type: ${dialog.type()}, message: ${dialog.message()}`
      ); // get dialog type and message
      await dialog.dismiss(); // neither dismiss or accept work
    });

    screenshot = await page.screenshot({
      omitBackground: true,
      encoding: "binary",
    });
    await browser.close();
  } catch (error) {
    console.log(error);
    return res.send("Hosts says its bad");
  }
  const cloudinarURL = await uploadToCloudinary(screenshot);

  const safe = await detectSafeSearch(cloudinarURL);
  if (!safe) {
    //Implement to add this domain to hosts file so we dont need to check it again  //
    hostile.set("0.0.0.0", domain, function (err) {
      if (err) {
        console.error(err);
      } else {
        console.log("set /etc/hosts successfully!");
      }
    });
    res.send("Bye");
  } else {
    /*If its a safe URL according to Google then first return a render 
    then call another function that check that same image with GPT -V fucntions with options true , false , content site 
    if it returns false we give another response to crash the browser and add it to hostlist 

    If it returns true we add it to whitelist domains simple which will be a db or a redis db 
    We will see about that as we dont need to check all domains again and again 
    */
    res.send("HI");
  }
});

app.listen("3000", () => {
  console.log("Server Started");
});
