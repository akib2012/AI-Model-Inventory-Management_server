require("dotenv").config();

const express = require("express");
const app = express();

const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const admin = require("firebase-admin");
const { config } = require("dotenv");

const port = 3000;

app.get("/", (req, res) => {
  res.send("ai inventor project server sunning ");
});

if (process.env.FIREVASE_SERVICE_KEY) {
  const decoded = Buffer.from(
    process.env.FIREVASE_SERVICE_KEY,
    "base64"
  ).toString("utf-8");
  const serviceAccount = JSON.parse(decoded);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("Firebase Admin initialized.");
} else {
  console.log("FB_SERVICE_KEY not found in .env");
}

//  middle wire here

app.use(cors());
app.use(express.json());

// JWT middleware
const verifyJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized: No token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.tokenEmail = decoded.email;
    next();
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized: Invalid token" });
  }
};

const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.exfto5h.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    await client.connect();

    // clreate collections here
    const db = client.db("ai_model_inventory_manager");
    const modelscollections = db.collection("models");
    const userscollections = db.collection("users");

    /* here the models get api: */

    app.get("/models", async (req, res) => {
      const cursor = modelscollections.find();
      const result = await cursor.toArray(cursor);
      res.send(result);
    });

    // add model here

    app.post("/models", async (req, res) => {
      const newmodel = req.body;
      // console.log(req.tokenEmail);
      const result = await modelscollections.insertOne(newmodel);
      res.send(result);
    });

    app.get("/recent-model", async (req, res) => {
      const cursor = modelscollections.find().sort({ createdAt: -1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    // detils page here:

    app.get("/models/:id", async (req, res) => {
      const id = req.params.id;
      const query = { id: id };
      const result = await modelscollections.findOne(query);
      res.send(result);
    });

    app.get("/puchasagemodel", verifyJWT, async (req, res) => {
      const email = req.tokenEmail;
    });

    // Get logged-in user's models
    app.get("/my-models", verifyJWT, async (req, res) => {
      const email = req.tokenEmail;
      try {
        const models = await modelscollections
          .find({ createdBy: email })
          .toArray();
        res.send({ count: models.length, models });
      } catch (err) {
        res.status(500).send({ message: "Error fetching your models", err });
      }
    });

    // Get logged-in user's purchases
    /* app.get("/my-purchases", verifyJWT, async (req, res) => {
      const email = req.tokenEmail; // logged-in user email
      try {
        const purchasedModels = await modelscollections
          .find({ dowloded_by: email }) // filter by purchased user email
          .toArray();

        res.send({ count: purchasedModels.length, models: purchasedModels });
      } catch (err) {
        res
          .status(500)
          .send({ message: "Error fetching purchased models", err });
      }
    }); */

    /* ........ user related api here.......... */

    app.post("/users", async (req, res) => {
      const user = req.body;

      const exsitonguser = await userscollections.findOne({
        user_mail: user.user_mail,
      });
      if (exsitonguser) {
        return res.send({ message: "user exists" });
      }
      const result = await userscollections.insertOne(user);
      res.send(result);
    });

    // GET profile
    // GET public profile info by email (no token needed)
   app.get("/profile/:email", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).trim();

    const user = await userscollections.findOne(
      { user_mail: email },
      {
        projection: {
          user_name: 1,
          user_photo: 1,
          role: 1,
          _id: 0,
        },
      }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

/* ***************************************************888 */

// Dashboard overview stats
app.get("/dashboard-stats", verifyJWT, async (req, res) => {
  try {
    const email = req.tokenEmail;

    const totalModels = await modelscollections.countDocuments();
    const myModels = await modelscollections.countDocuments({
      createdBy: email,
    });

    const totalUsers = await userscollections.countDocuments();

    res.send({
      totalModels,
      myModels,
      totalUsers,
    });
  } catch (error) {
    res.status(500).send({ message: "Failed to load dashboard stats" });
  }
});



// Dashboard models table
app.get("/dashboard-models", verifyJWT, async (req, res) => {
  try {
    const models = await modelscollections
      .find()
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    res.send(models);
  } catch (error) {
    res.status(500).send({ message: "Failed to load models table" });
  }
});






    /*  await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!"); */
  } finally {
  }
}
run().catch(console.dir);

// mongo user: ai_model_inventory_manager
//  mongo pass: AAir8C8na2P1uNm1

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
