var express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const uri = "mongodb://127.0.0.1:27017/tpWeb";
mongoose.connect(uri).then(console.log("Connected to MongoDb"));

const Schema = mongoose.Schema;

const passportSchema = new Schema({
  num: Number,
});

const userSchema = new Schema({
  name: String,
  age: Number,
  passport: { type: mongoose.Schema.Types.ObjectId, ref: "passportSchema" },
});

const compteSchema = new Schema({
  solde: Number,
  user: { type: mongoose.Schema.Types.ObjectId, ref: "userSchema" },
});

const User = mongoose.model("User", userSchema);
const Passport = mongoose.model("Passport", passportSchema);
const Compte = mongoose.model("Compte", compteSchema);

app.post("/addAUser", async (req, res) => {
  const { name, age } = req.body;

  try {
    // Create a new user document based on the submitted data
    const newUser = new User({ name, age });
    // Save the new user to the database
    await newUser.save();
    console.log("User added:", newUser);
    res.json(newUser);
  } catch (err) {
    console.error("Error adding user:", err);
    res.status(500).send("Error adding user");
  }
});

app.get("/users", async (req, res) => {
  try {
    const aggregatedData = await User.aggregate([
      {
        $lookup: {
          from: "passports",
          localField: "passport",
          foreignField: "_id",
          as: "UserPassport",
        },
      },
    ]);
    res.json(aggregatedData);
  } catch (error) {
    console.error("Error fetching etudiants:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


app.get('/userComptes', async (req, res) => {
    try {
        const valeurSolde = parseInt(req.params.soldev); // Convert to integer if required
        const result = await User.aggregate([
            {
                $lookup: {
                    from: "comptes",
                    localField: "_id",
                    foreignField: "user",
                    as: "jointure"
                }
            },
            {
                $unwind: "$jointure" // Unwind the jointure array
            },
            {
                $match: {
                    "jointure.solde": { $gt: 900 }
                }
            },
            {
                $project: {
                    "name": 1,
                    "jointure.solde": 1
                }
            }
        ]);

        res.json(result);

    } catch (err) {
        console.error('Error getting users with compte:', err);
        res.status(500).send('Error getting users with compte');
    }
});

app.get("/userPassportsComptes", async (req, res) => {
  try {
    const result = await Compte.aggregate([
      {
        $match: {
          solde: { $gt: 900 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user", 
      },
      {
        $lookup: {
          from: "passports",
          localField: "user.passport",
          foreignField: "_id",
          as: "passport",
        },
      },
      {
        $unwind: "$passport", 
      },
      {
        $project: {
          "user.name": 1,
          "passport.num": 1,
        },
      },
    ]);

    res.json(result);
  } catch (err) {
    console.error(
      "Erreur lors de la récupération des utilisateurs et des passeports:",
      err
    );
    res
      .status(500)
      .send(
        "Erreur lors de la récupération des utilisateurs et des passeports"
      );
  }
});

// Route to delete a user
app.delete("/deleteUser/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    // Find the user by ID and delete it
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).send("User not found");
    }
    console.log("User deleted:", deletedUser);
    res.send("User deleted successfully");
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).send("Error deleting user");
  }
});

app.patch("/student/:id", (req, res) => {
  const studentId = req.params.id;
  const updates = req.body;

  User.findByIdAndUpdate(studentId, updates, { new: true })
    .then((updatedStudent) => {
      if (!updatedStudent) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.json(updatedStudent);
      console.log(updatedStudent);
    })
    .catch((error) => {
      console.error("Error updating student:", error);
      res.status(500).json({ message: "Internal server error" });
    });
});

app.listen(3032);
console.log("serveur http démarré sur le port 3032");
